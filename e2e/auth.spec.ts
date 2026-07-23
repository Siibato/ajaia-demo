import { test, expect } from "@playwright/test";
import { TEST_CREDENTIALS, loginAs } from "./fixtures";

test.describe("Authentication", () => {
  test("redirects unauthenticated user from /app to /auth/signin", async ({
    page,
  }) => {
    await page.goto("/app");
    await page.waitForURL("**/auth/signin");
    expect(page.url()).toContain("/auth/signin");
  });

  test("redirects unauthenticated user from /docs/:id to /auth/signin", async ({
    page,
  }) => {
    await page.goto("/docs/some-id");
    await page.waitForURL("**/auth/signin");
    expect(page.url()).toContain("/auth/signin");
  });

  test("signs in with valid credentials", async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.alice);
    await expect(page).toHaveURL("/app");
    await expect(page.getByText("Ajaia")).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    expect(page.url()).toContain("/auth/signin");
  });

  test("shows error on non-existent user", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("signs out successfully", async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.alice);
    await expect(page).toHaveURL("/app");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/auth/signin");
    expect(page.url()).toContain("/auth/signin");
  });

  test("preserves callback URL after signin", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL("**/auth/signin");
    expect(page.url()).toContain("callbackUrl");
  });
});

test.describe("Sign up", () => {
  test("signs up a new user and lands on /app", async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.goto("/auth/signup");
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("testpassword");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL("/app", { timeout: 10_000 });
    await expect(page.getByText("Ajaia")).toBeVisible();
  });

  test("shows error for duplicate email", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByLabel("Name").fill("Duplicate");
    await page.getByLabel("Email").fill(TEST_CREDENTIALS.alice.email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(
      page.getByText("An account with this email already exists")
    ).toBeVisible();
  });

  test("navigates between signin and signup pages", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL("/auth/signup");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/auth/signin");
  });
});

test.describe("Authenticated access", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("can access /app when authenticated", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL("/app");
    await expect(page.getByText("Owned Documents")).toBeVisible();
    await expect(page.getByText("Shared with Me")).toBeVisible();
  });
});
