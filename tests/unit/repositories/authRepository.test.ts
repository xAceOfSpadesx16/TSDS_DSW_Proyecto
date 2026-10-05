import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRepository } from '../../../src/repositories/authRepository';

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function lastCall() {
  const calls = vi.mocked(global.fetch).mock.calls;
  return {
    url: String(calls[calls.length - 1][0]),
    method: (calls[calls.length - 1][1] as RequestInit).method,
    body: calls[calls.length - 1][1]?.body,
  };
}

describe('authRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: {} })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('registra a un usuario con POST /auth/register', async () => {
    const payload = { name: 'Ada', email: 'ada@example.com', password: 's3cret' };
    await authRepository.register(payload);

    const { url, method, body } = lastCall();
    expect(url).toBe('http://127.0.0.1:8000/api/auth/register');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual(payload);
  });

  it('inicia sesión con POST /auth/login', async () => {
    const payload = { email: 'ada@example.com', password: 's3cret' };
    await authRepository.login(payload);

    const { url, method, body } = lastCall();
    expect(url).toBe('http://127.0.0.1:8000/api/auth/login');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual(payload);
  });

  it('obtiene el usuario actual con GET /auth/me', async () => {
    await authRepository.me();
    const { url, method } = lastCall();
    expect(url).toBe('http://127.0.0.1:8000/api/auth/me');
    expect(method).toBe('GET');
  });

  it('cierra sesión con POST /auth/logout', async () => {
    await authRepository.logout();
    const { url, method } = lastCall();
    expect(url).toBe('http://127.0.0.1:8000/api/auth/logout');
    expect(method).toBe('POST');
  });
});
