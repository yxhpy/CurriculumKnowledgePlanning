# Frontend Development Standards

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Code Style Guidelines](#code-style-guidelines)
- [Component Development](#component-development)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Styling Guidelines](#styling-guidelines)
- [Testing Standards](#testing-standards)
- [Performance Guidelines](#performance-guidelines)
- [Error Handling](#error-handling)
- [Build and Deployment](#build-and-deployment)

## Overview

This document defines the unified frontend development standards for the Curriculum Knowledge Planning system. All frontend code must adhere to these guidelines to ensure consistency, maintainability, and scalability.

### Technology Stack
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand
- **UI Library**: Ant Design Pro
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library + Playwright
- **Styling**: CSS Modules + Ant Design theme

## Project Structure

### Directory Organization
```
frontend/src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   └── domain/         # Domain-specific components
├── pages/              # Route components
├── layouts/            # Layout components
├── stores/             # Zustand stores
├── services/           # API services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # Global styles and themes
└── assets/             # Static assets
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useUserData.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types**: PascalCase with descriptive suffix (e.g., `UserData.types.ts`)

## Code Style Guidelines

### TypeScript Configuration
- **Strict Mode**: Always enabled
- **No Any**: Explicit `any` types are forbidden
- **Exact Types**: Use exact object types where possible
- **Import Organization**: Group imports by type (React, libraries, internal)

```typescript
// ✅ Good
import React, { useState, useEffect } from 'react';
import { Button, Form } from 'antd';
import { useUserStore } from '@/stores/userStore';
import { UserData } from '@/types/user.types';

// ❌ Bad
import { Button } from 'antd';
import React from 'react';
import { useUserStore } from '@/stores/userStore';
```

### Variable and Function Naming
- **Variables**: camelCase, descriptive names
- **Functions**: camelCase, verb-based names
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces/Types**: PascalCase with descriptive suffix

```typescript
// ✅ Good
const userDataList = [];
const fetchUserData = async () => {};
const MAX_RETRY_ATTEMPTS = 3;
interface UserProfile {
  id: string;
  name: string;
}

// ❌ Bad
const data = [];
const getData = async () => {};
const maxRetry = 3;
interface User {
  id: any;
}
```

## Component Development

### Component Structure Template
```typescript
import React from 'react';
import { ComponentProps } from './ComponentName.types';
import styles from './ComponentName.module.css';

interface ComponentNameProps extends ComponentProps {
  // Component-specific props
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  ...restProps
}) => {
  // Hooks
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Handle click logic
  }, []);

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Early returns
  if (!prop1) {
    return null;
  }

  return (
    <div className={styles.container} {...restProps}>
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### Component Guidelines
- **Single Responsibility**: One component, one purpose
- **Props Interface**: Always define explicit props interface
- **Default Props**: Use default parameters instead of `defaultProps`
- **Event Handlers**: Use `useCallback` for event handlers passed to children
- **Conditional Rendering**: Use early returns for complex conditions

### Component Types
1. **Presentational Components**: Pure UI components with no business logic
2. **Container Components**: Components that handle state and business logic
3. **Layout Components**: Components responsible for page structure
4. **Page Components**: Route-level components

## State Management

### Zustand Store Structure
```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  // State properties
  user: UserData | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: UserData) => void;
  clearUser: () => void;
  fetchUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      loading: false,
      error: null,
      
      // Actions
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      fetchUser: async (id) => {
        set({ loading: true, error: null });
        try {
          const user = await userService.getUser(id);
          set({ user, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },
    }),
    { name: 'user-store' }
  )
);
```

### Store Guidelines
- **Single Responsibility**: Each store manages one domain
- **Async Actions**: Handle loading and error states
- **Devtools**: Always enable Redux DevTools for debugging
- **Immutability**: Use immutable updates for complex state

## API Integration

### Service Layer Structure
```typescript
// services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Service Pattern
```typescript
// services/userService.ts
import { apiClient } from './api';
import { UserData, CreateUserRequest } from '@/types/user.types';

export const userService = {
  getUser: async (id: string): Promise<UserData> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: CreateUserRequest): Promise<UserData> => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<UserData>): Promise<UserData> => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
```

## Styling Guidelines

### CSS Architecture

#### CSS Modules Pattern
```css
/* ComponentName.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-container);
  border-radius: var(--border-radius-base);
  box-shadow: var(--shadow-sm);
}

.header {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.content {
  flex: 1;
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

/* State variants */
.container--loading {
  opacity: 0.6;
  pointer-events: none;
}

.container--error {
  border-color: var(--color-error);
  background-color: var(--color-error-bg);
}

/* Size variants */
.container--small {
  padding: var(--spacing-sm);
  gap: var(--spacing-xs);
}

.container--large {
  padding: var(--spacing-xl);
  gap: var(--spacing-lg);
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }
  
  .header {
    font-size: var(--font-size-lg);
  }
}
```

#### CSS Variable System
```css
/* styles/variables.css */
:root {
  /* Colors - Primary */
  --color-primary: #1890ff;
  --color-primary-hover: #40a9ff;
  --color-primary-active: #096dd9;
  --color-primary-light: #e6f7ff;
  
  /* Colors - Text */
  --color-text-primary: rgba(0, 0, 0, 0.85);
  --color-text-secondary: rgba(0, 0, 0, 0.65);
  --color-text-tertiary: rgba(0, 0, 0, 0.45);
  --color-text-disabled: rgba(0, 0, 0, 0.25);
  
  /* Colors - Background */
  --color-bg-base: #ffffff;
  --color-bg-container: #ffffff;
  --color-bg-layout: #f5f5f5;
  --color-bg-spotlight: #fafafa;
  
  /* Colors - Border */
  --color-border: #d9d9d9;
  --color-border-secondary: #f0f0f0;
  
  /* Colors - Status */
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-error: #ff4d4f;
  --color-info: #1890ff;
  
  /* Colors - Status Background */
  --color-success-bg: #f6ffed;
  --color-warning-bg: #fffbe6;
  --color-error-bg: #fff2f0;
  --color-info-bg: #e6f7ff;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-code: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --font-size-xxl: 32px;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-base: 1.5;
  --line-height-sm: 1.2;
  --line-height-lg: 1.8;
  
  /* Border Radius */
  --border-radius-sm: 4px;
  --border-radius-base: 6px;
  --border-radius-lg: 8px;
  --border-radius-xl: 12px;
  --border-radius-full: 50%;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  --shadow-base: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  
  /* Transitions */
  --transition-fast: 0.1s ease-in-out;
  --transition-base: 0.2s ease-in-out;
  --transition-slow: 0.3s ease-in-out;
}

/* Dark theme */
[data-theme='dark'] {
  --color-text-primary: rgba(255, 255, 255, 0.85);
  --color-text-secondary: rgba(255, 255, 255, 0.65);
  --color-text-tertiary: rgba(255, 255, 255, 0.45);
  --color-bg-base: #141414;
  --color-bg-container: #1f1f1f;
  --color-bg-layout: #000000;
  --color-border: #434343;
  --color-border-secondary: #303030;
}
```

### Ant Design Customization

#### Theme Configuration
```typescript
// styles/theme.ts
import { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    // Primary colors
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Border
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    
    // Typography
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    
    // Layout
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      paddingContentHorizontal: 16,
    },
    Input: {
      borderRadius: 4,
      controlHeight: 36,
      paddingInline: 12,
    },
    Card: {
      borderRadius: 8,
      paddingLG: 24,
    },
    Table: {
      borderRadius: 6,
      padding: 16,
    },
    Modal: {
      borderRadius: 8,
      padding: 24,
    },
    Drawer: {
      padding: 24,
    },
    Form: {
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 8px',
    },
  },
};

export const darkTheme: ThemeConfig = {
  ...lightTheme,
  algorithm: [theme.darkAlgorithm],
};
```

#### Component-Specific Styling
```scss
// styles/components/button.scss
.ant-btn {
  &.btn-gradient {
    background: linear-gradient(135deg, var(--color-primary) 0%, #40a9ff 100%);
    border: none;
    color: white;
    
    &:hover {
      background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  &.btn-outline {
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    
    &:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary-hover);
      color: var(--color-primary-hover);
    }
  }
}
```

### Layout System

#### Grid System
```css
/* styles/layout/grid.css */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.container--fluid {
  max-width: none;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 calc(var(--spacing-md) * -0.5);
}

.col {
  flex: 1;
  padding: 0 calc(var(--spacing-md) * 0.5);
}

.col-1 { flex: 0 0 8.33333%; }
.col-2 { flex: 0 0 16.66667%; }
.col-3 { flex: 0 0 25%; }
.col-4 { flex: 0 0 33.33333%; }
.col-6 { flex: 0 0 50%; }
.col-8 { flex: 0 0 66.66667%; }
.col-9 { flex: 0 0 75%; }
.col-12 { flex: 0 0 100%; }

@media (max-width: 768px) {
  .col-sm-12 { flex: 0 0 100%; }
}
```

#### Flexbox Utilities
```css
/* styles/utilities/flex.css */
.d-flex { display: flex; }
.d-inline-flex { display: inline-flex; }

.flex-row { flex-direction: row; }
.flex-column { flex-direction: column; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }

.align-start { align-items: flex-start; }
.align-center { align-items: center; }
.align-end { align-items: flex-end; }
.align-stretch { align-items: stretch; }

.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

.flex-grow-1 { flex-grow: 1; }
.flex-shrink-0 { flex-shrink: 0; }
```

### Responsive Design

#### Breakpoint System
```scss
// styles/mixins/breakpoints.scss
$breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);

@mixin media-up($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    $value: map-get($breakpoints, $breakpoint);
    @media (min-width: $value) {
      @content;
    }
  }
}

