// Popup UI Logic - v2.0

// State
let currentBookmarks = [];
let currentBookmark = null;
let pendingNoteData = null;
let batchMode = false;
let selectedBookmarks = new Set();
let graphData = null;

// DOM Elements
const elements = {};

// Initialize DOM elements after page load
function initElements() {
  Object.assign(elements, {
    // Quick save
    favicon: document.getElementById('favicon'),
    pageTitle: document.getElementById('pageTitle'),
    pageUrl: document.getElementById('pageUrl'),
    saveBtn: document.getElementById('saveBtn'),
    saveWithNoteBtn: document.getElementById('saveWithNoteBtn'),
    saveSnapshotBtn: document.getElementById('saveSnapshotBtn'),
    readLaterBtn: document.getElementById('readLaterBtn'),
    saveStatus: document.getElementById('saveStatus'),

    // Header
    darkModeBtn: document.getElementById('darkModeBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Tabs
    tabs: document.querySelectorAll('.tab'),

    // Search
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchResults: document.getElementById('searchResults'),
    aiSearchToggle: document.getElementById('aiSearchToggle'),
    fullTextSearchToggle: document.getElementById('fullTextSearchToggle'),
    aiAnswer: document.getElementById('aiAnswer'),

    // Bookmarks
    categoryFilter: document.getElementById('categoryFilter'),
    folderFilter: document.getElementById('folderFilter'),
    statusFilter: document.getElementById('statusFilter'),
    tagFilter: document.getElementById('tagFilter'),
    bookmarkCount: document.getElementById('bookmarkCount'),
    bookmarksList: document.getElementById('bookmarksList'),
    batchActions: document.getElementById('batchActions'),
    selectedCount: document.getElementById('selectedCount'),
    batchModeBtn: document.getElementById('batchModeBtn'),
    selectAllBookmarks: document.getElementById('selectAllBookmarks'),
    batchMoveBtn: document.getElementById('batchMoveBtn'),
    batchTagBtn: document.getElementById('batchTagBtn'),
    batchDeleteBtn: document.getElementById('batchDeleteBtn'),
    cancelBatchBtn: document.getElementById('cancelBatchBtn'),

    // Folders Tab
    createFolderBtn: document.getElementById('createFolderBtn'),
    foldersList: document.getElementById('foldersList'),
    createTagBtn: document.getElementById('createTagBtn'),
    tagsList: document.getElementById('tagsList'),
    readLaterList: document.getElementById('readLaterList'),
    readLaterCount: document.getElementById('readLaterCount'),
    highlightsList: document.getElementById('highlightsList'),
    highlightCount: document.getElementById('highlightCount'),

    // Timeline
    timelineRange: document.getElementById('timelineRange'),
    timelineView: document.getElementById('timelineView'),

    // Graph
    graphFilter: document.getElementById('graphFilter'),
    refreshGraphBtn: document.getElementById('refreshGraphBtn'),
    graphCanvas: document.getElementById('graphCanvas'),
    graphLegend: document.getElementById('graphLegend'),

    // Stats
    totalBookmarks: document.getElementById('totalBookmarks'),
    reviewedCount: document.getElementById('reviewedCount'),
    snapshotCount: document.getElementById('snapshotCount'),
    brokenCount: document.getElementById('brokenCount'),
    categoryStats: document.getElementById('categoryStats'),
    keywordCloud: document.getElementById('keywordCloud'),
    trendChart: document.getElementById('trendChart'),
    unreadCount: document.getElementById('unreadCount'),
    readingCount: document.getElementById('readingCount'),
    readCount: document.getElementById('readCount'),
    checkLinksBtn: document.getElementById('checkLinksBtn'),
    findDuplicatesBtn: document.getElementById('findDuplicatesBtn'),
    checkChangesBtn: document.getElementById('checkChangesBtn'),

    // Settings modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    apiKey: document.getElementById('apiKey'),
    reviewTime: document.getElementById('reviewTime'),
    reviewCount: document.getElementById('reviewCount'),
    autoSnapshot: document.getElementById('autoSnapshot'),
    monitorChanges: document.getElementById('monitorChanges'),
    saveSettings: document.getElementById('saveSettings'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    exportNotionBtn: document.getElementById('exportNotionBtn'),
    exportObsidianBtn: document.getElementById('exportObsidianBtn'),
    importBrowserBtn: document.getElementById('importBrowserBtn'),

    // Detail modal
    detailModal: document.getElementById('detailModal'),
    closeDetail: document.getElementById('closeDetail'),
    detailTitle: document.getElementById('detailTitle'),
    detailSummary: document.getElementById('detailSummary'),
    detailWhyRead: document.getElementById('detailWhyRead'),
    detailCategory: document.getElementById('detailCategory'),
    detailFolder: document.getElementById('detailFolder'),
    detailTags: document.getElementById('detailTags'),
    addTagInput: document.getElementById('addTagInput'),
    detailKeywords: document.getElementById('detailKeywords'),
    detailNote: document.getElementById('detailNote'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    detailLinkStatus: document.getElementById('detailLinkStatus'),
    checkLinkBtn: document.getElementById('checkLinkBtn'),
    detailSnapshotStatus: document.getElementById('detailSnapshotStatus'),
    viewSnapshotBtn: document.getElementById('viewSnapshotBtn'),
    saveSnapshotNowBtn: document.getElementById('saveSnapshotNowBtn'),
    detailDate: document.getElementById('detailDate'),
    similarBookmarks: document.getElementById('similarBookmarks'),
    bookmarkHighlights: document.getElementById('bookmarkHighlights'),
    openBookmark: document.getElementById('openBookmark'),
    deleteBookmark: document.getElementById('deleteBookmark'),

    // Note modal
    noteModal: document.getElementById('noteModal'),
    closeNoteModal: document.getElementById('closeNoteModal'),
    notePageTitle: document.getElementById('notePageTitle'),
    saveNote: document.getElementById('saveNote'),
    confirmSaveWithNote: document.getElementById('confirmSaveWithNote'),

    // Folder modal
    folderModal: document.getElementById('folderModal'),
    closeFolderModal: document.getElementById('closeFolderModal'),
    folderName: document.getElementById('folderName'),
    folderIconPicker: document.getElementById('folderIconPicker'),
    folderColor: document.getElementById('folderColor'),
    confirmCreateFolder: document.getElementById('confirmCreateFolder'),

    // Tag modal
    tagModal: document.getElementById('tagModal'),
    closeTagModal: document.getElementById('closeTagModal'),
    tagName: document.getElementById('tagName'),
    tagColor: document.getElementById('tagColor'),
    confirmCreateTag: document.getElementById('confirmCreateTag'),

    // Duplicates modal
    duplicatesModal: document.getElementById('duplicatesModal'),
    closeDuplicatesModal: document.getElementById('closeDuplicatesModal'),
    duplicatesList: document.getElementById('duplicatesList'),
    mergeAllDuplicates: document.getElementById('mergeAllDuplicates'),

    // Changes modal
    changesModal: document.getElementById('changesModal'),
    closeChangesModal: document.getElementById('closeChangesModal'),
    changesList: document.getElementById('changesList'),

    // Snapshot modal
    snapshotModal: document.getElementById('snapshotModal'),
    closeSnapshotModal: document.getElementById('closeSnapshotModal'),
    snapshotDate: document.getElementById('snapshotDate'),
    downloadSnapshot: document.getElementById('downloadSnapshot'),
    snapshotFrame: document.getElementById('snapshotFrame'),

    // Batch modals
    batchTagModal: document.getElementById('batchTagModal'),
    closeBatchTagModal: document.getElementById('closeBatchTagModal'),
    batchTagsList: document.getElementById('batchTagsList'),
    confirmBatchTag: document.getElementById('confirmBatchTag'),

    batchMoveModal: document.getElementById('batchMoveModal'),
    closeBatchMoveModal: document.getElementById('closeBatchMoveModal'),
    batchMoveFolder: document.getElementById('batchMoveFolder'),
    confirmBatchMove: document.getElementById('confirmBatchMove'),

    // Share modal
    shareModal: document.getElementById('shareModal'),
    closeShareModal: document.getElementById('closeShareModal'),
    sharePreview: document.getElementById('sharePreview'),
    shareFormat: document.getElementById('shareFormat'),
    shareContent: document.getElementById('shareContent'),
    copyShareBtn: document.getElementById('copyShareBtn')
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  initElements();
  await loadDarkMode();
  await loadCurrentPage();
  await loadSettings();
  await loadCategories();
  await loadFolders();
  await loadTags();
  await loadBookmarks();
  setupEventListeners();
}

// Dark mode
async function loadDarkMode() {
  const { darkMode } = await chrome.storage.sync.get(['darkMode']);
  if (darkMode) {
    document.body.classList.add('dark-mode');
    elements.darkModeBtn.textContent = '☀️';
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  elements.darkModeBtn.textContent = isDark ? '☀️' : '🌙';
  chrome.storage.sync.set({ darkMode: isDark });
}

// Load current page info
async function loadCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      elements.pageTitle.textContent = tab.title || '未知页面';
      elements.pageUrl.textContent = tab.url;
      elements.favicon.src = tab.favIconUrl || '';

      const response = await sendMessage({ action: 'checkExists', url: tab.url });
      if (response.data) {
        elements.saveBtn.disabled = true;
        elements.saveBtn.innerHTML = '<span class="btn-icon">✓</span><span>已收藏</span>';
        elements.saveWithNoteBtn.disabled = true;
      }
    }
  } catch (error) {
    console.error('Failed to load current page:', error);
  }
}

// Load settings
async function loadSettings() {
  try {
    const response = await sendMessage({ action: 'getApiKey' });
    if (response.data) {
      elements.apiKey.value = response.data;
    }

    const settings = await chrome.storage.sync.get(['reviewTime', 'reviewCount', 'autoSnapshot', 'monitorChanges']);
    if (settings.reviewTime) elements.reviewTime.value = settings.reviewTime;
    if (settings.reviewCount) elements.reviewCount.value = settings.reviewCount;
    if (settings.autoSnapshot) elements.autoSnapshot.checked = true;
    if (settings.monitorChanges) elements.monitorChanges.checked = true;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Load categories for filter
async function loadCategories() {
  try {
    const response = await sendMessage({ action: 'getCategories' });
    const categories = response.data || [];

    elements.categoryFilter.innerHTML = '<option value="">全部分类</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      elements.categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Load folders
async function loadFolders() {
  try {
    const response = await sendMessage({ action: 'getFolders' });
    const folders = response.data || [];

    // Update filter dropdown
    elements.folderFilter.innerHTML = '<option value="">全部文件夹</option>';
    if (elements.detailFolder) {
      elements.detailFolder.innerHTML = '<option value="">无</option>';
    }
    if (elements.batchMoveFolder) {
      elements.batchMoveFolder.innerHTML = '<option value="">选择目标文件夹</option>';
    }

    folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = `${folder.icon || '📁'} ${folder.name}`;

      elements.folderFilter.appendChild(option.cloneNode(true));
      if (elements.detailFolder) elements.detailFolder.appendChild(option.cloneNode(true));
      if (elements.batchMoveFolder) elements.batchMoveFolder.appendChild(option.cloneNode(true));
    });

    // Render folders list
    renderFoldersList(folders);
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
}

// Render folders list
function renderFoldersList(folders) {
  if (!elements.foldersList) return;

  if (folders.length === 0) {
    elements.foldersList.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p style="color: var(--text-muted); font-size: 12px;">暂无文件夹</p>
      </div>
    `;
    return;
  }

  elements.foldersList.innerHTML = folders.map(folder => `
    <div class="folder-item" data-id="${folder.id}">
      <span class="folder-icon">${folder.icon || '📁'}</span>
      <div class="folder-info">
        <div class="folder-name">${escapeHtml(folder.name)}</div>
        <div class="folder-count">${folder.bookmarkCount || 0} 个书签</div>
      </div>
      <div class="folder-actions">
        <button class="edit-folder" data-id="${folder.id}">✏️</button>
        <button class="delete-folder" data-id="${folder.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  elements.foldersList.querySelectorAll('.folder-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.folder-actions')) {
        elements.folderFilter.value = item.dataset.id;
        loadBookmarks();
        switchToTab('bookmarks');
      }
    });
  });

  elements.foldersList.querySelectorAll('.delete-folder').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('确定要删除这个文件夹吗？')) {
        await sendMessage({ action: 'deleteFolder', id: btn.dataset.id });
        await loadFolders();
      }
    });
  });
}

