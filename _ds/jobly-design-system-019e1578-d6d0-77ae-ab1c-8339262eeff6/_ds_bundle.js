/* @ds-bundle: {"format":4,"namespace":"JoblyDesignSystem_019e15","components":[],"sourceHashes":{"ui_kits/app/App.jsx":"40c1e8c282c2","ui_kits/app/JobCard.jsx":"1be6dcdfc1aa","ui_kits/app/JobDetail.jsx":"9be2934618b6","ui_kits/app/JobsList.jsx":"157bb734869b","ui_kits/app/Primitives.jsx":"2196d6512787","ui_kits/app/Sidebar.jsx":"4fe488298845"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.JoblyDesignSystem_019e15 = window.JoblyDesignSystem_019e15 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/app/App.jsx
try { (() => {
const {
  useState,
  useMemo
} = React;
const JOBS = [{
  id: 'j1',
  role: 'Staff Product Designer',
  company: 'Linear',
  color: '#5E6AD2',
  location: 'Remote (US)',
  salary: '$190k–$240k',
  posted: 'Posted 2d ago',
  team: 'Design',
  score: 91,
  status: 'ready',
  applied: false,
  description: 'Lead end-to-end design on Linear\'s core surface — the issue tracker that millions of engineers use daily. You\'ll partner directly with our founders to refine interaction patterns, drive visual polish, and shape the next generation of project management primitives.',
  requirements: ['6+ years designing complex product surfaces', 'Track record shipping high-craft B2B SaaS', 'Comfortable working from systems-first principles', 'Strong opinions on density, keyboard UX, and motion'],
  matchDetail: [{
    label: 'Skills',
    value: 95,
    note: 'Figma, prototyping, design systems — all matched'
  }, {
    label: 'Seniority',
    value: 88,
    note: 'Staff level matches your 7 yrs experience'
  }, {
    label: 'Compensation',
    value: 92,
    note: 'Above your $175k floor'
  }, {
    label: 'Location',
    value: 90,
    note: 'Remote US — your preferred mode'
  }]
}, {
  id: 'j2',
  role: 'Senior Frontend Engineer',
  company: 'Vercel',
  color: '#000',
  location: 'Remote',
  salary: '$190k–$240k',
  posted: 'Posted 6h ago',
  team: 'Platform',
  score: 84,
  status: 'ready',
  applied: false,
  description: 'Ship the platform that ships the web. Work across our dashboard, build pipeline UI, and Next.js integrations.',
  requirements: ['5+ years React/Next.js', 'Performance-first mindset', 'CSS architecture experience'],
  matchDetail: [{
    label: 'Skills',
    value: 90
  }, {
    label: 'Seniority',
    value: 80
  }, {
    label: 'Compensation',
    value: 85
  }, {
    label: 'Location',
    value: 90
  }]
}, {
  id: 'j3',
  role: 'Design Engineer',
  company: 'Stripe',
  color: '#635BFF',
  location: 'San Francisco · Hybrid',
  salary: '$200k–$260k',
  posted: 'Posted 1d ago',
  team: 'Platform UX',
  score: 76,
  status: 'ready',
  applied: true,
  appliedAt: '2h ago',
  description: 'Bridge design and engineering. Own the polish and prototyping for high-stakes payment flows.',
  requirements: ['Equal parts designer and engineer', 'React + animation chops', 'Eye for typography'],
  matchDetail: [{
    label: 'Skills',
    value: 88
  }, {
    label: 'Seniority',
    value: 75
  }, {
    label: 'Compensation',
    value: 92
  }, {
    label: 'Location',
    value: 50,
    note: 'Hybrid SF — outside your remote preference'
  }]
}, {
  id: 'j4',
  role: 'Product Designer, Growth',
  company: 'Notion',
  color: '#000',
  location: 'New York · On-site',
  salary: '$160k–$200k',
  posted: 'Posted 3d ago',
  team: 'Growth',
  score: 58,
  status: 'low',
  applied: false,
  description: 'Run experiments across onboarding, activation, and pricing surfaces.',
  requirements: ['Growth design experience', 'Comfortable A/B testing', '3+ yrs'],
  matchDetail: [{
    label: 'Skills',
    value: 72
  }, {
    label: 'Seniority',
    value: 60
  }, {
    label: 'Compensation',
    value: 70
  }, {
    label: 'Location',
    value: 30,
    note: 'NYC on-site — flagged'
  }]
}, {
  id: 'j5',
  role: 'UX Researcher (Quant)',
  company: 'Figma',
  color: '#F24E1E',
  location: 'Remote (US)',
  salary: '$160k–$210k',
  posted: 'Posted 5d ago',
  team: 'Research',
  score: 42,
  status: 'failed',
  applied: false,
  description: 'Quantitative research role — design signal, large-scale studies, statistical rigor.',
  requirements: ['Strong quant/stats background', 'PhD or equivalent', '4+ yrs in research roles'],
  matchDetail: [{
    label: 'Skills',
    value: 35,
    note: 'Research stack is a stretch'
  }, {
    label: 'Seniority',
    value: 55
  }, {
    label: 'Compensation',
    value: 70
  }, {
    label: 'Location',
    value: 90
  }]
}, {
  id: 'j6',
  role: 'Senior Designer, Mobile',
  company: 'Arc',
  color: '#FF5A21',
  location: 'Remote (US)',
  salary: '$175k–$220k',
  posted: 'Processing…',
  team: 'Mobile',
  score: 0,
  status: 'processing',
  applied: false,
  description: 'Design the next chapter of mobile browsing.',
  requirements: ['Native iOS or Android design', 'Strong portfolio', 'Comfort with ambiguity'],
  matchDetail: []
}];
function Toast({
  toasts
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 16,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 100
    }
  }, toasts.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 280,
      animation: 'jobly-toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      flex: 'none',
      background: t.kind === 'success' ? 'var(--success-subtle)' : 'var(--info-subtle)',
      color: t.kind === 'success' ? 'var(--success)' : 'var(--info)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 10
  })), t.message)));
}
function App() {
  const [route, setRoute] = useState('inbox');
  const [jobs, setJobs] = useState(JOBS);
  const [selectedId, setSelectedId] = useState('j1');
  const [toasts, setToasts] = useState([]);
  const pushToast = (message, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, {
      id,
      message,
      kind
    }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3000);
  };
  const counts = useMemo(() => ({
    inbox: jobs.filter(j => !j.applied && j.status !== 'failed').length,
    applied: jobs.filter(j => j.applied).length,
    saved: 4
  }), [jobs]);
  const filtered = useMemo(() => {
    if (route === 'applied') return jobs.filter(j => j.applied);
    if (route === 'inbox') return jobs.filter(j => !j.applied);
    return jobs;
  }, [route, jobs]);
  const selected = jobs.find(j => j.id === selectedId);
  const onApply = () => {
    setJobs(js => js.map(j => j.id === selectedId ? {
      ...j,
      applied: true,
      appliedAt: 'just now'
    } : j));
    pushToast(`Application submitted to ${selected.company}`);
  };
  const onWithdraw = () => {
    setJobs(js => js.map(j => j.id === selectedId ? {
      ...j,
      applied: false
    } : j));
    pushToast(`Withdrew from ${selected.company}`, 'info');
  };
  const pageTitle = {
    inbox: 'Inbox',
    jobs: 'All jobs',
    applied: 'Applied',
    saved: 'Saved',
    profile: 'Profile',
    settings: 'Settings'
  }[route];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-app)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    route: route,
    setRoute: setRoute,
    counts: counts
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 56,
      padding: '0 24px',
      flex: 'none',
      borderBottom: '1px solid var(--border-faint)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: 'var(--text-primary)'
    }
  }, pageTitle), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, filtered.length, " jobs"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-secondary)',
      minWidth: 220
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), "Search jobs, companies, skills\u2026", /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-tertiary)'
    }
  }, "\u2318K")), /*#__PURE__*/React.createElement(IconButton, {
    name: "bell",
    ariaLabel: "notifications"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: "sparkle"
  }, "Auto-apply"))), route === 'inbox' || route === 'jobs' || route === 'applied' ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(JobsList, {
    jobs: filtered,
    selectedId: selectedId,
    onSelect: setSelectedId
  }), /*#__PURE__*/React.createElement(JobDetail, {
    job: filtered.find(j => j.id === selectedId) || filtered[0],
    onClose: () => {},
    onApply: onApply,
    onWithdraw: onWithdraw
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--text-tertiary)',
      fontSize: 13
    }
  }, pageTitle, " \u2014 placeholder")), /*#__PURE__*/React.createElement(Toast, {
    toasts: toasts
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/JobCard.jsx
try { (() => {
const {
  useState
} = React;
function JobCard({
  job,
  selected,
  onClick
}) {
  const [hover, setHover] = useState(false);
  const scoreColor = job.score >= 70 ? 'var(--success)' : job.score >= 50 ? 'var(--warning)' : 'var(--error)';
  const border = selected ? 'var(--border-strong)' : hover ? 'var(--border-default)' : 'var(--border-faint)';
  const bg = selected ? 'var(--bg-surface)' : hover ? 'var(--bg-surface)' : 'var(--bg-subtle)';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: 14,
      cursor: 'pointer',
      transition: 'border-color 120ms cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 6,
      background: job.color || 'var(--bg-overlay)',
      display: 'grid',
      placeItems: 'center',
      color: 'white',
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      flex: 'none'
    }
  }, job.company.slice(0, 1)), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, job.role), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, job.company, " \xB7 ", job.location))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    status: job.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 500,
      color: scoreColor
    }
  }, job.score, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, job.applied ? /*#__PURE__*/React.createElement(Badge, null, "Applied") : job.score >= 70 ? /*#__PURE__*/React.createElement(Badge, {
    variant: "recommended",
    dot: true
  }, "Recommended") : job.score >= 50 ? /*#__PURE__*/React.createElement(Badge, {
    variant: "low",
    dot: true
  }, "Low match") : /*#__PURE__*/React.createElement(Badge, {
    variant: "failed",
    dot: true
  }, "Poor fit"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, job.salary)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, job.posted)));
}
window.JobCard = JobCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/JobCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/JobDetail.jsx
try { (() => {
function MatchBreakdown({
  criteria
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, criteria.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, c.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: c.value >= 70 ? 'var(--success)' : c.value >= 50 ? 'var(--warning)' : 'var(--error)'
    }
  }, c.value, "%")), /*#__PURE__*/React.createElement(ProgressBar, {
    value: c.value
  }), c.note && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 6
    }
  }, c.note))));
}
function JobDetail({
  job,
  onClose,
  onApply,
  onWithdraw
}) {
  if (!job) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 13
      }
    }, "Select a job to see details");
  }
  const scoreColor = job.score >= 70 ? 'var(--success)' : job.score >= 50 ? 'var(--warning)' : 'var(--error)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-faint)',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      padding: '0 20px',
      borderBottom: '1px solid var(--border-faint)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "chevronLeft",
    onClick: onClose,
    ariaLabel: "close"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "bookmark"
  }, "Save"), job.applied ? /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: onWithdraw
  }, "Withdraw") : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: "bolt",
    onClick: onApply
  }, "Apply with Jobly"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 8,
      background: job.color || 'var(--bg-overlay)',
      display: 'grid',
      placeItems: 'center',
      color: 'white',
      fontSize: 18,
      fontWeight: 600,
      fontFamily: 'var(--font-display)',
      flex: 'none'
    }
  }, job.company.slice(0, 1)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: 'var(--text-primary)'
    }
  }, job.role), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, job.company, " \xB7 ", job.location, " \xB7 ", job.salary), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, job.applied ? /*#__PURE__*/React.createElement(Badge, null, "Applied ", job.appliedAt || 'just now') : job.score >= 70 ? /*#__PURE__*/React.createElement(Badge, {
    variant: "recommended",
    dot: true
  }, "Recommended") : job.score >= 50 ? /*#__PURE__*/React.createElement(Badge, {
    variant: "low",
    dot: true
  }, "Low match") : /*#__PURE__*/React.createElement(Badge, {
    variant: "failed",
    dot: true
  }, "Poor fit"), /*#__PURE__*/React.createElement(Badge, null, job.posted), /*#__PURE__*/React.createElement(Badge, null, job.team))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 28,
      fontWeight: 600,
      color: scoreColor,
      lineHeight: 1
    }
  }, job.score, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "Match score"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-app)',
      border: '1px solid var(--border-faint)',
      borderRadius: 8,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 14
    }
  }, "Match breakdown"), /*#__PURE__*/React.createElement(MatchBreakdown, {
    criteria: job.matchDetail
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "About the role"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.6,
      color: 'var(--text-secondary)'
    }
  }, job.description)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "Requirements"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 18,
      fontSize: 13,
      lineHeight: 1.7,
      color: 'var(--text-secondary)'
    }
  }, job.requirements.map((r, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, r))))));
}
window.JobDetail = JobDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/JobDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/JobsList.jsx
try { (() => {
const {
  useState
} = React;
function FilterPill({
  label,
  value,
  onClick
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: hover ? 'var(--bg-overlay)' : 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
      borderRadius: 6,
      padding: '6px 10px',
      fontSize: 12,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)'
    }
  }, label, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)'
    }
  }, value), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 12
  }));
}
function JobsList({
  jobs,
  selectedId,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      borderBottom: '1px solid var(--border-faint)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(FilterPill, {
    label: "Role",
    value: "Design"
  }), /*#__PURE__*/React.createElement(FilterPill, {
    label: "Location",
    value: "Remote"
  }), /*#__PURE__*/React.createElement(FilterPill, {
    label: "Match",
    value: "\u2265 50%"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, jobs.length, " jobs"), /*#__PURE__*/React.createElement(IconButton, {
    name: "sliders",
    ariaLabel: "sort"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, jobs.map(j => /*#__PURE__*/React.createElement(JobCard, {
    key: j.id,
    job: j,
    selected: j.id === selectedId,
    onClick: () => onSelect(j.id)
  }))));
}
window.JobsList = JobsList;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/JobsList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Primitives.jsx
try { (() => {
// Primitives: Button, Badge, StatusDot, ProgressBar, Icon
const {
  useEffect,
  useState,
  useMemo,
  useRef
} = React;

// --- Icon (Lucide-style 1.5 stroke) -----------------------------------------
function Icon({
  name,
  size = 16,
  color = 'currentColor'
}) {
  const paths = {
    home: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 12l9-9 9 9M5 10v10h14V10"
    })),
    inbox: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 12h-6l-2 3h-4l-2-3H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"
    })),
    briefcase: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "6",
      width: "18",
      height: "14",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 6V4h8v2"
    })),
    check: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 12l2 2 4-4"
    })),
    user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 21c0-4 4-7 8-7s8 3 8 7"
    })),
    cog: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
    })),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 21l-5-5"
    })),
    plus: /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    }),
    chevronDown: /*#__PURE__*/React.createElement("path", {
      d: "M6 9l6 6 6-6"
    }),
    chevronLeft: /*#__PURE__*/React.createElement("path", {
      d: "M15 18l-6-6 6-6"
    }),
    x: /*#__PURE__*/React.createElement("path", {
      d: "M6 6l12 12M6 18L18 6"
    }),
    bookmark: /*#__PURE__*/React.createElement("path", {
      d: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
    }),
    sparkle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
    })),
    arrowRight: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14M13 5l7 7-7 7"
    })),
    mapPin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "3"
    })),
    bolt: /*#__PURE__*/React.createElement("path", {
      d: "M13 2L3 14h7l-1 8 10-12h-7l1-8z"
    }),
    bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M13.7 21a2 2 0 01-3.4 0"
    })),
    filter: /*#__PURE__*/React.createElement("path", {
      d: "M22 3H2l8 9.5V19l4 2v-8.5L22 3z"
    }),
    sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "4",
      cy: "12",
      r: "2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "20",
      cy: "14",
      r: "2"
    }))
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none'
    }
  }, paths[name] || null);
}

