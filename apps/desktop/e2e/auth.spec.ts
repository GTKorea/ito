import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('should render login form with all fields', async ({ page }) => {
    await page.goto('/login');

    // Check page heading
    await expect(page.getByRole('heading', { name: /sign in to ito/i })).toBeVisible();

    // Check email and password inputs
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check OAuth buttons
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();

    // Check link to register
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /sign up/i }).click();

    await expect(page).toHaveURL(/\/register/);
  });

  test('should show required validation on empty submit', async ({ page }) => {
    await page.goto('/login');

    // Click sign in without filling fields - HTML5 validation should prevent submission
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('required', '');

    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('required', '');
  });
});

test.describe('Register page', () => {
  test('should render registration form with all fields', async ({ page }) => {
    await page.goto('/register');

    // Check page heading
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    // Check all inputs
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Check link back to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate back to login page', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('link', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('should enforce minimum password length', async ({ page }) => {
    await page.goto('/register');

    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('minlength', '8');
  });
});
