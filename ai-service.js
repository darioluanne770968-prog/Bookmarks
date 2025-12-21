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

  // ==================== TIER 4: AI DEEP ENHANCEMENT ====================

  // Smart Auto-Tagging - AI suggests tags based on content
  async suggestTags(title, content, existingTags = []) {
    if (!this.apiKey) {
      return this.simpleSuggestTags(title, content, existingTags);
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
              content: `你是一个标签推荐助手。根据网页内容推荐3-5个合适的标签。
已有标签库: ${existingTags.join(', ') || '无'}
要求:
1. 优先使用已有标签库中的标签
2. 新标签要简洁(2-4个字)
3. 标签要有实际意义
返回JSON格式: {"tags": ["标签1", "标签2", ...]}`
            },
            {
              role: 'user',
              content: `标题: ${title}\n内容: ${content.substring(0, 1500)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return result.tags || [];
    } catch (error) {
      console.error('Tag suggestion failed:', error);
      return this.simpleSuggestTags(title, content, existingTags);
    }
  }

  simpleSuggestTags(title, content, existingTags) {
    const text = (title + ' ' + content).toLowerCase();
    const suggested = [];

    // Match existing tags
    for (const tag of existingTags) {
      if (text.includes(tag.toLowerCase())) {
        suggested.push(tag);
      }
    }

    // Common tag patterns
    const patterns = {
      'JavaScript': /\b(javascript|js|node|react|vue|angular)\b/i,
      'Python': /\b(python|django|flask|pytorch|tensorflow)\b/i,
      'AI': /\b(ai|机器学习|深度学习|neural|gpt|llm)\b/i,
      '前端': /\b(前端|frontend|css|html|ui|ux)\b/i,
      '后端': /\b(后端|backend|api|server|database)\b/i,
      '教程': /\b(教程|tutorial|how to|guide|入门)\b/i,
      '工具': /\b(tool|工具|plugin|extension|app)\b/i,
      '设计': /\b(design|设计|figma|sketch|ui)\b/i
    };

    for (const [tag, pattern] of Object.entries(patterns)) {
      if (pattern.test(text) && !suggested.includes(tag)) {
        suggested.push(tag);
      }
    }

    return suggested.slice(0, 5);
  }

  // Personalized Recommendations - Based on reading history
  async getRecommendations(bookmarks, recentlyRead, count = 5) {
    if (!recentlyRead || recentlyRead.length === 0) {
      // Return highest quality unread bookmarks
      return bookmarks
        .filter(b => b.readStatus !== 'read')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, count);
    }

    // Build user interest profile from recently read
    const interestProfile = this.buildInterestProfile(recentlyRead);

    // Score all unread bookmarks
    const scored = bookmarks
      .filter(b => b.readStatus !== 'read')
      .map(b => ({
        bookmark: b,
        score: this.calculateRecommendationScore(b, interestProfile)
      }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(s => s.bookmark);
  }

  buildInterestProfile(bookmarks) {
    const profile = {
      categories: {},
      keywords: {},
      tags: {},
      embeddings: []
    };

    bookmarks.forEach(b => {
      // Count categories
      if (b.category) {
        profile.categories[b.category] = (profile.categories[b.category] || 0) + 1;
      }

      // Count keywords
      (b.keywords || []).forEach(k => {
        profile.keywords[k] = (profile.keywords[k] || 0) + 1;
      });

      // Count tags
      (b.tags || []).forEach(t => {
        profile.tags[t] = (profile.tags[t] || 0) + 1;
      });

      // Collect embeddings
      if (b.embedding) {
        profile.embeddings.push(b.embedding);
      }
    });

    // Compute average embedding
    if (profile.embeddings.length > 0) {
      const avgEmbedding = new Array(profile.embeddings[0].length).fill(0);
      profile.embeddings.forEach(emb => {
        emb.forEach((v, i) => avgEmbedding[i] += v);
      });
      profile.avgEmbedding = avgEmbedding.map(v => v / profile.embeddings.length);
    }

    return profile;
  }

  calculateRecommendationScore(bookmark, profile) {
    let score = 0;

    // Category match
    if (bookmark.category && profile.categories[bookmark.category]) {
      score += profile.categories[bookmark.category] * 2;
    }

    // Keyword match
    (bookmark.keywords || []).forEach(k => {
      if (profile.keywords[k]) {
        score += profile.keywords[k];
      }
    });

    // Tag match
    (bookmark.tags || []).forEach(t => {
      if (profile.tags[t]) {
        score += profile.tags[t] * 1.5;
      }
    });

    // Embedding similarity
    if (bookmark.embedding && profile.avgEmbedding) {
      const similarity = this.cosineSimilarity(bookmark.embedding, profile.avgEmbedding);
      score += similarity * 10;
    }

    return score;
  }

  // Key Points Extraction - Extract 3-5 key points from content
  async extractKeyPoints(title, content) {
    if (!this.apiKey) {
      return this.simpleKeyPoints(content);
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
              content: `提取文章的3-5个核心要点。每个要点要简洁(20字以内)且有实际价值。
返回JSON格式: {"keyPoints": ["要点1", "要点2", ...]}`
            },
            {
              role: 'user',
              content: `标题: ${title}\n\n内容: ${content.substring(0, 3000)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 400
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return result.keyPoints || [];
    } catch (error) {
      console.error('Key points extraction failed:', error);
      return this.simpleKeyPoints(content);
    }
  }

  simpleKeyPoints(content) {
    // Simple extraction: find sentences with key indicators
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
    const indicators = ['重要', '关键', '核心', '必须', '注意', '首先', '其次', '最后', '总结'];

    const keyPoints = [];
    for (const sentence of sentences) {
      if (indicators.some(i => sentence.includes(i))) {
        keyPoints.push(sentence.trim().substring(0, 50));
        if (keyPoints.length >= 5) break;
      }
    }

    // If not enough, take first few sentences
    while (keyPoints.length < 3 && sentences.length > keyPoints.length) {
      const s = sentences[keyPoints.length].trim().substring(0, 50);
      if (!keyPoints.includes(s)) keyPoints.push(s);
    }

    return keyPoints;
  }

  // Cross-Bookmark RAG Q&A - Answer questions using all bookmarks as knowledge base
  async ragQuery(query, bookmarks) {
    if (!this.apiKey || bookmarks.length === 0) {
      return {
        answer: '需要配置 API Key 并有书签才能使用 RAG 问答',
        sources: []
      };
    }

    try {
      // First, find relevant bookmarks
      const searchResults = await this.semanticSearch(query, bookmarks, 8);

      // Build context from relevant bookmarks
      const context = searchResults.slice(0, 5).map((r, i) =>
        `[${i + 1}] ${r.bookmark.title}\n${r.bookmark.summary}\n${r.bookmark.fullContent?.substring(0, 500) || ''}`
      ).join('\n\n---\n\n');

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
              content: `你是一个知识助手。用户有一个书签库作为知识库。根据提供的书签内容回答用户问题。
要求:
1. 只使用提供的书签内容回答
2. 引用来源时使用[数字]标记
3. 如果书签中没有相关信息,诚实说明
4. 答案要准确、有深度`
            },
            {
              role: 'user',
              content: `问题: ${query}\n\n知识库内容:\n${context}`
            }
          ],
          temperature: 0.4,
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
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
      console.error('RAG query failed:', error);
      return {
        answer: '查询失败: ' + error.message,
        sources: []
      };
    }
  }

  // Reading Insights Analysis - Analyze reading patterns
  async getReadingInsights(bookmarks) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    // Time-based stats
    const thisWeek = bookmarks.filter(b => now - b.createdAt < weekMs);
    const thisMonth = bookmarks.filter(b => now - b.createdAt < monthMs);

    // Reading velocity
    const readThisWeek = bookmarks.filter(b => b.readStatus === 'read' && b.readAt && now - b.readAt < weekMs);
    const readThisMonth = bookmarks.filter(b => b.readStatus === 'read' && b.readAt && now - b.readAt < monthMs);

    // Category analysis
    const categoryTime = {};
    bookmarks.filter(b => b.readStatus === 'read').forEach(b => {
      const cat = b.category || '未分类';
      categoryTime[cat] = (categoryTime[cat] || 0) + 1;
    });

    // Most read categories
    const topCategories = Object.entries(categoryTime)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Reading streak calculation
    const readDates = new Set();
    bookmarks.filter(b => b.readAt).forEach(b => {
      const date = new Date(b.readAt).toISOString().split('T')[0];
      readDates.add(date);
    });

    let streak = 0;
    let checkDate = new Date();
    while (readDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Unread backlog
    const unread = bookmarks.filter(b => b.readStatus === 'unread');
    const avgReadTime = 5; // minutes per article
    const backlogTime = unread.length * avgReadTime;

    // Interest trends (categories over time)
    const recentCategories = {};
    thisMonth.forEach(b => {
      const cat = b.category || '未分类';
      recentCategories[cat] = (recentCategories[cat] || 0) + 1;
    });

    const insights = {
      summary: {
        total: bookmarks.length,
        read: bookmarks.filter(b => b.readStatus === 'read').length,
        unread: unread.length,
        readRate: Math.round((bookmarks.filter(b => b.readStatus === 'read').length / bookmarks.length) * 100) || 0
      },
      velocity: {
        savedThisWeek: thisWeek.length,
        savedThisMonth: thisMonth.length,
        readThisWeek: readThisWeek.length,
        readThisMonth: readThisMonth.length
      },
      streak: {
        current: streak,
        message: streak > 0 ? `连续 ${streak} 天阅读！继续保持！` : '今天还没阅读，开始吧！'
      },
      backlog: {
        count: unread.length,
        estimatedTime: backlogTime,
        message: `${unread.length} 篇待读，约需 ${Math.round(backlogTime / 60)} 小时`
      },
      topCategories,
      recentInterests: Object.entries(recentCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
      recommendations: this.generateInsightRecommendations(bookmarks, topCategories, unread)
    };

    return insights;
  }

  generateInsightRecommendations(bookmarks, topCategories, unread) {
    const recommendations = [];

    // Based on reading patterns
    if (unread.length > 50) {
      recommendations.push('书签积压较多，建议每天阅读2-3篇消化存量');
    }

    if (topCategories.length > 0) {
      recommendations.push(`您最常阅读 ${topCategories[0].name} 类内容，可以深入探索这个领域`);
    }

    // Find neglected categories
    const allCategories = new Set(bookmarks.map(b => b.category));
    const readCategories = new Set(topCategories.map(c => c.name));
    const neglected = [...allCategories].filter(c => c && !readCategories.has(c));
    if (neglected.length > 0) {
      recommendations.push(`${neglected[0]} 类书签较少阅读，可以尝试探索`);
    }

    return recommendations;
  }

  // ==================== TIER 6: READING EXPERIENCE ====================

  // Estimate Reading Time based on content
  estimateReadingTime(content, language = 'zh') {
    if (!content) return 0;

    // Chinese: ~300 chars/min, English: ~200 words/min
    const chars = content.length;
    const words = content.split(/\s+/).length;

    if (language === 'zh' || /[\u4e00-\u9fa5]/.test(content)) {
      const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
      return Math.ceil(chineseChars / 300 + englishWords / 200);
    }

    return Math.ceil(words / 200);
  }

  // Translate text
  async translateText(text, targetLang = 'zh') {
    if (!this.apiKey) {
      return { translated: '需要配置 API Key 才能翻译', original: text };
    }

    try {
      const langMap = {
        'zh': '中文',
        'en': 'English',
        'ja': '日本語',
        'ko': '한국어',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch'
      };

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
              content: `翻译以下内容为${langMap[targetLang] || targetLang}。保持原文格式和语气。只返回翻译结果，不要解释。`
            },
            {
              role: 'user',
              content: text.substring(0, 4000)
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      return {
        translated: data.choices[0].message.content,
        original: text,
        targetLang
      };
    } catch (error) {
      console.error('Translation failed:', error);
      return { translated: '翻译失败: ' + error.message, original: text };
    }
  }

  // ==================== TIER 8: ENCRYPTION ====================

  // Generate encryption key from password
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt sensitive data
  async encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(JSON.stringify(data))
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt sensitive data
  async decryptData(encryptedBase64, password) {
    try {
      const combined = new Uint8Array(
        atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
      );

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);

      const key = await this.deriveKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (error) {
      throw new Error('解密失败: 密码错误或数据损坏');
    }
  }
}

export const aiService = new AIService();
export { CATEGORIES };
