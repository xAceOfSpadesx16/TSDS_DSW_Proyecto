// =============================================================================
// legalRepository
//
// Endpoint del disclaimer público. No requiere sesión: el contenido es
// estático y el backend no lo filtra por usuario.
// =============================================================================

import type { LegalDisclaimer } from '../domain/types';
import { http } from './httpClient';

export const legalRepository = {
  getDisclaimer(): Promise<LegalDisclaimer> {
    return http.get<LegalDisclaimer>('/legal/disclaimer');
  },
};
