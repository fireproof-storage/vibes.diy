import { vi, describe, it, expect } from 'vitest';
import routes from '../app/routes';

describe('Routes', () => {
  it('defines the correct routes', () => {
    // Check that routes is an array
    expect(Array.isArray(routes)).toBe(true);

    // Check that there is at least one route defined
    expect(routes.length).toBeGreaterThan(0);

    // Check that the index route is defined
    const indexRoute = routes[0];
    expect(indexRoute).toBeDefined();

    // Check that the route has a file property that includes unified-session.tsx
    expect(indexRoute).toHaveProperty('file');
    expect(indexRoute.file).toContain('home.tsx');
  });
});
