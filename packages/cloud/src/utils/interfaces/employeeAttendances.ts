// ============================================================================
// API RESPONSE INTERFACES (listEntries structure with raw pointage entries)
// ============================================================================

export interface PeriodAttendanceResponse {
    success: boolean;
    data: {
        message: string;
        data: {
            pagination: {
                offset: number;
                limit: number;
                count: number;
            };
            entries: PointageEntry[];
        };
    };
}

export interface PointageEntry {
    guid: string;
    pointage_type: 'clock_in' | 'clock_out' | 'pause_start' | 'pause_end' | 'external_mission';
    pointage_status: 'accepted' | 'pending' | 'rejected';
    clocked_at: string;
    server_received_at: string;
    real_clocked_at: string | null;
    created_offline: boolean;
    coordinates: string;
    gps_accuracy: number | null;
    correction_reason: string | null;
    user: User;
    device: Device;
    site: Site;
    session: Session;
    memo: Memo | null;
    device_info: any | null;
    ip_address: string | null;
    user_agent: string | null;
    local_id: string | null;
    sync_attempts: number;
    last_sync_attempt: string | null;
    updated_at: string;
    is_valid: boolean;
    requires_validation: boolean;
    within_geofence: boolean;
    has_anomalies: boolean;
    fraud_score: number;
}

export interface User {
    guid: string;
    tenant: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    country: string;
    employee_code: string;
    avatar_url: string | null;
    hire_date: string;
    department: string;
    job_title: string;
    active: boolean;
    last_login_at: string | null;
    assignment_info: AssignmentInfo;
}

export interface AssignmentInfo {
    current_type: 'none' | 'schedule' | 'rotation';
    active_schedule_assignment: string | null;
    active_rotation_assignment: any | null;
}

export interface Device {
    guid: string;
    name: string;
    device_type: 'ANDROID' | 'IOS';
    gps_accuracy: number | null;
    custom_geofence_radius: number | null;
    last_seen_at: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    assigned_to: User | null;
    config_by: string | null;
    days_since_last_seen: number;
    is_inactive: boolean;
    has_good_accuracy: boolean;
}

export interface Site {
    guid: string;
    tenant: string;
    name: string;
    site_type: 'global_site' | 'manager_site';
    address: {
        city: string;
        location: string;
        place_name: string;
    };
    geofence_radius: number;
    active: boolean;
    public: boolean;
    allowed_roles: Record<string, string> | null;
    geofence_polygon: any;
    created_at: string;
    updated_at: string;
    created_by: string;
    qr_token: string | null;
}

export interface Session {
    guid: string;
    user: string;
    site: string;
    session_status: 'open' | 'closed' | 'corrected' | 'abandoned';
    session_start_at: string;
    session_end_at: string | null;
    total_work_duration: number | null;
    total_pause_duration: number | null;
    created_at: string;
    updated_at: string;
    start_coordinates: string | null;
    end_coordinates: string | null;
}

export interface Memo {
    guid: string;
    memo_type: 'auto_generated' | 'correction_request' | 'delay_justification';
    memo_status: 'pending' | 'submitted' | 'validated' | 'rejected';
    title: string;
    memo_content: any[];
    incident_date_time: string;
    auto_generated: boolean;
    created_at: string;
    updated_at: string;
    affected_entries: string[];
    messages_count: number;
    latest_message: any;
    author_user: User;
    target_user: User | null;
    validator_user: User | null;
    affected_session: string | null;
    details: string;
}

// ============================================================================
// TRANSFORMED INTERFACES (For UI consumption)
// ============================================================================

export interface TransformedEmployee {
    guid: string;
    name: string;
    initials: string;
    avatar: string | null;
    department: string;
    job_title: string;
    employee_code: string;
    email: string;
    phone_number: string;

    // Current status
    status: 'present' | 'late' | 'absent' | 'off-day' | 'on-pause' | 'active' | 'external-mission';
    statusText: string;
    statusColor: string;
    currently_active: boolean;

    // Today's details
    today: {
        expected_time: string | null;
        clock_in_time: string | null;
        clock_out_time: string | null;
        pause_start_time: string | null;
        pause_end_time: string | null;
        mission_start_time: string | null;
        mission_end_time: string | null;
        delay_minutes: number | null;
        delay_text: string | null;
        work_hours: number | null;
        is_late: boolean;
        is_absent: boolean;
        is_present: boolean;
        is_off_day: boolean;
    };

