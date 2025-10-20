import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  
  await expect(page).toHaveTitle(/Depósito Dental Noriega/);
  await expect(page.locator('h1')).toBeVisible();
});

test('catalog page loads', async ({ page }) => {
  await page.goto('/catalogo');
  
  await expect(page).toHaveTitle(/Catálogo/);
  await expect(page.locator('h1')).toBeVisible();
});
