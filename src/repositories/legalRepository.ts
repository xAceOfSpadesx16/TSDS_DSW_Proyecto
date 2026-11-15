/** Endpoint público del aviso legal. */

import type { LegalDisclaimer } from '../domain/types';
import { http } from './httpClient';

/** Cliente del disclaimer. */
export const legalRepository = {
  /** Devuelve el aviso legal vigente. */
  getDisclaimer(): Promise<LegalDisclaimer> {
    return http.get<LegalDisclaimer>('/legal/disclaimer');
  },
};
