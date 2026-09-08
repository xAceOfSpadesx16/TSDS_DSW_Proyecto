// =============================================================================
// HistoryRepository
//
// Endpoints de historial:
// - POST /api/history         — persiste un sorteo ejecutado
// - GET  /api/histories       — lista paginada del usuario autenticado
// =============================================================================

import type {
  CreateHistoryPayload,
  HistoryListResponse,
  HistoryRecord,
} from '../domain/types';
import { http } from './httpClient';

export interface HistoryListQuery {
  page?: number;
  per_page?: number;
}

export const historyRepository = {
  create(payload: CreateHistoryPayload): Promise<{ data: HistoryRecord }> {
    return http.post<{ data: HistoryRecord }>('/history', payload);
  },

  list(query: HistoryListQuery = {}): Promise<HistoryListResponse> {
    return http.get<HistoryListResponse>('/histories', {
      page: query.page,
      per_page: query.per_page,
    });
  },
};