// Load tags
async function loadTags() {
  try {
    const response = await sendMessage({ action: 'getTags' });
    const tags = response.data || [];

    // Update filter dropdown
    elements.tagFilter.innerHTML = '<option value="">全部标签</option>';
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;
      option.textContent = tag.name;
      elements.tagFilter.appendChild(option);
    });

    // Render tags cloud
    renderTagsCloud(tags);

    // Update batch tags list
    if (elements.batchTagsList) {
      elements.batchTagsList.innerHTML = tags.map(tag => `
        <label class="tag-checkbox">
          <input type="checkbox" value="${tag.id}">
          <span class="tag-color" style="background: ${tag.color || '#34a853'}"></span>
          <span>${escapeHtml(tag.name)}</span>
        </label>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
}

// Render tags cloud
function renderTagsCloud(tags) {
  if (!elements.tagsList) return;

  if (tags.length === 0) {
    elements.tagsList.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; padding: 8px;">暂无标签</p>`;
    return;
  }

  elements.tagsList.innerHTML = tags.map(tag => `
    <div class="tag-item" data-id="${tag.id}">
      <span class="tag-color" style="background: ${tag.color || '#34a853'}"></span>
      <span class="tag-name">${escapeHtml(tag.name)}</span>
      <span class="tag-count">${tag.bookmarkCount || 0}</span>
    </div>
  `).join('');

  // Add click handlers
  elements.tagsList.querySelectorAll('.tag-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.tagFilter.value = item.dataset.id;
      loadBookmarks();
      switchToTab('bookmarks');
    });
  });
}

