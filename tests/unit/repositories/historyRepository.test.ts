import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { historyRepository } from '../../../src/repositories/historyRepository';
import type { CreateHistoryPayload } from '../../../src/domain/types';
import { jsonResponse } from '../helpers/fetchMock';

function lastCall() {
  const calls = vi.mocked(global.fetch).mock.calls;
  return {
    url: String(calls[calls.length - 1][0]),
    method: (calls[calls.length - 1][1] as RequestInit).method,
    body: calls[calls.length - 1][1]?.body,
  };
}

describe('historyRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: {} })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('crea un registro de historia con POST /history', async () => {
    // La forma es la que la unión discriminada de `CreateHistoryPayload`
    // exige para el módulo `dice`. El assertion compara el body enviado
    // contra este mismo objeto, así que sigue probando lo mismo.
    const payload: CreateHistoryPayload = {
      module_name: 'dice',
      action: 'd6',
      payload: { sides: 6, modifier: 0 },
      result: { rolls: [4], modifier: 0, total: 4 },
    };
    const record = { id: 'h1', module_name: 'dice', action: 'd6' };
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ data: record }));

    const res = await historyRepository.create(payload);

    const { url, method, body } = lastCall();
    expect(url).toBe('http://127.0.0.1:8000/api/history');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual(payload);
    expect(res).toEqual({ data: record });
  });

  it('lista la historia con GET /histories aplicando query params', async () => {
    const page = 2;
    const perPage = 10;
    const records = [{ id: 'h1' }, { id: 'h2' }];
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ data: records }));

    const res = await historyRepository.list({ page, per_page: perPage });

    const { url, method } = lastCall();
    expect(url).toContain('/api/histories');
    expect(url).toContain(`page=${page}`);
    expect(url).toContain(`per_page=${perPage}`);
    expect(method).toBe('GET');
    expect(res).toEqual({ data: records });
  });
});
