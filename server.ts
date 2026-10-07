import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Client, ClientFile, Task, ActivityLog, SalesStatus } from "./src/types";
import sqlite from "better-sqlite3";
import { sendExecutiveInvitationEmail } from "./server/email";

// Setup and Paths
const PORT = 3000;
const DB_SQLITE_FILE = path.join(process.cwd(), "db.sqlite");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// User representation in Database
interface DbUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "executive";
  createdAt: string;
  emailNotifications?: number;
  isActive?: number;
  deletedAt?: string | null;
}

// Complete Database Schema (For structural reference)
interface DbSchema {
  users: DbUser[];
  clients: Client[];
  files: ClientFile[];
  tasks: Task[];
  activityLogs: ActivityLog[];
}

// Helper methods for Password Hashing (Secure PBKDF2 native)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === checkHash;
  } catch (e) {
    return false;
  }
}

// Default/Initial Seed Data
const defaultDb: DbSchema = {
  users: [
    {
      id: "usr_admin",
      email: "leonyciro@gmail.com", // seeded user email
      name: "Leon Executive",
      passwordHash: hashPassword("password123"),
      role: "admin",
      createdAt: new Date("2026-01-01T08:00:00Z").toISOString()
    },
    {
      id: "usr_alice",
      email: "alice@lepushub.com",
      name: "Alice Smith",
      passwordHash: hashPassword("password123"),
      role: "executive",
      createdAt: new Date("2026-02-15T09:30:00Z").toISOString()
    }
  ],
  clients: [
    {
      id: "cli_1",
      name: "Sarah Jenkins",
      company: "Acme Corporation",
      email: "sarah.j@acme.com",
      phone: "+1 (555) 234-5678",
      notes: "Enquired about premium bulk packaging. Highly interested in Q3 rollout.",
      status: "Negotiation",
      assignedTo: "usr_admin",
      assignedToName: "Leon Executive",
      createdAt: new Date("2026-05-10T14:20:00Z").toISOString(),
      updatedAt: new Date("2026-05-25T11:45:00Z").toISOString()
    },
    {
      id: "cli_2",
      name: "Bruce Wayne",
      company: "Wayne Enterprises",
      email: "bruce@wayne.corp",
      phone: "+1 (555) 999-8888",
      notes: "High-value enterprise lead. Needs tactical response framework for bulk operations.",
      status: "New Lead",
      assignedTo: "usr_admin",
      assignedToName: "Leon Executive",
      createdAt: new Date("2026-05-26T09:00:00Z").toISOString(),
      updatedAt: new Date("2026-05-26T09:00:00Z").toISOString()
    },
    {
      id: "cli_3",
      name: "Richard Hendricks",
      company: "Pied Piper LLC",
      email: "richard@piedpiper.io",
      phone: "+1 (555) 432-1098",
      notes: "Requested technical doc updates regarding API compression schemas.",
      status: "Contacted",
      assignedTo: "usr_alice",
      assignedToName: "Alice Smith",
      createdAt: new Date("2026-05-18T16:15:00Z").toISOString(),
      updatedAt: new Date("2026-05-20T10:00:00Z").toISOString()
    },
    {
      id: "cli_4",
      name: "Peter Parker",
      company: "Daily Bugle",
      email: "peter@dailybugle.com",
      phone: "+1 (555) 789-0123",
      notes: "Closed licensing agreement for photography assets.",
      status: "Closed",
      assignedTo: "usr_admin",
      assignedToName: "Leon Executive",
      createdAt: new Date("2026-04-01T11:00:00Z").toISOString(),
      updatedAt: new Date("2026-05-05T15:30:00Z").toISOString()
    },
    {
      id: "cli_5",
      name: "Lex Luthor",
      company: "LexCorp",
      email: "lex@lexcorp.com",
      phone: "+1 (555) 666-6666",
      notes: "Pricing negotiation collapsed due to rigid compliance standards.",
      status: "Lost",
      assignedTo: "usr_alice",
      assignedToName: "Alice Smith",
      createdAt: new Date("2026-03-10T10:00:00Z").toISOString(),
      updatedAt: new Date("2026-04-12T14:00:00Z").toISOString()
    }
  ],
  files: [
    {
      id: "fil_1",
      name: "Acme_RF_Proposal_v2.pdf",
      size: 1024 * 342, // ~342 KB
      type: "application/pdf",
      uploadedBy: "usr_admin",
      uploadedByName: "Leon Executive",
      uploadedAt: new Date("2026-05-25T11:42:00Z").toISOString(),
      clientId: "cli_1",
      clientName: "Sarah Jenkins"
    },
    {
      id: "fil_2",
      name: "Wayne_Enterprise_Budget.xlsx",
      size: 1024 * 180, // ~180 KB
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploadedBy: "usr_admin",
      uploadedByName: "Leon Executive",
      uploadedAt: new Date("2026-05-26T09:12:00Z").toISOString(),
      clientId: "cli_2",
      clientName: "Bruce Wayne"
    }
  ],
  tasks: [
    {
      id: "tsk_1",
      title: "Send technical spec proposal revision",
      description: "Send PDF file of spec package describing integration hooks.",
      dueDate: "2026-05-29",
      completed: false,
      clientId: "cli_1",
      clientName: "Sarah Jenkins",
      assignedTo: "usr_admin",
      createdAt: new Date("2026-05-25T11:45:00Z").toISOString()
    },
    {
      id: "tsk_2",
      title: "Call Bruce Wayne",
      description: "Discuss primary pricing thresholds and executive access keys.",
      dueDate: "2026-05-28",
      completed: false,
      clientId: "cli_2",
      clientName: "Bruce Wayne",
      assignedTo: "usr_admin",
      createdAt: new Date("2026-05-26T09:05:00Z").toISOString()
    },
    {
      id: "tsk_3",
      title: "Follow up on API doc review",
      description: "Ask Richard if Pied Piper requires customizable compression profiles.",
      dueDate: "2026-05-25", // Overdue task to test alert functionality
      completed: false,
      clientId: "cli_3",
      clientName: "Richard Hendricks",
      assignedTo: "usr_alice",
      createdAt: new Date("2026-05-18T16:20:00Z").toISOString()
    },
    {
      id: "tsk_4",
      title: "Archive BUGLE deal folder",
      description: "Move bugle docs into corporate close vault.",
      dueDate: "2026-05-10",
      completed: true,
      clientId: "cli_4",
      clientName: "Peter Parker",
      assignedTo: "usr_admin",
      createdAt: new Date("2026-04-02T09:00:00Z").toISOString()
    }
  ],
  activityLogs: [
    {
      id: "log_1",
      userId: "usr_admin",
      userName: "Leon Executive",
      action: "create_lead",
      details: "Created new lead Sarah Jenkins (Acme Corporation).",
      createdAt: new Date("2026-05-10T14:20:00Z").toISOString(),
      clientId: "cli_1"
    },
    {
      id: "log_2",
      userId: "usr_admin",
      userName: "Leon Executive",
      action: "change_status",
      details: "Moved customer Sarah Jenkins from Contacted to Negotiation.",
      createdAt: new Date("2026-05-25T11:45:00Z").toISOString(),
      clientId: "cli_1"
    },
    {
      id: "log_3",
      userId: "usr_admin",
      userName: "Leon Executive",
      action: "upload_file",
      details: "Uploaded file Acme_RF_Proposal_v2.pdf for Sarah Jenkins.",
      createdAt: new Date("2026-05-25T11:42:00Z").toISOString(),
      clientId: "cli_1"
    }
  ]
};

