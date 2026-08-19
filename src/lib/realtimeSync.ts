/**
 * Real-Time Multi-User & Cross-Tab Synchronization Engine
 * Powered by Server-Sent Events (SSE), Web BroadcastChannel, and Firestore
 */

export interface RealtimeHandlers {
  onEmployees?: (employees: any[], updatedAt?: number) => void;
  onChat?: (chatMessages: any[], updatedAt?: number) => void;
  onTasks?: (tasks: any[], updatedAt?: number) => void;
  onNotifications?: (notifications: any[], updatedAt?: number) => void;
  onCalendarMarkings?: (markings: any, updatedAt?: number) => void;
  onJournal?: (articles: any[], updatedAt?: number) => void;
  onFeatured?: (text: string, image: string, updatedAt?: number) => void;
  onOwnerPassword?: (password: string, updatedAt?: number) => void;
  onCustomerFeedbacks?: (feedbacks: any[], updatedAt?: number) => void;
  onGoogleFormUrl?: (url: string, updatedAt?: number) => void;
  onEvaluations?: (evaluations: any[], updatedAt?: number) => void;
  onLeaveRequests?: (leaveRequests: any[], updatedAt?: number) => void;
  onAttendanceRecords?: (attendanceRecords: any[], updatedAt?: number) => void;
}

// Global cross-tab BroadcastChannel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('pharmintl_realtime_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment', e);
}

// Active listeners set
const activeHandlers = new Set<RealtimeHandlers>();

// Broadcast changes locally to all tabs in the same browser instantly
export function broadcastLocal(type: string, payload: any) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to broadcast across tabs:', e);
    }
  }
}

// Dispatch to all local React subscribers
function dispatchToSubscribers(type: string, payload: any) {
  activeHandlers.forEach((handler) => {
    try {
      if (type === 'employees' && handler.onEmployees) {
        handler.onEmployees(payload.employees, payload.updatedAt);
      } else if (type === 'chat' && handler.onChat) {
        handler.onChat(payload.chatMessages, payload.updatedAt);
      } else if (type === 'tasks' && handler.onTasks) {
        handler.onTasks(payload.tasks, payload.updatedAt);
      } else if (type === 'notifications' && handler.onNotifications) {
        handler.onNotifications(payload.notifications, payload.updatedAt);
      } else if (type === 'calendar_markings' && handler.onCalendarMarkings) {
        handler.onCalendarMarkings(payload.calendarMarkings, payload.updatedAt);
      } else if (type === 'journal' && handler.onJournal) {
        handler.onJournal(payload.journalArticles, payload.updatedAt);
      } else if (type === 'featured' && handler.onFeatured) {
        const fText = payload.featuredText !== undefined ? payload.featuredText : payload.text;
        const fImg = payload.featuredImage !== undefined ? payload.featuredImage : payload.image;
        handler.onFeatured(fText, fImg, payload.updatedAt);
      } else if (type === 'owner_password' && handler.onOwnerPassword) {
        handler.onOwnerPassword(payload.password, payload.updatedAt);
      } else if (type === 'customer_feedbacks' && handler.onCustomerFeedbacks) {
        handler.onCustomerFeedbacks(payload.customerFeedbacks, payload.updatedAt);
      } else if (type === 'google_form_url' && handler.onGoogleFormUrl) {
        handler.onGoogleFormUrl(payload.googleFormUrl, payload.updatedAt);
      } else if (type === 'evaluations' && handler.onEvaluations) {
        handler.onEvaluations(payload.evaluations, payload.updatedAt);
      } else if (type === 'leave_requests' && handler.onLeaveRequests) {
        handler.onLeaveRequests(payload.leaveRequests, payload.updatedAt);
      } else if (type === 'attendance_records' && handler.onAttendanceRecords) {
        handler.onAttendanceRecords(payload.attendanceRecords, payload.updatedAt);
      }
    } catch (err) {
      console.error(`Error dispatching ${type} to subscriber:`, err);
    }
  });
}

// Setup BroadcastChannel message listener
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const { type, payload } = event.data || {};
    if (type && payload) {
      dispatchToSubscribers(type, payload);
    }
  };
}

let eventSource: EventSource | null = null;
let reconnectTimer: any = null;
let pollTimer: any = null;
let isConnected = false;

