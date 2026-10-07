export type Language = "en" | "es";

export interface TranslationDict {
  appName: string;
  acceleratedCrm: string;
  secureSales: string;
  emailAddress: string;
  password: string;
  fullName: string;
  fullNamePlaceholder: string;
  role: string;
  roleExecutive: string;
  roleAdmin: string;
  signIn: string;
  signUp: string;
  forgotPassword: string;
  registeredQuestion: string;
  newJoiner: string;
  signInUnderline: string;
  createAccountUnderline: string;
  errorAllFields: string;
  passwordResetMsg: string;
  passwordResetError: string;
  authFailed: string;
  dashboard: string;
  crmPipeline: string;
  leadAssignedTo: string;
  assignedTo: string;
  allExecutives: string;
  status: string;
  company: string;
  searchPlaceholder: string;
  clearFilters: string;
  addLead: string;
  addLeadBtn: string;
  addLeadTitle: string;
  editLeadTitle: string;
  deleteLeadConfirm: string;
  uploadFile: string;
  noLeads: string;
  newLeadStage: string;
  contactedStage: string;
  negotiationStage: string;
  closedWonStage: string;
  closedLostStage: string;
  totalLeadsCard: string;
  negotiationVolume: string;
  conversionRate: string;
  pendingTasks: string;
  recalculate: string;
  dragDrop: string;
  selectFile: string;
  maxSize: string;
  uploading: string;
  uploadedFiles: string;
  noFiles: string;
  upcomingReminders: string;
  taskTitle: string;
  taskDueDate: string;
  taskDescription: string;
  addTask: string;
  addTaskBtn: string;
  taskCompleted: string;
  taskOverdue: string;
  noTasks: string;
  userProfile: string;
  accountDetails: string;
  roleText: string;
  createdAtText: string;
  changePassword: string;
  oldPassword: string;
  newPassword: string;
  updatePasswordBtn: string;
  logoutBtn: string;
  passwordSuccess: string;
  deleteAccountBtn: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmMessage: string;
  deleteAccountSuccess: string;
  activityStream: string;
  noLogs: string;
  deleteLogConfirmTitle: string;
  deleteLogConfirmMessage: string;
  clearAllLogsConfirmTitle: string;
  clearAllLogsConfirmMessage: string;
  clearLogsBtn: string;
  logDeletedSuccess: string;
  logsClearedSuccess: string;
  remindersAlerts: string;
  noAlerts: string;
  loadingData: string;
  errorTitle: string;
  executiveLabel: string;
  adminLabel: string;
  phone: string;
  phonePlaceholder: string;
  notes: string;
  notesPlaceholder: string;
  save: string;
  cancel: string;
  delete: string;
  actions: string;
  viewDetails: string;
  close: string;
  teamManagement: string;
  inviteExecutive: string;
  inviteBtn: string;
  invitationStatus: string;
  revokeInvitation: string;
  removeExecutive: string;
  assignReassignLeads: string;
  filterDashboard: string;
  executivePerformance: string;
  invitedEmail: string;
  statusCol: string;
  actionsCol: string;
  noTeamMembers: string;
  noInvitations: string;
  activeMembers: string;
  inviteEmailPlaceholder: string;
  acceptInvitation: string;
  declineInvitation: string;
  pendingInvitations: string;
  invitedBy: string;
  joinTeamSuccess: string;
  emailNotificationsPref: string;
  emailNotificationsPrefDesc: string;
  emailOn: string;
  emailOff: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    appName: "LepusHub",
    acceleratedCrm: "Accelerated Lead and Relationship Management",
    secureSales: "Secure Sales Executive Environment",
    emailAddress: "Email Address",
    password: "Password",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your name",
    role: "Corporate Role",
    roleExecutive: "Sales Executive",
    roleAdmin: "Sales Director (Admin)",
    signIn: "Access Corporate Desktop",
    signUp: "Create LepusHub Account",
    forgotPassword: "Forgot password?",
    registeredQuestion: "Already registered at LepusHub?",
    newJoiner: "New executive joiner?",
    signInUnderline: "Sign In",
    createAccountUnderline: "Create account",
    errorAllFields: "Please fill out all mandatory fields.",
    passwordResetMsg: "A simulated recovery password has been initialized. To proceed, the administrator has set your password temporarily to 'password123'. Please log in with it and change your credentials immediately inside the profile tab.",
    passwordResetError: "Please key in your registered email first to request a password reset.",
    authFailed: "Authentication process failed. Please check your credentials.",
    dashboard: "Workspace",
    crmPipeline: "CRM Sales Pipeline",
    leadAssignedTo: "Assigned Executive",
    assignedTo: "Assigned To",
    allExecutives: "All Executives",
    status: "Status",
    company: "Company",
    searchPlaceholder: "Search leads by name, company, email...",
    clearFilters: "Clear",
    addLead: "Add Lead",
    addLeadBtn: "+ Add Lead",
    addLeadTitle: "Create Client & Relationship Lead",
    editLeadTitle: "Modify Client & Relationship details",
    deleteLeadConfirm: "Are you sure you want to delete this lead and its tasks?",
    uploadFile: "Upload File",
    noLeads: "No relationships or leads matching filters found.",
    newLeadStage: "New Lead",
    contactedStage: "Contacted",
    negotiationStage: "Negotiation",
    closedWonStage: "Closed",
    closedLostStage: "Lost",
    totalLeadsCard: "Total Active Leads",
    negotiationVolume: "Negotiation Volume",
    conversionRate: "Closed Won Ratio",
    pendingTasks: "Pending Alerts",
    recalculate: "Recalculate stats based on active database mappings",
    dragDrop: "Drag and drop relevant files here to upload or",
    selectFile: "select files manually",
    maxSize: "Supports PDF, Excel, Docs up to 10MB",
    uploading: "Uploading...",
    uploadedFiles: "Uploaded Attachments",
    noFiles: "No documents uploaded yet.",
    upcomingReminders: "Follow-up Reminders",
    taskTitle: "Title",
    taskDueDate: "Due Date",
    taskDescription: "Description",
    addTask: "Add Task",
    addTaskBtn: "+ Add Task",
    taskCompleted: "Completed",
    taskOverdue: "Overdue",
    noTasks: "No follow-up alerts set for this client.",
    userProfile: "Profile & Security Settings",
    accountDetails: "Account Details",
    roleText: "Role",
    createdAtText: "Joined",
    changePassword: "Change Password",
    oldPassword: "Current Password",
    newPassword: "New Password",
    updatePasswordBtn: "Update Secure Credentials",
    logoutBtn: "Sign Out",
    passwordSuccess: "Password updated successfully.",
    deleteAccountBtn: "Deactivate My Account",
    deleteAccountConfirmTitle: "Deactivate Your Account?",
    deleteAccountConfirmMessage: "Are you sure you want to permanently deactivate your account? This will restrict your access in the future. Active team components will be preserved, log data is kept, and logs are automatically updated. This action is irreversible.",
    deleteAccountSuccess: "Account has been successfully deactivated.",
    activityStream: "Audit Stream & Activity Log",
    noLogs: "No system activity matching permissions logged.",
    deleteLogConfirmTitle: "Delete Activity Log Record?",
    deleteLogConfirmMessage: "Are you sure you want to permanently delete this system log item? This operation cannot be undone.",
    clearAllLogsConfirmTitle: "Purge All Activity Logs?",
    clearAllLogsConfirmMessage: "WARNING: This will permanently delete all activity log elements from the database. Are you absolutely sure?",
    clearLogsBtn: "Purge All Logs",
    logDeletedSuccess: "Activity log successfully deleted.",
    logsClearedSuccess: "All activity logs successfully cleared.",
    remindersAlerts: "Reminders & Alerts",
    noAlerts: "No pending reminders.",
    loadingData: "Loading CRM workspace metrics...",
    errorTitle: "Error",
    executiveLabel: "Executive",
    adminLabel: "Sales Director (Admin)",
    phone: "Phone Number",
    phonePlaceholder: "+1 (555) 000-0000",
    notes: "Internal Notes",
    notesPlaceholder: "Enter background notes, preferences, meeting points...",
    save: "Save Changes",
    cancel: "Cancel",
    delete: "Delete",
    actions: "Actions",
    viewDetails: "View & Edit Details",
    close: "Close",
    teamManagement: "Team Management",
    inviteExecutive: "Invite Executive by Email",
    inviteBtn: "Send Invitation",
    invitationStatus: "Invitation Status",
    revokeInvitation: "Revoke Invitation",
    removeExecutive: "Remove Executive from Team",
    assignReassignLeads: "Assign/Reassign Leads",
    filterDashboard: "Filter Dashboard by Executive",
    executivePerformance: "Executive Performance Summary",
    invitedEmail: "Invited Email Address",
    statusCol: "Status",
    actionsCol: "Actions",
    noTeamMembers: "No executives are currently assigned to your team.",
    noInvitations: "No sent invitations yet.",
    activeMembers: "Assigned Team Executives",
    inviteEmailPlaceholder: "executive@company.com",
    acceptInvitation: "Accept Team Invitation",
    declineInvitation: "Decline",
    pendingInvitations: "Pending Team Invitations",
    invitedBy: "Invited by Sales Director",
    joinTeamSuccess: "You have successfully joined the team!",
    emailNotificationsPref: "Email Notification Settings",
    emailNotificationsPrefDesc: "Receive real-time alerts on registration handshakes, corporate task reminders, and direct pipeline leads allocation reports.",
    emailOn: "Notifications Enabled (ON)",
    emailOff: "Notifications Suspended (OFF)",
  },
  es: {
    appName: "LepusHub",
    acceleratedCrm: "Gestión de Prospectos y Relaciones Acelerada",
    secureSales: "Entorno Ejecutivo de Ventas Seguro",
    emailAddress: "Correo Electrónico",
    password: "Contraseña",
    fullName: "Nombre Completo",
    fullNamePlaceholder: "Ingrese su nombre",
    role: "Rol Corporativo",
    roleExecutive: "Ejecutivo de Ventas",
    roleAdmin: "Director de Ventas (Admin)",
    signIn: "Acceder al Escritorio Corporativo",
    signUp: "Crear Cuenta LepusHub",
    forgotPassword: "¿Olvidó su contraseña?",
    registeredQuestion: "¿Ya está registrado en LepusHub?",
    newJoiner: "¿Nuevo ejecutivo ingresante?",
    signInUnderline: "Iniciar Sesión",
    createAccountUnderline: "Crear cuenta",
    errorAllFields: "Por favor, complete todos los campos obligatorios.",
    passwordResetMsg: "Se ha inicializado una contraseña de recuperación simulada. Para continuar, el administrador ha establecido su contraseña temporalmente en 'password123'. Inicie sesión con ella y cambie sus credenciales inmediatamente dentro de la pestaña de perfil.",
    passwordResetError: "Por favor, ingrese primero su correo registrado para solicitar un restablecimiento de contraseña.",
    authFailed: "El proceso de autenticación falló. Compruebe sus credenciales.",
    dashboard: "Espacio de Trabajo",
    crmPipeline: "Embudo de Ventas CRM",
    leadAssignedTo: "Ejecutivo Asignado",
    assignedTo: "Asignado a",
    allExecutives: "Todos los Ejecutivos",
    status: "Estado",
    company: "Empresa",
    searchPlaceholder: "Buscar prospectos por nombre, empresa, correo...",
    clearFilters: "Limpiar",
    addLead: "Añadir Prospecto",
    addLeadBtn: "+ Añadir Prospecto",
    addLeadTitle: "Crear Cliente y Prospecto de Relación",
    editLeadTitle: "Modificar Detalles de Cliente y Prospecto",
    deleteLeadConfirm: "¿Está seguro de que desea eliminar este prospecto y sus tareas?",
    uploadFile: "Subir Archivo",
    noLeads: "No se encontraron relaciones ni prospectos que coincidan con los filtros.",
    newLeadStage: "Nuevo Prospecto",
    contactedStage: "Contactado",
    negotiationStage: "Negociación",
    closedWonStage: "Cerrado",
    closedLostStage: "Perdido",
    totalLeadsCard: "Total de Prospectos Activos",
    negotiationVolume: "Volumen de Negociación",
    conversionRate: "Tasa de Ganados",
    pendingTasks: "Alertas Pendientes",
    recalculate: "Recalcular estadísticas basadas en asignaciones activas de base de datos",
    dragDrop: "Arrastre y suelte los archivos relevantes aquí para subirlos o",
    selectFile: "seleccione los archivos manualmente",
    maxSize: "Soporta PDF, Excel, Docs hasta 10MB",
    uploading: "Subiendo...",
    uploadedFiles: "Archivos Adjuntos Subidos",
    noFiles: "No se han subido documentos todavía.",
    upcomingReminders: "Recordatorios de Seguimiento",
    taskTitle: "Título",
    taskDueDate: "Fecha de Vencimiento",
    taskDescription: "Descripción",
    addTask: "Añadir Tarea",
    addTaskBtn: "+ Añadir Tarea",
    taskCompleted: "Completada",
    taskOverdue: "Vencida",
    noTasks: "No se han establecido alertas de seguimiento para este cliente.",
    userProfile: "Configuración de Perfil y Seguridad",
    accountDetails: "Detalles de la Cuenta",
    roleText: "Rol",
    createdAtText: "Miembro Desde",
    changePassword: "Cambiar Contraseña",
    oldPassword: "Contraseña Actual",
    newPassword: "Contraseña Nueva",
    updatePasswordBtn: "Actualizar Credenciales Seguras",
    logoutBtn: "Cerrar Sesión",
    passwordSuccess: "Contraseña actualizada con éxito.",
    deleteAccountBtn: "Desactivar mi Cuenta",
    deleteAccountConfirmTitle: "¿Desactivar su Cuenta?",
    deleteAccountConfirmMessage: "¿Está seguro de que desea desactivar permanentemente su cuenta? Esto restringirá su acceso en el futuro. Los componentes activos del equipo se conservarán, se guardarán los registros y se actualizarán automáticamente. Esta acción es irreversible.",
    deleteAccountSuccess: "La cuenta se ha desactivado correctamente.",
    activityStream: "Flujo de Auditoría y Registro de Actividad",
    noLogs: "No se registró actividad del sistema que coincida con los permisos.",
    deleteLogConfirmTitle: "¿Eliminar registro de actividad?",
    deleteLogConfirmMessage: "¿Está seguro de que desea eliminar permanentemente este elemento del registro del sistema? Esta operación no se puede deshacer.",
    clearAllLogsConfirmTitle: "¿Purgar todos los registros de actividad?",
    clearAllLogsConfirmMessage: "ADVERTENCIA: Esto eliminará permanentemente todos los elementos del registro de actividad de la base de datos. ¿Está absolutamente seguro?",
    clearLogsBtn: "Purgar Registros",
    logDeletedSuccess: "Registro de actividad eliminado correctamente.",
    logsClearedSuccess: "Todos los registros de actividad se han purgado correctamente.",
    remindersAlerts: "Recordatorios y Alertas",
    noAlerts: "No hay recordatorios pendientes.",
    loadingData: "Cargando métricas del espacio de trabajo...",
    errorTitle: "Error",
    executiveLabel: "Ejecutivo",
    adminLabel: "Director de Ventas (Admin)",
    phone: "Número de Teléfono",
    phonePlaceholder: "+1 (555) 000-0000",
    notes: "Notas Internas",
    notesPlaceholder: "Ingrese notas sobre antecedentes, preferencias, puntos de reunión...",
    save: "Guardar Cambios",
    cancel: "Cancelar",
    delete: "Eliminar",
    actions: "Acciones",
    viewDetails: "Ver y Editar Detalles",
    close: "Cerrar",
    teamManagement: "Gestión de Equipos",
    inviteExecutive: "Invitar Ejecutivo por Correo",
    inviteBtn: "Enviar Invitación",
    invitationStatus: "Estado de la Invitación",
    revokeInvitation: "Revocar Invitación",
    removeExecutive: "Eliminar Ejecutivo del Equipo",
    assignReassignLeads: "Asignar/Reasignar Prospectos",
    filterDashboard: "Filtrar por Ejecutivo",
    executivePerformance: "Resumen de Rendimiento de Ejecutivos",
    invitedEmail: "Correo del Invitado",
    statusCol: "Estado",
    actionsCol: "Acciones",
    noTeamMembers: "No hay ejecutivos asignados a su equipo actualmente.",
    noInvitations: "No hay invitaciones enviadas todavía.",
    activeMembers: "Ejecutivos Asignados al Equipo",
    inviteEmailPlaceholder: "ejecutivo@empresa.com",
    acceptInvitation: "Aceptar Invitación al Equipo",
    declineInvitation: "Rechazar",
    pendingInvitations: "Invitaciones de Equipo Pendientes",
    invitedBy: "Invitado por el Director de Ventas",
    joinTeamSuccess: "¡Te has unido al equipo con éxito!",
    emailNotificationsPref: "Configuración de Notificaciones por Correo",
    emailNotificationsPrefDesc: "Reciba alertas en tiempo real sobre aprobaciones de registro, recordatorios de tareas corporativas y asignaciones de prospectos.",
    emailOn: "Notificaciones Activadas (SÍ)",
    emailOff: "Notificaciones Desactivadas (NO)",
  },
};
