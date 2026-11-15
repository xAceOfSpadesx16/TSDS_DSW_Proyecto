/** Acceso tipado a `localStorage` con versión, validación y fallos seguros. */

import type { RouletteOption, TeamsMode, WeightedEntry } from '../domain/contracts';
import type { CreateHistoryPayload, ModuleName } from '../domain/types';

/** Versión del esquema persistido. */
export const STORAGE_SCHEMA_VERSION = 1;
/** Máximo de sorteos guardados para invitados. */
export const MAX_GUEST_ENTRIES = 100;

const STORAGE_PREFIX = 'thrive_';
const GUEST_HISTORY_KEY = `${STORAGE_PREFIX}guest_history_v1`;
const PENDING_KEY_PREFIX = `${STORAGE_PREFIX}pending_`;
const DICE_OPTIONS_KEY = `${STORAGE_PREFIX}dice_options_v1`;
const NUMBERS_OPTIONS_KEY = `${STORAGE_PREFIX}numbers_options_v1`;
const ROULETTE_OPTIONS_KEY = `${STORAGE_PREFIX}roulette_options_v1`;
const TEAMS_OPTIONS_KEY = `${STORAGE_PREFIX}teams_options_v1`;
const WEIGHTED_OPTIONS_KEY = `${STORAGE_PREFIX}weighted_options_v1`;
const HISTORY_OPEN_KEY = `${STORAGE_PREFIX}history_open_v1`;

const MODULE_NAMES: readonly ModuleName[] = [
  'dice',
  'numbers',
  'roulette',
  'teams',
  'weighted',
];

const DICE_SIDES: readonly number[] = [4, 6, 8, 12, 20];

/** Sorteo que no llegó al backend y espera reintentarse. */
export interface PendingDraw {
  record: CreateHistoryPayload;
  userId: number;
}

/** Entrada del historial visible en la interfaz. */
export interface LocalHistoryEntry {
  id: string;
  module: ModuleName;
  description: string;
  timestamp: string;
  synced: boolean;
  pending?: PendingDraw;
  record?: CreateHistoryPayload;
}

/** Opciones persistidas de la pantalla de dados. */
export interface DiceOptions {
  lastSides: number | null;
  modifier: number;
}

/** Opciones persistidas del generador de números. */
export interface NumbersOptions {
  count: number;
  min: number;
  max: number;
  unique: boolean;
}

/** Opciones persistidas del generador de equipos. */
export interface TeamsOptions {
  participantsText: string;
  mode: TeamsMode;
  value: number;
  exclusions: Array<[string, string]>;
}

/** Opciones persistidas de la ruleta. */
export interface RouletteOptions {
  options: RouletteOption[];
}

/** Opciones persistidas del sorteo ponderado. */
export interface WeightedOptions {
  entries: WeightedEntry[];
  originalEntries: WeightedEntry[];
  autoRemove: boolean;
}

function getStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Indica si el navegador permite usar `localStorage`. */
export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

function isModuleName(value: unknown): value is ModuleName {
  return typeof value === 'string' && (MODULE_NAMES as readonly string[]).includes(value);
}

function isCreateHistoryPayload(value: unknown): value is CreateHistoryPayload {
  return (
    isRecord(value) &&
    isModuleName(value.module_name) &&
    typeof value.action === 'string' &&
    isRecord(value.payload) &&
    isRecord(value.result)
  );
}

function isPendingDraw(value: unknown): value is PendingDraw {
  return (
    isRecord(value) &&
    typeof value.userId === 'number' &&
    isCreateHistoryPayload(value.record)
  );
}

function isHistoryEntry(value: unknown): value is LocalHistoryEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isModuleName(value.module) &&
    typeof value.description === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.synced === 'boolean' &&
    (value.record === undefined || isCreateHistoryPayload(value.record)) &&
    (value.pending === undefined || isPendingDraw(value.pending))
  );
}

function isHistoryEntryArray(value: unknown): value is LocalHistoryEntry[] {
  return Array.isArray(value) && value.every(isHistoryEntry);
}