// SQLite Engine Setup & Table creation
console.log("[DB DIAGNOSTICS] Initializing SQLite Database...");
console.log("[DB DIAGNOSTICS] Database file location configured as:", DB_SQLITE_FILE);
console.log("[DB DIAGNOSTICS] Current working directory (CWD):", process.cwd());
console.log("[DB DIAGNOSTICS] Database file physically exists on disk? :", fs.existsSync(DB_SQLITE_FILE));

const dbSqlite = new sqlite(DB_SQLITE_FILE);

dbSqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    passwordHash TEXT,
    role TEXT,
    createdAt TEXT,
    emailNotifications INTEGER DEFAULT 1,
    isActive INTEGER DEFAULT 1,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    status TEXT,
    assignedTo TEXT,
    assignedToName TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    size INTEGER,
    type TEXT,
    uploadedBy TEXT,
    uploadedByName TEXT,
    uploadedAt TEXT,
    clientId TEXT,
    clientName TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    dueDate TEXT,
    completed INTEGER,
    clientId TEXT,
    clientName TEXT,
    assignedTo TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS activityLogs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    action TEXT,
    details TEXT,
    createdAt TEXT,
    clientId TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    message TEXT,
    read INTEGER DEFAULT 0,
    type TEXT,
    createdAt TEXT,
    emailSent INTEGER DEFAULT 0,
    emailSentAt TEXT,
    emailError TEXT
  );

  CREATE TABLE IF NOT EXISTS director_executives (
    id TEXT PRIMARY KEY,
    directorId TEXT,
    executiveId TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    directorId TEXT,
    directorName TEXT,
    executiveEmail TEXT,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    emailSent INTEGER DEFAULT 0,
    emailSentAt TEXT,
    emailError TEXT
  );