// Load all bookmarks
async function loadBookmarks() {
  try {
    const category = elements.categoryFilter?.value || '';
    const folder = elements.folderFilter?.value || '';
    const status = elements.statusFilter?.value || '';
    const tag = elements.tagFilter?.value || '';

    const response = await sendMessage({
      action: 'getBookmarks',
      filters: { category, folder, status, tag }
    });

    currentBookmarks = response.data || [];
    elements.bookmarkCount.textContent = `${currentBookmarks.length} 个书签`;

    renderBookmarksList(currentBookmarks, elements.bookmarksList);
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
  }
}

// Render bookmarks list
function renderBookmarksList(bookmarks, container, showCheckbox = false) {
  if (!container) return;

  if (bookmarks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>暂无书签</p>
      </div>
    `;
    return;
  }

  container.innerHTML = bookmarks.map(b => {
    const bookmark = b.bookmark || b;
    const similarity = b.similarity ? `<span class="similarity-score">${Math.round(b.similarity * 100)}% 相关</span>` : '';
    const date = new Date(bookmark.createdAt).toLocaleDateString('zh-CN');
    const isBroken = bookmark.linkStatus === 'broken';
    const hasNote = bookmark.note && bookmark.note.trim();
    const readStatus = bookmark.readStatus || 'unread';
    const priority = bookmark.priority || 'normal';
    const tags = bookmark.tags || [];

    return `
      <div class="bookmark-card ${isBroken ? 'broken' : ''} ${selectedBookmarks.has(bookmark.id) ? 'selected' : ''}" data-id="${bookmark.id}">
        ${batchMode ? `<input type="checkbox" class="bookmark-checkbox" ${selectedBookmarks.has(bookmark.id) ? 'checked' : ''}>` : ''}
        <img class="favicon" src="${bookmark.favicon || ''}" alt="" onerror="this.style.display='none'">
        <div class="info">
          <div class="title">${escapeHtml(bookmark.title)}</div>
          <div class="summary">${escapeHtml(bookmark.summary || '')}</div>
          <div class="meta">
            ${bookmark.category ? `<span class="category-tag">${bookmark.category}</span>` : ''}
            <span class="read-badge ${readStatus}">${readStatus === 'unread' ? '未读' : readStatus === 'reading' ? '阅读中' : '已读'}</span>
            ${priority !== 'normal' ? `<span class="priority-badge ${priority}">${priority === 'high' ? '高优先' : '低优先'}</span>` : ''}
            ${tags.slice(0, 2).map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}
            <span class="date-tag">${date}</span>
            ${hasNote ? '<span class="note-indicator">📝</span>' : ''}
            ${isBroken ? '<span class="broken-indicator">⚠️</span>' : ''}
            ${similarity}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (batchMode) {
        const checkbox = card.querySelector('.bookmark-checkbox');
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        toggleBookmarkSelection(card.dataset.id, checkbox.checked);
      } else {
        showBookmarkDetail(card.dataset.id);
      }
    });
  });
}

// Toggle bookmark selection
function toggleBookmarkSelection(id, selected) {
  if (selected) {
    selectedBookmarks.add(id);
  } else {
    selectedBookmarks.delete(id);
  }
  elements.selectedCount.textContent = `已选择 ${selectedBookmarks.size} 项`;
}

// Toggle batch mode
function toggleBatchMode(enabled) {
  batchMode = enabled;
  selectedBookmarks.clear();

  if (enabled) {
    elements.batchActions.classList.remove('hidden');
    elements.batchModeBtn.textContent = '退出批量';
  } else {
    elements.batchActions.classList.add('hidden');
    elements.batchModeBtn.textContent = '批量操作';
  }

  elements.selectedCount.textContent = '已选择 0 项';
  renderBookmarksList(currentBookmarks, elements.bookmarksList, batchMode);
}

// Show bookmark detail
async function showBookmarkDetail(id) {
  try {
    const response = await sendMessage({ action: 'getBookmark', id });
    currentBookmark = response.data;

    if (!currentBookmark) return;

    elements.detailTitle.textContent = currentBookmark.title;
    elements.detailSummary.textContent = currentBookmark.summary || '无摘要';
    elements.detailWhyRead.textContent = currentBookmark.whyRead || '';
    elements.detailCategory.textContent = currentBookmark.category || '未分类';
    elements.detailDate.textContent = new Date(currentBookmark.createdAt).toLocaleString('zh-CN');
    elements.detailNote.value = currentBookmark.note || '';

    // Folder
    if (elements.detailFolder) {
      elements.detailFolder.value = currentBookmark.folderId || '';
    }

    // Tags
    if (elements.detailTags) {
      const tagsList = elements.detailTags.querySelector('.tags-list');
      const tags = currentBookmark.tags || [];
      tagsList.innerHTML = tags.map(tag => `
        <span class="tag-removable">
          ${escapeHtml(tag)}
          <span class="remove" data-tag="${escapeHtml(tag)}">×</span>
        </span>
      `).join('');

      tagsList.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', async () => {
          const tagName = btn.dataset.tag;
          const newTags = (currentBookmark.tags || []).filter(t => t !== tagName);
          await sendMessage({ action: 'updateBookmark', id: currentBookmark.id, data: { tags: newTags } });
          currentBookmark.tags = newTags;
          showBookmarkDetail(currentBookmark.id);
        });
      });
    }

    // Link status
    const status = currentBookmark.linkStatus || 'unchecked';
    elements.detailLinkStatus.className = `link-status ${status}`;
    elements.detailLinkStatus.textContent = status === 'ok' ? '正常' : status === 'broken' ? '失效' : '未检查';

    // Snapshot status
    if (elements.detailSnapshotStatus) {
      const snapshotResponse = await sendMessage({ action: 'getSnapshot', bookmarkId: id });
      if (snapshotResponse.data) {
        elements.detailSnapshotStatus.textContent = `已保存 (${new Date(snapshotResponse.data.timestamp).toLocaleDateString('zh-CN')})`;
        elements.viewSnapshotBtn.disabled = false;
      } else {
        elements.detailSnapshotStatus.textContent = '未保存';
        elements.viewSnapshotBtn.disabled = true;
      }
    }

    // Keywords
    const keywords = currentBookmark.keywords || [];
    elements.detailKeywords.innerHTML = keywords.length > 0
      ? keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')
      : '<span class="keyword-tag">无关键词</span>';

    // Reading status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === (currentBookmark.readStatus || 'unread'));
    });

    // Priority buttons
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.priority === (currentBookmark.priority || 'normal'));
    });

    // Load similar bookmarks
    await loadSimilarBookmarks(id);

    // Load highlights for this bookmark
    await loadBookmarkHighlights(id);

    elements.detailModal.classList.remove('hidden');

    // Mark as reviewed
    await sendMessage({ action: 'markReviewed', id });
  } catch (error) {
    console.error('Failed to show bookmark detail:', error);
  }
}

