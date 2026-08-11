function checkMustChangePassword() {
  const flag = localStorage.getItem('must_change_password');
  const overlay = document.getElementById('changePasswordOverlay');
  if (flag === '1' && overlay) {
    overlay.style.display = 'flex';
  }
}

function togglePwdVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  input.type = input.type === 'password' ? 'text' : 'password';
  icon.className = input.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
}

function checkPasswordStrength(password) {
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  if (!strengthBar || !strengthText) return;

  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (password.length === 0) {
    strengthBar.style.width = '0%';
    strengthBar.style.background = '#e5e7eb';
    strengthText.textContent = '';
  } else if (strength <= 2) {
    strengthBar.style.width = '33%';
    strengthBar.style.background = '#ef4444';
    strengthText.textContent = 'סיסמה חלשה';
    strengthText.style.color = '#ef4444';
  } else if (strength <= 3) {
    strengthBar.style.width = '66%';
    strengthBar.style.background = '#f59e0b';
    strengthText.textContent = 'סיסמה בינונית';
    strengthText.style.color = '#f59e0b';
  } else {
    strengthBar.style.width = '100%';
    strengthBar.style.background = '#10b981';
    strengthText.textContent = 'סיסמה חזקה';
    strengthText.style.color = '#10b981';
  }
}

async function submitChangePassword() {
  const token = localStorage.getItem('token');
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorEl = document.getElementById('changePwdError');
  const successEl = document.getElementById('changePwdSuccess');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (!newPassword || !confirmPassword) {
    errorEl.textContent = 'אנא מלאי את כל השדות.';
    errorEl.style.display = 'block';
    return;
  }

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'הסיסמאות אינן תואמות.';
    errorEl.style.display = 'block';
    return;
  }

  if (newPassword.length < 6) {
    errorEl.textContent = 'הסיסמה חייבת להכיל לפחות 6 תווים.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword, confirmPassword })
    });

    const data = await response.json();

    if (response.ok) {
      successEl.textContent = '✅ הסיסמה עודכנה בהצלחה!';
      successEl.style.display = 'block';
      localStorage.removeItem('must_change_password');
      setTimeout(() => {
        document.getElementById('changePasswordOverlay').style.display = 'none';
      }, 1500);
    } else {
      errorEl.textContent = data.message;
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'שגיאת חיבור.';
    errorEl.style.display = 'block';
  }
}