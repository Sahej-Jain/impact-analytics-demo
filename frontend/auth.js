/* ============================================================
   BStackBank — shared session helpers.

   Mirrors the real app's storage contract: the token lives in
   localStorage under "jwtToken" and the decoded profile under
   "bstackbank_user".

   NOTE: this is a static demo site with no backend, so the
   credential check below runs in the browser. It is a test
   fixture, not authentication — never model a real login on it.
   ============================================================ */

(function (global) {
  'use strict';

  const TOKEN_KEY = 'jwtToken';
  const USER_KEY = 'bstackbank_user';

  /* The one account this demo accepts. */
  const DEMO_ACCOUNT = {
    email: 'hardikgoku7@gmail.com',
    password: 'sample@123',
    name: 'Hardik Singh',
    id: 'usr_1042'
  };

  /* Fixed passcode, since there is no mail server to send one. */
  const DEMO_OTP = '123456';

  /* localStorage throws in private mode / when site data is blocked. */
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* A JWT-shaped string so the stored value looks like the real thing.
     It is not signed and proves nothing — decoration only. */
  function makeToken(user) {
    const b64 = obj =>
      btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const header = b64({ alg: 'none', typ: 'JWT' });
    const payload = b64({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp: now + 60 * 60 * 8
    });
    return `${header}.${payload}.demo`;
  }

  function splitName(name) {
    const parts = String(name).trim().split(/\s+/);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
  }

  const Auth = {
    DEMO_ACCOUNT: { email: DEMO_ACCOUNT.email },
    DEMO_OTP: DEMO_OTP,

    /* Resolves with the profile, rejects with an Error whose message
       is meant to be shown in the login card's error banner. */
    login(email, password) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPassword = String(password || '');

      if (!cleanEmail || !cleanPassword) {
        return Promise.reject(new Error('Please fill in all required fields'));
      }
      if (cleanEmail !== DEMO_ACCOUNT.email || cleanPassword !== DEMO_ACCOUNT.password) {
        return Promise.reject(new Error('Invalid email or password'));
      }
      return Promise.resolve(Auth.persist());
    },

    verifyOtp(email, otp) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (String(otp) !== DEMO_OTP) {
        return Promise.reject(new Error('Invalid OTP'));
      }
      if (cleanEmail !== DEMO_ACCOUNT.email) {
        return Promise.reject(new Error('No account found for that email address'));
      }
      return Promise.resolve(Auth.persist());
    },

    /* Writes the token + profile and returns the profile. */
    persist() {
      const names = splitName(DEMO_ACCOUNT.name);
      const user = {
        id: DEMO_ACCOUNT.id,
        email: DEMO_ACCOUNT.email,
        name: DEMO_ACCOUNT.name,
        firstName: names.firstName,
        lastName: names.lastName,
        initials: (names.firstName[0] || '') + (names.lastName[0] || ''),
        plan: 'Premium Member'
      };
      safeSet(TOKEN_KEY, makeToken(user));
      safeSet(USER_KEY, JSON.stringify(user));
      return user;
    },

    isAuthenticated() {
      return Boolean(safeGet(TOKEN_KEY));
    },

    currentUser() {
      const raw = safeGet(USER_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    logout() {
      safeRemove(TOKEN_KEY);
      safeRemove(USER_KEY);
    }
  };

  global.Auth = Auth;
})(window);
