
-- Drop existing sub_accounts policies
drop policy if exists "select_own_sub_accounts" on sub_accounts;
drop policy if exists "insert_own_sub_accounts" on sub_accounts;
drop policy if exists "update_own_sub_accounts" on sub_accounts;
drop policy if exists "delete_own_sub_accounts" on sub_accounts;

-- Security-definer functions bypass inner-table RLS, avoiding circular evaluation
create or replace function get_agency_ids_for_user()
returns setof uuid
language sql
security definer
stable
as $$
  select id from agencies where owner_id = auth.uid()
$$;

-- Re-create sub_accounts policies using the security-definer helper
create policy "select_own_sub_accounts" on sub_accounts for select
  to authenticated using (
    agency_id in (select get_agency_ids_for_user())
    or id in (select sub_account_id from user_sub_accounts where user_id = auth.uid())
  );

create policy "insert_own_sub_accounts" on sub_accounts for insert
  to authenticated with check (
    agency_id in (select get_agency_ids_for_user())
  );

create policy "update_own_sub_accounts" on sub_accounts for update
  to authenticated using (
    agency_id in (select get_agency_ids_for_user())
  ) with check (
    agency_id in (select get_agency_ids_for_user())
  );

create policy "delete_own_sub_accounts" on sub_accounts for delete
  to authenticated using (
    agency_id in (select get_agency_ids_for_user())
  );

-- Also fix user_sub_accounts insert policy (same pattern issue)
drop policy if exists "insert_own_user_sub_accounts" on user_sub_accounts;
create policy "insert_own_user_sub_accounts" on user_sub_accounts for insert
  to authenticated with check (
    sub_account_id in (
      select sa.id from sub_accounts sa
      where sa.agency_id in (select get_agency_ids_for_user())
    )
  );

-- Update user_has_sub_account_access to also use the helper
create or replace function user_has_sub_account_access(p_sub_account_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from sub_accounts sa
    where sa.id = p_sub_account_id
    and (
      sa.agency_id in (select get_agency_ids_for_user())
      or sa.id in (select sub_account_id from user_sub_accounts where user_id = auth.uid())
    )
  )
$$;
