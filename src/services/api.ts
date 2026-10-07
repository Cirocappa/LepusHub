import { Client, ClientFile, Task, ActivityLog, DashboardStats, SalesStatus, User, Invitation, TeamMember } from "../types";

const TOKEN_KEY = "lepushub_session_token";
const USER_KEY = "lepushub_user_profile";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Low-level fetch wrapper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Auto-set JSON headers
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = "Network response was not OK";
    try {
      const parsed = JSON.parse(errText);
      message = parsed.error || message;
    } catch {
      message = errText || message;
    }
    throw new Error(message);
  }

  return res.json();
}

// Authentication Exports
export const authApi = {
  async login(credentials: { email: string; password: string }) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    saveSession(data.token, data.user);
    return data;
  },

  async register(data: { email: string; password: string; name: string; role?: "admin" | "executive"; inviteId?: string }) {
    const resData = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    saveSession(resData.token, resData.user);
    return resData;
  },

  async getMe() {
    const data = await apiFetch("/api/auth/me");
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async resetPassword(data: { oldPassword: string; newPassword: string }) {
    return apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updatePreferences(data: { emailNotifications: boolean }) {
    return apiFetch("/api/auth/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      clearSession();
    }
  },

  async deleteMe(): Promise<{ success: boolean; message: string }> {
    const data = await apiFetch("/api/users/me", {
      method: "DELETE",
    });
    clearSession();
    return data;
  },
};

// Client and Lead Management Exports
export const clientApi = {
  async getAll(params: { search?: string; status?: string; executive?: string; company?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.status) query.append("status", params.status);
    if (params.executive) query.append("executive", params.executive);
    if (params.company) query.append("company", params.company);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const pathString = `/api/clients?${query.toString()}`;
    return apiFetch(pathString);
  },

  async get(id: string): Promise<Client> {
    return apiFetch(`/api/clients/${id}`);
  },

  async create(data: Omit<Client, "id" | "createdAt" | "updatedAt" | "assignedToName"> & { assignedTo?: string }): Promise<Client> {
    return apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Client>): Promise<Client> {
    return apiFetch(`/api/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/clients/${id}`, {
      method: "DELETE",
    });
  },
};

// Users static fetch (for assignment dialogs)
export const userApi = {
  async getAllUsers(): Promise<Omit<User, "createdAt">[]> {
    return apiFetch("/api/users");
  },
};

// Task management Exports
export const taskApi = {
  async getAll(): Promise<Task[]> {
    return apiFetch("/api/tasks");
  },

  async create(data: { title: string; description?: string; dueDate: string; clientId: string }): Promise<Task> {
    return apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Task>): Promise<Task> {
    return apiFetch(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/tasks/${id}`, {
      method: "DELETE",
    });
  },
};

// File uploads and attachments
export const fileApi = {
  async getAll(): Promise<ClientFile[]> {
    return apiFetch("/api/files");
  },

  async upload(file: File, clientId: string): Promise<ClientFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const payload = {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            fileData: base64Data,
            clientId,
          };
          const res = await apiFetch("/api/files", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  },

  async download(id: string, filename: string): Promise<void> {
    const token = getToken();
    const res = await fetch(`/api/files/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Physical attachment could not be fetched.");
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/files/${id}`, {
      method: "DELETE",
    });
  },
};

// Dashboard and logs statistics helpers
export const dashboardApi = {
  async getStats(): Promise<DashboardStats & { contacting: number }> {
    return apiFetch("/api/dashboard/stats");
  },

  async getLogs(): Promise<ActivityLog[]> {
    return apiFetch("/api/activity");
  },

  async deleteLog(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/activity/${id}`, {
      method: "DELETE",
    });
  },

  async clearAllLogs(): Promise<{ success: boolean; message: string }> {
    return apiFetch("/api/activity", {
      method: "DELETE",
    });
  },
};

// Notifications API Helper
export const notificationApi = {
  async getAll(): Promise<any[]> {
    return apiFetch("/api/notifications");
  },

  async markAsRead(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    return apiFetch("/api/notifications/read-all", {
      method: "POST",
    });
  },
};

// Team Management API Helper
export const teamApi = {
  async getInvitations(): Promise<Invitation[]> {
    return apiFetch("/api/team/invitations");
  },

  async inviteExecutive(email: string): Promise<Invitation> {
    return apiFetch("/api/team/invitations", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async revokeInvitation(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/team/invitations/${id}/revoke`, {
      method: "POST",
    });
  },

  async acceptInvitation(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/team/invitations/${id}/accept`, {
      method: "POST",
    });
  },

  async declineInvitation(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/team/invitations/${id}/decline`, {
      method: "POST",
    });
  },

  async getMembers(): Promise<TeamMember[]> {
    return apiFetch("/api/team/members");
  },

  async removeMember(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/team/members/${id}/remove`, {
      method: "POST",
    });
  },
};