// Load similar bookmarks
async function loadSimilarBookmarks(id) {
  try {
    const response = await sendMessage({ action: 'getSimilarBookmarks', id, count: 3 });
    const similar = response.data || [];

    if (similar.length === 0) {
      elements.similarBookmarks.innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">暂无相似书签</p>';
      return;
    }

    elements.similarBookmarks.innerHTML = similar.map(({ bookmark, similarity }) => `
      <div class="similar-item" data-id="${bookmark.id}">
        <span class="title">${escapeHtml(bookmark.title)}</span>
        <span class="score">${Math.round(similarity * 100)}%</span>
      </div>
    `).join('');

    elements.similarBookmarks.querySelectorAll('.similar-item').forEach(item => {
      item.addEventListener('click', () => showBookmarkDetail(item.dataset.id));
    });
  } catch (error) {
    console.error('Failed to load similar bookmarks:', error);
  }
}

// Load bookmark highlights
async function loadBookmarkHighlights(bookmarkId) {
  if (!elements.bookmarkHighlights) return;

  try {
    const response = await sendMessage({ action: 'getHighlightsForBookmark', bookmarkId });
    const highlights = response.data || [];

    if (highlights.length === 0) {
      elements.bookmarkHighlights.innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">暂无高亮标注</p>';
      return;
    }

    elements.bookmarkHighlights.innerHTML = highlights.map(h => `
      <div class="highlight-item">
        <div class="highlight-text">"${escapeHtml(h.text)}"</div>
        ${h.note ? `<div class="highlight-note">${escapeHtml(h.note)}</div>` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load highlights:', error);
  }
}

// Save bookmark
async function saveBookmark(withNote = false, withSnapshot = false, readLater = false) {
  if (withNote) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pendingNoteData = { url: tab.url, title: tab.title, favicon: tab.favIconUrl };
    elements.notePageTitle.textContent = tab.title;
    elements.saveNote.value = '';
    elements.noteModal.classList.remove('hidden');
    return;
  }

  elements.saveBtn.disabled = true;
  showStatus('loading', '正在分析页面...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let pageData;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
    } catch (e) {
      pageData = {
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl,
        content: '',
        description: ''
      };
    }

    // Add read later status
    if (readLater) {
      pageData.readStatus = 'unread';
      pageData.priority = 'high';
    }

    const response = await sendMessage({
      action: 'saveBookmark',
      data: pageData
    });

    if (response.success) {
      // Save snapshot if requested
      if (withSnapshot) {
        try {
          const fullContent = await chrome.tabs.sendMessage(tab.id, { action: 'extractFullContent' });
          await sendMessage({
            action: 'saveSnapshot',
            bookmarkId: response.data.id,
            data: fullContent
          });
        } catch (e) {
          console.error('Failed to save snapshot:', e);
        }
      }

      showStatus('success', readLater ? '已加入稍后阅读！' : '收藏成功！');
      elements.saveBtn.innerHTML = '<span class="btn-icon">✓</span><span>已收藏</span>';
      elements.saveWithNoteBtn.disabled = true;
      await loadBookmarks();
      await loadCategories();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    showStatus('error', error.message || '收藏失败，请重试');
    elements.saveBtn.disabled = false;
  }
}

// Save bookmark with note
async function saveBookmarkWithNote() {
  if (!pendingNoteData) return;

  const note = elements.saveNote.value.trim();
  elements.confirmSaveWithNote.disabled = true;
  elements.confirmSaveWithNote.textContent = '保存中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let pageData;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
    } catch (e) {
      pageData = {
        title: pendingNoteData.title,
        url: pendingNoteData.url,
        favicon: pendingNoteData.favicon,
        content: '',
        description: ''
      };
    }

    const response = await sendMessage({
      action: 'saveBookmarkWithNote',
      data: pageData,
      note
    });

    if (response.success) {
      elements.noteModal.classList.add('hidden');
      showStatus('success', '收藏成功！');
      elements.saveBtn.innerHTML = '<span class="btn-icon">✓</span><span>已收藏</span>';
      elements.saveBtn.disabled = true;
      elements.saveWithNoteBtn.disabled = true;
      await loadBookmarks();
      await loadCategories();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    showStatus('error', error.message || '收藏失败');
  } finally {
    elements.confirmSaveWithNote.disabled = false;
    elements.confirmSaveWithNote.textContent = '收藏并保存笔记';
    pendingNoteData = null;
  }
}

// Search
async function search() {
  const query = elements.searchInput.value.trim();
  if (!query) return;

  const aiMode = elements.aiSearchToggle?.checked;
  const fullText = elements.fullTextSearchToggle?.checked;

  elements.searchResults.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;

  if (aiMode) {
    elements.aiAnswer.classList.remove('hidden');
    elements.aiAnswer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  } else {
    elements.aiAnswer.classList.add('hidden');
  }

  try {
    const response = await sendMessage({
      action: aiMode ? 'aiSearch' : 'search',
      query,
      fullText
    });

    const results = response.data?.results || response.data || [];

    // Display AI answer if available
    if (aiMode && response.data?.answer) {
      const answer = response.data.answer;
      elements.aiAnswer.innerHTML = `
        <div class="answer-content">${escapeHtml(answer.answer)}</div>
        ${answer.sources?.length > 0 ? `
          <div class="sources">
            <div class="sources-title">相关来源：</div>
            ${answer.sources.map(s => `
              <div class="source-item" data-url="${s.url}">${escapeHtml(s.title)}</div>
            `).join('')}
          </div>
        ` : ''}
      `;

      elements.aiAnswer.querySelectorAll('.source-item').forEach(item => {
        item.addEventListener('click', () => {
          chrome.tabs.create({ url: item.dataset.url });
        });
      });
    }

    if (results.length === 0) {
      elements.searchResults.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <p>没有找到相关书签</p>
        </div>
      `;
    } else {
      renderBookmarksList(results, elements.searchResults);
    }
  } catch (error) {
    console.error('Search failed:', error);
    elements.searchResults.innerHTML = `
      <div class="empty-state">
        <div class="icon">❌</div>
        <p>搜索失败，请重试</p>
      </div>
    `;
    elements.aiAnswer.classList.add('hidden');
  }
}

