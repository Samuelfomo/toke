-- Step 14 — Generic service-scoped planning policies
-- This migration is tenant-neutral. Existing configurations retain their
-- previous behaviour because every new field has a backward-compatible default.
-- Prerequisite: Step 13 weekly guard pool migration.

-- Extend the enum actually used by weekly_leave_mode. Looking it up from
-- PostgreSQL metadata avoids depending on a Sequelize-generated enum name.
DO $$
DECLARE
  weekly_leave_enum_name text;
BEGIN
  SELECT type_info.typname
    INTO weekly_leave_enum_name
  FROM pg_attribute attribute_info
  JOIN pg_class table_info
    ON table_info.oid = attribute_info.attrelid
  JOIN pg_namespace namespace_info
    ON namespace_info.oid = table_info.relnamespace
  JOIN pg_type type_info
    ON type_info.oid = attribute_info.atttypid
  WHERE namespace_info.nspname = 'public'
    AND table_info.relname = 'xa_planning_suggestion_config'
    AND attribute_info.attname = 'weekly_leave_mode'
    AND attribute_info.attnum > 0
    AND NOT attribute_info.attisdropped;

  IF weekly_leave_enum_name IS NULL THEN
    RAISE EXCEPTION
      'weekly_leave_mode column is missing; install the previous planning migrations first';
  END IF;

  EXECUTE format(
    'ALTER TYPE %I ADD VALUE IF NOT EXISTS %L',
    weekly_leave_enum_name,
    'PER_ELIGIBLE_EMPLOYEE'
  );
