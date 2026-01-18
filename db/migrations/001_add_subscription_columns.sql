-- Migration: Add subscription columns to user_profiles
-- Run this in Supabase SQL Editor

-- Add subscription tracking columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS payment_customer_id TEXT;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Set trial_ends_at for existing users (3 days from now)
UPDATE user_profiles
SET trial_ends_at = NOW() + INTERVAL '3 days'
WHERE trial_ends_at IS NULL;

-- Create function to auto-set trial on new user signup
CREATE OR REPLACE FUNCTION set_trial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subscription_status := 'trialing';
  NEW.trial_ends_at := NOW() + INTERVAL '3 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new signups
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;
CREATE TRIGGER on_user_profile_created
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_on_signup();
