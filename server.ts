import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

interface DbSchema {
  employees: any[];
  employees_updatedAt: number;
  chatMessages: any[];
  chatMessages_updatedAt: number;
  tasks: any[];
  tasks_updatedAt: number;
  notifications: any[];
  notifications_updatedAt: number;
  journalArticles: any[];
  journalArticles_updatedAt: number;
  featuredText: string;
  featuredImage: string;
  featured_updatedAt: number;
  calendarMarkings: any;
  calendarMarkings_updatedAt: number;
  ownerPassword?: string;
  ownerPassword_updatedAt?: number;
  customerFeedbacks?: any[];
  customerFeedbacks_updatedAt?: number;
  googleFormUrl?: string;
  googleFormUrl_updatedAt?: number;
  evaluations?: any[];
  evaluations_updatedAt?: number;
  leaveRequests?: any[];
  leaveRequests_updatedAt?: number;
  attendanceRecords?: any[];
  attendanceRecords_updatedAt?: number;
}

// Active Server-Sent Events (SSE) connections for instant live broadcasting
const sseClients = new Set<express.Response>();

function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

function mergeServerLeaveHistories(localHistory: any[] = [], incomingHistory: any[] = []): any[] {
  const map = new Map<string, any>();
  const getFingerprint = (r: any) => r.id || `${r.startDate}_${r.endDate}_${r.days}`;

  // 1. Seed with local / existing records
  (localHistory || []).forEach((req) => {
    if (!req || !req.startDate || !req.endDate) return;
    const key = getFingerprint(req);
    map.set(key, { ...req });
  });

  // 2. Overlay incoming records
  (incomingHistory || []).forEach((req) => {
    if (!req || !req.startDate || !req.endDate) return;
    const key = getFingerprint(req);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...req });
    } else {
      map.set(key, {
        ...existing,
        ...req,
        status: req.status || existing.status || 'pending',
        id: existing.id || req.id || `leave-${Date.now()}`
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.requestDate || a.startDate).getTime();
    const db = new Date(b.requestDate || b.startDate).getTime();
    return db - da;
  });
}

