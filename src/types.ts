export type SalesStatus = 'New Lead' | 'Contacted' | 'Negotiation' | 'Closed' | 'Lost';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'executive';
  createdAt: string;
  emailNotifications?: boolean;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  status: SalesStatus;
  assignedTo: string; // user id
  assignedToName: string; // user email or name
  createdAt: string;
  updatedAt: string;
}

export interface ClientFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Data?: string; // stored base64 or reference
  uploadedBy: string; // user id
  uploadedByName: string; // user name
  uploadedAt: string;
  clientId: string; // related client/lead ID
  clientName: string; // cached related client name
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  clientId: string; // linked client/lead
  clientName: string; // cached client name
  assignedTo: string; // user id
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // 'create_lead' | 'update_lead' | 'delete_lead' | 'change_status' | 'upload_file' | 'delete_file' | 'create_task' | 'complete_task'
  details: string; // human-readable description
  createdAt: string;
  clientId?: string;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  negotiating: number;
  closedWon: number;
  closedLost: number;
  totalTaskCount: number;
  pendingTaskCount: number;
  conversionRate: number; // closed / total closed+lost
}

export interface Invitation {
  id: string;
  directorId: string;
  directorName: string;
  executiveEmail: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
  updatedAt: string;
  emailSent?: number;
  emailSentAt?: string | null;
  emailError?: string | null;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'executive';
  createdAt: string;
  assignedLeadsCount: number;
  pendingTasksCount: number;
  negotiationCount: number;
  closedWonCount: number;
  conversionRate: number;
}