    // Priority and scoring
    priority: 'high' | 'medium' | 'low';
    punctuality_score: number;

    // Session information
    current_session: Session | null;

    // Anomalies and memos
    has_anomalies: boolean;
    pending_memos: Memo[];
    fraud_score: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Groups pointage entries by user GUID
 */
export function groupEntriesByUser(entries: PointageEntry[]): Map<string, PointageEntry[]> {
    const grouped = new Map<string, PointageEntry[]>();

    entries.forEach(entry => {
        const userGuid = entry.user?.guid;

        if (userGuid) {
            if (!grouped.has(userGuid)) {
                grouped.set(userGuid, []);
            }
            grouped.get(userGuid)!.push(entry);
        }
    });

    return grouped;
}

/**
 * Gets the latest entry of a specific type
 */
export function getLatestEntry(
    entries: PointageEntry[],
    type: PointageEntry['pointage_type']
): PointageEntry | null {
    const filtered = entries
        .filter(e => e.pointage_type === type)
        .sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

    return filtered[0] || null;
}

/**
 * Calculates delay in minutes from expected time
 */
export function calculateDelay(
    actualTime: string,
    expectedTime: string
): number {
    // Extraire l'heure locale depuis l'ISO string (HH:mm de la partie temps)
    // ex: "2026-02-19T09:16:09.320Z" → on compare uniquement HH:mm vs HH:mm attendu
    // pour éviter tout décalage lié au fuseau horaire (UTC vs heure locale).
    const actualDate = new Date(actualTime);

    // Heure réelle en minutes depuis minuit (UTC, qui correspond à l'heure stockée)
    const actualMinutes = actualDate.getUTCHours() * 60 + actualDate.getUTCMinutes();

    // Heure attendue en minutes depuis minuit
    const [hours, minutes] = expectedTime.split(':').map(Number);
    const expectedMinutes = hours * 60 + minutes;

    return actualMinutes - expectedMinutes;
}

/**
 * Formats delay into human-readable text
 */
export function formatDelayText(delayMinutes: number): string {
    if (delayMinutes <= 0) return 'À l\'heure';

    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    }
    return `+${minutes}min`;
}

/**
 * Gets user initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Determines employee status based on entries
 */
export function determineStatus(
    entries: PointageEntry[],
    today: Date = new Date()
): TransformedEmployee['status'] {
    const todayStr = today.toISOString().split('T')[0];
    const todayEntries = entries.filter(e =>
        e.clocked_at.startsWith(todayStr)
    );

    if (todayEntries.length === 0) return 'absent';

    const latestClockIn = getLatestEntry(todayEntries, 'clock_in');
    const latestClockOut = getLatestEntry(todayEntries, 'clock_out');
    const latestPauseStart = getLatestEntry(todayEntries, 'pause_start');
    const latestPauseEnd = getLatestEntry(todayEntries, 'pause_end');
    const latestMission = getLatestEntry(todayEntries, 'external_mission');

    // Check if on external mission
    if (latestMission && !latestClockOut) {
        return 'external-mission';
    }

    // Check if on pause
    if (latestPauseStart && (!latestPauseEnd ||
        new Date(latestPauseStart.clocked_at) > new Date(latestPauseEnd.clocked_at))) {
        return 'on-pause';
    }

    // Check if clocked out
    if (latestClockOut && (!latestClockIn ||
        new Date(latestClockOut.clocked_at) > new Date(latestClockIn.clocked_at))) {
        return 'present';
    }

    // Check if currently active (clocked in but not out)
    if (latestClockIn) {
        const expectedTime = extractExpectedTime(latestClockIn);

        // If no expected time (rest day or no schedule), just mark as active
        if (!expectedTime) return 'active';

        const delayMinutes = calculateDelay(latestClockIn.clocked_at, expectedTime);

        // Tolerance: read from schedule if possible, default 15 min
        const tolerance = extractTolerance(latestClockIn) ?? 15;

        // Late only if delay is POSITIVE and exceeds tolerance.
        // Negative delay means the employee arrived BEFORE their shift → active (on time).
        return delayMinutes > tolerance ? 'late' : 'active';
    }

    return 'absent';
}

/**
 * Extract expected start time from the employee's schedule/rotation assignment.
 *
 * The API returns the full assignment object inside user.assignment_info.
 * We read the session_template.definition keyed by day-of-week (Mon/Tue/etc.)
 * to get the real shift start time for the day of the entry.
 *
 * Returns null if no schedule is found (no expected time to compare against).
 */
