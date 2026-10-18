-- Runs only against disposable PostgreSQL CI database.
begin;
do $$
begin
  if (select count(*) from pg_tables where schemaname='p004' and tablename in ('accounts','ops_clients','audit_events')) <> 3 then
    raise exception 'P004 identity tables missing';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='p004' and c.relname in ('accounts','ops_clients','audit_events') and c.relrowsecurity) <> 3 then
    raise exception 'RLS not enabled on all P004 tables';
  end if;
  if exists (select 1 from pg_policies where schemaname='p004') then
    raise exception 'Unexpected P004 RLS policies';
  end if;
  if has_schema_privilege('authenticated','p004','USAGE') or has_table_privilege('authenticated','p004.accounts','SELECT') then
    raise exception 'Authenticated role has direct P004 access';
  end if;
end $$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');
insert into p004.accounts(auth_user_id,role) values ('00000000-0000-4000-8000-000000000001','client');
do $$
begin
  begin
    insert into p004.accounts(auth_user_id,role) values ('00000000-0000-4000-8000-000000000001','master');
    raise exception 'Duplicate auth user accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into p004.accounts(auth_user_id,role) values ('00000000-0000-4000-8000-000000000002','superuser');
    raise exception 'Invalid role accepted';
  exception when check_violation then null;
  end;
end $$;
rollback;
