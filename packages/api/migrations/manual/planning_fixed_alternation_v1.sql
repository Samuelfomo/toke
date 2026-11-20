-- Apply to each existing tenant database before deploying this API version.
ALTER TABLE xa_planning_suggestion_config
  ADD COLUMN IF NOT EXISTS fixed_alternation_policy JSONB;
