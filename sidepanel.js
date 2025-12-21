// Side Panel Script for AI Bookmarks

let currentTab = null;
let currentBookmark = null;
let isSpeaking = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentPage();
  await loadInsights();
  await loadRecommendations();
  await loadRecentlyRead();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Search
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Quick actions
  document.getElementById('saveCurrentBtn').addEventListener('click', saveCurrentPage);
  document.getElementById('ttsBtn').addEventListener('click', toggleTTS);
  document.getElementById('translateBtn').addEventListener('click', translatePage);
  document.getElementById('keyPointsBtn').addEventListener('click', extractKeyPoints);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // RAG
  document.getElementById('ragAskBtn').addEventListener('click', askRAG);
  document.getElementById('ragQuery').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) askRAG();
  });
}

// Load current page info
async function loadCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    document.getElementById('currentTitle').textContent = tab.title || 'Unknown';
    document.getElementById('currentUrl').textContent = tab.url || '';

    // Check if bookmarked
    const response = await chrome.runtime.sendMessage({
      action: 'checkExists',
      url: tab.url
    });

    const statusDiv = document.getElementById('currentStatus');
    if (response.data) {
      statusDiv.innerHTML = '<span class="status-badge saved">已收藏</span>';
      document.getElementById('saveCurrentBtn').querySelector('.label').textContent = '已收藏';

      // Get bookmark details
      const bmResponse = await chrome.runtime.sendMessage({ action: 'getBookmarks' });
      currentBookmark = bmResponse.data.find(b => b.url === tab.url);

      if (currentBookmark) {
        // Show reading progress
        if (currentBookmark.readingProgress) {
          document.getElementById('progressBar').style.display = 'block';
          document.getElementById('progressFill').style.width = currentBookmark.readingProgress + '%';
        }

        // Show estimated reading time
        if (currentBookmark.estimatedReadTime) {
          statusDiv.innerHTML += `<span class="status-badge" style="background:#e3f2fd;color:#1565c0;">约 ${currentBookmark.estimatedReadTime} 分钟</span>`;
        }
      }
    } else {
      statusDiv.innerHTML = '<span class="status-badge not-saved">未收藏</span>';
    }
  } catch (error) {
    console.error('Failed to load current page:', error);
  }
}

// Load insights
async function loadInsights() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getReadingInsights' });
    if (response.success) {
      const insights = response.data;

      document.getElementById('totalCount').textContent = insights.summary.total;
      document.getElementById('readCount').textContent = insights.summary.read;
      document.getElementById('unreadCount').textContent = insights.summary.unread;
      document.getElementById('streakBadge').textContent = insights.streak.message;
    }
  } catch (error) {
    console.error('Failed to load insights:', error);
  }
}

// Load recommendations
async function loadRecommendations() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getRecommendations',
      count: 5
    });

    const container = document.getElementById('recommendationsList');

    if (response.success && response.data.length > 0) {
      container.innerHTML = response.data.map(bookmark => `
        <div class="recommendation-item" data-url="${bookmark.url}">
          <img src="${bookmark.favicon || 'icons/icon16.png'}" alt="" onerror="this.src='icons/icon16.png'">
          <div class="info">
            <div class="title">${escapeHtml(bookmark.title)}</div>
            <div class="meta">${bookmark.category || '未分类'}</div>
          </div>
          <span class="badge">推荐</span>
        </div>
      `).join('');

      // Add click handlers
      container.querySelectorAll('.recommendation-item').forEach(item => {
        item.addEventListener('click', () => {
          chrome.tabs.create({ url: item.dataset.url });
        });
      });
    } else {
      container.innerHTML = '<div class="empty-state"><div class="icon">📚</div><div>暂无推荐</div></div>';
    }
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    document.getElementById('recommendationsList').innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

