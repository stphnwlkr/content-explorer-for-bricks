(() => {
  'use strict';
  const config = window.cebHubSortConfig;
  if (!config?.builderContext) return;
  const { __ } = window.wp.i18n;
  document.body.classList.add('ceb-builder-context');
  // CSS variables update the workspace immediately. Native select popups also need
  // a color scheme derived from the resolved surface, including custom palettes.
  const themeProbe = document.createElement('span');
  themeProbe.hidden = true;
  themeProbe.style.backgroundColor = 'var(--builder-bg)';
  document.body.append(themeProbe);
  const paletteCanvas = document.createElement('canvas');
  paletteCanvas.width = paletteCanvas.height = 1;
  const paletteContext = paletteCanvas.getContext('2d', { willReadFrequently: true });
  const syncTheme = () => {
    // Canvas resolves every browser-supported CSS color, including OKLCH and P3,
    // to RGB rather than mistaking its component numbers for RGB channels.
    let light = document.body.getAttribute('data-builder-mode') === 'light';
    if (paletteContext) {
      paletteContext.fillStyle = '#fff';
      paletteContext.fillRect(0, 0, 1, 1);
      paletteContext.fillStyle = getComputedStyle(themeProbe).backgroundColor;
      paletteContext.fillRect(0, 0, 1, 1);
      const [red, green, blue] = paletteContext.getImageData(0, 0, 1, 1).data;
      light = red * 0.2126 + green * 0.7152 + blue * 0.0722 > 140;
    }
    const scheme = light ? 'light' : 'dark';
    if (document.body.style.getPropertyValue('--ceb-ui-color-scheme') !== scheme) {
      document.body.style.setProperty('--ceb-ui-color-scheme', scheme);
    }
  };
  let themeFrame = 0;
  const scheduleTheme = () => {
    if (themeFrame) return;
    themeFrame = requestAnimationFrame(() => { themeFrame = 0; syncTheme(); });
  };
  const themeObserver = new MutationObserver(scheduleTheme);
  for (const owner of [document.documentElement, document.body]) {
    themeObserver.observe(owner, { attributes: true, attributeFilter: ['data-builder-mode', 'class', 'style'] });
  }
  themeObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
  syncTheme();
  const buttons = new Map();
  const createShortcut = (name, label, section, order) => {
    const item = document.createElement('li');
    item.className = `ceb-toolbar-${name}`;
    item.style.order = String(order);
    item.dataset.balloon = label;
    item.dataset.balloonPos = 'bottom-left';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toolbar-control';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', 'ceb-hub-sort-manager');
    button.setAttribute('aria-expanded', 'false');
    const icon = document.createElement('span');
    icon.className = 'bricks-svg-wrapper';
    icon.setAttribute('aria-hidden', 'true');
    // The identical original local SVGs used by the Etch baseline.
    const svg = new DOMParser().parseFromString(config.sidebarIcons[name], 'image/svg+xml').documentElement;
    svg.classList.add('bricks-svg');
    icon.append(document.importNode(svg, true));
    const text = document.createElement('span');
    text.className = 'toolbar-control-label';
    text.textContent = label;
    button.append(icon, text);
    button.addEventListener('click', () => {
      const api = window.cebHubContentPanel;
      if (button.getAttribute('aria-expanded') === 'true') api.close();
      else if (section === 'map') api.openMap(api.currentPostId());
      else api.openList();
    });
    buttons.set(section, button);
    item.append(button);
    return item;
  };
  const compass = createShortcut('content', __('Content Explorer', 'content-explorer-for-bricks'), 'list', 310);
  const connections = createShortcut('connections', __('Current item connections', 'content-explorer-for-bricks'), 'map', 320);
  // Native menus and panels are below the explorer workspace. Dismiss our view
  // before the native handler runs, leaving its click, default action, and focus
  // untouched. Capture handles controls whose handlers stop event propagation;
  // click also covers keyboard activation without a preceding pointer event.
  const yieldToToolbar = event => {
    if (!document.body.classList.contains('ceb-explorer-open')) return;
    const path = event.composedPath();
    const matches = selector => path.some(node => node instanceof Element && node.matches(selector));
    if (!matches('.bricks-toolbar') || matches('.ceb-toolbar-content, .ceb-toolbar-connections')) return;
    if (!matches('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [role="button"]')) return;
    window.cebHubContentPanel?.close({ restoreFocus: false });
  };
  document.addEventListener('pointerdown', yieldToToolbar, true);
  document.addEventListener('click', yieldToToolbar, true);
  const sync = () => {
    const toolbar = document.querySelector('.bricks-toolbar:has(.group-wrapper.start)');
    const group = toolbar?.querySelector('.group-wrapper.start');
    if (!group) return false;
    if (!compass.isConnected) group.append(compass);
    if (!connections.isConnected) group.append(connections);
    const edges = { top: 0, right: 0, bottom: 0, left: 0 };
    for (const bar of document.querySelectorAll('.bricks-toolbar')) {
      const bounds = bar.getBoundingClientRect();
      if (!bounds.width || !bounds.height) continue;
      const horizontal = bounds.width > bounds.height;
      const edge = horizontal ? (bounds.top < innerHeight / 2 ? 'top' : 'bottom') : (bounds.left < innerWidth / 2 ? 'left' : 'right');
      edges[edge] = Math.max(edges[edge], horizontal ? bounds.height : bounds.width);
    }
    for (const [edge, value] of Object.entries(edges)) document.body.style.setProperty(`--ceb-workspace-${edge}`, `${value}px`);
    return true;
  };
  let waiting = null;
  const attach = () => {
    if (!sync()) return;
    waiting?.disconnect();
    const toolbar = document.querySelector('.bricks-toolbar:has(.group-wrapper.start)');
    new MutationObserver(sync).observe(toolbar, { childList: true, subtree: true });
    const sizes = new ResizeObserver(sync);
    for (const bar of document.querySelectorAll('.bricks-toolbar')) sizes.observe(bar);
  };
  const start = () => {
    if (document.querySelector('.bricks-toolbar:has(.group-wrapper.start)')) attach();
    else { waiting = new MutationObserver(attach); waiting.observe(document.body, { childList: true, subtree: true }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('resize', sync);
  document.addEventListener('ceb:panelchange', event => {
    for (const [section, button] of buttons) {
      const active = event.detail.open && (section === 'map' ? event.detail.section === 'map' : event.detail.section !== 'map');
      button.setAttribute('aria-expanded', String(active));
      button.closest('li').classList.toggle('active', active);
    }
  });
})();
