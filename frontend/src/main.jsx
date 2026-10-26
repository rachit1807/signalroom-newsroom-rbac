import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Sun,
  Moon,
  PenLine,
  Radio,
  Layers3,
  ShieldCheck,
  LogOut,
  Search,
  Check,
  Send,
  Eye,
  Clock3,
  X,
  ChevronDown,
  FileText,
  Users,
  Activity,
  LockKeyhole,
  Save,
  Trash2,
  MessageSquare,
  GitCompare,
  Download,
  Menu,
  RefreshCw,
  BookOpen,
  Settings,
  AlertCircle,
  CheckCheck,
  CornerDownRight,
} from "lucide-react";
import RoleGuard from "./components/RoleGuard";
import "./styles.css";
const titles = {
  draft: "Draft",
  review: "In review",
  changes: "Changes requested",
  approved: "Ready to publish",
  published: "Published",
  withdrawn: "Withdrawn",
};
const roleText = {
  reporter: "Find the story. Make it matter.",
  editor: "A sharper lens. A stronger story.",
  publisher: "The final word before the world.",
  admin: "Good journalism starts with clear boundaries.",
};
const sections = [
  "City",
  "Culture",
  "Science",
  "Technology",
  "Opinion",
  "World",
];
const date = (v) =>
  new Date(v).toLocaleDateString("en", { day: "numeric", month: "short" });
