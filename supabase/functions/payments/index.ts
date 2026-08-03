import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, requireUser, AccessError } from "../_shared/entitlements.ts";

const PAYSTACK = "https://api.paystack.co";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function paystack(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) {
    throw new AccessError(
      "Payments are not configured yet. Please contact support.",
      503,
      "provider_unconfigured",
    );
  }
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status === false) {
    console.error(`Paystack ${path} failed [${res.status}]: ${text}`);
    throw new AccessError(data?.message || "Payment provider error", res.status || 502, "provider_error");
  }
  return data.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    const user = await requireUser(req);
    const db = adminClient();

    if (action === "initialize") {
      const planSlug = String(body?.planSlug ?? "");
      const callbackUrl = String(body?.callbackUrl ?? "");
      if (!planSlug) return json({ error: "planSlug is required" }, 400);

      const { data: plan } = await db
        .from("subscription_plans")
        .select("*")
        .eq("slug", planSlug)
        .eq("active", true)
        .maybeSingle();
      if (!plan) return json({ error: "Unknown plan" }, 400);
      if (!plan.price || plan.price <= 0) return json({ error: "This plan cannot be purchased directly" }, 400);

      const reference = `jmk_${planSlug}_${user.id.slice(0, 8)}_${Date.now()}`;

      const init = await paystack("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(Number(plan.price) * 100),
          currency: plan.currency || "NGN",
          reference,
          callback_url: callbackUrl || undefined,
          metadata: { user_id: user.id, plan_slug: planSlug, plan_name: plan.name },
        }),
      });

      await db.from("payment_transactions").insert({
        user_id: user.id,
        amount: plan.price,
        currency: plan.currency || "NGN",
        provider: "paystack",
        reference,
        status: "pending",
        transaction_type: "subscription",
        metadata: { plan_slug: planSlug, plan_id: plan.id },
      });

      return json({ authorization_url: init.authorization_url, reference });
    }

    if (action === "verify") {
      const reference = String(body?.reference ?? "");
      if (!reference) return json({ error: "reference is required" }, 400);

      const { data: txn } = await db
        .from("payment_transactions")
        .select("*")
        .eq("reference", reference)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!txn) return json({ error: "Transaction not found" }, 404);
      if (txn.status === "success") return json({ status: "success", alreadyProcessed: true });

      const verified = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
      const ok = verified?.status === "success";

      await db
        .from("payment_transactions")
        .update({ status: ok ? "success" : "failed", metadata: { ...(txn.metadata ?? {}), gateway: verified } })
        .eq("id", txn.id);

      if (!ok) return json({ status: "failed" });

      const planSlug = (txn.metadata as any)?.plan_slug;
      const { data: plan } = await db
        .from("subscription_plans")
        .select("id, name, slug")
        .eq("slug", planSlug)
        .maybeSingle();

      if (plan) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);

        await db.from("user_subscriptions").update({ status: "expired" })
          .eq("user_id", user.id).eq("status", "active");

        await db.from("user_subscriptions").insert({
          user_id: user.id,
          plan_id: plan.id,
          status: "active",
          start_date: new Date().toISOString(),
          expiry_date: expiry.toISOString(),
          payment_reference: reference,
        });

        // keep legacy subscriptions table in sync
        await db.from("subscriptions").upsert(
          {
            user_id: user.id,
            tier: plan.slug === "premium_plus" ? "premium" : plan.slug === "student" ? "beta" : "free",
            status: "active",
            provider: "paystack",
            expires_at: expiry.toISOString(),
          },
          { onConflict: "user_id" },
        );

        await db.from("notifications").insert({
          user_id: user.id,
          title: "Payment successful",
          body: `Your ${plan.name} subscription is now active until ${expiry.toDateString()}.`,
          type: "success",
          link: "/billing",
        });
      }

      return json({ status: "success" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("payments error", e);
    const status = e instanceof AccessError ? e.status : 500;
    return json({ error: e?.message ?? "Unexpected server error" }, status);
  }
});