`);

// Dynamic column additions for existing db migrations
try {
  dbSqlite.exec("ALTER TABLE users ADD COLUMN emailNotifications INTEGER DEFAULT 1;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE notifications ADD COLUMN emailSent INTEGER DEFAULT 0;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE notifications ADD COLUMN emailSentAt TEXT;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE notifications ADD COLUMN emailError TEXT;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE invitations ADD COLUMN emailSent INTEGER DEFAULT 0;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE invitations ADD COLUMN emailSentAt TEXT;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE invitations ADD COLUMN emailError TEXT;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  dbSqlite.exec("ALTER TABLE users ADD COLUMN deletedAt TEXT;");
} catch (e) {
  // Column already exists, safe to ignore
}

// Database Manager using real SQLite Queries
class Database {
  constructor() {
    this.seedIfNeeded();
  }

  private seedIfNeeded() {
    const userCountResult = dbSqlite.prepare("SELECT count(*) as count FROM users").get() as { count: number };
    console.log("[DB DIAGNOSTICS] SQLITE startup audit: total entries in users table:", userCountResult.count);
    
    try {
      const allUsers = dbSqlite.prepare("SELECT id, email, role, isActive, deletedAt FROM users").all() as any[];
      console.log("[DB DIAGNOSTICS] SQLITE startup user profiles dump:", allUsers.map(u => ({ id: u.id, email: u.email, role: u.role, isActive: u.isActive, deletedAt: u.deletedAt })));
    } catch (err: any) {
      console.error("[DB DIAGNOSTICS] SQLITE error fetching accounts for diagnostic dump:", err.message);
    }

    if (userCountResult.count === 0) {
      console.log("[SQLite] Empty database detected. Seeding initial values...");
      
      // Seed Users
      const insertUser = dbSqlite.prepare(`
        INSERT INTO users (id, email, name, passwordHash, role, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      defaultDb.users.forEach(u => {
        insertUser.run(u.id, u.email, u.name, u.passwordHash, u.role, u.createdAt);
      });

      console.log("[SQLite] Seeding complete. Seeding restricted exclusively to accounts, leaving other models clean.");
    }
  }

  public getUsers() {
    return dbSqlite.prepare("SELECT * FROM users WHERE isActive = 1 OR isActive IS NULL").all() as DbUser[];
  }

  public getClients() {
    return dbSqlite.prepare("SELECT * FROM clients").all() as Client[];
  }

  public getFiles() {
    return dbSqlite.prepare("SELECT * FROM files").all() as ClientFile[];
  }

  public getTasks() {
    const rows = dbSqlite.prepare("SELECT * FROM tasks").all() as any[];
    return rows.map(r => ({
      ...r,
      completed: r.completed === 1
    })) as Task[];
  }

  public getLogs() {
    return dbSqlite.prepare("SELECT * FROM activityLogs ORDER BY createdAt DESC").all() as ActivityLog[];
  }

  // Database modifiers that execute SQL statements
  public pushUser(user: DbUser) {
    console.log("[DB DIAGNOSTICS] Attempting to insert new user into SQLite users table:", { id: user.id, email: user.email, role: user.role });
    const runResult = dbSqlite.prepare(`
      INSERT INTO users (id, email, name, passwordHash, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.email, user.name, user.passwordHash, user.role, user.createdAt);
    console.log("[DB DIAGNOSTICS] SQLite INSERT user completed successfully. Rows affected:", runResult.changes);

    // Verify insertion immediately by reading it back
    const inserted = dbSqlite.prepare("SELECT id, email, name, role, isActive, deletedAt FROM users WHERE id = ?").get(user.id) as any;
    console.log("[DB DIAGNOSTICS] Immediate verification of newly inserted user in SQLite DB:", inserted);
  }

  public updateUser(id: string, update: Partial<DbUser>) {
    const keys = Object.keys(update);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(", ");
    const values = keys.map(k => (update as any)[k]);
    dbSqlite.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, id);
  }

  public pushClient(client: Client) {
    dbSqlite.prepare(`
      INSERT INTO clients (id, name, company, email, phone, notes, status, assignedTo, assignedToName, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client.id, client.name, client.company, client.email, client.phone, client.notes, client.status, client.assignedTo, client.assignedToName, client.createdAt, client.updatedAt);
  }

  public updateClient(id: string, update: Partial<Client>) {
    const cleanUpdate = { ...update, updatedAt: new Date().toISOString() };
    const keys = Object.keys(cleanUpdate);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(", ");
    const values = keys.map(k => (cleanUpdate as any)[k]);
    dbSqlite.prepare(`UPDATE clients SET ${setClause} WHERE id = ?`).run(...values, id);

    // Propagate client name changes to tasks/files
    if (update.name) {
      dbSqlite.prepare("UPDATE tasks SET clientName = ? WHERE clientId = ?").run(update.name, id);
      dbSqlite.prepare("UPDATE files SET clientName = ? WHERE clientId = ?").run(update.name, id);
    }
  }

  public deleteClient(id: string) {
    dbSqlite.prepare("DELETE FROM clients WHERE id = ?").run(id);
    dbSqlite.prepare("DELETE FROM tasks WHERE clientId = ?").run(id);
    dbSqlite.prepare("DELETE FROM activityLogs WHERE clientId = ?").run(id);

    // clean up associated files on disk & db
    const filesToDel = dbSqlite.prepare("SELECT * FROM files WHERE clientId = ?").all(id) as ClientFile[];
    filesToDel.forEach(f => {
      const diskPath = path.join(UPLOAD_DIR, f.id);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch {}
      }
    });
    dbSqlite.prepare("DELETE FROM files WHERE clientId = ?").run(id);
  }

  public deleteLog(id: string) {
    dbSqlite.prepare("DELETE FROM activityLogs WHERE id = ?").run(id);
  }

  public clearLogs() {
    dbSqlite.prepare("DELETE FROM activityLogs").run();
  }

  public pushFile(file: ClientFile) {
    dbSqlite.prepare(`
      INSERT INTO files (id, name, size, type, uploadedBy, uploadedByName, uploadedAt, clientId, clientName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(file.id, file.name, file.size, file.type, file.uploadedBy, file.uploadedByName, file.uploadedAt, file.clientId, file.clientName);
  }

  public deleteFile(id: string) {
    dbSqlite.prepare("DELETE FROM files WHERE id = ?").run(id);
    const diskPath = path.join(UPLOAD_DIR, id);
    if (fs.existsSync(diskPath)) {
      try { fs.unlinkSync(diskPath); } catch {}
    }
  }

  public pushTask(task: Task) {
    dbSqlite.prepare(`
      INSERT INTO tasks (id, title, description, dueDate, completed, clientId, clientName, assignedTo, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.title, task.description, task.dueDate, task.completed ? 1 : 0, task.clientId, task.clientName, task.assignedTo, task.createdAt);
  }

  public updateTask(id: string, update: Partial<Task>) {
    const cleanUpdate = { ...update };
    if (cleanUpdate.completed !== undefined) {
      (cleanUpdate as any).completed = cleanUpdate.completed ? 1 : 0;
    }
    const keys = Object.keys(cleanUpdate);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(", ");
    const values = keys.map(k => (cleanUpdate as any)[k]);
    dbSqlite.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values, id);
  }

  public deleteTask(id: string) {
    dbSqlite.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  public log(userId: string, userName: string, action: string, details: string, clientId?: string) {
    const logId = `log_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const createdAt = new Date().toISOString();
    dbSqlite.prepare(`
      INSERT INTO activityLogs (id, userId, userName, action, details, createdAt, clientId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, userId, userName, action, details, createdAt, clientId || null);

    // Prune logs to top 200
    const countRes = dbSqlite.prepare("SELECT count(*) as count FROM activityLogs").get() as { count: number };
    if (countRes.count > 200) {
      dbSqlite.prepare(`
        DELETE FROM activityLogs WHERE id NOT IN (
          SELECT id FROM activityLogs ORDER BY createdAt DESC LIMIT 200
        )
      `).run();
    }
  }

  // Persistent user notification controls
  public getNotifications(userId?: string) {
    if (userId) {
      return dbSqlite.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC").all(userId) as any[];
    }
    return dbSqlite.prepare("SELECT * FROM notifications ORDER BY createdAt DESC").all() as any[];
  }

  public pushNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    emailDetails?: {
      task?: { title: string; dueDate: string; clientName: string; assignedByName: string };
      lead?: { name: string; company: string; status: string; assignedByName: string };
    }
  ) {
    const id = `notif_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const createdAt = new Date().toISOString();
    dbSqlite.prepare(`
      INSERT INTO notifications (id, userId, title, message, read, type, createdAt, emailSent, emailSentAt, emailError)
      VALUES (?, ?, ?, ?, 0, ?, ?, 0, NULL, NULL)
    `).run(id, userId, title, message, type, createdAt);

    // Trigger email notification in background safely
    this.triggerEmailNotificationAsync(userId, title, message, type, id, emailDetails).catch(err => {
      console.error("[Email Async Error]:", err);
    });
  }

  private async triggerEmailNotificationAsync(
    userId: string,
    title: string,
    message: string,
    type: string,
    notificationId: string,
    emailDetails?: {
      task?: { title: string; dueDate: string; clientName: string; assignedByName: string };
      lead?: { name: string; company: string; status: string; assignedByName: string };
    }
  ) {
    try {
      const dbUser = dbSqlite.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!dbUser) return;

      const emailPrefs = dbUser.emailNotifications !== undefined ? dbUser.emailNotifications : 1;
      if (emailPrefs === 0) {
        console.log(`[Email Skipped] Notifications disabled by preferences settings for user ${dbUser.email}`);
        return;
      }

      console.log(`[Async Email Send] Handshaking message for ${dbUser.email} (type: ${type})`);
      const emailModule = await import("./server/email");

      let emailResult;
      if (emailDetails?.task) {
        const { title: taskTitle, dueDate, clientName, assignedByName } = emailDetails.task;
        emailResult = await emailModule.sendTaskAssignmentEmail(
          dbUser.email,
          dbUser.name,
          taskTitle,
          dueDate,
          clientName,
          assignedByName
        );
      } else if (emailDetails?.lead) {
        const { name: leadName, company, status, assignedByName } = emailDetails.lead;
        emailResult = await emailModule.sendLeadAssignmentEmail(
          dbUser.email,
          dbUser.name,
          leadName,
          company,
          status,
          assignedByName
        );
      } else {
        emailResult = await emailModule.sendCRMNotificationEmail(
          dbUser.email,
          dbUser.name,
          title,
          message
        );
      }

      const emailSent = emailResult.success ? 1 : 0;
      const emailSentAt = emailResult.success ? new Date().toISOString() : null;
      const emailError = emailResult.success ? null : (emailResult.error || "Email delivery failed");

      dbSqlite.prepare(`
        UPDATE notifications 
        SET emailSent = ?, emailSentAt = ?, emailError = ?
        WHERE id = ?
      `).run(emailSent, emailSentAt, emailError, notificationId);
    } catch (err: any) {
      console.error("[Async Email Exception]:", err.message || err);
      try {
        dbSqlite.prepare(`
          UPDATE notifications 
          SET emailSent = 0, emailError = ?
          WHERE id = ?
        `).run(err.message || String(err), notificationId);
      } catch (e) {}
    }
  }

  public markNotificationRead(id: string) {
    dbSqlite.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  }

  public markAllNotificationsRead(userId: string) {
    dbSqlite.prepare("UPDATE notifications SET read = 1 WHERE userId = ?").run(userId);
  }

  // --- TEAM MANAGEMENT & INVITATION METHODS ---
  public getInvitations(directorId?: string, executiveEmail?: string) {
    if (directorId && executiveEmail) {
      return dbSqlite.prepare("SELECT * FROM invitations WHERE directorId = ? AND LOWER(executiveEmail) = ? ORDER BY createdAt DESC").all(directorId, executiveEmail.toLowerCase()) as any[];
    } else if (directorId) {
      return dbSqlite.prepare("SELECT * FROM invitations WHERE directorId = ? ORDER BY createdAt DESC").all(directorId) as any[];
    } else if (executiveEmail) {
      return dbSqlite.prepare("SELECT * FROM invitations WHERE LOWER(executiveEmail) = ? ORDER BY createdAt DESC").all(executiveEmail.toLowerCase()) as any[];
    }
    return dbSqlite.prepare("SELECT * FROM invitations ORDER BY createdAt DESC").all() as any[];
  }

  public getInvitationById(id: string) {
    return dbSqlite.prepare("SELECT * FROM invitations WHERE id = ?").get(id) as any;
  }

  public pushInvitation(inv: {
    id: string;
    directorId: string;
    directorName: string;
    executiveEmail: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    emailSent?: number;
    emailSentAt?: string | null;
    emailError?: string | null;
  }) {
    dbSqlite.prepare(`
      INSERT INTO invitations (id, directorId, directorName, executiveEmail, status, createdAt, updatedAt, emailSent, emailSentAt, emailError)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inv.id,
      inv.directorId,
      inv.directorName,
      inv.executiveEmail.toLowerCase().trim(),
      inv.status,
      inv.createdAt,
      inv.updatedAt,
      inv.emailSent !== undefined ? inv.emailSent : 0,
      inv.emailSentAt || null,
      inv.emailError || null
    );
  }

  public updateInvitationStatus(id: string, status: string) {
    const now = new Date().toISOString();
    dbSqlite.prepare("UPDATE invitations SET status = ?, updatedAt = ? WHERE id = ?").run(status, now, id);
  }

  public addTeamMember(directorId: string, executiveId: string) {
    // Check if relation already exists
    const existing = dbSqlite.prepare("SELECT id FROM director_executives WHERE directorId = ? AND executiveId = ?").get(directorId, executiveId);
    if (!existing) {
      const id = `de_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const createdAt = new Date().toISOString();
      dbSqlite.prepare(`
        INSERT INTO director_executives (id, directorId, executiveId, createdAt)
        VALUES (?, ?, ?, ?)
      `).run(id, directorId, executiveId, createdAt);
    }
  }

  public removeTeamMember(directorId: string, executiveId: string) {
    dbSqlite.prepare("DELETE FROM director_executives WHERE directorId = ? AND executiveId = ?").run(directorId, executiveId);
  }

  public getTeamMembers(directorId: string) {
    const rows = dbSqlite.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.createdAt
      FROM director_executives de
      JOIN users u ON de.executiveId = u.id
      WHERE de.directorId = ?
    `).all(directorId) as any[];
    return rows;
  }

  public getDirectorForExecutive(executiveId: string) {
    return dbSqlite.prepare(`
      SELECT u.id, u.email, u.name
      FROM director_executives de
      JOIN users u ON de.directorId = u.id
      WHERE de.executiveId = ?
    `).get(executiveId) as any;
  }
}

