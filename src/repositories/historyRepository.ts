/** Endpoints del historial. */

import type {
  CreateHistoryPayload,
  HistoryListResponse,
  HistoryRecord,
} from '../domain/types';
import { http } from './httpClient';

/** Parámetros de paginación del historial. */
export interface HistoryListQuery {
  page?: number;
  per_page?: number;
}

/** Cliente de los endpoints de historial. */
export const historyRepository = {
  /** Persiste un sorteo. */
  create(payload: CreateHistoryPayload): Promise<{ data: HistoryRecord }> {
    return http.post<{ data: HistoryRecord }>('/history', payload);
  },

  /** Lista el historial del usuario autenticado. */
  list(query: HistoryListQuery = {}): Promise<HistoryListResponse> {
    return http.get<HistoryListResponse>('/histories', {
      page: query.page,
      per_page: query.per_page,
    });
  },

  /** Borra un registro propio. */
  remove(id: string): Promise<void> {
    return http.delete<void>(`/history/${encodeURIComponent(id)}`);
  },

  /** Borra todo el historial del usuario. */
  clearAll(): Promise<void> {
    return http.delete<void>('/histories');
  },
};
