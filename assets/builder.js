(() => {
  'use strict';
  const config = window.cebHubSortConfig;
  if (!config?.builderContext) return;
  const { __ } = window.wp.i18n;
  document.body.classList.add('ceb-builder-context');
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
      else if (section === 'map') api.openMap(config.currentPostId);
      else api.openList();
    });
    buttons.set(section, button);
    item.append(button);
    return item;
  };
  const compass = createShortcut('content', __('Content Explorer', 'content-explorer-for-bricks'), 'list', 310);
  const connections = createShortcut('connections', __('Current item connections', 'content-explorer-for-bricks'), 'map', 320);
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
