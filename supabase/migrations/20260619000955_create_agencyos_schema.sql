
-- ── AgencyOS Schema (prefixed with agency_ to avoid conflicts) ────────────────

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  owner_id uuid references auth.users(id),
  plan text default 'starter',
  agency_ai_provider text default 'openai',
  agency_ai_api_key text,
  openwa_url text,
  openwa_api_key text,
  n8n_url text,
  n8n_api_key text,
  created_at timestamptz default now()
);

create table if not exists sub_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade,
  name text not null,
  logo_url text,
  domain text,
  openwa_session_id text,
  openwa_session_status text default 'disconnected',
  created_at timestamptz default now()
);

create table if not exists user_sub_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now()
);

create table if not exists agency_contacts (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  whatsapp_id text,
  tags text[] default '{}',
  source text,
  avatar_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  stages jsonb not null default '["New Lead","Contacted","Proposal Sent","Won","Lost"]',
  created_at timestamptz default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  pipeline_id uuid references pipelines(id),
  contact_id uuid references agency_contacts(id),
  title text not null,
  value numeric default 0,
  stage text not null,
  assigned_to uuid references auth.users(id),
  close_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists agency_conversations (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  contact_id uuid references agency_contacts(id),
  channel text not null check (channel in ('whatsapp','webchat')),
  status text default 'open' check (status in ('open','closed','pending')),
  last_message text,
  last_message_at timestamptz default now(),
  unread_count int default 0,
  openwa_chat_id text,
  created_at timestamptz default now()
);

create table if not exists agency_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references agency_conversations(id) on delete cascade,
  content text,
  type text default 'text' check (type in ('text','image','file','audio')),
  sender_type text check (sender_type in ('contact','agent','bot')),
  sender_id uuid,
  openwa_message_id text,
  status text default 'sent',
  media_url text,
  created_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  contact_id uuid references agency_contacts(id),
  assigned_to uuid references auth.users(id),
  type text default 'appointment',
  status text default 'scheduled',
  created_at timestamptz default now()
);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb default '{}',
  actions jsonb default '[]',
  is_active boolean default false,
  n8n_workflow_id text,
  created_at timestamptz default now()
);

create table if not exists agency_media (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  url text not null,
  type text,
  size bigint,
  folder text default 'root',
  created_at timestamptz default now()
);

