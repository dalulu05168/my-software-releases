# P004 backend scaffold (NOT DEPLOYED)

This folder is a starting point for a new backend, **not** the source of the existing production Edge Function. Do not deploy this migration into an unknown existing Supabase project.

The migration introduces a separate `p004` schema with identity roles, ops-client assignments, and append-only-intended audit events. RLS is enabled and no policies or direct client grants are installed (deny by default). Note: append-only enforcement, immutable audit guarantees, server API, tenant checks, authentication, and test coverage are **not implemented**.

Before applying: identify the correct Supabase project owner and environment, inspect existing schema and migration history, review auth.users integration, design role-assignment safeguards, service privileges, transaction boundaries and RLS policies. Add migrations and integration tests in an isolated staging project. Never commit credentials or service-role keys.

The current frontend calls an existing function `project4-securities-api`; this scaffold does not modify or replace it.