function extractExpectedTime(entry: PointageEntry | null): string | null {
    if (!entry?.user?.assignment_info) return null;

    const assignmentInfo = entry.user.assignment_info as any;
    const clockedAt = new Date(entry.clocked_at);

    // Day abbreviation matching the API definition keys (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
    const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKey = dayKeys[clockedAt.getDay()];

    // ── SCHEDULE assignment ──────────────────────────────────────────────────
    if (assignmentInfo.current_type === 'schedule' && assignmentInfo.active_schedule_assignment) {
        const scheduleAssignment = assignmentInfo.active_schedule_assignment;
        const definition = scheduleAssignment.session_template?.definition;

        if (definition) {
            const dayConfig = definition[dayKey];
            // dayConfig is an array of shifts, or null if rest day
            if (Array.isArray(dayConfig) && dayConfig.length > 0) {
                const firstShift = dayConfig[0];
                if (firstShift?.work && Array.isArray(firstShift.work) && firstShift.work.length > 0) {
                    return firstShift.work[0]; // "HH:mm" start time
                }
            }
            // dayConfig is null → rest day, no expected time
            if (dayConfig === null) return null;
        }
    }

    // ── ROTATION assignment ──────────────────────────────────────────────────
    if (assignmentInfo.current_type === 'rotation' && assignmentInfo.active_rotation_assignment) {
        const rotation = assignmentInfo.active_rotation_assignment;
        const templates = rotation.rotation_group?.cycle_templates || [];

        for (const template of templates) {
            const dayConfig = template.definition?.[dayKey];
            if (Array.isArray(dayConfig) && dayConfig.length > 0) {
                const firstShift = dayConfig[0];
                if (firstShift?.work && Array.isArray(firstShift.work) && firstShift.work.length > 0) {
                    return firstShift.work[0];
                }
            }
        }
    }

    // No assignment found → no expected time (rest day / unassigned)
    return null;
}


/**
 * Extract the tolerance (in minutes) from the employee's schedule for the day.
 * Falls back to 15 minutes if not found.
 */
function extractTolerance(entry: PointageEntry | null): number | null {
    if (!entry?.user?.assignment_info) return null;

    const assignmentInfo = entry.user.assignment_info as any;
    const clockedAt = new Date(entry.clocked_at);
    const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKey = dayKeys[clockedAt.getDay()];

    if (assignmentInfo.current_type === 'schedule' && assignmentInfo.active_schedule_assignment) {
        const definition = assignmentInfo.active_schedule_assignment.session_template?.definition;
        if (definition) {
            const dayConfig = definition[dayKey];
            if (Array.isArray(dayConfig) && dayConfig.length > 0) {
                const tolerance = dayConfig[0]?.tolerance;
                if (typeof tolerance === 'number') return tolerance;
            }
        }
    }

    return null;
}

/**
 * Gets status color based on status
 */
export function getStatusColor(status: TransformedEmployee['status']): string {
    const colors: Record<TransformedEmployee['status'], string> = {
        'present': '#10b981',
        'active': '#3b82f6',
        'late': '#f59e0b',
        'absent': '#ef4444',
        'off-day': '#6b7280',
        'on-pause': '#8b5cf6',
        'external-mission': '#06b6d4',
    };

    return colors[status] || '#6b7280';
}

/**
 * Gets status text based on status
 */
export function getStatusText(status: TransformedEmployee['status']): string {
    const texts: Record<TransformedEmployee['status'], string> = {
        'present': 'Présent',
        'active': 'Actif',
        'late': 'En retard',
        'absent': 'Absent',
        'off-day': 'Repos',
        'on-pause': 'En pause',
        'external-mission': 'Mission externe',
    };

    return texts[status] || 'Inconnu';
}

/**
 * Calculate work hours between clock in and clock out
 */
function calculateWorkHours(clockIn: PointageEntry | null, clockOut: PointageEntry | null): number | null {
    if (!clockIn || !clockOut) return null;

    const start = new Date(clockIn.clocked_at);
    const end = new Date(clockOut.clocked_at);
    const diffMs = end.getTime() - start.getTime();

    return diffMs / (1000 * 60 * 60);
}

/**
 * Determine priority based on status and delay
 */
function determinePriority(
    status: TransformedEmployee['status'],
    delayMinutes: number | null
): TransformedEmployee['priority'] {
    if (status === 'absent') return 'high';
    if (status === 'late' && delayMinutes && delayMinutes > 60) return 'high';
    if (status === 'late') return 'medium';
    return 'low';
}

