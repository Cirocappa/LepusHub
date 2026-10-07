import React, { useState, useEffect } from "react";
import { 
  Client, 
  ClientFile, 
  Task, 
  ActivityLog, 
  DashboardStats, 
  SalesStatus, 
  User,
  Invitation,
  TeamMember
} from "../types";
import { 
  clientApi, 
  taskApi, 
  fileApi, 
  dashboardApi, 
  userApi, 
  authApi,
  notificationApi,
  teamApi
} from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  FolderOpen, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Search, 
  Plus, 
  TrendingUp, 
  SlidersHorizontal, 
  Check, 
  Trash2, 
  Download, 
  Clock, 
  FileText, 
  Upload, 
  RefreshCw, 
  Lock, 
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  UserPlus
} from "lucide-react";

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const { language, setLanguage, t } = useLanguage();

  // Navigation State
  // "pipeline" | "clients" | "tasks" | "files" | "activity" | "profile"
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  // CRM Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats & { contacting: number }>({
    totalLeads: 0,
    newLeads: 0,
    contacting: 0,
    negotiating: 0,
    closedWon: 0,
    closedLost: 0,
    totalTaskCount: 0,
    pendingTaskCount: 0,
    conversionRate: 0
  });
  const [allExecutives, setAllExecutives] = useState<Omit<User, "createdAt">[]>([]);

  // Custom dialogs/notifications for iframe safety
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isOpen: boolean;
  }>({
    message: "",
    type: "info",
    isOpen: false
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, isOpen: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  const triggerConfirmation = (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText
    });
  };

  // Team Management & Invitation States
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");

  // Search, Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [execFilter, setExecFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Modals & Dynamic Selection states
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Client Form inputs
  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    status: "New Lead" as SalesStatus,
    assignedTo: user.id
  });

  // Task Form inputs
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    clientId: ""
  });

  // Security Settings Form
  const [profileForm, setProfileForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [emailNotifications, setEmailNotifications] = useState<boolean>(
    user.emailNotifications !== false && (user.emailNotifications as any) !== 0
  );
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // File Upload Handling
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Real-time Active System Notifications/Alerts
  const [notifications, setNotifications] = useState<{ id: string; title: string; category: "overdue" | "file" | "update"; time: string; dbId?: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Global Loading Indicators
  const [globalLoading, setGlobalLoading] = useState(false);

  // Fetch critical pipeline, clients, tasks lists
  const refreshAllData = async () => {
    setGlobalLoading(true);
    try {
      const [clsResponse, tsks, fls, logRecords, metrics, executives, dbNotifs, teamMebs, teamInvs] = await Promise.all([
        clientApi.getAll({
          search: searchTerm,
          status: statusFilter,
          executive: execFilter,
          company: companyFilter
        }),
        taskApi.getAll(),
        fileApi.getAll(),
        dashboardApi.getLogs(),
        dashboardApi.getStats(),
        user.role === "admin" ? userApi.getAllUsers() : Promise.resolve([]),
        notificationApi.getAll(),
        user.role === "admin" ? teamApi.getMembers() : Promise.resolve([]),
        teamApi.getInvitations()
      ]);

      setClients(clsResponse.data || []);
      setTasks(tsks);
      setFiles(fls);
      setLogs(logRecords);
      setStats(metrics);
      if (executives.length > 0) {
        setAllExecutives(executives);
      }
      setTeamMembers(teamMebs || []);
      setInvitations(teamInvs || []);

      // Automatically construct notifications drawer content
      const alerts: typeof notifications = [];
      
      // 1. Check for overdue tasks
      const today = new Date().toISOString().split("T")[0];
      const overdueTasks = tsks.filter(t => !t.completed && t.dueDate < today);
      overdueTasks.forEach(ot => {
        alerts.push({
          id: `notif_task_${ot.id}`,
          title: `Overdue Followup: ${ot.title} for ${ot.clientName}`,
          category: "overdue",
          time: `Due: ${ot.dueDate}`
        });
      });

      // 2. Add alerts for recently uploaded files
      fls.slice(0, 3).forEach(f => {
        alerts.push({
          id: `notif_file_${f.id}`,
          title: `File "${f.name}" uploaded for ${f.clientName}`,
          category: "file",
          time: new Date(f.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      });

      // 3. Highlight status movements
      logRecords.filter(l => l.action === "change_status").slice(0, 3).forEach(l => {
        alerts.push({
          id: `notif_log_${l.id}`,
          title: l.details,
          category: "update",
          time: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      });

      // 4. Ingest real database persistent notifications
      const activeDbAlerts = (dbNotifs || []).filter((n: any) => n.read === 0).map((n: any) => ({
        id: n.id,
        title: `${n.title}: ${n.message}`,
        category: (n.type === "overdue" || n.type === "file" || n.type === "update") ? n.type : "update" as const,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dbId: n.id
      }));

      setNotifications([...activeDbAlerts, ...alerts]);

    } catch (err) {
      console.error("Failure pulling CRM variables", err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const markNotificationAsRead = async (id: string, dbId?: string) => {
    try {
      if (dbId) {
        await notificationApi.markAsRead(dbId);
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [searchTerm, statusFilter, execFilter, companyFilter]);

  // Auto-accept team invitation from URL parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get("inviteId");
    if (inviteId && user.role === "executive") {
      const autoAccept = async () => {
        try {
          await teamApi.acceptInvitation(inviteId);
          showToast(
            language === "en" 
              ? "Successfully accepted and joined the sales team!" 
              : "¡Se ha aceptado la invitación y te has unido al equipo con éxito!", 
            "success"
          );
          // clear URL params to avoid repeating
          const url = new URL(window.location.href);
          url.searchParams.delete("inviteId");
          url.searchParams.delete("inviteEmail");
          url.searchParams.delete("inviteRole");
          url.searchParams.delete("mode");
          window.history.replaceState({}, "", url.toString());
          refreshAllData();
        } catch (err: any) {
          showToast(err.message || "Failed to auto-accept team invitation", "error");
        }
      };
      autoAccept();
    }
  }, [user.role, language]);

  // Handle Drag & Drop actions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetClientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await executeFileUpload(droppedFile, targetClientId);
    }
  };

  const executeFileUpload = async (rawFile: File, relatedClientId: string) => {
    setUploadProgress(`Uploading ${rawFile.name}...`);
    try {
      await fileApi.upload(rawFile, relatedClientId);
      refreshAllData();
      setUploadProgress(null);
      showToast(language === "en" ? "File uploaded successfully" : "Archivo subido con éxito", "success");
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`, "error");
      setUploadProgress(null);
    }
  };

  // Status transitions triggering action item
  const transitionLeadStage = async (clientId: string, newStage: SalesStatus) => {
    try {
      await clientApi.update(clientId, { status: newStage });
      refreshAllData();
      showToast(language === "en" ? "Stage updated successfully" : "Estado actualizado con éxito", "success");
    } catch (err: any) {
      showToast(`Pipeline error: ${err.message}`, "error");
    }
  };

  // CRUD Client Handlers
  const handleOpenClientModal = (targetClient: Client | null = null) => {
    if (targetClient) {
      setIsEditMode(true);
      setActiveClient(targetClient);
      setClientForm({
        name: targetClient.name,
        company: targetClient.company,
        email: targetClient.email,
        phone: targetClient.phone,
        notes: targetClient.notes,
        status: targetClient.status,
        assignedTo: targetClient.assignedTo
      });
    } else {
      setIsEditMode(false);
      setActiveClient(null);
      setClientForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        notes: "",
        status: "New Lead",
        assignedTo: user.id
      });
    }
    setIsClientModalOpen(true);
  };

  const saveClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && activeClient) {
        await clientApi.update(activeClient.id, clientForm);
        showToast(language === "en" ? "Lead details updated" : "Detalles del prospecto actualizados", "success");
      } else {
        await clientApi.create(clientForm);
        showToast(language === "en" ? "Lead created successfully" : "Prospecto creado con éxito", "success");
      }
      setIsClientModalOpen(false);
      refreshAllData();
    } catch (err: any) {
      showToast(`Save Client Error: ${err.message}`, "error");
    }
  };

  const deleteClientRecord = async (clientId: string) => {
    triggerConfirmation(
      language === "en" ? "Delete Lead?" : "¿Eliminar prospecto?",
      language === "en" 
        ? "Are you sure you want to permanently delete this lead? All associated tasks and uploaded documents will be deleted."
        : "¿Está seguro de eliminar permanentemente este prospecto? Todas las tareas asociadas y documentos subidos serán eliminados.",
      async () => {
        try {
          await clientApi.delete(clientId);
          setActiveClient(null);
          showToast(language === "en" ? "Lead deleted successfully" : "Prospecto eliminado con éxito", "success");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message, "error");
        }
      }
    );
  };

  // CRUD Tasks Handlers
  const handleOpenTaskModal = (clientId: string = "") => {
    setTaskForm({
      title: "",
      description: "",
      dueDate: new Date().toISOString().split("T")[0],
      clientId: clientId || (clients[0]?.id || "")
    });
    setIsTaskModalOpen(true);
  };

  const saveTaskForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.clientId) {
      showToast(language === "en" ? "Please select a valid customer." : "Por favor, seleccione un cliente válido.", "error");
      return;
    }
    try {
      await taskApi.create(taskForm);
      setIsTaskModalOpen(false);
      showToast(language === "en" ? "Task created successfully" : "Tarea creada con éxito", "success");
      refreshAllData();
    } catch (err: any) {
      showToast(`Create Task error: ${err.message}`, "error");
    }
  };

  const toggleTaskCompleted = async (taskId: string, currentStatus: boolean) => {
    try {
      await taskApi.update(taskId, { completed: !currentStatus });
      refreshAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const removeTaskItem = async (taskId: string) => {
    triggerConfirmation(
      language === "en" ? "Delete Reminder?" : "¿Eliminar recordatorio?",
      language === "en" ? "Delete this follow-up reminder?" : "¿Eliminar este recordatorio de seguimiento?",
      async () => {
        try {
          await taskApi.delete(taskId);
          showToast(language === "en" ? "Task deleted successfully" : "Tarea eliminada con éxito", "success");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message, "error");
        }
      }
    );
  };

  // Physical file operations
  const triggerFileDownload = async (fileRecord: ClientFile) => {
    try {
      await fileApi.download(fileRecord.id, fileRecord.name);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const triggerFileDelete = async (fileId: string) => {
    triggerConfirmation(
      language === "en" ? "Remove Attachment?" : "¿Eliminar adjunto?",
      language === "en" 
        ? "Remove this corporate attachment? This operation is irreversible."
        : "¿Eliminar este archivo adjunto corporativo? Esta operación es irreversible.",
      async () => {
        try {
          await fileApi.delete(fileId);
          showToast(language === "en" ? "Attachment deleted successfully" : "Adjunto eliminado con éxito", "success");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message, "error");
        }
      }
    );
  };

  // Password alteration settings
  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);

    if (profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileError("New password inputs do not match.");
      return;
    }

    try {
      await authApi.resetPassword({
        oldPassword: profileForm.oldPassword,
        newPassword: profileForm.newPassword
      });
      setProfileMessage("Your account password has been updated successfully.");
      setProfileForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  // Toggle email notifications preference
  const handleToggleEmailNotifications = async (checked: boolean) => {
    try {
      setProfileError(null);
      setProfileMessage(null);
      await authApi.updatePreferences({ emailNotifications: checked });
      setEmailNotifications(checked);
      
      // Update session localStorage to stay persistent
      const USER_KEY = "lepushub_user_profile";
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.emailNotifications = checked;
        localStorage.setItem(USER_KEY, JSON.stringify(parsed));
      }
      
      showToast(
        language === "en"
          ? `Email notifications successfully turned ${checked ? "ON" : "OFF"}`
          : `Notificaciones de correo configuradas a ${checked ? "ACTIVADO" : "DESACTIVADO"}`,
        "success"
      );
    } catch (err: any) {
      setProfileError(err.message);
      showToast(err.message, "error");
    }
  };

  // Account permanent deactivation
  const handleDeleteMyAccount = () => {
    const title = t("deleteAccountConfirmTitle");
    const warningText = user.role === "admin"
      ? (language === "en"
          ? "WARNING: Deactivating this Sales Director account will also affect access to this team and logs. "
          : "ADVERTENCIA: Desactivar esta cuenta de Director de Ventas también afectará el acceso a este equipo y registros. ")
      : "";
    const message = warningText + t("deleteAccountConfirmMessage");
    
    triggerConfirmation(
      title,
      message,
      async () => {
        try {
          await authApi.deleteMe();
          showToast(t("deleteAccountSuccess"), "success");
          onLogout();
        } catch (err: any) {
          showToast(err.message || "Deactivation failed", "error");
        }
      },
      language === "en" ? "Deactivate Account" : "Desactivar Cuenta",
      language === "en" ? "Cancel" : "Cancelar"
    );
  };

  // --- Team Management Actions ---
  const handleInviteExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError("");
    setTeamSuccess("");
    if (!inviteEmail) return;

    try {
      await teamApi.inviteExecutive(inviteEmail);
      setInviteEmail("");
      setTeamSuccess(language === "en" ? "Invitation successfully dispatched!" : "¡Invitación enviada con éxito!");
      refreshAllData();
    } catch (err: any) {
      setTeamError(err.message || "Failed to invite executive.");
    }
  };

  // --- Audit Logs Deletion ---
  const handleDeleteLog = async (logId: string) => {
    triggerConfirmation(
      t("deleteLogConfirmTitle"),
      t("deleteLogConfirmMessage"),
      async () => {
        try {
          await dashboardApi.deleteLog(logId);
          showToast(t("logDeletedSuccess"), "success");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message || "Failed to delete log record", "error");
        }
      }
    );
  };

  const handleClearAllLogs = async () => {
    triggerConfirmation(
      t("clearAllLogsConfirmTitle"),
      t("clearAllLogsConfirmMessage"),
      async () => {
        try {
          await dashboardApi.clearAllLogs();
          showToast(t("logsClearedSuccess"), "success");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message || "Failed to clear activity logs", "error");
        }
      }
    );
  };

  const handleRevokeInvitation = async (invId: string) => {
    triggerConfirmation(
      language === "en" ? "Revoke Invitation?" : "¿Revocar invitación?",
      language === "en" ? "Are you sure you want to revoke this invitation?" : "¿Está seguro de revocar esta invitación?",
      async () => {
        setTeamError("");
        setTeamSuccess("");
        try {
          await teamApi.revokeInvitation(invId);
          setTeamSuccess(language === "en" ? "Invitation revoked successfully." : "Invitación revocada con éxito.");
          showToast(language === "en" ? "Invitation revoked successfully" : "Invitación revocada con éxito", "success");
          refreshAllData();
        } catch (err: any) {
          setTeamError(err.message);
          showToast(err.message, "error");
        }
      }
    );
  };

  const handleAcceptInvitation = async (invId: string) => {
    try {
      await teamApi.acceptInvitation(invId);
      showToast(language === "en" ? "Successfully joined the sales team!" : "¡Te has unido al equipo de ventas con éxito!", "success");
      refreshAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeclineInvitation = async (invId: string) => {
    triggerConfirmation(
      language === "en" ? "Decline Invitation?" : "¿Rechazar invitación?",
      language === "en" ? "Decline this invitation?" : "¿Rechazar esta invitación?",
      async () => {
        try {
          await teamApi.declineInvitation(invId);
          showToast(language === "en" ? "Invitation declined" : "Invitación rechazada", "info");
          refreshAllData();
        } catch (err: any) {
          showToast(err.message, "error");
        }
      }
    );
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    triggerConfirmation(
      language === "en" ? "Remove Executive?" : "¿Eliminar ejecutivo?",
      language === "en" 
        ? "Remove this executive from your active sales core?" 
        : "¿Eliminar a este ejecutivo de su equipo activo?",
      async () => {
        setTeamError("");
        setTeamSuccess("");
        try {
          await teamApi.removeMember(memberId);
          setTeamSuccess(language === "en" ? "Executive removed from team." : "Ejecutivo de ventas removido.");
          showToast(language === "en" ? "Executive removed successfully" : "Ejecutivo eliminado con éxito", "success");
          refreshAllData();
        } catch (err: any) {
          setTeamError(err.message);
          showToast(err.message, "error");
        }
      }
    );
  };

  const stages: { label: SalesStatus; color: string; hover: string; count: number }[] = [
    { label: "New Lead", color: "bg-blue-600/10 border-blue-500/35", hover: "hover:bg-blue-600/20", count: stats.newLeads || 0 },
    { label: "Contacted", color: "bg-cyan-600/10 border-cyan-500/35", hover: "hover:bg-cyan-600/20", count: stats.contacting || 0 },
    { label: "Negotiation", color: "bg-amber-600/10 border-amber-500/35", hover: "hover:bg-amber-600/20", count: stats.negotiating || 0 },
    { label: "Closed", color: "bg-emerald-600/10 border-emerald-500/35", hover: "hover:bg-emerald-600/20", count: stats.closedWon || 0 },
    { label: "Lost", color: "bg-red-600/10 border-red-500/35", hover: "hover:bg-red-600/20", count: stats.closedLost || 0 }
  ];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col md:flex-row">
      
      {/* 1. Sidebar Nav */}
      <aside className="w-full md:w-64 bg-[#0a1124] border-b md:border-b-0 md:border-r border-blue-950/70 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="font-mono font-bold text-sm text-white">LH</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-none">LepusHub</h2>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest">{language === "en" ? "Enterprise CRM" : "CRM Empresarial"}</span>
            </div>
          </div>

          {/* User profile identifier block */}
          <div className="bg-[#0e1a3a]/40 border border-blue-900/30 p-3 rounded-xl mb-6">
            <p className="text-xs text-slate-400">{language === "en" ? "Signed Executive" : "Ejecutivo Firmado"}</p>
            <p className="text-sm font-semibold text-slate-100 max-w-[180px] truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full animate-pulse ${user.role === "admin" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className="text-[10px] text-slate-400 uppercase font-medium">
                {user.role === "admin" ? t("adminLabel") : t("executiveLabel")}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              id="nav-pipeline"
              onClick={() => { setActiveTab("pipeline"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "pipeline" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0 text-blue-500" />
              {t("crmPipeline")}
            </button>

            <button
              id="nav-clients"
              onClick={() => { setActiveTab("clients"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "clients" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-cyan-500" />
              {language === "en" ? "Clients" : "Clientes"}
            </button>

            <button
              id="nav-tasks"
              onClick={() => { setActiveTab("tasks"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "tasks" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-amber-500" />
              {language === "en" ? "Follow-ups & Tasks" : "Seguimientos y Tareas"}
              {stats.pendingTaskCount > 0 && (
                <span className="ml-auto bg-amber-500 text-[#030712] font-semibold text-[10px] px-1.5 py-0.5 rounded-full">
                  {stats.pendingTaskCount}
                </span>
              )}
            </button>

            <button
              id="nav-files"
              onClick={() => { setActiveTab("files"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "files" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0 text-purple-500" />
              {language === "en" ? "Document Vault" : "Bóveda de Documentos"}
            </button>

            <button
              id="nav-activity"
              onClick={() => { setActiveTab("activity"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "activity" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <Clock className="w-4 h-4 shrink-0 text-indigo-500" />
              {language === "en" ? "Activity Audits" : "Auditorías de Actividad"}
            </button>

            {user.role === "admin" && (
              <button
                id="nav-team"
                onClick={() => { setActiveTab("team"); setActiveClient(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  activeTab === "team" ? "bg-amber-500/20 text-amber-300 border border-amber-500/35" : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0 text-amber-500" />
                {t("teamManagement")}
              </button>
            )}

            <button
              id="nav-profile"
              onClick={() => { setActiveTab("profile"); setActiveClient(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === "profile" 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0e1a3a]/30 border border-transparent"
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0 text-violet-500" />
              {t("userProfile")}
            </button>
          </nav>
        </div>

        {/* Bottom signout */}
        <div className="pt-4 mt-6 border-t border-blue-950/70">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {t("logoutBtn")}
          </button>
        </div>
      </aside>

      {/* 2. Main Work Stage */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col relative">
        
        {/* Top bar search / notifications */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 mb-6 border-b border-blue-950/70">
          <div>
            <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase font-mono">
              {language === "en" ? "LepusHub Workspace" : "Espacio de Trabajo LepusHub"}
            </span>
            <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-100">
              {activeTab === "pipeline" && (language === "en" ? "Interactive Staging Pipeline" : "Embudo de Etapas Interactivo")}
              {activeTab === "clients" && (language === "en" ? "Leads Portfolio & Customers" : "Portafolio de Prospectos y Clientes")}
              {activeTab === "tasks" && (language === "en" ? "Corporate Task Reminders" : "Recordatorios de Tareas Corporativas")}
              {activeTab === "files" && (language === "en" ? "Contract Attachments and Documents" : "Adjuntos de Contratos y Documentos")}
              {activeTab === "activity" && (language === "en" ? "Activity Auditing Engine" : "Motor de Auditoría de Actividad")}
              {activeTab === "profile" && (language === "en" ? "Executive Settings Panel" : "Panel de Configuración Ejecutiva")}
              {activeTab === "team" && (language === "en" ? "Team Administration Core" : "Núcleo de Administración de Equipos")}
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Action Buttons list */}
            <button
              onClick={() => handleOpenClientModal()}
              className="px-4 py-2 bg-blue-600 rounded-xl font-medium text-xs hover:bg-blue-500 active:scale-95 transition-all text-white flex items-center gap-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.25)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t("addLead")}
            </button>

            {/* Language Switch Flag Indicator */}
            <button
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="p-2.5 rounded-xl border transition-all text-xs font-semibold bg-[#0b1329] border-blue-950/70 text-slate-400 hover:text-slate-100 cursor-pointer flex items-center gap-1 select-none"
              title={language === "en" ? "Switch to Spanish" : "Cambiar a Inglés"}
            >
              <span>{language === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}</span>
            </button>

            {/* Notifications Drawer Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl border transition-all relative cursor-pointer ${
                  showNotifications 
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-400" 
                    : "bg-[#0b1329] border-blue-950/70 text-slate-400 hover:text-slate-100"
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>

              {/* Float popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-[#0b1329] border border-blue-950/70 rounded-2xl p-4 shadow-2xl z-50 text-slate-200">
                  <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-blue-950/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-blue-400" /> {t("remindersAlerts")} ({notifications.length})
                    </h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-mono"
                      >
                        {language === "en" ? "Clear All" : "Limpiar Todo"}
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2.5">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        {t("noAlerts")}
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-lg bg-[#0d1b3e]/60 border border-blue-900/20 text-xs flex justify-between items-start gap-2">
                          <div className="flex gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                              n.category === "overdue" ? "bg-red-500" : n.category === "file" ? "bg-purple-500" : "bg-cyan-500"
                            }`} />
                            <div>
                              <p className="font-medium text-slate-200 leading-snug">{n.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => markNotificationAsRead(n.id, n.dbId)}
                            className="text-slate-500 hover:text-red-400 p-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Dismiss" : "Descartar"}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick manual refresh data button */}
            <button
              onClick={refreshAllData}
              title={language === "en" ? "Manual Sync" : "Sincronizar Manual"}
              className="p-2.5 bg-[#0b1329] border border-blue-950/70 text-slate-400 hover:text-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${globalLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Global Statistics Banner for Pipeline context */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0b1329] border border-blue-950/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("totalLeadsCard")}</p>
              <h3 className="text-2xl font-bold font-mono text-slate-100 mt-1">{stats.totalLeads}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-[#0b1329] border border-blue-950/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("conversionRate")}</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.conversionRate}%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-[#0b1329] border border-blue-950/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("pendingTasks")}</p>
              <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats.pendingTaskCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="bg-[#0b1329] border border-blue-950/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("negotiationVolume")}</p>
              <h3 className="text-2xl font-bold font-mono text-purple-400 mt-1">{stats.negotiating}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </section>

        {/* Global Filters on Clients & Pipeline views */}
        {(activeTab === "pipeline" || activeTab === "clients") && (
          <div className="bg-[#0b1329]/80 border border-blue-950/50 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Status Select filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 text-sm outline-none focus:border-blue-500 transition-all font-sans"
              >
                <option value="">{language === "en" ? "All Stages" : "Todas las Etapas"}</option>
                <option value="New Lead">{t("newLeadStage")}</option>
                <option value="Contacted">{t("contactedStage")}</option>
                <option value="Negotiation">{t("negotiationStage")}</option>
                <option value="Closed">{t("closedWonStage")}</option>
                <option value="Lost">{t("closedLostStage")}</option>
              </select>

              {/* Company Filter input */}
              <input
                type="text"
                placeholder={language === "en" ? "By Company..." : "Por Empresa..."}
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-4 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 text-sm outline-none focus:border-blue-500 transition-all font-sans"
              />

              {/* Admin filters assigned executive */}
              {user.role === "admin" && (
                <select
                  value={execFilter}
                  onChange={(e) => setExecFilter(e.target.value)}
                  className="px-3 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 text-sm outline-none focus:border-blue-500 transition-all font-sans"
                >
                  <option value="">{t("allExecutives")}</option>
                  <option value={user.id}>{user.name} ({language === "en" ? "You" : "Tú"})</option>
                  {teamMembers.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2.5 items-center">
              {(searchTerm || statusFilter || execFilter || companyFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setExecFilter("");
                    setCompanyFilter("");
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold"
                >
                  {language === "en" ? "Reset filters" : "Restablecer filtros"}
                </button>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {language === "en" ? `Showing ${clients.length} results` : `Mostrando ${clients.length} resultados`}
              </span>
            </div>
          </div>
        )}

        {/* 3. Main Views router */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* VIEW A: INTERACTIVE KANBAN/STAGING PIPELINE */}
          {activeTab === "pipeline" && (
            <div className="flex-1 overflow-x-auto min-h-0 pb-4">
              <div className="flex gap-4.5 h-full min-w-[1000px] items-stretch">
                {stages.map(stg => {
                  const itemsInStage = clients.filter(c => c.status === stg.label);
                  const displayStgLabel = 
                    stg.label === "New Lead" ? t("newLeadStage") :
                    stg.label === "Contacted" ? t("contactedStage") :
                    stg.label === "Negotiation" ? t("negotiationStage") :
                    stg.label === "Closed" ? t("closedWonStage") : t("closedLostStage");
                  return (
                    <div 
                      key={stg.label}
                      className="flex-1 min-w-[210px] bg-[#070e1e]/60 rounded-2xl border border-blue-950/70 p-4 flex flex-col h-full"
                    >
                      {/* Stage Heading */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            stg.label === "New Lead" ? "bg-blue-500" :
                            stg.label === "Contacted" ? "bg-cyan-500" :
                            stg.label === "Negotiation" ? "bg-amber-500" :
                            stg.label === "Closed" ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                          <h4 className="font-semibold text-slate-100 text-sm tracking-tight">{displayStgLabel}</h4>
                        </div>
                        <span className="bg-[#0b1329] border border-blue-950 text-slate-400 text-[10.5px] px-2 py-0.5 rounded-full font-semibold font-mono">
                          {itemsInStage.length}
                        </span>
                      </div>

                      {/* Transition Help description */}
                      <p className="text-[10px] text-slate-500 mb-4 font-mono uppercase tracking-wider">
                        {language === "en" ? "Drag/Drop stage flow ready" : "Flujo por arrastrar/soltar listo"}
                      </p>

                      {/* Kanban Cards */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
                        {itemsInStage.length === 0 ? (
                          <div className="border border-dashed border-blue-950/50 py-10 rounded-xl text-center text-slate-600 text-[11px]">
                            {language === "en" ? "No leads in this pool." : "Sin prospectos en este panel."}
                          </div>
                        ) : (
                          itemsInStage.map(item => (
                            <div
                              key={item.id}
                              onClick={() => { setActiveClient(item); setActiveTab("clients"); }}
                              className="bg-[#0c142b] border border-blue-900/20 rounded-xl p-3 hover:border-blue-500/40 cursor-pointer shadow-lg transition-all group"
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider group-hover:text-blue-300">
                                  {item.company}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-100 text-sm mt-1">{item.name}</h5>
                              
                              {item.notes && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic leading-relaxed">
                                  "{item.notes}"
                                </p>
                              )}

                              {/* Target quick move trigger */}
                              <div className="mt-3.5 pt-2 border-t border-blue-950/50 flex justify-between items-center text-[10px] text-slate-400">
                                <span>Ref: {item.id.replace("cli_", "")}</span>
                                <div className="flex gap-1">
                                  {stages.filter(s => s.label !== item.status).map(ns => {
                                    const nsDisplay = 
                                      ns.label === "New Lead" ? t("newLeadStage") :
                                      ns.label === "Contacted" ? t("contactedStage") :
                                      ns.label === "Negotiation" ? t("negotiationStage") :
                                      ns.label === "Closed" ? t("closedWonStage") : t("closedLostStage");
                                    return (
                                      <button
                                        key={ns.label}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          transitionLeadStage(item.id, ns.label);
                                        }}
                                        title={`Move to ${nsDisplay}`}
                                        className={`px-1 py-0.5 rounded text-[9px] font-semibold border grow transition-all ${
                                          ns.label === "New Lead" ? "text-blue-400 border-blue-900/30 hover:bg-blue-500/10" :
                                          ns.label === "Contacted" ? "text-cyan-400 border-cyan-900/30 hover:bg-cyan-500/10" :
                                          ns.label === "Negotiation" ? "text-amber-400 border-amber-900/30 hover:bg-amber-500/10" :
                                          ns.label === "Closed" ? "text-emerald-400 border-emerald-900/30 hover:bg-emerald-500/10" : "text-red-400 border-red-900/30 hover:bg-red-500/10"
                                        }`}
                                      >
                                        {nsDisplay.split(" ")[0]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW B: CLIENTS DETAILS & PORTFOLIO MANAGEMENT */}
          {activeTab === "clients" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              
              {/* Left Grid Panel of Clients */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Leads Inventory</h3>
                </div>

                {clients.length === 0 ? (
                  <div className="bg-[#0b1329] border border-blue-950/70 p-12 rounded-2xl text-center text-slate-500">
                    <p className="font-sans font-medium">No leads corresponding to selection filters.</p>
                    <button 
                      onClick={() => handleOpenClientModal()}
                      className="mt-4 px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white cursor-pointer hover:bg-blue-500"
                    >
                      Create First Lead
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients.map(cli => (
                      <div
                        key={cli.id}
                        onClick={() => setActiveClient(cli)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                          activeClient?.id === cli.id
                            ? "bg-[#0c1b3f] border-blue-500/80 shadow-[0_4px_16px_rgba(37,99,235,0.15)]"
                            : "bg-[#0b1329] border-blue-1050 hover:border-blue-900/60"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                              {cli.company}
                            </span>
                            <h4 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors mt-0.5">
                              {cli.name}
                            </h4>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            cli.status === "New Lead" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                            cli.status === "Contacted" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" :
                            cli.status === "Negotiation" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                            cli.status === "Closed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
                            "text-red-400 bg-red-500/10 border-red-500/30"
                          }`}>
                            {cli.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 truncate">{cli.email || "No email stored"}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{cli.phone || "No phone stored"}</p>

                        <div className="mt-4 pt-3 border-t border-blue-950/50 flex justify-between items-center text-[11px] text-slate-500">
                          <span>Owner: {cli.assignedToName}</span>
                          <span className="flex items-center gap-1 text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                            View context <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Context Dashboard Sidebar (Details/Uploads/Tasks/Logs for single client) */}
              <div className="w-full lg:w-96 bg-[#070e1e]/80 border border-blue-950/70 p-5 rounded-2xl overflow-y-auto flex flex-col gap-6">
                {activeClient ? (
                  <>
                    {/* Header Controls */}
                    <div className="flex justify-between items-start pb-4 border-b border-blue-950/50">
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 tracking-wider uppercase">{activeClient.company}</span>
                        <h2 className="text-lg font-bold text-slate-100">{activeClient.name}</h2>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenClientModal(activeClient)}
                          className="px-2.5 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-600/35 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteClientRecord(activeClient.id)}
                          className="p-1.5 bg-red-950/40 border border-red-800/40 text-red-400 rounded-lg hover:bg-red-950/80 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Standard details block */}
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-slate-500 uppercase tracking-wide font-medium text-[10px]">Client Email</span>
                        <p className="text-slate-200 mt-0.5 font-mono">{activeClient.email || "Not declared"}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase tracking-wide font-medium text-[10px]">Phone Number</span>
                        <p className="text-slate-200 mt-0.5 font-mono">{activeClient.phone || "Not declared"}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase tracking-wide font-medium text-[10px]">Notes & Comments</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed bg-[#0c142b] p-2.5 rounded-lg border border-blue-900/10">
                          {activeClient.notes || "No notes stored for this executive log."}
                        </p>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Created: {new Date(activeClient.createdAt).toLocaleDateString()}</span>
                        <span>Updated: {new Date(activeClient.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Drag-and-Drop File Attachments section */}
                    <div className="pt-4 border-t border-blue-950/50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Documents / Contracts
                        </h4>
                      </div>

                      {/* Dropzone container */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={(e) => handleDrop(e, activeClient.id)}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all relative ${
                          dragActive 
                            ? "border-blue-500 bg-blue-600/10 text-blue-400" 
                            : "border-blue-950 bg-[#0c142b]/50 hover:border-blue-800/30"
                        }`}
                      >
                        {uploadProgress ? (
                          <div className="flex flex-col items-center justify-center py-2">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-white animate-spin mb-2" />
                            <p className="text-xs text-slate-300 font-mono">{uploadProgress}</p>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                            <p className="text-[11px] font-semibold text-slate-300">
                              Drag & Drop files here, or <span className="text-blue-400 underline">Browse</span>
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              PDF, Excel, Images, Contracts (Max 10MB)
                            </p>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  executeFileUpload(e.target.files[0], activeClient.id);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Filter files list belonging to this specific active client */}
                      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                        {files.filter(f => f.clientId === activeClient.id).length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic text-center py-2">No documents attached.</p>
                        ) : (
                          files.filter(f => f.clientId === activeClient.id).map(f => (
                            <div key={f.id} className="p-2 rounded-lg bg-[#0c2045]/30 border border-blue-900/10 flex justify-between items-center">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-semibold text-slate-200 truncate" title={f.name}>
                                  {f.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {formatSize(f.size)} • {new Date(f.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => triggerFileDownload(f)}
                                  className="p-1 px-1.5 hover:bg-[#0c2045] bg-blue-900/10 text-blue-400 hover:text-blue-300 rounded"
                                  title="Download File"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => triggerFileDelete(f.id)}
                                  className="p-1 px-1.5 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded"
                                  title="Delete File"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quick followups belonging to active client */}
                    <div className="pt-4 border-t border-blue-950/50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> REMINDERS & REMAINING TASKS
                        </h4>
                        <button
                          onClick={() => handleOpenTaskModal(activeClient.id)}
                          className="text-[10px] text-blue-400 hover:underline font-bold"
                        >
                          + New
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tasks.filter(t => t.clientId === activeClient.id).length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic text-center py-2">No follow-ups scheduled.</p>
                        ) : (
                          tasks.filter(t => t.clientId === activeClient.id).map(t => (
                            <div key={t.id} className="p-2.5 rounded-lg bg-[#0c142b] border border-blue-900/15 flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={t.completed}
                                id={`task-check-${t.id}`}
                                onChange={() => toggleTaskCompleted(t.id, t.completed)}
                                className="mt-1 cursor-pointer w-3.5 h-3.5 accent-blue-600 rounded bg-[#030712] border-blue-900/50 focus:ring-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium text-slate-200 leading-tight ${t.completed ? "line-through text-slate-500" : ""}`}>
                                  {t.title}
                                </p>
                                <div className="flex justify-between items-center mt-1">
                                  <span className={`text-[9.5px] font-mono font-medium ${
                                    t.completed ? "text-slate-500" : 
                                    new Date(t.dueDate) < new Date() ? "text-red-400 underline" : "text-amber-500"
                                  }`}>
                                    {new Date(t.dueDate) < new Date() && !t.completed ? "Overdue: " : ""}
                                    {t.dueDate}
                                  </span>
                                  <button
                                    onClick={() => removeTaskItem(t.id)}
                                    className="text-[10px] text-red-500 hover:text-red-400 font-bold"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                    <Users className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Select a customer or lead card from portfolio page to explore timelines, attachments, and pending followups.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW C: TASK LIST AND FOLLOW-UP MANAGEMENT */}
          {activeTab === "tasks" && (
            <div className="bg-[#0b1329] border border-blue-950/70 rounded-2xl p-5 md:p-6 overflow-y-auto max-h-[1000px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Active Task Board</h3>
                  <p className="text-xs text-slate-400">Total corporate follow-ups assigned to your ledger.</p>
                </div>
                <button
                  onClick={() => handleOpenTaskModal()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create Task
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">You have zero follow-up tasks recorded!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Categorized overdue / upcoming */}
                  {tasks.map(t => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        t.completed
                          ? "bg-[#0b1329]/50 border-blue-950/40 opacity-70"
                          : "bg-[#0d1c3a]/30 border-blue-900/20"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          id={`task-board-check-${t.id}`}
                          onChange={() => toggleTaskCompleted(t.id, t.completed)}
                          className="mt-1 cursor-pointer w-4 h-4 accent-blue-600 rounded bg-[#030712] border-blue-900/50"
                        />
                        <div>
                          <h4 className={`text-sm font-bold text-slate-200 ${t.completed ? "line-through text-slate-500" : ""}`}>
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3.5 mt-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-blue-400 uppercase">Lead: {t.clientName}</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" /> Due: {t.dueDate}
                            </span>
                            {new Date(t.dueDate) < new Date() && !t.completed && (
                              <span className="bg-red-950/40 text-red-500 border border-red-900/50 px-2 py-0.5 rounded text-[9.5px] font-bold">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 self-end md:self-center">
                        <button
                          onClick={() => removeTaskItem(t.id)}
                          className="p-1.5 hover:bg-red-950/50 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW D: DOCUMENT VAULT / SYSTEM INDEX */}
          {activeTab === "files" && (
            <div className="bg-[#0b1329] border border-blue-950/70 rounded-2xl p-5 md:p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-200">Global Document Vault</h3>
                <p className="text-xs text-slate-400">Contracts, spreadsheets, specs, and imaging files.</p>
              </div>

              {files.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p>No document metadata resides in database. Upload physical documents inside client tabs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse select-none text-xs">
                    <thead>
                      <tr className="border-b border-blue-950/50 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">File Name</th>
                        <th className="py-3 px-4">File Size</th>
                        <th className="py-3 px-4">Upload Date</th>
                        <th className="py-3 px-4">Related client</th>
                        <th className="py-3 px-4">Sender Profile</th>
                        <th className="py-3 px-4 text-center">Interventions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-950/50">
                      {files.map(f => (
                        <tr key={f.id} className="hover:bg-[#0c142b] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="truncate max-w-xs" title={f.name}>{f.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">{formatSize(f.size)}</td>
                          <td className="py-3.5 px-4 text-slate-400">{new Date(f.uploadedAt).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-blue-400 font-semibold">{f.clientName}</td>
                          <td className="py-3.5 px-4 text-slate-400">{f.uploadedByName}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => triggerFileDownload(f)}
                                className="p-1 px-2.5 bg-blue-900/25 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/50 transition-colors"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => triggerFileDelete(f.id)}
                                className="p-1 px-2 text-red-950/50 text-red-400 hover:text-red-300 rounded hover:bg-red-950/80 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW E: AUDIT LOGS */}
          {activeTab === "activity" && (
            <div className="bg-[#0b1329] border border-blue-950/70 rounded-2xl p-5 md:p-6 overflow-y-auto">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Historical Audit Records</h3>
                  <p className="text-xs text-slate-400">Executive changes, client operations, and pipeline progression trail.</p>
                </div>
                {user.role === "admin" && logs.length > 0 && (
                  <button
                    onClick={handleClearAllLogs}
                    className="px-3 py-1.5 bg-rose-950/20 border border-rose-900/50 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    {t("clearLogsBtn")}
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No tracking logs recorded yet.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {logs.map(log => (
                    <div key={log.id} className="p-3 bg-[#0c142b] border border-blue-900/10 rounded-xl text-xs flex gap-3 items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          log.action === "create_lead" ? "bg-blue-600/10 text-blue-400" :
                          log.action === "change_status" ? "bg-purple-600/10 text-purple-400" :
                          log.action === "upload_file" ? "bg-emerald-600/10 text-emerald-400" : "bg-indigo-600/10 text-indigo-400"
                        }`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 leading-snug">{log.details}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">By: {log.userName} • ID: {log.userId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {user.role === "admin" && (
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded transition-all cursor-pointer"
                            title={language === "en" ? "Delete Record" : "Eliminar Registro"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW F: EXECUTIVE SETTINGS & PROFILE (Change password, role details) */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1329] border border-blue-950/70 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-slate-200 mb-4 pb-1 border-b border-blue-950">
                  {language === "en" ? "Executive Profile" : "Perfil Ejecutivo"}
                </h3>
                
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                      {language === "en" ? "Registered Name" : "Nombre Registrado"}
                    </span>
                    <p className="text-slate-200 font-semibold text-sm mt-0.5">{user.name}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                      {language === "en" ? "Corporate Email Address" : "Dirección de Correo Corporativo"}
                    </span>
                    <p className="text-slate-200 font-semibold text-sm mt-0.5 font-mono">{user.email}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                      {language === "en" ? "Appointed Persona / Security Role" : "Persona Asignada / Rol de Seguridad"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="font-semibold text-blue-400 bg-blue-600/15 border border-blue-500/25 px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                        {user.role === "admin" ? t("roleAdmin") : t("roleExecutive")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                      {language === "en" ? "Account ID" : "Identificador de Cuenta"}
                    </span>
                    <p className="text-slate-400 font-mono mt-0.5">{user.id}</p>
                  </div>

                  {/* Real-time SMTP Email settings toggler */}
                  <div className="pt-4 mt-2 border-t border-blue-950">
                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                      {t("emailNotificationsPref")}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t("emailNotificationsPrefDesc")}
                    </p>
                    
                    <div className="flex items-center justify-between bg-[#050b18] border border-blue-900/25 p-3 rounded-xl mt-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${emailNotifications ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
                        <span className="text-[11px] font-semibold text-slate-200">
                          {emailNotifications ? t("emailOn") : t("emailOff")}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleToggleEmailNotifications(!emailNotifications)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          emailNotifications ? "bg-blue-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            emailNotifications ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone: Permanent Account Deactivation */}
                  <div className="pt-5 mt-4 border-t border-red-950/40">
                    <span className="text-red-400 font-medium uppercase tracking-wider text-[10px]">
                      {language === "en" ? "Danger Zone" : "Zona de Peligro"}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {user.role === "admin" 
                        ? (language === "en" 
                            ? "Deactivating your account will permanently log you out and restrict future login. Active team executives and clients will be preserved, but your access is lost."
                            : "Desactivar su cuenta cerrará sesión permanentemente y restringirá el acceso futuro. Los ejecutivos y prospectos activos del equipo se conservarán, pero perderá su acceso.")
                        : (language === "en" 
                            ? "This will deactivate your executive account and automatically transfer your assigned leads back to your Sales Director."
                            : "Esto desactivará su cuenta ejecutiva y transferirá automáticamente sus prospectos asignados a su Director de Ventas.")
                      }
                    </p>
                    
                    <button
                      type="button"
                      onClick={handleDeleteMyAccount}
                      className="w-full mt-3 px-4 py-2 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 hover:border-red-500 text-rose-300 hover:text-red-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {language === "en" ? "Deactivate My Account" : "Desactivar mi Cuenta"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <div className="bg-[#0b1329] border border-blue-950/70 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-slate-200 mb-4 pb-1 border-b border-blue-950">
                  {language === "en" ? "Alter Security Credentials" : "Modificar Credenciales de Seguridad"}
                </h3>

                {profileMessage && (
                  <div className="mb-4 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl flex items-start gap-2 text-emerald-400 text-xs">
                    <ShieldCheck className="w-5 h-5 grow-0 mt-0.5" />
                    <p className="font-medium">{profileMessage}</p>
                  </div>
                )}

                {profileError && (
                  <div className="mb-4 bg-red-950/40 border border-red-800/50 p-3 rounded-xl flex items-start gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-5 h-5 grow-0 mt-0.5" />
                    <p className="font-medium">{profileError}</p>
                  </div>
                )}

                <form onSubmit={updatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      {language === "en" ? "Current Password *" : "Contraseña Actual *"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={profileForm.oldPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, oldPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      {language === "en" ? "New Security Password *" : "Contraseña Nueva de Seguridad *"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      {language === "en" ? "Confirm New Password *" : "Confirmar Contraseña Nueva *"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold tracking-wide shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-none transition-all cursor-pointer"
                  >
                    {language === "en" ? "Commit Password Policy Update" : "Confirmar Actualización de Contraseña"}
                  </button>
                </form>
              </div>

              {/* Executive pending invitations list */}
              {user.role === "executive" && (
                <div className="bg-[#0b1329] border border-blue-950/70 p-6 rounded-2xl lg:col-span-2">
                  <h3 className="text-base font-bold text-slate-200 mb-4 pb-1 border-b border-blue-950 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-500" />
                    {t("pendingInvitations")}
                  </h3>

                  {invitations.filter((i: any) => i.status === "pending").length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      {language === "en" 
                        ? "No pending team invites found matching your corporate email address." 
                        : "No se encontraron invitaciones de equipo pendientes que coincidan con su dirección de correo corporativo."}
                    </p>
                  ) : (
                    <div className="divide-y divide-blue-950/50">
                      {invitations.filter((i: any) => i.status === "pending").map((inv: any) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">
                              {inv.directorName}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {t("invitedBy")}: {inv.directorId} • {new Date(inv.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptInvitation(inv.id)}
                              className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 font-semibold rounded-lg hover:bg-emerald-600/30 transition-colors cursor-pointer"
                            >
                              {t("acceptInvitation")}
                            </button>
                            <button
                              onClick={() => handleDeclineInvitation(inv.id)}
                              className="px-3 py-1.5 bg-red-950/40 border border-red-800/25 text-red-400 font-semibold rounded-lg hover:bg-red-950/80 transition-colors cursor-pointer"
                            >
                              {t("declineInvitation")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW G: TEAM MANAGEMENT (Visible to sales_director / admin only) */}
          {activeTab === "team" && user.role === "admin" && (
            <div className="space-y-6">
              {/* Errors & Success */}
              {teamSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 grow-0 text-emerald-400" />
                  <p className="font-medium">{teamSuccess}</p>
                </div>
              )}
              {teamError && (
                <div className="p-3 bg-red-950/40 border border-red-800/50 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 grow-0 text-red-400" />
                  <p className="font-medium">{teamError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Send Invitation Form */}
                <div className="bg-[#0b1329] border border-blue-950/70 p-5 md:p-6 rounded-2xl flex flex-col justify-start">
                  <h3 className="text-base font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    {t("inviteExecutive")}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {language === "en" 
                      ? "Dispatches a pending invitation linked to their corporate registration email." 
                      : "Envía una actualización vinculada a su correo corporativo de registro."}
                  </p>

                  <form onSubmit={handleInviteExecutive} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        {t("invitedEmail")}
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="E.g. sales@example.com"
                        className="w-full px-3.5 py-2.5 bg-[#050b18] border border-blue-900/40 rounded-xl text-slate-200 text-xs font-mono outline-none focus:border-blue-500 transition-all font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-none tracking-wider cursor-pointer font-sans"
                    >
                      {t("inviteBtn")}
                    </button>
                  </form>
                </div>

                {/* 2. Invitation Status list */}
                <div className="bg-[#0b1329] border border-blue-950/70 p-5 md:p-6 rounded-2xl lg:col-span-2 overflow-y-auto max-h-[350px]">
                  <h3 className="text-base font-bold text-slate-200 mb-4 pb-1 border-b border-blue-950">
                    {t("invitationStatus")}
                  </h3>

                  {invitations.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs italic">
                      {t("noInvitations")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-blue-950/50 text-slate-400 uppercase tracking-wider font-semibold">
                            <th className="py-2 px-3">{t("invitedEmail")}</th>
                            <th className="py-2 px-3">{t("statusCol")}</th>
                            <th className="py-2 px-3">{language === "en" ? "Sent At" : "Enviada el"}</th>
                            <th className="py-2 px-3 text-right">{t("actionsCol")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-950/40">
                          {invitations.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-[#0c142b]/30">
                              <td className="py-3 px-3 font-mono font-medium text-slate-300">
                                {inv.executiveEmail}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  inv.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                  inv.status === "accepted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-400">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {inv.status === "pending" && (
                                  <button
                                    onClick={() => handleRevokeInvitation(inv.id)}
                                    className="px-2 py-1 bg-red-950/30 text-red-400 hover:bg-red-950/70 rounded border border-red-900/30 font-semibold cursor-pointer text-[10px]"
                                  >
                                    {language === "en" ? "Revoke" : "Revocar"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Assigned Team Members list */}
              <div className="bg-[#0b1329] border border-blue-950/70 p-5 md:p-6 rounded-2xl font-sans">
                <h3 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-1.5 pb-1 border-b border-blue-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  {t("activeMembers")}
                </h3>

                {teamMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    {t("noTeamMembers")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {teamMembers.map((member: any) => (
                      <div key={member.id} className="p-4 bg-[#0a1024]/60 border border-blue-950 rounded-xl relative flex flex-col gap-4 font-sans">
                        {/* Member overview */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-100">{member.name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{member.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveTeamMember(member.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 hover:underline font-bold bg-transparent border-none cursor-pointer"
                          >
                            {language === "en" ? "Remove Member" : "Eliminar del Equipo"}
                          </button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3 bg-[#050b18] p-3 rounded-lg border border-blue-900/10 text-xs">
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{language === "en" ? "Assigned Leads" : "Prospectos Asignados"}</span>
                            <span className="text-sm font-bold text-slate-200 mt-0.5 block">{member.assignedLeadsCount}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t("pendingTasks")}</span>
                            <span className="text-sm font-bold text-amber-400 mt-0.5 block">{member.pendingTasksCount}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t("negotiationVolume")}</span>
                            <span className="text-sm font-bold text-blue-400 mt-0.5 block">{member.negotiationCount}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{t("conversionRate")}</span>
                            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{member.conversionRate}%</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>{t("createdAtText")}: {new Date(member.createdAt).toLocaleDateString()}</span>
                          <span>ID: {member.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 4. MODAL: CREATE / EDIT CRM CLIENT OR LEAD */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b1329] border border-blue-950 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              {isEditMode ? "Modify Lead Portfolio" : "Initiate Customer / Lead Record"}
            </h3>

            <form onSubmit={saveClientForm} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    placeholder="E.g. Elon Musk"
                    className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Company / Enterprise *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.company}
                    onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                    placeholder="E.g. SpaceX Corp"
                    className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Corporate Email</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="elon@spacex.com"
                    className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-1111"
                    className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Pipeline Stage</label>
                <select
                  value={clientForm.status}
                  onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as SalesStatus })}
                  className="w-full px-3 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 outline-none focus:border-blue-500 transition-all"
                >
                  <option value="New Lead">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed">Closed</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              {/* Admin reassigns lead owner */}
              {user.role === "admin" && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Assign Sales Owner</label>
                  <select
                    value={clientForm.assignedTo}
                    onChange={(e) => setClientForm({ ...clientForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 outline-none focus:border-blue-500 transition-all"
                  >
                    <option value={user.id}>{user.name} ({language === "en" ? "You - Sales Director" : "Tú - Director de Ventas"})</option>
                    {teamMembers.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Internal Memo / Notes</label>
                <textarea
                  rows={4}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="Insert strategic notes, negotiation targets/deadlines..."
                  className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-blue-950">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 bg-[#0c142b] text-slate-400 hover:text-slate-100 rounded-xl"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-600/20"
                >
                  Commit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: CREATE FOLLOW-UP REMINDER OR TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-blue-950 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Set Follow-up Reminder</h3>

            <form onSubmit={saveTaskForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Related client *</label>
                <select
                  value={taskForm.clientId}
                  onChange={(e) => setTaskForm({ ...taskForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">Select a Lead Context...</option>
                  {clients.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name} - {cli.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Send specification revision PDF..."
                  className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Target Deadline *</label>
                <input
                  type="date"
                  required
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-300 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Detailed Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Any context parameters or details..."
                  className="w-full px-3.5 py-2 bg-[#050b18] border border-blue-900/30 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-blue-950">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 bg-[#0c142b] text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold"
                >
                  Create Alert Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL (Iframe Safe) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0b1329] border border-blue-900/60 rounded-2xl p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-blue-950">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#0c142b] border border-blue-900/10 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {confirmModal.cancelText || (language === "en" ? "Cancel" : "Cancelar")}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs text-white font-semibold cursor-pointer transition-colors shadow-lg shadow-red-950/20"
              >
                {confirmModal.confirmText || (language === "en" ? "Confirm Delete" : "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TRANSIENT TOAST NOTIFICATIONS (Iframe Safe) */}
      {toast.isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-xl shadow-2xl flex items-center gap-3 border ${
            toast.type === "success" 
              ? "bg-[#09331e]/90 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20" 
              : toast.type === "error"
              ? "bg-[#3a0614]/90 border-red-500/30 text-red-300 shadow-red-950/20"
              : "bg-[#0c2045]/90 border-blue-500/30 text-blue-300 shadow-blue-950/20"
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === "success" ? "bg-emerald-400 animate-pulse" : toast.type === "error" ? "bg-red-400 animate-pulse" : "bg-blue-400 animate-pulse"
            }`} />
            <p className="text-xs font-medium font-sans leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
