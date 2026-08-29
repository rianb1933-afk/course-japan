/**
 * draggable-floats.js — Shared drag system for floating UI elements
 * 
 * Makes these elements draggable:
 *   - .pro-floating-actions (⌘ 上 鈴 探 etc.)
 *   - #npDarkToggle (dark mode toggle)
 *   - .np-wa-float (WhatsApp)
 *   - .nihongo-chat-launch (AI Chat)
 *   - .translator-launch (Translator)
 * 
 * How it works:
 *   - Click = normal action (toggle, open, etc.)
 *   - Click + move > 8px = drag (element follows cursor)
 *   - Release after drag = save position
 *   - Double-click = reset to default position
 * 
 * Position saved to localStorage per element.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'np_float_positions';
  const DRAG_THRESHOLD = 8;

  function loadPositions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function savePositions(pos) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); }
    catch (_) {}
  }

  function makeDraggable(el, id) {
    if (!el || el.dataset.dragInit) return;
    el.dataset.dragInit = '1';

    // Restore saved position
    const positions = loadPositions();
    const saved = positions[id];
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      el.style.position = 'fixed';
      el.style.left = saved.x + 'px';
      el.style.top = saved.y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.margin = '0';
    }

    let isPending = false; // mousedown happened, waiting to see if it's a drag
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    function beginDrag(clientX, clientY) {
      const rect = el.getBoundingClientRect();
      startX = clientX;
      startY = clientY;
      origLeft = rect.left;
      origTop = rect.top;
      isDragging = true;
      isPending = false;

      el.style.position = 'fixed';
      el.style.left = origLeft + 'px';
      el.style.top = origTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.margin = '0';
      el.style.transition = 'none';
      el.style.cursor = 'grabbing';
      el.style.zIndex = '10010';
      el.style.userSelect = 'none';
    }

    function moveDrag(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;

      const newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, origLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origTop + dy));
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }

    function endDrag(save) {
      isPending = false;
      if (!isDragging) return;
      isDragging = false;
      el.style.transition = '';
      el.style.cursor = '';
      el.style.userSelect = '';

      if (save) {
        const rect = el.getBoundingClientRect();
        const pos = loadPositions();
        pos[id] = { x: Math.round(rect.left), y: Math.round(rect.top) };
        savePositions(pos);
      }
    }

    // ── Mouse events ──
    el.addEventListener('mousedown', (e) => {
      // Don't start drag on links
      if (e.target.closest('a[href]')) return;

      isPending = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;

      function onMouseMove(e2) {
        if (isDragging) {
          moveDrag(e2.clientX, e2.clientY);
          return;
        }
        if (!isPending) return;
        const dx = e2.clientX - startX;
        const dy = e2.clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          beginDrag(startX, startY);
        }
      }

      function onMouseUp() {
        const wasDragging = isDragging;
        endDrag(wasDragging);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (wasDragging) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // ── Touch events ──
    el.addEventListener('touchstart', (e) => {
      if (e.target.closest('a[href]')) return;

      const touch = e.touches[0];
      isPending = true;
      isDragging = false;
      startX = touch.clientX;
      startY = touch.clientY;

      function onTouchMove(e2) {
        if (isDragging) {
          e2.preventDefault();
          const t = e2.touches[0];
          moveDrag(t.clientX, t.clientY);
          return;
        }
        if (!isPending) return;
        const t = e2.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          beginDrag(startX, startY);
          e2.preventDefault();
        }
      }

      function onTouchEnd() {
        const wasDragging = isDragging;
        endDrag(wasDragging);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
      }

      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd);
    }, { passive: true });

    // ── Double-click to reset position ──
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('a[href], input, select, textarea')) return;
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.margin = '';
      const pos = loadPositions();
      delete pos[id];
      savePositions(pos);
      window.proToast?.('Posisi direset ke default.');
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════

  function init() {
    const targets = [
      { selector: '.pro-floating-actions', id: 'pro-fab' },
      { selector: '#npDarkToggle', id: 'dark-toggle' },
      { selector: '.np-wa-float', id: 'wa-float' },
      { selector: '.nihongo-chat-launch', id: 'ai-chat' },
      { selector: '.translator-launch', id: 'translator' },
    ];

    targets.forEach(({ selector, id }) => {
      const el = document.querySelector(selector);
      if (el) makeDraggable(el, id);
    });
  }

  // Wait for DOM + deferred scripts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

  // Re-init periodically in case elements are added dynamically
  let initCount = 0;
  const reinitInterval = setInterval(() => {
    init();
    initCount++;
    if (initCount > 10) clearInterval(reinitInterval);
  }, 2000);
})();
