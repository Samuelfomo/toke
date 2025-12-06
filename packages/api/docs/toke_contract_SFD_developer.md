# Toké Contract Management SFD (Software Functional Design)
_Developer Documentation — v1.0_

## 1. Introduction
This document provides a complete **Software Functional Design (SFD)** for the **Contract & Schedule Engine** of Toké — the offline-first time‑tracking solution for African SMEs.  
It focuses on concepts, data structures, logic flows, constraints, edge cases, anti‑fraud considerations, and offline behavior.

This SFD is intended for:
- Backend engineers
- Mobile developers
- QA teams
- System architects
- Technical Product Owners

It is written in **English** and aims to be unambiguous, implementation‑ready, and consistent with Toké’s core principles.

---

## 2. Core Design Principles
1. **Offline-first:** All schedule evaluation must work without network connectivity.  
2. **Simplicity for managers:** Setup operations must be exceptional (rare) and never daily.  
3. **Deterministic computation:** For any date, Toké must compute the same expected schedule from templates, rotations, or exceptions.  
4. **Fraud resistance:** GPS, QR, timestamps, and session evaluation must enforce consistency.  
5. **Modularity:** Schedules are not tied to employees directly but assigned via templates, rotation groups, and exceptions.  
6. **Backward compatibility:** Missing configuration must fall back to company defaults, not crash evaluation.

---

## 3. Terminology

### 3.1 Contract
A high‑level concept describing the expected working rules for one or more employees.  
A contract is implemented in Toké as:
- a **Session Template**, or
- a **Rotation Group** with session templates.

### 3.2 Session Template
Reusable definition describing:
- working blocks (1..N)
- pause blocks (0..N)
- allowed tolerances
- applicable days of the week
- validity window

Example structure:
```json
{
  "Mon": [
    { "work": ["08:00", "12:59"], "pause": ["12:01", "13:59"], "tolerance": 30 },
    { "work": ["14:00", "18:00"], "pause": null, "tolerance": 30 }
  ],
  "Wed": [
    { "work": ["14:00", "16:59"], "pause": null, "tolerance": 30 }
  ]
}
```

### 3.3 Rotation Group
A time‑based cycle of session templates (ex: 2×8, 3×8).  
The system computes the correct template for a given date using:
- cycle length  
- cycle unit (day/week)  
- employee offset  

### 3.4 Exception (Override)
Temporary replacement of the schedule for:
- a specific user
- a specific group

Active for a date or date range.

### 3.5 Applicable Day Schedule
The final computed schedule for an employee on a given date after evaluating:
1. Exception  
2. Rotation  
3. Individual template  
4. Company default  

---

## 4. Data Model

### 4.1 session_templates
```sql
CREATE TABLE session_templates (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255),
  valid_from DATE,
  valid_to DATE,
  definition JSONB NOT NULL, -- detailed day/hour structure
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 rotation_groups
```sql
CREATE TABLE rotation_groups (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255),
  cycle_length INT NOT NULL,
  cycle_unit VARCHAR(10) CHECK (cycle_unit IN ('day','week')),
  cycle_templates INT[] NOT NULL, -- ordered session_template IDs
  start_date DATE NOT NULL
);
```

### 4.3 rotation_assignments
```sql
CREATE TABLE rotation_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  rotation_group_id INT NOT NULL,
  offset INT DEFAULT 0,
  assigned_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 exceptions
```sql
CREATE TABLE schedule_exceptions (
  id SERIAL PRIMARY KEY,
  user_id INT,
  group_id INT,
  session_template_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by INT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Schedule Resolution Algorithm

### 5.1 Entry Point
```
getApplicableSchedule(user_id, target_date)
```

### 5.2 Resolution Order
1. **Find active exception**
2. **Check rotation assignment**
3. **Check individual assigned template**
4. **Fallback to default template**

### 5.3 Rotation Logic
```
cycle_index = floor( diff(target_date, rotation.start_date, unit) ) % cycle_length
actual_index = (cycle_index + offset) % cycle_length
return cycle_templates[actual_index]
```

### 5.4 Offline Behavior
- Templates, rotations, and exceptions must be cached locally (`last_updated_at` timestamp).  
- If cache is outdated → warn user but continue using last known configuration.  
- Conflicts are detected during batch sync.

---

## 6. Time Evaluation Engine

### 6.1 Inputs
- clock_in / clock_out / pause_start / pause_end entries
- schedule of the day
- tolerances
- pause rules

### 6.2 Detected Anomalies
| Code | Description | Trigger |
|------|-------------|---------|
| LATE_ARRIVAL | Late arrival | clock_in > work_start + tolerance |
| EARLY_LEAVE | Left before block end | clock_out < block_end |
| PAUSE_TOO_LONG | Pause exceeded allowed duration | pause_end - pause_start > limit |
| PAUSE_NO_RETURN | No pause_end | deadline reached |
| MISSED_BLOCK | No presence during required block | no entries recorded |

### 6.3 Memo Auto‑Generation
All anomalies generate a memo with:
```
auto_generated = true
auto_reason = structured JSON
severity = low/medium/high
```

Managers validate or reject anomalies.

---

## 7. Anti‑Fraud Considerations
- GPS & QR validation tied to each time entry  
- Detection of unrealistic movement between sites  
- Detection of off‑contract pointages  
- Blocked pointage when outside geofence (unless mission flag)  
- Device fingerprint stored for spoofing protection  

---

## 8. Developer Notes & Edge Cases

### 8.1 Employee Offline > 7 Days
- Template updates may be missing  
- On sync: run conflict resolution  
- Generate memo if template mismatch impacted time evaluation  

### 8.2 Exception Overlaps
Rules:
1. Most recent exception wins  
2. User‑level overrides group‑level  
3. Must not allow overlapping entries without warning  

### 8.3 Template Validity Expiration
If valid_to < today:
- Fallback to default template  
- Raise configuration alert to manager  

### 8.4 Multiple Work Blocks
The engine must evaluate each block independently:
- late arrival per block  
- early departure per block  
- missing block detection  

---

## 9. Testing Strategy

### 9.1 Unit Tests
- template parsing  
- schedule resolution  
- rotation calculation  
- exception priority  

### 9.2 Integration Tests
- offline → sync anomaly  
- mismatched template after network reconnection  
- rotation reassignment  

### 9.3 E2E Tests
- full workday with multiple blocks  
- overnight shifts (22:00–06:00)  
- long pause detection  

---

## 10. KPIs to Track
- anomaly detection rate  
- false positive rate  
- number of exceptions created per month  
- rotation stability (unexpected shift changes)  
- average evaluation latency  

---

## 11. Known Limitations
- Accuracy depends on employee properly pressing pause start/end  
- Unexpected changes in shift must be handled through exceptions  
- Rotations with non‑uniform cycles require additional logic  
- Too many daily blocks increase UI complexity  

---

## 12. Future Improvements
- AI‑based anomaly classification  
- Automatic schedule inference based on historical behavior  
- Forecasting & workforce analytics  
- Visual calendar editor (Phase 3)  

---

## 13. Conclusion
This SFD provides a stable, extensible, and developer‑friendly blueprint for implementing contract & schedule management in Toké.  
It balances complexity, offline robustness, and simplicity for managers — the core UX mission of Toké.