create table if not exists ai_agents (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  system_prompt text not null,
  ai_provider text default 'openai',
  ai_model text default 'gpt-4o-mini',
  temperature numeric default 0.7,
  use_agency_key boolean default true,
  custom_api_key text,
  channel text default 'whatsapp',
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists api_keys_store (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  provider text not null,
  api_key text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid references sub_accounts(id) on delete cascade,
  name text not null,
  type text default 'url',
  content text not null,
  image_url text,
  color text default '#000000',
  scans int default 0,
  created_at timestamptz default now()
);

-- ── Enable RLS ────────────────────────────────────────────────────────────────

alter table agencies enable row level security;
alter table sub_accounts enable row level security;
alter table user_sub_accounts enable row level security;
alter table agency_contacts enable row level security;
alter table pipelines enable row level security;
alter table opportunities enable row level security;
alter table agency_conversations enable row level security;
alter table agency_messages enable row level security;
alter table calendar_events enable row level security;
alter table automations enable row level security;
alter table agency_media enable row level security;
alter table ai_agents enable row level security;
alter table api_keys_store enable row level security;
alter table qr_codes enable row level security;

-- ── Agency policies ───────────────────────────────────────────────────────────

create policy "select_own_agencies" on agencies for select
  to authenticated using (auth.uid() = owner_id);
create policy "insert_own_agencies" on agencies for insert
  to authenticated with check (auth.uid() = owner_id);
create policy "update_own_agencies" on agencies for update
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "delete_own_agencies" on agencies for delete
  to authenticated using (auth.uid() = owner_id);

-- ── Sub-account policies ──────────────────────────────────────────────────────

create policy "select_own_sub_accounts" on sub_accounts for select
  to authenticated using (
    agency_id in (select id from agencies where owner_id = auth.uid())
    or id in (select sub_account_id from user_sub_accounts where user_id = auth.uid())
  );
create policy "insert_own_sub_accounts" on sub_accounts for insert
  to authenticated with check (
    agency_id in (select id from agencies where owner_id = auth.uid())
  );
create policy "update_own_sub_accounts" on sub_accounts for update
  to authenticated using (
    agency_id in (select id from agencies where owner_id = auth.uid())
  ) with check (
    agency_id in (select id from agencies where owner_id = auth.uid())
  );
create policy "delete_own_sub_accounts" on sub_accounts for delete
  to authenticated using (
    agency_id in (select id from agencies where owner_id = auth.uid())
  );

-- ── user_sub_accounts policies ────────────────────────────────────────────────

create policy "select_own_user_sub_accounts" on user_sub_accounts for select
  to authenticated using (
    user_id = auth.uid()
    or sub_account_id in (
      select sa.id from sub_accounts sa
      join agencies a on a.id = sa.agency_id
      where a.owner_id = auth.uid()
    )
  );
create policy "insert_own_user_sub_accounts" on user_sub_accounts for insert
  to authenticated with check (
    sub_account_id in (
      select sa.id from sub_accounts sa
      join agencies a on a.id = sa.agency_id
      where a.owner_id = auth.uid()
    )
  );
create policy "update_own_user_sub_accounts" on user_sub_accounts for update
  to authenticated using (
    sub_account_id in (
      select sa.id from sub_accounts sa
      join agencies a on a.id = sa.agency_id
      where a.owner_id = auth.uid()
    )
  );
create policy "delete_own_user_sub_accounts" on user_sub_accounts for delete
  to authenticated using (
    sub_account_id in (
      select sa.id from sub_accounts sa
      join agencies a on a.id = sa.agency_id
      where a.owner_id = auth.uid()
    )
  );

-- ── Helper function ───────────────────────────────────────────────────────────

create or replace function user_has_sub_account_access(p_sub_account_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from sub_accounts sa
    join agencies a on a.id = sa.agency_id
    where sa.id = p_sub_account_id
    and (
      a.owner_id = auth.uid()
      or sa.id in (select sub_account_id from user_sub_accounts where user_id = auth.uid())
    )
  )
$$;

-- ── Sub-account-scoped table policies ────────────────────────────────────────

create policy "select_agency_contacts" on agency_contacts for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_agency_contacts" on agency_contacts for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_agency_contacts" on agency_contacts for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_agency_contacts" on agency_contacts for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_pipelines" on pipelines for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_pipelines" on pipelines for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_pipelines" on pipelines for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_pipelines" on pipelines for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_opportunities" on opportunities for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_opportunities" on opportunities for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_opportunities" on opportunities for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_opportunities" on opportunities for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_agency_conversations" on agency_conversations for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_agency_conversations" on agency_conversations for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_agency_conversations" on agency_conversations for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_agency_conversations" on agency_conversations for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_agency_messages" on agency_messages for select
  to authenticated using (
    exists (
      select 1 from agency_conversations c
      where c.id = conversation_id
      and user_has_sub_account_access(c.sub_account_id)
    )
  );
create policy "insert_agency_messages" on agency_messages for insert
  to authenticated with check (
    exists (
      select 1 from agency_conversations c
      where c.id = conversation_id
      and user_has_sub_account_access(c.sub_account_id)
    )
  );
create policy "update_agency_messages" on agency_messages for update
  to authenticated using (
    exists (
      select 1 from agency_conversations c
      where c.id = conversation_id
      and user_has_sub_account_access(c.sub_account_id)
    )
  );
create policy "delete_agency_messages" on agency_messages for delete
  to authenticated using (
    exists (
      select 1 from agency_conversations c
      where c.id = conversation_id
      and user_has_sub_account_access(c.sub_account_id)
    )
  );

create policy "select_calendar_events" on calendar_events for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_calendar_events" on calendar_events for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_calendar_events" on calendar_events for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_calendar_events" on calendar_events for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_automations" on automations for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_automations" on automations for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_automations" on automations for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_automations" on automations for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_agency_media" on agency_media for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_agency_media" on agency_media for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_agency_media" on agency_media for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_agency_media" on agency_media for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_ai_agents" on ai_agents for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_ai_agents" on ai_agents for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_ai_agents" on ai_agents for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_ai_agents" on ai_agents for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_api_keys_store" on api_keys_store for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_api_keys_store" on api_keys_store for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_api_keys_store" on api_keys_store for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_api_keys_store" on api_keys_store for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));

create policy "select_qr_codes" on qr_codes for select
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "insert_qr_codes" on qr_codes for insert
  to authenticated with check (user_has_sub_account_access(sub_account_id));
create policy "update_qr_codes" on qr_codes for update
  to authenticated using (user_has_sub_account_access(sub_account_id));
create policy "delete_qr_codes" on qr_codes for delete
  to authenticated using (user_has_sub_account_access(sub_account_id));