// Load timeline
async function loadTimeline() {
  if (!elements.timelineView) return;

  const days = elements.timelineRange?.value || '30';

  try {
    const response = await sendMessage({ action: 'getTimeline', days: parseInt(days) });
    const timeline = response.data || [];

    if (timeline.length === 0) {
      elements.timelineView.innerHTML = `
        <div class="empty-state">
          <div class="icon">📅</div>
          <p>暂无收藏记录</p>
        </div>
      `;
      return;
    }

    // Group by date
    const grouped = {};
    timeline.forEach(bookmark => {
      const date = new Date(bookmark.createdAt).toLocaleDateString('zh-CN');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(bookmark);
    });

    elements.timelineView.innerHTML = Object.entries(grouped).map(([date, bookmarks]) => `
      <div class="timeline-day">
        <div class="timeline-date">${date}</div>
        <div class="timeline-items">
          ${bookmarks.map(b => `
            <div class="timeline-item" data-id="${b.id}">
              <span class="time">${new Date(b.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span class="title">${escapeHtml(b.title)}</span>
              ${b.category ? `<span class="category">${b.category}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Add click handlers
    elements.timelineView.querySelectorAll('.timeline-item').forEach(item => {
      item.addEventListener('click', () => showBookmarkDetail(item.dataset.id));
    });
  } catch (error) {
    console.error('Failed to load timeline:', error);
  }
}

// Load knowledge graph
async function loadGraph() {
  if (!elements.graphCanvas) return;

  try {
    const response = await sendMessage({ action: 'getGraphData' });
    graphData = response.data;

    if (!graphData || graphData.nodes.length === 0) {
      const container = elements.graphCanvas.parentElement;
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🕸️</div>
          <p>书签不足，无法生成图谱</p>
        </div>
      `;
      return;
    }

    renderGraph(graphData);
  } catch (error) {
    console.error('Failed to load graph:', error);
  }
}

// Render graph on canvas
function renderGraph(data) {
  const canvas = elements.graphCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.parentElement.clientWidth;
  const height = 300;

  canvas.width = width;
  canvas.height = height;

  // Simple force-directed layout
  const nodes = data.nodes.map((node, i) => ({
    ...node,
    x: width / 2 + Math.cos(i * 2 * Math.PI / data.nodes.length) * 100,
    y: height / 2 + Math.sin(i * 2 * Math.PI / data.nodes.length) * 80,
    vx: 0,
    vy: 0
  }));

  const links = data.links;

  // Draw
  ctx.clearRect(0, 0, width, height);

  // Draw links
  links.forEach(link => {
    const source = nodes.find(n => n.id === link.source);
    const target = nodes.find(n => n.id === link.target);
    if (source && target) {
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = link.type === 'category' ? '#4285f4' : link.type === 'keyword' ? '#34a853' : '#ea4335';
      ctx.globalAlpha = link.strength || 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  // Draw nodes
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#667eea';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Legend
  if (elements.graphLegend) {
    elements.graphLegend.innerHTML = `
      <div class="legend-item"><span class="legend-dot category"></span> 同分类</div>
      <div class="legend-item"><span class="legend-dot keyword"></span> 共享关键词</div>
      <div class="legend-item"><span class="legend-dot semantic"></span> 语义相似</div>
    `;
  }
}

// Load statistics
async function loadStatistics() {
  try {
    const response = await sendMessage({ action: 'getStats' });
    const stats = response.data;

    if (!stats) return;

    elements.totalBookmarks.textContent = stats.total;
    elements.reviewedCount.textContent = stats.reviewStats?.reviewed || 0;
    elements.brokenCount.textContent = stats.healthCount?.broken || 0;

    if (elements.snapshotCount) {
      elements.snapshotCount.textContent = stats.snapshotCount || 0;
    }

    // Reading stats
    if (elements.unreadCount) {
      elements.unreadCount.textContent = stats.readingStats?.unread || 0;
    }
    if (elements.readingCount) {
      elements.readingCount.textContent = stats.readingStats?.reading || 0;
    }
    if (elements.readCount) {
      elements.readCount.textContent = stats.readingStats?.read || 0;
    }

    // Category bars
    const maxCount = Math.max(...Object.values(stats.categoryCount || {}), 1);
    elements.categoryStats.innerHTML = Object.entries(stats.categoryCount || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, count]) => `
        <div class="category-bar">
          <span class="name" title="${cat}">${cat}</span>
          <div class="bar">
            <div class="bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
          </div>
          <span class="count">${count}</span>
        </div>
      `).join('');

    // Keyword cloud
    elements.keywordCloud.innerHTML = (stats.topKeywords || [])
      .map(({ keyword, count }) => `
        <span class="keyword-item">${keyword} (${count})</span>
      `).join('');

    // Trend chart
    const months = Object.entries(stats.monthlyCount || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const maxMonthly = Math.max(...months.map(m => m[1]), 1);
    elements.trendChart.innerHTML = months
      .map(([month, count]) => `
        <div class="trend-bar" style="height: ${(count / maxMonthly) * 100}%" data-label="${month}: ${count}"></div>
      `).join('');

  } catch (error) {
    console.error('Failed to load statistics:', error);
  }
}

// Load read later items
async function loadReadLater() {
  if (!elements.readLaterList) return;

  try {
    const response = await sendMessage({ action: 'getReadLater' });
    const items = response.data || [];

    if (elements.readLaterCount) {
      elements.readLaterCount.textContent = items.length;
    }

    if (items.length === 0) {
      elements.readLaterList.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; padding: 8px;">暂无待阅读项目</p>';
      return;
    }

    renderBookmarksList(items, elements.readLaterList);
  } catch (error) {
    console.error('Failed to load read later:', error);
  }
}

// Load all highlights
async function loadHighlights() {
  if (!elements.highlightsList) return;

  try {
    const response = await sendMessage({ action: 'getAllHighlights' });
    const highlights = response.data || [];

    if (elements.highlightCount) {
      elements.highlightCount.textContent = highlights.length;
    }

    if (highlights.length === 0) {
      elements.highlightsList.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; padding: 8px;">暂无高亮标注</p>';
      return;
    }

    elements.highlightsList.innerHTML = highlights.slice(0, 10).map(h => `
      <div class="highlight-item">
        <div class="highlight-text">"${escapeHtml(h.text)}"</div>
        ${h.note ? `<div class="highlight-note">${escapeHtml(h.note)}</div>` : ''}
        <div class="highlight-meta">
          <span class="highlight-source" data-url="${h.url}">${escapeHtml(h.pageTitle || '查看来源')}</span>
          <span>${new Date(h.timestamp).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    `).join('');

    elements.highlightsList.querySelectorAll('.highlight-source').forEach(item => {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });
  } catch (error) {
    console.error('Failed to load highlights:', error);
  }
}

// Find duplicates
async function findDuplicates() {
  elements.findDuplicatesBtn.disabled = true;
  elements.findDuplicatesBtn.textContent = '检查中...';

  try {
    const response = await sendMessage({ action: 'findDuplicates' });
    const duplicates = response.data || [];

    if (duplicates.length === 0) {
      showStatus('success', '没有发现重复书签');
    } else {
      // Show duplicates modal
      renderDuplicates(duplicates);
      elements.duplicatesModal.classList.remove('hidden');
    }
  } catch (error) {
    showStatus('error', '检查失败');
  } finally {
    elements.findDuplicatesBtn.disabled = false;
    elements.findDuplicatesBtn.textContent = '🔍 查找重复';
  }
}

// Render duplicates
function renderDuplicates(duplicates) {
  if (!elements.duplicatesList) return;

  elements.duplicatesList.innerHTML = duplicates.map((dup, index) => `
    <div class="duplicate-group">
      <div class="duplicate-type">${dup.type === 'url' ? 'URL 完全相同' : dup.type === 'similar_title' ? '标题相似' : '内容相似'}</div>
      <div class="duplicate-items">
        <div class="duplicate-item original">
          <span class="title">${escapeHtml(dup.original.title)}</span>
          <span class="action" data-action="keep" data-id="${dup.original.id}">保留</span>
        </div>
        <div class="duplicate-item duplicate">
          <span class="title">${escapeHtml(dup.duplicate.title)}</span>
          <span class="action" data-action="delete" data-id="${dup.duplicate.id}">删除</span>
        </div>
      </div>
    </div>
  `).join('');

  elements.duplicatesList.querySelectorAll('.action').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.action === 'delete') {
        await sendMessage({ action: 'deleteBookmark', id: btn.dataset.id });
        btn.closest('.duplicate-group').remove();
        await loadBookmarks();
      }
    });
  });
}

