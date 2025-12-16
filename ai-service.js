// AI Service for bookmark analysis
// Uses OpenAI API for summaries, categorization, and embeddings

const CATEGORIES = [
  '技术/编程',
  '产品/设计',
  '商业/创业',
  '效率/工具',
  '新闻/资讯',
  '学习/教程',
  '生活/健康',
  '娱乐/休闲',
  '其他'
];

class AIService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async init() {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    this.apiKey = result.openaiApiKey;
  }

  setApiKey(key) {
    this.apiKey = key;
    chrome.storage.sync.set({ openaiApiKey: key });
  }

  getApiKey() {
    return this.apiKey;
  }

  async analyzeBookmark(title, content, url) {
    if (!this.apiKey) {
      // Fallback to simple extraction if no API key
      return this.simpleAnalysis(title, content, url);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `你是一个书签分析助手。分析给定的网页内容，返回JSON格式：
{
  "summary": "3句话以内的摘要，说明这篇文章的核心内容和价值",
  "category": "从以下类别选择最合适的一个: ${CATEGORIES.join(', ')}",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "whyRead": "一句话说明为什么值得阅读这篇文章"
}`
            },
            {
              role: 'user',
              content: `标题: ${title}\n\nURL: ${url}\n\n内容摘要: ${content.substring(0, 2000)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return {
        summary: result.summary,
        category: result.category,
        keywords: result.keywords || [],
        whyRead: result.whyRead
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.simpleAnalysis(title, content, url);
    }
  }

  simpleAnalysis(title, content, url) {
    // Simple fallback analysis without AI
    const domain = new URL(url).hostname;

    // Guess category from domain/content
    let category = '其他';
    const lowerContent = (title + ' ' + content).toLowerCase();

    if (/github|code|programming|dev|api|javascript|python/.test(lowerContent)) {
      category = '技术/编程';
    } else if (/design|ux|ui|figma|产品/.test(lowerContent)) {
      category = '产品/设计';
    } else if (/startup|business|创业|商业|融资/.test(lowerContent)) {
      category = '商业/创业';
    } else if (/tool|效率|productivity|app/.test(lowerContent)) {
      category = '效率/工具';
    } else if (/news|新闻|资讯/.test(lowerContent)) {
      category = '新闻/资讯';
    } else if (/learn|tutorial|教程|学习|course/.test(lowerContent)) {
      category = '学习/教程';
    }

    // Extract simple keywords
    const words = content.split(/\s+/).filter(w => w.length > 3);
    const wordFreq = {};
    words.forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, '');
      if (lower.length > 2) {
        wordFreq[lower] = (wordFreq[lower] || 0) + 1;
      }
    });
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return {
      summary: content.substring(0, 200) + '...',
      category,
      keywords,
      whyRead: ''
    };
  }

  async generateEmbedding(text) {
    if (!this.apiKey) {
      // Simple hash-based pseudo-embedding for basic similarity
      return this.simpleEmbedding(text);
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000)
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return this.simpleEmbedding(text);
    }
  }

  simpleEmbedding(text) {
    // Create a simple bag-of-words style embedding
    // This is a fallback when API is not available
    const words = text.toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Create a fixed-size vector using hash
    const vector = new Array(256).fill(0);
    words.forEach((word, idx) => {
      const hash = this.hashCode(word);
      const index = Math.abs(hash) % 256;
      vector[index] += 1 / (idx + 1); // Weight by position
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      return vector.map(v => v / magnitude);
    }
    return vector;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  async semanticSearch(query, bookmarks, topK = 10) {
    const queryEmbedding = await this.generateEmbedding(query);

    const results = bookmarks
      .filter(b => b.embedding)
      .map(bookmark => ({
        bookmark,
        similarity: this.cosineSimilarity(queryEmbedding, bookmark.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  // Keyword-based fallback search
  keywordSearch(query, bookmarks) {
    const queryWords = query.toLowerCase().split(/\s+/);

    return bookmarks
      .map(bookmark => {
        const searchText = [
          bookmark.title,
          bookmark.summary,
          bookmark.url,
          ...(bookmark.keywords || [])
        ].join(' ').toLowerCase();

        let score = 0;
        queryWords.forEach(word => {
          if (searchText.includes(word)) {
            score += 1;
          }
        });

        return { bookmark, similarity: score / queryWords.length };
      })
      .filter(r => r.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity);
  }

  // AI Conversational Search - Generate natural language answer based on bookmarks
  async generateSearchAnswer(query, searchResults) {
    if (!this.apiKey || searchResults.length === 0) {
      return this.simpleSearchAnswer(query, searchResults);
    }

    try {
      const bookmarkContext = searchResults.slice(0, 5).map((r, i) =>
        `${i + 1}. "${r.bookmark.title}"\n   摘要: ${r.bookmark.summary}\n   关键词: ${(r.bookmark.keywords || []).join(', ')}\n   URL: ${r.bookmark.url}`
      ).join('\n\n');

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `你是一个智能书签助手。用户会问关于他们收藏的书签的问题。根据提供的书签信息，用自然语言回答用户的问题。
回答要求：
1. 简洁明了，直接回答问题
2. 引用相关书签时提供标题
3. 如果书签中没有相关信息，诚实说明
4. 可以提供进一步阅读建议`
            },
            {
              role: 'user',
              content: `用户问题: ${query}\n\n相关书签:\n${bookmarkContext}`
            }
          ],
          temperature: 0.5,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        answer: data.choices[0].message.content,
        sources: searchResults.slice(0, 5).map(r => ({
          title: r.bookmark.title,
          url: r.bookmark.url,
          similarity: r.similarity
        }))
      };
    } catch (error) {
      console.error('AI search answer failed:', error);
      return this.simpleSearchAnswer(query, searchResults);
    }
  }

  simpleSearchAnswer(query, searchResults) {
    if (searchResults.length === 0) {
      return {
        answer: '没有找到与您问题相关的书签。请尝试使用不同的关键词搜索。',
        sources: []
      };
    }

    const topResults = searchResults.slice(0, 5);
    const answer = `找到 ${searchResults.length} 个相关书签。最相关的是：\n\n` +
      topResults.map((r, i) => `${i + 1}. ${r.bookmark.title}`).join('\n') +
      '\n\n点击书签可以查看详情。';

    return {
      answer,
      sources: topResults.map(r => ({
        title: r.bookmark.title,
        url: r.bookmark.url,
        similarity: r.similarity
      }))
    };
  }

  // Generate knowledge graph connections
  async generateGraphConnections(bookmarks) {
    const nodes = bookmarks.map(b => ({
      id: b.id,
      title: b.title,
      category: b.category,
      keywords: b.keywords || []
    }));

    const links = [];

    // Create links based on shared keywords and categories
    for (let i = 0; i < bookmarks.length; i++) {
      for (let j = i + 1; j < bookmarks.length; j++) {
        const a = bookmarks[i];
        const b = bookmarks[j];

        // Link by same category
        if (a.category === b.category) {
          links.push({
            source: a.id,
            target: b.id,
            type: 'category',
            strength: 0.3
          });
        }

        // Link by shared keywords
        const sharedKeywords = (a.keywords || []).filter(k =>
          (b.keywords || []).includes(k)
        );
        if (sharedKeywords.length > 0) {
          links.push({
            source: a.id,
            target: b.id,
            type: 'keyword',
            keywords: sharedKeywords,
            strength: Math.min(sharedKeywords.length * 0.2, 1)
          });
        }

        // Link by embedding similarity if available
        if (a.embedding && b.embedding) {
          const similarity = this.cosineSimilarity(a.embedding, b.embedding);
          if (similarity > 0.7) {
            links.push({
              source: a.id,
              target: b.id,
              type: 'semantic',
              strength: similarity
            });
          }
        }
      }
    }

    return { nodes, links };
  }

  // Detect content changes
  async detectContentChanges(oldContent, newContent) {
    if (!oldContent || !newContent) return { changed: false };

    const oldHash = this.hashCode(oldContent);
    const newHash = this.hashCode(newContent);

    if (oldHash === newHash) {
      return { changed: false };
    }

    // Simple diff detection
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const addedLines = newLines.filter(l => !oldLines.includes(l));
    const removedLines = oldLines.filter(l => !newLines.includes(l));

    return {
      changed: true,
      addedCount: addedLines.length,
      removedCount: removedLines.length,
      summary: `新增 ${addedLines.length} 行，删除 ${removedLines.length} 行`
    };
  }

  // Find duplicate bookmarks
  async findDuplicates(bookmarks) {
    const duplicates = [];
    const urlMap = new Map();
    const titleMap = new Map();

    for (const bookmark of bookmarks) {
      // Check URL duplicates (exact match)
      const normalizedUrl = bookmark.url.replace(/[?#].*$/, '').replace(/\/$/, '');
      if (urlMap.has(normalizedUrl)) {
        duplicates.push({
          type: 'url',
          original: urlMap.get(normalizedUrl),
          duplicate: bookmark
        });
      } else {
        urlMap.set(normalizedUrl, bookmark);
      }

      // Check title similarity
      const normalizedTitle = bookmark.title.toLowerCase().trim();
      for (const [existingTitle, existingBookmark] of titleMap) {
        const similarity = this.titleSimilarity(normalizedTitle, existingTitle);
        if (similarity > 0.8 && existingBookmark.id !== bookmark.id) {
          duplicates.push({
            type: 'similar_title',
            original: existingBookmark,
            duplicate: bookmark,
            similarity
          });
        }
      }
      titleMap.set(normalizedTitle, bookmark);
    }

    // Check embedding similarity for potential duplicates
    const embeddedBookmarks = bookmarks.filter(b => b.embedding);
    for (let i = 0; i < embeddedBookmarks.length; i++) {
      for (let j = i + 1; j < embeddedBookmarks.length; j++) {
        const similarity = this.cosineSimilarity(
          embeddedBookmarks[i].embedding,
          embeddedBookmarks[j].embedding
        );
        if (similarity > 0.95) {
          const existing = duplicates.find(d =>
            (d.original.id === embeddedBookmarks[i].id && d.duplicate.id === embeddedBookmarks[j].id) ||
            (d.original.id === embeddedBookmarks[j].id && d.duplicate.id === embeddedBookmarks[i].id)
          );
          if (!existing) {
            duplicates.push({
              type: 'semantic',
              original: embeddedBookmarks[i],
              duplicate: embeddedBookmarks[j],
              similarity
            });
          }
        }
      }
    }

    return duplicates;
  }

  titleSimilarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1;

    // Levenshtein distance based similarity
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

export const aiService = new AIService();
export { CATEGORIES };
