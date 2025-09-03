import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Accept the actual Chinese title that is set in index.html
    await expect(page).toHaveTitle('智能课程内容生成系统');
    
    // Check for any main content (since we redirect to /dashboard)
    const mainContent = page.locator('.ant-layout-content').first();
    await expect(mainContent).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
  });

  test('should display navigation menu', async ({ page }) => {
    // Wait for page to redirect to dashboard and load
    await page.waitForURL('/dashboard');
    
    // Look for Ant Design's Sider component
    const sider = page.locator('.ant-layout-sider');
    await expect(sider).toBeVisible();
    
    // Check for the menu within the sider
    const menu = page.locator('.ant-layout-sider .ant-menu');
    await expect(menu).toBeVisible();
    
    // Check for menu items in the sidebar
    const menuItems = page.locator('.ant-layout-sider .ant-menu .ant-menu-item');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have responsive layout', async ({ page, viewport }) => {
    // Wait for page to redirect to dashboard
    await page.waitForURL('/dashboard');
    
    if (viewport) {
      // Test desktop view first
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);
      
      // Check for the header and sider in desktop view
      const sider = page.locator('.ant-layout-sider');
      await expect(sider).toBeVisible();
      
      const header = page.locator('.ant-layout-header');
      await expect(header).toBeVisible();
      
      // Check for the collapse/expand button in header
      const collapseButton = page.locator('.ant-layout-header button').first();
      await expect(collapseButton).toBeVisible();
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Sider should still be present (just potentially collapsed)
      await expect(sider).toBeVisible();
      // Header should still be visible
      await expect(header).toBeVisible();
    }
  });

  test('should measure initial page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000);
  });
});