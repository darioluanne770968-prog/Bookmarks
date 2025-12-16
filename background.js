// Background service worker with advanced features
import { storage } from './storage.js';
import { aiService } from './ai-service.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Bookmarks v2.0 installed');

  // Set up alarms
  chrome.alarms.create('dailyReview', { periodInMinutes: 60 * 24 });
  chrome.alarms.create('linkHealthCheck', { periodInMinutes: 60 * 24 * 7 });
  chrome.alarms.create('contentChangeCheck', { periodInMinutes: 60 * 24 }); // Daily content check

  // Create context menus
  chrome.contextMenus.removeAll(() => {
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
      id: 'saveHighlight',
      title: '✨ 保存选中文字为高亮',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'separator1',
      type: 'separator',
      contexts: ['page', 'link', 'selection']
    });

    chrome.contextMenus.create({
      id: 'findSimilar',
      title: '🔍 查找相似收藏',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'saveSnapshot',
      title: '📸 保存网页快照',
      contexts: ['page']
    });
  });

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
    chrome.storage.local.set({ pendingNote: { url, title } });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'saveHighlight') {
    await saveHighlight(info.selectionText, url, title, tab);
  } else if (info.menuItemId === 'findSimilar') {
    chrome.storage.local.set({ findSimilarUrl: url });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'saveSnapshot') {
    await savePageSnapshot(url, tab);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await quickSaveBookmark(tab.url, tab.title, tab);
  } else if (command === 'open-search') {
    chrome.action.openPopup();
  }
});

// Quick save
async function quickSaveBookmark(url, title, tab) {
  try {
    await storage.init();
    await aiService.init();

    const existing = await storage.getByUrl(url);
    if (existing) {
      showNotification('already-saved', '已收藏', '此页面已在收藏中');
      return;
    }

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
      console.log('Content extraction failed');
    }

    await saveBookmark(pageData);
    showNotification('saved', '✅ 收藏成功', 'AI 已自动生成摘要和分类');
  } catch (error) {
    showNotification('error', '收藏失败', error.message);
  }
}

// Save highlight
async function saveHighlight(text, url, title, tab) {
  try {
    await storage.init();

    let bookmark = await storage.getByUrl(url);

    // If bookmark doesn't exist, create it first
    if (!bookmark) {
      await quickSaveBookmark(url, title, tab);
      bookmark = await storage.getByUrl(url);
    }

    if (bookmark) {
      await storage.addHighlight({
        bookmarkId: bookmark.id,
        text,
        url,
        note: ''
      });
      showNotification('highlight-saved', '✨ 高亮已保存', text.substring(0, 50) + '...');
    }
  } catch (error) {
    showNotification('error', '保存失败', error.message);
  }
}