const words = (v) => v.trim().split(/\s+/).filter(Boolean).length;
async function api(path, options = {}) {
  const r = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) {
    const e = new Error(data.error || "Something went wrong.");
    e.status = r.status;
    throw e;
  }
  return data;
}
function WebField({ large = false }) {
  return (
    <div
      className={"web-field " + (large ? "web-large" : "")}
      aria-hidden="true"
    >
      <div className="web-glow" />
      <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="webFade">
            <stop stopColor="white" stopOpacity=".8" />
            <stop offset="1" stopColor="white" stopOpacity=".02" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="url(#webFade)" strokeWidth="1.2">
          {Array.from({ length: 16 }, (_, i) => {
            let a = (i * Math.PI) / 8;
            return (
              <path
                key={"r" + i}
                d={`M 680 260 L ${680 + 1000 * Math.cos(a)} ${260 + 1000 * Math.sin(a)}`}
              />
            );
          })}
          {[60, 115, 185, 270, 370, 490, 630, 800].map((r, i) => (
            <path
              key={i}
              d={Array.from({ length: 17 }, (_, j) => {
                let a = (j * Math.PI) / 8;
                return `${j ? "L" : "M"}${680 + r * Math.cos(a)} ${260 + r * 0.78 * Math.sin(a)}`;
              }).join(" ")}
            />
          ))}
        </g>
        <g className="web-cross" fill="none" stroke="white" strokeWidth="2">
          <path d="M0 620Q450 180 1000 200M150 800Q500 280 990 70M0 100Q650 550 900 800" />
        </g>
      </svg>
      <div className="web-dust one" />
      <div className="web-dust two" />
      <div className="web-dust three" />
    </div>
  );
}
function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="SignalRoom home">
      <span className="brand-mark">
        s<span />
      </span>
      <span>
        signal<span className="brand-light">room</span>
        <small>INDEPENDENT MINDS. CONNECTED.</small>
      </span>
    </button>
  );
}
function Action({ children, icon: Icon = ArrowUpRight, kind = "", ...props }) {
  return (
    <button className={"action " + kind} {...props}>
      <span>{children}</span>
      {Icon && <Icon size={18} />}
    </button>
  );
}
function Tag({ status }) {
  return (
    <span className={"tag " + status}>
      <i />
      {titles[status] || status}
    </span>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(true),
    [view, setView] = useState("desk"),
    [stories, setStories] = useState([]),
    [events, setEvents] = useState([]),
    [wire, setWire] = useState([]),
    [users, setUsers] = useState([]),
    [story, setStory] = useState(null),
    [form, setForm] = useState(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [section, setSection] = useState("all"),
    [auth, setAuth] = useState(null),
    [modal, setModal] = useState(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [preview, setPreview] = useState(false),
    [history, setHistory] = useState(false),
    [readStory, setReadStory] = useState(null),
    [roleOpen, setRoleOpen] = useState(false),
    [theme, setTheme] = useState(
      document.documentElement.dataset.theme || "light",
    );
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 4200);
  };
  const showError = (e) => {
    setError(e.message);
    if (e.status === 401) {
      setUser(null);
      setStory(null);
      setAuth("login");
    }
  };
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("signalroom-theme", theme);
  }, [theme]);
  const refresh = async () => {
    if (!user) return;
    const [a, b] = await Promise.all([api("/stories"), api("/activity")]);
    setStories(a.stories);
    setEvents(b.events);
  };
  useEffect(() => {
    if (user) refresh().catch(showError);
  }, [user]);
  useEffect(() => {
    if (view === "wire")
      api("/wire")
        .then((d) => setWire(d.stories))
        .catch(showError);
    if (view === "people" && user?.role === "admin")
      api("/admin/users")
        .then((d) => setUsers(d.users))
        .catch(showError);
  }, [view, user]);
  const dirty =
    story &&
    form &&
    (form.title !== story.title ||
      form.body !== story.body ||
      form.dek !== story.dek ||
      form.section !== story.section);
  useEffect(() => {
    const f = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  function navigate(v) {
    if (
      dirty &&
      !window.confirm("Leave this story without saving your changes?")
    )
      return;
    setStory(null);
    setForm(null);
    setView(v);
    setError("");
    setRoleOpen(false);
  }
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  const demo = (role) =>
    run(async () => {
      if (dirty && !window.confirm("Switch roles without saving your changes?"))
        return;
      const d = await api("/demo", { method: "POST", body: { role } });
      setUser(d.user);
      setAuth(null);
      setStory(null);
      setForm(null);
      setView("desk");
      setRoleOpen(false);
      flash("You are now in the " + role + " demo workspace.");
    });
  const openStory = (id) =>
    run(async () => {
      if (dirty && !window.confirm("Leave without saving?")) return;
      const d = await api("/stories/" + id);
      setStory(d.story);
      setForm({
        title: d.story.title,
        dek: d.story.dek,
        body: d.story.body,
        section: d.story.section,
      });
      setPreview(false);
      setHistory(false);
      setView("desk");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  const create = () =>
    run(async () => {
      const d = await api("/stories", {
        method: "POST",
        body: { title: "Untitled story", section: "City" },
      });
      setStory(d.story);
      setForm({ title: d.story.title, dek: "", body: "", section: "City" });
      setView("desk");
      await refresh();
    });
  const act = (action, extra = {}) =>
    run(async () => {
      if (dirty && action !== "save")
        throw new Error("Save your changes before continuing.");
      const d = await api(`/stories/${story.id}/actions/${action}`, {
        method: "POST",
        body: {
          version: story.version,
          ...(action === "save" ? form : {}),
          ...extra,
        },
      });
      setStory(d.story);
      setForm({
        title: d.story.title,
        dek: d.story.dek,
        body: d.story.body,
        section: d.story.section,
      });
      setModal(null);
      setNote("");
      await refresh();
      flash(
        {
          save: "Revision saved.",
          submit: "Sent to the editorial desk.",
          approve: "Revision approved.",
          changes: "Changes requested.",
          publish: "Your story is live on the wire.",
          correct: "Correction published.",
          withdraw: "Story withdrawn.",
          reopen: "Story returned to draft.",
        }[action],
      );
    });
  const logout = () =>
    run(async () => {
      if (dirty && !window.confirm("Sign out without saving?")) return;
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setStory(null);
      setForm(null);
      setView("desk");
      flash("Signed out.");
    });
  const toggle = (
    <button
      className="icon-btn theme-toggle"
      aria-label={
        "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
      }
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  );
  const notifications = (
    <>
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </>
  );
  const filtered = stories.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (section === "all" || t.section === section) &&
      `${t.title} ${t.dek} ${t.author}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const canWrite =
    user &&
    (story?.authorId === user.id || user.role === "admin") &&
    ["draft", "changes", "approved"].includes(story?.status);
  const tabs = [
    ["desk", "The desk", PenLine],
    ["wire", "The wire", Radio],
    ["activity", "Activity", Activity],
    ...(user?.role === "admin" ? [["people", "People", Users]] : []),
  ];
  if (boot)
    return (
      <div className="loading-screen">
        <span className="brand-mark">s</span>
        <p>Connecting the newsroom…</p>
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!user ? (
        <>
          <header className="site-header">
            <Brand
              onClick={() => {
                setAuth(null);
                setView("desk");
              }}
            />
            <div className="header-actions">
              <button className="text-btn" onClick={() => setView("wire")}>
                Read the wire <ArrowUpRight size={15} />
              </button>
              {toggle}
              <Action kind="small outline" onClick={() => setAuth("login")}>
                Enter newsroom
              </Action>
            </div>
          </header>
          <main id="main">
            {view === "wire" ? (
              <PublicWire
                wire={wire}
                onRead={setReadStory}
                onBack={() => setView("desk")}
              />
            ) : (
              <>
                <section className="landing-hero">
                  <div className="hero-copy">
                    <div className="eyebrow">
                      <span className="live-dot" /> THE INDEPENDENT NEWSROOM{" "}
                      <span className="edition">VOL. 01 / EST. 2026</span>
                    </div>
                    <h1>
                      Every story
                      <br />
                      starts with
                      <br />
                      <em>a signal.</em>
                      <span className="headline-star">✳</span>
                    </h1>
                    <p>
                      A place for curious minds and considered words.
                      <br className="desktop-break" /> From your first draft to
                      the world’s next conversation.
                    </p>
                    <div className="hero-actions">
                      <Action onClick={() => demo("reporter")} disabled={busy}>
                        Explore the newsroom
                      </Action>
                      <button
                        className="text-btn"
                        onClick={() => setAuth("register")}
                      >
                        Create your account <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="hero-footnote">
                      <span className="avatar-stack">
                        <i>AM</i>
                        <i>SR</i>
                        <i>JL</i>
                      </span>
                      <span>
                        Different perspectives.
                        <br />
                        <strong>One connected newsroom.</strong>
                      </span>
                      <span className="hero-rule" />
                      <span className="mono">
                        WRITE. REFINE.
                        <br />
                        RELEASE.
                      </span>
                    </div>
                  </div>
                  <div className="hero-art">
                    <WebField large />
                    <span className="art-coordinate">
                      40°42′ N / STORIES EVERYWHERE
                    </span>
                    <div className="hanging-thread" />
                    <div className="signal-card">
                      <div className="signal-card-top">
                        <span className="mono">ON THE RADAR</span>
                        <Radio size={19} />
                      </div>
                      <span className="card-issue">01</span>
                      <h2>
                        The city never
                        <br />
                        runs out of
                        <br />
                        <em>stories.</em>
                      </h2>
                      <div className="signal-card-bottom">
                        <span>Neither should you.</span>
                        <ArrowUpRight size={24} />
                      </div>
                    </div>
                    <div className="orbit-label">
                      <span className="live-dot" /> A NEW PERSPECTIVE
                    </div>
                    <div className="art-bottom">
                      <span>FOLLOW THE THREAD.</span>
                      <span>↓</span>
                    </div>
                    <div className="web-eye left" />
                    <div className="web-eye right" />
                  </div>
                </section>
                <div className="ticker" aria-hidden="true">
                  <div>
                    {Array.from({ length: 4 }, (_, i) => (
                      <span key={i}>
                        FIND THE ANGLE <b>✳</b> CONNECT THE DOTS <b>✳</b> MAKE
                        IT MATTER <b>✳</b>
                      </span>
                    ))}
                  </div>
                </div>
                <section className="workflow-section">
                  <div>
                    <span className="eyebrow">A CLEAR PATH TO PUBLICATION</span>
                    <h2>
                      Good stories take
                      <br />
                      <em>more than one voice.</em>
                    </h2>
                    <p>
                      Four perspectives. One deliberate process.
                      <br />
                      Every handoff has a purpose.
                    </p>
                  </div>
                  <div className="workflow-steps">
                    {[
                      [
                        "01",
                        "Report",
                        "Follow your curiosity. Shape your first draft.",
                        PenLine,
                      ],
                      [
                        "02",
                        "Refine",
                        "An independent editor challenges every detail.",
                        GitCompare,
                      ],
                      [
                        "03",
                        "Release",
                        "An approved revision finds its audience.",
                        Radio,
                      ],
                    ].map(([n, t, d, I]) => (
                      <div className="workflow-step" key={n}>
                        <span className="step-num">{n}</span>
                        <I size={24} />
                        <h3>{t}</h3>
                        <p>{d}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="role-section">
                  <div>
                    <span className="eyebrow">
                      STEP INTO A DIFFERENT PERSPECTIVE
                    </span>
                    <h2>Try the whole newsroom.</h2>
                    <p>An isolated sample workspace. No account required.</p>
                  </div>
                  <div className="role-options">
                    {["reporter", "editor", "publisher", "admin"].map(
                      (r, i) => (
                        <button disabled={busy} key={r} onClick={() => demo(r)}>
                          <span className="mono">0{i + 1}</span>
                          <strong>{r === "admin" ? "Administrator" : r}</strong>
                          <ArrowUpRight size={20} />
                        </button>
                      ),
                    )}
                  </div>
                </section>
              </>
            )}
          </main>
          <footer className="site-footer">
            <span>
              © {new Date().getFullYear()} SignalRoom · Built by Rachit Tripathi
            </span>
            <span>Thoughtful stories. Responsible publishing.</span>
            <a
              href="https://github.com/rachit1807/signalroom-newsroom-rbac"
              target="_blank"
              rel="noreferrer"
            >
              Source <ArrowUpRight size={13} />
            </a>
          </footer>
        </>
      ) : (
        <>
          <header className="app-header">
            <Brand onClick={() => navigate("desk")} />
            <nav aria-label="Newsroom navigation">
              {tabs.map(([key, label, I]) => (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={view === key ? "active" : ""}
                >
                  <I size={16} />
                  <span>{label}</span>
                  {key === "desk" && <small>{stories.length}</small>}
                </button>
              ))}
            </nav>
            <div className="header-actions">
              {toggle}
              <button
                className="account-button"
                onClick={() => setModal("profile")}
                aria-label="Account settings"
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="account-label">
                  {user.name}
                  <small>{user.role}</small>
                </span>
              </button>
              <button
                className="icon-btn"
                aria-label="Sign out"
                onClick={logout}
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>
          {user.demo && (
            <div className="demo-strip">
              <span>
                <i /> DEMO NEWSROOM{" "}
                <span className="demo-description">
                  Your private sample workspace · resets after 24 hours
                </span>
              </span>
              <div className="role-switch">
                <button
                  aria-expanded={roleOpen}
                  onClick={() => setRoleOpen(!roleOpen)}
                >
                  Viewing as <b>{user.role}</b>
                  <ChevronDown size={14} />
                </button>
                {roleOpen && (
                  <div className="role-menu">
                    {["reporter", "editor", "publisher", "admin"].map((r) => (
                      <button key={r} disabled={busy} onClick={() => demo(r)}>
                        {r}
                        {r === user.role && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <main id="main" className="app-main">
            {notifications}
            {view === "desk" && !story && (
              <>
                <section className="desk-intro">
                  <div>
                    <span className="eyebrow">
                      {new Date().toLocaleDateString("en", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      <span className="intro-slash">/</span>{" "}
                      {user.role.toUpperCase()} EDITION
                    </span>
                    <h1>
                      {user.role === "reporter"
                        ? "Your next great story."
                        : user.role === "editor"
                          ? "The editorial lens."
                          : user.role === "publisher"
                            ? "Ready for the world."
                            : "The connected newsroom."}
                    </h1>
                    <p>{roleText[user.role]}</p>
                  </div>
                  <RoleGuard user={user} allow={["reporter", "admin"]}>
                    <Action icon={Plus} onClick={create} disabled={busy}>
                      Start a story
                    </Action>
                  </RoleGuard>
                  <div className="intro-web" aria-hidden="true">
                    <WebField />
                  </div>
                </section>
                <div className="desk-layout">
                  <aside className="desk-index">
                    <div className="index-heading">
                      <Layers3 size={17} />
                      <span>THE STORY INDEX</span>
                    </div>
                    <button
                      className={filter === "all" ? "selected" : ""}
                      onClick={() => setFilter("all")}
                    >
                      <span>All stories</span>
                      <b>{stories.length}</b>
                    </button>
                    {Object.entries(titles).map(([s, label]) => (
                      <button
                        className={filter === s ? "selected" : ""}
                        key={s}
                        onClick={() => setFilter(s)}
                      >
                        <span>
                          <i className={"status-dot " + s} />
                          {label}
                        </span>
                        <b>{stories.filter((t) => t.status === s).length}</b>
                      </button>
                    ))}
                    <div className="index-note">
                      <ShieldCheck size={24} />
                      <strong>Your role, clearly defined.</strong>
                      <p>
                        {user.role === "reporter"
                          ? "Your drafts are private. An editor reviews your work before a publisher releases it."
                          : user.role === "editor"
                            ? "Review a specific revision. Request changes or approve it for the publishing desk."
                            : user.role === "publisher"
                              ? "Publish only approved revisions. Issue transparent corrections when needed."
                              : "Manage newsroom access. Every permission is also enforced on the server."}
                      </p>
                      <button
                        className="text-btn"
                        onClick={() => setModal("permissions")}
                      >
                        View permissions <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </aside>
                  <section className="story-list">
                    <div className="list-tools">
                      <h2>
                        {filter === "all" ? "On your desk" : titles[filter]}
                        <span>{filtered.length}</span>
                      </h2>
                      <div className="search-tools">
                        <label className="search-box">
                          <Search size={16} />
                          <input
                            aria-label="Search stories"
                            placeholder="Find a story…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                          {query && (
                            <button
                              className="icon-btn"
                              aria-label="Clear search"
                              onClick={() => setQuery("")}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </label>
                        <select
                          aria-label="Filter by section"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                        >
                          <option value="all">All sections</option>
                          {sections.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {filtered.length ? (
                      filtered.map((t, i) => (
                        <button
                          className="story-row"
                          key={t.id}
                          onClick={() => openStory(t.id)}
                          disabled={busy}
                        >
                          <span className="story-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="story-info">
                            <div className="story-meta">
                              <span>{t.section}</span>
                              <span>
                                REV. {String(t.revision).padStart(2, "0")}
                              </span>
                            </div>
                            <h3>{t.title}</h3>
                            <p>
                              {t.dek ||
                                "An untold story, waiting to take shape."}
                            </p>
                            <div className="story-byline">
                              <span className="tiny-avatar">
                                {t.author
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                              <span>{t.author}</span>
                              <span>·</span>
                              <span>{date(t.updatedAt)}</span>
                              <span className="word-count">
                                {t.words} words
                              </span>
                            </div>
                          </div>
                          <div className="story-end">
                            <Tag status={t.status} />
                            <ArrowUpRight size={24} />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state">
                        <PenLine size={35} />
                        <h3>
                          {query || filter !== "all"
                            ? "No stories here yet."
                            : "A blank page. A new possibility."}
                        </h3>
                        <p>
                          {query
                            ? "Try another headline, author, or keyword."
                            : "Your next story starts with a single idea."}
                        </p>
                        {filter !== "all" || query ? (
                          <button
                            className="text-btn"
                            onClick={() => {
                              setQuery("");
                              setFilter("all");
                              setSection("all");
                            }}
                          >
                            Clear filters <RefreshCw size={15} />
                          </button>
                        ) : (
                          <RoleGuard user={user} allow={["reporter", "admin"]}>
                            <Action onClick={create} disabled={busy}>
                              Write your first story
                            </Action>
                          </RoleGuard>
                        )}
                      </div>
                    )}
                    <div className="list-footer">
                      <span className="mono">
                        END OF DESK / KEEP LOOKING CLOSER.
                      </span>
                      <span className="mini-web">✳</span>
                    </div>
                  </section>
                </div>
              </>
            )}
            {view === "desk" && story && form && (
              <>
                <div className="editor-top">
                  <button className="text-btn" onClick={() => navigate("desk")}>
                    <ArrowLeft size={16} /> Back to the desk
                  </button>
                  <div>
                    <Tag status={story.status} />
                    <span className="mono">REVISION {story.revision}</span>
                  </div>
                </div>
                <div className="editor-layout">
                  <section className="writing-sheet">
                    <div className="sheet-tools">
                      <label>
                        SECTION
                        <select
                          value={form.section}
                          disabled={!canWrite}
                          onChange={(e) =>
                            setForm({ ...form, section: e.target.value })
                          }
                        >
                          {sections.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <button
                          className={"icon-btn " + (history ? "chosen" : "")}
                          title="Revision history"
                          aria-label="Revision history"
                          onClick={() => setHistory(!history)}
                        >
                          <Clock3 size={18} />
                        </button>
                        <button
                          className={"icon-btn " + (preview ? "chosen" : "")}
                          title="Reading preview"
                          aria-label="Reading preview"
                          onClick={() => setPreview(!preview)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Download story"
                          aria-label="Download story"
                          onClick={() => {
                            const b = new Blob(
                              [`${form.title}\n\n${form.dek}\n\n${form.body}`],
                              { type: "text/plain" },
                            );
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(b);
                            a.download = "signalroom-story.txt";
                            a.click();
                            URL.revokeObjectURL(a.href);
                          }}
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </div>
                    {history ? (
                      <div className="revision-history">
                        <span className="eyebrow">THE STORY SO FAR</span>
                        <h2>Every word has a history.</h2>
                        <p>
                          Current revision: {story.revision}. Previously saved
                          versions appear below.
                        </p>
                        {story.revisions.length === 0 ? (
                          <p className="muted">No previous revisions yet.</p>
                        ) : (
                          [...story.revisions].reverse().map((r) => (
                            <details key={r.revision}>
                              <summary>
                                <span>Revision {r.revision}</span>
                                <span>{date(r.at)}</span>
                              </summary>
                              <h3>{r.title}</h3>
                              <p>{r.dek}</p>
                              <div className="prose">{r.body}</div>
                              <div className="revision-diff">
                                <b>Compared with current revision</b>
                                <span>
                                  {words(r.body)} → {words(form.body)} words
                                </span>
                                <p>
                                  {r.title !== form.title
                                    ? "Headline changed."
                                    : "Headline unchanged."}{" "}
                                  {r.body !== form.body
                                    ? "Reporting has been revised."
                                    : "Reporting unchanged."}
                                </p>
                              </div>
                            </details>
                          ))
                        )}
                      </div>
                    ) : preview ? (
                      <article className="reading-preview">
                        <span className="eyebrow">
                          {form.section} / READING PREVIEW
                        </span>
                        <h1>{form.title}</h1>
                        <p className="article-dek">{form.dek}</p>
                        <div className="article-byline">
                          By {story.author} ·{" "}
                          {Math.max(1, Math.ceil(words(form.body) / 220))} min
                          read
                        </div>
                        <div className="prose">
                          {form.body || "Your reporting will appear here."}
                        </div>
                      </article>
                    ) : (
                      <>
                        <label className="sr-only" htmlFor="headline">
                          Headline
                        </label>
                        <textarea
                          id="headline"
                          className="headline-input"
                          value={form.title}
                          maxLength={160}
                          rows={3}
                          disabled={!canWrite}
                          onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                          }
                          placeholder="A headline worth following."
                        />
                        <label className="sr-only" htmlFor="dek">
                          Story summary
                        </label>
                        <textarea
                          id="dek"
                          className="dek-input"
                          value={form.dek}
                          maxLength={300}
                          rows={2}
                          disabled={!canWrite}
                          onChange={(e) =>
                            setForm({ ...form, dek: e.target.value })
                          }
                          placeholder="The bigger picture. In a sentence or two."
                        />
                        <div className="author-line">
                          <span className="avatar small-avatar">
                            {story.author
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span>
                            By <strong>{story.author}</strong>
                          </span>
                          <span className="mono">{date(story.createdAt)}</span>
                        </div>
                        <label className="sr-only" htmlFor="body">
                          Story body
                        </label>
                        <textarea
                          id="body"
                          className="body-input"
                          value={form.body}
                          maxLength={30000}
                          disabled={!canWrite}
                          onChange={(e) =>
                            setForm({ ...form, body: e.target.value })
                          }
                          placeholder="Start with what you noticed. Follow the thread…"
                        />
                      </>
                    )}
                    <div className="sheet-footer">
                      <span>
                        {words(form.body)} words ·{" "}
                        {Math.max(1, Math.ceil(words(form.body) / 220))} min
                        read
                      </span>
                      <span className={dirty ? "unsaved" : ""}>
                        {dirty ? "● Unsaved changes" : "✓ All changes saved"}
                      </span>
                    </div>
                  </section>
                  <aside className="editor-panel">
                    <span className="eyebrow">THE NEXT MOVE</span>
                    <h2>
                      {
                        {
                          draft: "Make it yours.",
                          review: "Look a little closer.",
                          changes: "A stronger second look.",
                          approved: "Ready for its audience.",
                          published: "Out in the world.",
                          withdrawn: "Off the wire.",
                        }[story.status]
                      }
                    </h2>
                    <p className="panel-description">
                      {
                        {
                          draft:
                            "Shape your reporting, then pass the story to an independent editor.",
                          review:
                            "Check the reporting, challenge the details, and leave a clear editorial decision.",
                          changes:
                            "Your editor has left notes. Refine the story and submit it for another review.",
                          approved:
                            "This exact revision is approved. Any further edit will require a new review.",
                          published:
                            "This published snapshot is preserved. Add a correction or withdraw it if necessary.",
                          withdrawn:
                            "The story is no longer public. Its history stays in the newsroom.",
                        }[story.status]
                      }
                    </p>
                    <div className="editor-actions">
                      {canWrite && (
                        <Action
                          icon={Save}
                          disabled={busy || !dirty}
                          onClick={() => act("save")}
                        >
                          Save revision
                        </Action>
                      )}
                      {(story.authorId === user.id || user.role === "admin") &&
                        ["draft", "changes"].includes(story.status) && (
                          <Action
                            kind="outline"
                            icon={Send}
                            disabled={busy || dirty}
                            onClick={() => act("submit")}
                          >
                            Submit for review
                          </Action>
                        )}
                      <RoleGuard user={user} allow={["editor", "admin"]}>
                        {story.status === "review" &&
                          story.authorId !== user.id && (
                            <>
                              <Action
                                icon={CheckCheck}
                                disabled={busy}
                                onClick={() => setModal("approve")}
                              >
                                Approve revision
                              </Action>
                              <Action
                                kind="outline"
                                icon={MessageSquare}
                                disabled={busy}
                                onClick={() => setModal("changes")}
                              >
                                Request changes
                              </Action>
                            </>
                          )}
                      </RoleGuard>
                      <RoleGuard user={user} allow={["publisher", "admin"]}>
                        {story.status === "approved" &&
                          story.authorId !== user.id && (
                            <Action
                              icon={Radio}
                              disabled={busy || dirty}
                              onClick={() => setModal("publish")}
                            >
                              Publish story
                            </Action>
                          )}
                        {story.status === "published" && (
                          <>
                            <Action
                              kind="outline"
                              icon={PenLine}
                              onClick={() => setModal("correct")}
                            >
                              Issue correction
                            </Action>
                            <button
                              className="text-btn danger"
                              onClick={() => setModal("withdraw")}
                            >
                              Withdraw publication <ArrowUpRight size={14} />
                            </button>
                          </>
                        )}
                      </RoleGuard>
                      {(story.authorId === user.id || user.role === "admin") &&
                        ["review", "withdrawn"].includes(story.status) && (
                          <Action
                            kind="outline"
                            icon={CornerDownRight}
                            disabled={busy}
                            onClick={() => act("reopen")}
                          >
                            Return to draft
                          </Action>
                        )}
                      {(story.authorId === user.id || user.role === "admin") &&
                        story.status === "draft" && (
                          <button
                            className="text-btn danger"
                            onClick={() => setModal("delete")}
                          >
                            <Trash2 size={14} /> Delete draft
                          </button>
                        )}
                    </div>
                    {story.approval && (
                      <div className="approval-box">
                        <ShieldCheck size={21} />
                        <div>
                          <b>Revision {story.approval.revision} approved</b>
                          <p>
                            By {story.approval.by} · {date(story.approval.at)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="handoff-map">
                      {[
                        ["draft", "Write"],
                        ["review", "Review"],
                        ["approved", "Approve"],
                        ["published", "Publish"],
                      ].map(([s, l], i) => (
                        <div
                          className={s === story.status ? "current" : ""}
                          key={s}
                        >
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <b>{l}</b>
                          {s === story.status && <i />}
                        </div>
                      ))}
                    </div>
                    <div className="editor-notes">
                      <div className="index-heading">
                        <MessageSquare size={16} /> EDITORIAL NOTES
                      </div>
                      {story.notes.length ? (
                        story.notes.map((n) => (
                          <div className="note" key={n.id}>
                            <span>
                              {n.author}
                              <small>REV. {n.revision}</small>
                            </span>
                            <p>{n.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="muted">
                          A little perspective goes a long way. Editorial
                          feedback will appear here.
                        </p>
                      )}
                      {story.corrections.map((n) => (
                        <div className="note" key={n.id}>
                          <span>
                            Public correction<small>{date(n.at)}</small>
                          </span>
                          <p>{n.text}</p>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </>
            )}
            {view === "wire" && (
              <PublicWire wire={wire} onRead={setReadStory} />
            )}
            {view === "activity" && (
              <section className="activity-page">
                <span className="eyebrow">A TRANSPARENT PROCESS</span>
                <h1>Follow the thread.</h1>
                <p>Every meaningful handoff, in one place.</p>
                <div className="event-list">
                  {events.length ? (
                    events.map((e) => (
                      <div key={e.id}>
                        <span className="event-icon">
                          <Activity size={17} />
                        </span>
                        <div>
                          <b>{e.action}</b>
                          <p>{e.title || "Newsroom access"}</p>
                          <small>
                            {e.actor} · {new Date(e.at).toLocaleString()}
                          </small>
                        </div>
                        {e.storyId &&
                          stories.some((t) => t.id === e.storyId) && (
                            <button
                              className="icon-btn"
                              aria-label={"Open " + e.title}
                              onClick={() => openStory(e.storyId)}
                            >
                              <ArrowUpRight size={19} />
                            </button>
                          )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Activity />
                      <h3>The thread starts with you.</h3>
                      <p>Start a story to create your first activity.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
            {view === "people" && (
              <RoleGuard
                user={user}
                allow={["admin"]}
                fallback={
                  <div className="empty-state">
                    <LockKeyhole />
                    <h1>Administrator access required.</h1>
                  </div>
                }
              >
                <section className="people-page">
                  <span className="eyebrow">THE PEOPLE BEHIND THE STORIES</span>
                  <h1>A place for every perspective.</h1>
                  <p>Assign responsibilities. Keep the boundaries clear.</p>
                  {user.demo && (
                    <p className="info-banner">
                      Demo roles are fixed. Switch between them using the
                      control above.
                    </p>
                  )}
                  <div className="people-table">
                    {users.map((u) => (
                      <div key={u.id}>
                        <span className="avatar">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div>
                          <b>{u.name}</b>
                          <small>{u.email}</small>
                        </div>
                        <select
                          aria-label={"Role for " + u.name}
                          disabled={u.id === user.id || user.demo || busy}
                          value={u.role}
                          onChange={(e) => {
                            setModal({
                              type: "role",
                              user: u,
                              role: e.target.value,
                            });
                          }}
                        >
                          {["reporter", "editor", "publisher", "admin"].map(
                            (r) => (
                              <option key={r}>{r}</option>
                            ),
                          )}
                        </select>
                        <span className="mono">
                          {u.id === user.id ? "YOU" : "MEMBER"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </RoleGuard>
            )}
          </main>
          <footer className="app-footer">
            <span>SIGNALROOM / A LITTLE CURIOSITY GOES A LONG WAY.</span>
            <span>
              Built by Rachit Tripathi <span className="mini-web">✳</span>
            </span>
          </footer>
        </>
      )}
      {!user && notifications}
      {auth && (
        <Modal
          title={
            auth === "register" ? "Your byline starts here." : "Welcome back."
          }
          onClose={() => {
            setAuth(null);
            setError("");
          }}
        >
          <p className="modal-description">
            {auth === "register"
              ? "Join as a reporter. An administrator assigns editorial and publishing roles."
              : "Sign in to your independent newsroom."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(async () => {
                const d = await api("/auth/" + auth, {
                  method: "POST",
                  body: f,
                });
                setUser(d.user);
                setAuth(null);
                setView("desk");
                flash(
                  auth === "register"
                    ? "Welcome to SignalRoom."
                    : "Welcome back.",
                );
              });
            }}
          >
            {auth === "register" && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={70}
                  placeholder="First and last name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <Password
                name="password"
                autoComplete={
                  auth === "register" ? "new-password" : "current-password"
                }
                minLength={auth === "register" ? 10 : 1}
              />
            </label>
            {auth === "register" && (
              <p className="field-help">
                Use 10 or more characters. Your password is securely hashed.
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Action disabled={busy} icon={ArrowRight}>
              {busy
                ? "Connecting…"
                : auth === "register"
                  ? "Create reporter account"
                  : "Enter newsroom"}
            </Action>
          </form>
          <div className="modal-switch">
            {auth === "register"
              ? "Already have a byline?"
              : "New to the newsroom?"}{" "}
            <button
              className="text-btn"
              onClick={() => {
                setAuth(auth === "register" ? "login" : "register");
                setError("");
              }}
            >
              {auth === "register" ? "Sign in" : "Create an account"}
            </button>
          </div>
          <button
            className="demo-auth"
            disabled={busy}
            onClick={() => demo("reporter")}
          >
            Just looking around? Try the demo <ArrowUpRight size={16} />
          </button>
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            typeof modal === "object"
              ? "Change newsroom role"
              : {
                  profile: "Your account",
                  permissions: "Clear roles. Better stories.",
                  approve: "Approve this revision?",
                  changes: "A little editorial direction.",
                  publish: "Ready to meet the world?",
                  correct: "Set the record straight.",
                  withdraw: "Withdraw this story?",
                  delete: "Delete this draft?",
                }[modal]
          }
          onClose={() => {
            setModal(null);
            setNote("");
            setError("");
          }}
          wide={modal === "permissions"}
        >
          {modal === "permissions" ? (
            <>
              <p className="modal-description">
                The interface reflects your role. The server independently
                checks every action.
              </p>
              <div className="permission-grid">
                {[
                  [
                    "Reporter",
                    "Write and submit your own stories. Reopen a submission.",
                  ],
                  [
                    "Editor",
                    "Review another author’s story. Approve an exact revision or request changes.",
                  ],
                  [
                    "Publisher",
                    "Publish approved work. Add corrections and withdraw publications.",
                  ],
                  [
                    "Administrator",
                    "Manage role assignments and oversee the newsroom. Self-approval is still blocked.",
                  ],
                ].map(([r, d]) => (
                  <div key={r}>
                    <ShieldCheck size={19} />
                    <h3>{r}</h3>
                    <p>{d}</p>
                  </div>
                ))}
              </div>
            </>
          ) : modal === "profile" ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  run(async () => {
                    const d = await api("/auth/profile", {
                      method: "PATCH",
                      body: f,
                    });
                    setUser(d.user);
                    flash("Profile updated.");
                  });
                }}
              >
                <label>
                  Display name
                  <input
                    name="name"
                    defaultValue={user.name}
                    required
                    minLength={2}
                    maxLength={70}
                  />
                </label>
                <label>
                  Email address
                  <input value={user.email} readOnly />
                </label>
                <div className="profile-role">
                  <ShieldCheck size={18} />
                  {user.role}
                  <span>
                    {user.demo ? "Demo workspace" : "Newsroom member"}
                  </span>
                </div>
                <Action disabled={busy} icon={Check}>
                  Update profile
                </Action>
              </form>
              {!user.demo && (
                <details className="password-settings">
                  <summary>Change password</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      run(async () => {
                        await api("/auth/password", {
                          method: "POST",
                          body: f,
                        });
                        setUser(null);
                        setStory(null);
                        setModal(null);
                        setAuth("login");
                        flash("Password changed. Please sign in again.");
                      });
                    }}
                  >
                    <label>
                      Current password
                      <Password
                        name="currentPassword"
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      New password
                      <Password
                        name="password"
                        minLength={10}
                        autoComplete="new-password"
                      />
                    </label>
                    <p className="field-help">
                      Changing your password signs out every active session.
                    </p>
                    <Action disabled={busy}>Change password</Action>
                  </form>
                </details>
              )}
              {error && <p className="inline-error">{error}</p>}
            </>
          ) : (
            <>
              <p className="modal-description">
                {typeof modal === "object"
                  ? `${modal.user.name} will become ${modal.role}. Their existing sessions will be revoked.`
                  : {
                      approve: `You are approving revision ${story.revision}. Further edits will require another review.`,
                      changes:
                        "Be specific about what needs attention so the reporter can make a stronger revision.",
                      publish: `Publish revision ${story.revision} of “${story.title}” to the public wire.`,
                      correct:
                        "This notice will appear with the published story. The original snapshot remains preserved.",
                      withdraw:
                        "The story will leave the public wire. Its reporting and history remain in the newsroom.",
                      delete:
                        "This removes the draft and its saved revisions. This action cannot be undone.",
                    }[modal]}
              </p>
              {["changes", "approve", "correct", "withdraw"].includes(
                modal,
              ) && (
                <label>
                  {modal === "approve"
                    ? "Editorial note (optional)"
                    : "Your note"}
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      modal === "changes"
                        ? "What should the reporter look at again?"
                        : "Write a clear, concise note…"
                    }
                  />
                </label>
              )}
              {error && <p className="inline-error">{error}</p>}
              <div className="modal-actions">
                <button
                  className="text-btn"
                  onClick={() => {
                    setModal(null);
                    setNote("");
                  }}
                >
                  Keep working
                </button>
                <Action
                  disabled={
                    busy ||
                    (["changes", "correct", "withdraw"].includes(modal) &&
                      !note.trim())
                  }
                  onClick={() => {
                    if (typeof modal === "object")
                      run(async () => {
                        await api("/admin/users/" + modal.user.id, {
                          method: "PATCH",
                          body: { role: modal.role },
                        });
                        setUsers((await api("/admin/users")).users);
                        setModal(null);
                        flash("Role updated.");
                      });
                    else if (modal === "delete")
                      run(async () => {
                        await api("/stories/" + story.id, {
                          method: "DELETE",
                          body: { version: story.version },
                        });
                        setModal(null);
                        setStory(null);
                        setForm(null);
                        await refresh();
                        flash("Draft deleted.");
                      });
                    else act(modal, { note });
                  }}
                >
                  {busy
                    ? "Working…"
                    : typeof modal === "object"
                      ? "Confirm role"
                      : {
                          approve: "Approve revision",
                          changes: "Send feedback",
                          publish: "Publish now",
                          correct: "Publish correction",
                          withdraw: "Withdraw story",
                          delete: "Delete draft",
                        }[modal]}
                </Action>
              </div>
            </>
          )}
        </Modal>
      )}
      {readStory && (
        <Modal
          title="THE SIGNALROOM WIRE"
          wide
          onClose={() => setReadStory(null)}
        >
          <article className="reading-preview">
            <span className="eyebrow">
              {readStory.section} / {date(readStory.at)}
            </span>
            <h1>{readStory.title}</h1>
            <p className="article-dek">{readStory.dek}</p>
            <div className="article-byline">
              By {readStory.author} ·{" "}
              {Math.max(1, Math.ceil(words(readStory.body) / 220))} min read
            </div>
            <div className="prose">{readStory.body}</div>
            {readStory.corrections.map((c) => (
              <aside className="correction" key={c.id}>
                <b>Correction · {date(c.at)}</b>
                <p>{c.text}</p>
              </aside>
            ))}
          </article>
        </Modal>
      )}
    </>
  );
}
function Password(props) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-field">
      <input
        {...props}
        type={visible ? "text" : "password"}
        required
        maxLength={128}
      />
      <button
        type="button"
        className="icon-btn"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible(!visible)}
      >
        <Eye size={17} />
      </button>
    </span>
  );
}
function PublicWire({ wire, onRead, onBack }) {
  return (
    <section className="public-wire">
      {onBack && (
        <button className="text-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Home
        </button>
      )}
      <div className="wire-heading">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> THE PUBLIC EDITION
          </span>
          <h1>The wire.</h1>
          <p>Considered words. Fresh perspectives.</p>
        </div>
        <span className="wire-symbol" aria-hidden="true">
          ✳
        </span>
      </div>
      {wire.length ? (
        <div className="wire-grid">
          {wire.map((s, i) => (
            <button
              key={s.id}
              className={"wire-card wire-card-" + (i % 3)}
              onClick={() => onRead(s)}
            >
              <div className="wire-card-art" aria-hidden="true">
                <div className="wire-shape" />
                <span>{s.section.toUpperCase()}</span>
                <span className="wire-art-number">0{i + 1}</span>
              </div>
              <div className="wire-card-copy">
                <span className="eyebrow">
                  {s.section} · {date(s.at)}
                </span>
                <h2>{s.title}</h2>
                <p>{s.dek}</p>
                <div>
                  <span>By {s.author}</span>
                  <ArrowUpRight size={23} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Radio size={38} />
          <h2>A little quiet before the next story.</h2>
          <p>Approved stories appear here when a publisher releases them.</p>
        </div>
      )}
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
