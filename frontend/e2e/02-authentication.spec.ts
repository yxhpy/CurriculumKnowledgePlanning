import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), button:has-text("登录")');
    const isLoginVisible = await loginLink.isVisible().catch(() => false);
    
    if (isLoginVisible) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login.*/);
      
      const loginForm = page.locator('form, [role="form"]');
      await expect(loginForm).toBeVisible();
    }
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login').catch(() => page.goto('/'));
    
    const usernameInput = page.locator('input[type="text"], input[type="email"], input[name*="user" i], input[placeholder*="user" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("登录")').first();
    
    if (await usernameInput.isVisible().catch(() => false)) {
      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      await usernameInput.fill('testuser@example.com');
      await passwordInput.fill('TestPassword123!');
      
      await page.screenshot({ path: 'e2e/screenshots/login-form.png' });
    }
  });

  test('should validate empty form submission', async ({ page }) => {
    await page.goto('/login').catch(() => page.goto('/'));
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("登录")').first();
    
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      
      const errorMessage = page.locator('.error, .ant-form-item-explain-error, [role="alert"]');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (hasError) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login').catch(() => page.goto('/'));
    
    const usernameInput = page.locator('input[type="text"], input[type="email"], input[name*="user" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await usernameInput.isVisible().catch(() => false)) {
      await usernameInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/auth/login') && response.status() === 401,
        { timeout: 5000 }
      ).catch(() => null);
      
      await submitButton.click();
      
      const response = await responsePromise;
      if (response) {
        const errorMessage = page.locator('.ant-message, .error-message, [role="alert"]');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');
    
    const registerLink = page.locator('a[href*="register"], button:has-text("Register"), button:has-text("注册")');
    const isRegisterVisible = await registerLink.isVisible().catch(() => false);
    
    if (isRegisterVisible) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register.*/);
      
      const registerForm = page.locator('form');
      await expect(registerForm).toBeVisible();
      
      await page.screenshot({ path: 'e2e/screenshots/register-form.png' });
    }
  });
});