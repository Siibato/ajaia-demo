import { test as base, expect, type Page } from "@playwright/test";

export const TEST_CREDENTIALS = {
  alice: { email: "alice@example.com", password: "password", name: "Alice" },
  bob: { email: "bob@example.com", password: "password", name: "Bob" },
  carol: { email: "carol@example.com", password: "password", name: "Carol" },
} as const;

export async function loginAs(
  page: Page,
  creds: { email: string; password: string }
) {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/app");
}

export const test = base.extend({});
export { expect };
