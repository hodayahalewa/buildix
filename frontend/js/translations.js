// קובץ תרגומים - עברית ואנגלית
const translations = {
  en: {
    // Navbar
    login: 'Login',
    register: 'Register',
    logout: 'Logout',

    // Dashboard
    dashboard: 'Dashboard',
    welcome: 'Welcome back',
    totalFaults: 'Total Faults',
    openFaults: 'Open Faults',
    inProgress: 'In Progress',
    closedFaults: 'Closed Faults',
    recentFaults: 'Recent Faults',
    viewAll: 'View All',

    // Sidebar
    faults: 'Faults',
    maintenance: 'Maintenance',
    energy: 'Energy',
    announcements: 'Announcements',
    reports: 'Reports',
    users: 'Users',
    reportFault: 'Report Fault',
    myFaults: 'My Faults',
    assignedFaults: 'Assigned Faults',

    // Faults
    title: 'Title',
    type: 'Type',
    reportedBy: 'Reported By',
    floor: 'Floor',
    urgency: 'Urgency',
    status: 'Status',
    assignedTo: 'Assigned To',
    date: 'Date',
    actions: 'Actions',
    noFaults: 'No faults found',
    reportNewFault: 'Report New Fault',

    // Status
    open: 'Open',
    in_progress: 'In Progress',
    waiting_part: 'Waiting Part',
    closed: 'Closed',

    // Urgency
    low: 'Low',
    medium: 'Medium',
    high: 'High',

    // Login
    emailAddress: 'Email Address',
    password: 'Password',
    loginBtn: 'Login',
    noAccount: "Don't have an account?",
    registerHere: 'Register here',
    welcomeBack: 'Welcome back to BUILDIX',

    // Register
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    role: 'Role',
    tenant: 'Tenant / Resident',
    technician: 'Technician',
    manager: 'Building Manager',
    unitNumber: 'Unit Number',
    ownerPhone: "Owner's Phone Number",
    createAccount: 'Create Account',
    alreadyAccount: 'Already have an account?',
    loginHere: 'Login here',

    // Announcements
    addAnnouncement: 'Add Announcement',
    noAnnouncements: 'No announcements yet',
    expiresOn: 'Expires On',
    post: 'Post Announcement',

    // Energy
    addReading: 'Add Reading',
    electricity: 'Electricity (kWh)',
    water: 'Water (m³)',
    month: 'Month',
    lastElectricity: 'Last Electricity Reading (kWh)',
    lastWater: 'Last Water Reading (m³)',

    // Maintenance
    addMaintenance: 'Add Maintenance',
    category: 'Category',
    frequency: 'Frequency',
    lastDone: 'Last Done',
    nextDue: 'Next Due',
    markDone: 'Done',

    // Users
    pendingApprovals: 'Pending Approvals',
    approve: 'Approve',
    reject: 'Reject',

    // Reports
    reportsTitle: 'Reports & Analytics',
    avgResponse: 'Avg Response (hrs)',
    faultsByStatus: 'Faults by Status',
    faultsByUrgency: 'Faults by Urgency',
    faultsByType: 'Faults by Type',
    energyConsumption: 'Energy Consumption',

    // General
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    reset: 'Reset',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },

  he: {
    // Navbar
    login: 'התחברות',
    register: 'הרשמה',
    logout: 'התנתקות',

    // Dashboard
    dashboard: 'לוח בקרה',
    welcome: 'ברוך הבא',
    totalFaults: 'סה"כ תקלות',
    openFaults: 'תקלות פתוחות',
    inProgress: 'בטיפול',
    closedFaults: 'תקלות סגורות',
    recentFaults: 'תקלות אחרונות',
    viewAll: 'צפה בהכל',

    // Sidebar
    faults: 'תקלות',
    maintenance: 'תחזוקה',
    energy: 'אנרגיה',
    announcements: 'מודעות',
    reports: 'דוחות',
    users: 'משתמשים',
    reportFault: 'דווח תקלה',
    myFaults: 'התקלות שלי',
    assignedFaults: 'תקלות מוקצות',

    // Faults
    title: 'כותרת',
    type: 'סוג',
    reportedBy: 'דווח על ידי',
    floor: 'קומה',
    urgency: 'דחיפות',
    status: 'סטטוס',
    assignedTo: 'מוקצה ל',
    date: 'תאריך',
    actions: 'פעולות',
    noFaults: 'לא נמצאו תקלות',
    reportNewFault: 'דווח תקלה חדשה',

    // Status
    open: 'פתוח',
    in_progress: 'בטיפול',
    waiting_part: 'ממתין לחלק',
    closed: 'סגור',

    // Urgency
    low: 'נמוך',
    medium: 'בינוני',
    high: 'גבוה',

    // Login
    emailAddress: 'כתובת מייל',
    password: 'סיסמה',
    loginBtn: 'התחברות',
    noAccount: 'אין לך חשבון?',
    registerHere: 'הירשם כאן',
    welcomeBack: 'ברוך הבא ל-BUILDIX',

    // Register
    fullName: 'שם מלא',
    phoneNumber: 'מספר טלפון',
    role: 'תפקיד',
    tenant: 'דייר / שוכר',
    technician: 'טכנאי',
    manager: 'מנהל בניין',
    unitNumber: 'מספר יחידה',
    ownerPhone: 'טלפון בעל הנכס',
    createAccount: 'צור חשבון',
    alreadyAccount: 'כבר יש לך חשבון?',
    loginHere: 'התחבר כאן',

    // Announcements
    addAnnouncement: 'הוסף מודעה',
    noAnnouncements: 'אין מודעות עדיין',
    expiresOn: 'תוקף עד',
    post: 'פרסם מודעה',

    // Energy
    addReading: 'הוסף מדידה',
    electricity: 'חשמל (קוט"ש)',
    water: 'מים (מ"ק)',
    month: 'חודש',
    lastElectricity: 'מדידת חשמל אחרונה (קוט"ש)',
    lastWater: 'מדידת מים אחרונה (מ"ק)',

    // Maintenance
    addMaintenance: 'הוסף תחזוקה',
    category: 'קטגוריה',
    frequency: 'תדירות',
    lastDone: 'בוצע לאחרונה',
    nextDue: 'מועד הבא',
    markDone: 'בוצע',

    // Users
    pendingApprovals: 'ממתינים לאישור',
    approve: 'אשר',
    reject: 'דחה',

    // Reports
    reportsTitle: 'דוחות וניתוח נתונים',
    avgResponse: 'זמן תגובה ממוצע (שעות)',
    faultsByStatus: 'תקלות לפי סטטוס',
    faultsByUrgency: 'תקלות לפי דחיפות',
    faultsByType: 'תקלות לפי סוג',
    energyConsumption: 'צריכת אנרגיה',

    // General
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    add: 'הוסף',
    search: 'חיפוש',
    reset: 'איפוס',
    loading: 'טוען...',
    error: 'שגיאה',
    success: 'הצלחה',
  }
};

// פונקציה לקבלת השפה הנוכחית
function getLang() {
  return localStorage.getItem('lang') || 'en';
}

// פונקציה לתרגום טקסט
function t(key) {
  const lang = getLang();
  return translations[lang][key] || key;
}

// פונקציה להחלפת שפה
function setLang(lang) {
  localStorage.setItem('lang', lang);

  // שינוי כיוון הדף
  if (lang === 'he') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  }

  // רענון הדף להחלת התרגום
  location.reload();
}

// החלת כיוון הדף בטעינה
document.addEventListener('DOMContentLoaded', () => {
  const lang = getLang();
  if (lang === 'he') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  }
});