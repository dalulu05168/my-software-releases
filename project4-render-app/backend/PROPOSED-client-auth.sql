-- REVIEW ONLY. Do not run against production without separate approval.
-- Client credential verification is an atomic locked operation behind service_role RPC.
-- Existing public.client_auth/password_hash uses pgcrypto; no user data or passwords are embedded.
CREATE OR REPLACE FUNCTION public.project4_login_client_checked(
  p_login text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_identity record;
  v_auth record;
  v_attempts integer;
BEGIN
  IF p_login IS NULL OR length(trim(p_login)) < 3 OR length(p_login) > 254
     OR p_password IS NULL OR length(p_password) < 1 OR length(p_password) > 256 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  SELECT i.id, i.display_name, i.username, i.ops_account_id,
         ca.ops_account_id AS account_ops_id,
         ca.login_enabled, i.enabled, oa.status AS ops_status,
         a.password_hash, a.failed_login_attempts, a.locked_until
  INTO v_identity
  FROM public.identities AS i
  JOIN public.client_accounts AS ca ON ca.user_id = i.id
  JOIN public.client_auth AS a ON a.user_id = i.id
  LEFT JOIN public.ops_accounts AS oa ON oa.id = ca.ops_account_id
  WHERE i.role = 'CLIENT'::public.platform_role
    AND (lower(i.username) = lower(trim(p_login))
         OR lower(i.email) = lower(trim(p_login))
         OR i.phone = trim(p_login))
  ORDER BY i.created_at DESC
  LIMIT 1
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  IF v_identity.locked_until IS NOT NULL
     AND v_identity.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_TEMPORARILY_LOCKED');
  END IF;

  IF NOT v_identity.enabled OR NOT v_identity.login_enabled
     OR v_identity.account_ops_id IS NULL OR v_identity.ops_status IS DISTINCT FROM 'ACTIVE' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  IF v_identity.password_hash IS NULL
     OR extensions.crypt(p_password, v_identity.password_hash) IS DISTINCT FROM v_identity.password_hash THEN
    v_attempts := COALESCE(v_identity.failed_login_attempts, 0) + 1;
    UPDATE public.client_auth
    SET failed_login_attempts = v_attempts,
        locked_until = CASE WHEN v_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE user_id = v_identity.id;
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  UPDATE public.client_auth
  SET failed_login_attempts = 0, locked_until = NULL, updated_at = now()
  WHERE user_id = v_identity.id;

  RETURN jsonb_build_object(
    'ok', true,
    'userId', v_identity.id,
    'opsAccountId', v_identity.account_ops_id,
    'displayName', COALESCE(NULLIF(v_identity.display_name, ''), NULLIF(v_identity.username, ''), 'Client')
  );
END;
$$;
-- SECURITY DEFINER functions in public require strict EXECUTE control.
REVOKE ALL ON FUNCTION public.project4_login_client_checked(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project4_login_client_checked(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.project4_login_client_checked(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.project4_login_client_checked(text, text) TO service_role;
COMMENT ON FUNCTION public.project4_login_client_checked(text, text)
IS 'P004: service_role-only atomic credential check; login failure counters and lockout. Approval required before execution.';
