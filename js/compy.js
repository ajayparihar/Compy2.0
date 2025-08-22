/**
 * Compy 2.0 - Enhanced vanilla JS implementation
 * Single-file variant optimized for portability without modules.
 * Manages state via localStorage and renders UI directly.
 */
(function(){
  'use strict';
  
  // Utility functions
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  
  // Application constants
  const STORAGE_KEYS = {
    items: 'compy.items',
    theme: 'compy.theme',
    profile: 'compy.profile',
    backups: 'compy.backups',
    filters: 'compy.filters',
  };
  
  const UI_CONFIG = {
    maxVisibleTags: 5,
    maxBackups: 10,
    backupInterval: 60 * 60 * 1000, // 1 hour
    backupDelay: 200, // ms
    snackbarDuration: 1500, // ms
    maxTextLength: 500,
    maxDescLength: 500,
    maxNameLength: 80,
    skeletonCount: 6,
  };
  
  const DEFAULT_THEME = 'dark-mystic-forest';

  let state = {
    items: [], // {id, text, desc, sensitive, tags:[]}
    filterTags: [],
    search: '',
    editingId: null,
    profileName: '',
  };

  // Utilities
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
      localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
      if (state.profileName) localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
      scheduleBackup();
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      showSnackbar('Failed to save data. Storage may be full.');
    }
  };
  const loadState = () => {
    try { state.items = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]'); } catch { state.items = []; }
    try { state.filterTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.filters) || '[]'); } catch { state.filterTags = []; }
    state.profileName = localStorage.getItem(STORAGE_KEYS.profile) || '';
  };

  const showSnackbar = (msg) => {
    const s = $('#snackbar');
    s.textContent = msg; s.classList.add('show');
    setTimeout(()=>s.classList.remove('show'), 1500);
  };

  const copyToClipboard = async (txt) => {
    try { 
      await navigator.clipboard.writeText(txt); 
      showSnackbar('Copied'); 
    }
    catch (error) { 
      console.warn('Clipboard API failed, using fallback:', error);
      // fallback for older browsers or permission issues
      try {
        const ta = document.createElement('textarea'); 
        ta.value = txt; 
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta); 
        ta.select(); 
        const success = document.execCommand('copy'); 
        document.body.removeChild(ta); 
        if (success) {
          showSnackbar('Copied');
        } else {
          showSnackbar('Copy failed - please try manually');
        }
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        showSnackbar('Copy not supported - please copy manually');
      }
    }
  };

  // Themes
  const applyTheme = (val) => { document.documentElement.setAttribute('data-theme', val); localStorage.setItem(STORAGE_KEYS.theme, val); $('#themeSelect').value = val; };
  const loadTheme = () => { const t = localStorage.getItem(STORAGE_KEYS.theme); if (t) applyTheme(t); };

  // Simple inline SVG icons (crisp, theme-aware)
  const ICONS = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 21h4l11.5-11.5a2.121 2.121 0 0 0-3-3L4 18v3z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M14 6l4 4"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18"/><path fill="none" stroke="currentColor" stroke-width="2" d="M8 6V4h8v2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path fill="none" stroke="currentColor" stroke-width="2" d="M10 11v6M14 11v6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="4" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  // Rendering
  /**
   * Render the list of cards based on current state, showing skeletons and empty states.
   * Uses requestAnimationFrame to batch DOM updates for smoothness.
   */
  const renderCards = () => {
    const container = $('#cards');
    
    // Show skeleton loading briefly to indicate processing
    if (state.items.length > 0) {
      showSkeletonCards();
    }
    
    // Use requestAnimationFrame to ensure smooth rendering
    requestAnimationFrame(() => {
      const items = filteredAndSearchedItems();
      container.innerHTML = '';

    // Home/Getting Started when there is no data at all
    if (state.items.length === 0) {
      container.classList.add('empty-state');
      container.innerHTML = emptyStateHtmlPro();
      $('#emptyAddBtn')?.addEventListener('click', ()=> openItemModal(null));
      $('#emptyImportBtn')?.addEventListener('click', ()=> $('#importFile').click());
      return;
    } else {
      container.classList.remove('empty-state');
    }

    // If filtered result is empty (due to search/filter), show a helpful empty state
    if (!items.length) {
      container.classList.add('empty-state');
      container.innerHTML = noResultsHtml();
      $('#clearSearchBtn')?.addEventListener('click', ()=>{ $('#searchInput').value=''; state.search=''; renderCards(); });
      $('#clearFiltersBtn')?.addEventListener('click', ()=>{ state.filterTags=[]; localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags)); renderFilterBadge(); renderCards(); });
      return;
    }

      for (const it of items) container.appendChild(renderCard(it));
    });
  };
  
  // Skeleton loading for better perceived performance
  /**
   * Render a set of lightweight skeleton cards to improve perceived performance.
   */
  const showSkeletonCards = () => {
    const container = $('#cards');
    const skeletonCount = Math.min(6, state.items.length);
    container.innerHTML = '';
    
    for (let i = 0; i < skeletonCount; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skel-card skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      container.appendChild(skeleton);
    }
  };

  // Empty state (Getting Started)
  const emptyStateHtml = () => `
    <section class=\"empty\">
      <h2>Welcome to Compy</h2>
      <p>Store commands, snippets, credentials, and frequently used text. Click a card to copy it.</p>
      <div class=\"empty-actions\">
        <button id=\"emptyAddBtn\" class=\"primary-btn\">Add your first item</button>
        <button id=\"emptyImportBtn\" class=\"secondary-btn\">Import from JSON/CSV</button>
      </div>
      <ul class=\"empty-tips\">
        <li>Use Ctrl+F or / to quickly search</li>
        <li>Tag items and filter by tags</li>
        <li>Choose a theme you like</li>
      </ul>
    </section>
  `;
  // Professional empty state variant (not used yet)
  const emptyStateHtmlPro = () => `
    <section class="empty">
      <div class="empty-card">
        <div class="hero-icon">📋</div>
        <h1>Welcome to Compy</h1>
        <p class="lead">Your personal clipboard for commands, snippets, credentials, and frequently used text.</p>
        <div class="empty-actions">
          <button id="emptyAddBtn" class="primary-btn">Add your first item</button>
          <button id="emptyImportBtn" class="secondary-btn">Import JSON/CSV</button>
        </div>
        <div class="divider"></div>
        <ul class="empty-tips">
          <li><strong>Search fast</strong> with Ctrl+F or /</li>
          <li><strong>Organize</strong> with tags and filters</li>
          <li><strong>Personalize</strong> with themes and your profile name</li>
        </ul>
      </div>
    </section>
  `;

  // No results state for search/filter
  /**
   * Generate the 'no results' empty state HTML based on current search/filter flags.
   */
  const noResultsHtml = () => {
    const hasSearch = !!state.search?.trim();
    const hasFilters = state.filterTags.length > 0;
    let details = '';
    if (hasSearch && hasFilters) details = `No items match your search and selected filters.`;
    else if (hasSearch) details = `No items match your search.`;
    else if (hasFilters) details = `No items match the selected filters.`;
    return `
      <section class="empty">
        <div class="empty-card">
          <div class="hero-icon">🔎</div>
          <h2>No results</h2>
          <p class="lead">${details}</p>
          <div class="empty-actions">
            ${hasSearch ? '<button id="clearSearchBtn" class="secondary-btn">Clear search</button>' : ''}
            ${hasFilters ? '<button id="clearFiltersBtn" class="secondary-btn">Clear filters</button>' : ''}
          </div>
        </div>
      </section>`;
  };


  /**
   * Highlight occurrences of query in text using <mark> tags.
   * Escapes the query to avoid regex injection.
   */
  const highlight = (text, query) => {
    if (!query) return text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(q, 'gi'), (m)=>`<mark>${m}</mark>`);
  };

  /**
   * Build a card element for an item with actions and accessibility bindings.
   */
  const renderCard = (it) => {
    const card = document.createElement('article'); card.className = 'card'; card.tabIndex = 0;
    card.innerHTML = `
      <div class="actions" aria-label="Card actions">
        <button class="icon-btn" data-act="edit" title="Edit" aria-label="Edit">${ICONS.edit}</button>
        <button class="icon-btn" data-act="delete" title="Delete" aria-label="Delete">${ICONS.delete}</button>
        <button class="icon-btn" data-act="copy" title="Copy" aria-label="Copy">${ICONS.copy}</button>
      </div>
      <div class="title">${highlight(it.sensitive ? '**********' : escapeHtml(it.text), state.search)}</div>
      <div class=\"desc\">${highlight(escapeHtml(it.desc), state.search)}</div>
      <div class=\"tags\">${tagsHtml(it.tags)}</div>
    `;
    card.addEventListener('click', (e)=>{
      if (e.target.closest('.actions')) return; // actions handled separately
      copyToClipboard(it.text);
    });
    card.addEventListener('keydown', (e)=>{ if (e.key==='Enter') copyToClipboard(it.text); });
    card.querySelector('[data-act="edit"]').addEventListener('click', ()=>openItemModal(it.id));
    card.querySelector('[data-act="delete"]').addEventListener('click', ()=>deleteItem(it.id));
    card.querySelector('[data-act="copy"]').addEventListener('click', ()=>copyToClipboard(it.text));
    return card;
  };

  /**
   * Build HTML for a limited set of tag chips with a '+N more' affordance.
   */
  const tagsHtml = (tags=[]) => {
    const visible = tags.slice(0,5);
    const more = tags.length - visible.length;
    let html = visible.map(t=>`<span class=\"chip\">${escapeHtml(t)}</span>`).join('');
    if (more>0) html += `<span class=\"more\" data-more-tags title=\"Show more\">+${more} more</span>`;
    return html;
  };

  /**
   * Compute items that match the current filterTags and search query.
   */
  const filteredAndSearchedItems = () => {
    let items = state.items.slice();
    if (state.filterTags.length) items = items.filter(it=> state.filterTags.every(t=> it.tags.includes(t)) );
    if (state.search) {
      const q = state.search.toLowerCase();
      items = items.filter(it => it.text.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q) || it.tags.some(t=>t.toLowerCase().includes(q)) );
    }
    return items;
  };

  // Item CRUD
  /**
   * Insert a new item at the top or update the currently edited item.
   */
  const upsertItem = (payload) => {
    if (state.editingId) {
      const idx = state.items.findIndex(i=>i.id===state.editingId); if (idx>-1) state.items[idx] = { ...state.items[idx], ...payload };
    } else {
      state.items.unshift({ id: uid(), ...payload });
    }
    saveState(); renderCards();
  };
  /**
   * Remove an item by id and persist the change.
   */
  const deleteItem = (id) => {
    state.items = state.items.filter(i=>i.id!==id); saveState(); renderCards(); showSnackbar('Deleted');
  };

  // Modals
  /**
   * Open a modal element and focus its close control; also ensures drawer/menus are closed.
   */
  const openModal = (el) => {
    // ensure any transient UI is closed and drawer is hidden
    try { if (isMobile() && navToggle?.getAttribute('aria-expanded') === 'true') closeNav(); } catch {}
    try { closeExportMenu(); } catch {}
    el.setAttribute('aria-hidden','false');
    el.querySelector('[data-close-modal]')?.focus();
  };
  /** Close a modal element. */
  const closeModal = (el) => { el.setAttribute('aria-hidden','true'); };
  $$('#itemModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#itemModal'))));
  $$('#filterModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#filterModal'))));
  $$('#moreTagsModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#moreTagsModal'))));
  $$('#aboutModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#aboutModal'))));
  $$('#backupsModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#backupsModal'))));
  $$('#profileModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#profileModal'))));

  // Add/Edit modal logic
  /**
   * Open the item modal for creating or editing items.
   */
  const openItemModal = (id=null) => {
    state.editingId = id;
    $('#itemModalTitle').textContent = id ? 'Edit Item' : 'Add Item';
    const it = id ? state.items.find(i=>i.id===id) : {text:'',desc:'',sensitive:false,tags:[]};
    $('#itemText').value = it.text || '';
    $('#itemDesc').value = it.desc || '';
    $('#itemSensitive').checked = !!it.sensitive;
    setTagChips(it.tags || []);
    openModal($('#itemModal'));
    $('#itemText').focus();
  };

  /** Collect tag values from the edit form chips. */
  const getTagsFromChips = () => $$('#tagChips .chip').map(c=>c.dataset.val);
  /** Replace the tag chip list with the provided tags. */
  const setTagChips = (tags) => {
    const wrap = $('#tagChips'); wrap.innerHTML = '';
    tags.forEach(addTagChip);
  };
  /** Append a tag chip if the normalized value is non-empty. */
  const addTagChip = (tag) => {
    if (!tag) return;
    const norm = tag.trim(); if (!norm) return;
    const chip = document.createElement('span'); chip.className = 'chip'; chip.dataset.val = norm;
    chip.style.setProperty('--h', String(Math.abs(hash(norm)) % 360));
    chip.setAttribute('data-color','1');
    chip.innerHTML = `${escapeHtml(norm)} <span class="x" title="remove">×</span>`;
    chip.querySelector('.x').addEventListener('click', ()=>{ chip.remove(); });
    $('#tagChips').appendChild(chip);
  };

  $('#tagEntry').addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && e.currentTarget.value.trim()) { addTagChip(e.currentTarget.value); e.currentTarget.value=''; }
    else if (e.key==='Backspace' && !e.currentTarget.value) { const chips = $$('#tagChips .chip'); chips.at(-1)?.remove(); }
  });

  // Save item
  $('#saveItemBtn').addEventListener('click', ()=>{
    const text = $('#itemText').value.trim();
    const desc = $('#itemDesc').value.trim();
    const sensitive = $('#itemSensitive').checked;
    const tags = getTagsFromChips();
    if (!text || !desc) { showSnackbar('Snippet content and description are required'); return; }
    upsertItem({ text, desc, sensitive, tags });
    closeModal($('#itemModal'));
  });

  // Clear field buttons
  $$('[data-clear]').forEach(btn=> btn.addEventListener('click', ()=>{ const t = $(btn.getAttribute('data-clear')); if (t) { t.value=''; t.focus(); } }));

  // Search
  const focusSearch = () => $('#searchInput').focus();
  $('#searchClear').addEventListener('click', ()=>{ $('#searchInput').value=''; state.search=''; renderCards(); });
  $('#searchInput').addEventListener('input', (e)=>{ state.search = e.target.value; renderCards(); });
  document.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey && e.key.toLowerCase()==='f') || e.key==='/') { e.preventDefault(); focusSearch(); }
  });

  // Filter
  /** Open the filter modal, reset tag search, and close the drawer on mobile. */
  const openFilter = () => {
    renderFilterList();
    $('#filterTagSearch').value='';
    // Close the drawer before opening overlay on mobile to avoid stacking issues
    if (isMobile() && navToggle.getAttribute('aria-expanded') === 'true') closeNav();
    openModal($('#filterModal'));
  };
  /** Render the checkbox list of unique tags, filtered by the query field. */
  const renderFilterList = () => {
    const list = $('#filterTagList'); list.innerHTML = '';
    const allTags = Array.from(new Set(state.items.flatMap(i=>i.tags))).sort();
    const q = $('#filterTagSearch').value.toLowerCase();
    for (const t of allTags) {
      if (q && !t.toLowerCase().includes(q)) continue;
      const id = `tag-${t}`;
      const row = document.createElement('label'); row.className = 'list-row'; row.htmlFor = id;
      row.innerHTML = `<input id="${id}" type="checkbox" ${state.filterTags.includes(t)?'checked':''}/> ${escapeHtml(t)}`;
      list.appendChild(row);
    }
    if (!list.children.length) {
      const msg = document.createElement('div');
      msg.className = 'empty-note';
      const qRaw = $('#filterTagSearch').value.trim();
      msg.innerHTML = allTags.length ? `No tags match "${escapeHtml(qRaw)}".` : 'No tags yet. Add tags to items to filter by them.';
      list.appendChild(msg);
    }
  };
  $('#filterBtn').addEventListener('click', openFilter);
  $('#filterTagSearch').addEventListener('input', renderFilterList);
  $('#applyFilterBtn').addEventListener('click', ()=>{
    state.filterTags = $$(`#filterTagList input:checked`).map(i=>i.id.replace(/^tag-/,''));
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
    renderFilterBadge();
    renderCards();
    closeModal($('#filterModal'));
  });
  // Clear filters: uncheck all, reset filterTags and search inside modal
  $('#clearFilterBtn').addEventListener('click', ()=>{
    state.filterTags = [];
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
    $$('#filterTagList input[type="checkbox"]').forEach(i=> i.checked = false);
    $('#filterTagSearch').value = '';
    renderFilterList();
    renderFilterBadge();
    renderCards();
    closeModal($('#filterModal'));
  });

  // More tags
  document.addEventListener('click', (e)=>{
    const more = e.target.closest('[data-more-tags]');
    if (more) {
      const card = more.closest('.card');
      const idx = Array.from($('#cards').children).indexOf(card);
      const it = filteredAndSearchedItems()[idx];
      const list = $('#allTagsList'); list.innerHTML = '';
      it.tags.forEach(t=>{ const ch=document.createElement('span'); ch.className='chip'; ch.textContent=t; list.appendChild(ch); });
      openModal($('#moreTagsModal'));
    }
  });

  // Menu: Export (floating, does not affect navbar height)
  const exportBtn = $('#exportMenuBtn');
  const exportMenu = $('#exportMenu');
  const exportHost = exportMenu.parentElement; // .menu

  function positionExportMenu() {
    const r = exportBtn.getBoundingClientRect();
    exportMenu.style.position = 'fixed';
    exportMenu.style.left = `${Math.round(r.left)}px`;
    exportMenu.style.top = `${Math.round(r.bottom + 6)}px`;
    exportMenu.style.right = 'auto';
  }
  function openExportMenu() {
    const inDrawer = isMobile() && navActions.getAttribute('aria-hidden') === 'false';
    if (!exportMenu.classList.contains('open')) {
      if (inDrawer) {
        // Keep menu within drawer on mobile so it overlays correctly
        exportHost.appendChild(exportMenu);
        exportMenu.classList.add('open');
        exportMenu.classList.remove('floating');
        exportMenu.style.position = 'absolute';
        exportMenu.style.right = '0';
        exportMenu.style.top = 'calc(100% + 6px)';
      } else {
        document.body.appendChild(exportMenu);
        positionExportMenu();
        exportMenu.classList.add('open', 'floating');
        window.addEventListener('resize', closeExportMenu, { once: true });
        window.addEventListener('scroll', closeExportMenu, { once: true });
      }
    }
  }
  function closeExportMenu() {
    exportMenu.classList.remove('open', 'floating');
    exportMenu.style.cssText = '';
    exportHost.appendChild(exportMenu);
  }
  exportBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    if (exportMenu.classList.contains('open')) closeExportMenu(); else openExportMenu();
  });
  document.addEventListener('click', (e)=>{ if (!e.target.closest('#exportMenu')) closeExportMenu(); });
  exportMenu.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    closeExportMenu();
    if (btn.dataset.export==='json') exportJSON();
    else if (btn.dataset.export==='csv') exportCSV();
    else if (btn.id==='backupsBtn') openBackups();
  });

  // Import
  // Close drawer before invoking file picker on mobile
  document.querySelector('.file-btn')?.addEventListener('click', ()=>{ if (isMobile() && navToggle.getAttribute('aria-expanded') === 'true') closeNav(); });
  $('#importFile').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.json')) importJSON(text);
    else if (file.name.endsWith('.csv')) importCSV(text);
    e.target.value = '';
  });

  // Backups
  let backupTimer = null;
  /** Debounce backup creation to avoid excessive writes. */
  const scheduleBackup = () => {
    if (backupTimer) clearTimeout(backupTimer);
    backupTimer = setTimeout(doBackup, 200);
  };
  /** Create and persist a new backup snapshot in localStorage. */
  const doBackup = () => {
    const now = new Date();
    const backup = { ts: now.toISOString(), items: state.items };
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]'); } catch {}
    arr.unshift(backup);
    arr = arr.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.backups, JSON.stringify(arr));
  };
  /** Populate and open the backups modal. */
  const openBackups = () => {
    if (isMobile() && navToggle.getAttribute('aria-expanded') === 'true') closeNav();
    const list = $('#backupsList'); list.innerHTML = '';
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]'); } catch {}
    arr.forEach((b, i)=>{
      const btn = document.createElement('button');
      btn.textContent = `${new Date(b.ts).toLocaleString()} (${b.items.length} items)`;
      btn.addEventListener('click', ()=> download('compy-backup-'+b.ts.replace(/[:.]/g,'-')+'.json', JSON.stringify(b.items, null, 2)));
      list.appendChild(btn);
    });
    openModal($('#backupsModal'));
  };

  // Export/Import helpers
  /** Trigger a download via a temporary object URL. */
  const download = (filename, text) => {
    const blob = new Blob([text], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  };
  /** Export current data to a JSON file. */
  const exportJSON = () => {
    const payload = { profileName: state.profileName || '', items: state.items };
    download('compy-export.json', JSON.stringify(payload, null, 2));
  };
  /** Export current data to a CSV file with a profile metadata section. */
  const exportCSV = () => {
    const header = ['profileName'];
    const meta = [[csvEscape(state.profileName || '')]];
    const rows = [['text','desc','sensitive','tags']].concat(state.items.map(i=>[
      csvEscape(i.text), csvEscape(i.desc), i.sensitive?'1':'0', csvEscape(i.tags.join('|'))
    ]));
    const csv = [header.join(','), ...meta.map(r=>r.join(',')), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compy-export.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  /** Import items from JSON (supports legacy array and new object format). */
  const importJSON = (json) => {
    try {
      const parsed = JSON.parse(json);
      let itemsArr;
      if (Array.isArray(parsed)) {
        // Backward compatibility: old exports were an array of items
        itemsArr = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        // New format with profile
        itemsArr = parsed.items;
        if (typeof parsed.profileName === 'string') {
          state.profileName = parsed.profileName.trim();
          localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
          renderProfile();
        }
      } else {
        throw new Error('Invalid JSON');
      }
      for (const o of itemsArr) addImportedItem(o);
      saveState(); renderCards(); showSnackbar('Imported JSON');
    } catch { showSnackbar('Invalid JSON'); }
  };
  /** Import items from CSV with optional two-line profile metadata. */
  const importCSV = (csv) => {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) { showSnackbar('Invalid CSV'); return; }
    // Handle BOM and parse header robustly (quotes/case/whitespace)
    const rawHeader = lines.shift().replace(/^\uFEFF/, '');
    let headerCols = parseCSVLine(rawHeader).map(h => String(h || '').trim().toLowerCase());
    // Optional metadata block: single-column "profileName" followed by a value row
    if (headerCols.length === 1 && headerCols[0] === 'profilename') {
      const metaLine = lines.shift();
      if (metaLine != null) {
        const metaCols = parseCSVLine(metaLine);
        state.profileName = String(metaCols[0] || '').trim();
        localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
        renderProfile();
      }
      const itemsHeader = lines.shift();
      if (!itemsHeader) { showSnackbar('Invalid CSV'); return; }
      headerCols = parseCSVLine(itemsHeader).map(h => String(h || '').trim().toLowerCase());
    }
    const idx = (name) => headerCols.indexOf(name);
    const iText = idx('text');
    const iDesc = idx('desc');
    const iSensitive = idx('sensitive');
    const iTags = idx('tags');
    if (iText === -1 || iDesc === -1) { showSnackbar('Invalid CSV'); return; }
    for (const line of lines) {
      const cols = parseCSVLine(line);
      const text = String(cols[iText] || '').trim();
      const desc = String(cols[iDesc] || '').trim();
      const sensRaw = iSensitive !== -1 ? String(cols[iSensitive] || '').trim() : '';
      const tagsRaw = iTags !== -1 ? String(cols[iTags] || '').trim() : '';
      addImportedItem({
        text,
        desc,
        sensitive: sensRaw === '1' || sensRaw.toLowerCase() === 'true',
        tags: tagsRaw.split('|').map(s => s.trim()).filter(Boolean)
      });
    }
    saveState(); renderCards(); showSnackbar('Imported CSV');
  };
  /** Validate imported object and push to items if minimally valid. */
  const addImportedItem = (o) => {
    if (!o || !o.text || !o.desc) return;
    state.items.push({ id: uid(), text: String(o.text), desc: String(o.desc), sensitive: !!o.sensitive, tags: Array.isArray(o.tags)? o.tags.map(String) : [] });
  };

  // CSV helpers
  /** Escape a string for safe inclusion in CSV. */
  const csvEscape = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  /** Parse a CSV line with support for quotes and escaped quotes. */
  const parseCSVLine = (line) => {
    const out = []; let cur=''; let inQ=false;
    for (let i=0;i<line.length;i++){
      const ch=line[i];
      if (inQ){
        if (ch==='"' && line[i+1]==='"'){ cur+='"'; i++; }
        else if (ch==='"'){ inQ=false; }
        else cur+=ch;
      } else {
        if (ch===','){ out.push(cur); cur=''; }
        else if (ch==='"'){ inQ=true; }
        else cur+=ch;
      }
    }
    out.push(cur);
    return out;
  };

  // Profile
  /** Render user profile display next to the app title. */
  const renderProfile = () => {
    $('#profileDisplay').textContent = state.profileName ? `· ${state.profileName}'s Compy` : '';
  };

  // Filter badge counter in header
  /** Update the filter counter badge visibility and value. */
  const renderFilterBadge = () => {
    const badge = $('#filterBadge');
    if (!badge) return;
    const count = state.filterTags.length;
    if (count > 0) {
      badge.textContent = String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  };

  $('#profileEditBtn').addEventListener('click', ()=>{
    // Open dedicated profile modal instead of prompt
    if (isMobile() && navToggle.getAttribute('aria-expanded') === 'true') closeNav();
    $('#profileNameInput').value = state.profileName || '';
    openModal($('#profileModal'));
    $('#profileNameInput').focus();
  });

  function saveProfileFromModal() {
    const name = $('#profileNameInput').value;
    state.profileName = (name || '').trim();
    localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
    renderProfile();
    closeModal($('#profileModal'));
  }

  $('#profileSaveBtn').addEventListener('click', saveProfileFromModal);
  $('#profileNameInput').addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); saveProfileFromModal(); } });

  // Brand refresh
  $('#brand').addEventListener('click', ()=> location.reload());

  // Add button (toolbar) and Floating Action Button (mobile)
  $('#addBtn').addEventListener('click', ()=> openItemModal(null));
  $('#fabAdd').addEventListener('click', ()=> openItemModal(null));

  // Theme change
  $('#themeSelect').addEventListener('change', (e)=> applyTheme(e.target.value));

  // About
  $('#aboutBtn').addEventListener('click', ()=> { if (isMobile() && navToggle.getAttribute('aria-expanded') === 'true') closeNav(); openModal($('#aboutModal')); });

  // Mobile navbar: hamburger/off-canvas drawer
  const navToggle = $('#navToggle');
  const navActions = $('#navActions');
  const navBackdrop = $('#navBackdrop');
  let lastFocusedBeforeMenu = null;

  function isMobile() { return window.matchMedia('(max-width: 480px)').matches; }

  function openNav() {
    if (!isMobile()) return;
    lastFocusedBeforeMenu = document.activeElement;
    navToggle.setAttribute('aria-expanded', 'true');
    navActions.setAttribute('aria-hidden', 'false');
    navBackdrop.hidden = false;
    navBackdrop.classList.add('show');
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    // Focus first item inside drawer
    const first = navActions.querySelector('button, [href], input, select, textarea');
    first?.focus();
    // Trap focus within drawer
    document.addEventListener('keydown', trapFocus, true);
    document.addEventListener('keydown', onEscClose, true);
    setTimeout(()=> document.addEventListener('click', onDocClickClose, true), 0);
  }
  function closeNav() {
    navToggle.setAttribute('aria-expanded', 'false');
    navActions.setAttribute('aria-hidden', 'true');
    navBackdrop.classList.remove('show');
    navBackdrop.hidden = true;
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.removeEventListener('keydown', trapFocus, true);
    document.removeEventListener('keydown', onEscClose, true);
    document.removeEventListener('click', onDocClickClose, true);
    // Close any floating menus inside drawer (e.g., export)
    try { closeExportMenu(); } catch {}
    // return focus to toggle for accessibility
    navToggle.focus();
  }
  function onEscClose(e){ if (e.key === 'Escape') { e.stopPropagation(); closeNav(); } }
  function onDocClickClose(e){ if (!navActions.contains(e.target) && e.target !== navToggle) { closeNav(); } }
  function trapFocus(e){
    if (!isMobile()) return;
    if (navActions.getAttribute('aria-hidden') === 'true') return;
    const focusable = Array.from(navActions.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  navToggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeNav(); else openNav();
  });
  navBackdrop.addEventListener('click', closeNav);

  // Ensure drawer state resets when resizing to desktop/tablet
  function syncNavAria() {
    if (isMobile()) {
      // keep closed by default on mobile unless toggle says expanded
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navActions.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    } else {
      // always visible in a11y tree on larger screens
      navToggle.setAttribute('aria-expanded', 'false');
      navActions.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      navBackdrop.classList.remove('show');
      navBackdrop.hidden = true;
    }
  }
  window.addEventListener('resize', ()=>{ if (!isMobile()) { closeNav(); } syncNavAria(); });
  syncNavAria();

  // Hide low-priority elements at certain breakpoints via classes (applied here for clarity)
  // Example: mark optional elements if needed
  // $('#someOptionalBtn')?.classList.add('nav-hide-mobile');

  // Clear chips via X inside card should not actually remove tags from item per requirements; only in modal we remove.

  // Init
  function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, (c)=>({"&":"&amp;","<":"&lt;", ">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  loadState();
  loadTheme();
  renderProfile();
  renderFilterBadge();
  // Ensure body top padding matches navbar height when fixed
  function adjustForNavbar(){
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    const h = Math.round(rect.height);
    document.documentElement.style.setProperty('--nav-h', h + 'px');
  }
  window.addEventListener('resize', adjustForNavbar);
  window.addEventListener('load', adjustForNavbar);
  requestAnimationFrame(adjustForNavbar);
  renderCards();
  // simple string hash for deterministic tag hue
  function hash(str){ let h=0; for(let i=0;i<str.length;i++){ h=(h<<5)-h+str.charCodeAt(i); h|=0; } return h; }

  // Hourly auto backup
  setInterval(doBackup, 60*60*1000);
})();