@mixin media-down($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    $value: map-get($breakpoints, $breakpoint) - 1px;
    @media (max-width: $value) {
      @content;
    }
  }
}

@mixin media-between($lower, $upper) {
  @if map-has-key($breakpoints, $lower) and map-has-key($breakpoints, $upper) {
    $lower-value: map-get($breakpoints, $lower);
    $upper-value: map-get($breakpoints, $upper) - 1px;
    @media (min-width: $lower-value) and (max-width: $upper-value) {
      @content;
    }
  }
}
```

### Animation and Transitions

#### Keyframes Library
```css
/* styles/animations.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Animation classes */
.fade-in { animation: fadeIn var(--transition-base) ease-out; }
.slide-in-up { animation: slideInUp var(--transition-base) ease-out; }
.slide-in-down { animation: slideInDown var(--transition-base) ease-out; }
.slide-in-left { animation: slideInLeft var(--transition-base) ease-out; }
.slide-in-right { animation: slideInRight var(--transition-base) ease-out; }
.pulse { animation: pulse 2s infinite; }
.spin { animation: spin 1s linear infinite; }
```

### Accessibility (A11Y) Styles

#### Focus Management
```css
/* styles/accessibility.css */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  @extend .focus-visible;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: var(--border-radius-sm);
  z-index: var(--z-tooltip);
  
  &:focus {
    top: 6px;
  }
}
```

### Naming Conventions

#### BEM Methodology
```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__body { }
.card__footer { }

