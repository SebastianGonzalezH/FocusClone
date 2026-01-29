-- Kronos Trial Setup Migration
-- Run this in Supabase SQL Editor to enable 3-day trials

-- 1. Ensure user_profiles has the trial columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- 2. Update the handle_new_user function to set 3-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    'trialing',
    NOW() + INTERVAL '3 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix existing users without trial_ends_at (give them 3 more days)
UPDATE user_profiles
SET
  trial_ends_at = NOW() + INTERVAL '3 days',
  subscription_status = 'trialing'
WHERE trial_ends_at IS NULL
  AND subscription_status IS NULL;
