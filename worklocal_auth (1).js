/* ============================================================
   WORKLOCAL — AUTH HELPER
   ============================================================
   Handles sign up, login, logout, and session management.
   Imported by every page via <script src="worklocal_auth.js">

   USAGE IN ANY PAGE:
     WLAuth.signUp(email, password, name)
     WLAuth.signIn(email, password)
     WLAuth.signOut()
     WLAuth.getUser()          → current user or null
     WLAuth.requireAuth()      → redirects to login if not signed in
     WLAuth.isAdmin(user)      → true if admin email
============================================================ */

const WLAuth = (() => {

  /* ── Initialise Supabase client ── */
  let _supabase = null;

  function getClient() {
    if (!_supabase) {
      if (!window.WL?.supabaseUrl || !window.WL?.supabaseKey) {
        console.error('WorkLocal: missing Supabase config. Open worklocal_config.js and add your keys.');
        return null;
      }
      _supabase = supabase.createClient(window.WL.supabaseUrl, window.WL.supabaseKey);
    }
    return _supabase;
  }

  /* ── Sign up ── */
  async function signUp(email, password, name) {
    const client = getClient();
    if (!client) return { error: 'No Supabase config' };

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    return { data, error };
  }

  /* ── Sign in ── */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) return { error: 'No Supabase config' };

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  /* ── Sign out ── */
  async function signOut() {
    const client = getClient();
    if (!client) return;
    await client.auth.signOut();
    window.location.href = 'index.html';
  }

  /* ── Get current user ── */
  async function getUser() {
    const client = getClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
  }

  /* ── Get user profile from DB ── */
  async function getProfile(userId) {
    const client = getClient();
    if (!client) return null;
    const { data } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  /* ── Require auth — redirect if not logged in ── */
  async function requireAuth(redirectTo = 'index.html') {
    const user = await getUser();
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  }

  /* ── Admin check ── */
  /* Add your email(s) here to grant admin access */
  const ADMIN_EMAILS = [
    'you@youremail.com',      /* ← replace with your email */
    'wife@youremail.com',     /* ← replace with your wife's email */
  ];

  function isAdmin(user) {
    return user && ADMIN_EMAILS.includes(user.email);
  }

  /* ── Update nav based on auth state ── */
  /* Call this on every page to show correct nav buttons */
  async function updateNav() {
    const user = await getUser();
    const joinBtns = document.querySelectorAll('.nav-cta');

    joinBtns.forEach(btn => {
      if (user) {
        // User is logged in — show profile link
        btn.textContent = 'My profile';
        btn.onclick = () => window.location.href = 'worklocal_profile.html';
      } else {
        // User is NOT logged in — show auth modal
        btn.textContent = 'Join for free';
        btn.onclick = () => showAuthModal();
      }
    });

    // Also update logout buttons if present
    const logoutBtns = document.querySelectorAll('.nav-logout');
    logoutBtns.forEach(btn => {
      btn.style.display = user ? 'block' : 'none';
    });
  }

  /* ── Simple auth modal ── */
  /* Pops up when user clicks "Join for free" */
  function showAuthModal() {
    /* Remove existing modal if any */
    const existing = document.getElementById('wl-auth-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'wl-auth-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Sans', sans-serif;
    `;

    modal.innerHTML = `
      <div style="
        background: #fff; border-radius: 20px;
        padding: 28px 32px; width: 100%; max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        position: relative;
      ">
        <button onclick="document.getElementById('wl-auth-modal').remove()" style="
          position: absolute; top: 16px; right: 16px;
          background: none; border: none; font-size: 18px;
          cursor: pointer; color: #999; line-height: 1;
        ">✕</button>

        <div style="font-family:'Chicle',cursive;font-size:22px;margin-bottom:4px;">
          <span style="color:#3A6B28;">Work</span><span style="color:#93CF79;">Local</span>
        </div>

        <div id="wl-auth-tabs" style="display:flex;gap:0;border-bottom:1px solid #EBEBEB;margin:14px 0 20px;">
          <button id="tab-login" onclick="switchTab('login')" style="
            flex:1;padding:8px;font-size:13px;font-weight:500;
            border:none;background:none;cursor:pointer;
            border-bottom:2px solid #93CF79;color:#3A6B28;
            font-family:'DM Sans',sans-serif;
          ">Log in</button>
          <button id="tab-signup" onclick="switchTab('signup')" style="
            flex:1;padding:8px;font-size:13px;
            border:none;background:none;cursor:pointer;
            border-bottom:2px solid transparent;color:#999;
            font-family:'DM Sans',sans-serif;
          ">Sign up</button>
        </div>

        <div id="wl-auth-error" style="
          display:none;background:#FCEBEB;color:#791F1F;
          border-radius:8px;padding:8px 12px;font-size:12px;
          margin-bottom:12px;
        "></div>

        <div id="wl-auth-success" style="
          display:none;background:#E2F5D6;color:#3A6B28;
          border-radius:8px;padding:8px 12px;font-size:12px;
          margin-bottom:12px;
        "></div>

        <div id="panel-signup" style="display:none;">
          <input id="auth-name" type="text" placeholder="Your name"
            style="${inputStyle()}"/>
        </div>

        <input id="auth-email" type="email" placeholder="Email address"
          style="${inputStyle()}"/>
        <input id="auth-password" type="password" placeholder="Password"
          style="${inputStyle()}"/>

        <button id="auth-submit-btn" onclick="submitAuth()" style="
          width:100%;background:#93CF79;color:#fff;border:none;
          border-radius:10px;padding:12px;font-size:14px;font-weight:500;
          cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px;
        ">Log in</button>
      </div>
    `;

    document.body.appendChild(modal);

    /* Close on backdrop click */
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  function inputStyle() {
    return `
      width:100%;border:1.5px solid #E8E8E8;border-radius:10px;
      padding:10px 14px;font-size:13px;font-family:'DM Sans',sans-serif;
      color:#222;margin-bottom:10px;outline:none;display:block;
      box-sizing:border-box;
    `;
  }

  /* Tab switching inside modal */
  window.switchTab = function(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').style.borderBottomColor = isLogin ? '#93CF79' : 'transparent';
    document.getElementById('tab-login').style.color = isLogin ? '#3A6B28' : '#999';
    document.getElementById('tab-signup').style.borderBottomColor = isLogin ? 'transparent' : '#93CF79';
    document.getElementById('tab-signup').style.color = isLogin ? '#999' : '#3A6B28';
    document.getElementById('panel-signup').style.display = isLogin ? 'none' : 'block';
    document.getElementById('auth-submit-btn').textContent = isLogin ? 'Log in' : 'Create account';
    window._authTab = tab;
  };
  window._authTab = 'login';

  /* Submit auth */
  window.submitAuth = async function() {
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const name     = document.getElementById('auth-name')?.value?.trim();
    const errEl    = document.getElementById('wl-auth-error');
    const sucEl    = document.getElementById('wl-auth-success');
    const btn      = document.getElementById('auth-submit-btn');

    if (!email || !password) {
      errEl.textContent = 'Please fill in all fields.';
      errEl.style.display = 'block';
      return;
    }

    btn.textContent = 'Please wait...';
    btn.disabled = true;
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    let result;
    if (window._authTab === 'signup') {
      result = await signUp(email, password, name || 'Nomad');
      if (!result.error) {
        sucEl.textContent = 'Account created! Check your email to confirm, then log in.';
        sucEl.style.display = 'block';
        switchTab('login');
        btn.textContent = 'Log in';
        btn.disabled = false;
        return;
      }
    } else {
      result = await signIn(email, password);
      if (!result.error) {
        document.getElementById('wl-auth-modal').remove();
        await updateNav();
        window.location.href = 'worklocal_profile.html';
        return;
      }
    }

    if (result.error) {
      errEl.textContent = result.error.message || 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
    }

    btn.textContent = window._authTab === 'login' ? 'Log in' : 'Create account';
    btn.disabled = false;
  };

  /* ── Auto-run on every page load ── */
  document.addEventListener('DOMContentLoaded', () => {
    updateNav();
  });

  /* ── Public API ── */
  return { signUp, signIn, signOut, getUser, getProfile, requireAuth, isAdmin, showAuthModal, updateNav };

})();
