# Cooking App

Starter project for the cooking/meal-prep/nutrition tool. Built with React + Vite, connected to Supabase.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key (find these in your Supabase project settings under "API")
3. Run the dev server: `npm run dev`

## Deployment (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables to set in Netlify: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

See `cooking-app-plan.md` and `cooking-app-data-model.md` for the full product plan and data model.
