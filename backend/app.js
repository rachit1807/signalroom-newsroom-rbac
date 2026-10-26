import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authenticate, requireRoles } from "./middleware/rbacMiddleware.js";
import {
  roles,
  fail,
  clean,
  publicUser,
  log,
  owned,
  visible,
  makeStory,
  transition,
  seedDemo,
} from "./domain.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function createApp(store, { secret, production = false } = {}) {
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  const app = express();
  if (production) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: production ? [] : null,
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: production ? undefined : false,
    }),
  );
  app.use(express.json({ limit: "80kb" }), cookieParser());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin) {
        let host;
        try {
          host = new URL(origin).host;
        } catch {
          fail(403, "Invalid origin.");
        }
        if (host !== req.get("host"))
          return res
            .status(403)
            .json({ error: "Cross-origin changes are not allowed." });
      } else if (req.get("sec-fetch-site") === "cross-site")
        return res
          .status(403)
          .json({ error: "Cross-origin changes are not allowed." });
    }
    next();
  });
  const auth = authenticate(store, secret);
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
  });
  const demoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 40,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Demo limit reached. Please return later." },
  });
  function cookie(res, user, sid, expires) {
    res.cookie(
      "signalroom",
      jwt.sign({ sid }, secret, {
        subject: user.id,
        expiresIn: Math.floor((expires - Date.now()) / 1000),
        algorithm: "HS256",
      }),
      {
        httpOnly: true,
        secure: production,
        sameSite: "lax",
        maxAge: expires - Date.now(),
        path: "/",
      },
    );
  }
  function session(s, u) {
    const sid = randomUUID(),
      expires = Date.now() + 8 * 3600000;
    s.sessions = s.sessions.filter((x) => x.expires > Date.now());
    s.sessions.push({ id: sid, userId: u.id, expires });
    return { sid, expires };
  }
  app.get("/api/health", async (req, res) => {
    try {
      await store.health();
      res.json({ status: "ok", application: "signalroom" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.post("/api/auth/register", loginLimiter, async (req, res) => {
    const name = clean(req.body.name, 70),
      email = clean(req.body.email, 254).toLowerCase(),
      password = req.body.password;
    if (
      name.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      fail(
        400,
        "Use your name, a valid email, and a password of 10–128 characters.",
      );
    const hash = await bcrypt.hash(password, 12);
    const result = await store.transact((s) => {
      if (s.users.some((u) => u.tenant === "main" && u.email === email))
        fail(409, "An account with this email already exists.");
      if (s.users.filter((u) => u.tenant === "main").length >= 1000)
        fail(409, "Account capacity reached.");
      const u = {
        id: randomUUID(),
        tenant: "main",
        name,
        email,
        hash,
        role: "reporter",
        createdAt: new Date().toISOString(),
      };
      s.users.push(u);
      return { user: publicUser(u), ...session(s, u) };
    });
    cookie(res, result.user, result.sid, result.expires);
    res.status(201).json({ user: result.user });
  });
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const email = clean(req.body.email, 254).toLowerCase();
    const u = await store.read((s) =>
      s.users.find((u) => u.tenant === "main" && u.email === email),
    );
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const hash =
      u?.hash || "$2b$12$hpxX8nhEohJ69PQHbR3Khu5uZCtmQPD0RCU4dPCWw.cYWxUx.Eg5e";
    if (password.length > 128 || !(await bcrypt.compare(password, hash)) || !u)
      fail(401, "Email or password is incorrect.");
    const ses = await store.transact((s) => session(s, u));
    cookie(res, u, ses.sid, ses.expires);
    res.json({ user: publicUser(u) });
  });
  app.get("/api/auth/me", auth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  app.post("/api/auth/logout", auth, async (req, res) => {
    await store.transact((s) => {
      s.sessions = s.sessions.filter((x) => x.id !== req.sessionId);
    });
    res.clearCookie("signalroom", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: production,
    });
    res.json({ ok: true });
  });
  app.patch("/api/auth/profile", auth, async (req, res) => {
    const name = clean(req.body.name, 70);
    if (name.length < 2)
      fail(400, "Enter at least two characters for your name.");
    const user = await store.transact((s) => {
      const u = s.users.find((u) => u.id === req.user.id);
      u.name = name;
      return publicUser(u);
    });
    res.json({ user });
  });
  app.post("/api/auth/password", auth, loginLimiter, async (req, res) => {
    if (req.user.tenant !== "main")
      fail(403, "Demo passwords cannot be changed.");
    const { currentPassword, password } = req.body;
    if (
      typeof currentPassword !== "string" ||
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128 ||
      !(await bcrypt.compare(currentPassword, req.user.hash))
    )
      fail(
        400,
        "Check your current password and use a new password of 10–128 characters.",
      );
    const hash = await bcrypt.hash(password, 12);
    await store.transact((s) => {
      s.users.find((u) => u.id === req.user.id).hash = hash;
      s.sessions = s.sessions.filter((x) => x.userId !== req.user.id);
      log(s, req.user, "Changed password and revoked sessions");
    });
    res.clearCookie("signalroom", { path: "/" });
    res.json({ ok: true });
  });
  app.post("/api/demo", demoLimiter, async (req, res) => {
    const role = roles.includes(req.body.role) ? req.body.role : "reporter";
    let prior;
    try {
      const c = jwt.verify(req.cookies.signalroom || "", secret, {
        algorithms: ["HS256"],
      });
      prior = await store.read((s) => {
        const se = s.sessions.find(
          (x) => x.id === c.sid && x.expires > Date.now(),
        );
        return (
          se && s.users.find((u) => u.id === se.userId && u.tenant !== "main")
        );
      });
    } catch {}
    const result = await store.transact((s) => {
      const cutoff = Date.now() - 24 * 3600000;
      const expired = s.tenants
        .filter((t) => t.created < cutoff)
        .map((t) => t.id);
      if (expired.length) {
        const ids = s.users
          .filter((u) => expired.includes(u.tenant))
          .map((u) => u.id);
        s.users = s.users.filter((u) => !expired.includes(u.tenant));
        s.sessions = s.sessions.filter((x) => !ids.includes(x.userId));
        s.stories = s.stories.filter((t) => !expired.includes(t.tenant));
        s.events = s.events.filter((e) => !expired.includes(e.tenant));
        s.tenants = s.tenants.filter((t) => !expired.includes(t.id));
      }
      let tenant = prior?.tenant;
      if (!tenant || !s.users.some((u) => u.tenant === tenant)) {
        if (s.tenants.length >= 150)
          fail(503, "Demo rooms are busy. Please return later.");
        tenant = randomUUID();
        s.tenants.push({ id: tenant, created: Date.now() });
        seedDemo(s, tenant);
      }
      const u = s.users.find((u) => u.tenant === tenant && u.role === role);
      return { user: publicUser(u), ...session(s, u) };
    });
    cookie(res, result.user, result.sid, result.expires);
    res.json({ user: result.user });
  });
  app.get("/api/stories", auth, async (req, res) => {
    const stories = await store.read((s) =>
      s.stories
        .filter((t) => visible(t, req.user))
        .map(({ body, revisions, ...t }) => ({
          ...t,
          words: body.split(/\s+/).filter(Boolean).length,
        })),
    );
    res.json({ stories });
  });
  app.post("/api/stories", auth, async (req, res) =>
    res
      .status(201)
      .json({
        story: await store.transact((s) => makeStory(s, req.user, req.body)),
      }),
  );
  app.get("/api/stories/:id", auth, async (req, res) =>
    res.json({
      story: await store.read((s) => owned(s, req.user, req.params.id)),
    }),
  );
  app.post("/api/stories/:id/actions/:action", auth, async (req, res) =>
    res.json({
      story: await store.transact((s) => {
        const u = s.users.find((x) => x.id === req.user.id);
        return transition(s, u, req.params.id, req.params.action, req.body);
      }),
    }),
  );
  app.delete("/api/stories/:id", auth, async (req, res) => {
    await store.transact((s) => {
      const t = owned(s, req.user, req.params.id);
      if (t.status !== "draft")
        fail(409, "Only unpublished drafts can be deleted.");
      if (t.authorId !== req.user.id && req.user.role !== "admin")
        fail(403, "Only the author can delete a draft.");
      if (req.body.version !== t.version) fail(409, "Reload this story first.");
      s.stories = s.stories.filter((x) => x.id !== t.id);
      log(s, req.user, "Deleted a draft", t);
    });
    res.json({ ok: true });
  });
  app.get("/api/activity", auth, async (req, res) =>
    res.json({
      events: await store.read((s) =>
        s.events
          .filter(
            (e) =>
              e.tenant === req.user.tenant &&
              (req.user.role !== "reporter" ||
                s.stories.some(
                  (t) => t.id === e.storyId && t.authorId === req.user.id,
                )),
          )
          .slice(0, 100),
      ),
    }),
  );
  app.get("/api/admin/users", auth, requireRoles("admin"), async (req, res) =>
    res.json({
      users: await store.read((s) =>
        s.users.filter((u) => u.tenant === req.user.tenant).map(publicUser),
      ),
    }),
  );
  app.patch(
    "/api/admin/users/:id",
    auth,
    requireRoles("admin"),
    async (req, res) => {
      if (req.user.tenant !== "main")
        fail(
          403,
          "Demo roles stay fixed so every workspace remains available.",
        );
      const role = req.body.role;
      if (!roles.includes(role)) fail(400, "Choose a valid role.");
      if (req.params.id === req.user.id)
        fail(400, "You cannot change your own role.");
      await store.transact((s) => {
        const u = s.users.find(
          (u) => u.id === req.params.id && u.tenant === req.user.tenant,
        );
        if (!u) fail(404, "Account not found.");
        u.role = role;
        s.sessions = s.sessions.filter((x) => x.userId !== u.id);
        log(s, req.user, `Changed ${u.name} to ${role}`);
      });
      res.json({ ok: true });
    },
  );
  // Public responses contain published snapshots only, never internal notes or drafts.
  app.get("/api/wire", async (req, res) => {
    let tenant = "main";
    try {
      const c = jwt.verify(req.cookies.signalroom || "", secret, {
        algorithms: ["HS256"],
      });
      tenant = await store.read((s) => {
        const se = s.sessions.find(
          (x) => x.id === c.sid && x.expires > Date.now(),
        );
        return se
          ? s.users.find((u) => u.id === se.userId)?.tenant || "main"
          : "main";
      });
    } catch {}
    const stories = await store.read((s) =>
      s.stories
        .filter((t) => t.tenant === tenant && t.status === "published")
        .map((t) => ({
          id: t.id,
          ...t.publication,
          corrections: t.corrections,
        })),
    );
    res.json({ stories });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist", "index.html")),
  );
  app.use((e, req, res, next) => {
    const status = e.status || 500;
    if (status >= 500) console.error("Request failed:", e.code || e.name);
    res
      .status(status)
      .json({
        error:
          status >= 500
            ? "The newsroom is temporarily unavailable. Please try again."
            : e.message,
      });
  });
  return app;
}
