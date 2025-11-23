/**
 * Copyright by Calmic Sdn Bhd
 */

import { Resend } from "resend";

// Initialize Resend with API key from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

interface ContactMessageParams {
  mpName: string;
  mpEmail?: string | null;
  mpConstituency: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

/**
 * Send contact message to MP's office
 * If MP has no email, sends to admin email instead
 */
export async function sendContactEmail(params: ContactMessageParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured - message will only be logged");
    return { success: false, error: "Email service not configured" };
  }

  const { mpName, mpEmail, mpConstituency, senderName, senderEmail, subject, message } = params;

  // Determine recipient - use MP email if available, otherwise admin
  const recipientEmail = mpEmail || ADMIN_EMAIL;

  if (!recipientEmail) {
    console.warn(`[Email] No recipient email for ${mpName} and no admin email configured`);
    return { success: false, error: "No recipient email available" };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #1a365d; color: white; padding: 20px; }
    .content { padding: 20px; }
    .info-box { background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; margin: 15px 0; }
    .message-box { background-color: #fff; border: 1px solid #e2e8f0; padding: 20px; margin: 15px 0; }
    .footer { font-size: 12px; color: #718096; padding: 20px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h2>New Message from Constituent</h2>
  </div>
  <div class="content">
    <div class="info-box">
      <strong>MP:</strong> ${mpName}<br>
      <strong>Constituency:</strong> ${mpConstituency}
    </div>

    <div class="info-box">
      <strong>From:</strong> ${senderName}<br>
      <strong>Email:</strong> <a href="mailto:${senderEmail}">${senderEmail}</a><br>
      <strong>Subject:</strong> ${subject}
    </div>

    <div class="message-box">
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
    </div>
  </div>
  <div class="footer">
    <p>This message was sent via the MyParliament Dashboard contact form.</p>
    <p>To reply, please respond directly to <a href="mailto:${senderEmail}">${senderEmail}</a></p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      replyTo: senderEmail,
      subject: `[MyParliament] ${subject} - Message from ${senderName}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Email] Failed to send:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent contact message to ${recipientEmail} for ${mpName}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Email] Failed to send:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send confirmation email to the constituent
 */
export async function sendConfirmationEmail(params: ContactMessageParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }

  const { mpName, mpConstituency, senderName, senderEmail, subject, message } = params;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #1a365d; color: white; padding: 20px; }
    .content { padding: 20px; }
    .message-box { background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 15px 0; }
    .footer { font-size: 12px; color: #718096; padding: 20px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Message Sent Successfully</h2>
  </div>
  <div class="content">
    <p>Dear ${senderName},</p>
    <p>Your message has been sent to <strong>${mpName}</strong>, Member of Parliament for <strong>${mpConstituency}</strong>.</p>

    <div class="message-box">
      <strong>Subject:</strong> ${subject}<br><br>
      <strong>Your message:</strong><br>
      ${message.replace(/\n/g, "<br>")}
    </div>

    <p>Please note that response times may vary depending on the MP's office workload.</p>
  </div>
  <div class="footer">
    <p>This is an automated confirmation from the MyParliament Dashboard.</p>
    <p>Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: senderEmail,
      subject: `[MyParliament] Message Sent to ${mpName}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Email] Failed to send confirmation:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent confirmation to ${senderEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Email] Failed to send confirmation:", error.message);
    return { success: false, error: error.message };
  }
}
