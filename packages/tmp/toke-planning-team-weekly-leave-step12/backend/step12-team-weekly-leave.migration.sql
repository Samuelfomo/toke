-- Step 12 — Team weekly leave rotation
-- Pharmacie du Plateau: exactly one employee receives a weekly leave,
-- only from Wednesday to Sunday, following employee rotation_order.

DO $$
BEGIN
  CREATE TYPE enum_xa_planning_suggestion_config_weekly_leave_mode
    AS ENUM ('NONE', 'PER_EMPLOYEE', 'TEAM_ROTATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.xa_planning_suggestion_config
  ADD COLUMN IF NOT EXISTS weekly_leave_mode
    enum_xa_planning_suggestion_config_weekly_leave_mode
    NOT NULL DEFAULT 'PER_EMPLOYEE',
  ADD COLUMN IF NOT EXISTS weekly_leave_employees_per_week
    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekly_leave_allowed_days
    JSONB NOT NULL DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_leave_rotation_anchor_date
    DATE NULL,
  ADD COLUMN IF NOT EXISTS weekly_leave_complete_weeks_only
    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS post_guard_rest_counts_as_weekly_leave
    BOOLEAN NOT NULL DEFAULT FALSE;

-- Plateau allows employees who are not selected for weekly leave to work 7/7.
ALTER TABLE public.xa_planning_suggestion_config
  ALTER COLUMN max_consecutive_work_days DROP NOT NULL,
  ALTER COLUMN max_consecutive_work_days DROP DEFAULT;

ALTER TABLE public.xa_planning_suggestion_config
  DROP CONSTRAINT IF EXISTS check_planning_weekly_leave_employees_per_week,
  DROP CONSTRAINT IF EXISTS check_planning_weekly_leave_allowed_days,
  DROP CONSTRAINT IF EXISTS check_planning_weekly_leave_team_rotation,
  DROP CONSTRAINT IF EXISTS check_planning_max_consecutive_work_days;

ALTER TABLE public.xa_planning_suggestion_config
  ADD CONSTRAINT check_planning_weekly_leave_employees_per_week
    CHECK (weekly_leave_employees_per_week >= 1),
  ADD CONSTRAINT check_planning_weekly_leave_allowed_days
    CHECK (
      jsonb_typeof(weekly_leave_allowed_days) = 'array'
      AND weekly_leave_allowed_days <@ '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb
    ),
  ADD CONSTRAINT check_planning_weekly_leave_team_rotation
    CHECK (
      weekly_leave_mode <> 'TEAM_ROTATION'
      OR (
        weekly_leave_rotation_anchor_date IS NOT NULL
        AND jsonb_array_length(weekly_leave_allowed_days) >= 1
      )
    ),
  ADD CONSTRAINT check_planning_max_consecutive_work_days
    CHECK (
      max_consecutive_work_days IS NULL
      OR max_consecutive_work_days BETWEEN 1 AND 366
    );

COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_mode IS
  'NONE, PER_EMPLOYEE or TEAM_ROTATION';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_employees_per_week IS
  'Number of employees receiving the team weekly leave in each eligible week';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_allowed_days IS
  'Weekdays on which the team weekly leave may be placed';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_rotation_anchor_date IS
  'Anchor date used to calculate the deterministic rotation_order cycle';
COMMENT ON COLUMN public.xa_planning_suggestion_config.weekly_leave_complete_weeks_only IS
  'When true, partial weeks do not receive a team weekly leave';
COMMENT ON COLUMN public.xa_planning_suggestion_config.post_guard_rest_counts_as_weekly_leave IS
  'When false, post-guard recovery cannot be reused as the team weekly leave';
