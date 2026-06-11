// קובץ ניהול התראות והודעות
// פעמון התראות למנהל + פעמון הודעות לכולם

async function initAlerts() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const isHe = getLang() === 'he';

  if (!token || !user) return;

  // פעמון הודעות לכל המשתמשים
  await initMessageBell(token, user, isHe);

  // פעמון התראות רק למנהל
  if (user.role !== 'manager') return;

  const bell = document.createElement('div');
  bell.id = 'alertBell';
  bell.style.cssText = `
    position: fixed;
    top: 20px;
    ${isHe ? 'left: 308px' : 'right: 68px'};
    z-index: 9998;
    cursor: pointer;
  `;
  bell.innerHTML = `
    <div style="position:relative; display:inline-block;">
      <button class="btn btn-light shadow-sm" style="border-radius:50%; width:42px; height:42px; padding:0;" onclick="toggleAlertPanel()">
        <i class="bi bi-bell-fill text-warning fs-5"></i>
      </button>
      <span id="alertCount" class="badge bg-danger" style="position:absolute; top:-5px; right:-5px; font-size:0.7rem; display:none;">0</span>
    </div>
    <div id="alertPanel" style="
      display:none;
      position:absolute;
      left:0;
      top:50px;
      width:340px;
      background:white;
      border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,0.15);
      border:1px solid #e5e7eb;
      overflow:hidden;
      z-index:9999;
    ">
      <div style="background:#1a3a6b; color:white; padding:12px 16px; font-weight:600;">
        <i class="bi bi-bell"></i>
        <span id="alertPanelTitle"></span>
      </div>
      <div id="alertList" style="max-height:400px; overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(bell);
  await loadAlerts();
}

// פעמון הודעות לכל סוגי המשתמשים
async function initMessageBell(token, user, isHe) {
  const msgBell = document.createElement('div');
  msgBell.id = 'messageBell';

  // מנהל - אחרי כפתור שפה + פעמון התראות
  // טכנאי/דייר - אחרי כפתור שפה בלבד
const pos = isHe
  ? (user.role === 'manager' ? 'left: 356px' : 'left: 308px')
  : (user.role === 'manager' ? 'right: 116px' : 'right: 68px');
msgBell.style.cssText = `
  position: fixed;
  top: 20px;
  ${pos};
    z-index: 9998;
    cursor: pointer;
  `;
  msgBell.innerHTML = `
    <div style="position:relative; display:inline-block;">
      <button class="btn btn-light shadow-sm" style="border-radius:50%; width:42px; height:42px; padding:0;" onclick="toggleMessagePanel()">
        <i class="bi bi-envelope-fill text-primary fs-5"></i>
      </button>
      <span id="messageCount" class="badge bg-danger" style="position:absolute; top:-5px; right:-5px; font-size:0.7rem; display:none;">0</span>
    </div>
    <div id="messagePanel" style="
      display:none;
      position:absolute;
      left:0;
      top:50px;
      width:380px;
      background:white;
      border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,0.15);
      border:1px solid #e5e7eb;
      overflow:hidden;
      z-index:9999;
    ">
      <div style="background:#1a3a6b; color:white; padding:12px 16px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
        <span><i class="bi bi-envelope"></i> <span id="messagePanelTitle"></span></span>
      </div>
      <div id="messageList" style="max-height:450px; overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(msgBell);
  await loadMessages();
}

