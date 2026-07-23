import { test as setup, expect } from "@playwright/test";
import { TEST_CREDENTIALS } from "./fixtures";

const authFile = "e2e/.auth/user.json";

setup("authenticate as alice", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(TEST_CREDENTIALS.alice.email);
  await page.getByLabel("Password").fill(TEST_CREDENTIALS.alice.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/app");
  await expect(page.getByText("Ajaia")).toBeVisible();
  await page.context().storageState({ path: authFile });
});
