import { test, expect } from "@playwright/test";
test("responsive newsroom and a complete editorial handoff", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every story/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-home.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-dark.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.getByRole("button", { name: "Explore the newsroom" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next great story." }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-desk.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start a story" }).click();
  await page
    .getByLabel("Headline", { exact: true })
    .fill("A new perspective on the neighborhood");
  await page
    .getByLabel("Story summary", { exact: true })
    .fill("A story about the people making their city more connected.");
  await page
    .getByLabel("Story body", { exact: true })
    .fill(
      "At the corner of the neighborhood, a community garden is bringing residents together. A group of volunteers began with one question: what could this space become?\n\nThey met every Saturday, planting seeds and sharing ideas. The garden now brings together several generations, and this fictional reporting demonstrates the editorial workflow.",
    );
  await page.getByRole("button", { name: "Save revision" }).click();
  await expect(
    page.getByText("Revision saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reading preview" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A new perspective on the neighborhood",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-editor.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Sent to the editorial desk.")).toBeVisible();
  const role = async (r) => {
    await page.getByRole("button", { name: /Viewing as/ }).click();
    await page
      .locator(".role-menu")
      .getByRole("button", { name: r, exact: true })
      .click();
    await expect(page.locator(".role-switch>b")).toHaveCount(0);
    await expect(page.locator(".role-switch")).toContainText(r);
  };
  await role("editor");
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "A new perspective on the neighborhood",
      }),
    })
    .click();
  await expect(page.getByRole("button", { name: "Save revision" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Approve revision", exact: true })
    .click();
  await page
    .locator("dialog")
    .getByRole("button", { name: "Approve revision", exact: true })
    .click();
  await expect(
    page.getByText("Revision approved.", { exact: true }),
  ).toBeVisible();
  await role("publisher");
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "A new perspective on the neighborhood",
      }),
    })
    .click();
  await page
    .getByRole("button", { name: "Publish story", exact: true })
    .click();
  await page.getByRole("button", { name: "Publish now", exact: true }).click();
  await expect(
    page.getByText("Your story is live on the wire.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "The wire", exact: true }).click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "A new perspective on the neighborhood",
      }),
    })
    .click();
  await expect(page.locator("dialog .prose")).toContainText("community garden");
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(errors).toEqual([]);
});