// פתיחה/סגירה של פאנל התראות
function toggleAlertPanel() {
  const panel = document.getElementById('alertPanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// פתיחה/סגירה של פאנל הודעות
function toggleMessagePanel() {
  const panel = document.getElementById('messagePanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// טעינת הודעות מהשרת - מציג רק הודעות שלא נקראו
async function loadMessages() {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';

  try {
    const response = await fetch('http://localhost:3000/api/auth/my-messages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const messages = data.messages || [];
    const unreadCount = data.unreadCount || 0;

    // עדכון ספירת הודעות
    const countEl = document.getElementById('messageCount');
    if (countEl) {
      if (unreadCount > 0) {
        countEl.textContent = unreadCount;
        countEl.style.display = 'block';
      } else {
        countEl.style.display = 'none';
      }
    }

    // עדכון כותרת
    const titleEl = document.getElementById('messagePanelTitle');
    if (titleEl) {
      titleEl.textContent = isHe
        ? `הודעות (${unreadCount} חדשות)`
        : `Messages (${unreadCount} new)`;
    }

    // הצגת הודעות
    const list = document.getElementById('messageList');
    if (!list) return;

    if (messages.length === 0) {
      list.innerHTML = `
        <div style="padding:20px; text-align:center; color:#6b7280;">
          <i class="bi bi-envelope text-muted fs-3"></i>
          <p class="mt-2 mb-0">${isHe ? 'אין הודעות חדשות' : 'No new messages'}</p>
        </div>`;
      return;
    }

    list.innerHTML = messages.map(m => `
      <div id="msg_${m.id}" style="
        padding:12px 16px;
        border-bottom:1px solid #f0f0f0;
        background:${m.is_read ? 'white' : '#eff6ff'};
        transition: background 0.3s;
      ">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-size:0.85rem; font-weight:${m.is_read ? '500' : '700'}; color:#1f2937;">
              ${m.is_read ? '✅' : '🔵'} ${m.subject}
            </div>
            <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">
              <i class="bi bi-person"></i> ${m.from_name} &nbsp;|&nbsp;
              <i class="bi bi-calendar3"></i> ${new Date(m.created_at).toLocaleDateString('he-IL')}
              ${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>

        <!-- תוכן ההודעה -->
        <div id="msgBody_${m.id}" style="display:none; margin-bottom:8px; font-size:0.85rem; color:#374151; background:#f9fafb; padding:10px; border-radius:6px; line-height:1.5;">
          ${m.body}
        </div>

        <!-- כפתורי פעולה -->
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button onclick="toggleMessageBody(${m.id})" style="background:#1a3a6b; color:white; border:none; border-radius:6px; padding:4px 10px; font-size:0.75rem; cursor:pointer;">
            <i class="bi bi-eye"></i> ${isHe ? 'קרא' : 'Read'}
          </button>
          ${!m.is_read ? `
          <button onclick="markAsRead(${m.id})" style="background:#10b981; color:white; border:none; border-radius:6px; padding:4px 10px; font-size:0.75rem; cursor:pointer;">
            <i class="bi bi-check2-all"></i> ${isHe ? 'סמן כנקרא' : 'Mark Read'}
          </button>
          ` : `<span style="font-size:0.72rem; color:#10b981; padding:4px 0;"><i class="bi bi-check2-all"></i> ${isHe ? 'נקרא' : 'Read'}</span>`}
          <button onclick="openReplyBox(${m.id})" style="background:#c9a227; color:white; border:none; border-radius:6px; padding:4px 10px; font-size:0.75rem; cursor:pointer;">
            <i class="bi bi-reply"></i> ${isHe ? 'השב' : 'Reply'}
          </button>
        </div>

        <!-- תיבת תשובה -->
        <div id="replyBox_${m.id}" style="display:none; margin-top:8px;">
          <textarea id="replyText_${m.id}" class="form-control form-control-sm" rows="3"
            placeholder="${isHe ? 'כתוב תשובה...' : 'Write a reply...'}"></textarea>
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button onclick="sendReply(${m.id})" style="background:#1a3a6b; color:white; border:none; border-radius:6px; padding:4px 12px; font-size:0.75rem; cursor:pointer;">
              <i class="bi bi-send"></i> ${isHe ? 'שלח' : 'Send'}
            </button>
            <button onclick="closeReplyBox(${m.id})" style="background:#6b7280; color:white; border:none; border-radius:6px; padding:4px 12px; font-size:0.75rem; cursor:pointer;">
              ${isHe ? 'בטל' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

// הצגת/הסתרת תוכן ההודעה
function toggleMessageBody(messageId) {
  const bodyEl = document.getElementById(`msgBody_${messageId}`);
  if (bodyEl) {
    bodyEl.style.display = bodyEl.style.display === 'none' ? 'block' : 'none';
  }
}

// סימון הודעה כנקראה
async function markAsRead(messageId) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`http://localhost:3000/api/auth/messages/read/${messageId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const msgEl = document.getElementById(`msg_${messageId}`);
    if (msgEl) msgEl.style.background = 'white';
    loadMessages();
  } catch (err) {
    console.error('Error marking message as read:', err);
  }
}

// פתיחת תיבת תשובה
function openReplyBox(messageId) {
  document.querySelectorAll('[id^="replyBox_"]').forEach(el => el.style.display = 'none');
  const box = document.getElementById(`replyBox_${messageId}`);
  if (box) box.style.display = 'block';
}

// סגירת תיבת תשובה
function closeReplyBox(messageId) {
  const box = document.getElementById(`replyBox_${messageId}`);
  if (box) box.style.display = 'none';
}

// שליחת תשובה להודעה
async function sendReply(messageId) {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';
  const body = document.getElementById(`replyText_${messageId}`)?.value;

  if (!body || body.trim() === '') {
    alert(isHe ? 'אנא כתוב תשובה.' : 'Please write a reply.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ original_message_id: messageId, body: body.trim() })
    });
    const data = await response.json();
    if (response.ok) {
      alert(isHe ? '✅ התשובה נשלחה בהצלחה!' : '✅ Reply sent successfully!');
      closeReplyBox(messageId);
      loadMessages();
    } else {
      alert(isHe ? `שגיאה: ${data.message}` : `Error: ${data.message}`);
    }
  } catch (err) {
    alert(isHe ? 'שגיאת חיבור.' : 'Connection error.');
  }
}

// טעינת התראות מהשרת - למנהל בלבד
async function loadAlerts() {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';

  try {
    const response = await fetch('http://localhost:3000/api/alerts/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const alerts = data.alerts;

    const countEl = document.getElementById('alertCount');
    if (countEl) {
      if (alerts.length > 0) {
        countEl.textContent = alerts.length;
        countEl.style.display = 'block';
      } else {
        countEl.style.display = 'none';
      }
    }

    const titleEl = document.getElementById('alertPanelTitle');
    if (titleEl) {
      titleEl.textContent = isHe
        ? `התראות (${alerts.length})`
        : `Alerts (${alerts.length})`;
    }

    const list = document.getElementById('alertList');
    if (!list) return;

    if (alerts.length === 0) {
      list.innerHTML = `
        <div style="padding:20px; text-align:center; color:#6b7280;">
          <i class="bi bi-check-circle text-success fs-3"></i>
          <p class="mt-2 mb-0">${isHe ? 'אין התראות פעילות' : 'No active alerts'}</p>
        </div>`;
      return;
    }

    list.innerHTML = alerts.map(alert => renderAlert(alert, isHe)).join('');

  } catch (err) {
    console.error('Error loading alerts:', err);
  }
}

// רינדור התראה בודדת לפי סוגה
function renderAlert(alert, isHe) {
  const priorityColor = alert.priority === 'high' ? '#fee2e2' : '#fef3c7';
  const priorityBorder = alert.priority === 'high' ? '#ef4444' : '#f59e0b';
  const priorityIcon = alert.priority === 'high' ? '🔴' : '🟡';
  const link = alert.link || '#';

  let title = '';
  let subtitle = '';
  let badge = '';

  switch (alert.type) {
    case 'maintenance_today': {
      badge = isHe ? 'היום' : 'Today';
      title = isHe ? `תחזוקה נדרשת היום: ${alert.title}` : `Maintenance due today: ${alert.title}`;
      subtitle = isHe ? `תדירות: ${translateFrequency(alert.frequency, isHe)}` : `Frequency: ${translateFrequency(alert.frequency, isHe)}`;
      const verLabel = alert.verification_type === 'energy_electricity'
        ? (isHe ? 'בדוק מדידת חשמל' : 'Verify electricity')
        : alert.verification_type === 'energy_water'
        ? (isHe ? 'בדוק מדידת מים' : 'Verify water')
        : (isHe ? 'אשר ביצוע' : 'Confirm Done');
      return `
        <div style="padding:12px 16px; border-bottom:1px solid #f0f0f0; background:${priorityColor}; border-right:4px solid ${priorityBorder};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="flex:1;">
              <div style="font-size:0.85rem; font-weight:600; color:#1f2937;">${priorityIcon} ${title}</div>
              <div style="font-size:0.75rem; color:#6b7280; margin-top:3px;">${subtitle}</div>
            </div>
            <span style="background:${priorityBorder}; color:white; font-size:0.7rem; padding:2px 8px; border-radius:20px; margin-right:8px; white-space:nowrap;">${badge}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="confirmMaintenanceDone(${alert.id}, 'maintenance_today', '${alert.verification_type || 'manual'}')" style="background:#10b981; color:white; border:none; border-radius:6px; padding:5px 12px; font-size:0.8rem; cursor:pointer; font-weight:600;">
              ✓ ${verLabel}
            </button>
            <button onclick="window.location.href='${link}'" style="background:transparent; color:#1a3a6b; border:1px solid #1a3a6b; border-radius:6px; padding:5px 12px; font-size:0.8rem; cursor:pointer;">
              ${isHe ? 'עבור למשימה' : 'Go to Task'}
            </button>
          </div>
        </div>`;
    }
    case 'maintenance_week':
      badge = isHe ? 'השבוע' : 'This Week';
      title = isHe ? `תחזוקה קרובה: ${alert.title}` : `Upcoming maintenance: ${alert.title}`;
      subtitle = isHe ? `תאריך יעד: ${new Date(alert.date).toLocaleDateString()}` : `Due date: ${new Date(alert.date).toLocaleDateString()}`;
      break;
    case 'pending_users':
      badge = isHe ? 'דחוף' : 'Urgent';
      title = isHe ? `${alert.count} משתמשים ממתינים לאישור` : `${alert.count} users pending approval`;
      subtitle = isHe ? 'לחץ לאישור' : 'Click to approve';
      break;
    case 'unassigned_faults':
      badge = isHe ? 'דחוף' : 'Urgent';
      title = isHe ? `${alert.count} תקלות לא מוקצות לטכנאי` : `${alert.count} faults unassigned`;
      subtitle = isHe ? 'לחץ לשיוך טכנאים' : 'Click to assign technicians';
      break;
    case 'pending_invoices':
      badge = isHe ? 'דחוף' : 'Urgent';
      title = isHe ? `${alert.count} חשבוניות ממתינות לאישור` : `${alert.count} invoices pending approval`;
      subtitle = isHe ? 'לחץ לבדיקת החשבוניות' : 'Click to review invoices';
      break;
    case 'missing_energy': {
      badge = isHe ? 'חודשי' : 'Monthly';
      const energyName = alert.energyType === 'electricity' ? (isHe ? 'חשמל' : 'Electricity') : (isHe ? 'מים' : 'Water');
      title = isHe ? `חסרה מדידת ${energyName} לחודש ${alert.month}` : `Missing ${energyName} reading for ${alert.month}`;
      subtitle = isHe ? 'לחץ להזנת מדידה תחילה' : 'Click to add reading first';
      return `
        <div style="padding:12px 16px; border-bottom:1px solid #f0f0f0; background:${priorityColor}; border-right:4px solid ${priorityBorder};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="flex:1;">
              <div style="font-size:0.85rem; font-weight:600; color:#1f2937;">${priorityIcon} ${title}</div>
              <div style="font-size:0.75rem; color:#6b7280; margin-top:3px;">${subtitle}</div>
            </div>
            <span style="background:${priorityBorder}; color:white; font-size:0.7rem; padding:2px 8px; border-radius:20px; margin-right:8px; white-space:nowrap;">${badge}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="confirmMaintenanceDone(null, 'missing_energy', '${alert.energyType}')" style="background:#10b981; color:white; border:none; border-radius:6px; padding:5px 12px; font-size:0.8rem; cursor:pointer; font-weight:600;">
              ✓ ${isHe ? 'אשר הזנה' : 'Confirm Entry'}
            </button>
            <button onclick="window.location.href='${link}'" style="background:transparent; color:#1a3a6b; border:1px solid #1a3a6b; border-radius:6px; padding:5px 12px; font-size:0.8rem; cursor:pointer;">
              ${isHe ? 'עבור להזנה' : 'Go to Entry'}
            </button>
          </div>
        </div>`;
    }
    default:
      title = alert.title || '';
      subtitle = '';
      badge = '';
  }

  return `
    <div style="padding:12px 16px; border-bottom:1px solid #f0f0f0; background:${priorityColor}; border-right:4px solid ${priorityBorder}; cursor:pointer;" onclick="window.location.href='${link}'">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:0.85rem; font-weight:600; color:#1f2937;">${priorityIcon} ${title}</div>
          <div style="font-size:0.75rem; color:#6b7280; margin-top:3px;">${subtitle}</div>
        </div>
        <span style="background:${priorityBorder}; color:white; font-size:0.7rem; padding:2px 8px; border-radius:20px; margin-right:8px; white-space:nowrap;">${badge}</span>
      </div>
    </div>`;
}

// אישור ביצוע התראה
async function confirmMaintenanceDone(taskId, alertType, verificationType) {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';

  let confirmMsg = '';
  if (verificationType === 'energy_electricity') {
    confirmMsg = isHe ? '⚠️ האם הזנת מדידת חשמל לחודש הנוכחי?' : '⚠️ Did you enter an electricity reading this month?';
  } else if (verificationType === 'energy_water') {
    confirmMsg = isHe ? '⚠️ האם הזנת מדידת מים לחודש הנוכחי?' : '⚠️ Did you enter a water reading this month?';
  } else if (alertType === 'missing_energy') {
    const energyName = verificationType === 'electricity' ? (isHe ? 'חשמל' : 'electricity') : (isHe ? 'מים' : 'water');
    confirmMsg = isHe ? `⚠️ האם הזנת מדידת ${energyName} לחודש הנוכחי?` : `⚠️ Did you enter a ${energyName} reading this month?`;
  } else {
    confirmMsg = isHe ? '⚠️ האם אתה מאשר שהמשימה בוצעה בפועל היום?' : '⚠️ Do you confirm this task was completed today?';
  }

  if (!confirm(confirmMsg)) return;

  try {
    const response = await fetch('http://localhost:3000/api/alerts/confirm-maintenance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId, alert_type: alertType, verification_type: verificationType })
    });
    const data = await response.json();
    if (response.ok) {
      loadAlerts();
    } else {
      alert(isHe ? `❌ ${data.message}` : `❌ ${data.message}`);
      if (data.redirect) window.location.href = data.redirect;
    }
  } catch (err) {
    alert(isHe ? 'שגיאת חיבור.' : 'Connection error.');
  }
}

// תרגום תדירות
function translateFrequency(frequency, isHe) {
  const map = {
    daily: isHe ? 'יומי' : 'Daily',
    weekly: isHe ? 'שבועי' : 'Weekly',
    monthly: isHe ? 'חודשי' : 'Monthly',
    quarterly: isHe ? 'רבעוני' : 'Quarterly',
    yearly: isHe ? 'שנתי' : 'Yearly'
  };
  return map[frequency] || frequency;
}

// סגירת פאנלים בלחיצה מחוץ
document.addEventListener('click', (e) => {
  const bell = document.getElementById('alertBell');
  if (bell && !bell.contains(e.target)) {
    const panel = document.getElementById('alertPanel');
    if (panel) panel.style.display = 'none';
  }
  const msgBell = document.getElementById('messageBell');
  if (msgBell && !msgBell.contains(e.target)) {
    const panel = document.getElementById('messagePanel');
    if (panel) panel.style.display = 'none';
  }
});

// אתחול בטעינת הדף
document.addEventListener('DOMContentLoaded', initAlerts);

// רענון כל 30 שניות
setInterval(() => {
  if (document.getElementById('alertBell')) loadAlerts();
  if (document.getElementById('messageBell')) loadMessages();
}, 30000);

// פונקציה גלובלית לרענון מיידי
window.refreshAlerts = function() {
  if (document.getElementById('alertBell')) loadAlerts();
  if (document.getElementById('messageBell')) loadMessages();
};