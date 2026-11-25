(() => {
  'use strict';
  const config = window.cebHubSortConfig;
  if (!config?.endpoint || !config?.nonce) return;
  const { __, sprintf } = window.wp.i18n;
  if (config.bricksIconUrl) document.documentElement.style.setProperty('--ceb-builder-icon', `url(${JSON.stringify(config.bricksIconUrl)})`);
  const openBuilder = (id, url = '') => {
    if (!url) { const target = new URL(config.builderUrl); target.searchParams.set('p', String(id)); target.searchParams.set('bricks', 'run'); url = target.href; }
    window.open(url, '_blank', 'noopener');
  };
  const statusLabelFor = status => config.statusLabels?.[status] ?? status ?? '';
  const isCustomStatus = status => !(config.nativeStatuses || ['publish', 'future', 'draft', 'pending', 'private', 'trash', 'auto-draft', 'inherit']).includes(status);
  const applyStatusColors = () => {
    for (const [group, style] of Object.entries(config.statusStyles || {})) {
      for (const [property, value] of Object.entries({ bg: style.background, text: style.text, 'picker-text': style.picker_text })) {
        const defaults = config.statusDefaults?.[group];
        const customized = !defaults || style.background !== defaults.background || style.text !== defaults.text;
        if (customized) document.documentElement.style.setProperty(`--ceb-custom-status-${group}-${property}`, value);
        else document.documentElement.style.removeProperty(`--ceb-custom-status-${group}-${property}`);
      }
    }
  };
  applyStatusColors();

  const columns = [
    ['id', __('ID', 'content-explorer-for-bricks')], ['title', __('Title', 'content-explorer-for-bricks')], ['slug', __('Slug', 'content-explorer-for-bricks')],
    ['status', __('Status', 'content-explorer-for-bricks')], ['created', __('Created', 'content-explorer-for-bricks')], ['modified', __('Last Edited', 'content-explorer-for-bricks')],
  ];
  const termColumns = [
    ['id', __('ID', 'content-explorer-for-bricks')], ['title', __('Name', 'content-explorer-for-bricks')],
    ['slug', __('Slug', 'content-explorer-for-bricks')], ['description', __('Description', 'content-explorer-for-bricks')],
    ['count', __('Count', 'content-explorer-for-bricks')],
  ];
  // Personal display preferences stay local to this site, browser, and signed-in user.
  const columnStorageKey = `ceb-hub-sort-columns:${config.userId || 0}`;
  let hiddenColumns = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(columnStorageKey) || '[]');
    if (Array.isArray(saved)) hiddenColumns = new Set(saved.filter(key => ['id', 'slug', 'status', 'created', 'modified'].includes(key)));
  } catch { /* Storage may be unavailable; show every column by default. */ }
  const states = new Map();
  let sessionNative = false;
  let view = null;
  let settingsManager = null;
  let scheduled = false;
  let observedSelection = '';
  const sortIcons = {
    asc: 'ui-sort-asc.svg',
    desc: 'ui-sort-desc.svg',
    none: 'ui-sort.svg',
  };
  const contrastRatio = (background, foreground) => {
    const luminance = hex => {
      const channels = [1, 3, 5].map(offset => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const a = luminance(background);
    const b = luminance(foreground);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const saveSettings = async values => {
    const response = await fetch(config.settingsEndpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || __('Could not save setting.', 'content-explorer-for-bricks'));
    return data;
  };

  const element = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // Retain only inline formatting in titles; labels, tooltips and edit fields remain plain text.
  const titleContent = item => {
    const title = element('span', 'ceb-hub-sort-formatted-title');
    if (!item.title_html) { title.textContent = item.title || ''; return title; }
    const template = document.createElement('template'); template.innerHTML = item.title_html;
    const inline = new Set(['EM', 'STRONG', 'B', 'I', 'MARK', 'S', 'DEL', 'SUB', 'SUP', 'SPAN']);
    const append = (parent, children) => { for (const child of children) {
      if (child.nodeType === 3) { parent.append(document.createTextNode(child.textContent)); continue; }
      if (child.nodeType !== 1 || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(child.tagName)) continue;
      if (inline.has(child.tagName)) { const safe = document.createElement(child.tagName.toLowerCase()); append(safe, child.childNodes); parent.append(safe); }
      else append(parent, child.childNodes);
    } };
    append(title, template.content.childNodes); return title;
  };
  const button = (label, callback, className = '') => {
    const node = element('button', `ceb-hub-sort-button ${className}`, label);
    node.type = 'button';
    node.addEventListener('click', callback);
    return node;
  };
  const applyButtonStyle = node => {
    const style = config.buttonStyles?.[node.dataset.buttonGroup];
    if (!style) return;
    node.dataset.display = style.display;
    node.dataset.customColors = String(style.custom_colors);
    if (style.custom_colors) {
      node.style.setProperty('--ceb-button-bg', style.background);
      node.style.setProperty('--ceb-button-text', style.text);
    } else {
      node.style.removeProperty('--ceb-button-bg');
      node.style.removeProperty('--ceb-button-text');
    }
  };
  const applyHierarchyStyle = root => {
    const style = config.hierarchyStyle;
    if (!style) return;
    root.dataset.hierarchyStyle = String(style.enabled);
    for (const [key, value] of Object.entries(style)) {
      if (key === 'enabled') continue;
      root.style.setProperty(`--ceb-hub-${key.replaceAll('_', '-')}`, key === 'border_width' ? `${value}px` : value);
    }
  };
  const appendNativeIcon = (node, selector) => {
    const draw = () => {
      if (node.querySelector('.ceb-hub-sort-native-icon')) return true;
      const source = document.querySelector(selector);
      if (!source) return false;
      const icon = element('span', 'ceb-hub-sort-native-icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.appendChild(source.cloneNode(true));
      node.appendChild(icon);
      return true;
    };
    if (draw()) return;
    const observer = new MutationObserver(() => {
      if (draw() || !node.isConnected) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  };
  const nativeActionIcons = new WeakMap();
  const appendNativeActionIcon = (node, table, action) => {
    if (!table) return;
    if (!nativeActionIcons.has(table)) {
      let icons = null;
      const cells = table.querySelectorAll('.datagrid-cell:last-child');
      for (const cell of cells) {
        const buttons = cell.querySelectorAll('button');
        if (buttons.length < 2) continue;
        const trash = buttons[0].querySelector('svg');
        const open = buttons[buttons.length - 1].querySelector('svg');
        if (!trash || !open) continue;
        icons = { trash, open };
        break;
      }
      nativeActionIcons.set(table, icons);
    }
    const svg = nativeActionIcons.get(table)?.[action];
    if (svg) {
      const icon = element('span', 'ceb-hub-sort-native-icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.appendChild(svg.cloneNode(true));
      node.appendChild(icon);
    }
  };
  const themedButton = (label, callback, className, group) => {
    const node = button(label, callback, `${className} ceb-hub-sort-themed`);
    node.dataset.buttonGroup = group;
    if (label) node.title = label;
    applyButtonStyle(node);
    return node;
  };
  const wordpressEditLink = (item, isTerm = false) => {
    if ((isTerm && !config.showWordPressEdit) || !item.can_edit || !item.wordpress_edit_url) return null;
    const link = element('a', 'ceb-hub-sort-button ceb-hub-sort-themed ceb-hub-sort-wordpress', __('Edit in WordPress', 'content-explorer-for-bricks'));
    link.href = item.wordpress_edit_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.buttonGroup = 'wordpress';
    link.title = __('Edit in WordPress (opens in a new tab)', 'content-explorer-for-bricks');
    link.setAttribute('aria-label', sprintf(__('Edit %s in WordPress (opens in a new tab)', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
    applyButtonStyle(link);
    return link;
  };
  const repaintButtons = () => {
    if (view) for (const node of view.root.querySelectorAll('.ceb-hub-sort-themed')) applyButtonStyle(node);
  };
  const syncNativeContentHub = () => {};
  const syncSidebarShortcut = () => {
    if (settingsManager?.trigger) settingsManager.trigger.hidden = false;
  };
  const syncSidebarActiveState = () => {
    if (!settingsManager) return;
    const open = !settingsManager.panel.hidden;
    const mapOpen = open && settingsManager.section === 'map';
    for (const [trigger, active] of [[settingsManager.trigger, open && !mapOpen], [settingsManager.connectionsTrigger, mapOpen]]) {
      if (!trigger) continue;
      // Use Bricks's native selected attribute for the same active styling as its own controls.
      trigger.setAttribute('selected', String(active));
      trigger.setAttribute('aria-expanded', String(active));
    }
  };
  const closeContentPanel = ({ restoreFocus = true } = {}) => {
    if (!settingsManager || settingsManager.panel.hidden) return;
    window.cebHubCloseConnections?.();
    if (config.builderContext) settingsManager.panel.hidden = true;
    else settingsManager.showSection('list');
    document.body.classList.remove('ceb-explorer-open');
    document.dispatchEvent(new CustomEvent('ceb:panelchange', { detail: { open: false } }));
    syncSidebarActiveState();
    if (restoreFocus && settingsManager.launch?.isConnected) settingsManager.launch.focus();
  };
  const openContentPanel = (section = 'list', id = 0) => {
    mountSettingsPanel();
    if (!settingsManager) return;
    settingsManager.launch = document.activeElement;
    const parent = null;
    if (parent && settingsManager.panel.parentElement !== parent) parent.append(settingsManager.panel);
    settingsManager.panel.hidden = false;
    if (config.builderContext) document.body.classList.add('ceb-explorer-open');
    document.dispatchEvent(new CustomEvent('ceb:panelchange', { detail: { open: true, section } }));
    parent?.classList.add('ceb-content-panel-open');
    settingsManager.showSection(section, id);
    (settingsManager.panel.classList.contains('is-menu-collapsed') ? settingsManager.menuToggle : settingsManager.back).focus();
  };
  const activePostId = () => Number(config.currentPostId) || 0;
  const openDefaultPanel = () => openContentPanel('list');
  const openSettingsPanel = () => openContentPanel('general');
  const toggleSidebarView = section => {
    const open = settingsManager && !settingsManager.panel.hidden;
    const isMap = settingsManager?.section === 'map';
    if (open && (section === 'map' ? isMap : !isMap)) {
      closeContentPanel();
      return;
    }
    openContentPanel(section, section === 'map' ? activePostId() : 0);
  };
  window.cebHubContentPanel = {
    open: openDefaultPanel,
    openList: () => { openContentPanel('list'); settingsManager.panel.querySelector('.ceb-hub-sort-search')?.focus(); },
    openMap: id => openContentPanel('map', Number(id) || 0),
    close: closeContentPanel,
  };
  const stateFor = (type, kind) => {
    const key = `${kind}:${type}`;
    if (!states.has(key)) states.set(key, {
      search: '', sort: kind === 'term' ? config.termDefaultColumn : config.defaultColumn,
      order: kind === 'term' ? config.termDefaultOrder : config.defaultOrder,
      sortTouched: false, page: 1,
      perPage: 25, native: sessionNative, requestId: 0,
      hierarchy: (kind === 'term' ? config.hierarchicalTaxonomies : config.hierarchicalTypes || []).includes(type),
    });
    return states.get(key);
  };
  const formatDate = value => {
    if (!value || value.startsWith('0000-00-00')) return '-';
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  function syncMode(current) {
    const nativeLoading = current.state.native && current.state.refreshingNative;
    current.root.classList.toggle('ceb-hub-sort-native', current.state.native);
    if (current.kind === 'term') {
      if (current.nativeContainer) current.nativeContainer.hidden = !current.state.native || nativeLoading;
    } else if (current.table) current.table.hidden = !current.state.native || nativeLoading;
    current.results.hidden = current.state.native;
    current.controls.hidden = current.state.native;
    if (current.hierarchyTools) current.hierarchyTools.hidden = current.state.native;
    current.newButton.hidden = current.state.native;
    current.nativeLoading.hidden = !nativeLoading;
    current.switchButton.disabled = nativeLoading;
    const label = nativeLoading
      ? __('Updating Bricks table…', 'content-explorer-for-bricks')
      : current.state.native ? __('Browse all', 'content-explorer-for-bricks') : __('Bricks table', 'content-explorer-for-bricks');
    current.switchButton.querySelector('.ceb-hub-sort-switch-label').textContent = label;
    current.switchButton.setAttribute('aria-label', label);
    current.switchButton.dataset.viewMode = current.state.native ? 'browse' : 'ceb';
    current.switchButton.title = current.state.native
      ? __('Search, sort, and page through all items', 'content-explorer-for-bricks')
      : __('Use Bricks’s original table for inline editing and creating items', 'content-explorer-for-bricks');
  }

  function showQuickEdit(current, item = null) {
    const creating = !item;
    const hierarchical = (config.hierarchicalTypes || []).includes(current.type);
    const dialog = element('dialog', 'ceb-hub-sort-dialog');
    const form = element('form', 'ceb-hub-sort-edit-form');
    const heading = element('h2', '', creating
      ? __('New item', 'content-explorer-for-bricks')
      : sprintf(__('Quick edit: %s', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
    heading.id = 'ceb-hub-sort-edit-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
    const header = element('div', 'ceb-hub-sort-dialog-header');
    const description = element('p', '', creating
      ? __('Create an item as a draft or publish it now.', 'content-explorer-for-bricks')
      : __('Update this item’s basic details without leaving the Hub.', 'content-explorer-for-bricks'));
    header.append(heading, description);
    form.appendChild(header);

    const titleLabel = element('label', '', __('Title', 'content-explorer-for-bricks'));
    const titleInput = element('input', 'ceb-hub-sort-edit-input');
    titleInput.id = 'ceb-hub-sort-edit-title';
    titleLabel.htmlFor = titleInput.id;
    titleInput.type = 'text';
    titleInput.required = creating;
    titleInput.maxLength = 200;
    titleInput.value = item?.edit_title ?? '';
    const titleField = element('div', 'ceb-hub-sort-edit-field');
    titleField.append(titleLabel, titleInput);
    form.appendChild(titleField);

    let slugInput;
    let slugEdited = false;
    let autoSlug = false;
    if (!creating) {
      const slugLabel = element('label', '', __('Slug', 'content-explorer-for-bricks'));
      slugInput = element('input', 'ceb-hub-sort-edit-input');
      slugInput.id = 'ceb-hub-sort-edit-slug';
      slugInput.type = 'text';
      slugInput.maxLength = 200;
      slugInput.value = item.slug || '';
      autoSlug = !titleInput.value.trim() && !slugInput.value.trim();
      if (autoSlug) {
        const slugify = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
          .replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
        titleInput.addEventListener('input', () => {
          if (!slugEdited) slugInput.value = slugify(titleInput.value);
        });
        slugInput.addEventListener('input', () => { slugEdited = true; });
      }
      slugLabel.htmlFor = slugInput.id;
      const slugField = element('div', 'ceb-hub-sort-edit-field');
      slugField.append(slugLabel, slugInput);
      form.appendChild(slugField);
    }

    const statusLabel = element('label', '', __('Status', 'content-explorer-for-bricks'));
    const statusSelect = element('select', 'ceb-hub-sort-edit-input ceb-hub-sort-status-select');
    statusSelect.id = 'ceb-hub-sort-edit-status';
    statusLabel.htmlFor = statusSelect.id;
    const statusOptions = creating
      ? Object.fromEntries(['draft', 'publish'].map(value => [value, statusLabelFor(value)]))
      : { ...(current.data?.quick_edit_statuses || {}) };
    if (item?.status && !Object.prototype.hasOwnProperty.call(statusOptions, item.status)) statusOptions[item.status] = statusLabelFor(item.status);
    const nativeGroup = element('optgroup');
    nativeGroup.label = __('WordPress', 'content-explorer-for-bricks');
    const customGroup = element('optgroup');
    customGroup.label = __('Custom statuses', 'content-explorer-for-bricks');
    for (const [value, label] of Object.entries(statusOptions)) {
      const option = element('option', '', label);
      option.value = value;
      if (value === 'publish' && !current.data?.can_publish) option.disabled = true;
      (isCustomStatus(value) ? customGroup : nativeGroup).appendChild(option);
    }
    if (nativeGroup.children.length) statusSelect.appendChild(nativeGroup);
    if (customGroup.children.length) statusSelect.appendChild(customGroup);
    statusSelect.value = item?.status || 'draft';
    const updateStatusAppearance = () => {
      statusSelect.dataset.statusKind = isCustomStatus(statusSelect.value) ? 'custom'
        : statusSelect.value;
    };
    statusSelect.addEventListener('change', updateStatusAppearance);
    updateStatusAppearance();
    const statusField = element('div', 'ceb-hub-sort-edit-field');
    statusField.append(statusLabel, statusSelect);
    form.appendChild(statusField);

    let dateInput;
    if (!creating) {
      const dateField = element('div', 'ceb-hub-sort-edit-field');
      const dateLabel = element('label', '', __('Date', 'content-explorer-for-bricks'));
      dateInput = element('input', 'ceb-hub-sort-edit-input');
      dateInput.id = 'ceb-hub-sort-edit-date';
      dateInput.type = 'datetime-local';
      dateInput.step = '60';
      dateInput.required = true;
      dateInput.value = item.created?.slice(0, 16).replace(' ', 'T') || '';
      dateLabel.htmlFor = dateInput.id;
      const dateHelp = element('p', 'ceb-hub-sort-edit-hint', sprintf(__('Site time: %s', 'content-explorer-for-bricks'), config.siteTimezone));
      dateField.append(dateLabel, dateInput, dateHelp);
      form.appendChild(dateField);
    }

    let parentList;
    let parentSearch;
    let parentMessage;
    let searchParents;
    let parentId = item?.parent || 0;
    let parentName = item?.parent_title || '';
    if (hierarchical) {
      const parentLabel = element('span', 'ceb-hub-sort-parent-label-heading', __('Parent', 'content-explorer-for-bricks'));
      parentLabel.id = 'ceb-hub-sort-edit-parent-label';
      parentList = element('div', 'ceb-hub-sort-parent-list');
      parentList.setAttribute('role', 'radiogroup');
      parentList.setAttribute('aria-labelledby', parentLabel.id);
      const searchLabel = element('label', '', __('Find a parent', 'content-explorer-for-bricks'));
      parentSearch = element('input', 'ceb-hub-sort-edit-input');
      parentSearch.id = 'ceb-hub-sort-parent-search';
      parentSearch.type = 'search';
      parentSearch.placeholder = __('Search by title…', 'content-explorer-for-bricks');
      searchLabel.htmlFor = parentSearch.id;
      parentMessage = element('p', 'ceb-hub-sort-parent-message');
      parentMessage.setAttribute('role', 'status');
      const parentField = element('div', 'ceb-hub-sort-edit-field ceb-hub-sort-parent-field');
      parentField.append(parentLabel, searchLabel, parentSearch, parentList, parentMessage);
      form.appendChild(parentField);
      const parentChoice = (id, title) => {
        const choice = element('label', 'ceb-hub-sort-parent-choice');
        const radio = element('input');
        radio.type = 'radio';
        radio.name = 'ceb-hub-sort-parent';
        radio.value = String(id);
        radio.checked = id === parentId;
        const text = element('span', '', title);
        choice.append(radio, text);
        radio.addEventListener('change', () => {
          if (!radio.checked) return;
          parentId = id;
          parentName = title;
        });
        return choice;
      };
      let searchTimer;
      let parentRequestId = 0;
      searchParents = async () => {
        const requestId = ++parentRequestId;
        parentMessage.textContent = __('Loading parents…', 'content-explorer-for-bricks');
        const url = new URL(config.endpoint);
        for (const [key, value] of Object.entries({
          type: current.type, search: parentSearch.value.trim(), sort: 'title', order: 'asc',
          page: 1, per_page: 50, hierarchy: false,
        })) url.searchParams.set(key, value);
        try {
          const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || __('Could not load parents.', 'content-explorer-for-bricks'));
          if (requestId !== parentRequestId || !dialog.isConnected) return;
          parentList.replaceChildren();
          parentList.appendChild(parentChoice(0, __('No parent', 'content-explorer-for-bricks')));
          if (parentId && !data.items.some(candidate => candidate.id === parentId)) {
            parentList.appendChild(parentChoice(parentId, parentName || `#${parentId}`));
          }
          let matches = 0;
          for (const candidate of data.items) {
            if (candidate.id === item?.id || candidate.ancestors?.includes(item?.id)) continue;
            if (!candidate.can_edit && candidate.id !== parentId) continue;
            parentList.appendChild(parentChoice(candidate.id, candidate.title ? `${candidate.title} (#${candidate.id})` : `#${candidate.id}`));
            matches += 1;
          }
          parentMessage.textContent = data.pages > 1
            ? __('Showing the first 50 matches. Search to narrow the list.', 'content-explorer-for-bricks')
            : matches ? '' : __('No matching parents.', 'content-explorer-for-bricks');
        } catch (error) {
          if (requestId === parentRequestId && dialog.isConnected) parentMessage.textContent = error.message || __('Could not load parents.', 'content-explorer-for-bricks');
        }
      };
      parentSearch.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(searchParents, 250);
      });
    }

    const message = element('p', 'ceb-hub-sort-edit-message');
    message.setAttribute('role', 'status');
    const actions = element('div', 'ceb-hub-sort-dialog-actions');
    const cancel = button(__('Cancel', 'content-explorer-for-bricks'), () => dialog.close());
    const save = element('button', 'ceb-hub-sort-button', creating ? __('Create', 'content-explorer-for-bricks') : __('Save', 'content-explorer-for-bricks'));
    save.type = 'submit';
    actions.append(cancel, save);
    const body = element('div', 'ceb-hub-sort-dialog-body');
    header.remove();
    body.append(...form.children);
    const footer = element('div', 'ceb-hub-sort-dialog-footer');
    footer.append(message, actions);
    form.append(header, body, footer);
    dialog.appendChild(form);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const title = titleInput.value.trim();
      if (creating && !title) {
        titleInput.focus();
        return;
      }
      save.disabled = true;
      cancel.disabled = true;
      message.textContent = creating ? __('Creating…', 'content-explorer-for-bricks') : __('Saving…', 'content-explorer-for-bricks');
      try {
        const payload = { type: current.type, status: statusSelect.value, parent: hierarchical ? parentId : 0 };
        if (creating) payload.title = title;
        else {
          if (titleInput.value !== (item.edit_title ?? '')) payload.title = title;
          if ((!autoSlug || slugEdited) && slugInput.value.trim() !== (item.slug || '')) payload.slug = slugInput.value.trim();
          if (dateInput.value !== item.created?.slice(0, 16).replace(' ', 'T')) payload.date = dateInput.value;
        }
        const response = await fetch(creating ? config.createEndpoint : `${config.endpoint}/${item.id}`, {
          method: creating ? 'POST' : 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || __('Could not save the item.', 'content-explorer-for-bricks'));
        dialog.close();
        current.state.cebDirty = true;
        if (view !== current) return;
        showSaveNotice(current, creating
          ? sprintf(__('Created “%s” as %s.', 'content-explorer-for-bricks'), title, statusSelect.selectedOptions[0].textContent)
          : __('Changes saved.', 'content-explorer-for-bricks'), creating ? result.id : item.id);
        load(current);
      } catch (error) {
        message.textContent = error.message || __('Could not save the item.', 'content-explorer-for-bricks');
        save.disabled = false;
        cancel.disabled = false;
      }
    });
    current.root.appendChild(dialog);
    dialog.showModal();
    if (searchParents) searchParents();
    titleInput.focus();
  }

  function showTermEdit(current, item = null) {
    const creating = !item;
    const hierarchical = (config.hierarchicalTaxonomies || []).includes(current.type);
    const dialog = element('dialog', 'ceb-hub-sort-dialog');
    const form = element('form', 'ceb-hub-sort-edit-form');
    const heading = element('h2', '', creating ? __('New term', 'content-explorer-for-bricks')
      : sprintf(__('Quick edit: %s', 'content-explorer-for-bricks'), item.title));
    heading.id = 'ceb-hub-sort-term-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
    const header = element('div', 'ceb-hub-sort-dialog-header');
    header.append(heading, element('p', '', creating
      ? __('Add a term to this taxonomy.', 'content-explorer-for-bricks')
      : __('Edit this term and its parent.', 'content-explorer-for-bricks')));
    form.appendChild(header);
    const field = (label, value, tag = 'input') => {
      const wrapper = element('div', 'ceb-hub-sort-edit-field');
      const caption = element('label', '', label);
      const input = element(tag, 'ceb-hub-sort-edit-input');
      input.id = `ceb-hub-sort-term-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
      caption.htmlFor = input.id;
      input.value = value;
      wrapper.append(caption, input);
      form.appendChild(wrapper);
      return input;
    };
    const name = field(__('Name', 'content-explorer-for-bricks'), item?.title || '');
    name.required = true;
    name.maxLength = 200;
    const slug = field(__('Slug', 'content-explorer-for-bricks'), item?.slug || '');
    slug.maxLength = 200;
    const description = field(__('Description', 'content-explorer-for-bricks'), item?.description || '', 'textarea');
    description.rows = 3;

    let parentId = item?.parent || 0;
    let parentName = item?.parent_title || '';
    if (hierarchical) {
      const parentField = element('div', 'ceb-hub-sort-edit-field ceb-hub-sort-parent-field');
      const parentLabel = element('span', 'ceb-hub-sort-parent-label-heading', __('Parent', 'content-explorer-for-bricks'));
      parentLabel.id = 'ceb-hub-sort-term-parent-label';
      const searchLabel = element('label', '', __('Find a parent', 'content-explorer-for-bricks'));
      const parentSearch = element('input', 'ceb-hub-sort-edit-input');
      parentSearch.id = 'ceb-hub-sort-term-parent-search';
      parentSearch.type = 'search';
      parentSearch.placeholder = __('Search terms…', 'content-explorer-for-bricks');
      searchLabel.htmlFor = parentSearch.id;
      const parentList = element('div', 'ceb-hub-sort-parent-list');
      parentList.setAttribute('role', 'radiogroup');
      parentList.setAttribute('aria-labelledby', parentLabel.id);
      const parentMessage = element('p', 'ceb-hub-sort-parent-message');
      parentMessage.setAttribute('role', 'status');
      parentField.append(parentLabel, searchLabel, parentSearch, parentList, parentMessage);
      form.appendChild(parentField);
      const choice = (id, title) => {
        const label = element('label', 'ceb-hub-sort-parent-choice');
        const radio = element('input');
        radio.type = 'radio';
        radio.name = 'ceb-hub-sort-term-parent';
        radio.value = String(id);
        radio.checked = id === parentId;
        radio.addEventListener('change', () => {
          if (radio.checked) { parentId = id; parentName = title; }
        });
        label.append(radio, element('span', '', title));
        return label;
      };
      let requestId = 0;
      const searchParents = async () => {
        const id = ++requestId;
        parentMessage.textContent = __('Loading parents…', 'content-explorer-for-bricks');
        const url = new URL(config.termsEndpoint);
        for (const [key, value] of Object.entries({ type: current.type, search: parentSearch.value.trim(), sort: 'title', order: 'asc', page: 1, per_page: 50, hierarchy: false, parent_picker: true })) url.searchParams.set(key, value);
        try {
          const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || __('Could not load parents.', 'content-explorer-for-bricks'));
          if (id !== requestId || !dialog.isConnected) return;
          parentList.replaceChildren(choice(0, __('No parent', 'content-explorer-for-bricks')));
          if (parentId && !data.items.some(candidate => candidate.id === parentId)) parentList.appendChild(choice(parentId, parentName || `#${parentId}`));
          let matches = 0;
          for (const candidate of data.items) {
            if (candidate.id === item?.id || candidate.ancestors?.includes(item?.id) || (!candidate.can_edit && candidate.id !== parentId)) continue;
            parentList.appendChild(choice(candidate.id, `${candidate.title} (#${candidate.id})`));
            matches++;
          }
          parentMessage.textContent = data.pages > 1
            ? __('Showing the first 50 matches. Search to narrow the list.', 'content-explorer-for-bricks')
            : matches ? '' : __('No matching parents.', 'content-explorer-for-bricks');
        } catch (error) {
          if (id === requestId && dialog.isConnected) parentMessage.textContent = error.message || __('Could not load parents.', 'content-explorer-for-bricks');
        }
      };
      let timer;
      parentSearch.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(searchParents, 250); });
      dialog.addEventListener('close', () => { clearTimeout(timer); requestId++; });
      // The dialog must be in the document before the parent list loads.
      dialog.cebHubLoadParents = searchParents;
    }

    const message = element('p', 'ceb-hub-sort-edit-message');
    message.setAttribute('role', 'status');
    const actions = element('div', 'ceb-hub-sort-dialog-actions');
    const cancel = button(__('Cancel', 'content-explorer-for-bricks'), () => dialog.close());
    const save = element('button', 'ceb-hub-sort-button', creating ? __('Create', 'content-explorer-for-bricks') : __('Save', 'content-explorer-for-bricks'));
    save.type = 'submit';
    actions.append(cancel, save);
    const body = element('div', 'ceb-hub-sort-dialog-body');
    header.remove();
    body.append(...form.children);
    const footer = element('div', 'ceb-hub-sort-dialog-footer');
    footer.append(message, actions);
    form.append(header, body, footer);
    dialog.appendChild(form);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!name.value.trim()) { name.focus(); return; }
      save.disabled = true;
      cancel.disabled = true;
      message.textContent = creating ? __('Creating…', 'content-explorer-for-bricks') : __('Saving…', 'content-explorer-for-bricks');
      try {
        const response = await fetch(creating ? config.termCreateEndpoint : `${config.termsEndpoint}/${item.id}`, {
          method: creating ? 'POST' : 'PATCH', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
          body: JSON.stringify({ type: current.type, name: name.value.trim(), slug: slug.value.trim(), description: description.value, parent: hierarchical ? parentId : 0 }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || __('Could not save the term.', 'content-explorer-for-bricks'));
        dialog.close();
        current.state.cebDirty = true;
        if (view !== current) return;
        showSaveNotice(current, creating
          ? sprintf(__('Created "%s".', 'content-explorer-for-bricks'), name.value.trim())
          : __('Term saved.', 'content-explorer-for-bricks'), null);
        load(current);
      } catch (error) {
        message.textContent = error.message || __('Could not save the term.', 'content-explorer-for-bricks');
        save.disabled = false;
        cancel.disabled = false;
      }
    });
    current.root.appendChild(dialog);
    dialog.showModal();
    dialog.cebHubLoadParents?.();
    name.focus();
  }

  function showSaveNotice(current, message, id) {
    current.state.lastNotice = { message, id };
    const notice = current.notice;
    notice.replaceChildren();
    notice.appendChild(element('span', '', message));
    if (current.kind !== 'term' && id && current.data?.can_ceb_edit) {
      const open = themedButton(__('Open in Builder', 'content-explorer-for-bricks'), async () => {
        open.disabled = true;
        try {
          openBuilder(id);
          closeContentPanel();
        } catch (error) {
          notice.querySelector('span').textContent = error.message || __('Could not open this item.', 'content-explorer-for-bricks');
          open.disabled = false;
        }
      }, '', 'notice');
      appendNativeActionIcon(open, current.table, 'open');
      notice.appendChild(open);
    }
    const dismiss = themedButton(__('Dismiss', 'content-explorer-for-bricks'), () => {
      current.state.lastNotice = null;
      notice.hidden = true;
    }, 'ceb-hub-sort-notice-dismiss', 'notice');
    dismiss.dataset.noticeAction = 'dismiss';
    notice.appendChild(dismiss);
    notice.hidden = false;
  }

  const sortLoadedItems = (items, key, order) => {
    const direction = order === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    return [...items].sort((a, b) => {
      const left = String(a[key] ?? '');
      const right = String(b[key] ?? '');
      let result = ['id', 'count', 'parent'].includes(key) ? Number(a[key]) - Number(b[key])
        : key === 'created' || key === 'modified' ? (left > right ? 1 : left < right ? -1 : 0)
          : collator.compare(left, right);
      if (result && key === 'status') return result * direction;
      if (key === 'status') {
        result = String(b.created ?? '').localeCompare(String(a.created ?? '')) || b.id - a.id;
        return result;
      }
      return result * direction;
    });
  };

  function sortLocallyOrLoad(current) {
    const { state, data, dataQuery } = current;
    const hierarchy = state.hierarchy && !state.search.trim();
    if (data && dataQuery && current.results.getAttribute('aria-busy') !== 'true'
      && data.page === 1 && state.page === 1 && data.total === data.items.length
      && data.total <= state.perPage && dataQuery.search === state.search
      && dataQuery.perPage === state.perPage && dataQuery.hierarchy === hierarchy) {
      ++state.requestId;
      renderRows(current, { ...data, items: sortLoadedItems(data.items, state.sort, state.order) });
      return;
    }
    load(current);
  }

  function renderRows(current, data) {
    const { state, results } = current;
    current.treeActionId = (current.treeActionId || 0) + 1;
    current.bulkOpening = false;
    results.replaceChildren();
    const start = data.total ? (data.page - 1) * data.per_page + 1 : 0;
    const end = Math.min(data.page * data.per_page, data.total);
    current.message.textContent = data.hierarchy
      ? sprintf(__('Showing %1$d–%2$d of %3$d top-level items', 'content-explorer-for-bricks'), start, end, data.total)
      : sprintf(__('Showing %1$d–%2$d of %3$d', 'content-explorer-for-bricks'), start, end, data.total);
    results.setAttribute('aria-busy', 'false');
    current.newButton.disabled = !data.can_create;

    const scroller = element('div', 'ceb-hub-sort-scroller');
    scroller.tabIndex = 0;
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', __('Scrollable content table', 'content-explorer-for-bricks'));
    const table = element('table', 'ceb-hub-sort-table');
    const hierarchy = !!data.hierarchy;
    const thead = element('thead');
    const headings = element('tr');
    const isTerm = current.kind === 'term';
    const availableColumns = isTerm
      ? ((config.hierarchicalTaxonomies || []).includes(current.type)
        ? [...termColumns.slice(0, 3), ['parent', __('Parent', 'content-explorer-for-bricks')], ...termColumns.slice(3)]
        : termColumns)
      : columns;
    const activeColumns = availableColumns.filter(([key]) => !hiddenColumns.has(key));
    const hierarchyColumn = hiddenColumns.has('id') ? 'title' : 'id';
    const splitActions = !isTerm && config.actionsLayout === 'split';
    const openStart = !isTerm && config.actionsLayout === 'open_start';
    const separateActions = splitActions || openStart;
    const actionsFirst = !isTerm && config.actionsLayout === 'start';
    const actionHeading = (label, single = false) => {
      const heading = element('th', `ceb-hub-sort-actions-cell${single ? ' ceb-hub-sort-action-single' : ''}`, label);
      heading.scope = 'col';
      return heading;
    };
    if (actionsFirst) headings.appendChild(actionHeading(__('Actions', 'content-explorer-for-bricks')));
    if (openStart) headings.appendChild(actionHeading(__('Open', 'content-explorer-for-bricks'), true));
    for (const [key, label] of activeColumns) {
      const active = state.sort === key;
      const th = element('th', active ? 'ceb-hub-sort-active-heading' : '');
      th.scope = 'col';
      th.setAttribute('aria-sort', active ? (state.order === 'asc' ? 'ascending' : 'descending') : 'none');
      const heading = button(label, () => {
        state.order = state.sort === key && state.order === 'asc' ? 'desc' : 'asc';
        state.sort = key;
        state.sortTouched = true;
        state.page = 1;
        current.focusSort = key;
        sortLocallyOrLoad(current);
      }, 'ceb-hub-sort-heading');
      heading.dataset.sort = key;
      heading.setAttribute('aria-label', active
        ? sprintf(__('Sort by %1$s, %2$s', 'content-explorer-for-bricks'), label, state.order === 'asc' ? __('ascending', 'content-explorer-for-bricks') : __('descending', 'content-explorer-for-bricks'))
        : sprintf(__('Sort by %s', 'content-explorer-for-bricks'), label));
      const icon = element('span', `ceb-hub-sort-icon ceb-hub-sort-icon-${active ? state.order : 'none'}`);
      icon.setAttribute('aria-hidden', 'true');
      heading.appendChild(icon);
      th.appendChild(heading);
      headings.appendChild(th);
      if (key === 'title') {
        const toolsHeading = element('th', 'ceb-hub-sort-tools-cell', __('Quick actions', 'content-explorer-for-bricks'));
        toolsHeading.scope = 'col';
        headings.appendChild(toolsHeading);
      }
      if (splitActions && key === 'title') headings.appendChild(actionHeading(__('Open', 'content-explorer-for-bricks'), true));
    }
    if (separateActions) headings.appendChild(actionHeading(__('Trash', 'content-explorer-for-bricks'), true));
    else if (!actionsFirst) headings.appendChild(actionHeading(__('Actions', 'content-explorer-for-bricks')));
    thead.appendChild(headings);
    table.appendChild(thead);

    const tbody = element('tbody');
    const columnCount = activeColumns.length + 1 + (separateActions ? 2 : 1);
    const updateBulkButton = () => {
      if (!current.bulkButton) return;
      const canExpand = !!tbody.querySelector('.ceb-hub-sort-expand[aria-expanded="false"], .ceb-hub-sort-load-more');
      const hasExpanded = !!tbody.querySelector('.ceb-hub-sort-expand[aria-expanded="true"]');
      const close = current.bulkOpening || (!canExpand && hasExpanded);
      current.bulkMode = close ? 'close' : 'open';
      current.bulkButton.dataset.bulkMode = current.bulkMode;
      current.bulkButton.textContent = close ? __('Close all', 'content-explorer-for-bricks') : __('Open all', 'content-explorer-for-bricks');
      current.bulkButton.title = close
        ? __('Collapse every branch on this page', 'content-explorer-for-bricks')
        : __('Expand every branch on this page', 'content-explorer-for-bricks');
      current.bulkButton.disabled = !canExpand && !hasExpanded;
    };
    const loadChildren = async (parentRow, parentItem, page, depth, nextPageRow = null) => {
      const marker = element('tr', 'ceb-hub-sort-child-message');
      marker.dataset.depth = String(depth);
      const markerCell = element('td', '', __('Loading children…', 'content-explorer-for-bricks'));
      markerCell.colSpan = columnCount;
      marker.appendChild(markerCell);
      parentRow.parentNode.insertBefore(marker, nextPageRow || parentRow.nextSibling);
      try {
        const url = new URL(isTerm ? config.termsEndpoint : config.endpoint);
        for (const [key, value] of Object.entries({
          type: current.type, search: '', sort: state.sort, order: state.order,
          page, per_page: state.perPage, hierarchy: true, parent: parentItem.id,
        })) url.searchParams.set(key, value);
        const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
        const children = await response.json();
        if (!response.ok) throw new Error(children.message || __('Could not load children.', 'content-explorer-for-bricks'));
        if (view !== current || current.data !== data || !marker.isConnected || parentRow.querySelector('.ceb-hub-sort-expand')?.getAttribute('aria-expanded') !== 'true') return false;
        let last = marker;
        for (const child of children.items) {
          const childRow = createRow(child, depth);
          last.after(childRow);
          last = childRow;
        }
        if (page < children.pages) {
          const moreRow = element('tr', 'ceb-hub-sort-child-more');
          moreRow.dataset.depth = String(depth);
          const cell = element('td');
          cell.colSpan = columnCount;
          cell.style.setProperty('--ceb-hub-depth', depth);
          cell.appendChild(themedButton(__('Load more children', 'content-explorer-for-bricks'), () => {
            moreRow.cebHubChildrenPromise = loadChildren(parentRow, parentItem, page + 1, depth, moreRow);
          }, 'ceb-hub-sort-load-more', 'load_more'));
          moreRow.appendChild(cell);
          last.after(moreRow);
        }
        nextPageRow?.remove();
        return true;
      } catch (error) {
        if (marker.isConnected && view === current) {
          current.message.textContent = error.message || __('Could not load children.', 'content-explorer-for-bricks');
          if (!nextPageRow) {
            const expand = parentRow.querySelector('.ceb-hub-sort-expand');
            expand?.setAttribute('aria-expanded', 'false');
            if (expand) {
              expand.textContent = __('Expand', 'content-explorer-for-bricks');
              expand.setAttribute('aria-label', sprintf(__('Show children of %s', 'content-explorer-for-bricks'), parentItem.title || `#${parentItem.id}`));
            }
          }
        }
        return false;
      } finally {
        marker.remove();
        updateBulkButton();
      }
    };
    const createRow = (item, depth = 0) => {
      const row = element('tr');
      row.dataset.depth = String(depth);
      if (hierarchy) {
        row.classList.add('ceb-hub-sort-tree-row');
        if (depth) row.classList.add('ceb-hub-sort-tree-child');
        if (item.has_children) row.classList.add('ceb-hub-sort-tree-parent');
      }
      for (const [key] of activeColumns) {
        const value = key === 'id' ? `#${item.id}`
          : key === 'status' ? statusLabelFor(item.status)
          : key === 'parent' ? item.parent_title || (item.parent ? `#${item.parent}` : '—')
          : key === 'created' || key === 'modified' ? formatDate(item[key])
          : item[key] ?? '';
        const cell = element('td', `ceb-hub-sort-cell-${key}`);
        if (key === 'status') cell.appendChild(element('span', `ceb-hub-sort-status ceb-hub-sort-status-${item.status}${isCustomStatus(item.status) ? ' ceb-hub-sort-status-custom' : ''}`, value));
        else if (key === hierarchyColumn && hierarchy) {
          const id = element('div', 'ceb-hub-sort-tree-id');
          id.style.setProperty('--ceb-hub-depth', depth);
          if (item.has_children) {
            const expand = themedButton(__('Expand', 'content-explorer-for-bricks'), () => {
              const opened = expand.getAttribute('aria-expanded') === 'true';
              expand.setAttribute('aria-expanded', String(!opened));
              expand.textContent = opened ? __('Expand', 'content-explorer-for-bricks') : __('Collapse', 'content-explorer-for-bricks');
              expand.setAttribute('aria-label', sprintf(opened
                ? __('Show children of %s', 'content-explorer-for-bricks')
                : __('Hide children of %s', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
              if (opened) {
                let next = row.nextSibling;
                while (next && Number(next.dataset.depth) > depth) {
                  const following = next.nextSibling;
                  next.remove();
                  next = following;
                }
                updateBulkButton();
              } else row.cebHubChildrenPromise = loadChildren(row, item, 1, depth + 1);
            }, 'ceb-hub-sort-expand', 'expand');
            expand.setAttribute('aria-expanded', 'false');
            expand.setAttribute('aria-label', sprintf(__('Show children of %s', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
            id.appendChild(expand);
          } else id.appendChild(element('span', 'ceb-hub-sort-tree-spacer'));
          id.appendChild(element('span', 'ceb-hub-sort-sr-only', sprintf(__('Level %d: ', 'content-explorer-for-bricks'), depth + 1)));
          id.appendChild(key === 'title' ? titleContent(item) : element('span', '', value));
          cell.appendChild(id);
          cell.title = value;
        } else if (key === 'title' && !hierarchy && item.parent) {
          cell.classList.add('ceb-hub-sort-child-title');
          const title = element('div'); title.append(titleContent(item)); cell.append(title);
          cell.appendChild(element('div', 'ceb-hub-sort-parent-label', sprintf(__('Child of %s', 'content-explorer-for-bricks'), item.parent_title || `#${item.parent}`)));
          cell.title = sprintf(__('%1$s — child of %2$s', 'content-explorer-for-bricks'), value, item.parent_title || `#${item.parent}`);
        } else if (key === 'title') { cell.append(titleContent(item)); cell.title = String(value); }
        else { cell.textContent = value; cell.title = String(value); }
        row.appendChild(cell);
      }
      const tools = element('td', 'ceb-hub-sort-tools-cell');
      const quickActions = element('div', 'ceb-hub-sort-quick-actions');
      if (item.can_edit) {
        const edit = themedButton(__('Quick edit', 'content-explorer-for-bricks'), () => isTerm ? showTermEdit(current, item) : showQuickEdit(current, item), 'ceb-hub-sort-quick-edit', 'quick_edit');
        edit.setAttribute('aria-label', sprintf(__('Quick edit %s', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
        quickActions.append(edit);
        if (!isTerm && config.connectionsEndpoint) {
          const map = button(__('Connections', 'content-explorer-for-bricks'), () => window.cebHubShowConnections?.(item.id), 'ceb-hub-connections-button');
          map.title = __('Connections', 'content-explorer-for-bricks');
          map.setAttribute('aria-label', sprintf(__('Connections for %s', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
          quickActions.append(map);
        }
      }
      tools.append(quickActions);
      row.querySelector('.ceb-hub-sort-cell-title').after(tools);
      if (isTerm) {
        const actions = element('td', 'ceb-hub-sort-actions-cell');
        const buttons = element('div', 'ceb-hub-sort-action-buttons');
        const wordpress = wordpressEditLink(item, true);
        if (wordpress) buttons.appendChild(wordpress);
        if (item.can_delete) {
          const remove = themedButton(__('Delete', 'content-explorer-for-bricks'), async () => {
            const warning = item.has_children
              ? sprintf(__('Permanently delete "%s"? Its child terms will move up one level. This cannot be undone.', 'content-explorer-for-bricks'), item.title)
              : sprintf(__('Permanently delete "%s"? This cannot be undone.', 'content-explorer-for-bricks'), item.title);
            if (!window.confirm(warning)) return;
            remove.disabled = true;
            current.message.textContent = __('Deleting…', 'content-explorer-for-bricks');
            try {
              const url = new URL(`${config.termsEndpoint}/${item.id}`);
              url.searchParams.set('type', current.type);
              const response = await fetch(url, { method: 'DELETE', credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
              const result = await response.json();
              if (!response.ok) throw new Error(result.message || __('Could not delete the term.', 'content-explorer-for-bricks'));
              state.cebDirty = true;
              if (view !== current) return;
              if (depth === 0 && data.items.length === 1 && state.page > 1) state.page--;
              showSaveNotice(current, sprintf(__('Deleted "%s".', 'content-explorer-for-bricks'), item.title), null);
              load(current);
            } catch (error) {
              remove.disabled = false;
              current.message.textContent = error.message || __('Could not delete the term.', 'content-explorer-for-bricks');
            }
          }, 'ceb-hub-sort-trash', 'trash');
          remove.setAttribute('aria-label', sprintf(__('Permanently delete %s', 'content-explorer-for-bricks'), item.title));
          remove.title = __('Permanently delete term', 'content-explorer-for-bricks');
          buttons.appendChild(remove);
        }
        actions.appendChild(buttons);
        row.appendChild(actions);
        return row;
      }
      const actions = element('td', `ceb-hub-sort-actions-cell${separateActions ? ' ceb-hub-sort-action-single' : ''}`);
      const actionButtons = element('div', 'ceb-hub-sort-action-buttons');
      const trashActions = separateActions ? element('td', 'ceb-hub-sort-actions-cell ceb-hub-sort-action-single') : null;
      const trashButtons = separateActions ? element('div', 'ceb-hub-sort-action-buttons') : null;
      const open = themedButton(__('Open', 'content-explorer-for-bricks'), async () => {
        open.disabled = true;
        try {
          openBuilder(item.id, item.ceb_edit_url);
          closeContentPanel();
        } catch (error) {
          current.message.textContent = error.message || __('Could not open this item.', 'content-explorer-for-bricks');
          open.disabled = false;
        }
      }, 'ceb-hub-sort-open', 'open');
      appendNativeActionIcon(open, current.table, 'open');
      open.setAttribute('aria-label', sprintf(__('Open %s in Builder', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
      open.title = __('Open in Builder', 'content-explorer-for-bricks');
      if (item.ceb_edit_url) actionButtons.appendChild(open);
      const wordpress = wordpressEditLink(item);
      if (wordpress) actionButtons.appendChild(wordpress);
      if (item.can_delete) {
        const trash = themedButton(__('Trash', 'content-explorer-for-bricks'), async () => {
          const name = item.title || `#${item.id}`;
          if (!window.confirm(sprintf(__('Move “%s” to WordPress Trash?', 'content-explorer-for-bricks'), name))) return;
          trash.disabled = true;
          current.message.textContent = __('Moving to Trash…', 'content-explorer-for-bricks');
          try {
            const url = new URL(`${config.endpoint}/${item.id}`);
            url.searchParams.set('type', current.type);
            const response = await fetch(url, {
              method: 'DELETE',
              credentials: 'same-origin',
              headers: { 'X-WP-Nonce': config.nonce },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || __('Could not move this item to Trash.', 'content-explorer-for-bricks'));
            state.cebDirty = true;
            if (view !== current) return;
            if (depth === 0 && data.items?.length === 1 && state.page > 1) state.page--;
            current.focusSearch = true;
            load(current);
          } catch (error) {
            trash.disabled = false;
            current.message.textContent = error.message || __('Could not move this item to Trash.', 'content-explorer-for-bricks');
          }
        }, 'ceb-hub-sort-trash', 'trash');
        appendNativeActionIcon(trash, current.table, 'trash');
        trash.setAttribute('aria-label', sprintf(__('Move %s to Trash', 'content-explorer-for-bricks'), item.title || `#${item.id}`));
        trash.title = __('Move to WordPress Trash', 'content-explorer-for-bricks');
        (trashButtons || actionButtons).appendChild(trash);
      }
      actions.appendChild(actionButtons);
      if (separateActions) {
        trashActions.appendChild(trashButtons);
        if (openStart) row.prepend(actions);
        else tools.after(actions);
        row.appendChild(trashActions);
      } else if (actionsFirst) row.prepend(actions);
      else row.appendChild(actions);
      return row;
    };
    for (const item of data.items) tbody.appendChild(createRow(item));
    current.openAll = async () => {
      if (!hierarchy || current.bulkOpening) return;
      const actionId = ++current.treeActionId;
      const countMessage = current.message.textContent;
      current.bulkOpening = true;
      current.message.textContent = __('Opening all branches on this page…', 'content-explorer-for-bricks');
      updateBulkButton();
      try {
        let target;
        while (actionId === current.treeActionId && view === current && current.data === data
          && (target = tbody.querySelector('.ceb-hub-sort-expand[aria-expanded="false"], .ceb-hub-sort-load-more'))) {
          const row = target.closest('tr');
          target.click();
          if (false === await row.cebHubChildrenPromise) return;
        }
        if (actionId === current.treeActionId) current.message.textContent = countMessage;
      } finally {
        if (actionId === current.treeActionId) {
          current.bulkOpening = false;
          updateBulkButton();
        }
      }
    };
    current.closeAll = () => {
      if (!hierarchy) return;
      ++current.treeActionId;
      current.bulkOpening = false;
      for (const row of tbody.querySelectorAll('tr[data-depth="0"]')) {
        const expand = row.querySelector('.ceb-hub-sort-expand[aria-expanded="true"]');
        expand?.click();
      }
      current.message.textContent = sprintf(__('Showing %1$d–%2$d of %3$d top-level items', 'content-explorer-for-bricks'), start, end, data.total);
      updateBulkButton();
    };
    updateBulkButton();
    if (!data.items.length) {
      const row = element('tr');
      const cell = element('td', 'ceb-hub-sort-empty', __('No matching items.', 'content-explorer-for-bricks'));
      cell.colSpan = columnCount;
      row.appendChild(cell);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    scroller.appendChild(table);
    results.appendChild(scroller);

    const paging = element('div', 'ceb-hub-sort-paging');
    const previous = themedButton(__('Previous', 'content-explorer-for-bricks'), () => { state.page--; load(current); }, '', 'pagination');
    previous.dataset.pageDirection = 'previous';
    previous.disabled = data.page <= 1;
    const next = themedButton(__('Next', 'content-explorer-for-bricks'), () => { state.page++; load(current); }, '', 'pagination');
    next.dataset.pageDirection = 'next';
    next.disabled = data.page >= data.pages;
    paging.append(previous, element('span', '', sprintf(__('Page %1$d of %2$d', 'content-explorer-for-bricks'), data.page, Math.max(1, data.pages))), next);
    results.appendChild(paging);
    current.data = data;
    if (current.focusSort) {
      results.querySelector(`[data-sort="${current.focusSort}"]`)?.focus();
      current.focusSort = null;
    } else if (current.focusSearch) {
      current.search.focus();
      current.focusSearch = false;
    }
  }

  async function load(current) {
    if (current.state.native) return;
    const { state } = current;
    const requestId = ++state.requestId;
    const dataQuery = { search: state.search, perPage: state.perPage, hierarchy: state.hierarchy && !state.search.trim() };
    const url = new URL(current.kind === 'term' ? config.termsEndpoint : config.endpoint);
    for (const [key, value] of Object.entries({
      type: current.type, search: state.search, sort: state.sort,
      order: state.order, page: state.page, per_page: state.perPage,
      hierarchy: state.hierarchy && !state.search.trim(), parent: 0,
    })) url.searchParams.set(key, value);
    current.message.textContent = current.kind === 'term'
      ? sprintf(__('Loading %s…', 'content-explorer-for-bricks'), current.label)
      : __('Loading…', 'content-explorer-for-bricks');
    current.results.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
      const data = await response.json();
      if (requestId !== state.requestId || view !== current) return;
      if (!response.ok) throw new Error(data.message || __('Could not load items.', 'content-explorer-for-bricks'));
      current.dataQuery = dataQuery;
      renderRows(current, data);
    } catch (error) {
      if (requestId !== state.requestId || view !== current) return;
      current.message.textContent = error.message || __('Could not load items.', 'content-explorer-for-bricks');
      current.results.setAttribute('aria-busy', 'false');
    }
  }

  function mount(table, type, kind, content, nativeContainer, label) {
    const state = stateFor(type, kind);
    state.native = false;
    const root = element('section', 'ceb-hub-sort');
    root.style.setProperty('--ceb-hub-active-bg', config.activeBg === '#292929' && config.activeText === '#f7f7f8' ? 'var(--ceb-ui-selected-bg, #292929)' : config.activeBg);
    root.style.setProperty('--ceb-hub-active-text', config.activeBg === '#292929' && config.activeText === '#f7f7f8' ? 'var(--ceb-ui-selected-text, #f7f7f8)' : config.activeText);
    applyHierarchyStyle(root);
    root.setAttribute('aria-label', __('Content list', 'content-explorer-for-bricks'));
    const bar = element('div', 'ceb-hub-sort-bar');
    const controls = element('div', 'ceb-hub-sort-controls');
    const search = element('input', 'ceb-hub-sort-search');
    search.type = 'search';
    search.placeholder = __('Search items…', 'content-explorer-for-bricks');
    search.setAttribute('aria-label', __('Search this content type', 'content-explorer-for-bricks'));
    search.value = state.search;
    const size = element('select', 'ceb-hub-sort-size');
    size.setAttribute('aria-label', __('Items per page', 'content-explorer-for-bricks'));
    for (const amount of [25, 50, 100]) {
      const option = element('option', '', sprintf(__('%d per page', 'content-explorer-for-bricks'), amount));
      option.value = String(amount);
      size.appendChild(option);
    }
    size.value = String(state.perPage);
    const message = element('span', 'ceb-hub-sort-message');
    message.setAttribute('role', 'status');
    controls.append(search, message, size);
    const supportsHierarchy = (kind === 'term' ? config.hierarchicalTaxonomies : config.hierarchicalTypes || []).includes(type);
    const hierarchyTools = supportsHierarchy ? element('div', 'ceb-hub-sort-hierarchy-tools') : null;
    const hierarchyButton = supportsHierarchy ? themedButton(__('Hierarchy', 'content-explorer-for-bricks'), () => {
      state.hierarchy = !state.hierarchy;
      state.page = 1;
      syncHierarchy();
      load(current);
    }, 'ceb-hub-sort-hierarchy', 'hierarchy') : null;
    const bulkButton = supportsHierarchy ? themedButton(__('Open all', 'content-explorer-for-bricks'), () => {
      if (current.bulkMode === 'close') current.closeAll?.();
      else current.openAll?.();
    }, 'ceb-hub-sort-bulk', 'bulk') : null;
    const syncHierarchy = () => {
      if (!hierarchyButton) return;
      hierarchyButton.setAttribute('aria-pressed', String(state.hierarchy));
      hierarchyButton.disabled = !!state.search.trim();
      hierarchyButton.title = state.search.trim()
        ? __('Search results appear as a flat list. Clear search to browse the hierarchy.', 'content-explorer-for-bricks')
        : __('Show parent and child items in a tree', 'content-explorer-for-bricks');
      const showBulk = state.hierarchy && !state.search.trim();
      bulkButton.hidden = !showBulk;
      if (!showBulk) bulkButton.disabled = true;
    };
    syncHierarchy();
    const switchButton = element('button');
    switchButton.append(element('span', 'ceb-hub-sort-switch-label'));
    switchButton.hidden = true;
    const newButton = themedButton(kind === 'term' ? __('New term', 'content-explorer-for-bricks') : __('New item', 'content-explorer-for-bricks'),
      () => kind === 'term' ? showTermEdit(current) : showQuickEdit(current), 'ceb-hub-sort-new', 'new');
    newButton.disabled = true;
    bar.append(controls);
    if (hierarchyTools) {
      bulkButton.title = __('Expand every branch on this page', 'content-explorer-for-bricks');
      bulkButton.disabled = true;
      hierarchyTools.append(hierarchyButton, bulkButton);
    }
    const toolbarActions = element('div', 'ceb-hub-sort-toolbar-actions');
    toolbarActions.setAttribute('role', 'group');
    toolbarActions.setAttribute('aria-label', __('List actions', 'content-explorer-for-bricks'));
    const columnPicker = element('details', 'ceb-hub-sort-column-picker');
    const columnSummary = element('summary', '', __('Columns', 'content-explorer-for-bricks'));
    const columnOptions = element('fieldset', 'ceb-hub-sort-column-options');
    columnOptions.append(element('legend', '', __('Show columns', 'content-explorer-for-bricks')));
    for (const [key, label] of columns.filter(([key]) => key !== 'title' && (kind !== 'term' || ['id', 'slug'].includes(key)))) {
      const option = element('label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !hiddenColumns.has(key);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) hiddenColumns.delete(key);
        else hiddenColumns.add(key);
        try { localStorage.setItem(columnStorageKey, JSON.stringify([...hiddenColumns])); } catch { /* Keep the current session usable without storage. */ }
        if (current.data) renderRows(current, current.data);
      });
      option.append(checkbox, document.createTextNode(label));
      columnOptions.append(option);
    }
    columnPicker.append(columnSummary, columnOptions);
    columnPicker.addEventListener('keydown', event => {
      if (event.key === 'Escape') { columnPicker.open = false; columnSummary.focus(); }
    });
    toolbarActions.append(columnPicker);
    if (hierarchyTools) toolbarActions.appendChild(hierarchyTools);
    switchButton.hidden = true;
    toolbarActions.append(newButton);
    bar.appendChild(toolbarActions);
    const notice = element('div', 'ceb-hub-sort-notice');
    notice.setAttribute('role', 'status');
    notice.hidden = true;
    const nativeLoading = element('div', 'ceb-hub-sort-native-loading', __('Updating Bricks table…', 'content-explorer-for-bricks'));
    nativeLoading.setAttribute('role', 'status');
    nativeLoading.hidden = true;
    const results = element('div', 'ceb-hub-sort-results');
    root.append(bar, notice, nativeLoading, results);
    content.append(root);
    const current = { table, nativeContainer, type, kind, label, state, root, controls, hierarchyTools, bulkButton, newButton, switchButton, message, notice, nativeLoading, results, search, syncHierarchy };
    view = current;
    syncMode(current);
    if (state.lastNotice) showSaveNotice(current, state.lastNotice.message, state.lastNotice.id);
    if (!state.native) load(current);

    let searchTimer;
    search.addEventListener('input', () => {
      state.search = search.value;
      state.page = 1;
      syncHierarchy();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => load(current), 250);
    });
    size.addEventListener('change', () => {
      state.perPage = Number(size.value);
      state.page = 1;
      load(current);
    });
  }

  function refresh() {
    mountSettingsPanel();
  }

  function mountSettingsPanel() {
    if (settingsManager) return;
    const panel = element('section', 'ceb-hub-sort-manager');
    panel.id = 'ceb-hub-sort-manager';
    panel.hidden = true;
    panel.setAttribute('aria-label', __('Content Explorer', 'content-explorer-for-bricks'));
    const sidebarTooltip = element('span', 'ceb-hub-sort-sidebar-tooltip');
    sidebarTooltip.hidden = true;
    sidebarTooltip.setAttribute('aria-hidden', 'true');
    panel.append(sidebarTooltip);
    let tooltipTrigger = null, tooltipExit;
    const hideTooltip = () => {
      clearTimeout(tooltipExit);
      sidebarTooltip.hidden = true;
      tooltipTrigger = null;
    };
    const deferTooltipHide = target => {
      if (!target) return;
      clearTimeout(tooltipExit);
      tooltipExit = setTimeout(() => {
        if (tooltipTrigger === target && !target.matches(':focus-visible, :hover') && !sidebarTooltip.matches(':hover')) hideTooltip();
      }, 120);
    };
    sidebarTooltip.addEventListener('pointerenter', () => clearTimeout(tooltipExit));
    sidebarTooltip.addEventListener('pointerleave', () => deferTooltipHide(tooltipTrigger));
    const addSidebarTooltip = (owner, label, triggerSelector) => {
      const eventTrigger = event => triggerSelector ? event.composedPath().find(node => node.matches?.(triggerSelector)) : owner;
      const show = target => {
        if (!panel.classList.contains('is-menu-collapsed')) return;
        clearTimeout(tooltipExit);
        tooltipTrigger = target;
        sidebarTooltip.textContent = typeof label === 'function' ? label() : label;
        sidebarTooltip.hidden = false;
        const rect = target.getBoundingClientRect();
        const width = sidebarTooltip.offsetWidth, height = sidebarTooltip.offsetHeight;
        const right = rect.right + 8;
        const fitsRight = right + width <= window.innerWidth - 8;
        const left = fitsRight ? right : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const top = fitsRight ? rect.top + (rect.height - height) / 2
          : rect.bottom + height + 16 <= window.innerHeight ? rect.bottom + 8 : rect.top - height - 8;
        sidebarTooltip.style.left = `${left}px`;
        sidebarTooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
      };
      owner.addEventListener(triggerSelector ? 'pointerover' : 'pointerenter', event => {
        const target = eventTrigger(event);
        if (target && event.pointerType !== 'touch') show(target);
      });
      owner.addEventListener(triggerSelector ? 'pointerout' : 'pointerleave', event => {
        const target = eventTrigger(event);
        if (tooltipTrigger === target) deferTooltipHide(target);
      });
      owner.addEventListener('focusin', event => {
        const target = eventTrigger(event);
        if (target?.matches(':focus-visible')) show(target);
      });
      owner.addEventListener('focusout', event => { if (tooltipTrigger === eventTrigger(event)) hideTooltip(); });
    };
    window.addEventListener('resize', hideTooltip);
    const textSizeKey = 'ceb-hub-sort-text-size';
    const textSizes = [100, 125, 150, 175, 200];
    let textSize = 100;
    try {
      const saved = Number(localStorage.getItem(textSizeKey));
      if (textSizes.includes(saved)) textSize = saved;
    } catch { /* Use the standard text size when storage is unavailable. */ }
    const setTextSize = size => panel.style.setProperty('--ceb-explorer-text-scale', size / 100);
    setTextSize(textSize);
    const sidebar = element('div', 'ceb-hub-sort-manager-sidebar');
    sidebar.id = 'ceb-content-panel-menu';
    const menuStorageKey = `ceb-hub-sort-menu:${config.userId || 0}`;
    let menuWidth = 200, menuCollapsed = false;
    try {
      const saved = JSON.parse(localStorage.getItem(menuStorageKey) || '{}');
      if (Number.isFinite(saved.width)) menuWidth = Math.min(300, Math.max(160, saved.width));
      menuCollapsed = saved.collapsed === true;
    } catch { /* Use the default menu when storage is unavailable. */ }
    const menuToggle = button('', () => { menuCollapsed = !menuCollapsed; syncMenu(); }, 'ceb-content-menu-toggle');
    menuToggle.setAttribute('aria-controls', sidebar.id);
    const resize = element('div', 'ceb-content-menu-resize');
    resize.tabIndex = 0;
    resize.setAttribute('role', 'separator');
    resize.setAttribute('aria-label', __('Resize content menu', 'content-explorer-for-bricks'));
    resize.setAttribute('aria-orientation', 'vertical');
    resize.setAttribute('aria-controls', sidebar.id);
    resize.setAttribute('aria-valuemin', '160');
    resize.setAttribute('aria-valuemax', '300');
    const syncMenu = () => {
      panel.style.setProperty('--ceb-content-menu-width', `${menuWidth}px`);
      panel.classList.toggle('is-menu-collapsed', menuCollapsed);
      menuToggle.textContent = menuCollapsed ? '›' : '‹';
      const label = menuCollapsed ? __('Expand content menu', 'content-explorer-for-bricks') : __('Collapse content menu', 'content-explorer-for-bricks');
      menuToggle.setAttribute('aria-label', label);
      hideTooltip();
      menuToggle.setAttribute('aria-expanded', String(!menuCollapsed));
      resize.hidden = menuCollapsed;
      resize.setAttribute('aria-valuenow', String(menuWidth));
      resize.setAttribute('aria-valuetext', `${menuWidth}px`);
      try { localStorage.setItem(menuStorageKey, JSON.stringify({ width: menuWidth, collapsed: menuCollapsed })); } catch { /* Keep resizing usable without storage. */ }
    };
    resize.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      resize.focus();
      resize.setPointerCapture(event.pointerId);
      panel.classList.add('is-menu-resizing');
    });
    resize.addEventListener('pointermove', event => {
      if (!resize.hasPointerCapture(event.pointerId)) return;
      menuWidth = Math.min(300, Math.max(160, Math.round(event.clientX - panel.getBoundingClientRect().left)));
      syncMenu();
    });
    const stopResize = () => panel.classList.remove('is-menu-resizing');
    resize.addEventListener('pointerup', event => { if (resize.hasPointerCapture(event.pointerId)) resize.releasePointerCapture(event.pointerId); stopResize(); });
    resize.addEventListener('lostpointercapture', stopResize);
    resize.addEventListener('pointercancel', stopResize);
    resize.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      menuWidth = event.key === 'Home' ? 160 : event.key === 'End' ? 300
        : Math.min(300, Math.max(160, menuWidth + (event.key === 'ArrowLeft' ? -10 : 10)));
      syncMenu();
    });
    syncMenu();
    const header = element('div', 'ceb-hub-sort-manager-header');
    const back = button(__('Close Content Explorer', 'content-explorer-for-bricks'), closeContentPanel, 'ceb-hub-sort-manager-back');
    back.setAttribute('aria-label', __('Close Content Explorer', 'content-explorer-for-bricks'));
    addSidebarTooltip(back, () => back.getAttribute('aria-label'));
    addSidebarTooltip(menuToggle, () => menuToggle.getAttribute('aria-label'));
    const title = element('h1', '', __('Content Explorer', 'content-explorer-for-bricks'));
    const versionPill = element('span', 'ceb-hub-sort-version-pill', `v${config.version}`);
    versionPill.setAttribute('aria-label', sprintf(__('Installed version %s', 'content-explorer-for-bricks'), config.version));
    header.append(back, title, menuToggle);
    const nav = element('nav', 'ceb-hub-sort-manager-nav');
    nav.setAttribute('aria-label', __('Content views and settings', 'content-explorer-for-bricks'));
    nav.addEventListener('scroll', hideTooltip);
    const navIcon = name => {
      const icon = element('span', 'ceb-hub-sort-nav-icon');
      icon.dataset.icon = name;
      icon.setAttribute('aria-hidden', 'true');
      return icon;
    };
    const navButton = (label, icon, action) => {
      const tab = button('', action, 'ceb-hub-sort-manager-nav-button');
      addSidebarTooltip(tab, label);
      tab.append(navIcon(icon), element('span', 'ceb-hub-sort-nav-label', label));
      return tab;
    };
    const disclosureItem = (label, icon) => {
      const item = element('wa-accordion-item');
      const heading = element('span', 'ceb-hub-sort-disclosure-label');
      heading.slot = 'label';
      heading.append(navIcon(icon), element('span', 'ceb-hub-sort-nav-label', label));
      item.append(heading);
      addSidebarTooltip(item, label, 'button[part~="button"]');
      return item;
    };
    const generalTab = navButton(__('General', 'content-explorer-for-bricks'), 'sliders-horizontal', () => showSection('general'));
    const editorsTab = navButton(__('Editors', 'content-explorer-for-bricks'), 'edit', () => showSection('editors'));
    const hierarchyTab = navButton(__('Hierarchy', 'content-explorer-for-bricks'), 'hierarchy', () => showSection('hierarchy'));
    const buttonsTab = navButton(__('Buttons', 'content-explorer-for-bricks'), 'toggle-left', () => showSection('buttons'));
    const statusesTab = navButton(__('Status colors', 'content-explorer-for-bricks'), 'palette', () => showSection('statuses'));
    const transferTab = navButton(__('Settings transfer', 'content-explorer-for-bricks'), 'arrow-left-right', () => showSection('transfer'));
    const listTab = navButton(__('List', 'content-explorer-for-bricks'), 'list', () => showSection('list'));
    const mapDisclosure = element('wa-accordion', 'ceb-content-settings-disclosure ceb-content-map-disclosure');
    mapDisclosure.setAttribute('appearance', 'plain');
    mapDisclosure.setAttribute('heading-level', 'none');
    const mapItem = disclosureItem(__('Map', 'content-explorer-for-bricks'), 'globe');
    const siteMapTab = navButton(__('Site', 'content-explorer-for-bricks'), 'chart-relationship', () => showSection('map'));
    const pageMapTab = navButton(__('Current item', 'content-explorer-for-bricks'), 'connections', () => showSection('map', activePostId()));
    mapItem.append(siteMapTab, pageMapTab);
    mapDisclosure.append(mapItem);
    nav.append(listTab, mapDisclosure);
    const settingsDisclosure = element('wa-accordion', 'ceb-content-settings-disclosure');
    settingsDisclosure.setAttribute('appearance', 'plain');
    settingsDisclosure.setAttribute('heading-level', 'none');
    const settingsItem = disclosureItem(__('Settings', 'content-explorer-for-bricks'), 'gear');
    settingsItem.append(generalTab, editorsTab, hierarchyTab, buttonsTab, statusesTab, transferTab);
    settingsDisclosure.append(settingsItem);
    if (config.canManage) nav.append(settingsDisclosure);
    const sidebarFooter = element('div', 'ceb-hub-sort-manager-sidebar-footer');
    sidebarFooter.appendChild(versionPill);
    sidebar.append(header, nav, sidebarFooter, resize);
    const body = element('div', 'ceb-hub-sort-manager-body');
    const content = element('div', 'ceb-hub-sort-settings-panel');
    const editorsContent = element('div', 'ceb-hub-sort-settings-panel');
    const hierarchyContent = element('div', 'ceb-hub-sort-hierarchy-settings-panel');
    const buttonContent = element('div', 'ceb-hub-sort-button-settings-panel');
    const statusContent = element('div', 'ceb-hub-sort-button-settings-panel ceb-hub-sort-status-settings-panel');
    const transferContent = element('div', 'ceb-hub-sort-button-settings-panel');
    const listContent = element('div', 'ceb-content-list-view');
    const listHeading = element('header', 'ceb-content-list-heading');
    listHeading.append(element('h2', '', __('List', 'content-explorer-for-bricks')));
    const typeLabel = element('label', 'ceb-content-type-label', __('Content type', 'content-explorer-for-bricks'));
    const typeSelect = element('select', 'ceb-hub-sort-placement-select');
    typeSelect.setAttribute('aria-label', __('Choose content type', 'content-explorer-for-bricks'));
    const typeOrderKey = `ceb-hub-sort-type-order:${config.userId || 0}`;
    const typeOrder = element('select', 'ceb-hub-sort-placement-select ceb-content-type-order');
    typeOrder.setAttribute('aria-label', __('Content type order', 'content-explorer-for-bricks'));
    for (const [value, label] of [
      ['asc', __('A–Z', 'content-explorer-for-bricks')],
      ['desc', __('Z–A', 'content-explorer-for-bricks')],
      ['wordpress', __('WordPress order', 'content-explorer-for-bricks')],
    ]) {
      const option = element('option', '', label); option.value = value; typeOrder.append(option);
    }
    try {
      const saved = localStorage.getItem(typeOrderKey);
      if (['asc', 'desc', 'wordpress'].includes(saved)) typeOrder.value = saved;
    } catch { /* Alphabetical order remains available without storage. */ }
    const typeCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    const renderTypes = () => {
      const selected = typeSelect.value;
      typeSelect.replaceChildren();
      for (const [kind, label, values] of [ ['post', __('Content', 'content-explorer-for-bricks'), config.types], ['term', __('Taxonomies', 'content-explorer-for-bricks'), config.taxonomies] ]) {
        const group = element('optgroup'); group.label = label;
        const entries = Object.entries(values || {});
        if (typeOrder.value !== 'wordpress') entries.sort(([a, av], [b, bv]) => (typeCollator.compare(a || av, b || bv) || av.localeCompare(bv)) * (typeOrder.value === 'desc' ? -1 : 1));
        for (const [name, value] of entries) {
          if (['attachment', 'wp_global_styles', 'wp_font_family', 'wp_font_face'].includes(value)) continue;
          const option = element('option', '', name || value); option.value = `${kind}:${value}`; group.append(option);
        }
        typeSelect.append(group);
      }
      if ([...typeSelect.options].some(option => option.value === selected)) typeSelect.value = selected;
    };
    renderTypes();
    if ([...typeSelect.options].some(option => option.value === 'post:page')) typeSelect.value = 'post:page';
    typeOrder.addEventListener('change', () => {
      renderTypes();
      try { localStorage.setItem(typeOrderKey, typeOrder.value); } catch { /* Keep the selected order for this session. */ }
    });
    const orderLabel = element('label', 'ceb-content-type-label', __('Type order', 'content-explorer-for-bricks'));
    orderLabel.append(typeOrder);
    const typeControls = element('div', 'ceb-content-type-controls');
    typeLabel.append(typeSelect); typeControls.append(typeLabel, orderLabel); listHeading.append(typeControls);
    const listHost = element('div', 'ceb-content-list-host');
    listContent.append(listHeading, listHost);
    const mapContent = element('div', 'ceb-content-map-view');
    body.append(listContent, mapContent, content, editorsContent, hierarchyContent, buttonContent, statusContent, transferContent);
    const mountList = () => {
      if (view) { view.state.requestId++; view.root.remove(); view = null; }
      const [kind, type] = typeSelect.value.split(':');
      if (type) mount(null, type, kind, listHost, null, typeSelect.selectedOptions[0].textContent);
    };
    typeSelect.addEventListener('change', mountList);
    panel.append(sidebar, body);
    (config.builderContext ? document.body : document.querySelector('#wpbody-content') || document.body).appendChild(panel);
    const showSection = (section, id = 0) => {
      hideTooltip();
      if (!['list', 'map'].includes(section) && !config.canManage) section = 'list';
      if (!['list', 'map'].includes(section)) settingsItem.expanded = true;
      window.cebHubCloseConnections?.();
      panel.classList.toggle('has-delta-map', section === 'map');
      listContent.hidden = section !== 'list';
      mapContent.hidden = section !== 'map';
      if (section === 'list' && !view) mountList();
      if (section === 'map') window.cebHubMountConnections?.(mapContent, id || activePostId(), id ? 'page' : 'site');
      listTab.setAttribute('aria-current', section === 'list' ? 'page' : 'false');
      siteMapTab.setAttribute('aria-current', section === 'map' && !id ? 'page' : 'false');
      pageMapTab.setAttribute('aria-current', section === 'map' && id ? 'page' : 'false');
      if (section === 'map') mapItem.expanded = true;
      settingsManager.section = section;
      if (!panel.hidden) document.dispatchEvent(new CustomEvent('ceb:panelchange', { detail: { open: true, section } }));
      syncSidebarActiveState();
      content.hidden = section !== 'general';
      editorsContent.hidden = section !== 'editors';
      hierarchyContent.hidden = section !== 'hierarchy';
      buttonContent.hidden = section !== 'buttons';
      statusContent.hidden = section !== 'statuses';
      transferContent.hidden = section !== 'transfer';
      generalTab.setAttribute('aria-current', section === 'general' ? 'page' : 'false');
      editorsTab.setAttribute('aria-current', section === 'editors' ? 'page' : 'false');
      hierarchyTab.setAttribute('aria-current', section === 'hierarchy' ? 'page' : 'false');
      buttonsTab.setAttribute('aria-current', section === 'buttons' ? 'page' : 'false');
      statusesTab.setAttribute('aria-current', section === 'statuses' ? 'page' : 'false');
      transferTab.setAttribute('aria-current', section === 'transfer' ? 'page' : 'false');
      body.scrollTop = 0;
    };
    settingsManager = { panel, back, menuToggle, launch: null, trigger: null, showSection };
    showSection('list');
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (sidebarTooltip.hidden) back.click();
        else hideTooltip();
      }
      event.stopPropagation();
    });
    panel.addEventListener('keyup', event => event.stopPropagation());
    const addSetting = ({ label, ariaLabel, description, key, configKey }) => {
      const row = element('div', 'settings-toggle svelte-2pz811 ceb-hub-sort-setting');
      const wrapper = element('div', 'settings-toggle-input-wrapper svelte-2pz811');
      const name = element('span', 'settings-toggle-name svelte-2pz811', label);
      const toggle = element('button', 'ceb-hub-sort-enable-switch');
      toggle.type = 'button';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', ariaLabel);
      const thumb = element('span', 'ceb-hub-sort-enable-switch-thumb');
      toggle.appendChild(thumb);
      const help = element('p', 'settings-toggle-description svelte-2pz811', description);
      const status = element('span', 'ceb-hub-sort-setting-status');
      status.setAttribute('role', 'status');
      const paint = () => {
        const state = config[configKey] ? 'checked' : 'unchecked';
        toggle.dataset.state = state;
        toggle.setAttribute('aria-checked', String(config[configKey]));
        thumb.dataset.state = state;
      };
      paint();
      toggle.addEventListener('click', async () => {
        toggle.disabled = true;
        status.textContent = __('Saving…', 'content-explorer-for-bricks');
        try {
          const response = await fetch(config.settingsEndpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
            body: JSON.stringify({ [key]: !config[configKey] }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || __('Could not save setting.', 'content-explorer-for-bricks'));
          config[configKey] = !!data[key];
          config.actionsLayout = data.actions_layout;
          paint();
          status.textContent = __('Saved', 'content-explorer-for-bricks');
          if (key === 'enabled') refresh();
          if (key === 'hide_native_content_hub') syncNativeContentHub();
          if (key === 'enabled' || key === 'show_sidebar_icon') syncSidebarShortcut();
          else if (view?.data && !view.state.native) renderRows(view, view.data);
        } catch (error) {
          status.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
        } finally {
          toggle.disabled = false;
        }
      });
      wrapper.append(name, toggle);
      row.append(wrapper, help, status);
      content.appendChild(row);
      return { row, name, toggle, help, status };
    };
    const enableSetting = addSetting({
      label: __('Enable search and sorting', 'content-explorer-for-bricks'),
      ariaLabel: __('Enable Content Hub search and sorting', 'content-explorer-for-bricks'),
      description: __('Search, sort, and page through all content. Changes save immediately.', 'content-explorer-for-bricks'),
      key: 'enabled', configKey: 'enabled',
    });
    const nativeHubSetting = addSetting({
      label: __('Hide native Content Hub icon', 'content-explorer-for-bricks'),
      ariaLabel: __('Hide native Content Hub icon', 'content-explorer-for-bricks'),
      description: __('Hide Bricks’s original sidebar shortcut. Content Explorer stays available in the top sidebar section.', 'content-explorer-for-bricks'),
      key: 'hide_native_content_hub', configKey: 'hideNativeContentHub',
    });
    const wordpressEditSetting = addSetting({
      label: __('Show WordPress shortcuts for terms', 'content-explorer-for-bricks'),
      ariaLabel: __('Show WordPress shortcuts for taxonomy terms in List', 'content-explorer-for-bricks'),
      description: __('Show WordPress editor links for taxonomy terms in List.', 'content-explorer-for-bricks'),
      key: 'show_wordpress_edit', configKey: 'showWordPressEdit',
    });
    const placement = element('div', 'settings-toggle svelte-2pz811 ceb-hub-sort-setting');
    const placementWrapper = element('div', 'settings-toggle-input-wrapper svelte-2pz811');
    const placementLabel = element('span', 'settings-toggle-name svelte-2pz811', __('Actions placement', 'content-explorer-for-bricks'));
    const placementSelect = element('select', 'ceb-hub-sort-placement-select');
    placementSelect.setAttribute('aria-label', __('Actions placement', 'content-explorer-for-bricks'));
    for (const [value, label] of [
      ['end', __('Both at end', 'content-explorer-for-bricks')],
      ['start', __('Both at start', 'content-explorer-for-bricks')],
      ['split', __('Open after Title, Trash last', 'content-explorer-for-bricks')],
      ['open_start', __('Open first, Trash last', 'content-explorer-for-bricks')],
    ]) {
      const option = element('option', '', label);
      option.value = value;
      placementSelect.appendChild(option);
    }
    placementSelect.value = config.actionsLayout;
    const placementHelp = element('p', 'settings-toggle-description svelte-2pz811', __('Choose where the Open and Trash buttons appear in the search and sort table.', 'content-explorer-for-bricks'));
    const placementStatus = element('span', 'ceb-hub-sort-setting-status');
    placementStatus.setAttribute('role', 'status');
    placementSelect.addEventListener('change', async () => {
      placementSelect.disabled = true;
      placementStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const response = await fetch(config.settingsEndpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
          body: JSON.stringify({ actions_layout: placementSelect.value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || __('Could not save setting.', 'content-explorer-for-bricks'));
        config.actionsLayout = data.actions_layout;
        placementSelect.value = config.actionsLayout;
        placementStatus.textContent = __('Saved', 'content-explorer-for-bricks');
        if (view?.data && !view.state.native) renderRows(view, view.data);
      } catch (error) {
        placementSelect.value = config.actionsLayout;
        placementStatus.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
      } finally {
        placementSelect.disabled = false;
      }
    });
    placementWrapper.append(placementLabel, placementSelect);
    placement.append(placementWrapper, placementHelp, placementStatus);
    content.appendChild(placement);

    const defaultRow = element('div', 'ceb-hub-sort-setting ceb-hub-sort-default-setting');
    const defaultLabel = element('span', 'settings-toggle-name svelte-2pz811', __('Initial sorting', 'content-explorer-for-bricks'));
    const defaultControls = element('div', 'ceb-hub-sort-default-controls');
    const columnSelect = element('select', 'ceb-hub-sort-placement-select');
    columnSelect.setAttribute('aria-label', __('Default sort column', 'content-explorer-for-bricks'));
    for (const [key, label] of columns) {
      const option = element('option', '', label);
      option.value = key;
      columnSelect.appendChild(option);
    }
    columnSelect.value = config.defaultColumn;
    const orderSelect = element('select', 'ceb-hub-sort-placement-select');
    orderSelect.setAttribute('aria-label', __('Default sort direction', 'content-explorer-for-bricks'));
    for (const [key, label] of [
      ['asc', __('Ascending', 'content-explorer-for-bricks')],
      ['desc', __('Descending', 'content-explorer-for-bricks')],
    ]) {
      const option = element('option', '', label);
      option.value = key;
      orderSelect.appendChild(option);
    }
    orderSelect.value = config.defaultOrder;
    const defaultHelp = element('p', 'settings-toggle-description svelte-2pz811', __('Used when a content type is first opened. Clicking a column header still sorts that view.', 'content-explorer-for-bricks'));
    const defaultStatus = element('span', 'ceb-hub-sort-setting-status');
    defaultStatus.setAttribute('role', 'status');
    const saveDefault = async () => {
      columnSelect.disabled = orderSelect.disabled = true;
      defaultStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const data = await saveSettings({ default_column: columnSelect.value, default_order: orderSelect.value });
        config.defaultColumn = data.default_column;
        config.defaultOrder = data.default_order;
        for (const [key, state] of states) {
          if (!key.startsWith('post:') || state.sortTouched) continue;
          state.sort = config.defaultColumn;
          state.order = config.defaultOrder;
          state.page = 1;
        }
        if (view?.kind === 'post' && !view.state.sortTouched && !view.state.native) sortLocallyOrLoad(view);
        defaultStatus.textContent = __('Saved', 'content-explorer-for-bricks');
      } catch (error) {
        columnSelect.value = config.defaultColumn;
        orderSelect.value = config.defaultOrder;
        defaultStatus.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
      } finally {
        columnSelect.disabled = orderSelect.disabled = false;
      }
    };
    columnSelect.addEventListener('change', saveDefault);
    orderSelect.addEventListener('change', saveDefault);
    defaultControls.append(columnSelect, orderSelect);
    defaultRow.append(defaultLabel, defaultControls, defaultHelp, defaultStatus);
    content.appendChild(defaultRow);

    const termDefaultRow = element('div', 'ceb-hub-sort-setting ceb-hub-sort-default-setting');
    const termDefaultLabel = element('span', 'settings-toggle-name svelte-2pz811', __('Initial taxonomy sorting', 'content-explorer-for-bricks'));
    const termDefaultControls = element('div', 'ceb-hub-sort-default-controls');
    const termColumnSelect = element('select', 'ceb-hub-sort-placement-select');
    termColumnSelect.setAttribute('aria-label', __('Default taxonomy sort column', 'content-explorer-for-bricks'));
    for (const [key, label] of termColumns) {
      const option = element('option', '', label);
      option.value = key;
      termColumnSelect.appendChild(option);
    }
    termColumnSelect.value = config.termDefaultColumn;
    const termOrderSelect = element('select', 'ceb-hub-sort-placement-select');
    termOrderSelect.setAttribute('aria-label', __('Default taxonomy sort direction', 'content-explorer-for-bricks'));
    for (const [key, label] of [['asc', __('Ascending', 'content-explorer-for-bricks')], ['desc', __('Descending', 'content-explorer-for-bricks')]]) {
      const option = element('option', '', label);
      option.value = key;
      termOrderSelect.appendChild(option);
    }
    termOrderSelect.value = config.termDefaultOrder;
    const termDefaultHelp = element('p', 'settings-toggle-description svelte-2pz811', __('Used when a taxonomy is first opened. Its column headings remain sortable.', 'content-explorer-for-bricks'));
    const termDefaultStatus = element('span', 'ceb-hub-sort-setting-status');
    termDefaultStatus.setAttribute('role', 'status');
    const saveTermDefault = async () => {
      termColumnSelect.disabled = termOrderSelect.disabled = true;
      termDefaultStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const data = await saveSettings({ term_default_column: termColumnSelect.value, term_default_order: termOrderSelect.value });
        config.termDefaultColumn = data.term_default_column;
        config.termDefaultOrder = data.term_default_order;
        for (const [key, state] of states) {
          if (!key.startsWith('term:') || state.sortTouched) continue;
          state.sort = config.termDefaultColumn;
          state.order = config.termDefaultOrder;
          state.page = 1;
        }
        if (view?.kind === 'term' && !view.state.sortTouched && !view.state.native) sortLocallyOrLoad(view);
        termDefaultStatus.textContent = __('Saved', 'content-explorer-for-bricks');
      } catch (error) {
        termColumnSelect.value = config.termDefaultColumn;
        termOrderSelect.value = config.termDefaultOrder;
        termDefaultStatus.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
      } finally {
        termColumnSelect.disabled = termOrderSelect.disabled = false;
      }
    };
    termColumnSelect.addEventListener('change', saveTermDefault);
    termOrderSelect.addEventListener('change', saveTermDefault);
    termDefaultControls.append(termColumnSelect, termOrderSelect);
    termDefaultRow.append(termDefaultLabel, termDefaultControls, termDefaultHelp, termDefaultStatus);
    content.appendChild(termDefaultRow);

    const colorRow = element('div', 'ceb-hub-sort-setting ceb-hub-sort-color-setting');
    const colorHeading = element('span', 'settings-toggle-name svelte-2pz811', __('Active sort heading colors', 'content-explorer-for-bricks'));
    const colorControls = element('div', 'ceb-hub-sort-color-controls');
    const colorField = (id, label, value) => {
      const field = element('label', 'ceb-hub-sort-color-field');
      const name = element('span', '', label);
      const input = element('input', 'ceb-hub-sort-color-input');
      input.type = 'color';
      input.id = id;
      input.value = value;
      const code = element('span', 'ceb-hub-sort-color-code', value);
      input.addEventListener('input', () => { code.textContent = input.value; updateColorPreview(); });
      field.append(name, input, code);
      return { field, input };
    };
    const background = colorField('ceb-hub-active-bg', __('Background', 'content-explorer-for-bricks'), config.activeBg);
    const foreground = colorField('ceb-hub-active-text', __('Text', 'content-explorer-for-bricks'), config.activeText);
    const preview = element('div', 'ceb-hub-sort-color-preview', __('TITLE ↑', 'content-explorer-for-bricks'));
    const colorHelp = element('p', 'settings-toggle-description svelte-2pz811', __('Colors apply to the sorted column heading. Text contrast must be at least 4.5:1.', 'content-explorer-for-bricks'));
    const contrastStatus = element('span', 'ceb-hub-sort-setting-status');
    contrastStatus.setAttribute('role', 'status');
    const saveColors = button(__('Save colors', 'content-explorer-for-bricks'), async () => {
      saveColors.disabled = true;
      contrastStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const data = await saveSettings({ active_bg: background.input.value, active_text: foreground.input.value });
        config.activeBg = data.active_bg;
        config.activeText = data.active_text;
        if (view) {
          view.root.style.setProperty('--ceb-hub-active-bg', config.activeBg === '#292929' && config.activeText === '#f7f7f8' ? 'var(--ceb-ui-selected-bg, #292929)' : config.activeBg);
          view.root.style.setProperty('--ceb-hub-active-text', config.activeBg === '#292929' && config.activeText === '#f7f7f8' ? 'var(--ceb-ui-selected-text, #f7f7f8)' : config.activeText);
        }
        updateColorPreview();
        contrastStatus.textContent = __('Saved', 'content-explorer-for-bricks');
      } catch (error) {
        updateColorPreview();
        contrastStatus.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
      }
    }, 'ceb-hub-sort-save-colors');
    function updateColorPreview() {
      const ratio = contrastRatio(background.input.value, foreground.input.value);
      preview.style.backgroundColor = background.input.value;
      preview.style.color = foreground.input.value;
      saveColors.disabled = ratio < 4.5 || (background.input.value === config.activeBg && foreground.input.value === config.activeText);
      contrastStatus.textContent = ratio < 4.5
        ? sprintf(__('Contrast %s:1 is too low. Choose at least 4.5:1.', 'content-explorer-for-bricks'), ratio.toFixed(2))
        : sprintf(__('Contrast %s:1', 'content-explorer-for-bricks'), ratio.toFixed(2));
    }
    colorControls.append(background.field, foreground.field);
    colorRow.append(colorHeading, colorControls, preview, colorHelp, contrastStatus, saveColors);
    content.appendChild(colorRow);
    updateColorPreview();

    const arrangeSetting = (row, label, help, status, ...actions) => {
      const copy = element('div', 'ceb-hub-sort-setting-copy');
      const controls = element('div', 'ceb-hub-sort-setting-actions');
      copy.append(label, help, status);
      controls.append(...actions);
      row.replaceChildren(copy, controls);
    };
    arrangeSetting(nativeHubSetting.row, nativeHubSetting.name, nativeHubSetting.help, nativeHubSetting.status, nativeHubSetting.toggle);
    arrangeSetting(enableSetting.row, enableSetting.name, enableSetting.help, enableSetting.status, enableSetting.toggle);
    arrangeSetting(wordpressEditSetting.row, wordpressEditSetting.name, wordpressEditSetting.help, wordpressEditSetting.status, wordpressEditSetting.toggle);
    arrangeSetting(placement, placementLabel, placementHelp, placementStatus, placementSelect);
    arrangeSetting(defaultRow, defaultLabel, defaultHelp, defaultStatus, defaultControls);
    arrangeSetting(termDefaultRow, termDefaultLabel, termDefaultHelp, termDefaultStatus, termDefaultControls);
    arrangeSetting(colorRow, colorHeading, colorHelp, contrastStatus, colorControls, preview, saveColors);
    const generalHeading = element('div', 'ceb-hub-sort-manager-intro');
    generalHeading.appendChild(element('h2', '', __('General', 'content-explorer-for-bricks')));
    content.prepend(generalHeading);
    const settingsGroup = (title, ...rows) => {
      const section = element('section', 'ceb-hub-sort-settings-group');
      section.setAttribute('aria-label', title);
      section.appendChild(element('h3', 'ceb-hub-sort-settings-group-title', title));
      const list = element('div', 'ceb-hub-sort-settings-group-list');
      list.append(...rows);
      section.appendChild(list);
      content.appendChild(section);
    };
    const textSizeRow = element('div', 'ceb-hub-sort-setting');
    const textSizeLabel = element('label', 'settings-toggle-name', __('Text size', 'content-explorer-for-bricks'));
    const textSizeSelect = element('select', 'ceb-hub-sort-placement-select');
    textSizeSelect.id = 'ceb-hub-sort-text-size';
    textSizeLabel.htmlFor = textSizeSelect.id;
    const percent = new Intl.NumberFormat(undefined, { style: 'percent' });
    for (const size of textSizes) {
      const option = element('option', '', percent.format(size / 100));
      option.value = size;
      textSizeSelect.append(option);
    }
    textSizeSelect.value = textSize;
    textSizeSelect.addEventListener('change', () => {
      textSize = Number(textSizeSelect.value);
      setTextSize(textSize);
      try { localStorage.setItem(textSizeKey, String(textSize)); } catch { /* Leave the current selection active. */ }
    });
    const textSizeHelp = element('p', 'settings-toggle-description', __('Adjust Content Explorer text size for this browser.', 'content-explorer-for-bricks'));
    textSizeHelp.id = 'ceb-hub-sort-text-size-help';
    textSizeSelect.setAttribute('aria-describedby', textSizeHelp.id);
    arrangeSetting(textSizeRow, textSizeLabel, textSizeHelp, element('span'), textSizeSelect);
    enableSetting.row.remove();
    nativeHubSetting.row.remove();
    settingsGroup(__('Table', 'content-explorer-for-bricks'), wordpressEditSetting.row, placement, defaultRow, termDefaultRow);
    settingsGroup(__('Appearance', 'content-explorer-for-bricks'), textSizeRow, colorRow);

    const editorsIntro = element('div', 'ceb-hub-sort-manager-intro');
    editorsIntro.append(
      element('h2', '', __('Editors', 'content-explorer-for-bricks')),
      element('p', '', __('Choose which editor shortcuts appear in List and Map for each post type. WordPress permissions and Bricks support still apply.', 'content-explorer-for-bricks'))
    );
    const editorsForm = element('form', 'ceb-hub-sort-settings-group ceb-hub-sort-editor-settings');
    const editorRows = element('div', 'ceb-hub-sort-settings-group-list');
    const editorSelects = new Map();
    const editorModes = new Map([
      ['both', __('Bricks and WordPress', 'content-explorer-for-bricks')],
      ['wordpress', __('WordPress only', 'content-explorer-for-bricks')],
      ['ceb', __('Bricks only', 'content-explorer-for-bricks')],
    ]);
    const savedEditorModes = new Map();
    const editorTypes = [...(config.editorTypes || [])].sort((a, b) => a.label.localeCompare(b.label));
    for (const { name, label, supportsBricks, shared, mode: activeMode } of editorTypes) {
      const row = element('div', 'ceb-hub-sort-setting');
      const status = element('span', 'ceb-hub-sort-setting-status');
      const fixed = shared || !supportsBricks;
      const title = element(fixed ? 'span' : 'label', 'settings-toggle-name', label);
      const slug = element('p', 'settings-toggle-description', name);
      if (fixed) {
        arrangeSetting(row, title, slug, status, element('span', '', editorModes.get(activeMode)));
      } else {
        const select = element('select', 'ceb-hub-sort-placement-select ceb-hub-sort-editor-select');
        select.id = `ceb-hub-editor-${name}`;
        title.htmlFor = select.id;
        for (const [mode, text] of editorModes) {
          const option = element('option', '', text);
          option.value = mode;
          select.append(option);
        }
        select.value = activeMode;
        savedEditorModes.set(name, activeMode);
        editorSelects.set(name, select);
        const currentChoice = element('span', 'ceb-hub-sort-editor-current', editorModes.get(activeMode));
        currentChoice.setAttribute('aria-hidden', 'true');
        select.addEventListener('change', () => { currentChoice.textContent = editorModes.get(select.value); });
        arrangeSetting(row, title, slug, status, select, currentChoice);
      }
      editorRows.append(row);
    }
    const editorControls = element('div', 'ceb-hub-sort-setting');
    const editorStatus = element('span', 'ceb-hub-sort-setting-status');
    editorStatus.setAttribute('role', 'status');
    const saveEditors = element('button', 'ceb-hub-sort-button', __('Save editor settings', 'content-explorer-for-bricks'));
    saveEditors.type = 'submit';
    saveEditors.disabled = true;
    editorsForm.addEventListener('change', () => {
      saveEditors.disabled = ![...editorSelects].some(([name, select]) => select.value !== savedEditorModes.get(name));
      editorStatus.textContent = '';
    });
    editorsForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (saveEditors.disabled) return;
      const access = { ...config.editorAccess };
      for (const [name, select] of editorSelects) {
        if (select.value !== savedEditorModes.get(name)) access[name] = select.value;
        select.disabled = true;
      }
      saveEditors.disabled = true;
      editorStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const data = await saveSettings({ editor_access: access });
        config.editorAccess = data.editor_access;
        for (const [name, select] of editorSelects) savedEditorModes.set(name, select.value);
        editorStatus.textContent = __('Saved', 'content-explorer-for-bricks');
        if (view?.kind === 'post') {
          const current = view;
          current.results.replaceChildren();
          const notice = current.state.lastNotice;
          if (notice) current.notice.replaceChildren();
          await load(current);
          if (view === current && notice && current.state.lastNotice === notice) {
            showSaveNotice(current, notice.message, notice.id);
          }
        }
      } catch (error) {
        editorStatus.textContent = error.message || __('Could not save editor settings.', 'content-explorer-for-bricks');
        saveEditors.disabled = false;
      } finally {
        for (const select of editorSelects.values()) select.disabled = false;
      }
    });
    editorControls.append(saveEditors, editorStatus);
    editorsForm.append(editorRows, editorControls);
    editorsContent.append(editorsIntro, editorsForm);

    const hierarchyIntro = element('div', 'ceb-hub-sort-manager-intro');
    hierarchyIntro.append(
      element('h2', '', __('Hierarchy indicators', 'content-explorer-for-bricks')),
      element('p', '', __('Style parent and child rows. Choosing a color turns on custom styling. Text needs 4.5:1 contrast; borders and carets need 3:1.', 'content-explorer-for-bricks'))
    );
    hierarchyContent.appendChild(hierarchyIntro);
    const hierarchyToggle = element('label', 'ceb-hub-sort-hierarchy-custom-toggle');
    const hierarchyEnabled = element('input');
    hierarchyEnabled.type = 'checkbox';
    hierarchyEnabled.checked = config.hierarchyStyle.enabled;
    hierarchyToggle.append(hierarchyEnabled, element('span', '', __('Use custom hierarchy styling', 'content-explorer-for-bricks')));
    hierarchyContent.appendChild(hierarchyToggle);
    const hierarchyInputs = {};
    const hierarchyFieldErrors = {};
    const hierarchyColorValues = {};
    const hierarchyPreviews = {};
    for (const [level, name, symbol] of [
      ['parent', __('Parent rows', 'content-explorer-for-bricks'), '⌄'],
      ['child', __('Child rows', 'content-explorer-for-bricks'), '›'],
    ]) {
      const card = element('section', 'ceb-hub-sort-hierarchy-card');
      card.appendChild(element('h3', '', name));
      const fields = element('div', 'ceb-hub-sort-hierarchy-fields');
      for (const [property, label] of [
        ['bg', __('Background', 'content-explorer-for-bricks')],
        ['text', __('Text', 'content-explorer-for-bricks')],
        ['border', __('Left border', 'content-explorer-for-bricks')],
        ['caret', __('Caret', 'content-explorer-for-bricks')],
      ]) {
        const field = element('label', 'ceb-hub-sort-hierarchy-field');
        field.appendChild(element('span', 'ceb-hub-sort-hierarchy-field-label', label));
        const control = element('span', 'ceb-hub-sort-hierarchy-color-control');
        const input = element('input', 'ceb-hub-sort-color-input');
        input.type = 'color';
        input.value = config.hierarchyStyle[`${level}_${property}`];
        const value = element('span', 'ceb-hub-sort-hierarchy-color-value', input.value.toUpperCase());
        const error = element('span', 'ceb-hub-sort-hierarchy-field-error');
        error.id = `ceb-hub-sort-${level}-${property}-error`;
        input.setAttribute('aria-describedby', error.id);
        control.append(input, value);
        field.append(control, error);
        fields.appendChild(field);
        hierarchyInputs[`${level}_${property}`] = input;
        hierarchyFieldErrors[`${level}_${property}`] = error;
        hierarchyColorValues[`${level}_${property}`] = value;
        input.addEventListener('input', () => {
          hierarchyEnabled.checked = true;
          updateHierarchyPreview();
        });
      }
      const preview = element('div', 'ceb-hub-sort-hierarchy-preview');
      preview.append(element('span', 'ceb-hub-sort-hierarchy-preview-caret', symbol), element('span', '', name));
      hierarchyPreviews[level] = preview;
      card.append(fields, preview);
      hierarchyContent.appendChild(card);
    }
    const hierarchyList = element('div', 'ceb-hub-sort-settings-group-list');
    hierarchyList.append(...hierarchyContent.querySelectorAll('.ceb-hub-sort-hierarchy-card'));
    hierarchyContent.appendChild(hierarchyList);
    const widthField = element('label', 'ceb-hub-sort-hierarchy-width');
    widthField.appendChild(element('span', '', __('Left border width', 'content-explorer-for-bricks')));
    const borderWidth = element('select', 'ceb-hub-sort-placement-select');
    for (let width = 1; width <= 6; width++) {
      const option = element('option', '', sprintf(__('%d px', 'content-explorer-for-bricks'), width));
      option.value = String(width);
      borderWidth.appendChild(option);
    }
    borderWidth.value = String(config.hierarchyStyle.border_width);
    borderWidth.addEventListener('change', () => {
      hierarchyEnabled.checked = true;
      updateHierarchyPreview();
    });
    widthField.appendChild(borderWidth);
    hierarchyContent.appendChild(widthField);
    const hierarchyStatus = element('span', 'ceb-hub-sort-setting-status');
    hierarchyStatus.setAttribute('role', 'status');
    const saveHierarchy = button(__('Save hierarchy styling', 'content-explorer-for-bricks'), async () => {
      const invalidFields = updateHierarchyPreview();
      if (hierarchyEnabled.checked && invalidFields.length) {
        hierarchyInputs[invalidFields[0]].focus();
        return;
      }
      saveHierarchy.disabled = true;
      hierarchyStatus.textContent = __('Saving…', 'content-explorer-for-bricks');
      try {
        const data = await saveSettings({ hierarchy_style: hierarchyValues() });
        config.hierarchyStyle = data.hierarchy_style;
        if (view) applyHierarchyStyle(view.root);
        updateHierarchyPreview();
        hierarchyStatus.textContent = __('Saved', 'content-explorer-for-bricks');
      } catch (error) {
        updateHierarchyPreview();
        hierarchyStatus.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
      }
    }, 'ceb-hub-sort-hierarchy-save');
    hierarchyContent.append(hierarchyStatus, saveHierarchy);
    hierarchyEnabled.addEventListener('change', () => {
      if (!hierarchyEnabled.checked) {
        for (const [key, input] of Object.entries(hierarchyInputs)) input.value = config.hierarchyStyle[key];
        borderWidth.value = String(config.hierarchyStyle.border_width);
      }
      updateHierarchyPreview();
    });
    function hierarchyValues() {
      const values = { enabled: hierarchyEnabled.checked, border_width: Number(borderWidth.value) };
      for (const [key, input] of Object.entries(hierarchyInputs)) values[key] = input.value;
      return values;
    }
    function updateHierarchyPreview() {
      const values = hierarchyValues();
      const invalidFields = [];
      for (const level of ['parent', 'child']) {
        const preview = hierarchyPreviews[level];
        preview.style.backgroundColor = values[`${level}_bg`];
        preview.style.color = values[`${level}_text`];
        preview.style.borderLeft = `${values.border_width}px solid ${values[`${level}_border`]}`;
        preview.firstElementChild.style.color = values[`${level}_caret`];
        for (const [property, minimum] of [['text', 4.5], ['border', 3], ['caret', 3]]) {
          const key = `${level}_${property}`;
          const ratio = contrastRatio(values[`${level}_bg`], values[key]);
          const invalid = ratio < minimum;
          const input = hierarchyInputs[key];
          input.setAttribute('aria-invalid', String(invalid));
          hierarchyFieldErrors[key].textContent = invalid
            ? sprintf(__('Contrast %1$s:1; needs %2$s:1', 'content-explorer-for-bricks'), ratio.toFixed(1), minimum.toFixed(1))
            : '';
          if (invalid) invalidFields.push(key);
        }
      }
      for (const [key, input] of Object.entries(hierarchyInputs)) hierarchyColorValues[key].textContent = input.value.toUpperCase();
      const changed = Object.entries(values).some(([key, value]) => value !== config.hierarchyStyle[key]);
      saveHierarchy.disabled = !changed;
      hierarchyStatus.textContent = invalidFields.length
        ? __('Adjust the colors marked above before saving.', 'content-explorer-for-bricks')
        : changed ? __('Ready to save.', 'content-explorer-for-bricks') : __('No unsaved changes.', 'content-explorer-for-bricks');
      return invalidFields;
    }
    updateHierarchyPreview();

    const transferIntro = element('div', 'ceb-hub-sort-manager-intro');
    transferIntro.append(element('h2', '', __('Settings transfer', 'content-explorer-for-bricks')),
      element('p', '', __('Copy your Content Explorer for Bricks settings to another site, or keep a backup.', 'content-explorer-for-bricks')));
    const exportCard = element('section', 'ceb-hub-sort-transfer-card');
    const exportNotice = element('p', 'ceb-hub-sort-setting-status');
    exportNotice.setAttribute('role', 'status');
    const exportButton = button(__('Export settings', 'content-explorer-for-bricks'), async () => {
      exportButton.disabled = true;
      exportNotice.textContent = __('Preparing download…', 'content-explorer-for-bricks');
      try {
        const response = await fetch(config.transferEndpoint, { credentials: 'same-origin', headers: { 'X-WP-Nonce': config.nonce } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || __('Could not export settings.', 'content-explorer-for-bricks'));
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = element('a');
        link.href = url;
        link.download = 'content-explorer-for-bricks-settings.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        exportNotice.textContent = __('Settings file downloaded.', 'content-explorer-for-bricks');
      } catch (error) {
        exportNotice.textContent = error.message || __('Could not export settings.', 'content-explorer-for-bricks');
      } finally { exportButton.disabled = false; }
    });
    exportCard.append(element('h3', '', __('Export', 'content-explorer-for-bricks')),
      element('p', '', __('Download all saved settings, including editor preferences, button appearance, hierarchy styling, and status colors.', 'content-explorer-for-bricks')), exportButton, exportNotice);
    const importCard = element('section', 'ceb-hub-sort-transfer-card');
    const fileLabel = element('label', '', __('Settings file', 'content-explorer-for-bricks'));
    const fileInput = element('input', 'ceb-hub-sort-edit-input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.id = 'ceb-hub-sort-import-file';
    fileLabel.htmlFor = fileInput.id;
    const importNotice = element('p', 'ceb-hub-sort-setting-status');
    importNotice.setAttribute('role', 'status');
    const confirmLabel = element('label', 'ceb-hub-sort-transfer-confirm');
    const confirmImport = element('input');
    confirmImport.type = 'checkbox';
    confirmLabel.append(confirmImport, element('span', '', __('Replace this site’s plugin settings with the selected file.', 'content-explorer-for-bricks')));
    let importDocument = null;
    let fileGeneration = 0;
    const reloadButton = button(__('Reload builder', 'content-explorer-for-bricks'), () => window.location.reload());
    reloadButton.hidden = true;
    const importButton = button(__('Import settings', 'content-explorer-for-bricks'), async () => {
      if (!importDocument || !confirmImport.checked) return;
      importButton.disabled = true;
      fileInput.disabled = true;
      confirmImport.disabled = true;
      importNotice.textContent = __('Validating and importing…', 'content-explorer-for-bricks');
      try {
        const response = await fetch(config.transferEndpoint, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
          body: JSON.stringify({ document: importDocument }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || __('Could not import settings.', 'content-explorer-for-bricks'));
        importNotice.textContent = __('Settings imported. Save any unfinished page edits, then reload the builder to use the new settings.', 'content-explorer-for-bricks');
        reloadButton.hidden = false;
        for (const tab of [generalTab, editorsTab, hierarchyTab, buttonsTab, statusesTab]) tab.disabled = true;
      } catch (error) {
        importNotice.textContent = error.message || __('Could not import settings.', 'content-explorer-for-bricks');
        fileInput.disabled = false;
        confirmImport.disabled = false;
        importButton.disabled = false;
      }
    });
    importButton.disabled = true;
    confirmImport.addEventListener('change', () => { importButton.disabled = !importDocument || !confirmImport.checked; });
    fileInput.addEventListener('change', async () => {
      const generation = ++fileGeneration;
      importDocument = null;
      confirmImport.checked = false;
      importButton.disabled = true;
      importNotice.textContent = '';
      const file = fileInput.files[0];
      if (!file) return;
      try {
        if (file.size > 262144) throw new Error(__('Settings files must be smaller than 256 KB.', 'content-explorer-for-bricks'));
        const data = JSON.parse(await file.text());
        if (generation !== fileGeneration) return;
        if (data?.plugin !== 'content-explorer-for-bricks' || data.format_version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
          throw new Error(__('Choose a valid Content Explorer for Bricks settings export.', 'content-explorer-for-bricks'));
        }
        importDocument = data;
        importNotice.textContent = sprintf(__('Ready to import %s. All settings will be validated before changes are made.', 'content-explorer-for-bricks'), file.name);
      } catch (error) {
        if (generation === fileGeneration) importNotice.textContent = error instanceof SyntaxError ? __('This file is not valid JSON.', 'content-explorer-for-bricks') : error.message;
      }
    });
    importCard.append(element('h3', '', __('Import', 'content-explorer-for-bricks')),
      element('p', '', __('Choose a settings export from this plugin. Import replaces all plugin settings on this site. Export a backup first if you want to keep the current setup.', 'content-explorer-for-bricks')),
      fileLabel, fileInput, confirmLabel, importButton, importNotice, reloadButton);
    transferContent.append(transferIntro, exportCard, importCard);

    const buttonGroups = [
      ['new', __('New item', 'content-explorer-for-bricks')],
      ['view', __('Bricks table / Browse all', 'content-explorer-for-bricks')],
      ['settings', __('Hub settings', 'content-explorer-for-bricks')],
      ['hierarchy', __('Hierarchy', 'content-explorer-for-bricks')],
      ['bulk', __('Open all / Close all', 'content-explorer-for-bricks')],
      ['expand', __('Expand / Collapse row', 'content-explorer-for-bricks')],
      ['load_more', __('Load more children', 'content-explorer-for-bricks')],
      ['quick_edit', __('Quick edit', 'content-explorer-for-bricks')],
      ['open', __('Open in Builder', 'content-explorer-for-bricks')],
      ['wordpress', __('Edit in WordPress', 'content-explorer-for-bricks')],
      ['trash', __('Trash', 'content-explorer-for-bricks')],
      ['pagination', __('Previous / Next', 'content-explorer-for-bricks')],
      ['notice', __('Saved item actions', 'content-explorer-for-bricks')],
    ];
    const buttonHeading = element('div', 'ceb-hub-sort-manager-intro');
    buttonHeading.append(
      element('h2', '', __('Button appearance', 'content-explorer-for-bricks')),
      element('p', '', __('Open a button to change its label or colors. Bricks colors stay in place unless you enable custom colors.', 'content-explorer-for-bricks'))
    );
    buttonContent.appendChild(buttonHeading);
    const buttonList = element('div', 'ceb-hub-sort-settings-group-list');
    buttonContent.appendChild(buttonList);
    const makeColorInput = (label, value) => {
      const field = element('label', 'ceb-hub-sort-button-color-field');
      field.appendChild(element('span', '', label));
      const input = element('input', 'ceb-hub-sort-color-input');
      input.type = 'color';
      input.value = value;
      field.appendChild(input);
      return { field, input };
    };
    const statusIntro = element('div', 'ceb-hub-sort-manager-intro');
    statusIntro.append(
      element('h2', '', __('Status colors', 'content-explorer-for-bricks')),
      element('p', '', __('Set the background and text colors used by status badges and the status picker. Third-party statuses share one color pair.', 'content-explorer-for-bricks'))
    );
    const statusList = element('div', 'ceb-hub-sort-settings-group-list');
    statusContent.append(statusIntro, statusList);
    for (const [group, label] of [
      ['publish', __('Published', 'content-explorer-for-bricks')],
      ['draft', __('Draft', 'content-explorer-for-bricks')],
      ['future', __('Scheduled', 'content-explorer-for-bricks')],
      ['pending', __('Pending Review', 'content-explorer-for-bricks')],
      ['private', __('Private', 'content-explorer-for-bricks')],
      ['custom', __('Third-party statuses', 'content-explorer-for-bricks')],
    ]) {
      const card = element('details', 'ceb-hub-sort-button-card');
      const summary = element('summary', 'ceb-hub-sort-button-card-summary');
      summary.appendChild(element('span', 'ceb-hub-sort-button-card-title', label));
      const preview = element('span', 'ceb-hub-sort-status', group === 'custom' ? __('Custom status', 'content-explorer-for-bricks') : label);
      summary.appendChild(preview);
      const editor = element('div', 'ceb-hub-sort-button-card-editor');
      const colors = element('div', 'ceb-hub-sort-button-card-colors');
      const bg = makeColorInput(__('Background', 'content-explorer-for-bricks'), config.statusStyles[group].background);
      const fg = makeColorInput(__('Text', 'content-explorer-for-bricks'), config.statusStyles[group].text);
      bg.input.setAttribute('aria-label', sprintf(__('%s background', 'content-explorer-for-bricks'), label));
      fg.input.setAttribute('aria-label', sprintf(__('%s text', 'content-explorer-for-bricks'), label));
      const bgHex = element('code', 'ceb-hub-sort-color-code');
      const fgHex = element('code', 'ceb-hub-sort-color-code');
      bg.field.appendChild(bgHex);
      fg.field.appendChild(fgHex);
      colors.append(bg.field, fg.field);
      const notice = element('span', 'ceb-hub-sort-setting-status');
      notice.setAttribute('role', 'status');
      const save = button(__('Save', 'content-explorer-for-bricks'), async () => {
        save.disabled = true;
        notice.textContent = __('Saving…', 'content-explorer-for-bricks');
        try {
          const result = await saveSettings({ status_style: { group, background: bg.input.value, text: fg.input.value } });
          config.statusStyles = result.status_styles;
          applyStatusColors();
          updateStatusPreview();
          notice.textContent = __('Saved', 'content-explorer-for-bricks');
        } catch (error) {
          updateStatusPreview();
          notice.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
        }
      }, 'ceb-hub-sort-button-save');
      const reset = button(__('Use default colors', 'content-explorer-for-bricks'), () => {
        bg.input.value = config.statusDefaults[group].background;
        fg.input.value = config.statusDefaults[group].text;
        updateStatusPreview();
      });
      const updateStatusPreview = () => {
        const ratio = contrastRatio(bg.input.value, fg.input.value);
        const changed = bg.input.value !== config.statusStyles[group].background || fg.input.value !== config.statusStyles[group].text;
        preview.style.backgroundColor = bg.input.value;
        preview.style.color = fg.input.value;
        bgHex.textContent = bg.input.value.toUpperCase();
        fgHex.textContent = fg.input.value.toUpperCase();
        bg.input.setAttribute('aria-invalid', String(ratio < 4.5));
        fg.input.setAttribute('aria-invalid', String(ratio < 4.5));
        save.disabled = !changed || ratio < 4.5;
        notice.textContent = ratio < 4.5
          ? sprintf(__('Contrast %s:1 is too low. Choose at least 4.5:1.', 'content-explorer-for-bricks'), ratio.toFixed(2))
          : changed ? __('Unsaved changes', 'content-explorer-for-bricks') : '';
      };
      for (const input of [bg.input, fg.input]) input.addEventListener('input', updateStatusPreview);
      const actions = element('div', 'ceb-hub-sort-button-card-actions');
      actions.append(notice, reset, save);
      editor.append(colors, actions);
      card.append(summary, editor);
      statusList.appendChild(card);
      updateStatusPreview();
    }
    for (const [group, label] of buttonGroups) {
      const saved = config.buttonStyles[group];
      const card = element('details', 'ceb-hub-sort-button-card');
      const summary = element('summary', 'ceb-hub-sort-button-card-summary');
      const summaryCopy = element('span', 'ceb-hub-sort-button-card-summary-copy');
      const title = element('span', 'ceb-hub-sort-button-card-title', label);
      const choice = element('span', 'ceb-hub-sort-button-card-choice');
      summaryCopy.append(title, choice);
      const controls = element('div', 'ceb-hub-sort-button-card-controls');
      const displayField = element('label', 'ceb-hub-sort-button-display-field');
      displayField.appendChild(element('span', '', __('Label style', 'content-explorer-for-bricks')));
      const display = element('select', 'ceb-hub-sort-placement-select');
      display.setAttribute('aria-label', sprintf(__('%s label style', 'content-explorer-for-bricks'), label));
      for (const [value, text] of [
        ['icon', __('Icon only', 'content-explorer-for-bricks')],
        ['both', __('Icon + text', 'content-explorer-for-bricks')],
        ['text', __('Text only', 'content-explorer-for-bricks')],
      ]) {
        const option = element('option', '', text);
        option.value = value;
        display.appendChild(option);
      }
      display.value = saved.display;
      displayField.appendChild(display);
      const bg = makeColorInput(__('Background', 'content-explorer-for-bricks'), saved.background);
      const fg = makeColorInput(__('Text / icon', 'content-explorer-for-bricks'), saved.text);
      const customField = element('label', 'ceb-hub-sort-button-custom-field');
      const custom = element('input');
      custom.type = 'checkbox';
      custom.checked = saved.custom_colors;
      customField.append(custom, element('span', '', __('Use custom colors', 'content-explorer-for-bricks')));
      const preview = element('span', 'ceb-hub-sort-button ceb-hub-sort-themed ceb-hub-sort-button-preview');
      preview.dataset.buttonGroup = group;
      preview.setAttribute('aria-hidden', 'true');
      applyButtonStyle(preview);
      preview.appendChild(element('span', 'ceb-hub-sort-button-preview-label', label));
      if (group === 'view') {
        preview.dataset.viewMode = 'ceb';
        appendNativeIcon(preview, '.settings-bar__section.ceb-logo svg');
      }
      summary.append(summaryCopy, preview);
      const editor = element('div', 'ceb-hub-sort-button-card-editor');
      const status = element('span', 'ceb-hub-sort-setting-status');
      status.setAttribute('role', 'status');
      const save = button(__('Save', 'content-explorer-for-bricks'), async () => {
        save.disabled = true;
        status.textContent = __('Saving…', 'content-explorer-for-bricks');
        try {
          const result = await saveSettings({ button_style: { group, background: bg.input.value, text: fg.input.value, display: display.value, custom_colors: custom.checked } });
          config.buttonStyles = result.button_styles;
          repaintButtons();
          updatePreview();
          status.textContent = __('Saved', 'content-explorer-for-bricks');
        } catch (error) {
          updatePreview();
          status.textContent = error.message || __('Could not save setting.', 'content-explorer-for-bricks');
        }
      }, 'ceb-hub-sort-button-save');
      const updatePreview = () => {
        const ratio = contrastRatio(bg.input.value, fg.input.value);
        const changed = bg.input.value !== config.buttonStyles[group].background || fg.input.value !== config.buttonStyles[group].text || display.value !== config.buttonStyles[group].display || custom.checked !== config.buttonStyles[group].custom_colors;
        preview.dataset.display = display.value;
        preview.dataset.customColors = String(custom.checked);
        bg.input.disabled = !custom.checked;
        fg.input.disabled = !custom.checked;
        colors.hidden = !custom.checked;
        preview.style.setProperty('--ceb-button-bg', bg.input.value);
        preview.style.setProperty('--ceb-button-text', fg.input.value);
        choice.textContent = `${display.options[display.selectedIndex].textContent} · ${custom.checked ? __('Custom colors', 'content-explorer-for-bricks') : __('Bricks colors', 'content-explorer-for-bricks')}${changed ? ` · ${__('Unsaved', 'content-explorer-for-bricks')}` : ''}`;
        save.disabled = (custom.checked && ratio < 4.5) || !changed;
        status.textContent = custom.checked && ratio < 4.5
          ? sprintf(__('Contrast %s:1 is too low. Choose at least 4.5:1.', 'content-explorer-for-bricks'), ratio.toFixed(2))
          : changed ? __('Unsaved changes', 'content-explorer-for-bricks') : '';
      };
      for (const input of [display, custom, bg.input, fg.input]) input.addEventListener('input', updatePreview);
      const colors = element('div', 'ceb-hub-sort-button-card-colors');
      colors.append(bg.field, fg.field);
      const actions = element('div', 'ceb-hub-sort-button-card-actions');
      actions.append(status, save);
      controls.append(displayField, customField);
      editor.append(controls, colors, actions);
      card.append(summary, editor);
      buttonList.appendChild(card);
      updatePreview();
    }
  }

  function start() {
    mountSettingsPanel();
    if (!config.builderContext) openDefaultPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
