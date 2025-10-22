import { test, expect } from '@playwright/test';

test('account form flow', async ({ page }) => {
  await page.goto('/cuenta');
  
  // Check if login form is visible
  await expect(page.locator('form')).toBeVisible();
  
  // Try to fill login form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  
  // Check if submit button is enabled
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled();
});