// Save page snapshot
async function savePageSnapshot(url, tab) {
  try {
    await storage.init();

    let bookmark = await storage.getByUrl(url);
    if (!bookmark) {
      showNotification('error', '请先收藏', '需要先收藏页面才能保存快照');
      return;
    }

    // Get page content
    let content = '';
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractFullContent' });
      content = response.content || response.html || '';
    } catch (e) {
      content = `无法获取页面内容: ${e.message}`;
    }

    await storage.addSnapshot({
      bookmarkId: bookmark.id,
      url,
      title: tab.title,
      content,
      html: content
    });

    showNotification('snapshot-saved', '📸 快照已保存', '可在书签详情中查看');
  } catch (error) {
    showNotification('error', '保存失败', error.message);
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

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReview') {
    await showReviewNotification();
  } else if (alarm.name === 'linkHealthCheck') {
    await checkLinksHealth();
  } else if (alarm.name === 'contentChangeCheck') {
    await checkContentChanges();
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

async function checkLinksHealth() {
  await storage.init();
  const bookmarks = await storage.getAll();
  let brokenCount = 0;

  for (const bookmark of bookmarks) {
    try {
      await fetch(bookmark.url, { method: 'HEAD', mode: 'no-cors' });
      bookmark.linkStatus = 'ok';
    } catch (error) {
      bookmark.linkStatus = 'broken';
      brokenCount++;
    }
    bookmark.lastChecked = Date.now();
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

async function checkContentChanges() {
  await storage.init();
  const bookmarks = await storage.getAll();
  let changedCount = 0;

  for (const bookmark of bookmarks) {
    if (!bookmark.contentHash) continue;

    try {
      const response = await fetch(bookmark.url);
      const text = await response.text();
      const newHash = hashCode(text.substring(0, 10000));

      if (bookmark.contentHash !== newHash) {
        bookmark.contentChanged = true;
        bookmark.lastContentCheck = Date.now();
        changedCount++;
      }
      await storage.update(bookmark);
    } catch (e) {
      // Ignore fetch errors
    }
  }

  if (changedCount > 0) {
    chrome.notifications.create('content-changed', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '📝 内容更新',
      message: `有 ${changedCount} 个收藏的网页内容已更新`
    });
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.action.openPopup();
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sendResponse);
  return true;
});

async function handleMessage(request, sendResponse) {
  try {
    await storage.init();
    await aiService.init();

    switch (request.action) {
      // ==================== BOOKMARKS ====================
      case 'saveBookmark':
        const result = await saveBookmark(request.data);
        sendResponse({ success: true, data: result });
        break;

      case 'saveBookmarkWithNote':
        const resultWithNote = await saveBookmark(request.data, request.note);
        sendResponse({ success: true, data: resultWithNote });
        break;

      case 'getBookmarks':
        const bookmarks = await storage.getAll();
        sendResponse({ success: true, data: bookmarks });
        break;

      case 'getBookmark':
        const bookmark = await storage.get(request.id);
        sendResponse({ success: true, data: bookmark });
        break;

      case 'updateBookmark':
        await storage.update(request.data);
        sendResponse({ success: true });
        break;

      case 'deleteBookmark':
        await storage.delete(request.id);
        sendResponse({ success: true });
        break;

      case 'deleteMultiple':
        await storage.deleteMultiple(request.ids);
        sendResponse({ success: true });
        break;

      case 'batchUpdate':
        await storage.batchUpdate(request.ids, request.updates);
        sendResponse({ success: true });
        break;

      case 'checkExists':
        const exists = await storage.getByUrl(request.url);
        sendResponse({ success: true, data: !!exists });
        break;

      // ==================== SEARCH ====================
      case 'search':
        const searchResults = await searchBookmarks(request.query);
        sendResponse({ success: true, data: searchResults });
        break;

      case 'fullTextSearch':
        const ftResults = await storage.fullTextSearch(request.query);
        sendResponse({ success: true, data: ftResults });
        break;

      case 'aiSearch':
        const aiResults = await aiConversationalSearch(request.query);
        sendResponse({ success: true, data: aiResults });
        break;

      // ==================== CATEGORIES & TAGS ====================
      case 'getCategories':
        const categories = await storage.getCategories();
        sendResponse({ success: true, data: categories });
        break;

      case 'getByCategory':
        const filtered = await storage.getByCategory(request.category);
        sendResponse({ success: true, data: filtered });
        break;

      case 'getAllTags':
        const tags = await storage.getAllTags();
        sendResponse({ success: true, data: tags });
        break;

      case 'getByTag':
        const tagFiltered = await storage.getByTag(request.tag);
        sendResponse({ success: true, data: tagFiltered });
        break;

      case 'addTag':
        await storage.addTagToBookmark(request.bookmarkId, request.tag);
        sendResponse({ success: true });
        break;

      case 'removeTag':
        await storage.removeTagFromBookmark(request.bookmarkId, request.tag);
        sendResponse({ success: true });
        break;

      case 'createTag':
        const newTag = await storage.addTag(request.tag);
        sendResponse({ success: true, data: newTag });
        break;

      case 'getAllTagObjects':
        const tagObjects = await storage.getAllTagObjects();
        sendResponse({ success: true, data: tagObjects });
        break;

      // ==================== FOLDERS ====================
      case 'getFolders':
        const folders = await storage.getAllFolders();
        sendResponse({ success: true, data: folders });
        break;

      case 'createFolder':
        const newFolder = await storage.addFolder(request.folder);
        sendResponse({ success: true, data: newFolder });
        break;

      case 'updateFolder':
        await storage.updateFolder(request.folder);
        sendResponse({ success: true });
        break;

      case 'deleteFolder':
        await storage.deleteFolder(request.id);
        sendResponse({ success: true });
        break;

      case 'getByFolder':
        const folderBookmarks = await storage.getByFolder(request.folderId);
        sendResponse({ success: true, data: folderBookmarks });
        break;

      case 'moveToFolder':
        await storage.moveToFolder(request.bookmarkId, request.folderId);
        sendResponse({ success: true });
        break;

      // ==================== READ STATUS ====================
      case 'updateReadStatus':
        await storage.updateReadStatus(request.id, request.status);
        sendResponse({ success: true });
        break;

      case 'getByReadStatus':
        const statusBookmarks = await storage.getByReadStatus(request.status);
        sendResponse({ success: true, data: statusBookmarks });
        break;

      case 'getReadingQueue':
        const queue = await storage.getReadingQueue();
        sendResponse({ success: true, data: queue });
        break;

      case 'updatePriority':
        await storage.updatePriority(request.id, request.priority);
        sendResponse({ success: true });
        break;

      // ==================== REVIEW ====================
      case 'getForReview':
        const forReview = await storage.getForReview(request.count || 3);
        sendResponse({ success: true, data: forReview });
        break;

      case 'markReviewed':
        await storage.markReviewed(request.id);
        sendResponse({ success: true });
        break;

      // ==================== HIGHLIGHTS ====================
      case 'addHighlight':
        const highlight = await storage.addHighlight(request.highlight);
        sendResponse({ success: true, data: highlight });
        break;

      case 'getHighlights':
        const highlights = await storage.getHighlightsByBookmark(request.bookmarkId);
        sendResponse({ success: true, data: highlights });
        break;

      case 'getAllHighlights':
        const allHighlights = await storage.getAllHighlights();
        sendResponse({ success: true, data: allHighlights });
        break;

      case 'deleteHighlight':
        await storage.deleteHighlight(request.id);
        sendResponse({ success: true });
        break;

      // ==================== SNAPSHOTS ====================
      case 'saveSnapshot':
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await savePageSnapshot(request.url || tab.url, tab);
        sendResponse({ success: true });
        break;

      case 'getSnapshots':
        const snapshots = await storage.getSnapshotsByBookmark(request.bookmarkId);
        sendResponse({ success: true, data: snapshots });
        break;

      case 'getLatestSnapshot':
        const latest = await storage.getLatestSnapshot(request.bookmarkId);
        sendResponse({ success: true, data: latest });
        break;

      case 'deleteSnapshot':
        await storage.deleteSnapshot(request.id);
        sendResponse({ success: true });
        break;

      // ==================== DUPLICATES ====================
      case 'findDuplicates':
        const duplicates = await storage.findDuplicates();
        sendResponse({ success: true, data: duplicates });
        break;

      case 'findSimilarByEmbedding':
        const similar = await findSimilarBookmarks(request.id, request.count || 5);
        sendResponse({ success: true, data: similar });
        break;

      // ==================== TIMELINE ====================
      case 'getTimeline':
        const timeline = await storage.getTimeline();
        sendResponse({ success: true, data: timeline });
        break;

      // ==================== EXPORT/IMPORT ====================
      case 'exportBookmarks':
        const exportData = await storage.export();
        sendResponse({ success: true, data: exportData });
        break;

      case 'exportForNotion':
        const notionExport = await storage.exportForNotion();
        sendResponse({ success: true, data: notionExport });
        break;

      case 'exportForObsidian':
        const obsidianExport = await storage.exportForObsidian();
        sendResponse({ success: true, data: obsidianExport });
        break;

      case 'importBookmarks':
        const importCount = await storage.import(request.data);
        sendResponse({ success: true, data: importCount });
        break;

      case 'importBrowserBookmarks':
        const browserImportCount = await importBrowserBookmarks();
        sendResponse({ success: true, data: browserImportCount });
        break;

      // ==================== LINK HEALTH ====================
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

      // ==================== STATS ====================
      case 'getStats':
        const stats = await getStatistics();
        sendResponse({ success: true, data: stats });
        break;

      case 'getCount':
        const count = await storage.count();
        sendResponse({ success: true, data: count });
        break;

      // ==================== SETTINGS ====================
      case 'setApiKey':
        aiService.setApiKey(request.key);
        sendResponse({ success: true });
        break;

      case 'getApiKey':
        const key = aiService.getApiKey();
        sendResponse({ success: true, data: key });
        break;

      case 'updateNote':
        const bm = await storage.get(request.id);
        if (bm) {
          bm.note = request.note;
          await storage.update(bm);
        }
        sendResponse({ success: true });
        break;

      // ==================== PENDING ACTIONS ====================
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

      // ==================== SHARE ====================
      case 'generateShareData':
        const shareData = await generateShareData(request.ids);
        sendResponse({ success: true, data: shareData });
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
  const existing = await storage.getByUrl(data.url);
  if (existing) {
    throw new Error('此页面已收藏');
  }

  const analysis = await aiService.analyzeBookmark(
    data.title,
    data.content || data.description,
    data.url
  );

  const textForEmbedding = [
    data.title,
    analysis.summary,
    ...(analysis.keywords || [])
  ].join(' ');

  const embedding = await aiService.generateEmbedding(textForEmbedding);
  const contentHash = hashCode((data.content || '').substring(0, 10000));

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
    lastChecked: Date.now(),
    fullContent: (data.content || '').substring(0, 50000),
    contentHash,
    tags: [],
    folderId: null,
    readStatus: 'unread',
    priority: 0
  };

  return await storage.add(bookmark);
}

async function searchBookmarks(query) {
  const bookmarks = await storage.getAll();
  if (bookmarks.length === 0) return [];

  const hasEmbeddings = bookmarks.some(b => b.embedding);

  if (hasEmbeddings && aiService.getApiKey()) {
    return await aiService.semanticSearch(query, bookmarks);
  } else {
    return aiService.keywordSearch(query, bookmarks);
  }
}

async function aiConversationalSearch(query) {
  const bookmarks = await storage.getAll();
  if (!aiService.getApiKey()) {
    return { answer: '需要配置 API Key 才能使用 AI 对话搜索', bookmarks: [] };
  }

  // Use AI to understand the query and find relevant bookmarks
  const searchResults = await aiService.semanticSearch(query, bookmarks, 10);

  // Generate a conversational response
  const answer = await aiService.generateSearchAnswer(query, searchResults);

  return {
    answer,
    bookmarks: searchResults
  };
}

async function findSimilarBookmarks(bookmarkId, count = 5) {
  const bookmark = await storage.get(bookmarkId);
  if (!bookmark || !bookmark.embedding) return [];

  const allBookmarks = await storage.getAll();
  const others = allBookmarks.filter(b => b.id !== bookmarkId && b.embedding);

  const results = others.map(b => ({
    bookmark: b,
    similarity: aiService.cosineSimilarity(bookmark.embedding, b.embedding)
  }));

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, count);
}

async function checkSingleLinkHealth(url) {
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return { status: 'ok' };
  } catch (error) {
    return { status: 'broken', error: error.message };
  }
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
  const folders = await storage.getAllFolders();
  const highlights = await storage.getAllHighlights();

  const categoryCount = {};
  const tagCount = {};
  const monthlyCount = {};

  bookmarks.forEach(b => {
    const cat = b.category || '未分类';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    (b.tags || []).forEach(t => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });

    const date = new Date(b.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCount[key] = (monthlyCount[key] || 0) + 1;
  });

  const healthCount = {
    ok: bookmarks.filter(b => b.linkStatus === 'ok').length,
    broken: bookmarks.filter(b => b.linkStatus === 'broken').length,
    unchecked: bookmarks.filter(b => !b.linkStatus).length
  };

  const readStatusCount = {
    unread: bookmarks.filter(b => b.readStatus === 'unread').length,
    reading: bookmarks.filter(b => b.readStatus === 'reading').length,
    read: bookmarks.filter(b => b.readStatus === 'read').length
  };

  const topKeywords = Object.entries(
    bookmarks.reduce((acc, b) => {
      (b.keywords || []).forEach(k => {
        acc[k] = (acc[k] || 0) + 1;
      });
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    total: bookmarks.length,
    folders: folders.length,
    highlights: highlights.length,
    categoryCount,
    tagCount,
    monthlyCount,
    healthCount,
    readStatusCount,
    topKeywords,
    reviewStats: {
      reviewed: bookmarks.filter(b => b.lastReviewed).length,
      neverReviewed: bookmarks.filter(b => !b.lastReviewed).length
    }
  };
}

async function generateShareData(bookmarkIds) {
  const bookmarks = [];
  for (const id of bookmarkIds) {
    const b = await storage.get(id);
    if (b) {
      bookmarks.push({
        title: b.title,
        url: b.url,
        summary: b.summary,
        category: b.category,
        tags: b.tags
      });
    }
  }

  return {
    version: '1.0',
    createdAt: Date.now(),
    bookmarks
  };
}