// Ensure database file is initialized and returns data safely
function loadDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        employees: Array.isArray(parsed.employees) ? parsed.employees : [],
        employees_updatedAt: typeof parsed.employees_updatedAt === 'number' ? parsed.employees_updatedAt : 0,
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        chatMessages_updatedAt: typeof parsed.chatMessages_updatedAt === 'number' ? parsed.chatMessages_updatedAt : 0,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        tasks_updatedAt: typeof parsed.tasks_updatedAt === 'number' ? parsed.tasks_updatedAt : 0,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        notifications_updatedAt: typeof parsed.notifications_updatedAt === 'number' ? parsed.notifications_updatedAt : 0,
        journalArticles: Array.isArray(parsed.journalArticles) ? parsed.journalArticles : [],
        journalArticles_updatedAt: typeof parsed.journalArticles_updatedAt === 'number' ? parsed.journalArticles_updatedAt : 0,
        featuredText: typeof parsed.featuredText === 'string' && parsed.featuredText.trim() ? parsed.featuredText : "J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.",
        featuredImage: typeof parsed.featuredImage === 'string' && parsed.featuredImage.trim() ? parsed.featuredImage : "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        featured_updatedAt: typeof parsed.featured_updatedAt === 'number' ? parsed.featured_updatedAt : 0,
        calendarMarkings: parsed.calendarMarkings || null,
        calendarMarkings_updatedAt: typeof parsed.calendarMarkings_updatedAt === 'number' ? parsed.calendarMarkings_updatedAt : 0,
        ownerPassword: typeof parsed.ownerPassword === 'string' ? parsed.ownerPassword : "github",
        ownerPassword_updatedAt: typeof parsed.ownerPassword_updatedAt === 'number' ? parsed.ownerPassword_updatedAt : 0,
        customerFeedbacks: Array.isArray(parsed.customerFeedbacks) ? parsed.customerFeedbacks : null,
        customerFeedbacks_updatedAt: typeof parsed.customerFeedbacks_updatedAt === 'number' ? parsed.customerFeedbacks_updatedAt : 0,
        googleFormUrl: typeof parsed.googleFormUrl === 'string' ? parsed.googleFormUrl : "",
        googleFormUrl_updatedAt: typeof parsed.googleFormUrl_updatedAt === 'number' ? parsed.googleFormUrl_updatedAt : 0,
        evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : null,
        evaluations_updatedAt: typeof parsed.evaluations_updatedAt === 'number' ? parsed.evaluations_updatedAt : 0,
        leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : [],
        leaveRequests_updatedAt: typeof parsed.leaveRequests_updatedAt === 'number' ? parsed.leaveRequests_updatedAt : 0,
        attendanceRecords: (Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : []).map((r: any) => {
          if (r && r.dateStr === '2026-08-18' && (r.id?.includes('seed') || r.id?.includes('att-seed'))) {
            return {
              ...r,
              id: r.id.replace('2026-08-18', '2026-08-17'),
              dateStr: '2026-08-17',
              timestamp: (r.timestamp || '').replace('2026-08-18', '2026-08-17')
            };
          }
          return r;
        }),
        attendanceRecords_updatedAt: typeof parsed.attendanceRecords_updatedAt === 'number' ? parsed.attendanceRecords_updatedAt : 0
      };
    }
  } catch (err) {
    console.error("Error reading database file, using empty default", err);
  }
  return {
    employees: [],
    employees_updatedAt: 0,
    chatMessages: [],
    chatMessages_updatedAt: 0,
    tasks: [],
    tasks_updatedAt: 0,
    notifications: [],
    notifications_updatedAt: 0,
    journalArticles: [
      {
        id: 'journal-default-1',
        title: 'Note de Direction - Lancement du Nouveau Portail',
        content: "Bienvenue sur le Portail de Redevabilité de la Pharmacie Internationale. Ce portail centralise l'ensemble de nos règlements, organigrammes, outils de pointage et déclarations financières. Utilisez votre espace privé sécurisé pour soumettre vos demandes de congés et mettre à jour votre biographie.",
        date: '2026-08-15',
        author: 'Direction (Owner)'
      }
    ],
    journalArticles_updatedAt: 0,
    featuredText: "J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.",
    featuredImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    featured_updatedAt: 0,
    calendarMarkings: null,
    calendarMarkings_updatedAt: 0,
    ownerPassword: "github",
    ownerPassword_updatedAt: 0,
    customerFeedbacks: null,
    customerFeedbacks_updatedAt: 0,
    googleFormUrl: "",
    googleFormUrl_updatedAt: 0,
    evaluations: null,
    evaluations_updatedAt: 0,
    leaveRequests: [],
    leaveRequests_updatedAt: 0,
    attendanceRecords: [],
    attendanceRecords_updatedAt: 0
  };
}