// Check content changes
async function checkContentChanges() {
  elements.checkChangesBtn.disabled = true;
  elements.checkChangesBtn.textContent = '检查中...';

  try {
    const response = await sendMessage({ action: 'checkContentChanges' });
    const changes = response.data || [];

    if (changes.length === 0) {
      showStatus('success', '没有发现内容变更');
    } else {
      renderChanges(changes);
      elements.changesModal.classList.remove('hidden');
    }
  } catch (error) {
    showStatus('error', '检查失败');
  } finally {
    elements.checkChangesBtn.disabled = false;
    elements.checkChangesBtn.textContent = '📝 检查变更';
  }
}

// Render changes
function renderChanges(changes) {
  if (!elements.changesList) return;

  elements.changesList.innerHTML = changes.map(change => `
    <div class="change-item">
      <div class="change-title">${escapeHtml(change.title)}</div>
      <div class="change-summary">${change.summary}</div>
      <div class="change-actions">
        <button class="small-btn view-change" data-url="${change.url}">查看</button>
        <button class="small-btn update-snapshot" data-id="${change.id}">更新快照</button>
      </div>
    </div>
  `).join('');

  elements.changesList.querySelectorAll('.view-change').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });

  elements.changesList.querySelectorAll('.update-snapshot').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sendMessage({ action: 'updateSnapshot', bookmarkId: btn.dataset.id });
      btn.textContent = '已更新';
      btn.disabled = true;
    });
  });
}

// View snapshot
async function viewSnapshot() {
  if (!currentBookmark) return;

  try {
    const response = await sendMessage({ action: 'getSnapshot', bookmarkId: currentBookmark.id });
    if (response.data) {
      elements.snapshotDate.textContent = `保存时间: ${new Date(response.data.timestamp).toLocaleString('zh-CN')}`;
      elements.snapshotFrame.srcdoc = response.data.html;
      elements.snapshotModal.classList.remove('hidden');
    }
  } catch (error) {
    showStatus('error', '加载快照失败');
  }
}

// Create folder
async function createFolder() {
  const name = elements.folderName.value.trim();
  if (!name) {
    showStatus('error', '请输入文件夹名称');
    return;
  }

  const selectedIcon = elements.folderIconPicker.querySelector('.icon-option.selected');
  const icon = selectedIcon?.dataset.icon || '📁';
  const color = elements.folderColor.value;

  try {
    await sendMessage({ action: 'createFolder', data: { name, icon, color } });
    elements.folderModal.classList.add('hidden');
    elements.folderName.value = '';
    await loadFolders();
    showStatus('success', '文件夹创建成功');
  } catch (error) {
    showStatus('error', '创建失败');
  }
}

// Create tag
async function createTag() {
  const name = elements.tagName.value.trim();
  if (!name) {
    showStatus('error', '请输入标签名称');
    return;
  }

  const color = elements.tagColor.value;

  try {
    await sendMessage({ action: 'createTag', data: { name, color } });
    elements.tagModal.classList.add('hidden');
    elements.tagName.value = '';
    await loadTags();
    showStatus('success', '标签创建成功');
  } catch (error) {
    showStatus('error', '创建失败');
  }
}

