// Mocks compartidos para el entorno jsdom que usan las páginas animadas
// (Dice, Roulette). Sin ellos, `requestAnimationFrame` recursaría infinitamente
// porque el reloj real nunca avanza 500ms/4500ms dentro de un test síncrono,
// y `canvas.getContext('2d')` devuelve `null` en jsdom.

/**
 * Stubdea `requestAnimationFrame` para invocar el callback de forma
 * síncrona con un reloj que salta muy adelante, de modo que cualquier
 * animación basada en tiempo (dice: 500ms, ruleta: 4500ms) se resuelve en
 * una sola pasada commiteando el resultado final.
 */
export function mockRequestAnimationFrame(): void {
  let clock = 10_000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    clock += 5000;
    cb(clock);
    return clock;
  });
}

/**
 * Stubdea `HTMLCanvasElement.prototype.getContext` devolviendo un contexto 2D
 * falso (un Proxy que responde con funciones no-op a cualquier método y
 * ignora las asignaciones de propiedades). Permite que `drawRoulette` ejecute
 * todo su cuerpo sin un canvas real.
 */
export function mockCanvasContext(): void {
  const mockCtx = new Proxy(
    {},
    { get: () => () => {}, set: () => true },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
}

export interface NativeDialogSpies {
  showModal: ReturnType<typeof vi.spyOn>;
  close: ReturnType<typeof vi.spyOn>;
}

/**
 * Stubdea `dialog.showModal`/`close`. jsdom (v30) no implementa `<dialog>`
 * nativo (falta `showModal`/`close`), así que primero definimos la firma base
 * y luego spreamos con implementaciones que alternan la propiedad `open`,
 * permitiendo validar la apertura/cierre visual vía el atributo `open`.
 */
export function mockNativeDialog(): NativeDialogSpies {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  }
  const showModal = vi
    .spyOn(HTMLDialogElement.prototype, 'showModal')
    .mockImplementation(function (this: HTMLDialogElement) {
      this.open = true;
    });
  const close = vi
    .spyOn(HTMLDialogElement.prototype, 'close')
    .mockImplementation(function (this: HTMLDialogElement) {
      this.open = false;
    });
  return { showModal, close };
}
