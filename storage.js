// IndexedDB-based storage for bookmarks
const DB_NAME = 'AIBookmarksDB';
const DB_VERSION = 1;
const STORE_NAME = 'bookmarks';

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

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('lastReviewed', 'lastReviewed', { unique: false });
        }
      };
    });
  }

  async add(bookmark) {
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    bookmark.id = bookmark.id || crypto.randomUUID();
    bookmark.createdAt = bookmark.createdAt || Date.now();
    bookmark.lastReviewed = null;
    bookmark.reviewCount = 0;

    return new Promise((resolve, reject) => {
      const request = store.add(bookmark);
      request.onsuccess = () => resolve(bookmark);
      request.onerror = () => reject(request.error);
    });
  }

  async update(bookmark) {
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(bookmark);
      request.onsuccess = () => resolve(bookmark);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id) {
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(id) {
    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByUrl(url) {
    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('url');

    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll() {
    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByCategory(category) {
    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('category');

    return new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getCategories() {
    const bookmarks = await this.getAll();
    const categories = new Set(bookmarks.map(b => b.category).filter(Boolean));
    return Array.from(categories);
  }

  async getForReview(count = 3) {
    const bookmarks = await this.getAll();

    // Score bookmarks for review priority
    const scored = bookmarks.map(b => {
      const daysSinceCreated = (Date.now() - b.createdAt) / (1000 * 60 * 60 * 24);
      const daysSinceReviewed = b.lastReviewed
        ? (Date.now() - b.lastReviewed) / (1000 * 60 * 60 * 24)
        : daysSinceCreated;

      // Higher score = more likely to be shown for review
      // Prioritize: never reviewed > long time since review > less review count
      let score = 0;
      if (!b.lastReviewed) score += 100;
      score += daysSinceReviewed * 2;
      score -= b.reviewCount * 5;

      return { bookmark: b, score };
    });

    // Sort by score descending and take top N
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

  async export() {
    const bookmarks = await this.getAll();
    return JSON.stringify(bookmarks, null, 2);
  }

  async import(jsonData) {
    const bookmarks = JSON.parse(jsonData);
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const bookmark of bookmarks) {
      bookmark.id = bookmark.id || crypto.randomUUID();
      try {
        await new Promise((resolve, reject) => {
          const request = store.put(bookmark);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.warn('Failed to import bookmark:', bookmark.url, e);
      }
    }

    return bookmarks.length;
  }

  async count() {
    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = new BookmarkStorage();
