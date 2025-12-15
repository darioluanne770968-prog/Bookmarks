// Background service worker
import { storage } from './storage.js';
import { aiService } from './ai-service.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Bookmarks installed');

  // Set up daily review alarm
  chrome.alarms.create('dailyReview', {
    periodInMinutes: 60 * 24 // Once per day
  });

  // Set up link health check alarm (weekly)
  chrome.alarms.create('linkHealthCheck', {
    periodInMinutes: 60 * 24 * 7 // Once per week
  });

  // Create context menu
  chrome.contextMenus.create({
    id: 'saveBookmark',
    title: '📌 保存到 AI Bookmarks',
    contexts: ['page', 'link']
  });

  chrome.contextMenus.create({
    id: 'saveWithNote',
    title: '📝 保存并添加笔记',
    contexts: ['page', 'link']
  });

  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['page', 'link']
  });

  chrome.contextMenus.create({
    id: 'findSimilar',
    title: '🔍 查找相似收藏',
    contexts: ['page']
  });

  // Initialize storage
  await storage.init();
  await aiService.init();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  const title = tab?.title || url;

  if (info.menuItemId === 'saveBookmark') {
    await quickSaveBookmark(url, title, tab);
  } else if (info.menuItemId === 'saveWithNote') {
    // Open popup with note dialog
    chrome.storage.local.set({ pendingNote: { url, title } });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'findSimilar') {
    chrome.storage.local.set({ findSimilarUrl: url });
    chrome.action.openPopup();
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await quickSaveBookmark(tab.url, tab.title, tab);
    }
  } else if (command === 'open-search') {
    chrome.action.openPopup();
  }
});

// Quick save without opening popup
async function quickSaveBookmark(url, title, tab) {
  try {
    await storage.init();
    await aiService.init();

    // Check if already exists
    const existing = await storage.getByUrl(url);
    if (existing) {
      showNotification('already-saved', '已收藏', '此页面已在收藏中');
      return;
    }

    // Try to get page content
    let pageData = { url, title, favicon: tab?.favIconUrl };
    try {
      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
        pageData = { ...pageData, ...response };
      }
    } catch (e) {
      console.log('Content extraction failed, using basic info');
    }

    await saveBookmark(pageData);
    showNotification('saved', '✅ 收藏成功', 'AI 已自动生成摘要和分类');
  } catch (error) {
    showNotification('error', '收藏失败', error.message);
  }
}

function showNotification(id, title, message) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

// Handle alarm for daily review
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReview') {
    await showReviewNotification();
  } else if (alarm.name === 'linkHealthCheck') {
    await checkLinksHealth();
  }
});

async function showReviewNotification() {
  const settings = await chrome.storage.sync.get(['reviewCount']);
  const count = settings.reviewCount || 3;

  await storage.init();
  const bookmarks = await storage.getForReview(count);

  if (bookmarks.length > 0) {
    chrome.notifications.create('review', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '📖 书签回顾时间',
      message: `有 ${bookmarks.length} 个收藏值得重温`
    });
  }
}

// Link health check
async function checkLinksHealth() {
  await storage.init();
  const bookmarks = await storage.getAll();
  let brokenCount = 0;

  for (const bookmark of bookmarks) {
    try {
      const response = await fetch(bookmark.url, { method: 'HEAD', mode: 'no-cors' });
      bookmark.linkStatus = 'ok';
      bookmark.lastChecked = Date.now();
    } catch (error) {
      bookmark.linkStatus = 'broken';
      bookmark.lastChecked = Date.now();
      brokenCount++;
    }
    await storage.update(bookmark);
  }

  if (brokenCount > 0) {
    chrome.notifications.create('broken-links', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '⚠️ 发现失效链接',
      message: `有 ${brokenCount} 个书签链接可能已失效`
    });
  }
}

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'review' || notificationId === 'broken-links') {
    chrome.action.openPopup();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sendResponse);
  return true; // Required for async response
});

