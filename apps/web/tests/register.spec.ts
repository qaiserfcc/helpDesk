import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming the web app is running on localhost:5176 (dev server)
    await page.goto('http://localhost:5176/register');
  });

  test('should display the register form with glassy theme and background', async ({ page }) => {
    // Check title and subtitle
    await expect(page.locator('h2')).toHaveText('Create your Help Desk account');
    await expect(page.locator('.register-subtitle')).toHaveText('Access the workspace instantly.');

    // Check form fields
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Check role selection
    await expect(page.locator('.role-options')).toBeVisible();
    await expect(page.locator('.role-card').first()).toHaveText('UserSubmit and track your own tickets');

    // Check prefill button
    await expect(page.locator('.prefill-btn')).toHaveText('Prefill Test Data');

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toHaveText('Create account');

    // Check link to login
    await expect(page.locator('.register-link a')).toHaveText('Already have an account? Sign in');
  });

  test('should prefill test data when prefill button is clicked', async ({ page }) => {
    await page.locator('.prefill-btn').click();

    await expect(page.locator('#name')).toHaveValue('Test User');
    await expect(page.locator('#email')).toHaveValue('test@example.com');
    await expect(page.locator('#password')).toHaveValue('password123');
    // Role should be user
    await expect(page.locator('.role-card.active .role-label')).toHaveText('User');
  });

  test('should allow selecting different roles', async ({ page }) => {
    // Default user
    await expect(page.locator('.role-card.active .role-label')).toHaveText('User');

    // Select agent
    await page.locator('.role-card').nth(1).click();
    await expect(page.locator('.role-card.active .role-label')).toHaveText('Agent');

    // Select admin
    await page.locator('.role-card').nth(2).click();
    await expect(page.locator('.role-card.active .role-label')).toHaveText('Admin');
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Assuming admin@helpdesk.local exists
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('admin@helpdesk.local');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.register-error')).toHaveText('An account with that email already exists.');
  });

  test('should successfully register a new user and redirect', async ({ page }) => {
    const randomEmail = `test${Date.now()}@example.com`;

    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill(randomEmail);
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to /tickets
    await page.waitForURL('**/tickets');
    await expect(page).toHaveURL(/.*\/tickets/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.locator('.register-link a').click();
    await expect(page).toHaveURL(/.*\/login/);
  });
});