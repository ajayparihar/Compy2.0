/* Compy - vanilla JS implementation per Doc3 */
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEYS = {
    items: 'compy.items',
    theme: 'compy.theme',
    profile: 'compy.profile',
    backups: 'compy.backups',
    filters: 'compy.filters',
  };

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
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
    if (state.profileName) localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
    scheduleBackup();
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
    try { await navigator.clipboard.writeText(txt); showSnackbar('Copied'); }
    catch { // fallback
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showSnackbar('Copied');
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
  const renderCards = () => {
    const container = $('#cards');
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


  const highlight = (text, query) => {
    if (!query) return text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(q, 'gi'), (m)=>`<mark>${m}</mark>`);
  };

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
    card.querySelector('[data-act="delete"]').addEventListener('click', ()=>confirmDeleteItem(it.id));
    card.querySelector('[data-act="copy"]').addEventListener('click', ()=>copyToClipboard(it.text));
    return card;
  };

  const tagsHtml = (tags=[]) => {
    const visible = tags.slice(0,5);
    const more = tags.length - visible.length;
    let html = visible.map(t=>`<span class=\"chip\">${escapeHtml(t)}</span>`).join('');
    if (more>0) html += `<span class=\"more\" data-more-tags title=\"Show more\">+${more} more</span>`;
    return html;
  };

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
  const upsertItem = (payload) => {
    if (state.editingId) {
      const idx = state.items.findIndex(i=>i.id===state.editingId); if (idx>-1) state.items[idx] = { ...state.items[idx], ...payload };
    } else {
      state.items.unshift({ id: uid(), ...payload });
    }
    saveState(); renderCards();
  };
  const deleteItem = (id) => {
    state.items = state.items.filter(i=>i.id!==id); saveState(); renderCards(); showSnackbar('Deleted');
  };

  const confirmDeleteItem = (id) => {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    
    const itemPreview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
    
    showConfirmModal({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemPreview}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmClass: 'danger-btn',
      onConfirm: () => deleteItem(id)
    });
  };

  // Confirmation Modal
  const showConfirmModal = (options = {}) => {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      confirmClass = 'danger-btn',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;

    $('#confirmModalTitle').textContent = title;
    $('#confirmModalMessage').textContent = message;
    const confirmBtn = $('#confirmModalAction');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `primary-btn ${confirmClass}`;

    // Remove existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => {
      closeModal($('#confirmModal'));
      onConfirm();
    });

    // Handle cancel - already bound via data-close-modal
    const originalCancel = () => {
      closeModal($('#confirmModal'));
      onCancel();
    };

    // Override close modal temporarily for this instance
    const modal = $('#confirmModal');
    const closeButtons = modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', originalCancel, { once: true });
    });

    openModal($('#confirmModal'));
  };

  // Modals
  const openModal = (el) => { el.setAttribute('aria-hidden','false'); el.querySelector('[data-close-modal]')?.focus(); };
  const closeModal = (el) => { el.setAttribute('aria-hidden','true'); };
  $$('#itemModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#itemModal'))));
  $$('#filterModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#filterModal'))));
  $$('#moreTagsModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#moreTagsModal'))));
  $$('#aboutModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#aboutModal'))));
  $$('#backupsModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#backupsModal'))));
  $$('#profileModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#profileModal'))));
  $$('#confirmModal [data-close-modal]').forEach(b=>b.addEventListener('click', ()=>closeModal($('#confirmModal'))));

  // Add/Edit modal logic
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

  const getTagsFromChips = () => $$('#tagChips .chip').map(c=>c.dataset.val);
  const setTagChips = (tags) => {
    const wrap = $('#tagChips'); wrap.innerHTML = '';
    tags.forEach(addTagChip);
  };
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
    if (!text || !desc) { showSnackbar('CompyItem and Description are required'); return; }
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
  const openFilter = () => {
    renderFilterList();
    $('#filterTagSearch').value='';
    openModal($('#filterModal'));
  };
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
    if (!exportMenu.classList.contains('open')) {
      document.body.appendChild(exportMenu);
      positionExportMenu();
      exportMenu.classList.add('open', 'floating');
      window.addEventListener('resize', closeExportMenu, { once: true });
      window.addEventListener('scroll', closeExportMenu, { once: true });
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
  $('#importFile').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.json')) importJSON(text);
    else if (file.name.endsWith('.csv')) importCSV(text);
    e.target.value = '';
  });

  // Backups
  let backupTimer = null;
  const scheduleBackup = () => {
    if (backupTimer) clearTimeout(backupTimer);
    backupTimer = setTimeout(doBackup, 200);
  };
  const doBackup = () => {
    const now = new Date();
    const backup = { ts: now.toISOString(), items: state.items };
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]'); } catch {}
    arr.unshift(backup);
    arr = arr.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.backups, JSON.stringify(arr));
  };
  const openBackups = () => {
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
  const download = (filename, text) => {
    const blob = new Blob([text], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  };
  const exportJSON = () => {
    const payload = { profileName: state.profileName || '', items: state.items };
    download('compy-export.json', JSON.stringify(payload, null, 2));
  };
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
  const addImportedItem = (o) => {
    if (!o || !o.text || !o.desc) return;
    state.items.push({ id: uid(), text: String(o.text), desc: String(o.desc), sensitive: !!o.sensitive, tags: Array.isArray(o.tags)? o.tags.map(String) : [] });
  };

  // CSV helpers
  const csvEscape = (s) => '"' + String(s).replace(/"/g, '""') + '"';
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
  const renderProfile = () => {
    $('#profileDisplay').textContent = state.profileName ? `· ${state.profileName}'s Compy` : '';
  };

  // Filter badge counter in header
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

  // Add button
  $('#addBtn').addEventListener('click', ()=> openItemModal(null));

  // Theme change
  $('#themeSelect').addEventListener('change', (e)=> applyTheme(e.target.value));

  // About
  $('#aboutBtn').addEventListener('click', ()=> openModal($('#aboutModal')));

  // Clear chips via X inside card should not actually remove tags from item per requirements; only in modal we remove.

  // Init
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;", ">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
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