async function handleMessage(request, sendResponse) {
  try {
    await storage.init();
    await aiService.init();

    switch (request.action) {
      case 'saveBookmark':
        const result = await saveBookmark(request.data);
        sendResponse({ success: true, data: result });
        break;

      case 'saveBookmarkWithNote':
        const resultWithNote = await saveBookmark(request.data, request.note);
        sendResponse({ success: true, data: resultWithNote });
        break;

      case 'updateNote':
        const bookmarkToUpdate = await storage.get(request.id);
        if (bookmarkToUpdate) {
          bookmarkToUpdate.note = request.note;
          await storage.update(bookmarkToUpdate);
        }
        sendResponse({ success: true });
        break;

      case 'getBookmarks':
        const bookmarks = await storage.getAll();
        sendResponse({ success: true, data: bookmarks });
        break;

      case 'getBookmark':
        const bookmark = await storage.get(request.id);
        sendResponse({ success: true, data: bookmark });
        break;

      case 'deleteBookmark':
        await storage.delete(request.id);
        sendResponse({ success: true });
        break;

      case 'search':
        const searchResults = await searchBookmarks(request.query);
        sendResponse({ success: true, data: searchResults });
        break;

      case 'getCategories':
        const categories = await storage.getCategories();
        sendResponse({ success: true, data: categories });
        break;

      case 'getByCategory':
        const filtered = await storage.getByCategory(request.category);
        sendResponse({ success: true, data: filtered });
        break;

      case 'getForReview':
        const forReview = await storage.getForReview(request.count || 3);
        sendResponse({ success: true, data: forReview });
        break;

      case 'markReviewed':
        await storage.markReviewed(request.id);
        sendResponse({ success: true });
        break;

      case 'setApiKey':
        aiService.setApiKey(request.key);
        sendResponse({ success: true });
        break;

      case 'getApiKey':
        const key = aiService.getApiKey();
        sendResponse({ success: true, data: key });
        break;

      case 'exportBookmarks':
        const exportData = await storage.export();
        sendResponse({ success: true, data: exportData });
        break;

      case 'importBookmarks':
        const importCount = await storage.import(request.data);
        sendResponse({ success: true, data: importCount });
        break;

      case 'importBrowserBookmarks':
        const browserImportCount = await importBrowserBookmarks();
        sendResponse({ success: true, data: browserImportCount });
        break;

      case 'getCount':
        const count = await storage.count();
        sendResponse({ success: true, data: count });
        break;

      case 'checkExists':
        const exists = await storage.getByUrl(request.url);
        sendResponse({ success: true, data: !!exists });
        break;

      case 'checkLinkHealth':
        const healthResult = await checkSingleLinkHealth(request.url);
        sendResponse({ success: true, data: healthResult });
        break;

      case 'checkAllLinksHealth':
        await checkLinksHealth();
        sendResponse({ success: true });
        break;

      case 'getBrokenLinks':
        const allBookmarks = await storage.getAll();
        const broken = allBookmarks.filter(b => b.linkStatus === 'broken');
        sendResponse({ success: true, data: broken });
        break;

      case 'getSimilarBookmarks':
        const similar = await findSimilarBookmarks(request.id, request.count || 5);
        sendResponse({ success: true, data: similar });
        break;

      case 'getStats':
        const stats = await getStatistics();
        sendResponse({ success: true, data: stats });
        break;

      case 'getPendingNote':
        const pending = await chrome.storage.local.get(['pendingNote']);
        await chrome.storage.local.remove(['pendingNote']);
        sendResponse({ success: true, data: pending.pendingNote });
        break;

      case 'getFindSimilarUrl':
        const similarUrl = await chrome.storage.local.get(['findSimilarUrl']);
        await chrome.storage.local.remove(['findSimilarUrl']);
        sendResponse({ success: true, data: similarUrl.findSimilarUrl });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function saveBookmark(data, note = '') {
  // Check if already exists
  const existing = await storage.getByUrl(data.url);
  if (existing) {
    throw new Error('此页面已收藏');
  }

  // Analyze with AI
  const analysis = await aiService.analyzeBookmark(
    data.title,
    data.content || data.description,
    data.url
  );

  // Generate embedding for semantic search
  const textForEmbedding = [
    data.title,
    analysis.summary,
    ...(analysis.keywords || [])
  ].join(' ');

  const embedding = await aiService.generateEmbedding(textForEmbedding);

  // Create bookmark object
  const bookmark = {
    url: data.url,
    title: data.title,
    favicon: data.favicon,
    summary: analysis.summary,
    category: analysis.category,
    keywords: analysis.keywords,
    whyRead: analysis.whyRead,
    embedding,
    note,
    linkStatus: 'ok',
    lastChecked: Date.now()
  };

  // Save to storage
  return await storage.add(bookmark);
}

async function searchBookmarks(query) {
  const bookmarks = await storage.getAll();

  if (bookmarks.length === 0) {
    return [];
  }

  // Check if we have embeddings (AI search available)
  const hasEmbeddings = bookmarks.some(b => b.embedding);

  if (hasEmbeddings && aiService.getApiKey()) {
    // Semantic search
    return await aiService.semanticSearch(query, bookmarks);
  } else {
    // Fallback to keyword search
    return aiService.keywordSearch(query, bookmarks);
  }
}

async function checkSingleLinkHealth(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return { status: 'ok' };
  } catch (error) {
    return { status: 'broken', error: error.message };
  }
}

async function findSimilarBookmarks(bookmarkId, count = 5) {
  const bookmark = await storage.get(bookmarkId);
  if (!bookmark || !bookmark.embedding) {
    return [];
  }

  const allBookmarks = await storage.getAll();
  const others = allBookmarks.filter(b => b.id !== bookmarkId && b.embedding);

  const results = others.map(b => ({
    bookmark: b,
    similarity: aiService.cosineSimilarity(bookmark.embedding, b.embedding)
  }));

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, count);
}

async function importBrowserBookmarks() {
  const browserBookmarks = await chrome.bookmarks.getTree();
  let importCount = 0;

  async function processNode(node) {
    if (node.url) {
      try {
        const existing = await storage.getByUrl(node.url);
        if (!existing) {
          await saveBookmark({
            url: node.url,
            title: node.title || node.url,
            favicon: '',
            content: '',
            description: ''
          });
          importCount++;
        }
      } catch (e) {
        console.warn('Failed to import:', node.url);
      }
    }

    if (node.children) {
      for (const child of node.children) {
        await processNode(child);
      }
    }
  }

  for (const root of browserBookmarks) {
    await processNode(root);
  }

  return importCount;
}

async function getStatistics() {
  const bookmarks = await storage.getAll();

  // Category distribution
  const categoryCount = {};
  bookmarks.forEach(b => {
    const cat = b.category || '未分类';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Time distribution (by month)
  const monthlyCount = {};
  bookmarks.forEach(b => {
    const date = new Date(b.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCount[key] = (monthlyCount[key] || 0) + 1;
  });

  // Link health
  const healthCount = {
    ok: bookmarks.filter(b => b.linkStatus === 'ok').length,
    broken: bookmarks.filter(b => b.linkStatus === 'broken').length,
    unchecked: bookmarks.filter(b => !b.linkStatus).length
  };

  // Review stats
  const reviewed = bookmarks.filter(b => b.lastReviewed).length;
  const neverReviewed = bookmarks.length - reviewed;

  // Top keywords
  const keywordCount = {};
  bookmarks.forEach(b => {
    (b.keywords || []).forEach(k => {
      keywordCount[k] = (keywordCount[k] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    total: bookmarks.length,
    categoryCount,
    monthlyCount,
    healthCount,
    reviewStats: { reviewed, neverReviewed },
    topKeywords
  };
}
