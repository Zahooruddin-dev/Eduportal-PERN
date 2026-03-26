const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const DEFAULT_EXPIRY_MINUTES = process.env.RESET_CODE_EXPIRY_MINUTES || 15;

const sendResetEmail = async (toEmail, resetCode) => {
  const expiry = DEFAULT_EXPIRY_MINUTES;
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
  const resetUrlBase = process.env.RESET_PASSWORD_URL || '';
  const resetUrl = resetUrlBase ? `${resetUrlBase}?code=${encodeURIComponent(resetCode)}` : null;

  const mailOptions = {
    from: `"Mizuka Connect" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Mizuka Connect — Password Reset Instructions',
    text: `You requested a password reset for your Mizuka Connect account.\n\nUse this code to reset your password: ${resetCode}\nThis code will expire in ${expiry} minutes.\n\nDo NOT share this code with anyone. If you did not request a password reset, please ignore this email or contact support: ${supportEmail}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#333;">
        <div style="max-width:600px;margin:24px auto;padding:24px;border:1px solid #e6e9ee;border-radius:8px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:12px;">
            <h2 style="margin:0;color:#0b5cff">Mizuka Connect</h2>
            <p style="margin:6px 0 0;color:#6b7280">Password reset request</p>
          </div>

          <p>Hello,</p>
          <p style="color:#374151">We received a request to reset the password for your Mizuka Connect account associated with this email address.</p>

          <div style="margin:18px 0;text-align:center;">
            <div style="display:inline-block;padding:14px 20px;border-radius:8px;background:#f3f6ff;border:1px solid #e0e7ff;">
              <p style="margin:0;font-size:20px;letter-spacing:2px;color:#0b5cff;font-weight:600">${resetCode}</p>
            </div>
          </div>

          ${resetUrl ? `<p style="text-align:center"><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#0b5cff;color:#fff;border-radius:6px;text-decoration:none">Reset password now</a></p>` : ''}

          <p style="color:#374151">This code will expire in <strong>${expiry} minutes</strong>. For security, do not share this code with anyone — Mizuka will never ask you to disclose your password or reset code.</p>

          <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0" />
          <p style="font-size:13px;color:#6b7280;margin:0">If you did not request a password reset, you can safely ignore this email. If you believe an unauthorized person attempted to access your account, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>

          <p style="font-size:12px;color:#9ca3af;margin-top:16px">Thanks — The Mizuka Connect team</p>
        </div>
        <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px">This message was sent to ${toEmail}. If you no longer wish to receive these emails, update your preferences in your account settings.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending reset email:', error);
    throw new Error('Failed to send reset email');
  }
};

module.exports = { sendResetEmail };