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
}

export const aiService = new AIService();
export { CATEGORIES };
