// Content script for extracting page content

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

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const data = extractPageContent();
    sendResponse(data);
  }
  return true;
});
