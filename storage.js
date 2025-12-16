// IndexedDB-based storage for bookmarks with advanced features
const DB_NAME = 'AIBookmarksDB';
const DB_VERSION = 2;

class BookmarkStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Bookmarks store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const store = db.createObjectStore('bookmarks', { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('folderId', 'folderId', { unique: false });
          store.createIndex('readStatus', 'readStatus', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }

        // Folders/Collections store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('name', 'name', { unique: false });
          folderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagStore.createIndex('name', 'name', { unique: true });
        }

        // Highlights store
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightStore.createIndex('bookmarkId', 'bookmarkId', { unique: false });
          highlightStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Snapshots store
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('bookmarkId', 'bookmarkId', { unique: false });
          snapshotStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // ==================== BOOKMARKS ====================

  async add(bookmark) {
    const store = this.db.transaction('bookmarks', 'readwrite').objectStore('bookmarks');

    bookmark.id = bookmark.id || crypto.randomUUID();
    bookmark.createdAt = bookmark.createdAt || Date.now();
    bookmark.lastReviewed = null;
    bookmark.reviewCount = 0;
    bookmark.tags = bookmark.tags || [];
    bookmark.folderId = bookmark.folderId || null;
    bookmark.readStatus = bookmark.readStatus || 'unread'; // unread, reading, read
    bookmark.priority = bookmark.priority || 0; // 0-5 for reading queue
    bookmark.fullContent = bookmark.fullContent || '';
    bookmark.contentHash = bookmark.contentHash || '';

    return new Promise((resolve, reject) => {
      const request = store.add(bookmark);
      request.onsuccess = () => resolve(bookmark);
      request.onerror = () => reject(request.error);
    });
  }

  async update(bookmark) {
    const store = this.db.transaction('bookmarks', 'readwrite').objectStore('bookmarks');
    return new Promise((resolve, reject) => {
      const request = store.put(bookmark);
      request.onsuccess = () => resolve(bookmark);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id) {
    const tx = this.db.transaction(['bookmarks', 'highlights', 'snapshots'], 'readwrite');

    // Delete bookmark
    tx.objectStore('bookmarks').delete(id);

    // Delete related highlights
    const highlights = await this.getHighlightsByBookmark(id);
    for (const h of highlights) {
      tx.objectStore('highlights').delete(h.id);
    }

    // Delete related snapshots
    const snapshots = await this.getSnapshotsByBookmark(id);
    for (const s of snapshots) {
      tx.objectStore('snapshots').delete(s.id);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteMultiple(ids) {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async get(id) {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByUrl(url) {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    const index = store.index('url');
    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll() {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByCategory(category) {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    const index = store.index('category');
    return new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByFolder(folderId) {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    const index = store.index('folderId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(folderId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByReadStatus(status) {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    const index = store.index('readStatus');
    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByTag(tagName) {
    const bookmarks = await this.getAll();
    return bookmarks.filter(b => b.tags && b.tags.includes(tagName));
  }

  async getReadingQueue() {
    const bookmarks = await this.getAll();
    return bookmarks
      .filter(b => b.readStatus === 'unread' || b.readStatus === 'reading')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async getCategories() {
    const bookmarks = await this.getAll();
    const categories = new Set(bookmarks.map(b => b.category).filter(Boolean));
    return Array.from(categories);
  }

  async getAllTags() {
    const bookmarks = await this.getAll();
    const tags = new Set();
    bookmarks.forEach(b => {
      (b.tags || []).forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }

  async getForReview(count = 3) {
    const bookmarks = await this.getAll();
    const scored = bookmarks.map(b => {
      const daysSinceCreated = (Date.now() - b.createdAt) / (1000 * 60 * 60 * 24);
      const daysSinceReviewed = b.lastReviewed
        ? (Date.now() - b.lastReviewed) / (1000 * 60 * 60 * 24)
        : daysSinceCreated;

      let score = 0;
      if (!b.lastReviewed) score += 100;
      score += daysSinceReviewed * 2;
      score -= (b.reviewCount || 0) * 5;

      return { bookmark: b, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(s => s.bookmark);
  }

  async markReviewed(id) {
    const bookmark = await this.get(id);
    if (bookmark) {
      bookmark.lastReviewed = Date.now();
      bookmark.reviewCount = (bookmark.reviewCount || 0) + 1;
      await this.update(bookmark);
    }
  }

  async updateReadStatus(id, status) {
    const bookmark = await this.get(id);
    if (bookmark) {
      bookmark.readStatus = status;
      if (status === 'read') {
        bookmark.readAt = Date.now();
      }
      await this.update(bookmark);
    }
  }

  async updatePriority(id, priority) {
    const bookmark = await this.get(id);
    if (bookmark) {
      bookmark.priority = priority;
      await this.update(bookmark);
    }
  }

  async addTagToBookmark(id, tag) {
    const bookmark = await this.get(id);
    if (bookmark) {
      bookmark.tags = bookmark.tags || [];
      if (!bookmark.tags.includes(tag)) {
        bookmark.tags.push(tag);
        await this.update(bookmark);
      }
    }
  }

  async removeTagFromBookmark(id, tag) {
    const bookmark = await this.get(id);
    if (bookmark && bookmark.tags) {
      bookmark.tags = bookmark.tags.filter(t => t !== tag);
      await this.update(bookmark);
    }
  }

  async moveToFolder(id, folderId) {
    const bookmark = await this.get(id);
    if (bookmark) {
      bookmark.folderId = folderId;
      await this.update(bookmark);
    }
  }

  async batchUpdate(ids, updates) {
    for (const id of ids) {
      const bookmark = await this.get(id);
      if (bookmark) {
        Object.assign(bookmark, updates);
        await this.update(bookmark);
      }
    }
  }

  async findDuplicates() {
    const bookmarks = await this.getAll();
    const duplicates = [];
    const seen = new Map();

    for (const b of bookmarks) {
      // Check by URL domain + title similarity
      const domain = new URL(b.url).hostname;
      const key = `${domain}-${b.title.toLowerCase().substring(0, 50)}`;

      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: b
        });
      } else {
        seen.set(key, b);
      }
    }

    return duplicates;
  }

  // ==================== FOLDERS ====================

  async addFolder(folder) {
    const store = this.db.transaction('folders', 'readwrite').objectStore('folders');
    folder.id = folder.id || crypto.randomUUID();
    folder.createdAt = folder.createdAt || Date.now();
    folder.color = folder.color || '#667eea';

    return new Promise((resolve, reject) => {
      const request = store.add(folder);
      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });
  }

  async updateFolder(folder) {
    const store = this.db.transaction('folders', 'readwrite').objectStore('folders');
    return new Promise((resolve, reject) => {
      const request = store.put(folder);
      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(id) {
    // Move bookmarks to no folder
    const bookmarks = await this.getByFolder(id);
    for (const b of bookmarks) {
      b.folderId = null;
      await this.update(b);
    }

    const store = this.db.transaction('folders', 'readwrite').objectStore('folders');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFolder(id) {
    const store = this.db.transaction('folders', 'readonly').objectStore('folders');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFolders() {
    const store = this.db.transaction('folders', 'readonly').objectStore('folders');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== TAGS ====================

  async addTag(tag) {
    const store = this.db.transaction('tags', 'readwrite').objectStore('tags');
    tag.id = tag.id || crypto.randomUUID();
    tag.color = tag.color || '#667eea';

    return new Promise((resolve, reject) => {
      const request = store.add(tag);
      request.onsuccess = () => resolve(tag);
      request.onerror = () => reject(request.error);
    });
  }

  async getTagByName(name) {
    const store = this.db.transaction('tags', 'readonly').objectStore('tags');
    const index = store.index('name');
    return new Promise((resolve, reject) => {
      const request = index.get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTagObjects() {
    const store = this.db.transaction('tags', 'readonly').objectStore('tags');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTag(id) {
    // Remove tag from all bookmarks
    const tag = await new Promise((resolve, reject) => {
      const store = this.db.transaction('tags', 'readonly').objectStore('tags');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (tag) {
      const bookmarks = await this.getByTag(tag.name);
      for (const b of bookmarks) {
        await this.removeTagFromBookmark(b.id, tag.name);
      }
    }

    const store = this.db.transaction('tags', 'readwrite').objectStore('tags');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== HIGHLIGHTS ====================

  async addHighlight(highlight) {
    const store = this.db.transaction('highlights', 'readwrite').objectStore('highlights');
    highlight.id = highlight.id || crypto.randomUUID();
    highlight.createdAt = highlight.createdAt || Date.now();
    highlight.color = highlight.color || '#ffeb3b';

    return new Promise((resolve, reject) => {
      const request = store.add(highlight);
      request.onsuccess = () => resolve(highlight);
      request.onerror = () => reject(request.error);
    });
  }

  async getHighlightsByBookmark(bookmarkId) {
    const store = this.db.transaction('highlights', 'readonly').objectStore('highlights');
    const index = store.index('bookmarkId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(bookmarkId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllHighlights() {
    const store = this.db.transaction('highlights', 'readonly').objectStore('highlights');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteHighlight(id) {
    const store = this.db.transaction('highlights', 'readwrite').objectStore('highlights');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SNAPSHOTS ====================

  async addSnapshot(snapshot) {
    const store = this.db.transaction('snapshots', 'readwrite').objectStore('snapshots');
    snapshot.id = snapshot.id || crypto.randomUUID();
    snapshot.createdAt = snapshot.createdAt || Date.now();

    return new Promise((resolve, reject) => {
      const request = store.add(snapshot);
      request.onsuccess = () => resolve(snapshot);
      request.onerror = () => reject(request.error);
    });
  }

  async getSnapshotsByBookmark(bookmarkId) {
    const store = this.db.transaction('snapshots', 'readonly').objectStore('snapshots');
    const index = store.index('bookmarkId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(bookmarkId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestSnapshot(bookmarkId) {
    const snapshots = await this.getSnapshotsByBookmark(bookmarkId);
    if (snapshots.length === 0) return null;
    return snapshots.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  async deleteSnapshot(id) {
    const store = this.db.transaction('snapshots', 'readwrite').objectStore('snapshots');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== EXPORT/IMPORT ====================

  async export() {
    const bookmarks = await this.getAll();
    const folders = await this.getAllFolders();
    const tags = await this.getAllTagObjects();
    const highlights = await this.getAllHighlights();

    return JSON.stringify({
      version: '2.0',
      exportedAt: Date.now(),
      bookmarks,
      folders,
      tags,
      highlights
    }, null, 2);
  }

  async exportForNotion() {
    const bookmarks = await this.getAll();
    let markdown = '# AI Bookmarks Export\n\n';
    markdown += `Exported at: ${new Date().toLocaleString()}\n\n`;

    const byCategory = {};
    bookmarks.forEach(b => {
      const cat = b.category || '未分类';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(b);
    });

    for (const [category, items] of Object.entries(byCategory)) {
      markdown += `## ${category}\n\n`;
      for (const b of items) {
        markdown += `### [${b.title}](${b.url})\n\n`;
        if (b.summary) markdown += `> ${b.summary}\n\n`;
        if (b.tags && b.tags.length) markdown += `Tags: ${b.tags.join(', ')}\n\n`;
        if (b.note) markdown += `**Notes:** ${b.note}\n\n`;
        markdown += `---\n\n`;
      }
    }

    return markdown;
  }

  async exportForObsidian() {
    const bookmarks = await this.getAll();
    const files = {};

    bookmarks.forEach(b => {
      const filename = b.title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
      let content = `---\n`;
      content += `url: ${b.url}\n`;
      content += `category: ${b.category || '未分类'}\n`;
      content += `tags: [${(b.tags || []).map(t => `"${t}"`).join(', ')}]\n`;
      content += `created: ${new Date(b.createdAt).toISOString()}\n`;
      content += `---\n\n`;
      content += `# ${b.title}\n\n`;
      content += `[Open Link](${b.url})\n\n`;
      if (b.summary) content += `## Summary\n\n${b.summary}\n\n`;
      if (b.whyRead) content += `## Why Read\n\n${b.whyRead}\n\n`;
      if (b.note) content += `## Notes\n\n${b.note}\n\n`;
      if (b.keywords && b.keywords.length) {
        content += `## Keywords\n\n${b.keywords.map(k => `- ${k}`).join('\n')}\n`;
      }

      files[`${filename}.md`] = content;
    });

    return files;
  }

  async import(jsonData) {
    const data = JSON.parse(jsonData);

    // Handle v2 format
    if (data.version === '2.0') {
      let count = 0;

      for (const bookmark of (data.bookmarks || [])) {
        bookmark.id = bookmark.id || crypto.randomUUID();
        try {
          await this.update(bookmark);
          count++;
        } catch (e) {
          try { await this.add(bookmark); count++; } catch (e2) {}
        }
      }

      for (const folder of (data.folders || [])) {
        try { await this.addFolder(folder); } catch (e) {}
      }

      for (const tag of (data.tags || [])) {
        try { await this.addTag(tag); } catch (e) {}
      }

      return count;
    }

    // Handle v1 format (array of bookmarks)
    const bookmarks = Array.isArray(data) ? data : [data];
    let count = 0;

    for (const bookmark of bookmarks) {
      bookmark.id = bookmark.id || crypto.randomUUID();
      try {
        await this.update(bookmark);
        count++;
      } catch (e) {
        try { await this.add(bookmark); count++; } catch (e2) {}
      }
    }

    return count;
  }

  async count() {
    const store = this.db.transaction('bookmarks', 'readonly').objectStore('bookmarks');
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== TIMELINE ====================

  async getTimeline() {
    const bookmarks = await this.getAll();
    const byDate = {};

    bookmarks.forEach(b => {
      const date = new Date(b.createdAt).toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(b);
    });

    return Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, bookmarks: items }));
  }

  // ==================== FULL TEXT SEARCH ====================

  async fullTextSearch(query) {
    const bookmarks = await this.getAll();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    return bookmarks
      .map(b => {
        const searchText = [
          b.title,
          b.summary,
          b.note,
          b.fullContent,
          b.url,
          ...(b.keywords || []),
          ...(b.tags || [])
        ].join(' ').toLowerCase();

        let score = 0;
        queryWords.forEach(word => {
          const matches = (searchText.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        });

        return { bookmark: b, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}

export const storage = new BookmarkStorage();
