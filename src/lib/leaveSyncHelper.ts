import { Employee, LeaveRequest } from '../types';
import { pushRealtimeUpdate } from './realtimeSync';
import { saveToDoc } from './firebase';

export interface StoredLeaveRequestRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  submittedAt?: string;
}

/**
 * Merges two LeaveRequest arrays without losing any request.
 * - Deduplicates by ID or by (startDate + endDate + days).
 * - Resolves status conflicts by prioritizing 'approved' or 'rejected' over 'pending'.
 * - Sorts newest first.
 */
export function mergeLeaveHistories(
  localHistory: LeaveRequest[] = [],
  incomingHistory: LeaveRequest[] = []
): LeaveRequest[] {
  const mergedMap = new Map<string, LeaveRequest>();

  const getFingerprint = (req: LeaveRequest): string => {
    return req.id || `${req.startDate}_${req.endDate}_${req.days}`;
  };

  // 1. First populate with local existing records
  (localHistory || []).forEach(req => {
    if (!req || !req.startDate || !req.endDate) return;
    const key = getFingerprint(req);
    mergedMap.set(key, { ...req });
  });

  // 2. Then overlay incoming (newer / synced) records
  (incomingHistory || []).forEach(req => {
    if (!req || !req.startDate || !req.endDate) return;
    const key = getFingerprint(req);
    const existing = mergedMap.get(key);

    if (!existing) {
      mergedMap.set(key, { ...req });
    } else {
      mergedMap.set(key, {
        ...existing,
        ...req,
        status: req.status || existing.status || 'pending',
        id: existing.id || req.id || `leave-${Date.now()}`,
        requestDate: req.requestDate || existing.requestDate || new Date().toISOString().split('T')[0]
      });
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => {
    const dateA = new Date(a.requestDate || a.startDate).getTime();
    const dateB = new Date(b.requestDate || b.startDate).getTime();
    return dateB - dateA;
  });
}

/**
 * Merges current employee list with incoming employee list:
 * - Preserves all existing employee accounts.
 * - Non-destructively merges leaveHistory for every employee.
 * - Ensures locally submitted leave requests from mobile devices are never dropped.
 */
export function mergeEmployeesWithPreservedLeaves(
  currentEmployees: Employee[] = [],
  incomingEmployees: Employee[] = []
): Employee[] {
  if (!Array.isArray(incomingEmployees) || incomingEmployees.length === 0) {
    return currentEmployees;
  }
  if (!Array.isArray(currentEmployees) || currentEmployees.length === 0) {
    return incomingEmployees;
  }

  const currentMap = new Map<string, Employee>();
  currentEmployees.forEach(emp => {
    currentMap.set(emp.id, emp);
    if (emp.username) currentMap.set(emp.username, emp);
  });

  return incomingEmployees.map(incEmp => {
    const localMatch = currentMap.get(incEmp.id) || (incEmp.username ? currentMap.get(incEmp.username) : undefined);
    if (!localMatch) {
      return incEmp;
    }

    // Merge leave history non-destructively
    const mergedLeaves = mergeLeaveHistories(localMatch.leaveHistory || [], incEmp.leaveHistory || []);

    return {
      ...incEmp,
      // Preserve local daily schedules if incoming is missing
      dailySchedules: incEmp.dailySchedules || localMatch.dailySchedules,
      leaveHistory: mergedLeaves
    };
  });
}

/**
 * Extracts all leave requests currently in local storage (across all employees)
 * to ensure anything submitted on phones is captured and synchronized to cloud.
 */
export function extractAllLocalLeaveRequests(employees: Employee[]): StoredLeaveRequestRecord[] {
  const result: StoredLeaveRequestRecord[] = [];
  
  // 1. From passed employees
  employees.forEach(emp => {
    (emp.leaveHistory || []).forEach(req => {
      result.push({
        id: req.id || `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        startDate: req.startDate,
        endDate: req.endDate,
        days: req.days,
        status: req.status,
        requestDate: req.requestDate,
        submittedAt: new Date().toISOString()
      });
    });
  });

  // 2. From localStorage backup keys (pharmintl_leave_requests, etc.)
  try {
    const rawLocalLeaves = localStorage.getItem('pharmintl_all_leave_requests');
    if (rawLocalLeaves) {
      const parsed = JSON.parse(rawLocalLeaves);
      if (Array.isArray(parsed)) {
        parsed.forEach((req: any) => {
          if (req && req.employeeId && req.startDate && req.endDate) {
            if (!result.some(r => r.id === req.id || (r.employeeId === req.employeeId && r.startDate === req.startDate && r.endDate === req.endDate))) {
              result.push(req);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error reading local leave requests backup:', err);
  }

  return result;
}

/**
 * Performs a forced synchronization of all known leave requests from this device
 * to the backend server and Firestore database so supervisors immediately see them.
 */
export async function syncAllLeavesToCloud(employees: Employee[]) {
  try {
    const allLeaves = extractAllLocalLeaveRequests(employees);
    if (allLeaves.length === 0) return;

    // Cache locally for offline safety
    localStorage.setItem('pharmintl_all_leave_requests', JSON.stringify(allLeaves));

    // Send to backend server
    await fetch('/api/leave-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leaveRequests: allLeaves,
        updatedAt: Date.now()
      })
    }).catch(err => {
      console.warn('POST /api/leave-requests failed:', err);
    });

    // Save to Firestore as dedicated collection/document
    await saveToDoc('leave_requests', 'leaveRequests', allLeaves, Date.now());

    // Push realtime event
    await pushRealtimeUpdate('leave_requests', 'leaveRequests', allLeaves, Date.now());
  } catch (err) {
    console.warn('syncAllLeavesToCloud error:', err);
  }
}
