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

  // Initialize storage
  await storage.init();
  await aiService.init();
});

// Handle alarm for daily review
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReview') {
    await showReviewNotification();
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
      message: `有 ${bookmarks.length} 个收藏值得重温`,
      buttons: [{ title: '查看' }]
    });
  }
}

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'review') {
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

      case 'getCount':
        const count = await storage.count();
        sendResponse({ success: true, data: count });
        break;

      case 'checkExists':
        const exists = await storage.getByUrl(request.url);
        sendResponse({ success: true, data: !!exists });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function saveBookmark(data) {
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
    embedding
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
