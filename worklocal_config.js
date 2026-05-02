/* ============================================================
   WORKLOCAL — SUPABASE CONFIG
   ============================================================

   HOW TO USE:
   1. Replace the two values below with your real Supabase
      Project URL and anon key from:
      Supabase dashboard → Settings → API

   2. Every HTML page already has this line in its <head>:
      <script src="worklocal_config.js"></script>

   3. That's it — all pages will automatically connect
      to your Supabase project.

   NEVER share your service_role key publicly.
   The anon key below is safe to use in frontend code.
============================================================ */

const WORKLOCAL_CONFIG = {

  /* ── PASTE YOUR VALUES HERE ── */
  supabaseUrl: 'https://mfuwnwywqbbpqncymqap.supabase.co/rest/v1/'   // e.g. https://abcdefgh.supabase.co
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXdud3l3cWJicHFuY3ltcWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTQxMTEsImV4cCI6MjA5MzE5MDExMX0.JeuMxCTLmr4L7s5aHS8R82rwKNKkvR5iCCmdPhYLFjA'      // starts with eyJ...

  /* ── APP SETTINGS ── */
  appName:      'WorkLocal',
  version:      '1.0.0',

};

/* Make config available globally */
window.WL = WORKLOCAL_CONFIG;
