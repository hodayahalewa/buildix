// קונטרולר לניהול התראות מערכת
const db = require('../config/DB');

// קבלת כל ההתראות הפעילות למנהל
const getAlerts = async (req, res) => {
  try {
    const alerts = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    // בדיקת משימות תחזוקה שצריך לבצע היום
const [todayMaintenance] = await db.query(
  `SELECT id, title, frequency, next_due, verification_type 
   FROM maintenance 
   WHERE next_due = ? AND status = 'pending'`,
  [todayStr]
);
todayMaintenance.forEach(task => {
  alerts.push({
    type: 'maintenance_today',
    priority: 'high',
    title: task.title,
    frequency: task.frequency,
    date: task.next_due,
    verification_type: task.verification_type || 'manual',
    link: 'maintenance.html',
    id: task.id
  });
});
    // בדיקת משימות תחזוקה שצריך לבצע השבוע
    const [weekMaintenance] = await db.query(
      `SELECT id, title, frequency, next_due 
       FROM maintenance 
       WHERE next_due > ? AND next_due <= ? AND status = 'pending'`,
      [todayStr, weekStr]
    );
    weekMaintenance.forEach(task => {
      alerts.push({
        type: 'maintenance_week',
        priority: 'medium',
        title: task.title,
        frequency: task.frequency,
        date: task.next_due,
        link: 'maintenance.html',
        id: task.id
      });
    });

    // בדיקת משתמשים ממתינים לאישור
    const [pendingUsers] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE is_approved = 0'
    );
    if (pendingUsers[0].count > 0) {
      alerts.push({
        type: 'pending_users',
        priority: 'high',
        count: pendingUsers[0].count,
        link: 'users.html'
      });
    }

    // בדיקת תקלות פתוחות שאינן מוקצות לטכנאי
    const [unassignedFaults] = await db.query(
      `SELECT COUNT(*) as count FROM faults 
       WHERE assigned_to IS NULL AND status = 'open'`
    );
    if (unassignedFaults[0].count > 0) {
      alerts.push({
        type: 'unassigned_faults',
        priority: 'high',
        count: unassignedFaults[0].count,
        link: 'faults.html'
      });
    }

    // בדיקת מדידות אנרגיה חסרות לחודש הנוכחי
    // בודק שאכן הוזנה מדידה בפועל לחודש הנוכחי
    const currentMonth = todayStr.substring(0, 7);
    const [energyReadings] = await db.query(
      'SELECT type FROM energy WHERE month = ?',
      [currentMonth]
    );
    const hasElectricity = energyReadings.some(r => r.type === 'electricity');
    const hasWater = energyReadings.some(r => r.type === 'water');

    if (!hasElectricity) {
      alerts.push({
        type: 'missing_energy',
        priority: 'medium',
        energyType: 'electricity',
        month: currentMonth,
        link: 'energy.html'
      });
    }
    if (!hasWater) {
      alerts.push({
        type: 'missing_energy',
        priority: 'medium',
        energyType: 'water',
        month: currentMonth,
        link: 'energy.html'
      });
    }

    res.status(200).json({ alerts, count: alerts.length });

  } catch (err) {
    console.error('Get alerts error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// אישור ביצוע מדידת אנרגיה מתוך ההתראה
// בודק שאכן הוזנה מדידה בפועל לחודש הנוכחי
const confirmMaintenanceDone = async (req, res) => {
  try {
    const { task_id, alert_type, energy_type } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);

    // אם מדובר בהתראת מדידת אנרגיה - בדוק שהוזנה מדידה בפועל
    if (alert_type === 'missing_energy') {
      const [readings] = await db.query(
        'SELECT id FROM energy WHERE type = ? AND month = ?',
        [energy_type, currentMonth]
      );

      if (readings.length === 0) {
        return res.status(400).json({
          message: `No ${energy_type} reading found for ${currentMonth}. Please add the reading first.`,
          redirect: 'energy.html'
        });
      }

      return res.status(200).json({
        message: `${energy_type} reading confirmed for ${currentMonth}!`
      });
    }

    // אם מדובר בהתראת תחזוקה - בדוק שהמשימה קיימת ועדיין ממתינה
    const [tasks] = await db.query(
      'SELECT * FROM maintenance WHERE id = ? AND status = ?',
      [task_id, 'pending']
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        message: 'Task not found or already completed.'
      });
    }

    const task = tasks[0];

    // בדיקה שתאריך היעד הוא היום או בעבר
    if (task.next_due > todayStr) {
      return res.status(400).json({
        message: `This task is scheduled for ${task.next_due}. Cannot confirm before due date.`,
        next_due: task.next_due
      });
    }

    // עדכון המשימה כבוצעה
    await db.query(
      `UPDATE maintenance SET status = 'done', last_done = ?, reminder_sent = 0 WHERE id = ?`,
      [todayStr, task_id]
    );

    res.status(200).json({
      message: 'Task confirmed as done!',
      confirmed_date: todayStr
    });

  } catch (err) {
    console.error('Confirm maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAlerts, confirmMaintenanceDone };