// Load recently read
async function loadRecentlyRead() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getRecentlyRead',
      count: 10
    });

    const container = document.getElementById('recentList');

    if (response.success && response.data.length > 0) {
      container.innerHTML = response.data.map(bookmark => `
        <div class="bookmark-item" data-url="${bookmark.url}">
          <img src="${bookmark.favicon || 'icons/icon16.png'}" alt="" onerror="this.src='icons/icon16.png'">
          <div class="info">
            <div class="title">${escapeHtml(bookmark.title)}</div>
            <div class="meta">${formatDate(bookmark.readAt)}</div>
          </div>
          <div class="actions">
            <button data-action="open">打开</button>
          </div>
        </div>
      `).join('');

      // Add click handlers
      container.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          chrome.tabs.create({ url: item.dataset.url });
        });

        item.querySelector('[data-action="open"]').addEventListener('click', () => {
          chrome.tabs.create({ url: item.dataset.url });
        });
      });
    } else {
      container.innerHTML = '<div class="empty-state"><div class="icon">📖</div><div>暂无阅读记录</div></div>';
    }
  } catch (error) {
    console.error('Failed to load recently read:', error);
    document.getElementById('recentList').innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

// Switch tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Search
async function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const resultsSection = document.getElementById('searchResultsSection');
  const resultsContainer = document.getElementById('searchResults');

  resultsSection.style.display = 'block';
  resultsContainer.innerHTML = '<div class="loading">搜索中...</div>';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'search',
      query
    });

    if (response.success && response.data.length > 0) {
      resultsContainer.innerHTML = response.data.map(result => `
        <div class="bookmark-item" data-url="${result.bookmark.url}">
          <img src="${result.bookmark.favicon || 'icons/icon16.png'}" alt="" onerror="this.src='icons/icon16.png'">
          <div class="info">
            <div class="title">${escapeHtml(result.bookmark.title)}</div>
            <div class="meta">${Math.round(result.similarity * 100)}% 相关</div>
          </div>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', () => {
          chrome.tabs.create({ url: item.dataset.url });
        });
      });
    } else {
      resultsContainer.innerHTML = '<div class="empty-state">未找到相关结果</div>';
    }
  } catch (error) {
    resultsContainer.innerHTML = '<div class="empty-state">搜索失败</div>';
  }
}

// Save current page
async function saveCurrentPage() {
  if (!currentTab) return;

  try {
    const btn = document.getElementById('saveCurrentBtn');
    btn.querySelector('.label').textContent = '保存中...';

    // Extract content
    let content = '';
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content.js']
      });
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractContent' });
      content = response.content || '';
    } catch (e) {
      console.log('Content extraction failed');
    }

    // Save bookmark
    const response = await chrome.runtime.sendMessage({
      action: 'saveBookmark',
      data: {
        url: currentTab.url,
        title: currentTab.title,
        favicon: currentTab.favIconUrl,
        content
      }
    });

    if (response.success) {
      btn.querySelector('.icon').textContent = '✅';
      btn.querySelector('.label').textContent = '已收藏';
      document.getElementById('currentStatus').innerHTML = '<span class="status-badge saved">已收藏</span>';

      // Also get suggested tags
      const tagResponse = await chrome.runtime.sendMessage({
        action: 'suggestTags',
        title: currentTab.title,
        content
      });

      if (tagResponse.success && tagResponse.data.length > 0) {
        // Show suggested tags notification
        console.log('Suggested tags:', tagResponse.data);
      }
    } else {
      btn.querySelector('.label').textContent = response.error || '保存失败';
    }
  } catch (error) {
    console.error('Failed to save:', error);
    document.getElementById('saveCurrentBtn').querySelector('.label').textContent = '保存失败';
  }
}

// Toggle TTS
async function toggleTTS() {
  const btn = document.getElementById('ttsBtn');

  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    btn.querySelector('.icon').textContent = '🔊';
    btn.querySelector('.label').textContent = '朗读内容';
    return;
  }

  try {
    btn.querySelector('.icon').textContent = '⏸️';
    btn.querySelector('.label').textContent = '停止朗读';

    // Get page content
    let content = '';
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractContent' });
      content = response.content || '';
    } catch (e) {
      content = currentTab.title;
    }

    // Truncate for TTS (max ~5000 chars)
    content = content.substring(0, 5000);

    isSpeaking = true;
    chrome.tts.speak(content, {
      lang: 'zh-CN',
      rate: 1.0,
      onEvent: (event) => {
        if (event.type === 'end' || event.type === 'cancelled' || event.type === 'error') {
          isSpeaking = false;
          btn.querySelector('.icon').textContent = '🔊';
          btn.querySelector('.label').textContent = '朗读内容';
        }
      }
    });
  } catch (error) {
    console.error('TTS failed:', error);
    btn.querySelector('.label').textContent = '朗读失败';
    isSpeaking = false;
  }
}

// Translate page
async function translatePage() {
  const btn = document.getElementById('translateBtn');
  btn.querySelector('.label').textContent = '翻译中...';

  try {
    // Get page content
    let content = '';
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractContent' });
      content = response.content || '';
    } catch (e) {
      content = currentTab.title;
    }

    // Detect if it's Chinese and translate to English, or vice versa
    const isChinese = /[\u4e00-\u9fa5]/.test(content);
    const targetLang = isChinese ? 'en' : 'zh';

    const response = await chrome.runtime.sendMessage({
      action: 'translateContent',
      text: content.substring(0, 3000),
      targetLang
    });

    if (response.success) {
      // Show translation in an alert or inject into page
      alert(`翻译结果 (${targetLang}):\n\n${response.data.translated.substring(0, 1000)}...`);
    }

    btn.querySelector('.label').textContent = '翻译页面';
  } catch (error) {
    console.error('Translation failed:', error);
    btn.querySelector('.label').textContent = '翻译失败';
  }
}

// Extract key points
async function extractKeyPoints() {
  const btn = document.getElementById('keyPointsBtn');
  btn.querySelector('.label').textContent = '提取中...';

  try {
    if (!currentBookmark) {
      // Save first if not bookmarked
      await saveCurrentPage();
      await loadCurrentPage();
    }

    if (currentBookmark) {
      const response = await chrome.runtime.sendMessage({
        action: 'extractKeyPoints',
        id: currentBookmark.id
      });

      if (response.success && response.data.length > 0) {
        const points = response.data.map((p, i) => `${i + 1}. ${p}`).join('\n');
        alert(`核心要点:\n\n${points}`);
      } else {
        alert('无法提取要点，请确保文章内容足够');
      }
    }

    btn.querySelector('.label').textContent = '提取要点';
  } catch (error) {
    console.error('Key points extraction failed:', error);
    btn.querySelector('.label').textContent = '提取失败';
  }
}

// RAG Query
async function askRAG() {
  const query = document.getElementById('ragQuery').value.trim();
  if (!query) return;

  const answerDiv = document.getElementById('ragAnswer');
  answerDiv.classList.add('show');
  answerDiv.querySelector('.answer-text').textContent = '思考中...';
  answerDiv.querySelector('.rag-sources').innerHTML = '';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ragQuery',
      query
    });

    if (response.success) {
      const data = response.data;
      answerDiv.querySelector('.answer-text').textContent = data.answer;

      if (data.sources && data.sources.length > 0) {
        answerDiv.querySelector('.rag-sources').innerHTML = '来源: ' +
          data.sources.map(s => `<a href="${s.url}" target="_blank">${escapeHtml(s.title)}</a>`).join(', ');
      }
    } else {
      answerDiv.querySelector('.answer-text').textContent = '查询失败: ' + response.error;
    }
  } catch (error) {
    answerDiv.querySelector('.answer-text').textContent = '查询失败: ' + error.message;
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';

  return date.toLocaleDateString('zh-CN');
}

// Track reading progress on scroll
window.addEventListener('message', (event) => {
  if (event.data.type === 'readingProgress' && currentBookmark) {
    chrome.runtime.sendMessage({
      action: 'updateReadingProgress',
      id: currentBookmark.id,
      progress: event.data.progress
    });

    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('progressFill').style.width = event.data.progress + '%';
  }
});
