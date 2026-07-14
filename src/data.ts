import { Employee } from './types';

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: "Awa Diop",
    role: "Caissière Principale",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Awa",
    allocatedLeaves: 30,
    scheduleStartHour: 8,
    scheduleEndHour: 17,
    scheduleDays: "Lun - Ven",
    cnss: "12345678-90",
    dateEmbauche: "2024-03-15",
    username: "awa.diop",
    password: "awa",
    isSupervisor: false,
    bio: "Awa est responsable de la caisse centrale depuis plus de deux ans. Elle est rigoureuse, souriante et passionnée par le service à la clientèle.",
    isScheduleApproved: true,
    leaveHistory: [
      {
        id: 'leave-1-1',
        startDate: "2026-04-10",
        endDate: "2026-04-15",
        days: 6,
        status: "approved",
        requestDate: "2026-03-20"
      },
      {
        id: 'leave-1-2',
        startDate: "2026-08-01",
        endDate: "2026-08-10",
        days: 10,
        status: "pending",
        requestDate: "2026-07-01"
      }
    ]
  },
  {
    id: 'emp-2',
    name: "Mamadou Diallo",
    role: "Gestionnaire de Stock",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mamadou",
    allocatedLeaves: 30,
    scheduleStartHour: 7,
    scheduleEndHour: 16,
    scheduleDays: "Lun - Sam",
    cnss: "23456789-01",
    dateEmbauche: "2023-09-01",
    username: "mamadou.diallo",
    password: "mam",
    isSupervisor: false,
    bio: "Mamadou orchestre l'ensemble des flux de médicaments et d'intrants au sein de notre pharmacie internationale. Un pro de l'organisation !",
    isScheduleApproved: true,
    leaveHistory: [
      {
        id: 'leave-2-1',
        startDate: "2026-05-01",
        endDate: "2026-05-05",
        days: 5,
        status: "approved",
        requestDate: "2026-04-15"
      }
    ]
  },
  {
    id: 'emp-3',
    name: "Koffi Mensah",
    role: "Pharmacien Assistant & Superviseur",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Koffi",
    allocatedLeaves: 30,
    scheduleStartHour: 9,
    scheduleEndHour: 18,
    scheduleDays: "Lun - Ven",
    cnss: "34567890-12",
    dateEmbauche: "2022-01-10",
    username: "koffi.mensah",
    password: "kof",
    isSupervisor: true,
    bio: "Pharmacien diplômé, Koffi assiste le pharmacien gérant et supervise les équipes de caisse et de comptabilité avec bienveillance.",
    isScheduleApproved: true,
    leaveHistory: [
      {
        id: 'leave-3-1',
        startDate: "2026-12-20",
        endDate: "2027-01-03",
        days: 15,
        status: "pending",
        requestDate: "2026-06-15"
      }
    ]
  },
  {
    id: 'emp-4',
    name: "Fatou Bensouda",
    role: "Comptable",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatou",
    allocatedLeaves: 30,
    scheduleStartHour: 8,
    scheduleEndHour: 16,
    scheduleDays: "Lun - Ven",
    cnss: "45678901-23",
    dateEmbauche: "2025-01-05",
    username: "fatou.b",
    password: "fat",
    isSupervisor: false,
    bio: "Fatou assure la transparence financière de l'officine. Ses compétences en fiscalité et audit garantissent notre parfaite conformité.",
    isScheduleApproved: false,
    leaveHistory: []
  },
  {
    id: 'emp-5',
    name: "Youssouf Koné",
    role: "Préparateur en Pharmacie",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Youssouf",
    allocatedLeaves: 30,
    scheduleStartHour: 10,
    scheduleEndHour: 19,
    scheduleDays: "Lun - Sam",
    cnss: "56789012-34",
    dateEmbauche: "2024-06-20",
    username: "youssouf.k",
    password: "you",
    isSupervisor: false,
    bio: "Youssouf prépare les ordonnances avec minutie et conseille nos patients sur la bonne prise de leurs traitements.",
    isScheduleApproved: true,
    leaveHistory: [
      {
        id: 'leave-5-1',
        startDate: "2026-02-10",
        endDate: "2026-02-14",
        days: 5,
        status: "rejected",
        requestDate: "2026-01-10"
      }
    ]
  }
];