// Batch operations
async function batchDelete() {
  if (selectedBookmarks.size === 0) return;
  if (!confirm(`确定要删除选中的 ${selectedBookmarks.size} 个书签吗？`)) return;

  try {
    for (const id of selectedBookmarks) {
      await sendMessage({ action: 'deleteBookmark', id });
    }
    showStatus('success', `已删除 ${selectedBookmarks.size} 个书签`);
    toggleBatchMode(false);
    await loadBookmarks();
  } catch (error) {
    showStatus('error', '删除失败');
  }
}

async function batchMove() {
  if (selectedBookmarks.size === 0) return;
  elements.batchMoveModal.classList.remove('hidden');
}

async function confirmBatchMove() {
  const folderId = elements.batchMoveFolder.value;
  if (!folderId) {
    showStatus('error', '请选择目标文件夹');
    return;
  }

  try {
    for (const id of selectedBookmarks) {
      await sendMessage({ action: 'updateBookmark', id, data: { folderId } });
    }
    showStatus('success', `已移动 ${selectedBookmarks.size} 个书签`);
    elements.batchMoveModal.classList.add('hidden');
    toggleBatchMode(false);
    await loadBookmarks();
  } catch (error) {
    showStatus('error', '移动失败');
  }
}

async function batchAddTags() {
  if (selectedBookmarks.size === 0) return;
  elements.batchTagModal.classList.remove('hidden');
}

async function confirmBatchTags() {
  const checkedTags = Array.from(elements.batchTagsList.querySelectorAll('input:checked'))
    .map(input => {
      const label = input.closest('.tag-checkbox');
      return label.querySelector('span:last-child').textContent;
    });

  if (checkedTags.length === 0) {
    showStatus('error', '请选择至少一个标签');
    return;
  }

  try {
    for (const id of selectedBookmarks) {
      const response = await sendMessage({ action: 'getBookmark', id });
      const bookmark = response.data;
      const existingTags = bookmark.tags || [];
      const newTags = [...new Set([...existingTags, ...checkedTags])];
      await sendMessage({ action: 'updateBookmark', id, data: { tags: newTags } });
    }
    showStatus('success', `已为 ${selectedBookmarks.size} 个书签添加标签`);
    elements.batchTagModal.classList.add('hidden');
    toggleBatchMode(false);
    await loadBookmarks();
  } catch (error) {
    showStatus('error', '添加标签失败');
  }
}

