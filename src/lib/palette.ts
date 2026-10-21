// =============================================================================
// palette.ts
//
// Colores de datos que no se pueden expresar solo con clases Tailwind: los
// segmentos del canvas de la ruleta y los bordes de las tarjetas de equipos.
// Los colores de interfaz viven en `src/index.css` (variables CSS).
// =============================================================================

/** Tinta y papel de la dirección, para fallbacks del canvas. */
export const PAPER_INK = '#221f1a';
export const PAPER_SURFACE = '#fbf8f1';
export const PAPER_ON_ACTION = '#f8fbff';

/**
 * Paleta accesible para las opciones de la ruleta. Todos estos colores
 * alcanzan al menos 4.5:1 con `PAPER_ON_ACTION`; si el usuario elige un
 * color propio, la etiqueta se ajusta en `accessibleSegment`.
 */
export const ROULETTE_PALETTE: readonly string[] = [
  '#1f4fb5',
  '#1f6b47',
  '#b23a2f',
  '#92400e',
  '#0f766e',
  '#3f6212',
  '#7c2d12',
  '#155e75',
];

/** Paleta de bordes para las tarjetas de equipos (contraste ≥ 3:1). */
export const TEAM_PALETTE: readonly string[] = [
  '#1f4fb5',
  '#1f6b47',
  '#b23a2f',
  '#92400e',
  '#0f766e',
  '#3f6212',
  '#7c2d12',
  '#155e75',
  '#9d174d',
  '#374151',
  '#a16207',
  '#4d7c0f',
];

type Rgb = readonly [number, number, number];

function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const number = Number.parseInt(match[1], 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return 1;
  const light = Math.max(luminance(rgbA), luminance(rgbB));
  const dark = Math.min(luminance(rgbA), luminance(rgbB));
  return (light + 0.05) / (dark + 0.05);
}

function mixWithBlack(value: string, amount: number): string {
  const rgb = parseHex(value);
  if (!rgb) return value;
  const mixed = rgb.map((channel) =>
    Math.round(channel * (1 - amount)),
  ) as unknown as Rgb;
  return `#${mixed
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}


/** Comprueba si un color es un hex de seis dígitos. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (hue % 360) / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const offset = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (sector < 1) [red, green, blue] = [chroma, x, 0];
  else if (sector < 2) [red, green, blue] = [x, chroma, 0];
  else if (sector < 3) [red, green, blue] = [0, chroma, x];
  else if (sector < 4) [red, green, blue] = [0, x, chroma];
  else if (sector < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];
  const channel = (value: number) =>
    Math.round((value + offset) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

/**
 * Devuelve un color válido y no usado. Primero intenta respetar el color
 * preferido; si ya está en uso, toma el primer hueco de la paleta. Cuando
 * la paleta se agota, genera un tono oscuro con el ángulo áureo: el texto
 * claro conserva al menos 4.5:1 y cada opción mantiene un color propio.
 */
export function uniqueRouletteColor(
  used: ReadonlySet<string>,
  preferred: string,
): string {
  const candidate = isHexColor(preferred) ? preferred : ROULETTE_PALETTE[0];
  if (!used.has(candidate.toLowerCase())) {
    return candidate;
  }

  const fromPalette = ROULETTE_PALETTE.find(
    (color) => !used.has(color.toLowerCase()),
  );
  if (fromPalette) {
    return fromPalette;
  }

  for (let attempt = 0; attempt < 720; attempt += 1) {
    const hue = (used.size * 137.508 + attempt * 17.3) % 360;
    const generated = hslToHex(hue, 60, 28);
    if (!used.has(generated.toLowerCase())) {
      return generated;
    }
  }

  return candidate;
}

export interface AccessibleSegment {
  fill: string;
  label: string;
}

/**
 * Devuelve un relleno y un color de etiqueta con contraste ≥ 4.5:1.
 * Si ningún texto claro/oscuro alcanza el mínimo, oscurece el relleno en
 * pasos pequeños hasta que el texto claro lo logre.
 */
export function accessibleSegment(value: string): AccessibleSegment {
  const candidate = parseHex(value) ? value : ROULETTE_PALETTE[0];
  const lightContrast = contrastRatio(candidate, PAPER_ON_ACTION);
  const darkContrast = contrastRatio(candidate, PAPER_INK);

  if (lightContrast >= 4.5 && lightContrast >= darkContrast) {
    return { fill: candidate, label: PAPER_ON_ACTION };
  }
  if (darkContrast >= 4.5) {
    return { fill: candidate, label: PAPER_INK };
  }

  for (let amount = 0.05; amount <= 0.8; amount += 0.05) {
    const darker = mixWithBlack(candidate, amount);
    if (contrastRatio(darker, PAPER_ON_ACTION) >= 4.5) {
      return { fill: darker, label: PAPER_ON_ACTION };
    }
  }

  return { fill: ROULETTE_PALETTE[0], label: PAPER_ON_ACTION };
}
