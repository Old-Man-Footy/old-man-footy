import { describe, it, expect, vi, beforeEach } from 'vitest';
import { comingSoonMode } from '/middleware/comingSoon.mjs';

/**
 * Helper to create mock req/res/next objects
 */
function createMock({ path = '/', user = null, isAuthenticated = undefined, env = {} } = {}) {
  const req = {
    path,
    user,
    isAuthenticated,
    flash: vi.fn(),
  };
  if (typeof isAuthenticated === 'function') req.isAuthenticated = isAuthenticated;
  const res = {
    redirect: vi.fn(),
  };
  const next = vi.fn();
  // Set environment variable
  process.env.FEATURE_COMING_SOON_MODE = env.FEATURE_COMING_SOON_MODE ?? 'false';
  return { req, res, next };
}

describe('comingSoonMode middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.FEATURE_COMING_SOON_MODE = 'false';
  });

  it('should call next() if FEATURE_COMING_SOON_MODE is not enabled', () => {
    const { req, res, next } = createMock({ path: '/' });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to /coming-soon page', () => {
    const { req, res, next } = createMock({
      path: '/coming-soon',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to /subscribe endpoint', () => {
    const { req, res, next } = createMock({
      path: '/subscribe',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to static assets', () => {
    const staticPaths = [
      '/styles/main.css',
      '/scripts/app.js',
      '/images/logo.png',
      '/icons/favicon.ico',
      '/js/client.js',
    ];
    for (const path of staticPaths) {
      const { req, res, next } = createMock({
        path,
        env: { FEATURE_COMING_SOON_MODE: 'true' },
      });
      comingSoonMode(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.redirect).not.toHaveBeenCalled();
    }
  });

  it('should block /auth/register and redirect with flash message', () => {
    const { req, res, next } = createMock({
      path: '/auth/register',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(req.flash).toHaveBeenCalledWith(
      'error_msg',
      'Registration is currently disabled. Please check back when we launch!'
    );
    expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow access to other /auth/* routes', () => {
    const { req, res, next } = createMock({
      path: '/auth/login',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to /health endpoint', () => {
    const { req, res, next } = createMock({
      path: '/health',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to /api/coming-soon/status endpoint', () => {
    const { req, res, next } = createMock({
      path: '/api/coming-soon/status',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow access to /admin routes', () => {
    const { req, res, next } = createMock({
      path: '/admin/dashboard',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should allow authenticated user to access /dashboard and /', () => {
    const paths = ['/dashboard', '/'];
    for (const path of paths) {
      const { req, res, next } = createMock({
        path,
        user: { id: 1 },
        isAuthenticated: () => true,
        env: { FEATURE_COMING_SOON_MODE: 'true' },
      });
      comingSoonMode(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.redirect).not.toHaveBeenCalled();
    }
  });

  it('should allow authenticated user to access protected routes', () => {
    const protectedPaths = [
      '/clubs/1',
      '/carnivals/2',
      '/sponsors/3',
      '/carnival-sponsors/4',
    ];
    for (const path of protectedPaths) {
      const { req, res, next } = createMock({
        path,
        user: { id: 1 },
        isAuthenticated: () => true,
        env: { FEATURE_COMING_SOON_MODE: 'true' },
      });
      comingSoonMode(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.redirect).not.toHaveBeenCalled();
    }
  });

  it('should allow admin user access to any route', () => {
    const { req, res, next } = createMock({
      path: '/any-route',
      user: { id: 1, isAdmin: true },
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should redirect unauthenticated users to /coming-soon for other routes', () => {
    const { req, res, next } = createMock({
      path: '/random',
      env: { FEATURE_COMING_SOON_MODE: 'true' },
    });
    comingSoonMode(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/coming-soon');
    expect(next).not.toHaveBeenCalled();
  });
});