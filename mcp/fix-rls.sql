-- Restore read-only access for anon role
-- Run this in: Supabase Dashboard → SQL Editor

-- transactions
CREATE POLICY "anon read transactions"
  ON transactions
  FOR SELECT
  TO anon
  USING (true);

-- accounts
CREATE POLICY "anon read accounts"
  ON accounts
  FOR SELECT
  TO anon
  USING (true);

-- categories
CREATE POLICY "anon read categories"
  ON categories
  FOR SELECT
  TO anon
  USING (true);
