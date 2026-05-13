// קובץ ניהול התראות - מוטמע בכל דפי המנהל
// מציג פעמון עם ספירת התראות ורשימה מפורטת בריחוף

// יצירת פעמון התראות ועדכון הספירה
async function initAlerts() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const isHe = getLang() === 'he';

  // רק למנהל
  if (!token || !user || user.role !== 'manager') return;

  // יצירת אלמנט הפעמון
  const bell = document.createElement('div');
  bell.id = 'alertBell';
  bell.style.cssText = `
    position: fixed;
    top: 15px;
    ${isHe ? 'left' : 'right'}: 130px;
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
    <!-- פאנל התראות -->
    <div id="alertPanel" style="
      display:none;
      position:absolute;
      ${isHe ? 'left' : 'right'}:0;
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

  // טעינת ההתראות
  await loadAlerts();
}

// פתיחה/סגירה של פאנל ההתראות
function toggleAlertPanel() {
  const panel = document.getElementById('alertPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// טעינת ההתראות מהשרת ועדכון הפאנל
async function loadAlerts() {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';

  try {
    const response = await fetch('http://localhost:3000/api/alerts/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const alerts = data.alerts;

    // עדכון ספירת ההתראות בפעמון
    const countEl = document.getElementById('alertCount');
    if (alerts.length > 0) {
      countEl.textContent = alerts.length;
      countEl.style.display = 'block';
    } else {
      countEl.style.display = 'none';
    }

    // עדכון כותרת הפאנל
    document.getElementById('alertPanelTitle').textContent = isHe
      ? `התראות (${alerts.length})`
      : `Alerts (${alerts.length})`;

    // הצגת ההתראות
    const list = document.getElementById('alertList');
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

    // התראת תחזוקה להיום - עם כפתור אישור שבודק לפי סוג הבדיקה
    case 'maintenance_today': {
      badge = isHe ? 'היום' : 'Today';
      title = isHe
        ? `תחזוקה נדרשת היום: ${alert.title}`
        : `Maintenance due today: ${alert.title}`;
      subtitle = isHe
        ? `תדירות: ${translateFrequency(alert.frequency, isHe)}`
        : `Frequency: ${translateFrequency(alert.frequency, isHe)}`;

      // תווית כפתור אישור לפי סוג הבדיקה
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

    // התראת תחזוקה השבוע - רק לינק למשימה
    case 'maintenance_week':
      badge = isHe ? 'השבוע' : 'This Week';
      title = isHe
        ? `תחזוקה קרובה: ${alert.title}`
        : `Upcoming maintenance: ${alert.title}`;
      subtitle = isHe
        ? `תאריך יעד: ${new Date(alert.date).toLocaleDateString()}`
        : `Due date: ${new Date(alert.date).toLocaleDateString()}`;
      break;

    // התראת משתמשים ממתינים לאישור
    case 'pending_users':
      badge = isHe ? 'דחוף' : 'Urgent';
      title = isHe
        ? `${alert.count} משתמשים ממתינים לאישור`
        : `${alert.count} users pending approval`;
      subtitle = isHe ? 'לחץ לאישור' : 'Click to approve';
      break;

    // התראת תקלות לא מוקצות לטכנאי
    case 'unassigned_faults':
      badge = isHe ? 'דחוף' : 'Urgent';
      title = isHe
        ? `${alert.count} תקלות לא מוקצות לטכנאי`
        : `${alert.count} faults unassigned`;
      subtitle = isHe ? 'לחץ לשיוך טכנאים' : 'Click to assign technicians';
      break;

    // התראת מדידת אנרגיה חסרה - עם כפתור אישור שבודק שהוזנה מדידה בפועל
    case 'missing_energy': {
      badge = isHe ? 'חודשי' : 'Monthly';
      const energyName = alert.energyType === 'electricity'
        ? (isHe ? 'חשמל' : 'Electricity')
        : (isHe ? 'מים' : 'Water');
      title = isHe
        ? `חסרה מדידת ${energyName} לחודש ${alert.month}`
        : `Missing ${energyName} reading for ${alert.month}`;
      subtitle = isHe
        ? 'לחץ להזנת מדידה תחילה'
        : 'Click to add reading first';

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

  // תבנית ברירת מחדל - לינק לדף
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

// אישור ביצוע התראה - בודק שהפעולה אכן בוצעה בפועל לפי סוג הבדיקה
async function confirmMaintenanceDone(taskId, alertType, verificationType) {
  const token = localStorage.getItem('token');
  const isHe = getLang() === 'he';

  // הודעת אישור שונה לפי סוג הבדיקה
  let confirmMsg = '';
  if (verificationType === 'energy_electricity') {
    confirmMsg = isHe
      ? '⚠️ האם הזנת מדידת חשמל לחודש הנוכחי?\nהמערכת תבדוק שאכן קיימת מדידה במסד הנתונים.'
      : '⚠️ Did you enter an electricity reading this month?\nThe system will verify the reading exists.';
  } else if (verificationType === 'energy_water') {
    confirmMsg = isHe
      ? '⚠️ האם הזנת מדידת מים לחודש הנוכחי?\nהמערכת תבדוק שאכן קיימת מדידה במסד הנתונים.'
      : '⚠️ Did you enter a water reading this month?\nThe system will verify the reading exists.';
  } else if (alertType === 'missing_energy') {
    const energyName = verificationType === 'electricity'
      ? (isHe ? 'חשמל' : 'electricity')
      : (isHe ? 'מים' : 'water');
    confirmMsg = isHe
      ? `⚠️ האם הזנת מדידת ${energyName} לחודש הנוכחי?\nהמערכת תבדוק שאכן קיימת מדידה.`
      : `⚠️ Did you enter a ${energyName} reading this month?\nThe system will verify.`;
  } else {
    // manual - אישור פשוט ללא בדיקה אוטומטית
    confirmMsg = isHe
      ? '⚠️ האם אתה מאשר שהמשימה בוצעה בפועל היום?'
      : '⚠️ Do you confirm this task was actually completed today?';
  }

  if (!confirm(confirmMsg)) return;

  try {
    const response = await fetch('http://localhost:3000/api/alerts/confirm-maintenance', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        task_id: taskId,
        alert_type: alertType,
        verification_type: verificationType
      })
    });

    const data = await response.json();
if (response.ok) {
  loadAlerts();
  // רענון טבלת תחזוקה אם נמצאים בדף תחזוקה
  if (typeof loadMaintenance === 'function') {
    loadMaintenance();
  }
}else {
      // שגיאה - הפעולה לא בוצעה בפועל
      alert(isHe ? `❌ ${data.message}` : `❌ ${data.message}`);
      if (data.redirect) {
        window.location.href = data.redirect;
      }
    }
  } catch (err) {
    alert(isHe ? 'שגיאת חיבור.' : 'Connection error.');
  }
}

// תרגום תדירות תחזוקה לשפה הנוכחית
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

// סגירת הפאנל בלחיצה מחוץ אליו
document.addEventListener('click', (e) => {
  const bell = document.getElementById('alertBell');
  if (bell && !bell.contains(e.target)) {
    const panel = document.getElementById('alertPanel');
    if (panel) panel.style.display = 'none';
  }
});

// אתחול הפעמון בטעינת הדף
document.addEventListener('DOMContentLoaded', initAlerts);

// רענון התראות כל 30 שניות אוטומטית
setInterval(() => {
  if (document.getElementById('alertBell')) {
    loadAlerts();
  }
}, 30000);

// פונקציה גלובלית לרענון מיידי של ההתראות
// קוראים לה מכל דף אחרי פעולה שמשנה את ההתראות
window.refreshAlerts = function() {
  if (document.getElementById('alertBell')) {
    loadAlerts();
  }
};