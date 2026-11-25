const nodemailer = require('nodemailer');
const pool = require('../config/db');

let ready = null;

// picks the sending mode once, then reuses it
const getTransport = () => {
  if (ready) return ready;
  ready = (async () => {
    if (process.env.SMTP_HOST) {
      return {
        mode: 'smtp',
        t: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })
      };
    }
    if (process.env.MAIL_TEST === 'true') {
      try {
        const acct = await nodemailer.createTestAccount();
        return {
          mode: 'test',
          t: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: { user: acct.user, pass: acct.pass }
          })
        };
      } catch {
        console.log('[mail] could not reach the test inbox, printing emails here instead');
      }
    }
    return { mode: 'console' };
  })();
  return ready;
};

// never throws: a failed email must not break the request that triggered it
exports.sendMail = async (to, subject, text) => {
  try {
    const { mode, t } = await getTransport();
    const body = `${text}\n\nOpen the marketplace: ${process.env.APP_URL || 'http://localhost:5173'}\n`;

    if (mode === 'console') {
      console.log(`[mail] to=${to}\n       subject=${subject}\n       ${text}`);
      return;
    }
    const info = await t.sendMail({
      from: process.env.MAIL_FROM || 'Freelance Marketplace <no-reply@freelance.test>',
      to,
      subject: `Freelance Marketplace: ${subject}`,
      text: body
    });
    if (mode === 'test') console.log('[mail] preview:', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('[mail] failed:', err.message);
  }
};

exports.sendToUser = async (userId, subject, text) => {
  try {
    const [rows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [userId]);
    if (!rows.length) return;
    await exports.sendMail(rows[0].email, subject, `Hi ${rows[0].name},\n\n${text}`);
  } catch (err) {
    console.error('[mail] failed:', err.message);
  }
};