function readVersioned<T>(
  key: string,
  validate: (value: unknown) => value is T,
): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== STORAGE_SCHEMA_VERSION) {
      return null;
    }
    return validate(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeVersioned(key: string, data: unknown): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(
      key,
      JSON.stringify({ version: STORAGE_SCHEMA_VERSION, data }),
    );
  } catch {
    // localStorage lleno o bloqueado: la app sigue funcionando en memoria.
  }
}

function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // No hay nada que hacer si el navegador bloquea el borrado.
  }
}

/** Lee y valida un JSON persistido sin versión. */
export function readStoredJson<T>(
  key: string,
  validate: (value: unknown) => value is T,
): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persiste un JSON sin versión. */
export function writeStoredJson(key: string, value: unknown): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin persistencia disponible: la sesión sigue en memoria.
  }
}

/** Borra una clave persistida. */
export function removeStoredKey(key: string): void {
  removeKey(key);
}

/** Carga el historial de invitado. */
export function loadGuestHistory(): LocalHistoryEntry[] {
  const stored = readVersioned(GUEST_HISTORY_KEY, isHistoryEntryArray) ?? [];
  return stored.slice(0, MAX_GUEST_ENTRIES);
}

/** Guarda el historial de invitado, acotado al máximo. */
export function saveGuestHistory(entries: LocalHistoryEntry[]): void {
  writeVersioned(GUEST_HISTORY_KEY, entries.slice(0, MAX_GUEST_ENTRIES));
}

/** Borra el historial de invitado. */
export function clearGuestHistory(): void {
  removeKey(GUEST_HISTORY_KEY);
}

function pendingKey(userId: number): string {
  return `${PENDING_KEY_PREFIX}${userId}_v1`;
}

/** Carga los pendientes de un usuario. */
export function loadPendingDraws(userId: number): LocalHistoryEntry[] {
  return readVersioned(pendingKey(userId), isHistoryEntryArray) ?? [];
}

/** Reemplaza los pendientes de un usuario. */
export function savePendingDraws(
  userId: number,
  entries: LocalHistoryEntry[],
): void {
  writeVersioned(pendingKey(userId), entries);
}

/** Agrega o actualiza un pendiente del usuario. */
export function savePendingDraw(userId: number, entry: LocalHistoryEntry): void {
  const current = loadPendingDraws(userId).filter((e) => e.id !== entry.id);
  savePendingDraws(userId, [entry, ...current]);
}

/** Borra un pendiente del usuario. */
export function removePendingDraw(userId: number, id: string): void {
  const current = loadPendingDraws(userId).filter((e) => e.id !== id);
  if (current.length > 0) {
    savePendingDraws(userId, current);
  } else {
    removeKey(pendingKey(userId));
  }
}

/** Borra todos los pendientes de un usuario. */
export function clearPendingDraws(userId: number): void {
  removeKey(pendingKey(userId));
}

function isDiceOptions(value: unknown): value is DiceOptions {
  if (!isRecord(value)) {
    return false;
  }
  const validSides =
    value.lastSides === null ||
    (isInteger(value.lastSides) && DICE_SIDES.includes(value.lastSides));
  return validSides && isNumber(value.modifier);
}

function isNumbersOptions(value: unknown): value is NumbersOptions {
  return (
    isRecord(value) &&
    isInteger(value.count) &&
    value.count >= 1 &&
    isInteger(value.min) &&
    isInteger(value.max) &&
    value.max >= value.min &&
    typeof value.unique === 'boolean'
  );
}

function isExclusionPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string'
  );
}

function isTeamsOptions(value: unknown): value is TeamsOptions {
  return (
    isRecord(value) &&
    typeof value.participantsText === 'string' &&
    (value.mode === 'count' || value.mode === 'size') &&
    isInteger(value.value) &&
    value.value >= 1 &&
    Array.isArray(value.exclusions) &&
    value.exclusions.every(isExclusionPair)
  );
}