function saveDb(data: DbSchema) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing to database file", err);
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Real-Time Server-Sent Events (SSE) stream for Instant Multi-User Synchronization
app.get('/api/realtime-events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  // Immediately send initial full database state to new client
  const currentDb = loadDb();
  res.write(`event: init\ndata: ${JSON.stringify(currentDb)}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 12 seconds to prevent connection drops across cloud proxies
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 12000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// Fetch entire synced database or filter by key
app.get('/api/sync', (req, res) => {
  const db = loadDb();
  res.json(db);
});

// Authoritative High-Precision Internet GMT Time Endpoint
// Allows mobile devices to extract the exact real-time Internet GMT time regardless of local clock misconfigurations
app.get('/api/time', (req, res) => {
  const now = new Date();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    gmtDateStr: now.toISOString().split('T')[0],
    gmtTimeStr: now.toISOString().substring(11, 19),
    utcHours: now.getUTCHours(),
    utcMinutes: now.getUTCMinutes(),
    utcSeconds: now.getUTCSeconds(),
    timeZone: 'GMT',
    source: 'internet_server_gmt'
  });
});

// Update or submit attendance records (multi-device real-time sync)
app.post('/api/attendance', (req, res) => {
  const { records, record, updatedAt } = req.body;
  const incoming: any[] = [];
  if (Array.isArray(records)) {
    incoming.push(...records);
  } else if (record && typeof record === 'object') {
    incoming.push(record);
  }

  if (incoming.length === 0) {
    return res.status(400).json({ error: 'No attendance records provided' });
  }

  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();

  const recordMap = new Map<string, any>();
  (db.attendanceRecords || []).forEach(r => {
    if (r && r.id) recordMap.set(r.id, r);
  });

  incoming.forEach(r => {
    if (r && r.id) {
      recordMap.set(r.id, r);
    }
  });

  db.attendanceRecords = Array.from(recordMap.values()).sort((a, b) => {
    const da = new Date(a.timestamp || `${a.dateStr}T${a.timeStr}`).getTime();
    const dbTime = new Date(b.timestamp || `${b.dateStr}T${b.timeStr}`).getTime();
    return dbTime - da;
  });
  db.attendanceRecords_updatedAt = reqTime;

  saveDb(db);
  broadcastEvent('attendance_records', {
    attendanceRecords: db.attendanceRecords,
    updatedAt: db.attendanceRecords_updatedAt
  });

  res.json({
    success: true,
    totalRecords: db.attendanceRecords.length,
    updatedAt: db.attendanceRecords_updatedAt
  });
});

// Get attendance records
app.get('/api/attendance', (req, res) => {
  const db = loadDb();
  res.json({
    attendanceRecords: db.attendanceRecords || [],
    updatedAt: db.attendanceRecords_updatedAt || 0
  });
});

// Client connection info helper endpoint (IP, User Agent, Server time)
app.get('/api/client-info', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
  res.json({
    ip,
    userAgent: req.headers['user-agent'] || '',
    serverTime: new Date().toISOString(),
    connectedClients: sseClients.size
  });
});

// Update employees (with non-destructive leaveHistory merge)
app.post('/api/employees', (req, res) => {
  const { employees, updatedAt } = req.body;
  if (!Array.isArray(employees)) {
    return res.status(400).json({ error: 'Employees must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();

  // Smart-merge with existing database records so leave requests from phones are never lost
  const existingEmpMap = new Map<string, any>();
  db.employees.forEach(emp => {
    existingEmpMap.set(emp.id, emp);
    if (emp.username) existingEmpMap.set(emp.username, emp);
  });

  const mergedEmployees = employees.map((incomingEmp: any) => {
    const existing = existingEmpMap.get(incomingEmp.id) || (incomingEmp.username ? existingEmpMap.get(incomingEmp.username) : undefined);
    if (!existing) return incomingEmp;

    const mergedLeaves = mergeServerLeaveHistories(existing.leaveHistory || [], incomingEmp.leaveHistory || []);
    return {
      ...incomingEmp,
      dailySchedules: incomingEmp.dailySchedules || existing.dailySchedules,
      leaveHistory: mergedLeaves
    };
  });

  db.employees = mergedEmployees;
  db.employees_updatedAt = Math.max(db.employees_updatedAt, reqTime);

  // Also collect all leaves into db.leaveRequests
  const allCollectedLeaves: any[] = [];
  mergedEmployees.forEach(emp => {
    (emp.leaveHistory || []).forEach((req: any) => {
      allCollectedLeaves.push({
        id: req.id || `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        startDate: req.startDate,
        endDate: req.endDate,
        days: req.days,
        status: req.status,
        requestDate: req.requestDate
      });
    });
  });
  db.leaveRequests = mergeServerLeaveHistories(db.leaveRequests || [], allCollectedLeaves);
  db.leaveRequests_updatedAt = db.employees_updatedAt;

  saveDb(db);

  // Instant live broadcast to all connected web & mobile users
  broadcastEvent('employees', { employees: db.employees, updatedAt: db.employees_updatedAt });
  broadcastEvent('leave_requests', { leaveRequests: db.leaveRequests, updatedAt: db.leaveRequests_updatedAt });

  res.json({ success: true, count: db.employees.length, updatedAt: db.employees_updatedAt });
});

