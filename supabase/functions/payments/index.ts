import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, requireUser, AccessError } from "../_shared/entitlements.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function paystackInitialize(provider: Record<string, unknown>, payload: Record<string, unknown>) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Paystack secret key is not configured.", 503, "provider_unconfigured");

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status === false) {
    console.error(`Paystack initialize failed [${res.status}]: ${text}`);
    throw new AccessError(data?.message || "Paystack error", res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function paystackVerify(provider: Record<string, unknown>, reference: string) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Paystack secret key is not configured.", 503, "provider_unconfigured");

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status === false) {
    console.error(`Paystack verify failed [${res.status}]: ${text}`);
    throw new AccessError(data?.message || "Paystack verify error", res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function flutterwaveInitialize(provider: Record<string, unknown>, payload: Record<string, unknown>) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Flutterwave secret key is not configured.", 503, "provider_unconfigured");

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status !== "success") {
    console.error(`Flutterwave initialize failed [${res.status}]: ${text}`);
    throw new AccessError(data?.message || "Flutterwave error", res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function flutterwaveVerify(provider: Record<string, unknown>, reference: string) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Flutterwave secret key is not configured.", 503, "provider_unconfigured");

  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(reference)}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status !== "success") {
    console.error(`Flutterwave verify failed [${res.status}]: ${text}`);
    throw new AccessError(data?.message || "Flutterwave verify error", res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function stripeInitialize(provider: Record<string, unknown>, payload: Record<string, unknown>) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Stripe secret key is not configured.", 503, "provider_unconfigured");

  const callbackUrl = String(payload.callback_url ?? "");
  const planSlug = String(payload.plan_slug ?? "");
  const planName = String(payload.plan_name ?? "");
  const amountSmallestUnit = Math.round(Number(payload.amount ?? 0));
  const currency = String(payload.currency ?? "usd");
  const userReference = String(payload.user_reference ?? "");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      success_url: `${callbackUrl}?reference={CHECKOUT_SESSION_ID}`,
      cancel_url: `${callbackUrl}?status=cancelled`,
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][product_data][name]": planName,
      "line_items[0][price_data][unit_amount]": String(amountSmallestUnit),
      "line_items[0][quantity]": "1",
      "metadata[reference]": userReference,
      "metadata[plan_slug]": planSlug,
    }).toString(),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.error) {
    console.error(`Stripe initialize failed [${res.status}]: ${text}`);
    throw new AccessError((data as Record<string, unknown>)?.error?.message || "Stripe error", res.status || 502, "provider_error");
  }
  return data as Record<string, unknown>;
}

