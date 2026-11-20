import type { AttendanceOverviewPageState } from '../types/attendance-statistics.ui.types.js';

export interface AttendanceOverviewStateInput {
  hasData: boolean;
  isLoading: boolean;
  hasError: boolean;
  teamSize: number | null;
}

export function resolveAttendanceOverviewPageState(
  input: AttendanceOverviewStateInput,
): AttendanceOverviewPageState {
  if (input.isLoading && !input.hasData) return 'loading';
  if (input.hasError && !input.hasData) return 'error';
  if (input.hasData && input.teamSize === 0) return 'empty';
  if (input.hasData) return 'ready';
  return 'idle';
}
