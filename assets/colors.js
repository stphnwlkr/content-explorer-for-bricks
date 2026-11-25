/* Local contrast math and the original distinct graph palette; no network dependencies. */
(() => {
  'use strict';
  const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  const mix = (a, b, amount) => a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  const minimum = (color, surfaces) => Math.min(...surfaces.map(bg => ratio(color, bg)));
  // Preserve hue where possible, moving only as far toward black/white as needed.
  const readable = (color, surfaces, target = 4.6) => {
    if (minimum(color, surfaces) >= target) return color;
    let best = null;
    for (const end of [[0, 0, 0], [255, 255, 255]]) {
      if (minimum(end, surfaces) < target) continue;
      for (let step = 1; step <= 255; step++) {
        const next = mix(color, end, step / 255);
        if (minimum(next, surfaces) >= target) {
          if (!best || step < best.step) best = { step, color: next };
          break;
        }
      }
    }
    // Opposite extreme custom surfaces require separate foregrounds per surface.
    return best?.color || [[0, 0, 0], [255, 255, 255]].sort((a, b) => minimum(b, surfaces) - minimum(a, surfaces))[0];
  };
  const css = rgb => `rgb(${rgb.join(' ')})`;
  const hex = value => value.slice(1).match(/../g).map(channel => parseInt(channel, 16));
  const hover = (background, foreground) => mix(background, ratio(foreground, [0,0,0]) > ratio(foreground, [255,255,255]) ? [0,0,0] : [255,255,255], .12);
  const api = { ratio, mix, readable, css, hex, hover };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window === 'undefined') return;
  window.cebHubColors = api;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const roots = '.ceb-hub-sort-manager, .ceb-hub-sort-dialog';
  const sync = root => {
    const probe = document.createElement('span'); probe.hidden = true; root.append(probe);
    let backdrop = [255, 255, 255];
    const resolve = value => {
      probe.style.color = value;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const channels = [...context.getImageData(0, 0, 1, 1).data];
      return mix(backdrop, channels.slice(0, 3), channels[3] / 255);
    };
    const set = (key, color) => {
      const value = css(color), name = `--ceb-aa-${key}`;
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };
    const surface = resolve('var(--ceb-ui-surface)'); backdrop = surface;
    const soft = resolve('var(--ceb-ui-surface-soft)'), input = resolve('var(--ceb-ui-input)');
    const surfaces = [surface, soft, input];
    const text = resolve('var(--builder-color, #e1e1e5)');
    const accent = readable(resolve('var(--builder-color-accent, #8fc9ff)'), surfaces);
    const shared = readable(resolve('var(--builder-color-component, #a477e8)'), surfaces);
    const control = mix(soft, text, .04), controlHover = mix(soft, text, .12);
    // Current map cards retain Etch blue independently of the native button accent.
    const currentBg = mix(surface, [56,88,233], .26);
    set('current-bg', currentBg);
    set('current', readable([56,88,233], [surface, currentBg], 3.1));
    const backgrounds = [...surfaces, control, controlHover, currentBg, mix(surface, accent, .26), mix(surface, shared, .26)];
    set('text', readable(text, backgrounds));
    set('muted', readable(text, backgrounds));
    set('input-text', readable(text, [input]));
    set('soft-text', readable(text, [soft]));
    set('accent', accent);
    const primaryHover = mix(accent, [0,0,0], .12);
    set('primary-hover', primaryHover);
    set('inverse', readable(resolve('var(--builder-color-accent-inverse, #10201e)'), [accent, primaryHover]));
    set('selected-text', readable(text, [resolve('var(--ceb-ui-selected-bg)')]));
    set('danger', readable(resolve('var(--builder-color-danger, #f3a9a9)'), backgrounds));
    set('danger-text', readable(text, [resolve('var(--ceb-ui-danger-bg)')]));
    set('success', readable(resolve('var(--builder-color-success, #5ccc86)'), backgrounds));
    set('line', readable(resolve('var(--builder-border-color, #777)'), surfaces, 3.1));
    // Keep the original distinct group hues. These are graphical markers, so
    // use the 3:1 non-text threshold, not the 4.5:1 text threshold.
    const palette = [[56,88,233],[10,157,143],[155,81,224],[224,99,58],[201,146,10],[214,51,108],[47,158,68],[92,112,128]];
    palette.forEach((color, index) => set(`map-${index}`, readable(color, [surface, soft, control, controlHover], 3.1)));
    set('template', readable([155,81,224], [surface,soft], 3.1));
    probe.remove();
  };
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { document.querySelectorAll(roots).forEach(sync); pending = false; });
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes'
      ? record.target.matches('html, body') || (record.target.matches(roots) && !record.attributeName.startsWith('data-'))
      : [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches(roots) || node.querySelector?.(roots))))) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'data-builder-mode'] });
  new MutationObserver(schedule).observe(document.head, { subtree: true, childList: true, characterData: true });
  document.addEventListener('ceb:panelchange', schedule);
  schedule();
})();
