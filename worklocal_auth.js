/* ============================================================
   WORKLOCAL — AUTH HELPER v2
   Clean rebuild — handles all auth across every page
============================================================ */

// ── Admin emails — add yours here ──
const ADMIN_EMAILS = [
  'alalston9814@gmail.com',
];

// ── Get Supabase client ──
function getClient() {
  if (!window.WL?.supabaseUrl || window.WL.supabaseUrl === 'YOUR_PROJECT_URL') {
    return null;
  }
  return supabase.createClient(window.WL.supabaseUrl, window.WL.supabaseKey);
}

// ── Get current logged-in user ──
async function getUser() {
  const client = getClient();
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user || null;
  } catch (e) {
    return null;
  }
}

// ── Get user profile from DB ──
async function getProfile(userId) {
  const client = getClient();
  if (!client || !userId) return null;
  try {
    const { data } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data || null;
  } catch (e) {
    return null;
  }
}

// ── Sign up ──
async function signUp(email, password, name) {
  const client = getClient();
  if (!client) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  return { data, error };
}

// ── Sign in ──
async function signIn(email, password) {
  const client = getClient();
  if (!client) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

// ── Sign out ──
async function signOut() {
  const client = getClient();
  if (client) await client.auth.signOut();
  window.location.href = 'index.html';
}

// ── Is admin ──
function isAdmin(user) {
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
}

// ── Show auth modal ──
function showAuthModal() {
  const existing = document.getElementById('wl-auth-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'wl-auth-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-family:'DM Sans',sans-serif;
  `;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:28px 32px;
      width:100%;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,0.2);
      position:relative;">

      <button onclick="document.getElementById('wl-auth-modal').remove()"
        style="position:absolute;top:14px;right:16px;background:none;
        border:none;font-size:20px;cursor:pointer;color:#BBB;line-height:1;">✕</button>

      <div style="font-family:'Chicle',cursive;font-size:22px;margin-bottom:16px;">
        <span style="color:#3A6B28;">Work</span><span style="color:#93CF79;">Local</span>
      </div>

      <div style="display:flex;border-bottom:1px solid #EBEBEB;margin-bottom:20px;">
        <button id="wl-tab-login" onclick="wlSwitchTab('login')"
          style="flex:1;padding:8px;font-size:13px;font-weight:500;
          border:none;border-bottom:2px solid #93CF79;
          background:none;cursor:pointer;color:#3A6B28;
          font-family:'DM Sans',sans-serif;">Log in</button>
        <button id="wl-tab-signup" onclick="wlSwitchTab('signup')"
          style="flex:1;padding:8px;font-size:13px;
          border:none;border-bottom:2px solid transparent;
          background:none;cursor:pointer;color:#999;
          font-family:'DM Sans',sans-serif;">Sign up</button>
      </div>

      <div id="wl-msg-error" style="display:none;background:#FCEBEB;
        color:#791F1F;border-radius:8px;padding:8px 12px;
        font-size:12px;margin-bottom:12px;"></div>
      <div id="wl-msg-success" style="display:none;background:#E2F5D6;
        color:#3A6B28;border-radius:8px;padding:8px 12px;
        font-size:12px;margin-bottom:12px;"></div>

      <div id="wl-signup-fields" style="display:none;">
        <input id="wl-name" type="text" placeholder="Your name"
          style="${wlInputStyle()}"/>
      </div>

      <input id="wl-email" type="email" placeholder="Email address"
        style="${wlInputStyle()}"/>
      <input id="wl-password" type="password" placeholder="Password (min 6 chars)"
        style="${wlInputStyle()}"/>

      <button id="wl-submit" onclick="wlSubmit()"
        style="width:100%;background:#93CF79;color:#fff;border:none;
        border-radius:10px;padding:12px;font-size:14px;font-weight:500;
        cursor:pointer;font-family:'DM Sans',sans-serif;">Log in</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  window._wlTab = 'login';
}

function wlInputStyle() {
  return `width:100%;border:1.5px solid #E8E8E8;border-radius:10px;
    padding:10px 14px;font-size:13px;font-family:'DM Sans',sans-serif;
    color:#222;margin-bottom:10px;outline:none;display:block;box-sizing:border-box;`;
}

window.wlSwitchTab = function(tab) {
  window._wlTab = tab;
  const isLogin = tab === 'login';
  document.getElementById('wl-tab-login').style.borderBottomColor  = isLogin ? '#93CF79' : 'transparent';
  document.getElementById('wl-tab-login').style.color              = isLogin ? '#3A6B28' : '#999';
  document.getElementById('wl-tab-signup').style.borderBottomColor = isLogin ? 'transparent' : '#93CF79';
  document.getElementById('wl-tab-signup').style.color             = isLogin ? '#999' : '#3A6B28';
  document.getElementById('wl-signup-fields').style.display        = isLogin ? 'none' : 'block';
  document.getElementById('wl-submit').textContent                 = isLogin ? 'Log in' : 'Create account';
};

window.wlSubmit = async function() {
  const email    = document.getElementById('wl-email')?.value?.trim();
  const password = document.getElementById('wl-password')?.value;
  const name     = document.getElementById('wl-name')?.value?.trim() || 'Nomad';
  const errEl    = document.getElementById('wl-msg-error');
  const sucEl    = document.getElementById('wl-msg-success');
  const btn      = document.getElementById('wl-submit');

  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Please wait...';
  btn.disabled = true;

  if (window._wlTab === 'signup') {
    const { error } = await signUp(email, password, name);
    if (error) {
      errEl.textContent = error.message;
      errEl.style.display = 'block';
    } else {
      sucEl.textContent = 'Account created! Check your email to confirm, then log in.';
      sucEl.style.display = 'block';
      wlSwitchTab('login');
    }
  } else {
    const { error } = await signIn(email, password);
    if (error) {
      errEl.textContent = error.message;
      errEl.style.display = 'block';
    } else {
      document.getElementById('wl-auth-modal')?.remove();
      window.location.href = 'worklocal_profile.html';
      return;
    }
  }

  btn.textContent = window._wlTab === 'login' ? 'Log in' : 'Create account';
  btn.disabled = false;
};

// ── Update nav button based on auth state ──
async function updateNav() {
  const user = await getUser();
  document.querySelectorAll('.nav-cta').forEach(btn => {
    if (user) {
      btn.textContent = 'My profile';
      btn.onclick = () => window.location.href = 'worklocal_profile.html';
    } else {
      btn.textContent = 'Join for free';
      btn.onclick = () => showAuthModal();
    }
  });
}

// ── Auto update nav on every page ──
window.addEventListener('load', updateNav);

// ── Expose globally ──
window.WLAuth = { getUser, getProfile, signUp, signIn, signOut, isAdmin, showAuthModal, updateNav, getClient };