/**
 * Transform API response to list of TransformedEmployees
 */
export function transformApiResponse(response: PeriodAttendanceResponse): TransformedEmployee[] {
    const entries = response.data.data.entries;
    const entriesByUser = groupEntriesByUser(entries);
    const employees: TransformedEmployee[] = [];

    entriesByUser.forEach((userEntries, userGuid) => {
        const user = userEntries[0].user;
        if (!user) return;

        const status = determineStatus(userEntries);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntries = userEntries.filter(e => e.clocked_at.startsWith(todayStr));

        const latestClockIn = getLatestEntry(todayEntries, 'clock_in');
        const latestClockOut = getLatestEntry(todayEntries, 'clock_out');
        const latestPauseStart = getLatestEntry(todayEntries, 'pause_start');
        const latestPauseEnd = getLatestEntry(todayEntries, 'pause_end');
        const latestMission = getLatestEntry(todayEntries, 'external_mission');

        const expectedTime = extractExpectedTime(latestClockIn);
        let delayMinutes: number | null = null;
        // Only calculate delay if we have a real expected time AND the employee clocked in
        // A negative delay means the employee arrived early → treat as on time (delay = null)
        if (latestClockIn && expectedTime) {
            const rawDelay = calculateDelay(latestClockIn.clocked_at, expectedTime);
            const tolerance = extractTolerance(latestClockIn) ?? 15;
            delayMinutes = rawDelay > tolerance ? rawDelay : null;
        }

        const currentSession = latestClockIn?.session || null;
        const pendingMemos = userEntries.filter(e => e.memo?.memo_status === 'pending').map(e => e.memo!);

        employees.push({
            guid: user.guid,
            name: `${user.first_name} ${user.last_name}`,
            initials: getInitials(user.first_name, user.last_name),
            avatar: user.avatar_url,
            department: user.department || 'N/A',
            job_title: user.job_title || 'N/A',
            employee_code: user.employee_code,
            email: user.email,
            phone_number: user.phone_number,

            status,
            statusText: getStatusText(status),
            statusColor: getStatusColor(status),
            currently_active: status === 'active' || status === 'on-pause',

            today: {
                expected_time: expectedTime, // null si jour de repos ou pas d'horaire assigné
                clock_in_time: latestClockIn?.clocked_at || null,
                clock_out_time: latestClockOut?.clocked_at || null,
                pause_start_time: latestPauseStart?.clocked_at || null,
                pause_end_time: latestPauseEnd?.clocked_at || null,
                mission_start_time: latestMission?.clocked_at || null,
                mission_end_time: latestClockOut?.clocked_at || null,
                delay_minutes: delayMinutes,
                delay_text: delayMinutes ? formatDelayText(delayMinutes) : null,
                work_hours: calculateWorkHours(latestClockIn, latestClockOut),
                is_late: status === 'late',
                is_absent: status === 'absent',
                is_present: status === 'present' || status === 'active',
                is_off_day: status === 'off-day',
            },

            priority: determinePriority(status, delayMinutes),
            punctuality_score: 85, // Placeholder

            current_session: currentSession,
            has_anomalies: userEntries.some(e => e.has_anomalies),
            pending_memos: pendingMemos,
            fraud_score: Math.max(...userEntries.map(e => e.fraud_score)),
        });
    });

    return employees;
}

/**
 * Format time from ISO string to HH:mm
 */
// export function formatTime(isoString: string | null): string | null {
//     if (!isoString) return null;
//
//     const date = new Date(isoString);
//     return date.toLocaleTimeString('fr-FR', {
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: false
//     });
// }

export function formatTime(isoString: string | null): string | null {
    if (!isoString) return null;

    const date = new Date(isoString);

    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
    // return isoString.slice(11, 16) // HH:mm
}


/**
 * Get present employees (present, active, late, on-pause, external-mission)
 */
export function getPresentEmployees(employees: TransformedEmployee[]): TransformedEmployee[] {
    return employees.filter(emp =>
        ['present', 'active', 'late', 'on-pause', 'external-mission'].includes(emp.status)
    );
}

/**
 * Get absent employees
 */
export function getAbsentEmployees(employees: TransformedEmployee[]): TransformedEmployee[] {
    return employees.filter(emp => emp.status === 'absent');
}

/**
 * Get off-day employees
 */
export function getOffDayEmployees(employees: TransformedEmployee[]): TransformedEmployee[] {
    return employees.filter(emp => emp.status === 'off-day');
}