/*
  # SaaS Customer Schema for WhatsApp Gateway

  ## Summary
  Creates the full multi-tenant SaaS data layer on top of the existing OpenWA infrastructure.

  ## New Tables

  ### 1. customers
  - Stores SaaS customer accounts (email/password login)
  - `id` (uuid, PK)
  - `email` (unique, used for login)
  - `password_hash` (bcrypt hash, never returned to clients)
  - `full_name`
  - `plan` (free | premium) — free plan enforces 1 WhatsApp session
  - `is_active` (boolean, default true)
  - `created_at`, `updated_at`

  ### 2. customer_sessions
  - Links a customer to a WhatsApp session managed by OpenWA
  - `id` (uuid, PK)
  - `customer_id` (FK → customers)
  - `openwa_session_id` (the session ID in OpenWA's own DB)
  - `display_name` (customer-chosen name for this number)
  - `status` (created | connecting | qr_ready | ready | disconnected | failed)
  - `phone_number` (filled once authenticated)
  - `connected_at` (timestamp when first connected)
  - `created_at`, `updated_at`

  ### 3. conversations
  - One row per unique chat (contact or group) per session
  - `id` (uuid, PK)
  - `customer_session_id` (FK → customer_sessions)
  - `chat_id` (WhatsApp chat identifier, e.g. "1234567890@c.us")
  - `contact_name` (display name from WhatsApp)
  - `contact_phone`
  - `last_message_body` (preview text)
  - `last_message_at` (for sorting)
  - `last_message_type` (text | image | video | audio | document)
  - `unread_count`
  - `updated_at`

  ### 4. messages
  - Full message history per conversation
  - `id` (uuid, PK)
  - `conversation_id` (FK → conversations)
  - `customer_session_id` (FK → customer_sessions, denormalized for fast queries)
  - `wa_message_id` (WhatsApp's own message ID, unique per session)
  - `direction` (incoming | outgoing)
  - `body` (text content)
  - `type` (text | image | video | audio | document | location | contact | sticker)
  - `media_url`
  - `media_filename`
  - `media_mimetype`
  - `timestamp` (unix timestamp from WhatsApp)
  - `status` (pending | sent | delivered | read | failed)
  - `metadata` (JSON for quoted messages, reactions, etc.)
  - `created_at`

  ## Security
  - RLS enabled on all four tables
  - Policies use `customer_id` (stored in JWT app_metadata) to isolate data
  - No cross-customer data access possible

  ## Indexes
  - conversations: (customer_session_id, last_message_at DESC)
  - messages: (conversation_id, timestamp DESC)
  - messages: (customer_session_id, created_at DESC)
  - messages: wa_message_id unique per customer_session_id
*/

-- ─────────────────────────────────────────────
-- 1. CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL DEFAULT '',
  plan          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers can read their own row
CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Customers can update their own row (name, email, password)
CREATE POLICY "Customers can update own profile"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert during registration (service role only — backend handles this)
CREATE POLICY "Service role can insert customers"
  ON customers FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. CUSTOMER SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  openwa_session_id  text NOT NULL,
  display_name       text NOT NULL DEFAULT '',
  status             text NOT NULL DEFAULT 'created'
                       CHECK (status IN ('created','connecting','qr_ready','ready','disconnected','failed')),
  phone_number       text,
  connected_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id
  ON customer_sessions(customer_id);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own sessions"
  ON customer_sessions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own sessions"
  ON customer_sessions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own sessions"
  ON customer_sessions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can delete own sessions"
  ON customer_sessions FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Service role needs full access for backend sync
CREATE POLICY "Service role full access to customer_sessions"
  ON customer_sessions FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert customer_sessions"
  ON customer_sessions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update customer_sessions"
  ON customer_sessions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete customer_sessions"
  ON customer_sessions FOR DELETE
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────
-- 3. CONVERSATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_session_id  uuid NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
  chat_id              text NOT NULL,
  contact_name         text,
  contact_phone        text,
  last_message_body    text,
  last_message_at      timestamptz,
  last_message_type    text DEFAULT 'text',
  unread_count         integer NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_session_last_msg
  ON conversations(customer_session_id, last_message_at DESC NULLS LAST);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = conversations.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = conversations.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = conversations.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = conversations.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to conversations"
  ON conversations FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert conversations"
  ON conversations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update conversations"
  ON conversations FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete conversations"
  ON conversations FOR DELETE
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────
-- 4. MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_session_id  uuid NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
  wa_message_id        text,
  direction            text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  body                 text,
  type                 text NOT NULL DEFAULT 'text'
                         CHECK (type IN ('text','image','video','audio','document','location','contact','sticker','unknown')),
  media_url            text,
  media_filename       text,
  media_mimetype       text,
  timestamp            bigint,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','sent','delivered','read','failed')),
  metadata             jsonb DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, timestamp DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_messages_session
  ON messages(customer_session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id_per_session
  ON messages(customer_session_id, wa_message_id)
  WHERE wa_message_id IS NOT NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = messages.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert own messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = messages.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = messages.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_sessions cs
      WHERE cs.id = messages.customer_session_id
        AND cs.customer_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to messages"
  ON messages FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert messages"
  ON messages FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update messages"
  ON messages FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete messages"
  ON messages FOR DELETE
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────
-- 5. AUTO-UPDATE updated_at triggers
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_updated_at') THEN
    CREATE TRIGGER trg_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_sessions_updated_at') THEN
    CREATE TRIGGER trg_customer_sessions_updated_at
      BEFORE UPDATE ON customer_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_updated_at') THEN
    CREATE TRIGGER trg_conversations_updated_at
      BEFORE UPDATE ON conversations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