function isRouletteOption(value: unknown): value is RouletteOption {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.color === 'string'
  );
}

function isRouletteOptions(value: unknown): value is RouletteOptions {
  return (
    isRecord(value) &&
    Array.isArray(value.options) &&
    value.options.every(isRouletteOption)
  );
}

function isWeightedEntry(value: unknown): value is WeightedEntry {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    isInteger(value.weight) &&
    value.weight >= 1 &&
    value.weight <= 100
  );
}

function isWeightedOptions(value: unknown): value is WeightedOptions {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.every(isWeightedEntry) &&
    Array.isArray(value.originalEntries) &&
    value.originalEntries.every(isWeightedEntry) &&
    typeof value.autoRemove === 'boolean'
  );
}

/** Carga las opciones de la pantalla de dados. */
export function loadDiceOptions(): DiceOptions | null {
  return readVersioned(DICE_OPTIONS_KEY, isDiceOptions);
}

/** Guarda las opciones de la pantalla de dados. */
export function saveDiceOptions(options: DiceOptions): void {
  writeVersioned(DICE_OPTIONS_KEY, options);
}

/** Borra las opciones de la pantalla de dados. */
export function clearDiceOptions(): void {
  removeKey(DICE_OPTIONS_KEY);
}

/** Carga las opciones del generador de números. */
export function loadNumbersOptions(): NumbersOptions | null {
  return readVersioned(NUMBERS_OPTIONS_KEY, isNumbersOptions);
}

/** Guarda las opciones del generador de números. */
export function saveNumbersOptions(options: NumbersOptions): void {
  writeVersioned(NUMBERS_OPTIONS_KEY, options);
}

/** Borra las opciones del generador de números. */
export function clearNumbersOptions(): void {
  removeKey(NUMBERS_OPTIONS_KEY);
}

/** Carga las opciones de la ruleta. */
export function loadRouletteOptions(): RouletteOptions | null {
  return readVersioned(ROULETTE_OPTIONS_KEY, isRouletteOptions);
}

/** Guarda las opciones de la ruleta. */
export function saveRouletteOptions(options: RouletteOption[]): void {
  writeVersioned(ROULETTE_OPTIONS_KEY, { options });
}

/** Borra las opciones de la ruleta. */
export function clearRouletteOptions(): void {
  removeKey(ROULETTE_OPTIONS_KEY);
}

/** Carga las opciones del generador de equipos. */
export function loadTeamsOptions(): TeamsOptions | null {
  return readVersioned(TEAMS_OPTIONS_KEY, isTeamsOptions);
}

/** Guarda las opciones del generador de equipos. */
export function saveTeamsOptions(options: TeamsOptions): void {
  writeVersioned(TEAMS_OPTIONS_KEY, options);
}

/** Borra las opciones del generador de equipos. */
export function clearTeamsOptions(): void {
  removeKey(TEAMS_OPTIONS_KEY);
}

/** Carga las opciones del sorteo ponderado. */
export function loadWeightedOptions(): WeightedOptions | null {
  return readVersioned(WEIGHTED_OPTIONS_KEY, isWeightedOptions);
}

/** Guarda las opciones del sorteo ponderado. */
export function saveWeightedOptions(options: WeightedOptions): void {
  writeVersioned(WEIGHTED_OPTIONS_KEY, options);
}

/** Borra las opciones del sorteo ponderado. */
export function clearWeightedOptions(): void {
  removeKey(WEIGHTED_OPTIONS_KEY);
}

/** Carga si el panel de historial estaba abierto. */
export function loadHistoryOpen(): boolean | null {
  return readVersioned(
    HISTORY_OPEN_KEY,
    (value: unknown): value is boolean => typeof value === 'boolean',
  );
}

/** Guarda el estado abierto del panel de historial. */
export function saveHistoryOpen(open: boolean): void {
  writeVersioned(HISTORY_OPEN_KEY, open);
}

/** Borra el estado del panel de historial. */
export function clearHistoryOpen(): void {
  removeKey(HISTORY_OPEN_KEY);
}
