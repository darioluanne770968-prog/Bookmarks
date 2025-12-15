// Popup UI Logic

// State
let currentBookmarks = [];
let currentBookmark = null;
let pendingNoteData = null;

// DOM Elements
const elements = {
  // Quick save
  favicon: document.getElementById('favicon'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  saveBtn: document.getElementById('saveBtn'),
  saveWithNoteBtn: document.getElementById('saveWithNoteBtn'),
  saveStatus: document.getElementById('saveStatus'),

  // Header
  darkModeBtn: document.getElementById('darkModeBtn'),

  // Tabs
  tabs: document.querySelectorAll('.tab'),
  searchTab: document.getElementById('searchTab'),
  bookmarksTab: document.getElementById('bookmarksTab'),
  reviewTab: document.getElementById('reviewTab'),
  statsTab: document.getElementById('statsTab'),

  // Search
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),

  // Bookmarks
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  bookmarkCount: document.getElementById('bookmarkCount'),
  bookmarksList: document.getElementById('bookmarksList'),

  // Review
  reviewList: document.getElementById('reviewList'),

  // Stats
  totalBookmarks: document.getElementById('totalBookmarks'),
  reviewedCount: document.getElementById('reviewedCount'),
  brokenCount: document.getElementById('brokenCount'),
  categoryStats: document.getElementById('categoryStats'),
  keywordCloud: document.getElementById('keywordCloud'),
  trendChart: document.getElementById('trendChart'),
  checkLinksBtn: document.getElementById('checkLinksBtn'),

  // Settings modal
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettings: document.getElementById('closeSettings'),
  apiKey: document.getElementById('apiKey'),
  reviewTime: document.getElementById('reviewTime'),
  reviewCount: document.getElementById('reviewCount'),
  saveSettings: document.getElementById('saveSettings'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  importBrowserBtn: document.getElementById('importBrowserBtn'),

  // Detail modal
  detailModal: document.getElementById('detailModal'),
  closeDetail: document.getElementById('closeDetail'),
  detailTitle: document.getElementById('detailTitle'),
  detailSummary: document.getElementById('detailSummary'),
  detailWhyRead: document.getElementById('detailWhyRead'),
  detailCategory: document.getElementById('detailCategory'),
  detailKeywords: document.getElementById('detailKeywords'),
  detailNote: document.getElementById('detailNote'),
  saveNoteBtn: document.getElementById('saveNoteBtn'),
  detailLinkStatus: document.getElementById('detailLinkStatus'),
  checkLinkBtn: document.getElementById('checkLinkBtn'),
  detailDate: document.getElementById('detailDate'),
  similarBookmarks: document.getElementById('similarBookmarks'),
  openBookmark: document.getElementById('openBookmark'),
  deleteBookmark: document.getElementById('deleteBookmark'),

  // Note modal
  noteModal: document.getElementById('noteModal'),
  closeNoteModal: document.getElementById('closeNoteModal'),
  notePageTitle: document.getElementById('notePageTitle'),
  saveNote: document.getElementById('saveNote'),
  confirmSaveWithNote: document.getElementById('confirmSaveWithNote')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadDarkMode();
  await loadCurrentPage();
  await loadSettings();
  await loadCategories();
  await loadBookmarks();
  await loadReviewItems();
  await checkPendingActions();
  setupEventListeners();
}

// Check for pending actions from context menu
async function checkPendingActions() {
  // Check for pending note
  const pendingResponse = await sendMessage({ action: 'getPendingNote' });
  if (pendingResponse.data) {
    pendingNoteData = pendingResponse.data;
    elements.notePageTitle.textContent = pendingResponse.data.title;
    elements.noteModal.classList.remove('hidden');
  }

  // Check for find similar
  const similarResponse = await sendMessage({ action: 'getFindSimilarUrl' });
  if (similarResponse.data) {
    // Switch to search tab and search
    switchToTab('search');
    elements.searchInput.value = similarResponse.data;
    search();
  }
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

      // Check if already saved
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

    const settings = await chrome.storage.sync.get(['reviewTime', 'reviewCount']);
    if (settings.reviewTime) elements.reviewTime.value = settings.reviewTime;
    if (settings.reviewCount) elements.reviewCount.value = settings.reviewCount;
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

// Load all bookmarks
async function loadBookmarks(category = '', status = '') {
  try {
    let response;
    if (category) {
      response = await sendMessage({ action: 'getByCategory', category });
    } else {
      response = await sendMessage({ action: 'getBookmarks' });
    }

    currentBookmarks = response.data || [];

    // Filter by status
    if (status) {
      currentBookmarks = currentBookmarks.filter(b => b.linkStatus === status);
    }

    elements.bookmarkCount.textContent = `${currentBookmarks.length} 个书签`;

    renderBookmarksList(currentBookmarks, elements.bookmarksList);
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
  }
}

// Load review items
async function loadReviewItems() {
  try {
    const settings = await chrome.storage.sync.get(['reviewCount']);
    const count = settings.reviewCount || 3;

    const response = await sendMessage({ action: 'getForReview', count });
    const items = response.data || [];

    if (items.length === 0) {
      elements.reviewList.innerHTML = `
        <div class="empty-state">
          <div class="icon">📚</div>
          <p>还没有需要回顾的书签</p>
        </div>
      `;
    } else {
      renderBookmarksList(items, elements.reviewList, true);
    }
  } catch (error) {
    console.error('Failed to load review items:', error);
  }
}

// Load statistics
async function loadStatistics() {
  try {
    const response = await sendMessage({ action: 'getStats' });
    const stats = response.data;

    if (!stats) return;

    // Update summary cards
    elements.totalBookmarks.textContent = stats.total;
    elements.reviewedCount.textContent = stats.reviewStats.reviewed;
    elements.brokenCount.textContent = stats.healthCount.broken;

    // Category bars
    const maxCount = Math.max(...Object.values(stats.categoryCount), 1);
    elements.categoryStats.innerHTML = Object.entries(stats.categoryCount)
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
    elements.keywordCloud.innerHTML = stats.topKeywords
      .map(({ keyword, count }) => `
        <span class="keyword-item">${keyword} (${count})</span>
      `).join('');

    // Trend chart
    const months = Object.entries(stats.monthlyCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const maxMonthly = Math.max(...months.map(m => m[1]), 1);
    elements.trendChart.innerHTML = months
      .map(([month, count]) => `
        <div class="trend-bar" style="height: ${(count / maxMonthly) * 100}%" data-label="${month}: ${count}"></div>
      `).join('');

  } catch (error) {
    console.error('Failed to load statistics:', error);
  }
}

// Render bookmarks list
function renderBookmarksList(bookmarks, container, isReview = false) {
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

    return `
      <div class="bookmark-card ${isBroken ? 'broken' : ''}" data-id="${bookmark.id}">
        <img class="favicon" src="${bookmark.favicon || ''}" alt="" onerror="this.style.display='none'">
        <div class="info">
          <div class="title">${escapeHtml(bookmark.title)}</div>
          <div class="summary">${escapeHtml(bookmark.summary || '')}</div>
          <div class="meta">
            ${bookmark.category ? `<span class="category-tag">${bookmark.category}</span>` : ''}
            <span class="date-tag">${date}</span>
            ${hasNote ? '<span class="note-indicator">📝</span>' : ''}
            ${isBroken ? '<span class="broken-indicator">⚠️ 失效</span>' : ''}
            ${similarity}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', () => showBookmarkDetail(card.dataset.id));
  });
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

    // Link status
    const status = currentBookmark.linkStatus || 'unchecked';
    elements.detailLinkStatus.className = `link-status ${status}`;
    elements.detailLinkStatus.textContent = status === 'ok' ? '正常' : status === 'broken' ? '失效' : '未检查';

    // Keywords
    const keywords = currentBookmark.keywords || [];
    elements.detailKeywords.innerHTML = keywords.length > 0
      ? keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')
      : '<span class="keyword-tag">无关键词</span>';

    // Load similar bookmarks
    await loadSimilarBookmarks(id);

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

    // Add click handlers
    elements.similarBookmarks.querySelectorAll('.similar-item').forEach(item => {
      item.addEventListener('click', () => showBookmarkDetail(item.dataset.id));
    });
  } catch (error) {
    console.error('Failed to load similar bookmarks:', error);
  }
}

// Save bookmark
async function saveBookmark(withNote = false) {
  if (withNote) {
    // Open note modal
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

    // Extract content from page
    let pageData;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
    } catch (e) {
      // Fallback if content script fails
      pageData = {
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl,
        content: '',
        description: ''
      };
    }

    // Save via background
    const response = await sendMessage({
      action: 'saveBookmark',
      data: pageData
    });

    if (response.success) {
      showStatus('success', '收藏成功！AI 已生成摘要');
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

    // Extract content from page
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

  elements.searchResults.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const response = await sendMessage({ action: 'search', query });
    const results = response.data || [];

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
  }
}

// Check link health
async function checkLinkHealth() {
  if (!currentBookmark) return;

  elements.detailLinkStatus.className = 'link-status checking';
  elements.detailLinkStatus.textContent = '检查中...';

  try {
    const response = await sendMessage({ action: 'checkLinkHealth', url: currentBookmark.url });
    const status = response.data.status;

    elements.detailLinkStatus.className = `link-status ${status}`;
    elements.detailLinkStatus.textContent = status === 'ok' ? '正常' : '失效';
  } catch (error) {
    elements.detailLinkStatus.className = 'link-status broken';
    elements.detailLinkStatus.textContent = '检查失败';
  }
}

// Check all links
async function checkAllLinks() {
  elements.checkLinksBtn.disabled = true;
  elements.checkLinksBtn.textContent = '检查中...';

  try {
    await sendMessage({ action: 'checkAllLinksHealth' });
    await loadStatistics();
    showStatus('success', '链接检查完成');
  } catch (error) {
    showStatus('error', '链接检查失败');
  } finally {
    elements.checkLinksBtn.disabled = false;
    elements.checkLinksBtn.textContent = '🔗 检查所有链接';
  }
}

// Import browser bookmarks
async function importBrowserBookmarks() {
  elements.importBrowserBtn.disabled = true;
  elements.importBrowserBtn.textContent = '导入中...';

  try {
    const response = await sendMessage({ action: 'importBrowserBookmarks' });
    if (response.success) {
      showStatus('success', `成功导入 ${response.data} 个书签`);
      await loadBookmarks();
      await loadCategories();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    showStatus('error', error.message || '导入失败');
  } finally {
    elements.importBrowserBtn.disabled = false;
    elements.importBrowserBtn.textContent = '🌐 导入浏览器书签';
  }
}

// Save note
async function saveNote() {
  if (!currentBookmark) return;

  const note = elements.detailNote.value;

  try {
    await sendMessage({ action: 'updateNote', id: currentBookmark.id, note });
    showStatus('success', '笔记已保存');
  } catch (error) {
    showStatus('error', '保存失败');
  }
}

// Switch tab
function switchToTab(tabName) {
  elements.tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabName + 'Tab').classList.add('active');

  // Load stats when switching to stats tab
  if (tabName === 'stats') {
    loadStatistics();
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

  // Save button
  elements.saveBtn.addEventListener('click', () => saveBookmark(false));
  elements.saveWithNoteBtn.addEventListener('click', () => saveBookmark(true));

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchToTab(tab.dataset.tab);
    });
  });

  // Search
  elements.searchBtn.addEventListener('click', search);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
  });

  // Filters
  elements.categoryFilter.addEventListener('change', () => {
    loadBookmarks(elements.categoryFilter.value, elements.statusFilter.value);
  });
  elements.statusFilter.addEventListener('change', () => {
    loadBookmarks(elements.categoryFilter.value, elements.statusFilter.value);
  });

  // Stats
  elements.checkLinksBtn.addEventListener('click', checkAllLinks);

  // Settings modal
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });
  elements.closeSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  // Save settings
  elements.saveSettings.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    const reviewTime = elements.reviewTime.value;
    const reviewCount = parseInt(elements.reviewCount.value) || 3;

    if (apiKey) {
      await sendMessage({ action: 'setApiKey', key: apiKey });
    }

    await chrome.storage.sync.set({ reviewTime, reviewCount });
    showStatus('success', '设置已保存');
    elements.settingsModal.classList.add('hidden');
  });

  // Export
  elements.exportBtn.addEventListener('click', async () => {
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

  // Import
  elements.importBtn.addEventListener('click', () => {
    elements.importFile.click();
  });
  elements.importFile.addEventListener('change', async (e) => {
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

  // Import browser bookmarks
  elements.importBrowserBtn.addEventListener('click', importBrowserBookmarks);

  // Detail modal
  elements.closeDetail.addEventListener('click', () => {
    elements.detailModal.classList.add('hidden');
  });

  // Save note
  elements.saveNoteBtn.addEventListener('click', saveNote);

  // Check link
  elements.checkLinkBtn.addEventListener('click', checkLinkHealth);

  // Open bookmark
  elements.openBookmark.addEventListener('click', () => {
    if (currentBookmark) {
      chrome.tabs.create({ url: currentBookmark.url });
    }
  });

  // Delete bookmark
  elements.deleteBookmark.addEventListener('click', async () => {
    if (currentBookmark && confirm('确定要删除这个书签吗？')) {
      await sendMessage({ action: 'deleteBookmark', id: currentBookmark.id });
      elements.detailModal.classList.add('hidden');
      await loadBookmarks();
      await loadCategories();
      await loadReviewItems();
    }
  });

  // Note modal
  elements.closeNoteModal.addEventListener('click', () => {
    elements.noteModal.classList.add('hidden');
    pendingNoteData = null;
  });
  elements.confirmSaveWithNote.addEventListener('click', saveBookmarkWithNote);

  // Close modals on outside click
  [elements.settingsModal, elements.detailModal, elements.noteModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        if (modal === elements.noteModal) {
          pendingNoteData = null;
        }
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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
