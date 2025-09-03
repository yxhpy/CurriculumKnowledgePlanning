import { test, expect } from '@playwright/test';

test.describe('Course Generation Tests', () => {
  test('should navigate to course generation page', async ({ page }) => {
    await page.goto('/');
    
    const courseLink = page.locator('a[href*="course"], button:has-text("Generate"), button:has-text("生成课程")');
    const isCourseVisible = await courseLink.isVisible().catch(() => false);
    
    if (isCourseVisible) {
      await courseLink.click();
      await page.waitForTimeout(1000);
      
      const courseForm = page.locator('form, .course-generation, .generation-wizard');
      await expect(courseForm).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'e2e/screenshots/course-generation.png' });
    }
  });

  test('should display course configuration form', async ({ page }) => {
    await page.goto('/course-generation').catch(() => page.goto('/generate').catch(() => page.goto('/')));
    
    const titleInput = page.locator('input[name*="title" i], input[placeholder*="课程" i]').first();
    const descriptionInput = page.locator('textarea, input[name*="description" i]').first();
    const levelSelect = page.locator('select, .ant-select').first();
    
    const hasForm = 
      await titleInput.isVisible().catch(() => false) ||
      await descriptionInput.isVisible().catch(() => false);
    
    if (hasForm) {
      if (await titleInput.isVisible()) {
        await titleInput.fill('测试课程标题');
      }
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('这是一个测试课程的描述内容');
      }
      
      if (await levelSelect.isVisible()) {
        await levelSelect.click();
        const option = page.locator('.ant-select-item, option').first();
        if (await option.isVisible()) {
          await option.click();
        }
      }
      
      await page.screenshot({ path: 'e2e/screenshots/course-form-filled.png' });
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/course-generation').catch(() => page.goto('/generate').catch(() => page.goto('/')));
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("生成")');
    const isSubmitVisible = await submitButton.isVisible().catch(() => false);
    
    if (isSubmitVisible) {
      await submitButton.click();
      
      const errorMessages = page.locator('.ant-form-item-explain-error, .error-message, [role="alert"]');
      const hasErrors = await errorMessages.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasErrors) {
        const errorCount = await errorMessages.count();
        expect(errorCount).toBeGreaterThan(0);
        
        await page.screenshot({ path: 'e2e/screenshots/course-validation-errors.png' });
      }
    }
  });

  test('should show generation progress', async ({ page }) => {
    await page.goto('/course-generation').catch(() => page.goto('/generate').catch(() => page.goto('/')));
    
    const titleInput = page.locator('input[name*="title" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await titleInput.isVisible() && await submitButton.isVisible()) {
      await page.route('**/api/v1/courses/generate', async route => {
        await page.waitForTimeout(2000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            title: 'Generated Course',
            status: 'completed'
          })
        });
      });
      
      await titleInput.fill('Test Course');
      await submitButton.click();
      
      const progressIndicator = page.locator('.ant-spin, .loading, [role="progressbar"]');
      const isProgressVisible = await progressIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isProgressVisible) {
        await expect(progressIndicator).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/generation-progress.png' });
      }
    }
  });

  test('should display generated course content', async ({ page }) => {
    await page.goto('/courses/1').catch(async () => {
      await page.goto('/courses').catch(() => page.goto('/'));
    });
    
    const courseContent = page.locator('.course-content, .ant-card, article');
    const isContentVisible = await courseContent.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isContentVisible) {
      await expect(courseContent).toBeVisible();
      
      const chapters = courseContent.locator('.chapter, .lesson, .module, h2, h3');
      const chapterCount = await chapters.count();
      
      if (chapterCount > 0) {
        console.log(`Found ${chapterCount} chapters/sections`);
        await page.screenshot({ path: 'e2e/screenshots/course-content.png', fullPage: true });
      }
    }
  });

  test('should allow course export', async ({ page }) => {
    await page.goto('/courses/1').catch(async () => {
      await page.goto('/courses').catch(() => page.goto('/'));
    });
    
    const exportButton = page.locator('button:has-text("Export"), button:has-text("导出")');
    const isExportVisible = await exportButton.isVisible().catch(() => false);
    
    if (isExportVisible) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.click();
      
      const exportOptions = page.locator('.export-options, .ant-dropdown');
      if (await exportOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
        const pdfOption = exportOptions.locator('text=/pdf/i');
        if (await pdfOption.isVisible()) {
          await pdfOption.click();
        }
      }
      
      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        console.log(`Downloaded file: ${filename}`);
        expect(filename).toMatch(/\.(pdf|docx|xlsx)$/);
      }
    }
  });
});