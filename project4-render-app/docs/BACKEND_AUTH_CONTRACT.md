# P004 backend authentication and data isolation contract

Status: **NOT IMPLEMENTED / NOT VERIFIED**. This document defines requirements; it does not assert that the deployed Supabase function satisfies them.

## Backend source still needed
Frontend calls `https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-securities-api`. Its implementation, database schema, deployment ownership and RLS policies have not been located in the accessible P004 repository. Do not add credentials or service-role keys to this repository.

## Authentication
- Master: `POST {action:"login_master",username,password,totp}` must verify credentials and TOTP on the server, enforce rate limits, and return `{ok:true,role:"master",sessionToken,expiresAt,displayName}`. `expiresAt` must be a future ISO-8601 timestamp.
- Ops and client: implement separate authenticated sign-in on the backend; never infer a role from a username prefix or accept a client-provided role.
- Every protected request: validate token signature, expiry, revocation, user state and role server-side. Deny by default.
- Logout: revoke the server session; removing a local token alone does not revoke it.
- Use a secure cookie-based session where feasible rather than storing sensitive bearer tokens in localStorage.

## Authorization and tenant isolation
- Client can read and mutate only records scoped to its server-derived user ID. Never use a display name or a hardcoded customer name as the authorization key.
- Ops can access only explicitly assigned customer accounts and allowed operations.
- Master has privileged administrative operations only after server-side authorization and step-up checks for high-risk actions.
- Enforce isolation in API handlers and database RLS, including list, detail, create, update, export and realtime endpoints.
- Do not trust the frontend `?scope=admin` query parameter for access control.
- All monetary/order transitions require server-side validation, immutable audit records and idempotency protection.

## Release gates
1. Locate the actual Supabase Edge Function source and schema.
2. Confirm live API response contract in a non-production environment without exposing secrets.
3. Implement and test master/ops/client sign-in, refresh, revocation and logout.
4. Add negative tests for cross-account reads/writes, role escalation, expired sessions and unauthorized exports.
5. Replace demo order/cash/position data with identity-scoped backend queries.
6. Obtain approval before enabling client login, merging breaking authentication changes or deploying.