// Update or submit leave requests specifically (from any mobile phone or browser)
app.post('/api/leave-requests', (req, res) => {
  const { leaveRequests, leaveRequest, updatedAt } = req.body;
  const requestsToMerge: any[] = [];
  if (Array.isArray(leaveRequests)) {
    requestsToMerge.push(...leaveRequests);
  } else if (leaveRequest && typeof leaveRequest === 'object') {
    requestsToMerge.push(leaveRequest);
  }

  if (requestsToMerge.length === 0) {
    return res.status(400).json({ error: 'No leave requests provided' });
  }

  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();

  // 1. Update cumulative db.leaveRequests
  const mergedAllLeaves = mergeServerLeaveHistories(db.leaveRequests || [], requestsToMerge);
  db.leaveRequests = mergedAllLeaves;
  db.leaveRequests_updatedAt = reqTime;

  // 2. Inject back into matching db.employees records
  db.employees = db.employees.map(emp => {
    const empId = String(emp.id).toLowerCase();
    const empUsername = String(emp.username || '').toLowerCase();
    const empName = String(emp.name || '').toLowerCase();

    const empLeaves = db.leaveRequests!.filter(r => {
      const rId = String(r.employeeId || r.userId || '').toLowerCase();
      const rName = String(r.employeeName || r.userName || '').toLowerCase();
      return (rId && (rId === empId || rId === empUsername)) || (rName && rName === empName);
    });

    if (empLeaves.length === 0) return emp;
    const merged = mergeServerLeaveHistories(emp.leaveHistory || [], empLeaves);
    return { ...emp, leaveHistory: merged };
  });
  db.employees_updatedAt = reqTime;

  saveDb(db);

  // Broadcast both employees and leave_requests
  broadcastEvent('leave_requests', { leaveRequests: db.leaveRequests, updatedAt: db.leaveRequests_updatedAt });
  broadcastEvent('employees', { employees: db.employees, updatedAt: db.employees_updatedAt });

  res.json({
    success: true,
    totalLeaveRequests: db.leaveRequests.length,
    updatedAt: db.leaveRequests_updatedAt
  });
});

// Fetch all synced leave requests
app.get('/api/leave-requests', (req, res) => {
  const db = loadDb();
  res.json({
    leaveRequests: db.leaveRequests || [],
    updatedAt: db.leaveRequests_updatedAt || 0
  });
});

// Update chat messages
app.post('/api/chat-messages', (req, res) => {
  const { chatMessages, updatedAt } = req.body;
  if (!Array.isArray(chatMessages)) {
    return res.status(400).json({ error: 'chatMessages must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.chatMessages_updatedAt) {
    db.chatMessages = chatMessages;
    db.chatMessages_updatedAt = reqTime;
    saveDb(db);
    // Instant live broadcast to all users
    broadcastEvent('chat', { chatMessages: db.chatMessages, updatedAt: db.chatMessages_updatedAt });
  }
  res.json({ success: true, count: db.chatMessages.length, updatedAt: db.chatMessages_updatedAt });
});

// Update tasks
app.post('/api/tasks', (req, res) => {
  const { tasks, updatedAt } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'tasks must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.tasks_updatedAt) {
    db.tasks = tasks;
    db.tasks_updatedAt = reqTime;
    saveDb(db);
    // Instant live broadcast to all users
    broadcastEvent('tasks', { tasks: db.tasks, updatedAt: db.tasks_updatedAt });
  }
  res.json({ success: true, count: db.tasks.length, updatedAt: db.tasks_updatedAt });
});

// Update notifications
app.post('/api/notifications', (req, res) => {
  const { notifications, updatedAt } = req.body;
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'notifications must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.notifications_updatedAt) {
    db.notifications = notifications;
    db.notifications_updatedAt = reqTime;
    saveDb(db);
    // Instant live broadcast to all users
    broadcastEvent('notifications', { notifications: db.notifications, updatedAt: db.notifications_updatedAt });
  }
  res.json({ success: true, count: db.notifications.length, updatedAt: db.notifications_updatedAt });
});

