const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  it('should respond with OK on health check', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });
});