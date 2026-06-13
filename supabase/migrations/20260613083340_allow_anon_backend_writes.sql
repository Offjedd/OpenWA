-- Allow NestJS backend (anon key) to write to all SaaS tables.
-- Security is enforced at the NestJS JWT layer; Supabase is used as a
-- data store + realtime bus, not as the auth boundary.

-- CUSTOMERS: allow anon insert and update (backend syncs from SQLite)
CREATE POLICY "Backend can insert customers"
  ON customers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Backend can update customers"
  ON customers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend can select customers"
  ON customers FOR SELECT
  TO anon
  USING (true);

-- CUSTOMER_SESSIONS: allow anon full access
CREATE POLICY "Backend anon full select on customer_sessions"
  ON customer_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Backend anon can insert customer_sessions"
  ON customer_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Backend anon can update customer_sessions"
  ON customer_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend anon can delete customer_sessions"
  ON customer_sessions FOR DELETE
  TO anon
  USING (true);

-- CONVERSATIONS: allow anon full access
CREATE POLICY "Backend anon full select on conversations"
  ON conversations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Backend anon can insert conversations"
  ON conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Backend anon can update conversations"
  ON conversations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend anon can delete conversations"
  ON conversations FOR DELETE
  TO anon
  USING (true);

-- MESSAGES: allow anon full access
CREATE POLICY "Backend anon full select on messages"
  ON messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Backend anon can insert messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Backend anon can update messages"
  ON messages FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend anon can delete messages"
  ON messages FOR DELETE
  TO anon
  USING (true);