// Get journal articles
app.get('/api/journal', (req, res) => {
  const db = loadDb();
  res.json({ journalArticles: db.journalArticles, updatedAt: db.journalArticles_updatedAt });
});

// Delete specific journal article
app.delete('/api/journal/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const beforeCount = db.journalArticles.length;
  db.journalArticles = db.journalArticles.filter((a: any) => a.id !== id);
  db.journalArticles_updatedAt = Date.now();
  saveDb(db);
  
  // Instant live broadcast to all users
  broadcastEvent('journal', { journalArticles: db.journalArticles, updatedAt: db.journalArticles_updatedAt });
  
  res.json({ 
    success: true, 
    deleted: beforeCount !== db.journalArticles.length, 
    journalArticles: db.journalArticles, 
    updatedAt: db.journalArticles_updatedAt 
  });
});

// Update journal articles
app.post('/api/journal', (req, res) => {
  const { journalArticles, article, updatedAt } = req.body;
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();

  let incomingList: any[] = [];
  if (Array.isArray(journalArticles)) {
    incomingList = journalArticles;
  } else if (article && typeof article === 'object') {
    incomingList = [article, ...(db.journalArticles || [])];
  } else {
    return res.status(400).json({ error: 'journalArticles must be an array' });
  }

  // Merge unique by ID, keeping newer/incoming items
  const map = new Map<string, any>();
  // Existing notes
  (db.journalArticles || []).forEach((a: any) => map.set(a.id, a));
  // Incoming notes
  incomingList.forEach((a: any) => map.set(a.id, a));

  db.journalArticles = Array.from(map.values());
  db.journalArticles_updatedAt = Math.max(db.journalArticles_updatedAt || 0, reqTime);
  saveDb(db);
  // Instant live broadcast to all users
  broadcastEvent('journal', { journalArticles: db.journalArticles, updatedAt: db.journalArticles_updatedAt });
  res.json({ success: true, count: db.journalArticles.length, updatedAt: db.journalArticles_updatedAt });
});

// Get featured info (employé à l'affiche)
app.get('/api/featured', (req, res) => {
  const db = loadDb();
  res.json({
    featuredText: db.featuredText,
    featuredImage: db.featuredImage,
    updatedAt: db.featured_updatedAt
  });
});

// Update featured info (employé à l'affiche)
app.post('/api/featured', (req, res) => {
  const { featuredText, featuredImage, text, image, updatedAt } = req.body;
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  
  const newText = typeof featuredText === 'string' ? featuredText : (typeof text === 'string' ? text : undefined);
  const newImage = typeof featuredImage === 'string' ? featuredImage : (typeof image === 'string' ? image : undefined);

  if (newText !== undefined && newText.trim()) {
    db.featuredText = newText;
  }
  if (newImage !== undefined && newImage.trim()) {
    db.featuredImage = newImage;
  }
  db.featured_updatedAt = Math.max(db.featured_updatedAt || 0, reqTime);
  saveDb(db);
  
  // Instant live broadcast to all users
  broadcastEvent('featured', {
    featuredText: db.featuredText,
    featuredImage: db.featuredImage,
    updatedAt: db.featured_updatedAt
  });

  res.json({ success: true, featuredText: db.featuredText, featuredImage: db.featuredImage, updatedAt: db.featured_updatedAt });
});

