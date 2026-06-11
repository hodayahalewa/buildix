// קובץ להוספת כפתור בחירת שפה לכל הדפים

function createLangSwitcher() {
  const lang = getLang();
  const isHe = lang === 'he';

  const switcher = document.createElement('div');
  switcher.id = 'langSwitcher';
  switcher.style.cssText = `
    position: fixed;
    top: 20px;
    ${isHe ? 'left: 260px' : 'right: 20px'};
    z-index: 9997;
  `;

  switcher.innerHTML = `
    <div style="position:relative; display:inline-block;">
      <!-- כפתור עולם -->
      <button id="langToggleBtn" onclick="toggleLangMenu()" style="
        background: white;
        border: none;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        font-size: 1.2rem;
        transition: background 0.2s;
      ">
        🌐
      </button>

      <!-- תפריט שפה נפתח - תמיד נפתח שמאלה מהכפתור -->
      <div id="langMenu" style="
        display: none;
        position: absolute;
        right: 0;
        top: 50px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        overflow: hidden;
        min-width: 130px;
        z-index: 9999;
        border: 1px solid #e5e7eb;
      ">
        <button onclick="setLang('he')" style="
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: ${lang === 'he' ? '#eff6ff' : 'white'};
          color: ${lang === 'he' ? '#1a3a6b' : '#374151'};
          font-weight: ${lang === 'he' ? '700' : '400'};
          font-size: 0.9rem;
          cursor: pointer;
          text-align: right;
          border-bottom: 1px solid #f0f0f0;
        ">
          ${lang === 'he' ? '✓ ' : ''} 🇮🇱 עברית
        </button>
        <button onclick="setLang('en')" style="
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: ${lang === 'en' ? '#eff6ff' : 'white'};
          color: ${lang === 'en' ? '#1a3a6b' : '#374151'};
          font-weight: ${lang === 'en' ? '700' : '400'};
          font-size: 0.9rem;
          cursor: pointer;
          text-align: right;
        ">
          ${lang === 'en' ? '✓ ' : ''} 🇺🇸 English
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(switcher);

  // סגירת תפריט בלחיצה מחוץ
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('langMenu');
    const btn = document.getElementById('langToggleBtn');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
}

// פתיחה/סגירה של תפריט השפה
function toggleLangMenu() {
  const menu = document.getElementById('langMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

// הפעלת הכפתור בטעינת הדף
document.addEventListener('DOMContentLoaded', createLangSwitcher);