async function stripeVerify(provider: Record<string, unknown>, reference: string) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Stripe secret key is not configured.", 503, "provider_unconfigured");

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.error) {
    console.error(`Stripe verify failed [${res.status}]: ${text}`);
    throw new AccessError((data as Record<string, unknown>)?.error?.message || "Stripe verify error", res.status || 502, "provider_error");
  }
  return data as Record<string, unknown>;
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

      const { data: settings } = await db
        .from("app_settings").select("pricing_mode, payments_enabled").eq("id", "global").maybeSingle();
      if (settings?.pricing_mode === "free" || settings?.payments_enabled === false) {
        return json({ error: "Payments are currently disabled — every feature is free right now." }, 400);
      }

      const { data: plan } = await db
        .from("subscription_plans")
        .select("*")
        .eq("slug", planSlug)
        .eq("active", true)
        .maybeSingle();
      if (!plan) return json({ error: "Unknown plan" }, 400);
      if (!plan.price || plan.price <= 0) return json({ error: "This plan cannot be purchased directly" }, 400);

      const { data: providerRow } = await db
        .from("payment_providers")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      const provider = providerRow as Record<string, unknown> | null;
      if (!provider) return json({ error: "No payment provider is active. Please contact support." }, 503);

      const reference = `jmk_${planSlug}_${user.id.slice(0, 8)}_${Date.now()}`;
      const amountKobo = Math.round(Number(plan.price) * 100);
      const currency = String(plan.currency || "NGN");
      const metadata: Record<string, unknown> = { user_id: user.id, plan_slug: planSlug, plan_name: plan.name, provider: provider.slug };

      let authorizationUrl: string | undefined;
      let finalReference = reference;

      if (provider.slug === "paystack") {
        const result = await paystackInitialize(provider, {
          email: user.email,
          amount: amountKobo,
          currency,
          reference,
          callback_url: callbackUrl || undefined,
          metadata,
        });
        authorizationUrl = result.authorization_url as string;
        finalReference = reference;
      } else if (provider.slug === "flutterwave") {
        const result = await flutterwaveInitialize(provider, {
          tx_ref: reference,
          amount: Number(plan.price),
          currency,
          redirect_url: callbackUrl || "https://jmk.life/billing",
          payment_options: "card,banktransfer,ussd",
          customer: { email: user.email, name: user.email },
          customizations: { title: "jmk Subscription", description: plan.name },
          meta: metadata,
        });
        authorizationUrl = result.link as string;
        finalReference = reference;
      } else if (provider.slug === "stripe") {
        const result = await stripeInitialize(provider, {
          callback_url: callbackUrl || "https://jmk.life/billing",
          user_reference: reference,
          plan_slug: planSlug,
          plan_name: plan.name,
          amount: amountKobo,
          currency,
        });
        authorizationUrl = result.url as string;
        finalReference = String(result.id ?? reference);
      } else {
        return json({ error: `Unsupported payment provider: ${provider.slug}` }, 400);
      }

      await db.from("payment_transactions").insert({
        user_id: user.id,
        amount: plan.price,
        currency,
        provider: String(provider.slug),
        reference: finalReference,
        status: "pending",
        transaction_type: "subscription",
        metadata: { plan_slug: planSlug, plan_id: plan.id, user_reference: reference },
      });

      return json({ authorization_url: authorizationUrl, reference: finalReference, provider: provider.slug });
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

      const providerSlug = String(txn.provider ?? "paystack");
      const { data: providerRow } = await db
        .from("payment_providers")
        .select("*")
        .eq("slug", providerSlug)
        .maybeSingle();

      const provider = providerRow as Record<string, unknown> | null;
      if (!provider) return json({ error: "Payment provider not found." }, 400);

      let verified: Record<string, unknown> | null = null;
      let ok = false;

      if (providerSlug === "paystack") {
        verified = await paystackVerify(provider, reference);
        ok = verified?.status === "success";
      } else if (providerSlug === "flutterwave") {
        verified = await flutterwaveVerify(provider, reference);
        ok = verified?.status === "success" && String(verified?.data?.tx_ref ?? "") === reference;
      } else if (providerSlug === "stripe") {
        verified = await stripeVerify(provider, reference);
        ok = String(verified?.payment_status ?? "") === "paid";
      } else {
        return json({ error: `Unsupported payment provider: ${providerSlug}` }, 400);
      }

      await db
        .from("payment_transactions")
        .update({ status: ok ? "success" : "failed", metadata: { ...(txn.metadata ?? {}), gateway: verified } })
        .eq("id", txn.id);

      if (!ok) return json({ status: "failed", provider: providerSlug });

      const planSlug = (txn.metadata as Record<string, unknown>)?.plan_slug as string | undefined;
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

        await db.from("subscriptions").upsert(
          {
            user_id: user.id,
            tier: plan.slug === "premium_plus" ? "premium" : plan.slug === "student" ? "beta" : "free",
            status: "active",
            provider: providerSlug,
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

      return json({ status: "success", provider: providerSlug });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: unknown) {
    console.error("payments error", e);
    const status = e instanceof AccessError ? e.status : 500;
    return json({ error: (e instanceof Error ? e.message : String(e)) ?? "Unexpected server error" }, status);
  }
});