// --- Button ----------------------------------------------------------------
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  onClick,
  disabled,
  style
}) {
  const base = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: size === 'sm' ? 13 : 14,
    lineHeight: 1.2,
    padding: size === 'sm' ? '6px 10px' : '8px 16px',
    borderRadius: 6,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    opacity: disabled ? 0.4 : 1,
    transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
    ...style
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#fff'
    },
    ghost: {
      background: 'transparent',
      borderColor: 'var(--border-default)',
      color: 'var(--text-secondary)'
    },
    destructive: {
      background: 'var(--error)',
      color: '#fff'
    },
    plain: {
      background: 'transparent',
      color: 'var(--text-secondary)'
    }
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = !disabled && hover ? {
    primary: {
      background: 'var(--accent-hover)'
    },
    ghost: {
      background: 'var(--bg-overlay)',
      color: 'var(--text-primary)'
    },
    destructive: {
      filter: 'brightness(0.92)'
    },
    plain: {
      background: 'var(--bg-overlay)',
      color: 'var(--text-primary)'
    }
  }[variant] : {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...variants[variant],
      ...hoverStyle
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    size: 14
  }));
}
function IconButton({
  name,
  onClick,
  ariaLabel
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": ariaLabel,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 32,
      height: 32,
      borderRadius: 6,
      border: 0,
      cursor: 'pointer',
      display: 'grid',
      placeItems: 'center',
      background: hover ? 'var(--bg-overlay)' : 'transparent',
      color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
      transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: name,
    size: 16
  }));
}

