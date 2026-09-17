/* ============================================================
   BStackBank — login page behaviour.
   Mirrors the real app: two sign-in methods, an error banner,
   a Percy/Self-Heal toggle that relabels the submit button,
   and a 6-digit passcode that verifies on completion.
   ============================================================ */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  const errorBanner = $('errorBanner');
  const errorText   = $('errorText');
  const percyBtn    = $('percyBtn');
  const percyState  = $('percyState');
  const tablist     = $('tablist');
  const panelEmail  = $('panelEmail');
  const panelPass   = $('panelPasscode');
  const loginForm   = $('loginForm');
  const emailInput  = $('email');
  const pwInput     = $('password');
  const pwToggle    = $('pwToggle');
  const signInBtn   = $('signInBtn');
  const signInLabel = $('signInLabel');
  const otpEmail    = $('otpEmail');
  const sendOtpBtn  = $('sendOtpBtn');
  const otpArea     = $('otpArea');
  const otpNote     = $('otpNote');
  const otpInputs   = $('otpInputs');
  const resendBtn   = $('resendOtpBtn');
  const createAcct  = $('createAccount');

  const otpBoxes = Array.from(otpInputs.querySelectorAll('input'));

  let percyEnabled = false;
  let busy = false;

  /* Simulated network latency, so the loading states are visible. */
  const LATENCY = 600;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- error banner ---------------- */

  function showError(message) {
    errorText.textContent = message;
    errorBanner.hidden = false;
  }

  function clearError() {
    errorText.textContent = '';
    errorBanner.hidden = true;
    emailInput.removeAttribute('aria-invalid');
    pwInput.removeAttribute('aria-invalid');
    otpInputs.classList.remove('invalid');
  }

  /* ---------------- button labels ---------------- */

  /* The submit button reads "Login" once the Percy toggle is on, and
     "Processing..." while a sign-in is in flight — same as the real app. */
  function renderSignInLabel() {
    if (busy) {
      signInLabel.textContent = 'Processing...';
    } else {
      signInLabel.textContent = percyEnabled ? 'Login' : 'Sign In';
    }
  }

  function setBusy(state) {
    busy = state;
    signInBtn.disabled = state;
    signInBtn.classList.toggle('loading', state);
    renderSignInLabel();
    syncSendOtpState();
  }

  /* ---------------- percy toggle ---------------- */

  percyBtn.addEventListener('click', () => {
    percyEnabled = !percyEnabled;
    percyState.textContent = percyEnabled ? 'Enabled' : 'Disabled';
    percyBtn.textContent = percyEnabled ? 'Disable' : 'Enable';
    percyBtn.classList.toggle('btn-secondary', !percyEnabled);
    percyBtn.classList.toggle('btn-dark-toggle', percyEnabled);
    renderSignInLabel();
  });

  /* ---------------- tabs ---------------- */

  tablist.addEventListener('click', e => {
    const tab = e.target.closest('button[data-tab]');
    if (!tab) return;

    clearError();

    tablist.querySelectorAll('button[data-tab]').forEach(b =>
      b.setAttribute('aria-selected', String(b === tab)));

    const isEmail = tab.dataset.tab === 'email';
    panelEmail.hidden = !isEmail;
    panelPass.hidden = isEmail;

    (isEmail ? emailInput : otpEmail).focus();
  });

  /* ---------------- password visibility ---------------- */

  pwToggle.addEventListener('click', () => {
    const revealed = pwInput.type === 'text';
    pwInput.type = revealed ? 'password' : 'text';
    pwToggle.setAttribute('aria-pressed', String(!revealed));
    pwToggle.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
    pwToggle.querySelector('svg').innerHTML = revealed
      ? '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M3 3l18 18"/>' +
        '<path d="M10.6 5.2A10 10 0 0112 5c6.4 0 10 7 10 7a18 18 0 01-2.5 3.4"/>' +
        '<path d="M6.2 6.7A18 18 0 002 12s3.6 7 10 7a10 10 0 003.7-.7"/>';
  });

  /* ---------------- email + password sign in ---------------- */

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    clearError();

    const email = emailInput.value.trim();
    const password = pwInput.value;

    /* Field-level checks first, matching the real app's copy. */
    if (!email || !password) {
      if (!email) emailInput.setAttribute('aria-invalid', 'true');
      if (!password) pwInput.setAttribute('aria-invalid', 'true');
      showError('Please fill in all required fields');
      (!email ? emailInput : pwInput).focus();
      return;
    }
    if (!emailInput.checkValidity()) {
      emailInput.setAttribute('aria-invalid', 'true');
      showError('Please enter a valid email address');
      emailInput.focus();
      return;
    }

    setBusy(true);
    try {
      await wait(LATENCY);
      await Auth.login(email, password);
      location.assign('index.html');
    } catch (err) {
      emailInput.setAttribute('aria-invalid', 'true');
      pwInput.setAttribute('aria-invalid', 'true');
      showError(err.message || 'Login failed');
      pwInput.select();
      setBusy(false);
    }
  });

  /* ---------------- passcode / otp ---------------- */

  function syncSendOtpState() {
    sendOtpBtn.disabled = busy || !otpEmail.value.trim();
  }

  otpEmail.addEventListener('input', () => {
    syncSendOtpState();
    if (!errorBanner.hidden) clearError();
  });

  async function sendOtp() {
    if (busy) return;
    clearError();

    if (!otpEmail.checkValidity() || !otpEmail.value.trim()) {
      otpEmail.setAttribute('aria-invalid', 'true');
      showError('Please enter a valid email address');
      return;
    }

    busy = true;
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Sending OTP...';

    try {
      await wait(LATENCY);
      otpArea.hidden = false;
      otpNote.innerHTML =
        'A 6-digit code was sent to <b>' + escapeHtml(otpEmail.value.trim()) + '</b>. ' +
        'This demo has no mail server, so use <b>' + Auth.DEMO_OTP + '</b>.';
      otpBoxes.forEach(b => (b.value = ''));
      otpBoxes[0].focus();
    } catch (err) {
      showError(err.message || 'Failed to send OTP');
    } finally {
      busy = false;
      sendOtpBtn.textContent = 'Send OTP';
      syncSendOtpState();
    }
  }

  sendOtpBtn.addEventListener('click', sendOtp);
  resendBtn.addEventListener('click', sendOtp);

  otpEmail.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (!sendOtpBtn.disabled) sendOtp(); }
  });

  /* digit boxes: auto-advance, backspace, paste, auto-verify on complete */

  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
      maybeVerify();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpBoxes[i - 1].focus();
        otpBoxes[i - 1].value = '';
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' && i > 0) { otpBoxes[i - 1].focus(); e.preventDefault(); }
      if (e.key === 'ArrowRight' && i < otpBoxes.length - 1) { otpBoxes[i + 1].focus(); e.preventDefault(); }
    });

    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!digits) return;
      digits.split('').forEach((d, k) => { if (otpBoxes[k]) otpBoxes[k].value = d; });
      otpBoxes[Math.min(digits.length, otpBoxes.length) - 1].focus();
      maybeVerify();
    });
  });

  async function maybeVerify() {
    const code = otpBoxes.map(b => b.value).join('');
    if (code.length !== 6) return;

    clearError();
    busy = true;
    try {
      await wait(LATENCY);
      await Auth.verifyOtp(otpEmail.value.trim(), code);
      location.assign('index.html');
    } catch (err) {
      otpInputs.classList.add('invalid');
      showError(err.message || 'Invalid OTP');
      otpBoxes.forEach(b => (b.value = ''));
      otpBoxes[0].focus();
      busy = false;
    }
  }

  /* ---------------- misc ---------------- */

  createAcct.addEventListener('click', e => {
    e.preventDefault();
    showError('Sign-up is not part of this demo. Use the demo credentials below.');
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- boot ---------------- */

  renderSignInLabel();
  syncSendOtpState();
  emailInput.focus();
})();
