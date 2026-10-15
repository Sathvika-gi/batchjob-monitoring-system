import request from 'supertest';
import app from '../src/app.js';

describe('Health and Readiness Endpoints', () => {
  test('GET /health returns process liveness status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
  });

  test('GET /api/v1/health reflects database status', async () => {
    const res = await request(app).get('/api/v1/health');
    // When DB is not connected, it returns 503 unavailable
    // If DB is connected, it returns 200 connected
    expect([200, 503]).toContain(res.status);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.application).toBe('healthy');
    expect(['connected', 'unavailable']).toContain(res.body.data.database);
  });

  test('GET /api/v1/health/ready reflects readiness status', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body.data).toBeDefined();
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.application).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    } else {
      expect(res.body.success).toBe(false);
      expect(res.body.data.application).toBe('not_ready');
      expect(res.body.data.database).toBe('unavailable');
    }
  });

  describe('Authentication Enforcement on Protected Routes', () => {
    test('GET /api/v1/auth/me rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/v1/jobs rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/v1/workflows rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/workflows');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/v1/executions rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/executions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/v1/alerts rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/alerts');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with invalid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'Bearer invalid.token.value');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

