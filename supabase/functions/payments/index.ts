import { adminClient, requireUser, AccessError, grantWeeklyAccess } from "../_shared/entitlements.ts";
import { resolvePlanActivation, weeklyAmountForPlan, weeklyCreditsForPlan, weeklyDaysForPlan, WEEKLY_CONTRIBUTION_SLUG } from "../_shared/plan-activation.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { resolvePlanActivation, weeklyAmountForPlan, weeklyCreditsForPlan, weeklyDaysForPlan, WEEKLY_CONTRIBUTION_SLUG } from "../_shared/plan-activation.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toSmallestUnit(amount: number) {
  return Math.round(Number(amount) * 100);
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
    throw new AccessError(String(data?.message || "Paystack error"), res.status || 502, "provider_error");
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
    throw new AccessError(String(data?.message || "Paystack verify error"), res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function flutterwaveInitialize(provider: Record<string, unknown>, payload: Record<string, unknown>) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Flutterwave secret key is not configured.", 503, "provider_unconfigured");
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status !== "success") {
    throw new AccessError(String(data?.message || "Flutterwave error"), res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function flutterwaveVerify(provider: Record<string, unknown>, reference: string) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Flutterwave secret key is not configured.", 503, "provider_unconfigured");
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data?.status !== "success") {
    throw new AccessError(String(data?.message || "Flutterwave verify error"), res.status || 502, "provider_error");
  }
  return data.data as Record<string, unknown>;
}

async function stripeInitialize(provider: Record<string, unknown>, payload: Record<string, unknown>) {
  const secret = String(provider.secret_key ?? "");
  if (!secret) throw new AccessError("Stripe secret key is not configured.", 503, "provider_unconfigured");
  const callbackUrl = String(payload.callback_url ?? "");
  const planName = String(payload.plan_name ?? "Support JMK");
  const amountSmallestUnit = Math.round(Number(payload.amount ?? 0));
  const currency = String(payload.currency ?? "ngn").toLowerCase();
  const userReference = String(payload.user_reference ?? "");
  const planSlug = String(payload.plan_slug ?? WEEKLY_CONTRIBUTION_SLUG);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      mode: "payment",
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
  if (!res.ok || (data as any)?.error) {
    throw new AccessError(String((data as any)?.error?.message || "Stripe error"), res.status || 502, "provider_error");
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
  if (!res.ok || (data as any)?.error) {
    throw new AccessError(String((data as any)?.error?.message || "Stripe verify error"), res.status || 502, "provider_error");
  }
  return data as Record<string, unknown>;
}

function contributionPlanResponse(plan: Record<string, unknown>) {
  return {
    slug: String(plan.slug),
    name: String(plan.name ?? "Support JMK"),
    amount: weeklyAmountForPlan(plan as any),
    credits: weeklyCreditsForPlan(plan as any),
    durationDays: weeklyDaysForPlan(plan as any),
  };
}

async function verifyAndGrant(db: ReturnType<typeof adminClient>, txn: any, provider: Record<string, unknown>) {
  const providerSlug = String(txn.provider ?? "paystack");
  let verified: Record<string, unknown> | null = null;
  let ok = false;
  let paidAmount = 0;
  let paidCurrency = String(txn.currency ?? "NGN");

  if (providerSlug === "paystack") {
    verified = await paystackVerify(provider, String(txn.reference));
    ok = (verified as any)?.status === "success";
    paidAmount = Number((verified as any)?.amount ?? 0) / 100;
    paidCurrency = String((verified as any)?.currency ?? paidCurrency);
  } else if (providerSlug === "flutterwave") {
    // verify_by_reference above for user verify; if tx_ref differs try same path
    verified = await flutterwaveVerify(provider, String(txn.reference));
    const st = String((verified as any)?.status ?? "").toLowerCase();
    ok = st === "successful" || st === "success";
    paidAmount = Number((verified as any)?.amount ?? 0);
    paidCurrency = String((verified as any)?.currency ?? paidCurrency);
  } else if (providerSlug === "stripe") {
    verified = await stripeVerify(provider, String(txn.reference));
    ok = String((verified as any)?.payment_status ?? "") === "paid";
    paidAmount = Number((verified as any)?.amount_total ?? 0) / 100;
    paidCurrency = String((verified as any)?.currency ?? paidCurrency).toUpperCase();
  } else {
    throw new AccessError(`Unsupported payment provider: ${providerSlug}`, 400, "provider_unsupported");
  }

  const planSlug = String((txn.metadata as any)?.plan_slug ?? WEEKLY_CONTRIBUTION_SLUG);
  const { data: plan } = await db.from("subscription_plans").select("*").eq("slug", planSlug).maybeSingle();
  const expectedAmount = weeklyAmountForPlan(plan as any);
  const expectedCurrency = String((plan as any)?.currency ?? txn.currency ?? "NGN").toUpperCase();
  const amountOk = paidAmount <= 0 || Math.abs(paidAmount - expectedAmount) < 0.01;
  const currencyOk = !paidCurrency || String(paidCurrency).toUpperCase() === expectedCurrency;
  const finalOk = ok && amountOk && currencyOk;

  await db.from("payment_transactions").update({
    status: finalOk ? "success" : "failed",
    metadata: { ...(txn.metadata ?? {}), gateway: verified, verified_at: new Date().toISOString(), amount_verified: paidAmount, currency_verified: paidCurrency },
  }).eq("id", txn.id);

  if (!finalOk) return { ok: false, provider: providerSlug };
  if (!plan) throw new AccessError("Contribution plan not found.", 500, "plan_missing");

  const granted = await grantWeeklyAccess(String(txn.user_id), plan as any, String(txn.reference), new Date());
  await db.from("notifications").insert({
    user_id: txn.user_id,
    title: "Contribution received",
    body: `Thank you for supporting JMK. You now have ${granted.creditsGranted} AI credits until ${new Date(granted.expiresAt).toLocaleString()}.`,
    type: "success",
    link: "/billing",
  });
  return { ok: true, provider: providerSlug, granted, plan };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawText = await req.text();
    let body: any = {};
    try { body = rawText ? JSON.parse(rawText) : {}; } catch { body = {}; }
    const action = String(body?.action ?? "");
    const db = adminClient();

// Webhook path - verify signature, then securely verify transaction with provider API
    if (action === "webhook" || req.headers.get("x-paystack-signature") || req.headers.get("verif-hash") || req.headers.get("stripe-signature")) {
      let providerSlug = "";
      let provider: Record<string, unknown> | null = null;
      let reference = "";
      let verified = false;

      // Paystack webhook
      if (req.headers.get("x-paystack-signature")) {
        providerSlug = "paystack";
        const signature = req.headers.get("x-paystack-signature") || "";
        const { data: p } = await db.from("payment_providers").select("*").eq("slug", "paystack").maybeSingle();
        provider = p as Record<string, unknown> | null;
        const secret = String((provider as any)?.secret_key ?? "");
        if (!secret || !signature) return json({ error: "Invalid webhook request" }, 400);
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
        const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawText));
        const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        if (computed !== signature) return json({ error: "Invalid signature" }, 401);

        if (body?.event === "charge.success") {
          reference = String(body?.data?.reference ?? "");
          verified = true;
        }
      }

      // Flutterwave webhook
      else if (req.headers.get("verif-hash")) {
        providerSlug = "flutterwave";
        const signature = req.headers.get("verif-hash") || "";
        const { data: p } = await db.from("payment_providers").select("*").eq("slug", "flutterwave").maybeSingle();
        provider = p as Record<string, unknown> | null;
        const secretHash = String((provider as any)?.webhook_secret_hash ?? "");
        if (!secretHash || !signature || signature !== secretHash) return json({ error: "Invalid signature" }, 401);

        if (body?.event === "charge.completed" || body?.status === "successful") {
          reference = String(body?.data?.tx_ref ?? body?.data?.txRef ?? "");
          verified = true;
        }
      }

      // Stripe webhook
      else if (req.headers.get("stripe-signature")) {
        providerSlug = "stripe";
        const signature = req.headers.get("stripe-signature") || "";
        const { data: p } = await db.from("payment_providers").select("*").eq("slug", "stripe").maybeSingle();
        provider = p as Record<string, unknown> | null;
        const webhookSecret = String((provider as any)?.webhook_secret ?? "");
        if (!webhookSecret || !signature) return json({ error: "Invalid webhook request" }, 400);

        // Simple Stripe webhook verification (in production, use stripe-node library)
        // For now, we'll verify by fetching the session from Stripe
        if (body?.type === "checkout.session.completed") {
          reference = String(body?.data?.object?.id ?? "");
          verified = true;
        }
      }

      if (!provider) return json({ error: "Payment provider not configured" }, 503);

      if (verified && reference) {
        const { data: txn } = await db.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
        if (txn && txn.status !== "success") {
          await verifyAndGrant(db, txn, provider);
        }
      }
      return json({ received: true });
    }

    const user = await requireUser(req);

    if (action === "activate_plan") {
      return json({ success: false, error: { code: "PAYMENT_REQUIRED", message: "Please complete a verified contribution to get access." } }, 400);
    }

    if (action === "initialize") {
      const planSlug = String(body?.planSlug ?? WEEKLY_CONTRIBUTION_SLUG);
      const callbackUrl = String(body?.callbackUrl ?? "");
      if (planSlug !== WEEKLY_CONTRIBUTION_SLUG) return json({ error: "Only the weekly JMK contribution is available." }, 400);

      const { data: settings } = await db.from("app_settings").select("pricing_mode, payments_enabled").eq("id", "global").maybeSingle();
      const { data: plan } = await db.from("subscription_plans").select("*").eq("slug", WEEKLY_CONTRIBUTION_SLUG).eq("active", true).maybeSingle();
      const resolution = resolvePlanActivation({ pricingMode: settings?.pricing_mode, paymentsEnabled: settings?.payments_enabled, planSlug, plan });
      if (resolution.action === "rejected" || resolution.action === "quote") {
        return json({ error: resolution.action === "rejected" ? resolution.message : "This option is unavailable." }, 400);
      }

      const { data: providerRow } = await db.from("payment_providers").select("*").eq("active", true).order("sort_order").limit(1).maybeSingle();
      const provider = providerRow as Record<string, unknown> | null;
      if (!provider) return json({ error: "No payment provider is active. Please contact support." }, 503);

      const reference = `jmk_weekly_${user.id.slice(0, 8)}_${Date.now()}`;
      const amount = weeklyAmountForPlan(plan);
      const credits = weeklyCreditsForPlan(plan);
      const durationDays = weeklyDaysForPlan(plan);
      const currency = String((plan as any)?.currency || "NGN");
      const metadata = { user_id: user.id, plan_slug: WEEKLY_CONTRIBUTION_SLUG, plan_id: (plan as any).id, credits, duration_days: durationDays, contribution: true };

      let authorizationUrl = "";
      let finalReference = reference;

      if (provider.slug === "paystack") {
        const result = await paystackInitialize(provider, { email: user.email, amount: toSmallestUnit(amount), currency, reference, callback_url: callbackUrl || undefined, metadata });
        authorizationUrl = String(result.authorization_url ?? "");
      } else if (provider.slug === "flutterwave") {
        const result = await flutterwaveInitialize(provider, {
          tx_ref: reference, amount, currency,
          redirect_url: callbackUrl || "https://jmk.life/billing",
          payment_options: "card,banktransfer,ussd",
          customer: { email: user.email, name: user.email },
          customizations: { title: "Support JMK", description: `NGN ${amount} / ${durationDays} days` },
          meta: metadata,
        });
        authorizationUrl = String(result.link ?? "");
      } else if (provider.slug === "stripe") {
        const result = await stripeInitialize(provider, {
          callback_url: callbackUrl || "https://jmk.life/billing",
          user_reference: reference, plan_slug: WEEKLY_CONTRIBUTION_SLUG,
          plan_name: String((plan as any)?.name ?? "Support JMK"),
          amount: toSmallestUnit(amount), currency,
        });
        authorizationUrl = String(result.url ?? "");
        finalReference = String(result.id ?? reference);
      } else {
        return json({ error: `Unsupported payment provider: ${provider.slug}` }, 400);
      }

      if (!authorizationUrl) return json({ error: "Payment provider did not return a checkout link." }, 502);

      await db.from("payment_transactions").insert({
        user_id: user.id, amount, currency,
        provider: String(provider.slug), reference: finalReference,
        status: "pending", transaction_type: "contribution",
        metadata: { ...metadata, user_reference: reference },
      });

      return json({ authorization_url: authorizationUrl, reference: finalReference, provider: provider.slug, contribution: contributionPlanResponse(plan as any) });
    }

    if (action === "verify") {
      const reference = String(body?.reference ?? "");
      if (!reference) return json({ error: "reference is required" }, 400);

      const { data: txn } = await db.from("payment_transactions").select("*").eq("reference", reference).eq("user_id", user.id).maybeSingle();
      if (!txn) return json({ error: "Transaction not found" }, 404);
      if (txn.status === "success") {
        const { data: balance } = await db.from("ai_credit_balances").select("daily_credits, access_expires_at, credits_total").eq("user_id", user.id).maybeSingle();
        return json({ status: "success", alreadyProcessed: true, credits_remaining: Number(balance?.daily_credits ?? 0), access_expires_at: balance?.access_expires_at ?? null, credits_granted: Number(balance?.credits_total ?? 0) });
      }

      const { data: provider } = await db.from("payment_providers").select("*").eq("slug", String(txn.provider ?? "paystack")).maybeSingle();
      if (!provider) return json({ error: "Payment provider not found." }, 400);

      const outcome = await verifyAndGrant(db, txn, provider as Record<string, unknown>);
      if (!outcome.ok) return json({ status: "failed", provider: outcome.provider, error: "Payment could not be verified." });
      return json({
        status: "success",
        provider: outcome.provider,
        plan: contributionPlanResponse(outcome.plan as any),
        credits_granted: outcome.granted.creditsGranted,
        credits_remaining: outcome.granted.creditsGranted,
        access_expires_at: outcome.granted.expiresAt,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: unknown) {
    console.error("[payments] error", e);
    const status = e instanceof AccessError ? e.status : 500;
    const message = (e instanceof Error ? e.message : String(e)) ?? "Unexpected server error";
    return json({ error: message }, status);
  }
});