// Poll fallback for resilience
export async function fetchFullSync() {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) return null;
    const data = await res.json();
    if (data) {
      if (Array.isArray(data.employees)) {
        dispatchToSubscribers('employees', { employees: data.employees, updatedAt: data.employees_updatedAt });
      }
      if (Array.isArray(data.chatMessages)) {
        dispatchToSubscribers('chat', { chatMessages: data.chatMessages, updatedAt: data.chatMessages_updatedAt });
      }
      if (Array.isArray(data.tasks)) {
        dispatchToSubscribers('tasks', { tasks: data.tasks, updatedAt: data.tasks_updatedAt });
      }
      if (Array.isArray(data.notifications)) {
        dispatchToSubscribers('notifications', { notifications: data.notifications, updatedAt: data.notifications_updatedAt });
      }
      if (data.calendarMarkings) {
        dispatchToSubscribers('calendar_markings', { calendarMarkings: data.calendarMarkings, updatedAt: data.calendarMarkings_updatedAt });
      }
      if (Array.isArray(data.journalArticles)) {
        dispatchToSubscribers('journal', { journalArticles: data.journalArticles, updatedAt: data.journalArticles_updatedAt });
      }
      if (typeof data.featuredText === 'string' || typeof data.featuredImage === 'string') {
        dispatchToSubscribers('featured', {
          featuredText: data.featuredText,
          featuredImage: data.featuredImage,
          updatedAt: data.featured_updatedAt
        });
      }
      if (typeof data.ownerPassword === 'string') {
        dispatchToSubscribers('owner_password', { password: data.ownerPassword, updatedAt: data.ownerPassword_updatedAt });
      }
      if (Array.isArray(data.customerFeedbacks)) {
        dispatchToSubscribers('customer_feedbacks', { customerFeedbacks: data.customerFeedbacks, updatedAt: data.customerFeedbacks_updatedAt });
      }
      if (typeof data.googleFormUrl === 'string') {
        dispatchToSubscribers('google_form_url', { googleFormUrl: data.googleFormUrl, updatedAt: data.googleFormUrl_updatedAt });
      }
      if (Array.isArray(data.evaluations)) {
        dispatchToSubscribers('evaluations', { evaluations: data.evaluations, updatedAt: data.evaluations_updatedAt });
      }
      if (Array.isArray(data.leaveRequests)) {
        dispatchToSubscribers('leave_requests', { leaveRequests: data.leaveRequests, updatedAt: data.leaveRequests_updatedAt });
      }
      if (Array.isArray(data.attendanceRecords)) {
        dispatchToSubscribers('attendance_records', { attendanceRecords: data.attendanceRecords, updatedAt: data.attendanceRecords_updatedAt });
      }
    }
    return data;
  } catch (err) {
    console.warn('Sync poll failed:', err);
    return null;
  }
}

