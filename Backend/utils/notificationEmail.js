const nodemailer = require('nodemailer');
const User = require('../modules/userManagement/models/User');
const UserPreference = require('../modules/userManagement/models/UserPreference');

const EMAIL_SUBJECTS = {
  BUDGET_80: 'TravelGenie Alert: Budget at 80%',
  BUDGET_100: 'TravelGenie Alert: Budget Exceeded',
  PRICE_CHANGE: 'TravelGenie Alert: New Notification',
};

const isEmailEnabled = async (userId) => {
  const pref = await UserPreference.findByPk(userId, {
    attributes: ['notification_prefs'],
  });
  if (!pref || !pref.notification_prefs) return true;
  return pref.notification_prefs.emailNotifications !== false;
};

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
};

const sendNotificationEmailIfEnabled = async ({ userId, type, message }) => {
  try {
    if (!userId || !message) {
      console.log('[NotificationEmail] Skipped: missing userId or message');
      return false;
    }

    const enabled = await isEmailEnabled(userId);
    if (!enabled) {
      console.log(`[NotificationEmail] Skipped: email notifications disabled for user ${userId}`);
      return false;
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email'],
    });
    if (!user || !user.email) {
      console.log(`[NotificationEmail] Skipped: no email found for user ${userId}`);
      return false;
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.log('[NotificationEmail] Skipped: SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)');
      return false;
    }

    const subject = EMAIL_SUBJECTS[type] || 'TravelGenie Notification';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `\"TravelGenie\" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px">
          <h2 style="color:#0E7C5F;margin:0 0 10px">TravelGenie Notification</h2>
          <p style="margin:0 0 12px;color:#334155">Hello ${user.name || 'Traveller'},</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;color:#0f172a;line-height:1.5">
            ${message}
          </div>
          <p style="margin-top:14px;color:#64748b;font-size:12px">
            You are receiving this because email notifications are enabled in your TravelGenie profile.
          </p>
        </div>
      `,
    });

    console.log(`[NotificationEmail] Sent: ${type || 'GENERIC'} -> ${user.email}`);

    return true;
  } catch (error) {
    console.log(`[NotificationEmail] Delivery failed: ${error.message}`);
    return false;
  }
};

module.exports = { sendNotificationEmailIfEnabled };
