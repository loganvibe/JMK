# JMK

Build a full-stack web application named "jmk" – a helpful platform for Nigerian university students to select final-year project topics based on department/course, save them, track progress, and get AI-assisted research support with tiered subscriptions.

Website name: jmk
Tagline: "Smart Project Topic Selection & Research Accelerator for Nigerian Students"

Tech stack & requirements:
- Frontend: React (Vite preferred for fast builds), Tailwind CSS, shadcn/ui components. Clean, modern, mobile-responsive UI with blue/green color scheme (professional & trustworthy). Support dark mode.
- Backend/Database/Auth: Use Supabase – email + Google login auth, PostgreSQL tables, row-level security (users only access their own data), Storage for file uploads.
- Payments: Integrate both Stripe (global) and Paystack (Nigeria-focused, NGN currency). Use test mode first. Handle ₦ pricing.
- AI: Integrate OpenAI/Anthropic/Groq API for generations (use env vars for API key – I'll add later). Gate heavy features behind subscriptions.
- Deployment: Make code clean, exportable to Netlify/Vercel (frontend + external API calls).

Core pages & features:

1. Landing page (public, no login required):
   - Hero section: "jmk – Pick Your Final Year Project Topic & Get Powerful Research Help"
   - Key benefits: Department-specific suggestions, save & track projects, premium tools for outlines & full assistance.
   - Testimonials-style placeholders: "Students get better-organized projects and stronger results with jmk."
   - CTA buttons: "Sign Up Free" and "See Pricing".
   - Footer: Strong disclaimers ("This is a reference & learning tool only. Users must add original work, understand content, and be ready to defend it. Not for direct submission."), contact links.

2. Authentication: Supabase auth – sign up/login with email/password or Google. Redirect to dashboard after login.

3. Dashboard (protected, after login):
   - Welcome: "Welcome to jmk, [User Name]!"
   - Department/course dropdown: Pre-populate 15+ common Nigerian options (e.g., Computer Science, Mechanical Engineering, Business Administration, Accounting, Microbiology, Law, Electrical Engineering, Mass Communication, etc.).
   - On selection: Display grid/list of 20+ project topics from Supabase (table: topics – columns: id, department, title, description, difficulty, keywords).
   - Filters: Keyword search, difficulty (easy/medium/hard), sort.
   - Topic cards: Title, short desc, "Save to My Projects" button.
   - Sidebar: My Saved Projects, Subscription Status, Progress Overview (simple checklist widget).

4. My Projects page:
   - List saved projects with status dropdown (In Progress / Completed / etc.).
   - Per project: User notes, progress checklist (Proposal / Lit Review / Methodology / etc.), file upload section (for guidelines/PDFs – Supabase Storage).

5. Pricing / Subscription page:
   - Clear comparison table:
     - Free: ₦0 – Basic topics, save, simple tracker.
     - Beta: ₦2,500 / month – Advanced research tools (source finder links, detailed outlines with placeholders, citation generator, viva prep questions, editing suggestions, limited AI refinements).
      - Premium+: ₦8,000 / month – Unlimited full generations (chapters, abstract, code snippets, diagrams), formatted exports (PDF/Word), plus upload old projects for modification (see below).
   - Show current status, upgrade buttons with Stripe/Paystack checkout.
   - Highlight Premium+ value: "Upload your old project and get a refreshed, modified new version – perfect for updates or rework."

6. Premium+ Exclusive: Modify Existing Project
   - New tab/page (visible only if Premium+ active): "Modify Old Project"
   - Upload button: Accept PDF, DOCX, DOC, TXT, ZIP (max 10MB). Store in Supabase Storage (bucket: project-files).
   - After upload: Show file info + textarea: "Describe the changes you want (e.g., update lit review with recent sources, rephrase sections, make it fit new topic: AI in Healthcare, fix structure)."
   - Optional: Upload new guidelines/rubric.
   - "Generate Modified New Version" button → AI prompt: Analyze uploaded content → apply changes → rewrite/rephrase/expand sections → output full updated project structure (abstract, chapters, references) as a fresh, original-feeling version.
   - Output: Professional markdown/text preview, iterative chat for refinements.
   - Download: Generate formatted PDF/Word (use pdfmake or docx lib client-side).
   - Save as new project entry (flag: is_modified = true, link to original).
   - Positive feedback: After generation → "Your refreshed project is ready! Polished, well-structured, and designed to help you achieve excellent results."

7. General AI Tools (gated by tier):
   - Research chat/refinement box (limited prompts on Beta, unlimited on Premium+).
   - Focus on quality: Outputs should be detailed, academic-tone, logical, well-formatted for positive/good results.

8. Disclaimers & Positive UX:
   - Everywhere generations happen: "This AI-assisted output is for reference, ideas, and learning only. Rewrite in your own words, add your original contributions, understand fully, and prepare to defend. jmk helps deliver strong, usable results when used responsibly."
   - Success messages: "Generation complete – high-quality, ready for your review!" or "Modified version created successfully – polished and improved!"

Database tables (set up in Supabase):
- departments: id, name
- topics: id, department_id, title, description, difficulty, keywords (array)
- user_projects: user_id, topic_id, status, notes, progress (json), uploaded_files (array), original_file_url, modified_content (jsonb), changes_description
- subscriptions: user_id, provider_id (stripe/paysack), tier, status, expiry

Other:
- Handle errors gracefully (e.g., "Upgrade to Premium+ for full modifications").
- Use env vars for keys (SUPABASE_URL, SUPABASE_KEY, STRIPE_KEY, PAYSTACK_KEY, OPENAI_KEY).
- Make app feel reliable/high-quality: Loading spinners, success toasts, clean design.

Generate the full initial structure: landing, auth, dashboard, pricing, database setup guide, and start on Premium+ modify feature. We can iterate from here.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://idea-innovate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c8111fe4-05a0-456f-af9f-cae3c92af690).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