// Connect to Server-Sent Events (SSE) stream for instant server-push
function connectSSE() {
  if (typeof window === 'undefined') return;
  if (eventSource) {
    try { eventSource.close(); } catch {}
  }

  try {
    eventSource = new EventSource('/api/realtime-events');

    eventSource.onopen = () => {
      isConnected = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    // Full init payload on initial connection
    eventSource.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data) {
          if (Array.isArray(data.employees)) {
            dispatchToSubscribers('employees', { employees: data.employees, updatedAt: data.employees_updatedAt });
          }
          if (Array.isArray(data.chatMessages)) {
            dispatchToSubscribers('chat', { chatMessages: data.chatMessages, updatedAt: data.chatMessages_updatedAt });
          }
          if (Array.isArray(data.tasks)) {
            dispatchToSubscribers('tasks', { tasks: data.tasks, updatedAt: data.tasks_updatedAt });
          }
          if (Array.isArray(data.notifications)) {
            dispatchToSubscribers('notifications', { notifications: data.notifications, updatedAt: data.notifications_updatedAt });
          }
          if (data.calendarMarkings) {
            dispatchToSubscribers('calendar_markings', { calendarMarkings: data.calendarMarkings, updatedAt: data.calendarMarkings_updatedAt });
          }
          if (Array.isArray(data.journalArticles)) {
            dispatchToSubscribers('journal', { journalArticles: data.journalArticles, updatedAt: data.journalArticles_updatedAt });
          }
          if (typeof data.featuredText === 'string' || typeof data.featuredImage === 'string') {
            dispatchToSubscribers('featured', {
              featuredText: data.featuredText,
              featuredImage: data.featuredImage,
              updatedAt: data.featured_updatedAt
            });
          }
          if (typeof data.ownerPassword === 'string') {
            dispatchToSubscribers('owner_password', { password: data.ownerPassword, updatedAt: data.ownerPassword_updatedAt });
          }
          if (Array.isArray(data.customerFeedbacks)) {
            dispatchToSubscribers('customer_feedbacks', { customerFeedbacks: data.customerFeedbacks, updatedAt: data.customerFeedbacks_updatedAt });
          }
          if (typeof data.googleFormUrl === 'string') {
            dispatchToSubscribers('google_form_url', { googleFormUrl: data.googleFormUrl, updatedAt: data.googleFormUrl_updatedAt });
          }
          if (Array.isArray(data.evaluations)) {
            dispatchToSubscribers('evaluations', { evaluations: data.evaluations, updatedAt: data.evaluations_updatedAt });
          }
          if (Array.isArray(data.leaveRequests)) {
            dispatchToSubscribers('leave_requests', { leaveRequests: data.leaveRequests, updatedAt: data.leaveRequests_updatedAt });
          }
          if (Array.isArray(data.attendanceRecords)) {
            dispatchToSubscribers('attendance_records', { attendanceRecords: data.attendanceRecords, updatedAt: data.attendanceRecords_updatedAt });
          }
        }
      } catch (err) {
        console.error('Failed to parse init SSE event:', err);
      }
    });

    // Real-time delta listeners
    const eventTypes = [
      'employees',
      'chat',
      'tasks',
      'notifications',
      'calendar_markings',
      'journal',
      'featured',
      'owner_password',
      'customer_feedbacks',
      'google_form_url',
      'evaluations',
      'leave_requests',
      'attendance_records'
    ];

    eventTypes.forEach((type) => {
      eventSource?.addEventListener(type, (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          dispatchToSubscribers(type, payload);
          // Also echo to local tabs
          broadcastLocal(type, payload);
        } catch (err) {
          console.error(`Failed to parse ${type} SSE event:`, err);
        }
      });
    });

    eventSource.onerror = () => {
      isConnected = false;
      try { eventSource?.close(); } catch {}
      eventSource = null;

      // Reconnect with 2s delay
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectSSE();
        }, 2000);
      }
    };
  } catch (err) {
    console.error('Failed to initialize SSE connection:', err);
  }
}

// Start SSE connection once
if (typeof window !== 'undefined') {
  connectSSE();

  // Instant re-sync on tab focus or wake up from sleep / screen lock
  window.addEventListener('focus', () => {
    fetchFullSync();
    if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
      connectSSE();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchFullSync();
      if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
        connectSSE();
      }
    }
  });

  // Fast background resilience poll every 4 seconds
  pollTimer = setInterval(() => {
    if (!isConnected) {
      fetchFullSync();
    }
  }, 4000);
}

/**
 * Register real-time sync handlers for React components
 */
export function registerRealtimeSync(handlers: RealtimeHandlers): () => void {
  activeHandlers.add(handlers);
  
  // Ensure connection is active and trigger immediate sync
  fetchFullSync();

  return () => {
    activeHandlers.delete(handlers);
  };
}

/**
 * Perform a real-time optimistic sync broadcast and write to server + local channel
 */
