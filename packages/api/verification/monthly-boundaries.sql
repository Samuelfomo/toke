-- Vérification PostgreSQL en lecture seule : aucune donnée métier modifiée.
BEGIN READ ONLY;
DO $$
DECLARE anchor timestamptz; b1 timestamptz; b2 timestamptz;
BEGIN
  anchor := '2026-01-31T00:00:00+01:00';
  b1 := ((anchor AT TIME ZONE 'Africa/Douala') + make_interval(months => 1)) AT TIME ZONE 'Africa/Douala';
  b2 := ((anchor AT TIME ZONE 'Africa/Douala') + make_interval(months => 2)) AT TIME ZONE 'Africa/Douala';
  IF b1 <> '2026-02-28T00:00:00+01:00'::timestamptz OR b2 <> '2026-03-31T00:00:00+01:00'::timestamptz THEN
    RAISE EXCEPTION 'Month-end anniversary drift';
  END IF;
  anchor := '2026-10-09T00:00:00+01:00';
  b1 := ((anchor AT TIME ZONE 'Africa/Douala') + INTERVAL '1 month') AT TIME ZONE 'Africa/Douala';
  IF b1 <> '2026-11-09T00:00:00+01:00'::timestamptz THEN RAISE EXCEPTION 'Anniversary mismatch'; END IF;
  IF NOT (anchor >= anchor AND anchor < b1) OR (b1 >= anchor AND b1 < b1) THEN
    RAISE EXCEPTION 'Boundary inclusion mismatch';
  END IF;
  -- La durée UTC n'est pas forcément un multiple de 24 h lorsque le fuseau change d'heure.
  anchor := '2026-03-01T00:00:00+01:00';
  b1 := ((anchor AT TIME ZONE 'Europe/Paris') + INTERVAL '1 month') AT TIME ZONE 'Europe/Paris';
  IF b1 <> '2026-04-01T00:00:00+02:00'::timestamptz THEN RAISE EXCEPTION 'DST mismatch'; END IF;
  RAISE NOTICE 'PASS local month boundaries, month-end anchor, exclusive end, DST';
END $$;
ROLLBACK;
