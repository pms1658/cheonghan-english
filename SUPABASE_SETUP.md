# Supabase Setup Guide

This guide will help you set up Supabase for the Hagwon LMS project.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: hagwon-lms
   - **Database Password**: (generate strong password and save it)
   - **Region**: Choose closest to Korea (e.g., Northeast Asia - Seoul)
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project" and wait ~2 minutes for provisioning

## Step 2: Run Database Schema

1. In your Supabase dashboard, navigate to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" (or press Ctrl+Enter)
6. Verify success message appears
7. Navigate to **Table Editor** to confirm all 8 tables were created:
   - users
   - vocabulary_classes
   - vocabulary_sets
   - vocabulary_words
   - passages
   - scores
   - sentence_analyses
   - class_students

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 4: Configure Environment Variables

1. Open `.env.local` in your project root (create if doesn't exist)
2. Add the following lines:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Existing Gemini API Key (should already be here)
GEMINI_API_KEY=your-gemini-key-here
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key-here
```

3. Replace `your-project-id` and `your-anon-key-here` with actual values from Step 3
4. Save the file

## Step 5: Install Supabase Client

Run this command in your project directory:

```bash
pnpm add @supabase/supabase-js
```

## Step 6: Verify Setup

After implementation is complete, you can verify the setup:

1. Start dev server: `pnpm dev`
2. Check browser console for any Supabase connection errors
3. Navigate to admin panel and try creating a passage
4. Check Supabase dashboard → **Table Editor** → **passages** table
5. You should see your new passage entry

## Authentication Notes

The current implementation uses a simplified authentication model:
- RLS policies check `role` field in `users` table
- For development, you can manually set `auth.uid()` using Supabase dashboard
- For production, integrate Supabase Auth properly with signup/login flows

## Troubleshooting

**Error: "Failed to fetch"**
- Check your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Ensure you're using the `anon` key, not the `service_role` key

**Error: "Row Level Security policy violation"**
- Check that RLS policies were created correctly
- Verify user role is set correctly in `users` table
- For development, you can temporarily disable RLS on a table (not recommended for production)

**Error: "relation does not exist"**
- Re-run the SQL schema from Step 2
- Check for any SQL errors in the query output

## Next Steps

After completing this setup:
1. Review the implementation plan in `implementation_plan.md`
2. Proceed with creating Supabase client utilities in `lib/supabase/`
3. Migrate mock data functions to use Supabase queries
4. Test thoroughly with the verification plan
