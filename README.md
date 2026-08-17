# My AI Chat — ChatGPT-style React + Supabase + Vercel

A clean, responsive AI chat application designed for GitHub + Vercel deployment.

## Included

- Supabase email/password authentication
- Private chat history with Row Level Security
- New chat / rename / delete
- Streaming AI responses
- Markdown + GFM rendering
- Copy assistant responses
- Regenerate last answer
- Light/dark theme
- Image attachment support for vision-capable models
- Browser voice input when supported
- Mobile responsive sidebar
- OpenAI API key kept server-side
- Vercel serverless API

## 1. Create Supabase project

Create a Supabase project and open SQL Editor.

Run:

`supabase/schema.sql`

Then get your project URL and publishable/anon key.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local development.

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-5.6`)

The OpenAI key must stay server-side. Do NOT prefix it with `VITE_`.

## 3. Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## 4. GitHub

Create a GitHub repository and upload this project.

Do not upload `.env.local`.

## 5. Vercel

Import the GitHub repository into Vercel.

Vercel will detect Vite. Add the same environment variables in:

Project Settings → Environment Variables

Then redeploy.

## 6. Supabase Auth

In Supabase:

Authentication → URL Configuration

Set your Site URL to your Vercel URL, for example:

`https://your-project.vercel.app`

Add the same URL to Redirect URLs.

Email confirmation can be enabled or disabled from Supabase Auth settings according to your preference.

## Notes

This project is intentionally not an exact copy of ChatGPT branding. It provides a similar chat experience while using your own name, logo and configuration.

For image messages, the browser sends a data URL to the API. Keep image sizes reasonable for production. A future version can move uploads to Supabase Storage.

## Troubleshooting

### "Missing Supabase environment variables"
Check the two `VITE_` variables and restart Vite after changing `.env.local`.

### "OpenAI API key is not configured"
Set `OPENAI_API_KEY` in Vercel or `.env.local`. Never expose it in frontend code.

### Vercel refresh gives 404
The included `vercel.json` contains the SPA rewrite.

### Chat history not saving
Run `supabase/schema.sql` and confirm RLS policies exist. The browser session must be logged in.
