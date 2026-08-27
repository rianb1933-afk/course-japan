/**
 * Minimal in-memory localStorage mock for Node-based testing.
 * platform.js is written for the browser (uses `localStorage`, `window`, `document`)
 * so tests load it via vm with these globals stubbed in.
 */
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

module.exports = { LocalStorageMock };
