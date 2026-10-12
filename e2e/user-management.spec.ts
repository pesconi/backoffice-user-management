import { expect, test } from "@playwright/test";

const admin = {
  email: "admin@backoffice.local",
  password: "AdminPassword123!",
};
const password = "ManagedUser123!";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createUserThroughDashboard(
  page: import("@playwright/test").Page,
  firstName: string,
  lastName: string,
  email: string,
) {
  await page.getByRole("button", { name: "Add user" }).click();
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(
    page.getByText(`${firstName} ${lastName}`, { exact: true }),
  ).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("signs up, establishes a session, and opens the dashboard", async ({
  page,
}) => {
  const marker = Date.now();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.getByLabel("First name").fill(`New${marker}`);
  await page.getByLabel("Last name").fill("User");
  await page.getByLabel("Email").fill(`new${marker}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "User management" }),
  ).toBeVisible();
});

test("checks password confirmation before submitting registration", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("First name").fill("Mismatch");
  await page.getByLabel("Last name").fill("Check");
  await page.getByLabel("Email").fill("mismatch@example.com");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill("DifferentPassword123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Passwords must match before registration.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Confirm password")).toHaveAttribute(
    "aria-describedby",
    "sign-up-error",
  );
  await expect(page).toHaveURL(/\/sign-up$/);
});

test("signs in and persists a selected theme", async ({ page }) => {
  await signIn(page);
  const initialTheme = await page.locator("html").getAttribute("class");
  await page
    .getByRole("button", { name: /Switch to (light|dark) theme/ })
    .click();
  await expect(page.locator("html")).not.toHaveAttribute(
    "class",
    initialTheme ?? "",
  );
  const selectedTheme = await page.locator("html").getAttribute("class");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "class",
    selectedTheme ?? "",
  );
  await page.goto("/sign-up");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("presents accessible dialogs and restores focus", async ({ page }) => {
  await signIn(page);
  const addUserButton = page.getByRole("button", { name: "Add user" });
  await addUserButton.click();
  await expect(page.getByRole("dialog", { name: "Create user" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close form" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Create user" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close form" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Create user" }),
  ).not.toBeVisible();
  await expect(addUserButton).toBeFocused();

  const deleteUserButton = page
    .getByRole("button", { name: /^Delete / })
    .first();
  await deleteUserButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Remove user" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(deleteUserButton).toBeFocused();
});

test("redirects a terminated session to sign-in before loading the dashboard", async ({
  page,
  context,
}) => {
  await signIn(page);
  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "session_id",
  );
  expect(sessionCookie).toBeDefined();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await context.addCookies([
    {
      name: sessionCookie!.name,
      value: sessionCookie!.value,
      url: "http://localhost:3000",
      httpOnly: sessionCookie!.httpOnly,
      secure: sessionCookie!.secure,
      sameSite: sessionCookie!.sameSite,
    },
  ]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("paginates users through the dashboard at six records per page", async ({
  page,
}) => {
  await signIn(page);
  const marker = Date.now();
  for (let index = 0; index < 6; index += 1) {
    await createUserThroughDashboard(
      page,
      `Page${marker}${index}`,
      "Record",
      `page${marker}-${index}@example.com`,
    );
  }
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.getByText(/Showing 1-6 of \d+ users/)).toBeVisible();
  await expect(page.getByText("Newest records first")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page" })).toBeEnabled();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
  await expect(page.getByText(/Showing 7-12 of \d+ users/)).toBeVisible();
});

test("manages a user through the dashboard and preserves creation time", async ({
  page,
}) => {
  const marker = Date.now();
  const firstName = `Managed${marker}`;
  const updatedFirstName = `Updated${marker}`;

  await page.goto("/sign-up");
  await page.getByLabel("First name").fill(`Operator${marker}`);
  await page.getByLabel("Last name").fill("Account");
  await page.getByLabel("Email").fill(`operator${marker}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Add user" }).click();
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill("Record");
  await page.getByLabel("Email").fill(`managed${marker}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText(`${firstName} Record`)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("User created.");

  const createdUser = await page.evaluate(async (name) => {
    const response = await fetch("/api/users?page=1");
    const payload = await response.json();
    return payload.users.find(
      (user: { firstName: string }) => user.firstName === name,
    );
  }, firstName);
  expect(createdUser).toBeDefined();

  await page.getByRole("button", { name: `Edit ${firstName} Record` }).click();
  await page.getByLabel("First name").fill(updatedFirstName);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`${updatedFirstName} Record`)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("User updated.");

  const managedUser = await page.evaluate(async (name) => {
    const response = await fetch("/api/users?page=1");
    const payload = await response.json();
    return payload.users.find(
      (user: { firstName: string }) => user.firstName === name,
    );
  }, updatedFirstName);
  expect(managedUser).toBeDefined();
  expect(managedUser.createdAt).toBe(createdUser.createdAt);
  expect(new Date(managedUser.updatedAt).getTime()).toBeGreaterThan(
    new Date(createdUser.updatedAt).getTime(),
  );

  const timestampStatus = await page.evaluate(async ({ id }) => {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ createdAt: "2000-01-01T00:00:00.000Z" }),
    });
    return response.status;
  }, managedUser);
  expect(timestampStatus).toBe(400);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/users/${managedUser.id}`) &&
      response.request().method() === "DELETE",
  );
  await page
    .getByRole("button", { name: `Delete ${updatedFirstName} Record` })
    .click();
  await page.getByRole("button", { name: "Remove user" }).click();
  expect((await deleteResponse).status()).toBe(204);
  await expect(page.getByRole("status")).toHaveText("User removed.");
  await page.reload();
  await expect(page.getByText(`${updatedFirstName} Record`)).not.toBeVisible();
});

test("blocks name changes for inactive users", async ({ page }) => {
  await signIn(page);
  const marker = Date.now();
  const firstName = `Locked${marker}`;
  const email = `locked${marker}@example.com`;
  await createUserThroughDashboard(page, firstName, "Record", email);

  await page.getByRole("button", { name: `Edit ${firstName} Record` }).click();
  await page.getByLabel("Status").selectOption("inactive");
  await page.getByRole("button", { name: "Save changes" }).click();

  await page.getByRole("button", { name: `Edit ${firstName} Record` }).click();
  await expect(page.getByLabel("First name")).toBeDisabled();
  await expect(page.getByLabel("Last name")).toBeDisabled();
  await expect(
    page.getByText("Names remain locked while this account is inactive.", {
      exact: true,
    }),
  ).toBeVisible();
});
