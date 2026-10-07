import nodemailer from "nodemailer";
import crypto from "crypto";

let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT) || 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !user || !pass) {
      console.warn("[Email Service] Missing SMTP credentials. Defaulting to logger mock.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for port 465 SMTPS, false for 587 TLS
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

// Global generic email sender
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trans = getTransporter();
    if (!trans) {
      console.log(`[Email Mock Logger]\nTO: ${to}\nSUBJECT: ${subject}\nTEXT: ${text}\n---`);
      return { success: false, error: "SMTP credentials not configured" };
    }

    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const info = await trans.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br>"),
    });

    console.log(`[Email Sent] MsgId: ${info.messageId} to ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email Failed] To: ${to}, Error:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

// Master HTML template wrapper that matches cosmic indigo theme
function getEmailHtmlTemplate(title: string, bodyHtml: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f1f5f9; padding: 0; margin: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background-color: #0b1329; border: 1px solid #1e3a8a; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); }
        .logo { font-size: 24px; font-weight: bold; color: #ffffff; text-align: center; margin-bottom: 24px; }
        .logo-accent { color: #3b82f6; }
        .divider { border-top: 1px solid #1e3a8a; margin: 24px 0; }
        h1 { font-size: 20px; font-weight: bold; margin-top: 0; color: #ffffff; }
        p { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 12px; text-align: center; margin-top: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .btn:hover { background-color: #3b82f6; }
        .table-data { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table-data td { padding: 12px; border-bottom: 1px solid #172554; font-size: 14px; color: #cbd5e1; }
        .table-data td.label { font-weight: bold; color: #94a3b8; width: 30%; }
        .tag { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background-color: #172554; color: #9cacf6; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="logo">Lepus<span class="logo-accent">Hub</span></div>
          <h1>${title}</h1>
          <div class="divider"></div>
          ${bodyHtml}
          <div class="divider"></div>
          <p class="footer">This is an automated CRM report from LepusHub.<br>You can adjust your notification settings in your profile preferences at any time.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 1. Task Assigned Email
export async function sendTaskAssignmentEmail(
  toEmail: string,
  userName: string,
  taskTitle: string,
  dueDate: string,
  clientName: string,
  assignedByName: string
) {
  const subject = `[LepusHub] New Task Assigned: "${taskTitle}"`;
  const text = `Hi ${userName},\n\nA new task has been scheduled for you in LepusHub:\n- Task: ${taskTitle}\n- Due Date: ${dueDate}\n- Client/Lead: ${clientName}\n- Assigned By: ${assignedByName}\n\nPlease click inside the CRM to view further guidelines.`;
  
  const htmlBody = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>You have been assigned a new follow-up task on LepusHub. Keeping up with activities improves lead conversion success.</p>
    <table class="table-data">
      <tr>
        <td class="label">Task Status</td>
        <td><span class="tag">Pending Reminder</span></td>
      </tr>
      <tr>
        <td class="label">Activity Title</td>
        <td><strong>${taskTitle}</strong></td>
      </tr>
      <tr>
        <td class="label">Deal Lead</td>
        <td>${clientName}</td>
      </tr>
      <tr>
        <td class="label">Due Date</td>
        <td>${dueDate}</td>
      </tr>
      <tr>
        <td class="label">Scheduled By</td>
        <td>${assignedByName}</td>
      </tr>
    </table>
  `;
  const html = getEmailHtmlTemplate("New Task Assigned", htmlBody);
  return sendEmail(toEmail, subject, text, html);
}

// 2. Lead Assigned/Reassigned Email
export async function sendLeadAssignmentEmail(
  toEmail: string,
  userName: string,
  clientName: string,
  company: string,
  status: string,
  assignedByName: string
) {
  const subject = `[LepusHub] Lead Assigned: ${clientName} (${company})`;
  const text = `Hi ${userName},\n\nYou have been assigned a sales lead/client in LepusHub:\n- Lead Name: ${clientName}\n- Company: ${company}\n- Stage: ${status}\n- Owner Handler: ${assignedByName}\n\nPlease check your active sales pipeline.`;

  const htmlBody = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>A sales lead has been assigned to your active CRM profile. Timely response significantly increases the won-ratio.</p>
    <table class="table-data">
      <tr>
        <td class="label">Lead Name</td>
        <td><strong>${clientName}</strong></td>
      </tr>
      <tr>
        <td class="label">Company</td>
        <td>${company}</td>
      </tr>
      <tr>
        <td class="label">Pipeline Status</td>
        <td><span class="tag">${status}</span></td>
      </tr>
      <tr>
        <td class="label">Assigned By</td>
        <td>${assignedByName}</td>
      </tr>
    </table>
  `;
  const html = getEmailHtmlTemplate("New Lead Assignment", htmlBody);
  return sendEmail(toEmail, subject, text, html);
}

// 3. Generic CRM Notification Email (Overdue task, files uploaded, invitation accepted)
export async function sendCRMNotificationEmail(
  toEmail: string,
  userName: string,
  title: string,
  message: string
) {
  const subject = `[LepusHub] Notification Alert: ${title}`;
  const text = `Hi ${userName},\n\nYou have a new notification on LepusHub CRM:\n\n${message}`;

  const htmlBody = `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>We are forwarding an important alert from your sales dashboard stream:</p>
    <div style="background-color: #030712; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #ffffff; font-size: 15px;">${title}</h3>
      <p style="margin-bottom: 0; font-size: 13.5px; color: #94a3b8; line-height: 1.5;">${message}</p>
    </div>
  `;
  const html = getEmailHtmlTemplate("CRM Active Alert", htmlBody);
  return sendEmail(toEmail, subject, text, html);
}

// 4. Team Member Executive Invitation Email
export async function sendExecutiveInvitationEmail(
  toEmail: string,
  directorName: string,
  inviteLink: string,
  companyName: string = "Our Team"
) {
  const subject = `[LepusHub] Collaboration Invitation from Sales Director ${directorName}`;
  const text = `Hello,\n\nSales Director ${directorName} has invited you to join their active sales core on LepusHub CRM.\n\nTo accept this invitation and consolidate your pipeline folders, please complete your registration or log in via the link below:\n\nLink: ${inviteLink}\n\nWelcome on board!`;

  const htmlBody = `
    <p>Hello,</p>
    <p>You face a team invitation to collaborate inside <strong>LepusHub CRM</strong>.</p>
    <p><strong>Sales Director ${directorName}</strong> is inviting you to join their sales core roster. Connecting under a shared workspace allows unified lead routing, supervisor assignments, and automated reminders.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" class="btn" target="_blank">Accept & Join Team</a>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
      If you do not have an executive account, this link will guide you through the registration process. If you already have an active profile, log in with your existing credentials and accept the invitation in your team management section.
    </p>
  `;
  const html = getEmailHtmlTemplate("sales roster invitation", htmlBody);
  return sendEmail(toEmail, subject, text, html);
}