const db = new Database();

// Session mapping token -> userId
const sessions = new Map<string, string>();

async function start() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // CORS support (for iframe developers / preview environments)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Auth Middleware
  function requireAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized access path. Token missing." });
    }
    const token = authHeader.split(" ")[1];
    const userId = sessions.get(token);
    if (!userId) {
      return res.status(401).json({ error: "Session expired or invalid token." });
    }
    const user = db.getUsers().find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: "User profile no longer exists." });
    }
    req.user = user;
    next();
  }

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, role, inviteId } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required assets." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (inviteId) {
      const inv = db.getInvitationById(inviteId);
      if (!inv) {
        return res.status(400).json({ error: "The provided team invitation token is invalid or expired." });
      }
      if (inv.status !== "pending") {
        return res.status(400).json({ error: `This invitation has already been ${inv.status}.` });
      }
      if (inv.executiveEmail.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({ error: "The account registration email must match the invited email address." });
      }
    }

    const existing = db.getUsers().find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: "An account is already registered with this email." });
    }

    const newUser: DbUser = {
      id: `usr_${crypto.randomBytes(8).toString("hex")}`,
      email: normalizedEmail,
      name,
      passwordHash: hashPassword(password),
      role: role === "admin" ? "admin" : "executive",
      createdAt: new Date().toISOString()
    };

    db.pushUser(newUser);

    if (inviteId) {
      const inv = db.getInvitationById(inviteId);
      if (inv && inv.status === 'pending') {
        db.updateInvitationStatus(inv.id, "accepted");
        db.addTeamMember(inv.directorId, newUser.id);
        db.log(newUser.id, newUser.name, "update_lead", "executive joined team");
        db.pushNotification(
          inv.directorId,
          "Invitation Accepted",
          `Sales Executive ${newUser.name} has accepted your team invitation and is now in your sales core.`,
          "team"
        );
      }
    }

    // Automatic login upon selection
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, newUser.id);

    db.log(newUser.id, newUser.name, "create_lead", `User registered and joined LepusHub: ${newUser.name} (${newUser.email})`);
    db.pushNotification(newUser.id, "Welcome to LepusHub!", `Hi ${newUser.name}, your secure sales portal is ready.`, "update");

    // check for pending invitations matching this email
    const pendingInvites = db.getInvitations(undefined, normalizedEmail).filter((inv: any) => inv.status === 'pending');
    if (pendingInvites.length > 0) {
      pendingInvites.forEach((inv: any) => {
        db.pushNotification(newUser.id, "Team Invitation Pending", `Sales Director ${inv.directorName} has invited you to join their sales squad. Head to your layout profile page to accept and consolidate pipelines.`, "team");
      });
    }

    const { passwordHash, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser, token });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("[DB DIAGNOSTICS] Login failed: lacking email or password in request body");
      return res.status(400).json({ error: "Email and password are mandatory credentials." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[DB DIAGNOSTICS] Login attempt received for email:", normalizedEmail);
    
    // Direct raw SQL query to see if the row is actually present in SQLite database
    try {
      const directDbRow = dbSqlite.prepare("SELECT id, email, role, isActive, deletedAt FROM users WHERE LOWER(email) = ?").get(normalizedEmail) as any | undefined;
      console.log("[DB DIAGNOSTICS] Raw SQLite row for email:", directDbRow ? directDbRow : "NOT_FOUND_IN_DB_FILE");
    } catch (err: any) {
      console.error("[DB DIAGNOSTICS] Error querying raw SQLite row during login:", err.message);
    }

    // Get via db.getUsers() which filters for active accounts
    const user = db.getUsers().find(u => u.email.toLowerCase() === normalizedEmail);
    
    if (!user) {
      console.log("[DB DIAGNOSTICS] Login lookup outcome: USER_NOT_FOUND (user either deleted, inactive, or never registered in this session state)");
      return res.status(401).json({ error: "Invalid email or matching password structure." });
    }

    const isPasswordCorrect = verifyPassword(password, user.passwordHash);
    console.log("[DB DIAGNOSTICS] Password match verification result:", isPasswordCorrect ? "MATCHED" : "MISMATCH");

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "Invalid email or matching password structure." });
    }

    // Provision session
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    console.log("[DB DIAGNOSTICS] Login session successfully created with token for user ID:", user.id);

    const { passwordHash, ...safeUser } = user;
    res.status(200).json({ user: safeUser, token });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const { passwordHash, ...safeUser } = req.user;
    res.json({ user: safeUser });
  });

  app.post("/api/auth/reset-password", requireAuth, (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords must be provided." });
    }

    const user = db.getUsers().find(u => u.id === req.user.id);
    if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
      return res.status(400).json({ error: "Your current password verification failed." });
    }

    db.updateUser(user.id, { passwordHash: hashPassword(newPassword) });
    db.log(user.id, user.name, "create_lead", "User updated account password successfully.");
    res.json({ message: "Password updated successfully." });
  });

  app.put("/api/auth/preferences", requireAuth, (req: any, res) => {
    const { emailNotifications } = req.body;
    if (emailNotifications === undefined) {
      return res.status(400).json({ error: "emailNotifications preference is required." });
    }
    const val = emailNotifications ? 1 : 0;
    db.updateUser(req.user.id, { emailNotifications: val });
    db.log(req.user.id, req.user.name, "update_lead", `Updated email notification preference to: ${emailNotifications ? "ON" : "OFF"}`);
    res.json({ message: "Preferences updated successfully." });
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      sessions.delete(token);
    }
    res.json({ message: "Signed out successfully." });
  });

  app.delete("/api/users/me", requireAuth, (req: any, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userName = req.user.name;

    try {
      if (userRole === "executive") {
        const director = db.getDirectorForExecutive(userId);
        if (director) {
          // Reassign all leads currently assigned to the executive to the director
          const clients = db.getClients().filter(c => c.assignedTo === userId);
          clients.forEach(c => {
            db.updateClient(c.id, {
              assignedTo: director.id,
              assignedToName: director.name
            });
            db.log(userId, userName, "update_lead", `Lead "${c.name}" was automatically reassigned to Director "${director.name}" after executive account deactivation.`, c.id);
          });
          // Remove from team roster
          db.removeTeamMember(director.id, userId);
        }
      }

      // Soft delete user in DB
      db.updateUser(userId, { isActive: 0, deletedAt: new Date().toISOString() });
      
      db.log(userId, userName, "delete_lead", `User account permanently deactivated: ${userName} (${req.user.email})`);

      // Destroy session
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        sessions.delete(token);
      }

      res.json({ success: true, message: "Account successfully deleted." });
    } catch (err: any) {
      console.error("[Account Deactivation Error]", err);
      res.status(500).json({ error: "Deactivation failed: " + err.message });
    }
  });

  // Client / Lead Management Routes
  app.get("/api/clients", requireAuth, (req: any, res) => {
    const { search, status, executive, company, page = "1", limit = "50" } = req.query;
    let records = db.getClients();

    // CRM isolation rule: Non-admin users can view and edit their own clients.
    // However, to make the app incredibly cohesive and realistic, admins can see all clients,
    // and executives primarily view their assigned customers, but we allow filtered visibility.
    // Let's protect lead boundaries based on executive assigned scopes unless user is admin.
    if (req.user.role !== "admin") {
      records = records.filter(c => c.assignedTo === req.user.id);
    }

    // Applying search queries
    if (search) {
      const term = String(search).toLowerCase();
      records = records.filter(
        c => c.name.toLowerCase().includes(term) ||
             c.company.toLowerCase().includes(term) ||
             c.email.toLowerCase().includes(term) ||
             c.phone.includes(term) ||
             (c.notes && c.notes.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (status) {
      records = records.filter(c => c.status === status);
    }

    // Company filter
    if (company) {
      const cmpTerm = String(company).toLowerCase();
      records = records.filter(c => c.company.toLowerCase().includes(cmpTerm));
    }

    // Assignee filter (executive filter)
    if (executive) {
      records = records.filter(c => c.assignedTo === executive);
    }

    // Sort by latest created first
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 50;
    const total = records.length;
    const pages = Math.ceil(total / limitNum);
    const paginated = records.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      data: paginated,
      pagination: { total, pages, currentPage: pageNum, limit: limitNum }
    });
  });

  // Fetch static users list (for assigning/filtering clients)
  app.get("/api/users", requireAuth, (req, res) => {
    const mapped = db.getUsers().map(({ id, email, name, role }) => ({ id, email, name, role }));
    res.json(mapped);
  });

  app.get("/api/clients/:id", requireAuth, (req: any, res) => {
    const client = db.getClients().find(c => c.id === req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Customer or lead record not found." });
    }
    // Access validation rule
    if (req.user.role !== "admin" && client.assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Access denied to this lead assignment." });
    }
    res.json(client);
  });

  app.post("/api/clients", requireAuth, (req: any, res) => {
    const { name, company, email, phone, notes, status, assignedTo } = req.body;
    if (!name || !company) {
      return res.status(400).json({ error: "Full name and company name are required parameters." });
    }

    // Determine correct assignment
    let assigneeId = req.user.id;
    let assigneeName = req.user.name;

    if (req.user.role === "admin" && assignedTo) {
      const match = db.getUsers().find(u => u.id === assignedTo);
      if (match) {
        assigneeId = match.id;
        assigneeName = match.name;
      }
    }

    const newClient: Client = {
      id: `cli_${crypto.randomBytes(8).toString("hex")}`,
      name: name.trim(),
      company: company.trim(),
      email: (email || "").trim(),
      phone: (phone || "").trim(),
      notes: notes || "",
      status: (status as SalesStatus) || "New Lead",
      assignedTo: assigneeId,
      assignedToName: assigneeName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.pushClient(newClient);
    db.log(req.user.id, req.user.name, "create_lead", `Created new client/lead: ${newClient.name} (${newClient.company})`, newClient.id);
    db.pushNotification(newClient.assignedTo, "New Assigned Lead", `Lead "${newClient.name}" (${newClient.company}) has been assigned to your profile.`, "update", {
      lead: {
        name: newClient.name,
        company: newClient.company,
        status: newClient.status,
        assignedByName: req.user.name
      }
    });

    res.status(201).json(newClient);
  });

  app.put("/api/clients/:id", requireAuth, (req: any, res) => {
    const client = db.getClients().find(c => c.id === req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client not found." });
    }

    if (req.user.role !== "admin" && client.assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized modification request." });
    }

    const { name, company, email, phone, notes, status, assignedTo } = req.body;
    const updates: Partial<Client> = {};

    if (name) updates.name = name.trim();
    if (company) updates.company = company.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (notes !== undefined) updates.notes = notes;
    if (status) {
      updates.status = status as SalesStatus;
      if (status !== client.status) {
        db.log(req.user.id, req.user.name, "change_status", `Changed status of ${client.name} from ${client.status} to ${status}`, client.id);
        db.pushNotification(client.assignedTo, "Lead Status Moved", `Sales status of "${client.name}" moved to: ${status}`, "update");
      }
    }

    if (req.user.role === "admin" && assignedTo) {
      const match = db.getUsers().find(u => u.id === assignedTo);
      if (match && match.id !== client.assignedTo) {
        updates.assignedTo = match.id;
        updates.assignedToName = match.name;
        db.log(req.user.id, req.user.name, "update_lead", `Reassigned client ${client.name} to executive ${match.name}`, client.id);
        db.pushNotification(match.id, "New Transferred Lead", `Lead "${client.name}" has been reassigned to your portfolio.`, "update", {
          lead: {
            name: client.name,
            company: company ? company.trim() : client.company,
            status: status ? (status as SalesStatus) : client.status,
            assignedByName: req.user.name
          }
        });
      }
    }

    db.updateClient(client.id, updates);
    const updatedClient = { ...client, ...updates, updatedAt: new Date().toISOString() };

    db.log(req.user.id, req.user.name, "update_lead", `Updated client details for: ${updatedClient.name}`, client.id);
    res.json(updatedClient);
  });

  app.delete("/api/clients/:id", requireAuth, (req: any, res) => {
    const client = db.getClients().find(c => c.id === req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client detail not found." });
    }

    if (req.user.role !== "admin" && client.assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized deletion attempt." });
    }

    db.deleteClient(client.id);
    db.log(req.user.id, req.user.name, "delete_lead", `Deleted client and associated records: ${client.name}`);
    res.json({ success: true, message: `Removed client ${client.name} successfully.` });
  });

  // Task Systems
  app.get("/api/tasks", requireAuth, (req: any, res) => {
    let tasksList = db.getTasks();

    if (req.user.role !== "admin") {
      tasksList = tasksList.filter(t => t.assignedTo === req.user.id);
    }

    res.json(tasksList);
  });

  app.post("/api/tasks", requireAuth, (req: any, res) => {
    const { title, description, dueDate, clientId } = req.body;
    if (!title || !dueDate || !clientId) {
      return res.status(400).json({ error: "Title, target customer context, and due date are required variables." });
    }

    const client = db.getClients().find(c => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: "Specified target customer context does not exist." });
    }

    const newTask: Task = {
      id: `tsk_${crypto.randomBytes(8).toString("hex")}`,
      title: title.trim(),
      description: description || "",
      dueDate,
      completed: false,
      clientId,
      clientName: client.name,
      assignedTo: client.assignedTo, // assign to the owner of the lead
      createdAt: new Date().toISOString()
    };

    db.pushTask(newTask);
    db.log(req.user.id, req.user.name, "create_task", `Set new follow-up reminder for ${client.name}: "${newTask.title}"`, client.id);
    db.pushNotification(newTask.assignedTo, "Task Alert", `New follow-up task "${newTask.title}" scheduled for ${client.name}.`, "overdue", {
      task: {
        title: newTask.title,
        dueDate: newTask.dueDate,
        clientName: client.name,
        assignedByName: req.user.name
      }
    });
    res.status(201).json(newTask);
  });

  app.put("/api/tasks/:id", requireAuth, (req: any, res) => {
    const task = db.getTasks().find(t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Specified CRM task not found." });
    }

    if (req.user.role !== "admin" && task.assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Access denied to requested task context." });
    }

    const { completed, title, description, dueDate } = req.body;
    const updates: Partial<Task> = {};

    if (completed !== undefined) {
      updates.completed = !!completed;
      if (completed !== task.completed) {
        db.log(req.user.id, req.user.name, "complete_task", `${completed ? "Marked completed" : "Reopened"} task: "${task.title}" for ${task.clientName}`, task.clientId);
      }
    }
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (dueDate) updates.dueDate = dueDate;

    db.updateTask(task.id, updates);
    res.json({ ...task, ...updates });
  });

  app.delete("/api/tasks/:id", requireAuth, (req: any, res) => {
    const task = db.getTasks().find(t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: "CRM task item not found." });
    }

    if (req.user.role !== "admin" && task.assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Insufficient user rights." });
    }

    db.deleteTask(task.id);
    db.log(req.user.id, req.user.name, "complete_task", `Deleted follow-up reminder: "${task.title}"`);
    res.json({ success: true });
  });

  // File Systems with complete base64 serialization + folder safety
  app.get("/api/files", requireAuth, (req: any, res) => {
    let filesList = db.getFiles();

    // Access check
    if (req.user.role !== "admin") {
      // Filter list based on those uploaded by the executive or related to leads they own
      const myLeads = db.getClients().filter(c => c.assignedTo === req.user.id).map(c => c.id);
      filesList = filesList.filter(f => f.uploadedBy === req.user.id || myLeads.includes(f.clientId));
    }

    res.json(filesList);
  });

  app.post("/api/files", requireAuth, (req: any, res) => {
    const { name, size, type, fileData, clientId } = req.body;
    if (!name || !size || !type || !fileData || !clientId) {
      return res.status(400).json({ error: "Missing uploaded assets metadata or serialization buffer." });
    }

    // Check size limit: 10 MegaBytes
    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Uploaded attachments must not exceed 10MB in size threshold." });
    }

    // Supported formats check: PDF, Excel, Images, Word/Docs
    const ext = path.extname(name).toLowerCase();
    const allowedExts = [".pdf", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".gif", ".csv", ".doc", ".docx", ".txt"];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: `File type ${ext} is unsupported. Allowed formats: PDF, Excel, Doc, CSV, Text, and standard images.` });
    }

    const client = db.getClients().find(c => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: "Related client does not exist." });
    }

    const fileId = `fil_${crypto.randomBytes(8).toString("hex")}`;
    const fileRecord: ClientFile = {
      id: fileId,
      name,
      size,
      type,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      uploadedAt: new Date().toISOString(),
      clientId,
      clientName: client.name
    };

    // Save actual base64 file data safely on disk to keep RAM usage normal
    const savePath = path.join(UPLOAD_DIR, fileId);
    try {
      // Stripe out data prefix if present
      const base64Content = fileData.includes(";base64,") ? fileData.split(";base64,")[1] : fileData;
      fs.writeFileSync(savePath, base64Content, "base64");
    } catch (fsErr) {
      return res.status(500).json({ error: "FS system writing failure during uploads handling." });
    }

    db.pushFile(fileRecord);
    db.log(req.user.id, req.user.name, "upload_file", `Uploaded file attachment "${name}" (${Math.round(size / 1024)} KB) for ${client.name}`, clientId);
    db.pushNotification(client.assignedTo, "Document Uploaded", `File "${name}" has been uploaded to ${client.name}'s deal folder.`, "file");

    res.status(201).json(fileRecord);
  });

  app.get("/api/files/:id/download", requireAuth, (req: any, res) => {
    const fileRecord = db.getFiles().find(f => f.id === req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ error: "Attachment record metadata not located." });
    }

    // Scoping validation
    if (req.user.role !== "admin") {
      const parentClient = db.getClients().find(c => c.id === fileRecord.clientId);
      if (fileRecord.uploadedBy !== req.user.id && (!parentClient || parentClient.assignedTo !== req.user.id)) {
        return res.status(403).json({ error: "Unprivileged retrieval sequence blocked." });
      }
    }

    const diskPath = path.join(UPLOAD_DIR, fileRecord.id);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ error: "Attachment physical file not found." });
    }

    try {
      const fileBuffer = fs.readFileSync(diskPath);
      res.setHeader("Content-Type", fileRecord.type);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.name)}"`);
      res.send(fileBuffer);
    } catch (e) {
      res.status(500).json({ error: "Error during attachment processing sequence." });
    }
  });

  app.delete("/api/files/:id", requireAuth, (req: any, res) => {
    const fileRecord = db.getFiles().find(f => f.id === req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ error: "Attachment item not found." });
    }

    if (req.user.role !== "admin" && fileRecord.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized file deletion attempt." });
    }

    db.deleteFile(fileRecord.id);
    db.log(req.user.id, req.user.name, "delete_file", `Deleted file attachment: "${fileRecord.name}"`);
    res.json({ success: true });
  });

  // Global Dashboard Statistics
  app.get("/api/dashboard/stats", requireAuth, (req: any, res) => {
    let clientsList = db.getClients();
    let tasksList = db.getTasks();

    if (req.user.role !== "admin") {
      clientsList = clientsList.filter(c => c.assignedTo === req.user.id);
      tasksList = tasksList.filter(t => t.assignedTo === req.user.id);
    }

    const totalLeads = clientsList.length;
    const newLeads = clientsList.filter(c => c.status === "New Lead").length;
    const contacting = clientsList.filter(c => c.status === "Contacted").length;
    const negotiating = clientsList.filter(c => c.status === "Negotiation").length;
    const closedWon = clientsList.filter(c => c.status === "Closed").length;
    const closedLost = clientsList.filter(c => c.status === "Lost").length;

    const totalTaskCount = tasksList.length;
    const pendingTaskCount = tasksList.filter(t => !t.completed).length;

    const closedInteractionsTotal = closedWon + closedLost;
    const conversionRate = closedInteractionsTotal > 0 ? Math.round((closedWon / closedInteractionsTotal) * 100) : 0;

    res.json({
      totalLeads,
      newLeads,
      contacting,
      negotiating,
      closedWon,
      closedLost,
      totalTaskCount,
      pendingTaskCount,
      conversionRate
    });
  });

  // Logs Access route
  app.get("/api/activity", requireAuth, (req: any, res) => {
    let logs = db.getLogs();
    if (req.user.role !== "admin") {
      // filter activity pertaining to clients belonging to the users
      const myLeads = db.getClients().filter(c => c.assignedTo === req.user.id).map(c => c.id);
      logs = logs.filter(l => l.userId === req.user.id || (l.clientId && myLeads.includes(l.clientId)));
    }
    res.json(logs);
  });

  // Delete individual log
  app.delete("/api/activity/:id", requireAuth, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only Sales Directors are authorized to delete activity log entries." });
    }
    db.deleteLog(req.params.id);
    res.json({ success: true, message: "Activity log record successfully deleted." });
  });

  // Clear all logs
  app.delete("/api/activity", requireAuth, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only Sales Directors are authorized to clear activity logs." });
    }
    db.clearLogs();
    res.json({ success: true, message: "All activity logs successfully cleared." });
  });

  // Notifications Systems
  app.get("/api/notifications", requireAuth, (req: any, res) => {
    const list = db.getNotifications(req.user.id);
    res.json(list);
  });

  app.post("/api/notifications/:id/read", requireAuth, (req: any, res) => {
    db.markNotificationRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", requireAuth, (req: any, res) => {
    db.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  });

  // --- TEAM MANAGEMENT & INVITATIONS API ENDPOINTS ---

  // 1. Get Invitations
  app.get("/api/team/invitations", requireAuth, (req: any, res) => {
    if (req.user.role === "admin") {
      // Return invitations sent by this director
      const list = db.getInvitations(req.user.id);
      return res.json(list);
    } else {
      // Return invitations received by this executive
      const list = db.getInvitations(undefined, req.user.email);
      return res.json(list);
    }
  });

  // 2. Invite Executive
  app.post("/api/team/invitations", requireAuth, async (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only a Sales Director can invite executives." });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Executive email address is required to proceed." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if target is a director
    const queryTarget = db.getUsers().find(u => u.email.toLowerCase() === normalizedEmail);
    if (queryTarget && queryTarget.role === "admin") {
      return res.status(400).json({ error: "A Sales Director cannot be invited to join another team." });
    }

    // Check if target is already in their team
    if (queryTarget) {
      const activeMembers = db.getTeamMembers(req.user.id);
      if (activeMembers.some(m => m.id === queryTarget.id)) {
        return res.status(400).json({ error: "This executive is already an active member of your sales team." });
      }
    }

    // Check if an invitation is already pending
    const existingInvites = db.getInvitations(req.user.id, normalizedEmail);
    const hasPending = existingInvites.some(inv => inv.status === 'pending');
    if (hasPending) {
      return res.status(400).json({ error: "An invitation is already pending for this executive email." });
    }

    // Dynamic generation of secure join link
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}?mode=signup&inviteEmail=${encodeURIComponent(normalizedEmail)}&inviteRole=executive`;

    let emailSent = 0;
    let emailSentAt: string | null = null;
    let emailError: string | null = null;
    let emailResult;

    try {
      emailResult = await sendExecutiveInvitationEmail(normalizedEmail, req.user.name, inviteLink, "LepusHub Workspace");
      if (emailResult.success) {
        emailSent = 1;
        emailSentAt = new Date().toISOString();
      } else {
        emailError = emailResult.error || "Email delivery failed";
      }
    } catch (err: any) {
      emailError = err.message || String(err);
      emailResult = { success: false, error: emailError };
    }

    if (!emailResult.success) {
      return res.status(400).json({
        error: `Failed to send invitation email via SMTP: ${emailResult.error || "Check your credentials in server workspace settings."}`
      });
    }

    // Create the invitation
    const invitationId = `inv_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const newInvitation = {
      id: invitationId,
      directorId: req.user.id,
      directorName: req.user.name,
      executiveEmail: normalizedEmail,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailSent,
      emailSentAt,
      emailError
    };

    db.pushInvitation(newInvitation);

    // If executive user already has an account, notify them right away
    if (queryTarget && queryTarget.role === "executive") {
      db.pushNotification(
        queryTarget.id,
        "New Team Invitation",
        `Sales Director ${req.user.name} has invited you to join their team. Head to your profile page to accept.`,
        "team"
      );
    }

    db.log(req.user.id, req.user.name, "create_lead", `Sent team invitation to executive email: ${normalizedEmail}`);

    res.status(201).json(newInvitation);
  });

  // 3. Accept Invitation
  app.post("/api/team/invitations/:id/accept", requireAuth, (req: any, res) => {
    if (req.user.role !== "executive") {
      return res.status(403).json({ error: "Only sales executives can accept team invitations." });
    }

    const inv = db.getInvitationById(req.params.id);
    if (!inv) {
      return res.status(404).json({ error: "Team invitation item not found." });
    }

    if (inv.executiveEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "This invitation was addressed to a different user email." });
    }

    if (inv.status !== "pending") {
      return res.status(400).json({ error: `This invitation has already been ${inv.status}.` });
    }

    // Update status
    db.updateInvitationStatus(inv.id, "accepted");

    // Add relation to director_executives
    db.addTeamMember(inv.directorId, req.user.id);

    // Log & notify
    db.log(req.user.id, req.user.name, "update_lead", `Accepted team invitation and joined ${inv.directorName}'s team`);
    db.pushNotification(
      inv.directorId,
      "Invitation Accepted",
      `Sales Executive ${req.user.name} has accepted your team invitation and is now in your sales core.`,
      "team"
    );

    res.json({ success: true, message: "Accepted and joined the squad." });
  });

  // 4. Decline Invitation
  app.post("/api/team/invitations/:id/decline", requireAuth, (req: any, res) => {
    if (req.user.role !== "executive") {
      return res.status(403).json({ error: "Only sales executives can decline team invitations." });
    }

    const inv = db.getInvitationById(req.params.id);
    if (!inv) {
      return res.status(404).json({ error: "Team invitation item not found." });
    }

    if (inv.executiveEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "This invitation is not addressed to your email." });
    }

    if (inv.status !== "pending") {
      return res.status(400).json({ error: "This invitation is no longer pending." });
    }

    db.updateInvitationStatus(inv.id, "revoked");
    db.log(req.user.id, req.user.name, "update_lead", `Declined team invitation from ${inv.directorName}`);

    res.json({ success: true, message: "Declined invitation successfully." });
  });

  // 5. Revoke Invitation
  app.post("/api/team/invitations/:id/revoke", requireAuth, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only a Sales Director can revoke invitations." });
    }

    const inv = db.getInvitationById(req.params.id);
    if (!inv) {
      return res.status(404).json({ error: "Team invitation item not found." });
    }

    if (inv.directorId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized operation attempt." });
    }

    db.updateInvitationStatus(inv.id, "revoked");
    db.log(req.user.id, req.user.name, "delete_lead", `Revoked team invitation sent to: ${inv.executiveEmail}`);

    res.json({ success: true, message: "Revoked invitation successfully." });
  });

  // 6. Get Team Members
  app.get("/api/team/members", requireAuth, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only a Sales Director can load team members." });
    }

    const members = db.getTeamMembers(req.user.id);
    const clients = db.getClients();
    const tasks = db.getTasks();

    const enrichedMembers = members.map(m => {
      // Find all clients assigned to this member
      const myLeads = clients.filter(c => c.assignedTo === m.id);
      const assignedLeadsCount = myLeads.length;

      // Find all pending tasks of these clients
      const leadIds = myLeads.map(c => c.id);
      const pendingTasksCount = tasks.filter(t => !t.completed && (t.assignedTo === m.id || leadIds.includes(t.clientId))).length;

      // Pipeline metrics
      const negotiationCount = myLeads.filter(c => c.status === "Negotiation").length;
      const closedWonCount = myLeads.filter(c => c.status === "Closed").length;
      const closedLostCount = myLeads.filter(c => c.status === "Lost").length;

      const totalClosed = closedWonCount + closedLostCount;
      const conversionRate = totalClosed > 0 ? Math.round((closedWonCount / totalClosed) * 100) : 0;

      return {
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        createdAt: m.createdAt,
        assignedLeadsCount,
        pendingTasksCount,
        negotiationCount,
        closedWonCount,
        conversionRate
      };
    });

    res.json(enrichedMembers);
  });

  // 7. Remove Team Member
  app.post("/api/team/members/:id/remove", requireAuth, (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only a Sales Director can remove team members." });
    }

    const targetUser = db.getUsers().find(u => u.id === req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "Team executive profile not found." });
    }

    db.removeTeamMember(req.user.id, targetUser.id);

    // Create activity logs and notification
    db.log(req.user.id, req.user.name, "delete_lead", `Removed Sales Executive "${targetUser.name}" from active team roster`);
    db.pushNotification(
      targetUser.id,
      "Removed from Team",
      `Sales Director ${req.user.name} has removed you from their sales team context.`,
      "info"
    );

    res.json({ success: true, message: "Roster member removed successfully." });
  });

  // Setup Vite Dev Server / HMR support or static builder fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LepusHub] Backend online serving on port http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error("FATAL exception in server startup:", err);
});