// Update calendar markings
app.post('/api/calendar-markings', (req, res) => {
  const { calendarMarkings, updatedAt } = req.body;
  if (!calendarMarkings || typeof calendarMarkings !== 'object') {
    return res.status(400).json({ error: 'calendarMarkings must be an object' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.calendarMarkings_updatedAt) {
    db.calendarMarkings = calendarMarkings;
    db.calendarMarkings_updatedAt = reqTime;
    saveDb(db);
    // Instant live broadcast to all users
    broadcastEvent('calendar_markings', { calendarMarkings: db.calendarMarkings, updatedAt: db.calendarMarkings_updatedAt });
  }
  res.json({ success: true, updatedAt: db.calendarMarkings_updatedAt });
});

// Update owner password
app.post('/api/owner-password', (req, res) => {
  const { password, updatedAt } = req.body;
  if (typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'password must be a valid string' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= (db.ownerPassword_updatedAt || 0)) {
    db.ownerPassword = password.trim();
    db.ownerPassword_updatedAt = reqTime;
    saveDb(db);
    broadcastEvent('owner_password', { password: db.ownerPassword, updatedAt: db.ownerPassword_updatedAt });
  }
  res.json({ success: true, updatedAt: db.ownerPassword_updatedAt });
});

// Update Customer Feedbacks ("Micros clients")
app.post('/api/customer-feedbacks', (req, res) => {
  const { customerFeedbacks, updatedAt } = req.body;
  if (!Array.isArray(customerFeedbacks)) {
    return res.status(400).json({ error: 'customerFeedbacks must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= (db.customerFeedbacks_updatedAt || 0)) {
    db.customerFeedbacks = customerFeedbacks;
    db.customerFeedbacks_updatedAt = reqTime;
    saveDb(db);
    broadcastEvent('customer_feedbacks', {
      customerFeedbacks: db.customerFeedbacks,
      updatedAt: db.customerFeedbacks_updatedAt
    });
  }
  res.json({ success: true, count: db.customerFeedbacks.length, updatedAt: db.customerFeedbacks_updatedAt });
});

// Update Google Form custom URL
app.post('/api/google-form-url', (req, res) => {
  const { googleFormUrl, updatedAt } = req.body;
  if (typeof googleFormUrl !== 'string') {
    return res.status(400).json({ error: 'googleFormUrl must be a string' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= (db.googleFormUrl_updatedAt || 0)) {
    db.googleFormUrl = googleFormUrl;
    db.googleFormUrl_updatedAt = reqTime;
    saveDb(db);
    broadcastEvent('google_form_url', {
      googleFormUrl: db.googleFormUrl,
      updatedAt: db.googleFormUrl_updatedAt
    });
  }
  res.json({ success: true, updatedAt: db.googleFormUrl_updatedAt });
});

// Update Staff Evaluations (Evaluation & points du personnel)
app.post('/api/evaluations', (req, res) => {
  const { evaluations, updatedAt } = req.body;
  if (!Array.isArray(evaluations)) {
    return res.status(400).json({ error: 'evaluations must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= (db.evaluations_updatedAt || 0)) {
    db.evaluations = evaluations;
    db.evaluations_updatedAt = reqTime;
    saveDb(db);
    broadcastEvent('evaluations', {
      evaluations: db.evaluations,
      updatedAt: db.evaluations_updatedAt
    });
  }
  res.json({ success: true, count: db.evaluations.length, updatedAt: db.evaluations_updatedAt });
});

// Global API error handler to prevent HTML responses on crashes/malformed payloads
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API Route Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

// -------------------------------------------------------------
// Dev & Production Middleware Setup
// -------------------------------------------------------------
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server", err);
});
