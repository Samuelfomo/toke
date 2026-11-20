# Attendance statistics frontend contract v2.3

This update synchronizes the frontend TypeScript contract with the backend attendance-statistics v2.3 response.

## Added to duration aggregates
- `attributedWorkMinutes`
- `rawDeltaMinutes`
- `creditedExtraMinutes`
- `excessBeyondExtraMinutes`
- `deficitMinutes`
- `occurrencesWithKnownAttributedWorkDuration`
- `occurrencesWithKnownDelta`
- `occurrencesWithResolvedExtraPolicy`

## Added to employee/day results
- `attributedWorkMinutes`
- `rawDeltaMinutes`
- `deficitMinutes`
- `creditedExtraMinutes`
- `excessBeyondExtraMinutes`
- `extraAllowed`
- `extraMaxMinutes`

## Issues
`CORRECTED_PRESENCE` is now recognized by the frontend contract and presentation mapping.

No frontend business calculation has been added. Values are consumed from the API as-is.
No visual dashboard redesign is included in this lot.