// Export functions
async function exportNotion() {
  try {
    const response = await sendMessage({ action: 'exportNotion' });
    if (response.success) {
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-notion-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    showStatus('error', '导出失败');
  }
}

async function exportObsidian() {
  try {
    const response = await sendMessage({ action: 'exportObsidian' });
    if (response.success) {
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-obsidian-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    showStatus('error', '导出失败');
  }
}

// Switch tab
function switchToTab(tabName) {
  elements.tabs.forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabContent = document.getElementById(tabName + 'Tab');
  if (tabContent) tabContent.classList.add('active');

  // Load content for specific tabs
  switch (tabName) {
    case 'stats':
      loadStatistics();
      break;
    case 'timeline':
      loadTimeline();
      break;
    case 'graph':
      loadGraph();
      break;
    case 'folders':
      loadFolders();
      loadTags();
      loadReadLater();
      loadHighlights();
      break;
  }
}

// Show status message
function showStatus(type, message) {
  elements.saveStatus.className = `status ${type}`;
  elements.saveStatus.textContent = message;

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      elements.saveStatus.className = 'status';
    }, 3000);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Dark mode
  elements.darkModeBtn.addEventListener('click', toggleDarkMode);

  // Save buttons
  elements.saveBtn.addEventListener('click', () => saveBookmark(false));
  elements.saveWithNoteBtn.addEventListener('click', () => saveBookmark(true));
  if (elements.saveSnapshotBtn) {
    elements.saveSnapshotBtn.addEventListener('click', () => saveBookmark(false, true));
  }
  if (elements.readLaterBtn) {
    elements.readLaterBtn.addEventListener('click', () => saveBookmark(false, false, true));
  }

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
  });

  // Search
  elements.searchBtn.addEventListener('click', search);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
  });

  // Filters
  elements.categoryFilter?.addEventListener('change', loadBookmarks);
  elements.folderFilter?.addEventListener('change', loadBookmarks);
  elements.statusFilter?.addEventListener('change', loadBookmarks);
  elements.tagFilter?.addEventListener('change', loadBookmarks);

  // Batch mode
  elements.batchModeBtn?.addEventListener('click', () => toggleBatchMode(!batchMode));
  elements.cancelBatchBtn?.addEventListener('click', () => toggleBatchMode(false));
  elements.selectAllBookmarks?.addEventListener('change', (e) => {
    currentBookmarks.forEach(b => {
      const id = b.id || b.bookmark?.id;
      if (e.target.checked) {
        selectedBookmarks.add(id);
      } else {
        selectedBookmarks.delete(id);
      }
    });
    elements.selectedCount.textContent = `已选择 ${selectedBookmarks.size} 项`;
    renderBookmarksList(currentBookmarks, elements.bookmarksList, true);
  });
  elements.batchDeleteBtn?.addEventListener('click', batchDelete);
  elements.batchMoveBtn?.addEventListener('click', batchMove);
  elements.batchTagBtn?.addEventListener('click', batchAddTags);

  // Stats actions
  elements.checkLinksBtn?.addEventListener('click', async () => {
    elements.checkLinksBtn.disabled = true;
    elements.checkLinksBtn.textContent = '检查中...';
    await sendMessage({ action: 'checkAllLinksHealth' });
    await loadStatistics();
    elements.checkLinksBtn.disabled = false;
    elements.checkLinksBtn.textContent = '🔗 检查链接';
    showStatus('success', '链接检查完成');
  });
  elements.findDuplicatesBtn?.addEventListener('click', findDuplicates);
  elements.checkChangesBtn?.addEventListener('click', checkContentChanges);

  // Timeline
  elements.timelineRange?.addEventListener('change', loadTimeline);

  // Graph
  elements.refreshGraphBtn?.addEventListener('click', loadGraph);

  // Folder modal
  elements.createFolderBtn?.addEventListener('click', () => {
    elements.folderModal.classList.remove('hidden');
  });
  elements.closeFolderModal?.addEventListener('click', () => {
    elements.folderModal.classList.add('hidden');
  });
  elements.confirmCreateFolder?.addEventListener('click', createFolder);
  elements.folderIconPicker?.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.folderIconPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Tag modal
  elements.createTagBtn?.addEventListener('click', () => {
    elements.tagModal.classList.remove('hidden');
  });
  elements.closeTagModal?.addEventListener('click', () => {
    elements.tagModal.classList.add('hidden');
  });
  elements.confirmCreateTag?.addEventListener('click', createTag);

  // Settings modal
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });
  elements.closeSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });
  elements.saveSettings.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    const reviewTime = elements.reviewTime.value;
    const reviewCount = parseInt(elements.reviewCount.value) || 3;
    const autoSnapshot = elements.autoSnapshot?.checked || false;
    const monitorChanges = elements.monitorChanges?.checked || false;

    if (apiKey) {
      await sendMessage({ action: 'setApiKey', key: apiKey });
    }

    await chrome.storage.sync.set({ reviewTime, reviewCount, autoSnapshot, monitorChanges });
    showStatus('success', '设置已保存');
    elements.settingsModal.classList.add('hidden');
  });

  // Export/Import
  elements.exportBtn?.addEventListener('click', async () => {
    const response = await sendMessage({ action: 'exportBookmarks' });
    if (response.success) {
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
  elements.importBtn?.addEventListener('click', () => elements.importFile.click());
  elements.importFile?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      const response = await sendMessage({ action: 'importBookmarks', data: text });
      if (response.success) {
        showStatus('success', `成功导入 ${response.data} 个书签`);
        await loadBookmarks();
        await loadCategories();
      }
    }
  });
  elements.exportNotionBtn?.addEventListener('click', exportNotion);
  elements.exportObsidianBtn?.addEventListener('click', exportObsidian);
  elements.importBrowserBtn?.addEventListener('click', async () => {
    elements.importBrowserBtn.disabled = true;
    elements.importBrowserBtn.textContent = '导入中...';
    const response = await sendMessage({ action: 'importBrowserBookmarks' });
    if (response.success) {
      showStatus('success', `成功导入 ${response.data} 个书签`);
      await loadBookmarks();
      await loadCategories();
    }
    elements.importBrowserBtn.disabled = false;
    elements.importBrowserBtn.textContent = '🌐 导入浏览器书签';
  });

  // Detail modal
  elements.closeDetail?.addEventListener('click', () => elements.detailModal.classList.add('hidden'));
  elements.saveNoteBtn?.addEventListener('click', async () => {
    if (!currentBookmark) return;
    await sendMessage({ action: 'updateNote', id: currentBookmark.id, note: elements.detailNote.value });
    showStatus('success', '笔记已保存');
  });
  elements.checkLinkBtn?.addEventListener('click', async () => {
    if (!currentBookmark) return;
    elements.detailLinkStatus.className = 'link-status checking';
    elements.detailLinkStatus.textContent = '检查中...';
    const response = await sendMessage({ action: 'checkLinkHealth', url: currentBookmark.url });
    const status = response.data?.status || 'broken';
    elements.detailLinkStatus.className = `link-status ${status}`;
    elements.detailLinkStatus.textContent = status === 'ok' ? '正常' : '失效';
  });
  elements.viewSnapshotBtn?.addEventListener('click', viewSnapshot);
  elements.saveSnapshotNowBtn?.addEventListener('click', async () => {
    if (!currentBookmark) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url === currentBookmark.url) {
      const fullContent = await chrome.tabs.sendMessage(tab.id, { action: 'extractFullContent' });
      await sendMessage({ action: 'saveSnapshot', bookmarkId: currentBookmark.id, data: fullContent });
      showStatus('success', '快照已保存');
      showBookmarkDetail(currentBookmark.id);
    } else {
      showStatus('error', '请先打开该书签页面');
    }
  });
  elements.openBookmark?.addEventListener('click', () => {
    if (currentBookmark) chrome.tabs.create({ url: currentBookmark.url });
  });
  elements.deleteBookmark?.addEventListener('click', async () => {
    if (currentBookmark && confirm('确定要删除这个书签吗？')) {
      await sendMessage({ action: 'deleteBookmark', id: currentBookmark.id });
      elements.detailModal.classList.add('hidden');
      await loadBookmarks();
    }
  });

  // Detail modal - folder change
  elements.detailFolder?.addEventListener('change', async () => {
    if (!currentBookmark) return;
    await sendMessage({ action: 'updateBookmark', id: currentBookmark.id, data: { folderId: elements.detailFolder.value } });
  });

  // Detail modal - add tag
  elements.addTagInput?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && currentBookmark) {
      const tagName = elements.addTagInput.value.trim();
      if (tagName) {
        const existingTags = currentBookmark.tags || [];
        if (!existingTags.includes(tagName)) {
          const newTags = [...existingTags, tagName];
          await sendMessage({ action: 'updateBookmark', id: currentBookmark.id, data: { tags: newTags } });
          currentBookmark.tags = newTags;
          elements.addTagInput.value = '';
          showBookmarkDetail(currentBookmark.id);
        }
      }
    }
  });

  // Detail modal - reading status
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentBookmark) return;
      await sendMessage({ action: 'updateBookmark', id: currentBookmark.id, data: { readStatus: btn.dataset.status } });
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBookmark.readStatus = btn.dataset.status;
    });
  });

  // Detail modal - priority
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentBookmark) return;
      await sendMessage({ action: 'updateBookmark', id: currentBookmark.id, data: { priority: btn.dataset.priority } });
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBookmark.priority = btn.dataset.priority;
    });
  });

  // Note modal
  elements.closeNoteModal?.addEventListener('click', () => {
    elements.noteModal.classList.add('hidden');
    pendingNoteData = null;
  });
  elements.confirmSaveWithNote?.addEventListener('click', saveBookmarkWithNote);

  // Batch modals
  elements.closeBatchTagModal?.addEventListener('click', () => elements.batchTagModal.classList.add('hidden'));
  elements.confirmBatchTag?.addEventListener('click', confirmBatchTags);
  elements.closeBatchMoveModal?.addEventListener('click', () => elements.batchMoveModal.classList.add('hidden'));
  elements.confirmBatchMove?.addEventListener('click', confirmBatchMove);

  // Duplicates modal
  elements.closeDuplicatesModal?.addEventListener('click', () => elements.duplicatesModal.classList.add('hidden'));

  // Changes modal
  elements.closeChangesModal?.addEventListener('click', () => elements.changesModal.classList.add('hidden'));

  // Snapshot modal
  elements.closeSnapshotModal?.addEventListener('click', () => elements.snapshotModal.classList.add('hidden'));
  elements.downloadSnapshot?.addEventListener('click', () => {
    const html = elements.snapshotFrame.srcdoc;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${currentBookmark?.title || 'page'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        if (modal === elements.noteModal) pendingNoteData = null;
      }
    });
  });
}

// Helper: Send message to background
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

// Helper: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
