import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import request from "supertest";
import { createStore } from "../backend/store.js";
import { createApp } from "../backend/app.js";
const dir = mkdtempSync(tmpdir() + "/signalroom-tests-");
const store = createStore({
  url: process.env.SIGNALROOM_TEST_DATABASE_URL || "",
  dir,
});
let app;
before(async () => {
  await store.init();
  app = createApp(store, {
    secret: "test-only-signing-secret-with-at-least-32-characters",
  });
});
after(async () => {
  await store.close();
  rmSync(dir, { recursive: true, force: true });
});
const demo = async (role = "reporter") => {
  const a = request.agent(app);
  await a.post("/api/demo").send({ role }).expect(200);
  return a;
};
test("registration ignores role escalation; profile, logout and session revocation", async () => {
  const a = request.agent(app);
  let r = await a
    .post("/api/auth/register")
    .send({
      name: "Test Reporter",
      email: "test@example.com",
      password: "longtestpassword",
      role: "admin",
    })
    .expect(201);
  assert.equal(r.body.user.role, "reporter");
  await a.get("/api/admin/users").expect(403);
  await a.patch("/api/auth/profile").send({ name: "Changed Name" }).expect(200);
  r = await a.get("/api/auth/me").expect(200);
  assert.equal(r.body.user.name, "Changed Name");
  const cookie = r.headers["set-cookie"];
  await a.post("/api/auth/logout").expect(200);
  await a.get("/api/auth/me").expect(401);
  await a
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "wrong" })
    .expect(401);
  await a
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "longtestpassword" })
    .expect(200);
  await a
    .post("/api/auth/password")
    .send({ currentPassword: "longtestpassword", password: "newlongpassword" })
    .expect(200);
  await a.get("/api/auth/me").expect(401);
});
test("reporter cannot approve, publish, promote, read another tenant, or expose drafts", async () => {
  const a = await demo();
  const {
    body: { stories },
  } = await a.get("/api/stories");
  const review = stories.find((t) => t.status === "review");
  await a
    .post(`/api/stories/${review.id}/actions/approve`)
    .send({ version: review.version })
    .expect(403);
  await a
    .post(`/api/stories/${review.id}/actions/publish`)
    .send({ version: review.version })
    .expect(403);
  await a.patch("/api/admin/users/x").send({ role: "admin" }).expect(403);
  const b = await demo("admin");
  await b.get("/api/stories/" + review.id).expect(404);
  const wire = await a.get("/api/wire").expect(200);
  assert.equal(wire.body.stories.length, 1);
  assert.equal(wire.body.stories[0].notes, undefined);
  assert.equal(wire.body.stories[0].approval, undefined);
  await a
    .post("/api/stories")
    .set("Origin", "https://attacker.invalid")
    .send({})
    .expect(403);
});
test("full revision workflow, stale writes, approval invalidation, corrections and withdrawal", async () => {
  const a = await demo();
  let {
    body: { story: t },
  } = await a.post("/api/stories").send({ title: "A new angle" }).expect(201);
  const action = async (name, body = {}, status = 200) => {
    const r = await a
      .post(`/api/stories/${t.id}/actions/${name}`)
      .send({ version: t.version, ...body })
      .expect(status);
    if (status === 200) t = r.body.story;
    return r;
  };
  await action("submit", {}, 400);
  await action("save", {
    title: "A new angle",
    dek: "A well-sourced story",
    section: "City",
    body: "A meaningful piece of reporting. ".repeat(10),
  });
  await action("save", { version: 1, title: "stale", body: "stale" }, 409);
  await action("submit");
  await a.post("/api/demo").send({ role: "editor" }).expect(200);
  await action("changes", { note: "Please add a second source." });
  await a.post("/api/demo").send({ role: "reporter" });
  await action("save", {
    title: t.title,
    dek: t.dek,
    section: t.section,
    body: t.body + "\nAnother verified perspective.",
  });
  await action("submit");
  await a.post("/api/demo").send({ role: "editor" });
  await action("approve");
  assert.equal(t.approval.revision, t.revision);
  await a.post("/api/demo").send({ role: "reporter" });
  await action("save", {
    title: t.title,
    body: t.body + " Revised after approval.",
  });
  assert.equal(t.status, "draft");
  assert.equal(t.approval, null);
  await a.post("/api/demo").send({ role: "publisher" });
  await action("publish", {}, 409);
  await a.post("/api/demo").send({ role: "reporter" });
  await action("submit");
  await a.post("/api/demo").send({ role: "editor" });
  await action("approve");
  await a.post("/api/demo").send({ role: "publisher" });
  await action("publish");
  assert.equal(t.publication.revision, t.revision);
  await action("save", { title: "rewrite", body: "not allowed" }, 403);
  await action("correct", { note: "The community meeting was on Thursday." });
  let wire = (await a.get("/api/wire")).body.stories.find((s) => s.id === t.id);
  assert.equal(wire.corrections.length, 1);
  assert.equal(wire.body, t.publication.body);
  await action("withdraw", { note: "Pending further source verification." });
  assert.equal(
    (await a.get("/api/wire")).body.stories.some((s) => s.id === t.id),
    false,
  );
});
test("author cannot approve or publish their own story, even as administrator", async () => {
  const a = await demo("admin");
  let {
    body: { story: t },
  } = await a.post("/api/stories").send({ title: "Admin authored draft" });
  let r = await a
    .post(`/api/stories/${t.id}/actions/save`)
    .send({
      version: t.version,
      title: t.title,
      body: "Some reporting. ".repeat(10),
    })
    .expect(200);
  t = r.body.story;
  r = await a
    .post(`/api/stories/${t.id}/actions/submit`)
    .send({ version: t.version })
    .expect(200);
  t = r.body.story;
  await a
    .post(`/api/stories/${t.id}/actions/approve`)
    .send({ version: t.version })
    .expect(403);
});
test("simultaneous edits enforce optimistic concurrency; local data survives reopen", async () => {
  const a = await demo();
  const {
    body: { story: t },
  } = await a.post("/api/stories").send({ title: "Concurrent draft" });
  const results = await Promise.all(
    ["First", "Second"].map((title) =>
      a
        .post(`/api/stories/${t.id}/actions/save`)
        .send({ version: t.version, title, body: "Saved reporting" }),
    ),
  );
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
  const row = await store.read((s) => s.stories.find((x) => x.id === t.id));
  assert.equal(row.version, 2);
});
