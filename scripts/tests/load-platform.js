/**
 * Loads the REAL assets/platform.js in a Node vm sandbox with mocked
 * browser globals (window, document, localStorage). This means tests
 * exercise the actual production code — not a hand-copied duplicate
 * that could silently drift out of sync with what ships.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

function loadPlatform() {
  // Default: uji sumbernya. Set NP_PLATFORM=min untuk menguji berkas yang
  // BENAR-BENAR dimuat 228 halaman — dipakai `npm run test:min` sesudah build,
  // supaya minifikasi tidak pernah lolos tanpa dibuktikan setara.
  const file = process.env.NP_PLATFORM === 'min' ? 'platform.min.js' : 'platform.js';
  const filePath = path.join(__dirname, '..', '..', 'assets', file);
  const src = fs.readFileSync(filePath, 'utf-8');

  const localStorage = new LocalStorageMock();

  // Minimal document/window stub — platform.js touches these at the bottom
  // (DOMContentLoaded listener, querySelectorAll) but only inside callbacks
  // that never fire synchronously during load, so a stub is sufficient.
  const fakeDocument = {
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {}, toggle() {} } },
    body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} },
    createElement: () => ({
      classList: { add() {}, remove() {} },
      style: {},
      setAttribute() {},
      appendChild() {},
      remove() {},
      addEventListener() {},
    }),
  };

  const sandbox = {
    window: {},
    localStorage,
    document: fakeDocument,
    console,
    Date,
    Math,
    JSON,
    Number,
    setTimeout,
    navigator: { language: 'id-ID' },
    CustomEvent: class CustomEvent { constructor(name, opts) { this.name = name; this.detail = opts && opts.detail; } },
    requestAnimationFrame: (fn) => fn(),
  };
  sandbox.window.localStorage = localStorage;
  sandbox.window.document = fakeDocument;
  sandbox.window.dispatchEvent = () => true;
  sandbox.window.addEventListener = () => {};
  sandbox.window.CustomEvent = sandbox.CustomEvent;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'platform.js' });

  if (!sandbox.window.NP) {
    throw new Error('platform.js did not export window.NP — check the file structure has not changed');
  }
  return { NP: sandbox.window.NP, localStorage };
}

module.exports = { loadPlatform };
