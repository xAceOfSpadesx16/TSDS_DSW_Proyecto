/**
 * StorageService — localStorage wrapper with JSON serialization.
 * Prepends all keys with "thrive_" to namespace data.
 * Designed to simulate future backend table structure.
 */

const PREFIX = 'thrive_';

class StorageService {
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(PREFIX + key, serialized);
    } catch (err) {
      console.error(`StorageService: Error guardando "${key}"`, err);
    }
  }

  load(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`StorageService: Error cargando "${key}"`, err);
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  list(prefix = '') {
    const results = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey.startsWith(PREFIX + prefix)) {
        results.push({
          key: fullKey.slice(PREFIX.length),
          data: this.load(fullKey.slice(PREFIX.length))
        });
      }
    }
    return results;
  }

  addToHistory(entry) {
    const history = this.load('history') || [];
    history.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    });

    const trimmed = history.slice(0, 20);
    this.save('history', trimmed);
    return trimmed;
  }

  clearHistory() {
    this.remove('history');
  }
}

export const storageService = new StorageService();
