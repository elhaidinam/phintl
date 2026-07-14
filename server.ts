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
        featuredText: typeof parsed.featuredText === 'string' ? parsed.featuredText : "",
        featuredImage: typeof parsed.featuredImage === 'string' ? parsed.featuredImage : "",
        featured_updatedAt: typeof parsed.featured_updatedAt === 'number' ? parsed.featured_updatedAt : 0,
        calendarMarkings: parsed.calendarMarkings || null,
        calendarMarkings_updatedAt: typeof parsed.calendarMarkings_updatedAt === 'number' ? parsed.calendarMarkings_updatedAt : 0
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
    journalArticles: [],
    journalArticles_updatedAt: 0,
    featuredText: "",
    featuredImage: "",
    featured_updatedAt: 0,
    calendarMarkings: null,
    calendarMarkings_updatedAt: 0
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

// Fetch entire synced database or filter by key
app.get('/api/sync', (req, res) => {
  const db = loadDb();
  res.json(db);
});

// Update employees
app.post('/api/employees', (req, res) => {
  const { employees, updatedAt } = req.body;
  if (!Array.isArray(employees)) {
    return res.status(400).json({ error: 'Employees must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.employees_updatedAt) {
    db.employees = employees;
    db.employees_updatedAt = reqTime;
    saveDb(db);
  }
  res.json({ success: true, count: db.employees.length, updatedAt: db.employees_updatedAt });
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
  }
  res.json({ success: true, count: db.notifications.length, updatedAt: db.notifications_updatedAt });
});

// Update journal articles
app.post('/api/journal', (req, res) => {
  const { journalArticles, updatedAt } = req.body;
  if (!Array.isArray(journalArticles)) {
    return res.status(400).json({ error: 'journalArticles must be an array' });
  }
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.journalArticles_updatedAt) {
    db.journalArticles = journalArticles;
    db.journalArticles_updatedAt = reqTime;
    saveDb(db);
  }
  res.json({ success: true, count: db.journalArticles.length, updatedAt: db.journalArticles_updatedAt });
});

// Update featured info (employé à l'affiche)
app.post('/api/featured', (req, res) => {
  const { featuredText, featuredImage, updatedAt } = req.body;
  const db = loadDb();
  const reqTime = typeof updatedAt === 'number' ? updatedAt : Date.now();
  if (reqTime >= db.featured_updatedAt) {
    if (typeof featuredText === 'string') {
      db.featuredText = featuredText;
    }
    if (typeof featuredImage === 'string') {
      db.featuredImage = featuredImage;
    }
    db.featured_updatedAt = reqTime;
    saveDb(db);
  }
  res.json({ success: true, updatedAt: db.featured_updatedAt });
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
  }
  res.json({ success: true, updatedAt: db.calendarMarkings_updatedAt });
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