END
$$;

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_weekly_leave_count_mode
    AS ENUM ('MINIMUM', 'EXACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_guard_team_member_service_access
    AS ENUM ('ANY_SERVICE', 'GUARD_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_guard_team_balance_mode
    AS ENUM ('NONE', 'SOFT', 'STRICT');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.xa_planning_suggestion_config
  ADD COLUMN IF NOT EXISTS policy_schema_version
    INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS weekly_leave_selector
    JSONB NOT NULL DEFAULT '{"planning_modes":["ROTATING"],"guard_pool_relation":"ANY"}'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_leave_days_per_employee
    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekly_leave_count_mode
    enum_xa_planning_suggestion_config_weekly_leave_count_mode
    NOT NULL DEFAULT 'EXACT',
  ADD COLUMN IF NOT EXISTS weekly_leave_max_employees_per_day
    INTEGER NULL,
  ADD COLUMN IF NOT EXISTS weekly_leave_require_work_on_other_days
    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weekly_leave_service_scope
    JSONB NOT NULL DEFAULT '{"mode":"ANY","service_types":[],"template_guids":[],"requirement_guids":[],"exclusive":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS guard_team_eligible_planning_modes
    JSONB NOT NULL DEFAULT '["ROTATING"]'::jsonb,
  ADD COLUMN IF NOT EXISTS guard_team_member_service_access
    enum_xa_planning_suggestion_config_guard_team_member_service_access
    NOT NULL DEFAULT 'ANY_SERVICE',
  ADD COLUMN IF NOT EXISTS guard_team_balance_mode
    enum_xa_planning_suggestion_config_guard_team_balance_mode
    NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS guard_team_max_membership_spread
    INTEGER NULL,
  ADD COLUMN IF NOT EXISTS guard_team_max_consecutive_membership_weeks
    INTEGER NULL;

ALTER TABLE public.xa_planning_suggestion_requirement
  ADD COLUMN IF NOT EXISTS eligibility_policy
    JSONB NOT NULL DEFAULT '{"planning_modes":["FIXED","ROTATING"],"guard_pool_relation":"ANY"}'::jsonb;

-- Normalize rows created by intermediate deployments or manual scripts.
UPDATE public.xa_planning_suggestion_config
SET
  policy_schema_version = COALESCE(policy_schema_version, 2),
  weekly_leave_selector = COALESCE(
    weekly_leave_selector,
    '{"planning_modes":["ROTATING"],"guard_pool_relation":"ANY"}'::jsonb
  ),
  weekly_leave_days_per_employee = COALESCE(weekly_leave_days_per_employee, 1),
  weekly_leave_count_mode = COALESCE(weekly_leave_count_mode, 'EXACT'),
  weekly_leave_require_work_on_other_days = COALESCE(
    weekly_leave_require_work_on_other_days,
    FALSE
  ),
  weekly_leave_service_scope = COALESCE(
    weekly_leave_service_scope,
    '{"mode":"ANY","service_types":[],"template_guids":[],"requirement_guids":[],"exclusive":false}'::jsonb
  ),
  guard_team_eligible_planning_modes = COALESCE(
    guard_team_eligible_planning_modes,
    '["ROTATING"]'::jsonb
  ),
  guard_team_member_service_access = COALESCE(
    guard_team_member_service_access,
    'ANY_SERVICE'
  ),
  guard_team_balance_mode = COALESCE(guard_team_balance_mode, 'NONE');

UPDATE public.xa_planning_suggestion_requirement
SET eligibility_policy = COALESCE(
  eligibility_policy,
  '{"planning_modes":["FIXED","ROTATING"],"guard_pool_relation":"ANY"}'::jsonb
);

-- Canonicalize the selector before computing uniqueness. The order of the
-- planning_modes array must not allow two semantically identical populations.
UPDATE public.xa_planning_suggestion_requirement
SET eligibility_policy = jsonb_set(
  jsonb_set(
    eligibility_policy,
    '{planning_modes}',
    CASE
      WHEN (eligibility_policy -> 'planning_modes') ? 'FIXED'
       AND (eligibility_policy -> 'planning_modes') ? 'ROTATING'
        THEN '["FIXED","ROTATING"]'::jsonb
      WHEN (eligibility_policy -> 'planning_modes') ? 'FIXED'
        THEN '["FIXED"]'::jsonb
      WHEN (eligibility_policy -> 'planning_modes') ? 'ROTATING'
        THEN '["ROTATING"]'::jsonb
      ELSE '["FIXED","ROTATING"]'::jsonb
    END,
    TRUE
  ),
  '{guard_pool_relation}',
  to_jsonb(
    CASE
      WHEN eligibility_policy ->> 'guard_pool_relation'
        IN ('ANY', 'MEMBER', 'NON_MEMBER')
        THEN eligibility_policy ->> 'guard_pool_relation'
      ELSE 'ANY'
    END
  ),
  TRUE
);

-- A template/day may legitimately have several coverage rules when each one
-- targets a different population. Only an exact duplicate selector is blocked.
DROP INDEX IF EXISTS public.unique_active_requirement_slot;
DROP INDEX IF EXISTS public.unique_active_fill_remaining_requirement;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.xa_planning_suggestion_requirement
    WHERE active = TRUE
      AND deleted_at IS NULL
    GROUP BY
      config,
      day_of_week,
      session_template,
      md5(eligibility_policy::text)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate active planning requirements exist for the same slot and employee population';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.xa_planning_suggestion_requirement
    WHERE active = TRUE
      AND deleted_at IS NULL
      AND allocation_mode = 'FILL_REMAINING'
    GROUP BY
      config,
      day_of_week,
      md5(eligibility_policy::text)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate active FILL_REMAINING requirements exist for the same day and employee population';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_requirement_slot_population
  ON public.xa_planning_suggestion_requirement (
    config,
    day_of_week,
    session_template,
    (md5(eligibility_policy::text))
  )
  WHERE active = TRUE AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_fill_remaining_population
  ON public.xa_planning_suggestion_requirement (
    config,
    day_of_week,
    (md5(eligibility_policy::text))
  )
  WHERE active = TRUE
    AND deleted_at IS NULL
    AND allocation_mode = 'FILL_REMAINING';

ALTER TABLE public.xa_planning_suggestion_config
  DROP CONSTRAINT IF EXISTS check_planning_policy_schema_version,
  DROP CONSTRAINT IF EXISTS check_planning_weekly_leave_days_per_employee,
  DROP CONSTRAINT IF EXISTS check_planning_weekly_leave_max_per_day,
  DROP CONSTRAINT IF EXISTS check_planning_guard_membership_spread,
  DROP CONSTRAINT IF EXISTS check_planning_guard_consecutive_membership_weeks,
  DROP CONSTRAINT IF EXISTS check_planning_strict_guard_balance;

ALTER TABLE public.xa_planning_suggestion_config
  ADD CONSTRAINT check_planning_policy_schema_version
    CHECK (policy_schema_version >= 2),
  ADD CONSTRAINT check_planning_weekly_leave_days_per_employee
    CHECK (weekly_leave_days_per_employee BETWEEN 1 AND 7),
  ADD CONSTRAINT check_planning_weekly_leave_max_per_day
    CHECK (
      weekly_leave_max_employees_per_day IS NULL
      OR weekly_leave_max_employees_per_day >= 1
    ),
  ADD CONSTRAINT check_planning_guard_membership_spread
    CHECK (
      guard_team_max_membership_spread IS NULL
      OR guard_team_max_membership_spread BETWEEN 0 AND 52
    ),
  ADD CONSTRAINT check_planning_guard_consecutive_membership_weeks
    CHECK (
      guard_team_max_consecutive_membership_weeks IS NULL
      OR guard_team_max_consecutive_membership_weeks BETWEEN 1 AND 52
    ),
  ADD CONSTRAINT check_planning_strict_guard_balance
    CHECK (
      guard_team_balance_mode <> 'STRICT'
      OR guard_team_max_membership_spread IS NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_planning_requirement_eligibility_policy
  ON public.xa_planning_suggestion_requirement USING gin (eligibility_policy);

CREATE INDEX IF NOT EXISTS idx_planning_config_weekly_leave_selector
  ON public.xa_planning_suggestion_config USING gin (weekly_leave_selector);

CREATE INDEX IF NOT EXISTS idx_planning_config_weekly_leave_service_scope
  ON public.xa_planning_suggestion_config USING gin (weekly_leave_service_scope);

COMMENT ON COLUMN public.xa_planning_suggestion_config.policy_schema_version IS
  'Version of the generic planning-policy payload persisted by the tenant';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_selector IS
  'Generic employee selector: planning_modes and relation to the weekly guard pool';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_service_scope IS
  'Generic work scope: any service, service type, template or requirement';
COMMENT ON COLUMN public.xa_planning_suggestion_requirement.eligibility_policy IS
  'Population allowed to cover this requirement, independent of tenant identity';
