import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form with glassy theme', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Check title and subtitle
    await expect(page.locator('h1')).toHaveText('Sign in to Help Desk');
    await expect(page.locator('.register-subtitle')).toHaveText('Enter your credentials to access your account');

    // Check preset demo accounts section
    await expect(page.locator('.preset-heading')).toHaveText('Demo Accounts');

    // Check preset buttons
    const presetBtns = page.locator('.preset-btn');
    await expect(presetBtns).toHaveCount(3);
    await expect(presetBtns.nth(0)).toContainText('User');
    await expect(presetBtns.nth(1)).toContainText('Agent');
    await expect(presetBtns.nth(2)).toContainText('Admin');

    // Check form fields
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');

    // Check link to register
    await expect(page.locator('a')).toHaveText('Don\'t have an account? Sign up');
  });

  test('should fill form with admin preset', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Click admin preset
    await page.locator('.preset-btn').nth(2).click();

    // Check email and password are filled
    await expect(page.locator('input[name="email"]')).toHaveValue('admin@helpdesk.local');
    await expect(page.locator('input[name="password"]')).toHaveValue('ChangeMe123!');
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Fill form
    await page.fill('input[name="email"]', 'admin@helpdesk.local');
    await page.fill('input[name="password"]', 'ChangeMe123!');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or show success
    await page.waitForURL('**/dashboard');
    await expect(page.url()).toContain('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.register-error')).toBeVisible();
  });
});