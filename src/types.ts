export type ActivePage = 
  | 'home'
  | 'journal'
  | 'micros_clients'
  | 'workforce'
  | 'tasks'
  | 'chat'
  | 'calendar'
  | 'private'
  | 'planning'
  | 'all';

export interface CustomerFeedback {
  id: string;
  content: string; // Entrée texte multiligne unique du Google Form
  submittedAt: string; // Date et heure de soumission (ISO)
  author?: string; // Nom ou pseudo du client / patient
  category?: string; // Tag / Thème (Accueil, Conseils, Disponibilité, Caisse, Garde, Général)
  rating?: number; // Note sur 5 étoiles (optionnel)
  likes?: number; // Upvotes interactifs style Slido
  isPinned?: boolean; // Mise en avant / Coup de cœur
  formSource?: string; // 'google_form' | 'qr_code' | 'portail'
}

export interface StaffEvaluation {
  id: string;
  date: string; // "YYYY-MM-DD"
  employeeId: string;
  employeeName: string;
  points: number; // e.g. +10, +5, -5, -10
  motif: string;
  supervisor: string; // Nom du Superviseur
  staffJustification?: string; // Justification / observations du staff
  isValidated: boolean; // Validé
  validatedBy?: string; // "Edinam"
  validatedAt?: string; // Date ISO de validation
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
}

export interface DailySchedule {
  dayName: string; // e.g., 'Lundi', 'Mardi', etc.
  dayShort: string; // 'Lun', 'Mar', etc.
  isActive: boolean;
  startHour: number;
  endHour: number;
  isActive2?: boolean;
  startHour2?: number;
  endHour2?: number;
  isActive3?: boolean;
  startHour3?: number;
  endHour3?: number;
  isCaisse?: boolean; // Caisse status checkbox for this day
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  allocatedLeaves: number; // e.g. 30 days
  leaveHistory: LeaveRequest[];
  scheduleStartHour: number; // 0 to 24, e.g. 8
  scheduleEndHour: number;   // 0 to 24, e.g. 17
  scheduleDays: string;      // e.g. "Lun - Ven"
  cnss: string;              // social security id
  dateEmbauche: string;      // date of hire
  username: string;          // custom credentials
  password: string;          // custom credentials
  isSupervisor: boolean;     // supervisor role flag
  isPfQualite?: boolean;     // PF qualité (Point Focal Qualité) habilitation flag
  bio: string;               // biography/description
  isScheduleApproved: boolean; // schedule visibility in public space
  isCaisse?: boolean;        // Caisse assignment checkbox
  dailySchedules?: DailySchedule[]; // schedule by day
}

export interface JournalArticle {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId: string; // 'all' for public workspace, or employeeId for private DM
  content: string;
  timestamp: string;
}

export interface TaskMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  addedBy: 'supervisor' | 'assignee';
  createdAt: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string; // fallback or general description
  milestones: TaskMilestone[];
  comments: TaskComment[];
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  deadline: string;
  status: 'pending' | 'completed';
  createdAt: string;
  isAcknowledged?: boolean;
}

export interface Notification {
  id: string;
  recipientId: string; // specific employee ID, or 'all_supervisors' for supervisor notifications
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  type: 'leave_submit' | 'leave_approve' | 'leave_reject' | 'task_assign' | 'task_acknowledge';
  isRead: boolean;
  timestamp: string;
  relatedId?: string; // ID of leave request or task
}

export type MarkingType = 'entier' | 'demi' | 'ferie' | 'garde';

export interface AttendanceRecord {
  id: string;
  type: 'arrival' | 'departure'; // Arrivée à la pharmacie | Départ de la pharmacie
  typeLabel: 'Arrivée à la pharmacie' | 'Départ de la pharmacie';
  userId: string;
  userName: string;
  userRole?: string;
  timestamp: string; // ISO string
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  deviceId?: string; // e.g. "TEL-IPHONE-7A8B"
  deviceName?: string; // e.g. "iPhone de Marie", "Samsung Galaxy S23"
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy?: number | null;
    address?: string;
    status: 'success' | 'denied' | 'error' | 'unavailable';
  };
  deviceInfo?: {
    userAgent: string;
    screenResolution?: string;
    deviceId?: string;
    deviceName?: string;
    model?: string;
    platform?: string;
  };
}

export interface CalendarMarking {
  date: string; // "YYYY-MM-DD"
  type: MarkingType;
  label?: string; // Optional custom name/label for the marking (e.g. holiday name)
}

export interface LoggedInUser {
  type: 'owner' | 'supervisor' | 'employee';
  employeeId?: string;
  username?: string;
  name?: string;
  isPfQualite?: boolean;
  isSupervisor?: boolean;
}

export type CalendarMarkings = Record<string, { type: MarkingType; label?: string }>;
