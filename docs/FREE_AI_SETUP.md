# Free AI Provider Setup Guide

JMK supports multiple AI providers with generous **free tiers**. This guide helps you configure free AI for your deployment.

## Quick Start: Recommended Free Providers

### Option 1: Groq (Recommended - Easiest Setup)

Groq offers a generous free tier with fast inference speeds.

**Steps:**
1. Sign up at [https://console.groq.com](https://console.groq.com)
2. Go to API Keys section
3. Create a new API key
4. Add the key to your Supabase environment:

```bash
# Set in Supabase Dashboard > Edge Functions > Secrets
GROQ_API_KEY=groq_your_api_key_here
```

5. Update the provider in your database:

```sql
UPDATE ai_providers
SET api_key = 'groq_your_api_key_here', active = true, priority = 1
WHERE vendor = 'groq';
```

**Free Models Available:**
- `llama-3.3-70b-versatile` - Best quality, good for complex tasks
- `llama-3.1-8b-instant` - Fast, good for simple queries
- `mixtral-8x7b-32768` - Mixture of experts, good for analysis
- `gemma2-9b-it` - Google's open model, good for writing

**Limits:** ~6,000 requests per minute, ~100,000 tokens per minute (free tier)

---

### Option 2: OpenRouter (Most Free Models)

OpenRouter provides access to many free models from different providers.

**Steps:**
1. Sign up at [https://openrouter.ai](https://openrouter.ai)
2. Go to Keys section
3. Create a new API key
4. Add to Supabase environment:

```bash
OPENROUTER_API_KEY=sk-or-v1-your_api_key_here
```

5. Update the provider:

```sql
UPDATE ai_providers
SET api_key = 'sk-or-v1-your_api_key_here', active = true, priority = 1
WHERE vendor = 'openrouter';
```

**Truly Free Models (no credits needed):**
- `z-ai/glm-5.2:free` - ZhipuAI's GLM model
- `stealth/ox-alpha` - Experimental model

**Cheap Models (pennies per request):**
- `meta-llama/llama-3.1-70b-instruct` - ~$0.0004 per 1K tokens
- `google/gemini-pro-1.5` - ~$0.001 per 1K tokens

---

### Option 3: Google Gemini (Best Quality Free)

Google offers Gemini with a generous free tier.

**Steps:**
1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Create a new API key
3. Add to Supabase:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Update the provider:

```sql
UPDATE ai_providers
SET api_key = 'your_gemini_api_key_here', active = true, priority = 1
WHERE vendor = 'google';
```

**Free Models:**
- `gemini-1.5-flash` - Fast, good quality (1500 requests/day free)
- `gemini-1.5-pro` - Higher quality (50 requests/day free)

---

## Setting Up Supabase Edge Function Secrets

Add these secrets in your Supabase Dashboard:
1. Go to Edge Functions
2. Click "Manage Secrets"
3. Add each provider key:

```
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
```

Then update the database keys using the SQL above, or use the admin panel.

---

## Automatic Fallback System

JMK is configured to automatically fall back between providers:
1. If Groq fails → tries OpenRouter
2. If OpenRouter fails → tries Gemini
3. If all fail → shows a friendly error message

The priority is set in the `ai_providers.priority` column (lower = higher priority).

---

## Testing Your Setup

After configuring, test the AI:

1. Sign in to JMK
2. Go to any project
3. Open "Academic Intelligence" panel
4. Try asking a research question
5. Check browser console for any errors

---

## Troubleshooting

### "No AI provider is configured"
- Check that at least one provider has `active = true` in `ai_providers`
- Verify the API key is set in both the database AND edge function secrets

### "API key is not configured"
- Edge function secrets are separate from database keys
- Add keys to Supabase Dashboard > Edge Functions > Manage Secrets

### "Rate limit exceeded"
- Free tiers have limits
- Consider enabling multiple providers for automatic fallback
- Upgrade to paid tier for higher limits

### "Empty response from AI"
- Some free models may return empty responses
- Try switching to a different model in the Model Picker
- Check edge function logs in Supabase Dashboard

---

## Cost Optimization Tips

1. **Use Groq for most tasks** - Fastest and truly free
2. **Use Gemini Flash for quality** - Good balance of quality and cost
3. **Reserve OpenRouter for specific models** - When you need particular capabilities
4. **Monitor usage** - Check `ai_provider_usage` table for spend tracking
5. **Set budget limits** - Configure `ai_provider_budgets` to prevent overspend
