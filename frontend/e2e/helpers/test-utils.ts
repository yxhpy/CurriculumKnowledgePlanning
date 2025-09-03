import { Page } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  async login(username: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('input[type="text"], input[type="email"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/^(?!.*login).*/);
  }

  async logout() {
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("退出")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}-${Date.now()}.png`, 
      fullPage: true 
    });
  }

  async waitForAPIResponse(urlPattern: string | RegExp) {
    return this.page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout: 10000 }
    );
  }

  async mockAPIResponse(urlPattern: string, responseData: any, status = 200) {
    await this.page.route(urlPattern, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  async checkAccessibility() {
    const violations = await this.page.evaluate(() => {
      const issues: string[] = [];
      
      // Check for alt text on images
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt) {
          issues.push(`Image missing alt text: ${img.src}`);
        }
      });
      
      // Check for form labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const id = input.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (!label) {
            issues.push(`Input missing label: ${id}`);
          }
        }
      });
      
      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        if (level - lastLevel > 1) {
          issues.push(`Heading hierarchy skip: ${heading.tagName} after H${lastLevel}`);
        }
        lastLevel = level;
      });
      
      return issues;
    });
    
    return violations;
  }

  async measurePerformance() {
    return this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive,
        transferSize: navigation.transferSize,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  async clearSessionStorage() {
    await this.page.evaluate(() => sessionStorage.clear());
  }

  async setLocalStorage(key: string, value: string) {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  async getLocalStorage(key: string) {
    return this.page.evaluate(k => localStorage.getItem(k), key);
  }
}

export function generateTestData() {
  return {
    user: {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User'
    },
    document: {
      title: `Test Document ${Date.now()}`,
      content: 'This is test content for E2E testing'
    },
    course: {
      title: `Test Course ${Date.now()}`,
      description: 'This is a test course created by E2E tests',
      level: 'intermediate',
      duration: 45
    }
  };
}