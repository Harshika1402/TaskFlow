/**
 * TaskFlow Authentication Scripts (Login & Register)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = Storage.getToken();
  const isAuthPage = window.location.pathname.endsWith('index.html') || 
                     window.location.pathname.endsWith('register.html') || 
                     window.location.pathname.endsWith('/');

  if (token && isAuthPage) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Setup Password Visibility Toggles
  setupPasswordToggles();

  // Setup Login Form Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    setupLoginForm(loginForm);
  }

  // Setup Register Form Handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    setupRegisterForm(registerForm);
  }

  // Setup Forgot Password Handler
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Password Reset Notice:\nFor this academic semester project, password recovery is handled directly via your academic administrator or profile settings.');
    });
  }
});

/**
 * Password Visibility Toggles (Eye Icon)
 */
function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.toggle-password-btn');
  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetInputId = btn.getAttribute('data-target');
      const input = document.getElementById(targetInputId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });
}

/**
 * Handle Login Submission
 */
function setupLoginForm(form) {
  const alertBox = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertBox);

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showAlert(alertBox, 'Please enter both your email address and password.', 'error');
      return;
    }

    try {
      setButtonLoading(submitBtn, true, 'Signing In...');
      const response = await authAPI.login({ email, password });

      Storage.setToken(response.token);
      Storage.setUser(response.user);

      showAlert(alertBox, 'Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      showAlert(alertBox, err.message || 'Invalid email or password.', 'error');
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  });
}

/**
 * Handle Registration Submission & Strength Meter
 */
function setupRegisterForm(form) {
  const alertBox = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('register-submit-btn');
  const passwordInput = document.getElementById('register-password');
  const strengthBar = document.getElementById('password-strength-bar');
  const strengthText = document.getElementById('password-strength-text');

  // Live password strength indicator
  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      const score = calculatePasswordStrength(val);

      if (val.length === 0) {
        strengthBar.style.width = '0%';
        strengthBar.style.backgroundColor = '#E5E7EB';
        strengthText.textContent = '';
      } else if (score < 2) {
        strengthBar.style.width = '33%';
        strengthBar.style.backgroundColor = '#DC2626';
        strengthText.textContent = 'Weak password (use min. 6 chars with letters & numbers)';
        strengthText.style.color = '#DC2626';
      } else if (score < 4) {
        strengthBar.style.width = '66%';
        strengthBar.style.backgroundColor = '#F59E0B';
        strengthText.textContent = 'Moderate strength';
        strengthText.style.color = '#F59E0B';
      } else {
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#16A34A';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#16A34A';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertBox);

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!name || !email || !password || !confirmPassword) {
      showAlert(alertBox, 'All fields are required.', 'error');
      return;
    }

    if (password.length < 6) {
      showAlert(alertBox, 'Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAlert(alertBox, 'Passwords do not match. Please re-enter.', 'error');
      return;
    }

    try {
      setButtonLoading(submitBtn, true, 'Creating Account...');
      const response = await authAPI.register({ name, email, password });

      showAlert(alertBox, 'Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html?registered=true';
      }, 1000);
    } catch (err) {
      showAlert(alertBox, err.message || 'Registration failed. Please try again.', 'error');
      setButtonLoading(submitBtn, false, 'Create Account');
    }
  });
}

function calculatePasswordStrength(pass) {
  let score = 0;
  if (!pass) return 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
}

function showAlert(el, msg, type) {
  if (!el) return;
  el.className = `auth-form-alert alert-${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  el.style.display = 'flex';
}

function hideAlert(el) {
  if (!el) return;
  el.style.display = 'none';
  el.textContent = '';
}

function setButtonLoading(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = text;
}
