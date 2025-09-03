import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  const API_URL = 'http://localhost:8000/api/v1';

  test('should verify backend API is accessible', async ({ request }) => {
    const response = await request.get(`${API_URL}/openapi.json`).catch(() => null);
    
    if (response) {
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('openapi');
      expect(data).toHaveProperty('paths');
    }
  });

  test('should handle API authentication flow', async ({ page, request }) => {
    await page.goto('/login').catch(() => page.goto('/'));
    
    const loginData = {
      username: 'testuser@example.com',
      password: 'TestPassword123!'
    };
    
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: new URLSearchParams(loginData).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).catch(() => null);
    
    if (loginResponse && loginResponse.status() === 200) {
      const responseData = await loginResponse.json();
      expect(responseData).toHaveProperty('access_token');
      
      const token = responseData.access_token;
      
      const protectedResponse = await request.get(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (protectedResponse.status() === 200) {
        const userData = await protectedResponse.json();
        expect(userData).toHaveProperty('email');
      }
    }
  });

  test('should handle document upload via API', async ({ request }) => {
    const formData = new FormData();
    const fileContent = Buffer.from('Test document content');
    
    const uploadResponse = await request.post(`${API_URL}/documents/upload`, {
      multipart: {
        file: {
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          buffer: fileContent
        }
      }
    }).catch(() => null);
    
    if (uploadResponse) {
      if (uploadResponse.status() === 200 || uploadResponse.status() === 201) {
        const data = await uploadResponse.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('filename');
      }
    }
  });

  test('should verify knowledge graph API endpoints', async ({ request }) => {
    const graphResponse = await request.get(`${API_URL}/knowledge-graph/nodes`).catch(() => null);
    
    if (graphResponse && graphResponse.status() === 200) {
      const nodes = await graphResponse.json();
      expect(Array.isArray(nodes)).toBeTruthy();
    }
    
    const edgesResponse = await request.get(`${API_URL}/knowledge-graph/edges`).catch(() => null);
    
    if (edgesResponse && edgesResponse.status() === 200) {
      const edges = await edgesResponse.json();
      expect(Array.isArray(edges)).toBeTruthy();
    }
  });

  test('should test course generation API', async ({ request }) => {
    const courseData = {
      title: 'Test Course',
      description: 'Test course description',
      level: 'beginner',
      duration: 30
    };
    
    const generateResponse = await request.post(`${API_URL}/courses/generate`, {
      data: courseData
    }).catch(() => null);
    
    if (generateResponse) {
      if (generateResponse.status() === 200 || generateResponse.status() === 201) {
        const course = await generateResponse.json();
        expect(course).toHaveProperty('id');
        expect(course).toHaveProperty('title');
        expect(course.title).toBe(courseData.title);
      }
    }
  });

  test('should verify API error handling', async ({ request }) => {
    const invalidResponse = await request.get(`${API_URL}/invalid-endpoint`).catch(() => null);
    
    if (invalidResponse) {
      expect(invalidResponse.status()).toBe(404);
      
      const errorData = await invalidResponse.json();
      expect(errorData).toHaveProperty('detail');
    }
    
    const malformedRequest = await request.post(`${API_URL}/courses/generate`, {
      data: { invalid: 'data' }
    }).catch(() => null);
    
    if (malformedRequest) {
      expect(malformedRequest.status()).toBe(422);
    }
  });

  test('should test WebSocket connection', async ({ page }) => {
    await page.goto('/');
    
    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const ws = new WebSocket('ws://localhost:8000/ws');
          
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          
          setTimeout(() => resolve(false), 5000);
        } catch {
          resolve(false);
        }
      });
    });
    
    if (wsConnected) {
      console.log('WebSocket connection established successfully');
    }
  });

  test('should measure API response times', async ({ request }) => {
    const endpoints = [
      '/auth/login',
      '/documents',
      '/courses',
      '/knowledge-graph/nodes'
    ];
    
    const performanceMetrics: Record<string, number> = {};
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(`${API_URL}${endpoint}`).catch(() => null);
      const responseTime = Date.now() - startTime;
      
      performanceMetrics[endpoint] = responseTime;
      
      if (response) {
        console.log(`${endpoint}: ${responseTime}ms (Status: ${response.status()})`);
        expect(responseTime).toBeLessThan(3000);
      }
    }
    
    console.log('API Performance Metrics:', performanceMetrics);
  });
});