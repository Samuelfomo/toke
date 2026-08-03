-- Step 13 — Configurable weekly guard pool
-- Adds an optional tenant-level policy that limits guard assignments to a
-- stable pool of employees for each week. Existing tenants keep the former
-- DAILY_FLEXIBLE behaviour by default.

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_guard_team_mode
    AS ENUM ('DAILY_FLEXIBLE', 'WEEKLY_POOL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_guard_team_selection_mode
    AS ENUM ('ROTATION_ORDER', 'OPTIMIZED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.xa_planning_suggestion_config
  ADD COLUMN IF NOT EXISTS guard_team_mode
    enum_xa_planning_suggestion_config_guard_team_mode
    NOT NULL DEFAULT 'DAILY_FLEXIBLE',
  ADD COLUMN IF NOT EXISTS guard_team_employees_per_week
    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS guard_team_selection_mode
    enum_xa_planning_suggestion_config_guard_team_selection_mode
    NOT NULL DEFAULT 'ROTATION_ORDER',
  ADD COLUMN IF NOT EXISTS guard_team_rotation_anchor_date
    DATE NULL,
  ADD COLUMN IF NOT EXISTS guard_team_complete_weeks_only
    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS guard_team_require_participation
    BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.xa_planning_suggestion_config
  DROP CONSTRAINT IF EXISTS check_planning_guard_team_employees_per_week,
  DROP CONSTRAINT IF EXISTS check_planning_guard_team_weekly_pool;

ALTER TABLE public.xa_planning_suggestion_config
  ADD CONSTRAINT check_planning_guard_team_employees_per_week
    CHECK (guard_team_employees_per_week >= 1),
  ADD CONSTRAINT check_planning_guard_team_weekly_pool
    CHECK (
      guard_team_mode <> 'WEEKLY_POOL'
      OR guard_team_selection_mode <> 'ROTATION_ORDER'
      OR guard_team_rotation_anchor_date IS NOT NULL
    );

COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_mode IS
  'DAILY_FLEXIBLE keeps the legacy daily guard allocation; WEEKLY_POOL restricts guard starts to a stable weekly employee pool';
COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_employees_per_week IS
  'Exact number of ROTATING employees selected in the weekly guard pool';
COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_selection_mode IS
  'ROTATION_ORDER selects deterministically using employee rotation_order; OPTIMIZED lets CP-SAT choose fairly';
COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_rotation_anchor_date IS
  'Anchor week for deterministic guard-pool rotation';
COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_complete_weeks_only IS
  'When true, weekly-pool restrictions are not applied to partial weeks';
COMMENT ON COLUMN public.xa_planning_suggestion_config.guard_team_require_participation IS
  'When true, every employee selected in the weekly guard pool must start at least one guard during that week';
