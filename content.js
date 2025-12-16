// Content script for extracting page content and managing highlights

function extractPageContent() {
  // Get main content
  const article = document.querySelector('article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('.post-content') ||
    document.querySelector('.article-content') ||
    document.querySelector('.entry-content') ||
    document.body;

  // Remove scripts, styles, and navigation
  const clone = article.cloneNode(true);
  const removeElements = clone.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ad');
  removeElements.forEach(el => el.remove());

  // Get text content
  let content = clone.textContent || '';

  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Get meta description as fallback
  const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
  const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';

  // Get title
  const title = document.title ||
    document.querySelector('h1')?.textContent ||
    document.querySelector('meta[property="og:title"]')?.content ||
    '';

  // Get favicon
  let favicon = document.querySelector('link[rel="icon"]')?.href ||
    document.querySelector('link[rel="shortcut icon"]')?.href ||
    `${window.location.origin}/favicon.ico`;

  return {
    title: title.trim(),
    content: content.substring(0, 5000), // Limit content length
    description: metaDesc || ogDesc,
    favicon,
    url: window.location.href
  };
}

// Extract full page content for snapshot
function extractFullContent() {
  const html = document.documentElement.outerHTML;
  const title = document.title;
  const url = window.location.href;

  // Get all stylesheets
  const styles = [];
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
    if (el.tagName === 'STYLE') {
      styles.push({ type: 'inline', content: el.textContent });
    } else {
      styles.push({ type: 'link', href: el.href });
    }
  });

  // Get text content for search
  const textContent = document.body.innerText || '';

  return {
    html,
    title,
    url,
    styles,
    textContent: textContent.substring(0, 50000), // Limit for storage
    timestamp: Date.now()
  };
}

// Get selected text for highlighting
function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) return null;

  // Get surrounding context
  const container = range.commonAncestorContainer;
  const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

  // Get XPath for the element
  const xpath = getXPath(parent);

  // Get position info for recreating highlight
  const rects = range.getClientRects();
  const rect = rects[0];

  return {
    text,
    context: parent.textContent.substring(0, 200),
    xpath,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    rect: rect ? {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    } : null,
    url: window.location.href,
    timestamp: Date.now()
  };
}

// Get XPath for an element
function getXPath(element) {
  if (!element) return '';
  if (element.id) return `//*[@id="${element.id}"]`;

  const parts = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === element.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    const tagName = element.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    element = element.parentElement;
  }
  return '/' + parts.join('/');
}

// Apply highlight to page
function applyHighlight(highlightData) {
  try {
    // Try to find the element by XPath
    const result = document.evaluate(
      highlightData.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );

    const element = result.singleNodeValue;
    if (!element) return false;

    // Find the text node containing the highlight
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const index = node.textContent.indexOf(highlightData.text);
      if (index !== -1) {
        // Create highlight span
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + highlightData.text.length);

        const highlight = document.createElement('mark');
        highlight.className = 'ai-bookmark-highlight';
        highlight.style.cssText = `
          background-color: ${highlightData.color || '#ffeb3b'};
          padding: 2px;
          border-radius: 2px;
          cursor: pointer;
        `;
        highlight.dataset.highlightId = highlightData.id;
        highlight.title = highlightData.note || '点击查看笔记';

        range.surroundContents(highlight);

        // Add click handler
        highlight.addEventListener('click', () => {
          chrome.runtime.sendMessage({
            action: 'showHighlightNote',
            highlightId: highlightData.id
          });
        });

        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to apply highlight:', error);
    return false;
  }
}

// Load and apply all highlights for current page
async function loadHighlights() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getHighlightsForUrl',
      url: window.location.href
    });

    if (response && response.highlights) {
      response.highlights.forEach(highlight => {
        applyHighlight(highlight);
      });
    }
  } catch (error) {
    console.error('Failed to load highlights:', error);
  }
}

// Inject highlight styles
function injectHighlightStyles() {
  if (document.getElementById('ai-bookmark-highlight-styles')) return;

  const style = document.createElement('style');
  style.id = 'ai-bookmark-highlight-styles';
  style.textContent = `
    .ai-bookmark-highlight {
      background-color: #ffeb3b !important;
      padding: 2px !important;
      border-radius: 2px !important;
      cursor: pointer !important;
      transition: background-color 0.2s !important;
    }
    .ai-bookmark-highlight:hover {
      background-color: #ffc107 !important;
    }
    .ai-bookmark-highlight.green {
      background-color: #a5d6a7 !important;
    }
    .ai-bookmark-highlight.blue {
      background-color: #90caf9 !important;
    }
    .ai-bookmark-highlight.pink {
      background-color: #f48fb1 !important;
    }
    .ai-bookmark-highlight.purple {
      background-color: #ce93d8 !important;
    }
  `;
  document.head.appendChild(style);
}

// Initialize
function init() {
  injectHighlightStyles();
  // Load highlights after a short delay to ensure page is ready
  setTimeout(loadHighlights, 500);
}

// Run init when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'extractContent':
      sendResponse(extractPageContent());
      break;

    case 'extractFullContent':
      sendResponse(extractFullContent());
      break;

    case 'getSelectedText':
      sendResponse(getSelectedText());
      break;

    case 'applyHighlight':
      const success = applyHighlight(request.highlight);
      sendResponse({ success });
      break;

    case 'loadHighlights':
      loadHighlights();
      sendResponse({ success: true });
      break;

    case 'removeHighlight':
      const highlight = document.querySelector(`[data-highlight-id="${request.highlightId}"]`);
      if (highlight) {
        const text = highlight.textContent;
        highlight.replaceWith(text);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true;
});
