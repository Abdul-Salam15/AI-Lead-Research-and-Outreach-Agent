(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // Scraped/agent-derived URLs are untrusted content — only render as a
  // clickable link when the scheme is actually http(s).
  function safeHref(url) {
    return /^https?:\/\//i.test(String(url || "")) ? esc(url) : null;
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function fmtMoney(n) {
    return n === null || n === undefined ? "—" : "$" + Number(n).toFixed(2);
  }

  function passwordStrength(pw) {
    let score = 0;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function statusLabel(status) {
    if (status === "qualified") return "Qualified";
    if (status === "needs_review") return "Needs review";
    if (status === "not_qualified") return "Not qualified";
    return status;
  }

  async function api(path, options) {
    const headers = { "Content-Type": "application/json" };
    if (state.session && state.session.access_token) {
      headers.Authorization = "Bearer " + state.session.access_token;
    }
    const res = await fetch(path, Object.assign({ headers }, options));
    let body = null;
    try { body = await res.json(); } catch { /* no body */ }
    if (res.status === 401) {
      state.session = null;
      renderAccountBar();
      navigate("#/login");
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  function copyToClipboard(text, btn) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    if (!btn) return;
    const label = btn.querySelector(".btn--icon-label");
    const prevLabel = label ? label.textContent : null;
    btn.classList.add("is-copied");
    if (label) label.textContent = "Copied";
    setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label && prevLabel !== null) label.textContent = prevLabel;
    }, 1600);
  }

  // ---------------------------------------------------------------------
  // Outreach item shape helpers — mirror src/lib/regenerateOutreach.ts's
  // getOutreachContent/setOutreachContent, since there are no keys
  // literally named email_1/email_2/email_3/linkedin in the stored data.
  // ---------------------------------------------------------------------

  const OUTREACH_ITEMS = ["email_1", "email_2", "email_3", "linkedin"];
  const EMAIL_INDEX = { email_1: 0, email_2: 1, email_3: 2 };

  function hasSubject(item) { return item !== "linkedin"; }

  function getItemContent(lead, item) {
    if (item === "linkedin") return lead.outreach && lead.outreach.linkedin_message;
    return lead.outreach && lead.outreach.emails && lead.outreach.emails[EMAIL_INDEX[item]];
  }

  function getItemMeta(lead, item) {
    return (lead.outreach && lead.outreach.meta && lead.outreach.meta[item]) || null;
  }

  function provenanceLine(lead, item) {
    const meta = getItemMeta(lead, item);
    if (!meta) return "Agent-drafted";
    if (meta.provenance === "manual") return "Manually edited";
    if (meta.provenance === "regenerated") return meta.note ? `Regenerated — note: “${esc(meta.note)}”` : "Regenerated";
    return "Agent-drafted";
  }

  function leadHasOutreach(lead) {
    return !!(lead.outreach && (lead.outreach.emails || lead.outreach.linkedin_message));
  }

  // ---------------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------------

  // The Supabase client (auth only — all data access still goes through
  // this app's own /api/* routes, never straight to Supabase from the
  // browser). Created once /api/config resolves — see initAuth().
  let sb = null;

  const state = {
    session: null,
    runCache: {},
    leadsCache: {},
    toolCallsCache: {},
    runsCache: null,
    outreachUi: {}, // `${leadId}:${item}` -> { mode, draft, guidance, proposed, errorMessage }
    regenState: {}, // leadId -> { remaining, resetAt }
    dashboardTab: {}, // runId -> 'leads' | 'audit'
    leadFilter: "top",
    leadSort: "conf-desc",
    auditToolFilter: "all",
    auditStatusFilter: "all",
    pollTimer: null,
  };

  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  function outreachKey(leadId, item) { return `${leadId}:${item}`; }

  function getUi(leadId, item) {
    const key = outreachKey(leadId, item);
    if (!state.outreachUi[key]) {
      state.outreachUi[key] = { mode: "view", draft: null, guidance: "", proposed: null, errorMessage: "" };
    }
    return state.outreachUi[key];
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------

  function parseHash() {
    const raw = (location.hash || "#/intake").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    const view = parts[0] || "intake";
    if (view === "run") return { view, params: { runId: parts[1] } };
    if (view === "dashboard") return { view, params: { runId: parts[1], tab: parts[2] } };
    if (view === "lead") return { view, params: { runId: parts[1], leadId: parts[2] } };
    return { view, params: {} };
  }

  function navigate(hash) { location.hash = hash; }

  const PUBLIC_VIEWS = new Set(["login", "signup", "forgot-password", "reset-password"]);

  function updateHeaderNotice(isAuthView) {
    const el = document.getElementById("header-notice");
    if (!el) return;
    if (isAuthView) {
      el.className = "";
      el.style.border = "none";
      el.style.background = "transparent";
      el.style.padding = "0";
      el.innerHTML = `<span class="app-header__notice-text">Internal tool for the Koya Talent outbound team</span>`;
    } else {
      el.className = "app-header__notice";
      el.style.border = ""; el.style.background = ""; el.style.padding = "";
      el.innerHTML = `
        <span class="app-header__notice-dot"></span>
      `;
    }
  }

  function render() {
    stopPolling();
    const { view, params } = parseHash();
    const app = document.getElementById("app");
    updateHeaderNotice(PUBLIC_VIEWS.has(view));

    // Auth gate — every real view requires a session; the auth views
    // themselves redirect away once one exists (except reset-password,
    // which needs the just-established recovery session to stay put).
    if (!state.session && !PUBLIC_VIEWS.has(view)) return navigate("#/login");
    if (state.session && PUBLIC_VIEWS.has(view) && view !== "reset-password") return navigate("#/intake");

    if (view === "login") return renderLogin(app);
    if (view === "signup") return renderSignup(app);
    if (view === "forgot-password") return renderForgotPassword(app);
    if (view === "reset-password") return renderResetPassword(app);
    if (view === "run") return renderRun(app, params.runId);
    if (view === "dashboard") return renderDashboard(app, params.runId, params.tab);
    if (view === "lead") return renderDetail(app, params.runId, params.leadId);
    if (view === "history") return renderHistory(app);
    return renderIntake(app);
  }

  window.addEventListener("hashchange", render);

  // ---------------------------------------------------------------------
  // Auth (Supabase Auth) — signup/login/forgot-password are handled
  // entirely client-side against Supabase directly; this app's own backend
  // only ever verifies the resulting JWT (see src/middleware/requireAuth.ts).
  // ---------------------------------------------------------------------

  function renderAccountBar() {
    const nav = document.getElementById("app-nav");
    const account = document.getElementById("header-account");
    if (!nav || !account) return;
    if (state.session && state.session.user) {
      nav.style.display = "";
      account.innerHTML = `
        <span class="muted mono" style="font-size:12.5px;">${esc(state.session.user.email)}</span>
        <button type="button" class="btn" data-action="logout" style="margin-left:10px;padding:4px 10px;font-size:12.5px;">Log out</button>
      `;
    } else {
      nav.style.display = "none";
      account.innerHTML = "";
    }
  }

  // Set when initAuth() fails (e.g. the backend is running code from
  // before /api/config existed — a stale, un-restarted server, not a
  // frontend bug). Every auth action checks this via requireSb() instead
  // of throwing an opaque, invisible error when `sb` turns out to be null.
  let authInitError = null;
  // Populated from /api/config — currently just the run-defaults the
  // intake form prefills (see renderIntake). Never holds secrets: the
  // Supabase URL/anon key are read directly out of `config` below instead
  // of being stored here, since they're only needed once, at client init.
  let appConfig = {};

  async function initAuth() {
    try {
      const config = await fetch("/api/config").then((r) => r.json());
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Server is missing Supabase config (check /api/config and .env)");
      }
      appConfig = config;
      // Implicit flow, not PKCE: PKCE ties the reset link to a secret
      // stored only in the browser that called resetPasswordForEmail, so
      // requesting a reset on a PC and opening the emailed link on a phone
      // (a completely normal thing for a real person to do) fails with
      // "Auth Session missing" every time, regardless of how fast you
      // click it — it's not a timing issue, the secret simply never
      // existed on the second device. Implicit flow's tokens are
      // self-contained in the link itself, so any device can complete it.
      sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { flowType: "implicit" },
      });

      // Registered BEFORE getSession() so it can observe supabase-js's own
      // initial hash-token detection (it awaits the same internal init
      // that getSession() below waits on). PASSWORD_RECOVERY fires
      // regardless of the exact token shape in the URL, so this is what
      // actually routes to the reset-password screen — and navigate()
      // here also overwrites location.hash, clearing the raw token out of
      // the visible URL in the same step.
      sb.auth.onAuthStateChange((event, session) => {
        state.session = session;
        renderAccountBar();
        if (event === "PASSWORD_RECOVERY") navigate("#/reset-password");
      });

      const { data } = await sb.auth.getSession();
      state.session = data.session;
      renderAccountBar();
    } catch (err) {
      console.error("initAuth failed — sign-in/sign-up will not work until this is fixed:", err);
      authInitError = "Couldn't reach the sign-in service. Try refreshing the page — if that doesn't help, the server may need a restart.";
    }
  }

  // Every do-* auth action calls this first: `sb` can legitimately still be
  // null (initAuth() hasn't resolved yet, or failed outright) — this turns
  // that into a visible message instead of a silent, uncaught TypeError.
  function requireSb(errorEl) {
    if (!sb) {
      errorEl.textContent = authInitError || "Still connecting — wait a moment and try again.";
      return false;
    }
    return true;
  }

  const EYE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`;

  function passwordField(opts) {
    const { id, label, autocomplete, forgotLink, strengthMeter, hint } = opts;
    return `
      <div class="field">
        <div style="display:flex;align-items:baseline;justify-content:space-between;">
          <label class="field__label" for="${id}" style="margin-bottom:4px;">${label}</label>
          ${forgotLink ? `<a href="#/forgot-password" style="font-size:12.5px;">Forgot password?</a>` : ""}
        </div>
        <div style="position:relative;">
          <input class="input" type="password" id="${id}" autocomplete="${autocomplete}" style="padding-right:40px;" ${strengthMeter ? 'data-action="password-strength"' : ""}>
          <button type="button" class="btn--icon" data-action="toggle-password" data-target="${id}" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);" aria-label="Show password">${EYE_ICON}</button>
        </div>
        ${strengthMeter ? `
          <div style="display:flex;gap:4px;margin-top:8px;">
            <div class="pw-strength-seg" style="height:3px;flex:1;border-radius:2px;background:#DAD5C6;"></div>
            <div class="pw-strength-seg" style="height:3px;flex:1;border-radius:2px;background:#DAD5C6;"></div>
            <div class="pw-strength-seg" style="height:3px;flex:1;border-radius:2px;background:#DAD5C6;"></div>
          </div>
        ` : ""}
        ${hint ? `<div class="muted" style="font-size:12.5px;margin-top:6px;">${hint}</div>` : ""}
      </div>
    `;
  }

  function authView(opts) {
    const { title, lede, cardBody, footerHtml, backLink } = opts;
    return `
      <div class="view" style="max-width:560px;margin:0 auto;padding-top:88px;">
        ${backLink ? `<div style="margin-bottom:22px;"><a href="${backLink.href}">&larr; ${esc(backLink.label)}</a></div>` : ""}
        <h1 class="h1" style="font-size:38px;margin-bottom:10px;">${title}</h1>
        ${lede ? `<p class="lede">${lede}</p>` : ""}
        <div class="card">${cardBody}</div>
        ${footerHtml ? `<div class="muted" style="margin-top:20px;font-size:14px;">${footerHtml}</div><div class="hairline"></div>` : ""}
      </div>
    `;
  }

  function renderLogin(app) {
    app.innerHTML = authView({
      title: "Sign in to Casefile",
      lede: "Pick up your open runs and case files where you left them.",
      cardBody: `
        <div class="field"><label class="field__label" for="auth-email">Email</label><input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>
        ${passwordField({ id: "auth-password", label: "Password", autocomplete: "current-password", forgotLink: true })}
        <div id="auth-error" class="muted" style="color:#6F3B36;font-size:13.5px;margin:8px 0;"></div>
        <button type="button" class="btn btn--primary" style="width:100%;justify-content:center;" data-action="do-login">Sign in</button>
      `,
      footerHtml: `New to the team? <a href="#/signup">Create an account</a>`,
    });
  }

  function renderSignup(app) {
    app.innerHTML = authView({
      title: "Create your account",
      lede: "Your reviews and approvals are recorded under your name.",
      cardBody: `
        <div class="field"><label class="field__label" for="auth-name">Full name</label><input class="input" type="text" id="auth-name" autocomplete="name"></div>
        <div class="field"><label class="field__label" for="auth-email">Email</label><input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>
        ${passwordField({ id: "auth-password", label: "Password", autocomplete: "new-password", strengthMeter: true, hint: "At least 12 characters." })}
        <div id="auth-error" class="muted" style="color:#6F3B36;font-size:13.5px;margin:8px 0;"></div>
        <div id="auth-info" class="muted" style="font-size:13.5px;margin:8px 0;"></div>
        <button type="button" class="btn btn--primary" style="width:100%;justify-content:center;" data-action="do-signup">Create account</button>
      `,
      footerHtml: `Already have an account? <a href="#/login">Sign in</a>`,
    });
  }

  function renderForgotPassword(app) {
    app.innerHTML = authView({
      title: "Reset your password",
      lede: "Enter the email on your account. We'll send a link that sets a new password; it works once and expires after 10 minutes.",
      backLink: { href: "#/login", label: "Back to sign in" },
      cardBody: `
        <div class="field"><label class="field__label" for="auth-email">Email</label><input class="input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>
        <div id="auth-error" class="muted" style="color:#6F3B36;font-size:13.5px;margin:8px 0;"></div>
        <div id="auth-info" class="muted" style="font-size:13.5px;margin:8px 0;"></div>
        <button type="button" class="btn btn--primary" style="width:100%;justify-content:center;" data-action="do-forgot-password">Send reset link</button>
      `,
    });
  }

  function renderResetPassword(app) {
    app.innerHTML = authView({
      title: "Set a new password",
      cardBody: `
        ${passwordField({ id: "auth-password", label: "New password", autocomplete: "new-password", strengthMeter: true, hint: "At least 12 characters." })}
        <div id="auth-error" class="muted" style="color:#6F3B36;font-size:13.5px;margin:8px 0;"></div>
        <button type="button" class="btn btn--primary" style="width:100%;justify-content:center;" data-action="do-reset-password">Set password</button>
      `,
    });
  }

  // ---------------------------------------------------------------------
  // Intake
  // ---------------------------------------------------------------------

  function objectiveCompanyCount(objective) {
    const match = (objective || "").match(/^\s*find\s+(\d{1,3})\b/i);
    if (!match) return null;
    const n = Number(match[1]);
    return n >= 1 && n <= 100 ? n : null;
  }

  function renderIntake(app) {
    const defaultTarget = appConfig.defaultTargetQualifiedLeads || 10;
    app.innerHTML = `
      <div class="view">
        <section class="hero-grid">
          <div class="hero-copy">
            <h1 class="h1" style="font-size: 46px; line-height: 1.08;">Open a case on your next ten accounts.</h1>
            <p class="lede" style="margin-bottom: 28px;">Write the qualification objective in one line, starting with how many companies to look at (e.g. "Find 10 ..."). Casefile refines it into an ICP, researches that many candidate companies, files the evidence behind every verdict, and drafts outreach for the ones that qualify.</p>
            <div class="field">
              <label class="field__label" for="objective">Research objective</label>
              <textarea id="objective" class="textarea" rows="3" placeholder="Find 10 US B2B SaaS companies, 10–100 employees, that may need AI automation support" data-action="objective-input"></textarea>
              <div id="objective-count-hint" class="muted" style="font-size: 12.5px; margin-top: 6px;">Will search for ${defaultTarget} companies (no count found in the objective — using the default).</div>
            </div>
            <div style="display: flex; align-items: center; gap: 14px; margin-top: 20px;">
              <button type="button" class="btn btn--primary" data-action="start-research">Start research</button>
              <span class="muted" style="font-size: 13px;">Typical run: 7–15 minutes</span>
            </div>
            <div id="intake-error" class="muted" style="color: #6F3B36; font-size: 13.5px; margin-top: 10px;"></div>
          </div>
          <div class="hero-stage" aria-hidden="true">
            <div class="hero-fan">
              <div class="hero-fan__card hero-fan__card--a"></div>
              <div class="hero-fan__card hero-fan__card--b"></div>
              <div class="hero-fan__card hero-fan__card--c"></div>
              <div class="hero-fan__card hero-fan__card--top">
                <div class="hero-fan__peek">
                  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
                    <span style="font-family: Fraunces, serif; font-weight: 600; font-size: 17px;">Northbeam Ops</span>
                    <span class="mono" style="font-size: 11.5px; color: #3D6E58;">0.91</span>
                  </div>
                  <div class="mono" style="font-size: 12px; color: #7B7F78; margin-top: 2px;">northbeamops.com</div>
                  <div class="hairline"></div>
                  <div style="font-size: 12.5px; line-height: 1.5; color: #4C5158;">Careers page lists three ops-coordinator roles doing manual order triage. Support SLA published at 24h.</div>
                  <div style="display: flex; gap: 6px; margin-top: 12px;">
                    <span class="badge">Qualified</span>
                    <span class="badge" style="--text:#5C6169;--bg:transparent;--border:#C6C0AF;">4 sources</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  async function startResearch() {
    const textarea = document.getElementById("objective");
    const objective = (textarea.value || "").trim();
    const errorEl = document.getElementById("intake-error");
    errorEl.textContent = "";
    if (!objective) { errorEl.textContent = "Write a research objective first."; return; }
    try {
      const result = await api("/api/runs", {
        method: "POST",
        body: JSON.stringify({ objective }),
      });
      navigate(`#/run/${result.id}`);
    } catch (err) {
      errorEl.textContent = err.message || "Couldn't start the run.";
    }
  }

  // ---------------------------------------------------------------------
  // Run (ICP confirmation + live progress — merged, since the backend
  // starts research immediately on POST /api/runs with no separate
  // approval gate; both are just facets of the same polled run record)
  // ---------------------------------------------------------------------

  function icpPanel(run) {
    if (!run.icp_criteria) {
      return `<div class="card"><span class="status-dot"></span> <span style="margin-left: 8px; font-size: 14px; color: #4C5158;">Refining ICP criteria…</span></div>`;
    }
    const icp = run.icp_criteria;
    const facts = [
      ["Target company type", icp.target_company_type],
      ["Industries", (icp.industries || []).join(", ")],
      ["Geography", (icp.geography || []).join(", ")],
      ["Headcount", icp.headcount_range],
      ["Buyer persona", icp.buyer_persona],
      ["Business problem", icp.business_problem],
    ];
    return `
      <div class="card card--flush">
        <div class="icp-objective">
          <div class="icp-fact__label">Objective as submitted</div>
          <div style="font-size: 15.5px; line-height: 1.55;">${esc(run.objective)}</div>
        </div>
        <div class="icp-facts">
          ${facts.map(([label, value]) => `
            <div class="icp-fact"><div class="icp-fact__label">${esc(label)}</div><div class="icp-fact__value">${esc(value || "—")}</div></div>
          `).join("")}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px;">
        <div class="icp-filter-panel icp-filter-panel--hard">
          <div class="h2" style="margin-bottom: 12px; font-size: 17px;">Hard filters <span class="muted" style="font-size: 12.5px; font-weight: 400;">non-negotiable</span></div>
          <ul>${(icp.hard_filters || []).map((f) => `<li><span style="font-weight:600;">·</span><span>${esc(f)}</span></li>`).join("")}</ul>
        </div>
        <div class="icp-filter-panel icp-filter-panel--soft">
          <div class="h2" style="margin-bottom: 12px; font-size: 17px; color:#4C5158;">Soft preferences <span class="muted" style="font-size: 12.5px;">scored, not required</span></div>
          <ul>${(icp.soft_preferences || []).map((f) => `<li style="color:#4C5158;"><span style="color:#8E8875;">·</span><span>${esc(f)}</span></li>`).join("")}</ul>
        </div>
      </div>
      <div class="disqualifiers-panel" style="margin-top: 16px;">
        <div class="h2" style="margin: 0 0 10px;">Disqualifiers</div>
        ${(icp.disqualifiers || []).map((d) => `<span class="disqualifier-tag">${esc(d)}</span>`).join("")}
      </div>
      ${icp.assumptions_made && icp.assumptions_made.length ? `
        <div class="card" style="margin-top: 16px;">
          <div class="h2" style="font-size: 15px;">Assumptions the agent made</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.6; color: #4C5158;">
            ${icp.assumptions_made.map((a) => `<li>${esc(a)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    `;
  }

  function toneForStatus(status) { return status === "error" ? "tone-bad" : status === "blocked" ? "tone-warn" : "tone-ok"; }

  function feedPanel(toolCalls) {
    const rows = toolCalls.slice().reverse();
    return `
      <div class="feed">
        <div class="feed__head"><span class="feed__title">Tool calls, live</span><span class="feed__count">${toolCalls.length} calls</span></div>
        <div class="feed__body">
          ${rows.map((r) => `
            <div class="feed__line">
              <span class="feed__time">${fmtTime(r.created_at)}</span>
              <span class="feed__text ${toneForStatus(r.status)}">${esc(r.tool_name)} — ${esc(r.purpose || r.status)}</span>
            </div>
          `).join("") || `<div class="muted" style="font-size:13px;">No tool calls yet.</div>`}
        </div>
      </div>
    `;
  }

  function countersPanel(run) {
    const counters = [
      ["Companies discovered", `${run.companies_discovered} / ${run.max_candidates}`],
      ["Sites scraped", `${run.sites_scraped} / ${run.max_scrapes}`],
      ["Leads qualified", `${run.leads_qualified} / ${run.target_qualified_leads}`],
      ["Cost so far", fmtMoney(run.total_cost_usd)],
    ];
    return `
      <div class="counters-grid">
        ${counters.map(([label, value]) => `
          <div class="counter"><div class="counter__label">${esc(label)}</div><div class="counter__value">${esc(value)}</div></div>
        `).join("")}
      </div>
    `;
  }

  function runStatusBanner(run) {
    if (run.status === "completed" || run.status === "partial") {
      return `
        <div class="card" style="border-color:#A9C0B2; background:#F1F5F2; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom: 20px;">
          <span style="font-size: 14px; color:#2C5342;">${run.status === "partial" ? "Run finished with fewer leads than targeted." : "Run completed."}</span>
          <button type="button" class="btn btn--primary btn--sm" data-action="view-leads" data-run="${esc(run.id)}">View leads</button>
        </div>
      `;
    }
    if (run.status === "failed") {
      return `
        <div class="error-state" style="max-width: none; margin-bottom: 20px;">
          <div class="h2" style="color:#6F3B36;">This run failed</div>
          <p style="margin: 0;">${esc(run.error_message || "No error detail was recorded.")}</p>
        </div>
      `;
    }
    if (run.status === "stopped") {
      return `
        <div class="card" style="border-color:#D8C89A; background:#F3EFE6; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom: 20px;">
          <span style="font-size: 14px; color:#6E5518;">Run stopped. Whatever was found before stopping is saved below.</span>
          <button type="button" class="btn btn--primary btn--sm" data-action="view-leads" data-run="${esc(run.id)}">View leads</button>
        </div>
      `;
    }
    return "";
  }

  async function renderRun(app, runId) {
    app.innerHTML = `<div class="view"><div class="muted">Loading run…</div></div>`;

    async function tick() {
      let run, toolCalls;
      try {
        [run, toolCalls] = await Promise.all([
          api(`/api/runs/${runId}`),
          api(`/api/runs/${runId}/tool-calls`),
        ]);
      } catch (err) {
        app.innerHTML = `<div class="view"><div class="error-state">Couldn't load this run: ${esc(err.message)}</div></div>`;
        return;
      }
      state.runCache[runId] = run;
      state.toolCallsCache[runId] = toolCalls;

      app.innerHTML = `
        <div class="view">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px;">
            <div style="max-width: 62ch;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                ${run.status === "running" ? `<span class="status-dot"></span><span style="font-size:13px;color:#4C5158;">Run in progress</span>` : ""}
              </div>
              <h1 class="h1" style="font-size: 28px; margin: 0;">${esc(run.objective)}</h1>
            </div>
            ${run.status === "running" ? `<button type="button" class="btn btn--danger-outline" data-action="stop-run" data-run="${esc(run.id)}">Stop run</button>` : ""}
          </div>
          <div id="stop-run-error" class="muted" style="color:#6F3B36;font-size:13.5px;margin-bottom:12px;"></div>
          ${runStatusBanner(run)}
          ${icpPanel(run)}
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 16px; align-items: start; margin-top: 16px;">
            ${countersPanel(run)}
            ${feedPanel(toolCalls)}
          </div>
        </div>
      `;

      if (run.status !== "running") stopPolling();
    }

    await tick();
    if (state.runCache[runId] && state.runCache[runId].status === "running") {
      state.pollTimer = setInterval(tick, 2000);
    }
  }

  // ---------------------------------------------------------------------
  // Dashboard (Leads / Audit log tabs)
  // ---------------------------------------------------------------------

  function leadCard(lead) {
    const conf = lead.confidence === null || lead.confidence === undefined ? null : Number(lead.confidence);
    return `
      <article class="lead-card status-${esc(lead.qualification_status)}" data-action="open-lead" data-lead="${esc(lead.id)}" tabindex="0">
        ${lead.qualification_status === "needs_review" ? `<div class="lead-card__flag">Your call needed</div>` : ""}
        <div class="lead-card__head">
          <h3 class="lead-card__name">${esc(lead.company_name)}</h3>
          ${conf !== null ? `<span class="lead-card__conf">${conf.toFixed(2)}</span>` : ""}
        </div>
        <div class="lead-card__domain">${esc(lead.company_domain)}</div>
        <div class="lead-card__bar-track"><div class="lead-card__bar-fill" style="width:${conf !== null ? Math.round(conf * 100) : 0}%;"></div></div>
        <p class="lead-card__summary">${esc(lead.source_summary || "")}</p>
        <div class="lead-card__foot">
          <span class="badge status-${esc(lead.qualification_status)}">${esc(statusLabel(lead.qualification_status))}</span>
          <span class="muted mono" style="font-size:11.5px;">${(lead.source_urls || []).length} sources</span>
        </div>
      </article>
    `;
  }

  function leadsTab(run, leads) {
    if (leads === null) {
      return `<div class="leads-grid">${[1, 2, 3, 4, 5, 6].map(() => `
        <div class="card"><div class="skeleton" style="height:18px;width:58%;"></div><div class="skeleton" style="height:11px;width:38%;margin-top:10px;"></div><div class="skeleton" style="height:40px;margin-top:18px;"></div></div>
      `).join("")}</div>`;
    }
    if (leads.length === 0) {
      return `
        <div class="empty-state">
          <div class="h2" style="font-size:22px;">No leads filed yet</div>
          <p style="margin: 0 0 20px;">This run has no companies on file. Either it was stopped during discovery, or every candidate failed a hard filter.</p>
          <button type="button" class="btn btn--primary" data-action="go-intake">Start a new run</button>
        </div>
      `;
    }

    const byConfDesc = (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0);

    const counts = { all: leads.length, qualified: 0, needs_review: 0, not_qualified: 0 };
    leads.forEach((l) => { counts[l.qualification_status] = (counts[l.qualification_status] || 0) + 1; });

    const target = run.target_qualified_leads;
    const filterDefs = [
      ["top", `Top ${target}`],
      ["all", "All"],
      ["qualified", "Qualified"],
      ["needs_review", "Needs review"],
      ["not_qualified", "Not qualified"],
    ];

    let list;
    if (state.leadFilter === "top") {
      // Qualified leads always take priority slots (ranked by confidence
      // among themselves); if fewer than `target` are qualified, the
      // remaining slots fill with the highest-scoring needs_review, then
      // not_qualified. A not_qualified company's "confidence" measures
      // confidence in disqualifying it, not fit, so it only ever fills a
      // leftover slot, never displaces a qualified lead.
      const qualified = leads.filter((l) => l.qualification_status === "qualified").sort(byConfDesc);
      const review = leads.filter((l) => l.qualification_status === "needs_review").sort(byConfDesc);
      const notQualified = leads.filter((l) => l.qualification_status === "not_qualified").sort(byConfDesc);
      list = [...qualified, ...review, ...notQualified].slice(0, target);
    } else {
      list = state.leadFilter === "all" ? leads : leads.filter((l) => l.qualification_status === state.leadFilter);
      list = list.slice().sort((a, b) => {
        if (state.leadSort === "name") return a.company_name.localeCompare(b.company_name);
        const ca = a.confidence ?? 0, cb = b.confidence ?? 0;
        return state.leadSort === "conf-asc" ? ca - cb : cb - ca;
      });
    }

    // Not every company researched is expected to qualify — that's
    // qualification doing its job, not a shortfall. Only flag the
    // genuinely notable case: nothing in the researched set qualified.
    const noneQualified = ["completed", "partial", "stopped"].includes(run.status) && run.leads_qualified === 0 && leads.length > 0;

    return `
      ${noneQualified ? `
        <div class="shortfall-banner">
          <div>
            <div style="font-family:Fraunces,serif;font-weight:600;font-size:16.5px;margin-bottom:5px;">0 of ${run.target_qualified_leads} researched companies qualified</div>
            <div style="font-size:14px;color:#4C5158;">Review the leads below to see why, or start a new run with a different objective.</div>
          </div>
        </div>
      ` : ""}
      <div class="filters-row">
        <div class="filter-chips">
          ${filterDefs.map(([key, label]) => `
            <button type="button" class="filter-chip ${state.leadFilter === key ? "is-active" : ""}" data-action="set-lead-filter" data-value="${key}">${label}${key === "top" ? "" : " " + (counts[key] || 0)}</button>
          `).join("")}
        </div>
        ${state.leadFilter !== "top" ? `
          <div class="sort-row">
            <label for="sortpick">Sort</label>
            <select id="sortpick" class="select" data-action="set-lead-sort">
              <option value="conf-desc" ${state.leadSort === "conf-desc" ? "selected" : ""}>Confidence, high to low</option>
              <option value="conf-asc" ${state.leadSort === "conf-asc" ? "selected" : ""}>Confidence, low to high</option>
              <option value="name" ${state.leadSort === "name" ? "selected" : ""}>Company name</option>
            </select>
          </div>
        ` : `<span class="muted" style="font-size:12.5px;">Ranked: qualified first, then highest-confidence review/not-qualified fill any remaining slots.</span>`}
      </div>
      <div class="leads-grid">${list.map(leadCard).join("")}</div>
    `;
  }

  function auditTab(toolCalls) {
    if (toolCalls === null) return `<div class="muted">Loading audit log…</div>`;
    if (toolCalls.length === 0) return `<div class="muted">No tool calls recorded for this run.</div>`;

    const tools = Array.from(new Set(toolCalls.map((r) => r.tool_name)));
    const rows = toolCalls
      .filter((r) => state.auditToolFilter === "all" || r.tool_name === state.auditToolFilter)
      .filter((r) => state.auditStatusFilter === "all" || r.status === state.auditStatusFilter);

    return `
      <div class="filters-row">
        <div></div>
        <div class="sort-row">
          <select class="select" data-action="set-audit-tool">
            <option value="all" ${state.auditToolFilter === "all" ? "selected" : ""}>All tools</option>
            ${tools.map((t) => `<option value="${esc(t)}" ${state.auditToolFilter === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
          <select class="select" data-action="set-audit-status">
            <option value="all" ${state.auditStatusFilter === "all" ? "selected" : ""}>All statuses</option>
            <option value="success" ${state.auditStatusFilter === "success" ? "selected" : ""}>Success</option>
            <option value="error" ${state.auditStatusFilter === "error" ? "selected" : ""}>Error</option>
            <option value="blocked" ${state.auditStatusFilter === "blocked" ? "selected" : ""}>Blocked</option>
          </select>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Tool</th><th>Purpose and input</th><th>Result</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="${r.status !== "success" ? "row-flagged" : ""}">
              <td class="mono">${esc(r.tool_name)}</td>
              <td>
                <div>${esc(r.purpose || "")}</div>
                <div class="muted mono" style="font-size:12px;margin-top:3px;">${esc(r.input_summary || "")}</div>
              </td>
              <td>
                <div class="muted">${esc(r.result_summary || "")}</div>
                ${r.error_message ? `<div class="mono" style="font-size:12px;color:#8B4B44;margin-top:3px;">${esc(r.error_message)}</div>` : ""}
              </td>
              <td><span class="badge status-${esc(r.status)}">${esc(r.status)}</span></td>
              <td class="muted mono">${fmtTime(r.created_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function renderDashboard(app, runId, tabParam) {
    const tab = tabParam || state.dashboardTab[runId] || "leads";
    state.dashboardTab[runId] = tab;

    app.innerHTML = `<div class="view view--wide"><div class="muted">Loading…</div></div>`;

    let run;
    try { run = state.runCache[runId] || await api(`/api/runs/${runId}`); state.runCache[runId] = run; }
    catch (err) { app.innerHTML = `<div class="view"><div class="error-state">Couldn't load this run: ${esc(err.message)}</div></div>`; return; }

    function paint() {
      const leads = state.leadsCache[runId] || null;
      const toolCalls = state.toolCallsCache[runId] || null;
      app.innerHTML = `
        <div class="view view--wide">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;">
            <div style="max-width: 68ch;">
              <div class="eyebrow">Run ${esc(run.id.slice(0, 8))} · ${esc(run.status)} ${run.completed_at ? "· " + fmtDateTime(run.completed_at) : ""}</div>
              <h1 class="h1" style="font-size: 28px;">${esc(run.objective)}</h1>
            </div>
          </div>
          <div class="tabs">
            <button type="button" class="tab ${tab === "leads" ? "is-active" : ""}" data-action="dash-tab" data-run="${esc(runId)}" data-value="leads">Leads</button>
            <button type="button" class="tab ${tab === "audit" ? "is-active" : ""}" data-action="dash-tab" data-run="${esc(runId)}" data-value="audit">Audit log</button>
          </div>
          <div style="padding-top: 20px;">
            ${tab === "leads" ? leadsTab(run, leads) : auditTab(toolCalls)}
          </div>
        </div>
      `;
    }

    paint();

    if (tab === "leads" && !state.leadsCache[runId]) {
      try { state.leadsCache[runId] = await api(`/api/runs/${runId}/leads`); }
      catch { state.leadsCache[runId] = []; }
      paint();
    }
    if (tab === "audit" && !state.toolCallsCache[runId]) {
      try { state.toolCallsCache[runId] = await api(`/api/runs/${runId}/tool-calls`); }
      catch { state.toolCallsCache[runId] = []; }
      paint();
    }
  }

  // ---------------------------------------------------------------------
  // Lead detail
  // ---------------------------------------------------------------------

  function outreachTabsMarkup(leadId, activeTab) {
    return `
      <div class="tabs tabs--compact">
        ${["Email 1", "Email 2", "Email 3"].map((label, i) => `
          <button type="button" class="tab ${activeTab === i ? "is-active" : ""}" data-action="email-tab" data-lead="${esc(leadId)}" data-value="${i}">${label}</button>
        `).join("")}
      </div>
    `;
  }

  function outreachItemMarkup(lead, item, opts) {
    const ui = getUi(lead.id, item);
    const content = getItemContent(lead, item) || {};
    const budget = state.regenState[lead.id];
    const regenLeft = budget ? budget.remaining : null;
    const regenDisabled = regenLeft === 0;
    const bodyLabel = hasSubject(item) ? "Body" : "Message";

    let body = "";

    if (ui.mode === "edit") {
      const draft = ui.draft || { subject: content.subject || "", body: hasSubject(item) ? content.body || "" : content || "", note: content.personalization_note || "" };
      ui.draft = draft;
      body = `
        <div>
          ${hasSubject(item) ? `<div class="field"><label class="field__label">Subject</label><input class="input" data-action="draft-subject" data-lead="${esc(lead.id)}" data-item="${item}" value="${esc(draft.subject)}"></div>` : ""}
          <div class="field"><label class="field__label">${bodyLabel}</label><textarea class="textarea" rows="9" data-action="draft-body" data-lead="${esc(lead.id)}" data-item="${item}">${esc(draft.body)}</textarea></div>
          ${hasSubject(item) ? `<div class="field"><label class="field__label">Personalization drawn from</label><textarea class="textarea" rows="2" data-action="draft-note" data-lead="${esc(lead.id)}" data-item="${item}">${esc(draft.note)}</textarea></div>` : ""}
          <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
            <button type="button" class="btn btn--primary btn--sm" data-action="save-edit" data-lead="${esc(lead.id)}" data-item="${item}">Save</button>
            <button type="button" class="btn btn--secondary btn--sm" data-action="cancel-edit" data-lead="${esc(lead.id)}" data-item="${item}">Cancel</button>
            <span class="muted" style="font-size:12.5px;">Your edits save straight to the case file.</span>
          </div>
        </div>
      `;
    } else {
      const bodyText = hasSubject(item) ? content.body || "" : content || "";
      body = `
        <div>
          ${hasSubject(item) ? `<div><div class="field__label">Subject</div><div style="font-size:15px;font-weight:600;margin-bottom:14px;">${esc(content.subject || "")}</div></div>` : ""}
          <div class="field__label">${bodyLabel}</div>
          <div class="outreach-body">${esc(bodyText)}</div>
          ${hasSubject(item) && content.personalization_note ? `
            <div class="outreach-note"><div class="field__label" style="font-weight:600;color:#5C6169;">Personalization drawn from</div><div style="font-size:13.5px;color:#4C5158;">${esc(content.personalization_note)}</div></div>
          ` : ""}
          <div class="muted" style="font-size:12.5px;margin-top:8px;">${provenanceLine(lead, item)}</div>
        </div>
      `;
    }

    if (ui.mode === "note") {
      body += `
        <div class="outreach-note">
          <label class="field__label" style="font-weight:600;color:#21252B;">What should change?</label>
          <p class="muted" style="font-size:12.5px;margin:0 0 9px;">Optional. Casefile rewrites from the evidence already on file — it does not research again.</p>
          <input class="input" placeholder="shorten this, or mention their recent hiring push" data-action="regen-guidance" data-lead="${esc(lead.id)}" data-item="${item}" value="${esc(ui.guidance)}">
          <div style="display:flex;align-items:center;gap:8px;margin-top:11px;">
            <button type="button" class="btn btn--primary btn--sm" data-action="confirm-regen" data-lead="${esc(lead.id)}" data-item="${item}">Regenerate</button>
            <button type="button" class="btn btn--secondary btn--sm" data-action="cancel-regen" data-lead="${esc(lead.id)}" data-item="${item}">Cancel</button>
          </div>
        </div>
      `;
    }

    if (ui.mode === "loading") {
      body += `
        <div class="outreach-loading">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px;"><span class="status-dot"></span><span style="font-size:13px;color:#4C5158;">Rewriting from the evidence already on file.</span></div>
          <div class="skeleton" style="height:11px;width:88%;"></div>
          <div class="skeleton" style="height:11px;width:74%;margin-top:9px;"></div>
        </div>
      `;
    }

    if (ui.mode === "proposed" && ui.proposed) {
      const p = ui.proposed;
      const proposedBody = hasSubject(item) ? p.body || "" : (typeof p === "string" ? p : p.body || "");
      const proposedSubject = hasSubject(item) ? p.subject || "" : null;
      body += `
        <div class="outreach-proposed">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:600;color:#2C5342;">Proposed version</span>
            ${ui.guidance ? `<span class="muted" style="font-size:12.5px;">Rewritten with your note</span>` : `<span class="muted" style="font-size:12.5px;">Rewritten from the same evidence</span>`}
          </div>
          ${proposedSubject ? `<div class="field__label">Subject</div><div style="font-size:15px;font-weight:600;margin-bottom:12px;">${esc(proposedSubject)}</div>` : ""}
          <div class="field__label">${bodyLabel}</div>
          <div class="outreach-body" style="background:#FFFFFF;">${esc(proposedBody)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
            <button type="button" class="btn btn--primary btn--sm" data-action="use-proposed" data-lead="${esc(lead.id)}" data-item="${item}">Use this version</button>
            <button type="button" class="btn btn--secondary btn--sm" data-action="keep-original" data-lead="${esc(lead.id)}" data-item="${item}">Keep original</button>
            <button type="button" class="btn--icon" data-action="copy-proposed" data-lead="${esc(lead.id)}" data-item="${item}">${copyIconSvg()}<span class="btn--icon-label">Copy</span></button>
          </div>
        </div>
      `;
    }

    if (ui.mode === "error") {
      body += `
        <div class="outreach-error">
          <span>${esc(ui.errorMessage || "Couldn't regenerate — try again. This attempt didn't use one of your regenerations.")}</span>
          <button type="button" class="btn btn--secondary btn--sm" data-action="confirm-regen" data-lead="${esc(lead.id)}" data-item="${item}">Try again</button>
          <button type="button" class="btn--icon" data-action="dismiss-error" data-lead="${esc(lead.id)}" data-item="${item}"><span class="btn--icon-label">Dismiss</span></button>
        </div>
      `;
    }

    if (ui.mode === "view" || ui.mode === "error") {
      body += `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button type="button" class="btn btn--secondary btn--sm" data-action="start-edit" data-lead="${esc(lead.id)}" data-item="${item}">Edit</button>
          <button type="button" class="btn btn--secondary btn--sm" data-action="start-regen" data-lead="${esc(lead.id)}" data-item="${item}" ${regenDisabled ? "disabled" : ""}>Regenerate</button>
          <button type="button" class="btn--icon" data-action="copy-current" data-lead="${esc(lead.id)}" data-item="${item}">${copyIconSvg()}<span class="btn--icon-label">Copy</span></button>
        </div>
        ${regenDisabled ? `<div class="muted" style="font-size:12.5px;margin-top:8px;">Out of regenerations for this lead until ${fmtTime(budget.resetAt)}. Editing still works.</div>` : ""}
      `;
    }

    return `<div style="${opts.rule ? "padding-top:18px;margin-top:20px;border-top:1px solid #DAD5C6;" : ""}">${opts.heading ? `<div class="field__label" style="margin-bottom:10px;">${opts.heading}</div>` : ""}${body}</div>`;
  }

  function copyIconSvg() {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="5.6" y="5.6" width="8.4" height="8.4" rx="1"></rect><path d="M11 3.6 V2.6 A0.6 0.6 0 0 0 10.4 2 H2.6 A0.6 0.6 0 0 0 2 2.6 v7.8 a0.6 0.6 0 0 0 0.6 0.6 h1"></path></svg>`;
  }

  function regenStatusLine(leadId) {
    const budget = state.regenState[leadId];
    if (!budget) return "Regenerate rewrites from evidence already on file. Limited per lead.";
    return `Regenerate: ${budget.remaining} available · resets ${budget.resetAt ? fmtTime(budget.resetAt) : "—"}`;
  }

  async function renderDetail(app, runId, leadId) {
    app.innerHTML = `<div class="view"><div class="muted">Loading…</div></div>`;

    let leads = state.leadsCache[runId];
    if (!leads) {
      try { leads = await api(`/api/runs/${runId}/leads`); state.leadsCache[runId] = leads; }
      catch (err) { app.innerHTML = `<div class="view"><div class="error-state">Couldn't load this lead: ${esc(err.message)}</div></div>`; return; }
    }
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) { app.innerHTML = `<div class="view"><div class="error-state">Lead not found in this run.</div></div>`; return; }

    paintDetail(app, runId, lead);
  }

  function paintDetail(app, runId, lead) {
    const conf = lead.confidence === null || lead.confidence === undefined ? null : Number(lead.confidence);
    const accentVar = lead.qualification_status === "qualified" ? "#3D6E58" : lead.qualification_status === "needs_review" ? "#A9832E" : "#8B4B44";
    const emailTabIndex = window.__emailTab && window.__emailTab[lead.id] !== undefined ? window.__emailTab[lead.id] : 0;

    app.innerHTML = `
      <div class="view">
        <button type="button" class="btn--ghost" style="margin-bottom:18px;display:inline-block;" data-action="back-to-leads" data-run="${esc(runId)}">Back to all leads</button>

        <div class="detail-head" style="--accent:${accentVar};">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:28px;flex-wrap:wrap;">
            <div>
              <h1 class="h1" style="font-size:32px;">${esc(lead.company_name)}</h1>
              ${safeHref("https://" + lead.company_domain) ? `<a href="https://${esc(lead.company_domain)}" target="_blank" rel="noreferrer" class="mono" style="font-size:13.5px;">${esc(lead.company_domain)}</a>` : `<span class="mono muted" style="font-size:13.5px;">${esc(lead.company_domain)}</span>`}
              <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
                <span class="badge status-${esc(lead.qualification_status)}">${esc(statusLabel(lead.qualification_status))}</span>
                <span class="muted" style="font-size:13px;">Filed ${fmtDateTime(lead.created_at)}</span>
              </div>
            </div>
            ${conf !== null ? `
              <div style="min-width:190px;">
                <div class="icp-fact__label">Confidence</div>
                <div class="detail-confidence__value">${conf.toFixed(2)}</div>
                <div class="detail-confidence__bar"><div class="detail-confidence__fill" style="width:${Math.round(conf * 100)}%;"></div></div>
              </div>
            ` : ""}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:16px;margin-top:16px;align-items:start;">
          <div style="display:flex;flex-direction:column;gap:16px;">
            <section class="card">
              <div class="h2">Why it fits</div>
              <ul class="reasons-list">${(lead.fit_reasons || []).map((r) => `<li><span class="dot-fit"></span><span>${esc(r)}</span></li>`).join("") || `<li class="muted">None recorded.</li>`}</ul>
              <div class="hairline"></div>
              <div class="h2">Concerns</div>
              <ul class="reasons-list">${(lead.concerns || []).map((c) => `<li><span class="dot-concern"></span><span style="color:#4C5158;">${esc(c)}</span></li>`).join("") || `<li class="muted">None recorded.</li>`}</ul>
            </section>

            <section class="card">
              <div class="h2" style="margin-bottom:6px;">Evidence</div>
              <p class="muted" style="font-size:13.5px;margin:0 0 14px;">Read by the agent during this run.</p>
              ${lead.source_summary ? `<p style="font-size:14px;line-height:1.55;color:#4C5158;margin:0 0 14px;">${esc(lead.source_summary)}</p>` : ""}
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${(lead.source_urls || []).map((url) => {
                  const href = safeHref(url);
                  return `<div class="evidence-item">${href ? `<a href="${href}" target="_blank" rel="noreferrer" class="mono" style="font-size:13px;word-break:break-all;">${esc(url)}</a>` : `<span class="mono muted" style="font-size:13px;word-break:break-all;">${esc(url)}</span>`}</div>`;
                }).join("") || `<div class="muted">No sources recorded.</div>`}
              </div>
            </section>
          </div>

          <div>
            <section class="card">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px;">
                <div class="h2" style="margin:0;">Outreach draft</div>
                <span class="muted" style="font-size:12.5px;">Not sent. Review before use.</span>
              </div>
              ${leadHasOutreach(lead) ? `
                <div class="muted" style="font-size:12.5px;margin-bottom:14px;">${regenStatusLine(lead.id)}</div>
                ${outreachTabsMarkup(lead.id, emailTabIndex)}
                ${outreachItemMarkup(lead, "email_" + (emailTabIndex + 1), { rule: false })}
                ${outreachItemMarkup(lead, "linkedin", { heading: "LinkedIn message", rule: true })}
              ` : `<p class="muted" style="font-size:14px;">No outreach drafted for this lead — only qualified leads get outreach drafts.</p>`}
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function currentDetailLead(runId, leadId) {
    const leads = state.leadsCache[runId] || [];
    return leads.find((l) => l.id === leadId);
  }

  function updateLeadInCache(runId, updatedLead) {
    const leads = state.leadsCache[runId];
    if (!leads) return;
    const idx = leads.findIndex((l) => l.id === updatedLead.id);
    if (idx !== -1) leads[idx] = updatedLead;
  }

  // ---------------------------------------------------------------------
  // Run history
  // ---------------------------------------------------------------------

  async function renderHistory(app) {
    app.innerHTML = `<div class="view view--history"><div class="muted">Loading…</div></div>`;
    let runs;
    try { runs = await api("/api/runs"); state.runsCache = runs; }
    catch (err) { app.innerHTML = `<div class="view"><div class="error-state">Couldn't load run history: ${esc(err.message)}</div></div>`; return; }

    app.innerHTML = `
      <div class="view view--history">
        <h1 class="h1" style="font-size:30px;">Run history</h1>
        <p class="lede">Open any run to reload its case files and its full audit log.</p>
        <table class="table">
          <thead><tr><th>Objective</th><th>Started</th><th>Status</th><th>Leads</th><th>Cost</th></tr></thead>
          <tbody>
            ${runs.map((r) => `
              <tr class="is-clickable" data-action="open-run" data-run="${esc(r.id)}" data-status="${esc(r.status)}" tabindex="0">
                <td>${esc(r.objective)}</td>
                <td class="muted mono">${fmtDateTime(r.created_at)}</td>
                <td><span class="badge status-${r.status === "completed" ? "success" : r.status === "failed" ? "error" : "blocked"}">${esc(r.status)}</span></td>
                <td class="mono">${r.leads_qualified}</td>
                <td class="mono">${fmtMoney(r.total_cost_usd)}</td>
              </tr>
            `).join("") || `<tr><td colspan="5" class="muted">No runs yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Event delegation
  // ---------------------------------------------------------------------

  document.addEventListener("click", async (e) => {
    const navBtn = e.target.closest("[data-nav]");
    if (navBtn) { navigate("#/" + navBtn.dataset.nav); return; }

    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const leadId = el.dataset.lead;
    const item = el.dataset.item;
    const runId = el.dataset.run;

    if (action === "logout") {
      if (sb) await sb.auth.signOut().catch(() => {});
      state.session = null;
      renderAccountBar();
      return navigate("#/login");
    }
    if (action === "toggle-password") {
      const input = document.getElementById(el.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      return;
    }
    if (action === "do-login") {
      const errorEl = document.getElementById("auth-error");
      errorEl.textContent = "";
      if (!requireSb(errorEl)) return;
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      const originalLabel = el.textContent;
      el.disabled = true; el.textContent = "Signing in…";
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { errorEl.textContent = error.message; return; }
        state.session = data.session;
        renderAccountBar();
        return navigate("#/intake");
      } catch (err) {
        errorEl.textContent = "Something went wrong — try again.";
      } finally {
        el.disabled = false; el.textContent = originalLabel;
      }
      return;
    }
    if (action === "do-signup") {
      const errorEl = document.getElementById("auth-error");
      const infoEl = document.getElementById("auth-info");
      errorEl.textContent = ""; infoEl.textContent = "";
      if (!requireSb(errorEl)) return;
      const fullName = document.getElementById("auth-name").value.trim();
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      if (password.length < 12) {
        errorEl.textContent = "Password must be at least 12 characters.";
        return;
      }
      const originalLabel = el.textContent;
      el.disabled = true; el.textContent = "Creating account…";
      try {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) { errorEl.textContent = error.message; return; }
        if (data.session) {
          state.session = data.session;
          renderAccountBar();
          return navigate("#/intake");
        }
        infoEl.textContent = "Check your email to confirm your account, then log in.";
      } catch (err) {
        errorEl.textContent = "Something went wrong — try again.";
      } finally {
        el.disabled = false; el.textContent = originalLabel;
      }
      return;
    }
    if (action === "do-forgot-password") {
      const errorEl = document.getElementById("auth-error");
      const infoEl = document.getElementById("auth-info");
      errorEl.textContent = ""; infoEl.textContent = "";
      if (!requireSb(errorEl)) return;
      const email = document.getElementById("auth-email").value.trim();
      const originalLabel = el.textContent;
      el.disabled = true; el.textContent = "Sending…";
      try {
        // Implicit flow appends its own #access_token=...&type=recovery
        // fragment to whatever URL we give it — no query trick needed.
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/",
        });
        if (error) { errorEl.textContent = error.message; return; }
        infoEl.textContent = "Check your email for a reset link.";
      } catch (err) {
        errorEl.textContent = "Something went wrong — try again.";
      } finally {
        el.disabled = false; el.textContent = originalLabel;
      }
      return;
    }
    if (action === "do-reset-password") {
      const errorEl = document.getElementById("auth-error");
      errorEl.textContent = "";
      if (!requireSb(errorEl)) return;
      const password = document.getElementById("auth-password").value;
      if (password.length < 12) {
        errorEl.textContent = "Password must be at least 12 characters.";
        return;
      }
      const originalLabel = el.textContent;
      el.disabled = true; el.textContent = "Setting password…";
      try {
        const { error } = await sb.auth.updateUser({ password });
        if (error) { errorEl.textContent = error.message; return; }
        return navigate("#/intake");
      } catch (err) {
        errorEl.textContent = "Something went wrong — try again.";
      } finally {
        el.disabled = false; el.textContent = originalLabel;
      }
      return;
    }

    if (action === "start-research") return startResearch();
    if (action === "go-intake") return navigate("#/intake");
    if (action === "view-leads") return navigate(`#/dashboard/${runId}/leads`);
    if (action === "stop-run") {
      if (!confirm("Stop this run? Whatever's been found so far stays saved, but research stops here.")) return;
      el.disabled = true;
      el.textContent = "Stopping…";
      const errorEl = document.getElementById("stop-run-error");
      try {
        await api(`/api/runs/${runId}/stop`, { method: "POST" });
      } catch (err) {
        if (errorEl) errorEl.textContent = `Couldn't stop the run: ${err.message}`;
        el.disabled = false;
        el.textContent = "Stop run";
        return;
      }
      return render();
    }
    if (action === "open-run") return navigate(el.dataset.status === "running" ? `#/run/${runId}` : `#/dashboard/${runId}/leads`);
    if (action === "dash-tab") { state.dashboardTab[runId] = el.dataset.value; return navigate(`#/dashboard/${runId}/${el.dataset.value}`); }
    if (action === "open-lead") { const rid = parseHash().params.runId; return navigate(`#/lead/${rid}/${leadId}`); }
    if (action === "back-to-leads") return navigate(`#/dashboard/${runId}/leads`);
    if (action === "set-lead-filter") { state.leadFilter = el.dataset.value; return render(); }
    if (action === "email-tab") {
      window.__emailTab = window.__emailTab || {};
      window.__emailTab[leadId] = Number(el.dataset.value);
      const rid = parseHash().params.runId;
      return paintDetail(document.getElementById("app"), rid, currentDetailLead(rid, leadId));
    }

    // Outreach item actions
    const rid = parseHash().params.runId;
    const lead = leadId ? currentDetailLead(rid, leadId) : null;

    if (action === "start-edit") { getUi(leadId, item).mode = "edit"; getUi(leadId, item).draft = null; return paintDetail(document.getElementById("app"), rid, lead); }
    if (action === "cancel-edit") { getUi(leadId, item).mode = "view"; return paintDetail(document.getElementById("app"), rid, lead); }
    if (action === "start-regen") { getUi(leadId, item).mode = "note"; return paintDetail(document.getElementById("app"), rid, lead); }
    if (action === "cancel-regen") { const ui = getUi(leadId, item); ui.mode = "view"; ui.guidance = ""; return paintDetail(document.getElementById("app"), rid, lead); }
    if (action === "dismiss-error") { getUi(leadId, item).mode = "view"; return paintDetail(document.getElementById("app"), rid, lead); }
    if (action === "keep-original") { const ui = getUi(leadId, item); ui.mode = "view"; ui.guidance = ""; ui.proposed = null; return paintDetail(document.getElementById("app"), rid, lead); }

    if (action === "copy-current") {
      const content = getItemContent(lead, item) || {};
      const text = hasSubject(item) ? `${content.subject || ""}\n\n${content.body || ""}` : (content || "");
      copyToClipboard(text, el);
      return;
    }
    if (action === "copy-proposed") {
      const ui = getUi(leadId, item);
      const p = ui.proposed || {};
      const text = hasSubject(item) ? `${p.subject || ""}\n\n${p.body || ""}` : (typeof p === "string" ? p : p.body || "");
      copyToClipboard(text, el);
      return;
    }

    if (action === "save-edit") {
      const ui = getUi(leadId, item);
      const draft = ui.draft || {};
      const content = hasSubject(item) ? { subject: draft.subject || "", body: draft.body || "", personalization_note: draft.note || "" } : (draft.body || "");
      try {
        const updated = await api(`/api/leads/${leadId}/outreach/${item}`, {
          method: "PATCH",
          body: JSON.stringify({ content, provenance: "manual" }),
        });
        updateLeadInCache(rid, updated);
        ui.mode = "view";
        paintDetail(document.getElementById("app"), rid, updated);
      } catch (err) {
        alert(`Couldn't save: ${err.message}`);
      }
      return;
    }

    if (action === "confirm-regen") {
      const ui = getUi(leadId, item);
      ui.mode = "loading";
      paintDetail(document.getElementById("app"), rid, lead);
      try {
        const result = await api(`/api/leads/${leadId}/outreach/${item}/regenerate`, {
          method: "POST",
          body: JSON.stringify({ note: ui.guidance || undefined }),
        });
        state.regenState[leadId] = { remaining: result.remaining, resetAt: result.resetAt };
        ui.mode = "proposed";
        ui.proposed = result.proposed;
      } catch (err) {
        if (err.status === 429) {
          state.regenState[leadId] = { remaining: 0, resetAt: err.body && err.body.resetAt };
          ui.mode = "error";
          ui.errorMessage = `Out of regenerations for this lead until ${fmtTime(err.body && err.body.resetAt)}.`;
        } else {
          ui.mode = "error";
          ui.errorMessage = "Couldn't regenerate — try again. This attempt didn't use one of your regenerations.";
        }
      }
      paintDetail(document.getElementById("app"), rid, lead);
      return;
    }

    if (action === "use-proposed") {
      const ui = getUi(leadId, item);
      const p = ui.proposed;
      const content = hasSubject(item)
        ? { subject: p.subject || "", body: p.body || "", personalization_note: (getItemContent(lead, item) || {}).personalization_note || "" }
        : (typeof p === "string" ? p : p.body || "");
      try {
        const updated = await api(`/api/leads/${leadId}/outreach/${item}`, {
          method: "PATCH",
          body: JSON.stringify({ content, provenance: "regenerated", note: ui.guidance || undefined }),
        });
        updateLeadInCache(rid, updated);
        ui.mode = "view";
        ui.proposed = null;
        ui.guidance = "";
        paintDetail(document.getElementById("app"), rid, updated);
      } catch (err) {
        alert(`Couldn't apply the proposed version: ${err.message}`);
      }
      return;
    }
  });

  // Local (non-persisted) draft-field typing — updates state without a
  // full re-render, so the textarea/input never loses focus mid-keystroke.
  document.addEventListener("input", (e) => {
    const el = e.target;
    const action = el.dataset.action;
    if (!action) return;
    if (action === "draft-subject") { getUi(el.dataset.lead, el.dataset.item).draft.subject = el.value; return; }
    if (action === "draft-body") { getUi(el.dataset.lead, el.dataset.item).draft.body = el.value; return; }
    if (action === "draft-note") { getUi(el.dataset.lead, el.dataset.item).draft.note = el.value; return; }
    if (action === "regen-guidance") { getUi(el.dataset.lead, el.dataset.item).guidance = el.value; return; }
    if (action === "password-strength") {
      const score = passwordStrength(el.value);
      const segs = el.parentElement.parentElement.querySelectorAll(".pw-strength-seg");
      segs.forEach((seg, i) => { seg.style.background = i < score ? "#3D6E58" : "#DAD5C6"; });
      return;
    }
    if (action === "objective-input") {
      const hint = document.getElementById("objective-count-hint");
      if (!hint) return;
      const defaultTarget = appConfig.defaultTargetQualifiedLeads || 10;
      const count = objectiveCompanyCount(el.value);
      hint.textContent = count
        ? `Will search for ${count} companies, as stated in the objective.`
        : `Will search for ${defaultTarget} companies (no count found in the objective — using the default). Start the objective with "Find N ..." to set your own.`;
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    const action = el.dataset.action;
    if (!action) return;
    if (action === "set-lead-sort") { state.leadSort = el.value; render(); return; }
    if (action === "set-audit-tool") { state.auditToolFilter = el.value; render(); return; }
    if (action === "set-audit-status") { state.auditStatusFilter = el.value; render(); return; }
  });

  window.addEventListener("DOMContentLoaded", () => { initAuth().finally(render); });
})();