export async function pushRealtimeUpdate(
  docName: string,
  key: string,
  value: any,
  updatedAt?: number
) {
  const ts = updatedAt || Date.now();

  // 1. Immediately notify all local browser tabs via BroadcastChannel
  let eventType = '';
  let payload: any = {};

  if (docName === 'employees') {
    eventType = 'employees';
    payload = { employees: value, updatedAt: ts };
  } else if (docName === 'chat') {
    eventType = 'chat';
    payload = { chatMessages: value, updatedAt: ts };
  } else if (docName === 'tasks') {
    eventType = 'tasks';
    payload = { tasks: value, updatedAt: ts };
  } else if (docName === 'notifications') {
    eventType = 'notifications';
    payload = { notifications: value, updatedAt: ts };
  } else if (docName === 'calendar_markings') {
    eventType = 'calendar_markings';
    payload = { calendarMarkings: value, updatedAt: ts };
  } else if (docName === 'journal') {
    eventType = 'journal';
    payload = { journalArticles: value, updatedAt: ts };
  } else if (docName === 'featured' || docName === 'featured_text' || docName === 'featured_image') {
    eventType = 'featured';
    payload = {
      featuredText: typeof value === 'object' && value ? (value.text !== undefined ? value.text : value.featuredText) : (docName === 'featured_text' ? value : undefined),
      featuredImage: typeof value === 'object' && value ? (value.image !== undefined ? value.image : value.featuredImage) : (docName === 'featured_image' ? value : undefined),
      updatedAt: ts
    };
  } else if (docName === 'owner') {
    eventType = 'owner_password';
    payload = { password: value, updatedAt: ts };
  } else if (docName === 'customer_feedbacks') {
    eventType = 'customer_feedbacks';
    payload = { customerFeedbacks: value, updatedAt: ts };
  } else if (docName === 'google_form_url') {
    eventType = 'google_form_url';
    payload = { googleFormUrl: value, updatedAt: ts };
  } else if (docName === 'evaluations') {
    eventType = 'evaluations';
    payload = { evaluations: value, updatedAt: ts };
  } else if (docName === 'leave_requests') {
    eventType = 'leave_requests';
    payload = { leaveRequests: value, updatedAt: ts };
  } else if (docName === 'attendance' || docName === 'attendance_records') {
    eventType = 'attendance_records';
    payload = { attendanceRecords: value, updatedAt: ts };
  }

  if (eventType) {
    // Instantly notify local subscribers in the current tab (0ms latency)
    dispatchToSubscribers(eventType, payload);
    // Broadcast to other tabs in the same browser
    broadcastLocal(eventType, payload);
  }

  // 2. Dual-save to Express Server (which broadcasts via SSE instantly to all users worldwide)
  try {
    let apiPath = '';
    let body = {};
    if (docName === 'chat') {
      apiPath = '/api/chat-messages';
      body = { chatMessages: value, updatedAt: ts };
    } else if (docName === 'tasks') {
      apiPath = '/api/tasks';
      body = { tasks: value, updatedAt: ts };
    } else if (docName === 'notifications') {
      apiPath = '/api/notifications';
      body = { notifications: value, updatedAt: ts };
    } else if (docName === 'calendar_markings') {
      apiPath = '/api/calendar-markings';
      body = { calendarMarkings: value, updatedAt: ts };
    } else if (docName === 'employees') {
      apiPath = '/api/employees';
      body = { employees: value, updatedAt: ts };
    } else if (docName === 'leave_requests') {
      apiPath = '/api/leave-requests';
      body = { leaveRequests: value, updatedAt: ts };
    } else if (docName === 'journal') {
      apiPath = '/api/journal';
      body = { journalArticles: value, updatedAt: ts };
    } else if (docName === 'featured' || docName === 'featured_text' || docName === 'featured_image') {
      apiPath = '/api/featured';
      if (typeof value === 'object' && value) {
        body = {
          featuredText: value.text !== undefined ? value.text : value.featuredText,
          featuredImage: value.image !== undefined ? value.image : value.featuredImage,
          updatedAt: ts
        };
      } else if (docName === 'featured_text') {
        body = { featuredText: value, updatedAt: ts };
      } else if (docName === 'featured_image') {
        body = { featuredImage: value, updatedAt: ts };
      }
    } else if (docName === 'owner') {
      apiPath = '/api/owner-password';
      body = { password: value, updatedAt: ts };
    } else if (docName === 'customer_feedbacks') {
      apiPath = '/api/customer-feedbacks';
      body = { customerFeedbacks: value, updatedAt: ts };
    } else if (docName === 'google_form_url') {
      apiPath = '/api/google-form-url';
      body = { googleFormUrl: value, updatedAt: ts };
    } else if (docName === 'evaluations') {
      apiPath = '/api/evaluations';
      body = { evaluations: value, updatedAt: ts };
    } else if (docName === 'attendance' || docName === 'attendance_records') {
      apiPath = '/api/attendance';
      body = { records: value, updatedAt: ts };
    }

    if (apiPath) {
      await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
  } catch (err) {
    console.error(`Error syncing ${docName} to backend server:`, err);
  }
}
