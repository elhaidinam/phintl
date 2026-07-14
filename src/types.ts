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
  bio: string;               // biography/description
  isScheduleApproved: boolean; // schedule visibility in public space
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

export interface CalendarMarking {
  date: string; // "YYYY-MM-DD"
  type: MarkingType;
  label?: string; // Optional custom name/label for the marking (e.g. holiday name)
}

export type CalendarMarkings = Record<string, { type: MarkingType; label?: string }>;