// --- Badge -----------------------------------------------------------------
function Badge({
  variant = 'neutral',
  dot,
  children
}) {
  const map = {
    neutral: {
      bg: 'var(--bg-overlay)',
      fg: 'var(--text-secondary)',
      bd: 'var(--border-default)',
      dot: 'var(--text-secondary)'
    },
    recommended: {
      bg: 'var(--success-subtle)',
      fg: 'var(--success)',
      bd: '#1d3d2b',
      dot: 'var(--success)'
    },
    low: {
      bg: 'var(--warning-subtle)',
      fg: 'var(--warning)',
      bd: '#3d2e0c',
      dot: 'var(--warning)'
    },
    failed: {
      bg: 'var(--error-subtle)',
      fg: 'var(--error)',
      bd: '#3d1311',
      dot: 'var(--error)'
    },
    processing: {
      bg: 'var(--info-subtle)',
      fg: 'var(--info)',
      bd: '#142d44',
      dot: 'var(--info)'
    }
  };
  const c = map[variant] || map.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.bd}`,
      fontSize: 11,
      fontWeight: 500,
      padding: '3px 8px',
      borderRadius: 4,
      lineHeight: 1.2,
      whiteSpace: 'nowrap'
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: c.dot
    }
  }), children);
}

// --- Status dot ------------------------------------------------------------
function StatusDot({
  status
}) {
  const map = {
    processing: {
      color: 'var(--info)',
      pulse: true
    },
    ready: {
      color: 'var(--success)',
      pulse: false
    },
    low: {
      color: 'var(--warning)',
      pulse: false
    },
    failed: {
      color: 'var(--error)',
      pulse: false
    }
  };
  const c = map[status];
  if (!c) return null;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: c.color,
      flex: 'none',
      boxShadow: c.pulse ? `0 0 0 3px ${c.color}33` : 'none',
      animation: c.pulse ? 'jobly-pulse 1.2s ease-in-out infinite' : 'none'
    }
  });
}

// --- Progress bar ----------------------------------------------------------
function ProgressBar({
  value,
  color
}) {
  const fill = color || (value >= 70 ? 'var(--success)' : value >= 50 ? 'var(--warning)' : 'var(--error)');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: 'var(--bg-overlay)',
      borderRadius: 99,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${value}%`,
      height: '100%',
      background: fill,
      borderRadius: 99,
      transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }));
}
Object.assign(window, {
  Icon,
  Button,
  IconButton,
  Badge,
  StatusDot,
  ProgressBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Sidebar.jsx
try { (() => {
const {
  useState
} = React;
function Sidebar({
  route,
  setRoute,
  counts
}) {
  const sections = [{
    items: [{
      key: 'inbox',
      label: 'Inbox',
      icon: 'inbox',
      count: counts.inbox
    }, {
      key: 'jobs',
      label: 'Jobs',
      icon: 'briefcase'
    }, {
      key: 'applied',
      label: 'Applied',
      icon: 'check',
      count: counts.applied
    }, {
      key: 'saved',
      label: 'Saved',
      icon: 'bookmark',
      count: counts.saved
    }]
  }, {
    title: 'Workspace',
    items: [{
      key: 'profile',
      label: 'Profile',
      icon: 'user'
    }, {
      key: 'settings',
      label: 'Settings',
      icon: 'cog'
    }]
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 220,
      background: 'var(--bg-subtle)',
      borderRight: '1px solid var(--border-faint)',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 10px',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 6px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 6,
      background: 'var(--accent)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'white',
      fontWeight: 700,
      fontSize: 13,
      fontFamily: 'var(--font-display)'
    }
  }, "J")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "Jobly"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "sliders",
    ariaLabel: "settings"
  }))), sections.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, s.title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      padding: '14px 8px 6px'
    }
  }, s.title), s.items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.key,
    item: it,
    active: route === it.key,
    onClick: () => setRoute(it.key)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '10px 6px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: 'var(--accent-muted)',
      display: 'grid',
      placeItems: 'center',
      color: 'white',
      fontSize: 11,
      fontWeight: 600
    }
  }, "AM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-primary)'
    }
  }, "Alex Morgan")));
}
function NavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = useState(false);
  const bg = active ? 'var(--accent-subtle)' : hover ? 'var(--bg-overlay)' : 'transparent';
  const color = active ? 'var(--text-primary)' : hover ? 'var(--text-primary)' : 'var(--text-secondary)';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 6,
      fontSize: 13,
      color,
      background: bg,
      cursor: 'pointer',
      transition: 'background 120ms cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }, active && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: -10,
      top: 6,
      bottom: 6,
      width: 2,
      background: 'var(--accent)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-mono)'
    }
  }, item.count));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Sidebar.jsx", error: String((e && e.message) || e) }); }

})();
