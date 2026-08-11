const nodemailer = require('nodemailer');

// הגדרת חיבור לGmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ===== פונקציות שליחת מיילים =====

// 1. אישור משתמש עם סיסמה זמנית
async function sendApprovalEmail(toEmail, fullName, tempPassword) {
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'ברוכים הבאים ל-BUILDIX — החשבון שלך אושר!',
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
          <p style="color:#c9a227;margin:5px 0;">מערכת ניהול בניינים</p>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>החשבון שלך במערכת BUILDIX אושר על ידי מנהל הבניין!</p>
          <p>הסיסמה הזמנית שלך לכניסה:</p>
          <div style="background:#1a3a6b;color:white;padding:15px;text-align:center;border-radius:8px;font-size:24px;letter-spacing:4px;margin:20px 0;">
            ${tempPassword}
          </div>
          <p style="color:#e53e3e;font-weight:bold;">חשוב: שנה את הסיסמה מיד לאחר הכניסה הראשונה!</p>
          <a href="http://localhost:3000/login.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            כניסה למערכת
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 2. דחיית משתמש
async function sendRejectionEmail(toEmail, fullName) {
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'עדכון בקשת הרשמה — BUILDIX',
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>לצערנו, בקשת ההרשמה שלך למערכת BUILDIX נדחתה על ידי מנהל הבניין.</p>
          <p>לפרטים נוספים, אנא פנה ישירות למנהל הבניין.</p>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 3. איפוס סיסמה
async function sendPasswordResetEmail(toEmail, fullName, resetToken) {
  const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'איפוס סיסמה — BUILDIX',
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה לאיפוס:</p>
          <a href="${resetLink}" style="background:#1a3a6b;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            איפוס סיסמה
          </a>
          <p style="color:#718096;font-size:12px;">הקישור תקף ל-24 שעות בלבד.</p>
          <p style="color:#718096;font-size:12px;">אם לא ביקשת איפוס סיסמה — התעלם מהודעה זו.</p>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 4. אישור קבלת תקלה חדשה
async function sendFaultCreatedEmail(toEmail, fullName, faultId, faultTitle) {
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `תקלה #${faultId} נפתחה בהצלחה — BUILDIX`,
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>התקלה שדיווחת נפתחה בהצלחה במערכת!</p>
          <div style="background:white;border-right:4px solid #c9a227;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;"><strong>מספר תקלה:</strong> #${faultId}</p>
            <p style="margin:5px 0 0;"><strong>כותרת:</strong> ${faultTitle}</p>
            <p style="margin:5px 0 0;"><strong>סטטוס:</strong> פתוחה</p>
          </div>
          <p>נעדכן אותך בכל שינוי בסטטוס הטיפול.</p>
          <a href="http://localhost:3000/my-faults.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            צפה בתקלה
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 5. עדכון סטטוס תקלה
async function sendFaultStatusEmail(toEmail, fullName, faultId, faultTitle, newStatus) {
  const statusMap = {
    'in_progress': 'בטיפול',
    'waiting_part': 'ממתין לחלק',
    'pending_approval': 'ממתין לאישור סגירה',
    'closed': 'סגורה'
  };
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `עדכון סטטוס תקלה #${faultId} — BUILDIX`,
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>הסטטוס של התקלה שלך עודכן!</p>
          <div style="background:white;border-right:4px solid #c9a227;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;"><strong>מספר תקלה:</strong> #${faultId}</p>
            <p style="margin:5px 0 0;"><strong>כותרת:</strong> ${faultTitle}</p>
            <p style="margin:5px 0 0;"><strong>סטטוס חדש:</strong> ${statusMap[newStatus] || newStatus}</p>
          </div>
          <a href="http://localhost:3000/my-faults.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            צפה בתקלה
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 6. שיוך תקלה לטכנאי
async function sendFaultAssignedEmail(toEmail, fullName, faultId, faultTitle) {
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `תקלה חדשה הוקצתה אליך #${faultId} — BUILDIX`,
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>תקלה חדשה הוקצתה אליך לטיפול!</p>
          <div style="background:white;border-right:4px solid #c9a227;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;"><strong>מספר תקלה:</strong> #${faultId}</p>
            <p style="margin:5px 0 0;"><strong>כותרת:</strong> ${faultTitle}</p>
          </div>
          <a href="http://localhost:3000/assigned-faults.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            צפה בתקלה
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 7. אישור/דחיית חשבונית
async function sendInvoiceReviewEmail(toEmail, fullName, faultId, status, managerNote) {
  const approved = status === 'approved';
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${approved ? 'החשבונית אושרה' : 'החשבונית נדחתה — נדרשת חשבונית חדשה'} — תקלה #${faultId} — BUILDIX`,
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>החשבונית שהגשת עבור תקלה #${faultId} ${approved ? 'אושרה ✅ והתקלה נסגרה סופית.' : 'נדחתה ❌'}</p>
          ${managerNote ? `<div style="background:white;border-right:4px solid #c9a227;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>הערת המנהל:</strong> ${managerNote}</p></div>` : ''}
          ${!approved ? `<div style="background:#fff3cd;border-right:4px solid #e53e3e;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#92400e;"><strong>נדרשת פעולה:</strong> יש לצרף חשבונית מתוקנת דרך עמוד "התקלות המוקצות לי" כדי שנוכל להמשיך בטיפול בתקלה.</p></div>` : ''}
          <a href="http://localhost:3000/assigned-faults.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            כניסה למערכת
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

// 8. הודעה חדשה בלוח מודעות
async function sendAnnouncementEmail(toEmail, fullName, title, content) {
  await transporter.sendMail({
    from: `"BUILDIX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `הודעה חדשה מהמנהל — BUILDIX`,
    html: `
      <div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">BUILDIX</h1>
        </div>
        <div style="padding:30px;background:#f8f9ff;">
          <h2 style="color:#1a3a6b;">שלום ${fullName},</h2>
          <p>התקבלה הודעה חדשה מהמנהל:</p>
          <div style="background:white;border-right:4px solid #c9a227;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a3a6b;margin:0 0 10px;">${title}</h3>
            <p style="margin:0;">${content}</p>
          </div>
          <a href="http://localhost:3000/announcements.html" style="background:#c9a227;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0;">
            צפה בהודעה
          </a>
        </div>
        <div style="background:#1a3a6b;padding:15px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);margin:0;font-size:12px;">© 2026 BUILDIX — Building Management Simplified</p>
        </div>
      </div>
    `
  });
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendPasswordResetEmail,
  sendFaultCreatedEmail,
  sendFaultStatusEmail,
  sendFaultAssignedEmail,
  sendInvoiceReviewEmail,
  sendAnnouncementEmail
};