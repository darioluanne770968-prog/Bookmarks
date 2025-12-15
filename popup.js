// Popup UI Logic

// State
let currentBookmarks = [];
let currentBookmark = null;

// DOM Elements
const elements = {
  // Quick save
  favicon: document.getElementById('favicon'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  saveBtn: document.getElementById('saveBtn'),
  saveStatus: document.getElementById('saveStatus'),

  // Tabs
  tabs: document.querySelectorAll('.tab'),
  searchTab: document.getElementById('searchTab'),
  bookmarksTab: document.getElementById('bookmarksTab'),
  reviewTab: document.getElementById('reviewTab'),

  // Search
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),

  // Bookmarks
  categoryFilter: document.getElementById('categoryFilter'),
  bookmarkCount: document.getElementById('bookmarkCount'),
  bookmarksList: document.getElementById('bookmarksList'),

  // Review
  reviewList: document.getElementById('reviewList'),

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

  // Detail modal
  detailModal: document.getElementById('detailModal'),
  closeDetail: document.getElementById('closeDetail'),
  detailTitle: document.getElementById('detailTitle'),
  detailSummary: document.getElementById('detailSummary'),
  detailCategory: document.getElementById('detailCategory'),
  detailKeywords: document.getElementById('detailKeywords'),
  detailDate: document.getElementById('detailDate'),
  openBookmark: document.getElementById('openBookmark'),
  deleteBookmark: document.getElementById('deleteBookmark')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadCurrentPage();
  await loadSettings();
  await loadCategories();
  await loadBookmarks();
  await loadReviewItems();
  setupEventListeners();
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
async function loadBookmarks(category = '') {
  try {
    let response;
    if (category) {
      response = await sendMessage({ action: 'getByCategory', category });
    } else {
      response = await sendMessage({ action: 'getBookmarks' });
    }

    currentBookmarks = response.data || [];
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

    return `
      <div class="bookmark-card" data-id="${bookmark.id}">
        <img class="favicon" src="${bookmark.favicon || ''}" alt="" onerror="this.style.display='none'">
        <div class="info">
          <div class="title">${escapeHtml(bookmark.title)}</div>
          <div class="summary">${escapeHtml(bookmark.summary || '')}</div>
          <div class="meta">
            ${bookmark.category ? `<span class="category-tag">${bookmark.category}</span>` : ''}
            <span class="date-tag">${date}</span>
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
    elements.detailCategory.textContent = currentBookmark.category || '未分类';
    elements.detailDate.textContent = new Date(currentBookmark.createdAt).toLocaleString('zh-CN');

    // Keywords
    const keywords = currentBookmark.keywords || [];
    elements.detailKeywords.innerHTML = keywords.length > 0
      ? keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')
      : '<span class="keyword-tag">无关键词</span>';

    elements.detailModal.classList.remove('hidden');

    // Mark as reviewed
    await sendMessage({ action: 'markReviewed', id });
  } catch (error) {
    console.error('Failed to show bookmark detail:', error);
  }
}

// Save bookmark
async function saveBookmark() {
  elements.saveBtn.disabled = true;
  showStatus('loading', '正在分析页面...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Extract content from page
    let pageData;
    try {
      const [result] = await chrome.scripting.executeScript({
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

// Show status message
function showStatus(type, message) {
  elements.saveStatus.className = `status ${type}`;
  elements.saveStatus.textContent = message;
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  elements.saveBtn.addEventListener('click', saveBookmark);

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const targetId = tab.dataset.tab + 'Tab';
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Search
  elements.searchBtn.addEventListener('click', search);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
  });

  // Category filter
  elements.categoryFilter.addEventListener('change', () => {
    loadBookmarks(elements.categoryFilter.value);
  });

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

  // Detail modal
  elements.closeDetail.addEventListener('click', () => {
    elements.detailModal.classList.add('hidden');
  });

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

  // Close modals on outside click
  [elements.settingsModal, elements.detailModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
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