/* Modifier */
.card--large { }
.card--primary { }
.card--loading { }

/* State */
.card.is-active { }
.card.is-disabled { }
.card.has-error { }
```

#### CSS Modules Naming
```css
/* ComponentName.module.css */
.container { } /* Block */
.header { } /* Element */
.content { } /* Element */

/* Modifiers use double dash */
.container--large { }
.container--primary { }

/* States use is/has prefix */
.isActive { }
.hasError { }
.isLoading { }
```

### Performance Optimization

#### CSS Optimization Rules
- **Critical CSS**: Inline critical styles for above-the-fold content
- **CSS Purging**: Remove unused CSS in production builds
- **CSS Minification**: Minify CSS files for production
- **Font Loading**: Optimize font loading with font-display: swap
- **Image Optimization**: Use responsive images and modern formats

### Style Guide Checklist

#### Component Styling
- [ ] Uses CSS Variables for theme values
- [ ] Follows BEM or CSS Modules naming convention
- [ ] Implements responsive design
- [ ] Includes hover/focus/active states
- [ ] Supports dark theme
- [ ] Has loading and error states
- [ ] Follows accessibility guidelines

#### Code Quality
- [ ] No magic numbers in CSS
- [ ] Consistent spacing using design tokens
- [ ] Proper z-index management
- [ ] Optimized for performance
- [ ] Uses semantic color names
- [ ] Follows established patterns

## Testing Standards

### Unit Testing with Jest + RTL
```typescript
// __tests__/UserProfile.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from '../UserProfile';
import { userService } from '@/services/userService';

// Mock dependencies
jest.mock('@/services/userService');
const mockUserService = jest.mocked(userService);

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user profile correctly', () => {
    const mockUser = { id: '1', name: 'John Doe' };
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle user update', async () => {
    mockUserService.updateUser.mockResolvedValue({ id: '1', name: 'Jane Doe' });
    
    render(<UserProfile user={{ id: '1', name: 'John Doe' }} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });
});
```

### E2E Testing Guidelines
- **Test Structure**: Follow Page Object Model
- **Test Data**: Use test fixtures, avoid hardcoded data
- **Selectors**: Use data-testid for reliable element selection
- **Coverage**: Aim for 90%+ test coverage

## Performance Guidelines

### Code Splitting
```typescript
// Lazy loading for route components
import { lazy, Suspense } from 'react';

const CourseList = lazy(() => import('@/pages/CourseList'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));

// Usage in Router
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/courses" element={<CourseList />} />
    <Route path="/courses/:id" element={<CourseDetail />} />
  </Routes>
</Suspense>
```

### Optimization Patterns
- **React.memo**: For expensive components
- **useCallback**: For event handlers passed to children
- **useMemo**: For expensive calculations
- **Virtual Scrolling**: For large lists
- **Image Optimization**: Use appropriate formats and sizes

## Error Handling

### Error Boundary
```typescript
// components/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error!} />;
    }

    return this.props.children;
  }
}
```

### Error Handling Patterns
- **Error Boundaries**: For component-level error handling
- **Try-Catch**: For async operations
- **User Feedback**: Show meaningful error messages
- **Logging**: Log errors for debugging

## Build and Deployment

### Environment Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Build optimization enabled
- [ ] Source maps generated
- [ ] Bundle analysis completed
- [ ] Performance metrics measured
- [ ] Error monitoring configured

## Code Review Checklist

### Component Review
- [ ] Component follows single responsibility principle
- [ ] Props are properly typed
- [ ] Event handlers use useCallback when appropriate
- [ ] Component is properly tested
- [ ] Accessibility attributes are included

### Code Quality
- [ ] No TypeScript errors or warnings
- [ ] ESLint rules pass
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Performance considerations addressed

### Standards Compliance
- [ ] File naming follows conventions
- [ ] Code structure matches project standards
- [ ] API integration follows service pattern
- [ ] Styling uses approved methods
- [ ] Documentation is updated if needed