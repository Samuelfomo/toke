export interface ClockInData {
  site_id: number;
  latitude: number;
  longitude: number;
  device_info?: any;
  context?: any;
}

export interface ClockOutData {
  latitude: number;
  longitude: number;
  work_summary?: any;
  overtime_reason?: string;
}

export interface PauseData {
  pause_type: string;
  location?: string;
  expected_duration?: string;
}

export interface MissionData {
  destination: string;
  purpose: string;
  expected_return?: string;
  transport?: string;
}
