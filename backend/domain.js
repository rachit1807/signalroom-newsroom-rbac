import { randomUUID } from "node:crypto";
export const roles = ["reporter", "editor", "publisher", "admin"];
export const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export const clean = (v, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  demo: u.tenant !== "main",
});
export function log(s, u, action, story) {
  s.events.unshift({
    id: randomUUID(),
    tenant: u.tenant,
    actor: u.name,
    action,
    storyId: story?.id,
    title: story?.title || "",
    at: new Date().toISOString(),
  });
  s.events = s.events.slice(0, 3000);
}
export function owned(s, u, id) {
  const t = s.stories.find((t) => t.id === id && t.tenant === u.tenant);
  if (!t) fail(404, "Story not found.");
  if (u.role === "reporter" && t.authorId !== u.id)
    fail(403, "You can only open your own drafts.");
  return t;
}
export function visible(t, u) {
  return (
    t.tenant === u.tenant && (u.role !== "reporter" || t.authorId === u.id)
  );
}
export function makeStory(s, u, input) {
  if (!["reporter", "admin"].includes(u.role))
    fail(403, "Only reporters can start a story.");
  if (s.stories.filter((t) => t.tenant === u.tenant).length >= 200)
    fail(409, "This newsroom has reached its 200-story limit.");
  const title = clean(input.title, 160) || "Untitled story";
  const t = {
    id: randomUUID(),
    tenant: u.tenant,
    authorId: u.id,
    author: u.name,
    title,
    section: clean(input.section, 40) || "City",
    dek: "",
    body: "",
    status: "draft",
    version: 1,
    revision: 1,
    revisions: [],
    notes: [],
    approval: null,
    publication: null,
    corrections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  s.stories.unshift(t);
  log(s, u, "Started a story", t);
  return t;
}
export function transition(s, u, id, action, input) {
  const t = owned(s, u, id);
  if (input.version !== t.version)
    fail(
      409,
      "This story changed in another window. Reopen it to load the latest revision.",
    );
  const author = t.authorId === u.id;
  const elevated = u.role === "admin";
  if (action === "save") {
    if (!author && !elevated) fail(403, "Only the author can edit this story.");
    if (!["draft", "changes", "approved"].includes(t.status))
      fail(409, "Return this story to draft before editing.");
    const title = clean(input.title, 160),
      body = clean(input.body, 30000);
    if (!title) fail(400, "Add a headline before saving.");
    if (t.revisions.length >= 100)
      fail(409, "This story has reached its revision limit.");
    t.revisions.push({
      revision: t.revision,
      title: t.title,
      dek: t.dek,
      body: t.body,
      at: t.updatedAt,
    });
    t.title = title;
    t.body = body;
    t.dek = clean(input.dek, 300);
    t.section = clean(input.section, 40) || "City";
    t.revision++;
    if (t.status === "approved") {
      t.status = "draft";
      t.approval = null;
    }
    log(s, u, "Saved a new revision", t);
  } else if (action === "submit") {
    if (!author && !elevated)
      fail(403, "Only the author can submit this story.");
    if (!["draft", "changes"].includes(t.status))
      fail(409, "Only a draft can be submitted.");
    if (t.body.length < 80 || t.title === "Untitled story")
      fail(
        400,
        "Add a headline and at least 80 characters of reporting before submitting.",
      );
    t.status = "review";
    t.approval = null;
    log(s, u, "Submitted for editorial review", t);
  } else if (action === "approve" || action === "changes") {
    if (!["editor", "admin"].includes(u.role))
      fail(403, "Editorial access is required.");
    if (author) fail(403, "An author cannot review their own story.");
    if (t.status !== "review") fail(409, "This story is not awaiting review.");
    const note = clean(input.note, 2000);
    if (action === "changes" && !note)
      fail(400, "Explain what the reporter should change.");
    if (note)
      t.notes.push({
        id: randomUUID(),
        author: u.name,
        text: note,
        revision: t.revision,
        at: new Date().toISOString(),
      });
    t.status = action === "approve" ? "approved" : "changes";
    t.approval =
      action === "approve"
        ? { revision: t.revision, by: u.name, at: new Date().toISOString() }
        : null;
    log(
      s,
      u,
      action === "approve"
        ? "Approved revision " + t.revision
        : "Requested changes",
      t,
    );
  } else if (action === "publish") {
    if (!["publisher", "admin"].includes(u.role))
      fail(403, "Publishing access is required.");
    if (author) fail(403, "An author cannot publish their own story.");
    if (t.status !== "approved" || t.approval?.revision !== t.revision)
      fail(409, "The current revision must be approved before publication.");
    t.status = "published";
    t.publication = {
      title: t.title,
      dek: t.dek,
      body: t.body,
      section: t.section,
      author: t.author,
      revision: t.revision,
      at: new Date().toISOString(),
      by: u.name,
    };
    log(s, u, "Published to the wire", t);
  } else if (action === "withdraw") {
    if (!["publisher", "admin"].includes(u.role))
      fail(403, "Publishing access is required.");
    if (t.status !== "published")
      fail(409, "Only a published story can be withdrawn.");
    const note = clean(input.note, 2000);
    if (!note) fail(400, "Provide a withdrawal reason.");
    t.status = "withdrawn";
    t.notes.push({
      id: randomUUID(),
      author: u.name,
      text: "Withdrawal: " + note,
      at: new Date().toISOString(),
      revision: t.revision,
    });
    log(s, u, "Withdrew publication", t);
  } else if (action === "correct") {
    if (!["publisher", "admin"].includes(u.role))
      fail(403, "Publishing access is required.");
    if (t.status !== "published")
      fail(409, "Corrections require a published story.");
    const note = clean(input.note, 2000);
    if (!note) fail(400, "Provide a correction notice.");
    if (t.corrections.length >= 50) fail(409, "Correction limit reached.");
    t.corrections.push({
      id: randomUUID(),
      text: note,
      by: u.name,
      at: new Date().toISOString(),
    });
    log(s, u, "Issued a public correction", t);
  } else if (action === "reopen") {
    if (!author && !elevated)
      fail(403, "Only the author can reopen this story.");
    if (!["review", "withdrawn"].includes(t.status))
      fail(409, "This story cannot be reopened.");
    t.status = "draft";
    t.approval = null;
    log(s, u, "Reopened a draft", t);
  } else fail(400, "Unknown story action.");
  t.version++;
  t.updatedAt = new Date().toISOString();
  return t;
}
export function seedDemo(s, tenant) {
  const names = {
    reporter: "Alex Morgan",
    editor: "Sam Rivera",
    publisher: "Jordan Lee",
    admin: "Taylor Quinn",
  };
  const users = roles.map((role) => ({
    id: randomUUID(),
    tenant,
    role,
    name: names[role],
    email: `${role}@demo.signalroom`,
    createdAt: new Date().toISOString(),
  }));
  s.users.push(...users);
  const reporter = users[0];
  const samples = [
    [
      "The city is finding its way back to the river",
      "City",
      "A new generation of public spaces is changing how residents meet the waterfront.",
      "published",
    ],
    [
      "Inside the workshop repairing our throwaway culture",
      "Culture",
      "Meet the people making repair a shared skill, one Saturday at a time.",
      "review",
    ],
    [
      "What happens when a neighborhood switches off?",
      "Science",
      "An evening without artificial light opens a different view of the city.",
      "approved",
    ],
    [
      "The quiet return of the corner bookshop",
      "Culture",
      "Independent booksellers are creating places to linger, learn and belong.",
      "draft",
    ],
    [
      "A greener commute starts at the last mile",
      "City",
      "The missing links between a train platform and the front door.",
      "changes",
    ],
  ];
  for (const [title, section, dek, status] of samples) {
    const t = makeStory(s, reporter, { title, section });
    t.dek = dek;
    t.body = `${dek}\n\nAt the edge of the neighborhood, a small change is starting a much bigger conversation. Residents who once hurried through this place are stopping, looking around, and asking what comes next.\n\n“We wanted to build something people could make their own,” says one of the organizers. The initiative started with a handful of volunteers and a simple question: what would make this corner of the city feel more connected?\n\nOver the past six months, the group has worked with local businesses, students and long-time residents. The process has been deliberately slow. Open meetings, practical experiments and informal conversations have shaped each decision.\n\nThere are still questions to answer. Accessibility, long-term funding and upkeep will require more than initial enthusiasm. Organizers say the next phase will put those challenges at the center of the discussion.\n\nFor now, the most visible result is also the simplest: people are spending time together again.\n\nThis is fictional sample reporting for the SignalRoom demo.`;
    t.status = status;
    if (["approved", "published"].includes(status))
      t.approval = {
        revision: 1,
        by: names.editor,
        at: new Date().toISOString(),
      };
    if (status === "published")
      t.publication = {
        title,
        dek,
        body: t.body,
        section,
        author: t.author,
        revision: 1,
        by: names.publisher,
        at: new Date().toISOString(),
      };
    if (status === "changes")
      t.notes.push({
        id: randomUUID(),
        author: names.editor,
        text: "Please add a source for the ridership figures and a second community perspective.",
        revision: 1,
        at: new Date().toISOString(),
      });
  }
  return users;
}
