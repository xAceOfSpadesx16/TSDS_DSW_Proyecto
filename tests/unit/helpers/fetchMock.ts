// =============================================================================
// fetchMock — respuestas de `fetch` para los tests.
//
// `global.fetch` está declarado como `(input, init) => Promise<Response>`, así
// que los dobles de prueba tienen que satisfacer ese tipo. Los helpers de acá
// construyen el doble con los tres campos que el `httpClient` realmente lee
// (`ok`, `status`, `json`) y lo presentan como `Response` en el punto de
// retorno. El objeto en memoria es exactamente el mismo de antes: esto solo
// hace que el typecheck no se queje.
// =============================================================================

export interface MockResponseInit {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}

/** Respuesta JSON con `ok` derivado del status. */
export function jsonResponse(data: unknown, status = 200): Response {
  return asResponse({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

/** Respuesta de error con `ok: false`. */
export function errorResponse(status: number, body: unknown): Response {
  return asResponse({ ok: false, status, json: async () => body });
}

/** Respuesta de error cuyo `json()` revienta, como un body no-JSON. */
export function unparsableErrorResponse(status: number): Response {
  return asResponse({
    ok: false,
    status,
    json: async () => {
      throw new Error('no json');
    },
  });
}

/** Respuesta 204: sin cuerpo y con `ok: true`. */
export function noContentResponse(): Response {
  return asResponse({ ok: true, status: 204, json: async () => ({}) });
}

/**
 * Presenta un doble de `Response` parcial como `Response`.
 *
 * El doble solo implementa la parte del contrato que el `httpClient` usa;
 * el resto de los miembros de `Response` no se ejercitan en los tests.
 */
export function asResponse(init: MockResponseInit): Response {
  const partial: MockResponseInit = {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: init.json ?? (async () => ({})),
  };
  return partial as Response;
}
