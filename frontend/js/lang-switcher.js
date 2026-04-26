// קובץ להוספת כפתור בחירת שפה לכל הדפים

// יצירת כפתור בחירת שפה
function createLangSwitcher() {
  const lang = getLang();

  const switcher = document.createElement('div');
  switcher.style.cssText = `
    position: fixed;
    top: 15px;
    ${lang === 'he' ? 'left' : 'right'}: 15px;
    z-index: 9999;
    display: flex;
    gap: 5px;
    background: white;
    border-radius: 20px;
    padding: 4px 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  `;

  switcher.innerHTML = `
    <button 
      onclick="setLang('en')" 
      style="
        border: none;
        background: ${lang === 'en' ? '#1a56db' : 'transparent'};
        color: ${lang === 'en' ? 'white' : '#666'};
        border-radius: 15px;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      ">
      EN
    </button>
    <button 
      onclick="setLang('he')" 
      style="
        border: none;
        background: ${lang === 'he' ? '#1a56db' : 'transparent'};
        color: ${lang === 'he' ? 'white' : '#666'};
        border-radius: 15px;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      ">
      עב
    </button>
  `;

  document.body.appendChild(switcher);
}

// הפעלת הכפתור בטעינת הדף
document.addEventListener('DOMContentLoaded', createLangSwitcher);