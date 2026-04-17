// GitHub Everywhere - VOZ.VN Complete HTML Transformation
// Hides VOZ elements and overlays GitHub-style design

const GH_MARK_SVG = `<svg aria-hidden="true" focusable="false" class="octicon octicon-mark-github" viewBox="0 0 16 16" width="32" height="32" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom">
  <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/>
</svg>`;

function detectPageType() {
  const body = document.body;
  if (!body) return "unknown";
  const cls = body.className || "";

  if (cls.includes("p-body--forum-index") || location.pathname === "/") return "home";
  if (cls.includes("thread-view") || cls.includes("p-body--thread") || /\/t\//.test(location.pathname)) return "thread-detail";
  if (cls.includes("p-body--forum-list") || /\/f\//.test(location.pathname) || /\/forums\//.test(location.pathname) || /\/s\//.test(location.pathname)) return "forum-list";
  if (/\/register/.test(location.pathname) || /\/login/.test(location.pathname) || cls.includes("p-body--register")) return "auth";

  return "other";
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function extractThreadData() {
  console.log("[GitHub Everywhere VOZ] Extracting thread data...");

  const titleEl = document.querySelector('h1.p-title-value') || document.querySelector('.p-title-value') || document.querySelector('[data-xf-init="tooltip"]') || document.querySelector('h1');
  const title = titleEl ? titleEl.textContent.trim() : 'VOZ Thread';

  // Extract breadcrumb from DOM - only get the first breadcrumb list
  const breadcrumbItems = [];
  const breadcrumbContainer = document.querySelector('.p-breadcrumbs');
  if (breadcrumbContainer) {
    const breadcrumbEls = breadcrumbContainer.querySelectorAll('li');
    breadcrumbEls.forEach(el => {
      const link = el.querySelector('a');
      if (link) {
        breadcrumbItems.push({ text: link.textContent.trim(), href: link.href });
      }
    });
  }

  console.log("[GitHub Everywhere VOZ] Thread breadcrumbs:", breadcrumbItems);

  // Extract pagination
  const pagination = {
    currentPage: 1,
    totalPages: 1,
    pages: []
  };

  const pageNavEl = document.querySelector('.pageNav');
  if (pageNavEl) {
    const currentPageEl = pageNavEl.querySelector('.pageNav-page--current a');
    if (currentPageEl) {
      pagination.currentPage = parseInt(currentPageEl.textContent.trim());
    }

    // Extract all page numbers
    const pageEls = pageNavEl.querySelectorAll('.pageNav-page a');
    pageEls.forEach(el => {
      const pageNum = parseInt(el.textContent.trim());
      const pageUrl = el.href;
      if (!isNaN(pageNum)) {
        pagination.pages.push({ num: pageNum, url: pageUrl });
      }
    });

    // Get total pages from the last page link
    const lastPageEl = pageNavEl.querySelector('.pageNav-page:last-child a');
    if (lastPageEl) {
      const lastPageNum = parseInt(lastPageEl.textContent.trim());
      if (!isNaN(lastPageNum)) {
        pagination.totalPages = lastPageNum;
      }
    }
  }

  // Extract comments
  const comments = [];
  const messageEls = document.querySelectorAll('article.message, .message');

  messageEls.forEach((msg, idx) => {
    const userEl = msg.querySelector('.message-userDetails, .message-name, .username, ausername');
    const username = userEl ? userEl.textContent.trim() : `User${idx}`;

    const avatarEl = msg.querySelector('.message-avatar img, .avatar img, img.avatar');
    const avatar = avatarEl ? (avatarEl.src || avatarEl.getAttribute('data-src') || avatarEl.getAttribute('src')) : '';

    const timeEl = msg.querySelector('.message-attribution-main time, .u-dt, time');
    const timestamp = timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent.trim()) : '';

    const contentEl = msg.querySelector('.message-content, .message-body, .message-userContent, .message-userContent .bbWrapper');
    let content = contentEl ? contentEl.innerHTML.trim() : msg.innerHTML.trim();

    // Clean content - remove ads and scripts
    content = content
      .replace(/<pubtag[^>]*>.*?<\/pubtag>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<iframe[^>]*src=["'][^"']*ads[^"']*["'][^>]*>/gi, '')
      .replace(/<iframe[^>]*src=["'][^"']*banner[^"']*["'][^>]*>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*ads[^"']*["'][^>]*>.*?<\/div>/gi, '')
      .replace(/<ins[^>]*>.*?<\/ins>/gi, '')
      .replace(/<div[^>]*data-ad-slot[^>]*>.*?<\/div>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/<[^>]+>/g, '') // Remove all HTML tags to check text content
      .trim();

    // Skip comments that are empty or only contain whitespace/ads
    if (!content || content.length === 0) {
      console.log("[GitHub Everywhere VOZ] Skipping empty comment from", username);
      return;
    }

    // Get original content for display (with HTML but without ads)
    const contentEl2 = msg.querySelector('.message-content, .message-body, .message-userContent, .message-userContent .bbWrapper');
    let displayContent = contentEl2 ? contentEl2.innerHTML.trim() : msg.innerHTML.trim();

    // Clean display content - remove ads and scripts
    displayContent = displayContent
      .replace(/<pubtag[^>]*>.*?<\/pubtag>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<iframe[^>]*src=["'][^"']*ads[^"']*["'][^>]*>/gi, '')
      .replace(/<iframe[^>]*src=["'][^"']*banner[^"']*["'][^>]*>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*ads[^"']*["'][^>]*>.*?<\/div>/gi, '')
      .replace(/<ins[^>]*>.*?<\/ins>/gi, '')
      .replace(/<div[^>]*data-ad-slot[^>]*>.*?<\/div>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();

    const reactions = [];
    const reactionEls = msg.querySelectorAll('.reactionsBar .reaction, .reaction--category1');
    reactionEls.forEach(el => {
      const countEl = el.querySelector('.reaction-text, .reaction-count');
      const count = countEl ? parseInt(countEl.textContent.trim()) : 1;
      reactions.push({ emoji: '👍', count });
    });

    comments.push({
      username,
      avatar,
      timestamp,
      content: displayContent,
      reactions
    });
  });

  console.log("[GitHub Everywhere VOZ] Extracted", comments.length, "comments");

  return {
    title,
    breadcrumbs: breadcrumbItems,
    comments,
    pagination
  };
}

function extractHomePageData() {
  console.log("[GitHub Everywhere VOZ] Extracting home page data...");

  // Extract forum categories/blocks
  const categories = [];
  // Only select top-level block containers to avoid duplicates
  const blocks = document.querySelectorAll('.block-container');

  blocks.forEach(block => {
    // Skip nested blocks by checking if this block is inside another block
    if (block.closest('.block-container') !== block) {
      return;
    }

    const titleEl = block.querySelector('.block-header, .block-header-title');
    const title = titleEl ? titleEl.textContent.trim() : '';

    const items = [];
    const seenTitles = new Set(); // Track seen titles to avoid duplicates

    const itemEls = block.querySelectorAll('.structItem--forum, .structItem, .node');

    itemEls.forEach(item => {
      const titleLink = item.querySelector('.structItem-title a, .node-title a, h3 a');
      const itemTitle = titleLink ? titleLink.textContent.trim() : '';

      // Skip if we've already seen this forum title
      if (!itemTitle || seenTitles.has(itemTitle)) {
        return;
      }

      // Extract Threads and Messages counts separately
      const pairs = [];
      const pairEls = item.querySelectorAll('.structItem-cell--minor .structItem-pair, .pair, .stats-item');

      pairEls.forEach(pair => {
        const label = pair.querySelector('.structItem-pair-label, .label, dt');
        const value = pair.querySelector('.structItem-pair-value, .value, dd');
        if (label && value) {
          const labelText = label.textContent.trim();
          const valueText = value.textContent.trim();
          // Only include Threads and Messages, skip Sub-forums
          if (labelText && !labelText.toLowerCase().includes('sub-forum')) {
            pairs.push({
              label: labelText,
              value: valueText
            });
          }
        }
      });

      // If no pairs found, try to extract from text content (but clean it)
      let meta = '';
      if (pairs.length === 0) {
        const metaEl = item.querySelector('.structItem-minor, .node-meta, .forum-meta');
        if (metaEl) {
          // Get text content and remove sub-forum references
          let rawMeta = metaEl.textContent.trim();
          // Remove "Sub-forums" and everything after it
          meta = rawMeta.replace(/Sub-forums.*$/i, '').trim();
        }
      }

      // Extract sub-forums - try multiple selectors to find them
      const subForums = [];

      // Try different ways sub-forums might be structured in VOZ
      // Method 1: Look for subForumList container
      let subForumList = item.querySelector('.subForumList, .node-sub-forums, .sub-forums');

      // Method 2: Look for links within the item that have /f/ in href but aren't the main link
      if (!subForumList) {
        const allLinks = item.querySelectorAll('a[href*="/f/"]');
        allLinks.forEach(link => {
          const subTitle = link.textContent.trim();
          const subLink = link.href;
          // Skip if it's the same as the parent title or empty
          if (subTitle && subLink && subTitle !== itemTitle && link !== titleLink) {
            if (!subForums.find(s => s.title === subTitle)) {
              subForums.push({ title: subTitle, link: subLink });
            }
          }
        });
      } else {
        // Method 3: Extract from dedicated sub-forum container
        const subForumEls = subForumList.querySelectorAll('a');
        subForumEls.forEach(subEl => {
          const subTitle = subEl.textContent.trim();
          const subLink = subEl.href;
          // Don't include sub-forum if it's the same as the parent title
          if (subTitle && subLink && subTitle !== itemTitle && !subForums.find(s => s.title === subTitle)) {
            subForums.push({ title: subTitle, link: subLink });
          }
        });
      }

      // Log sub-forums for debugging
      if (subForums.length > 0) {
        console.log(`[GitHub Everywhere VOZ] Found ${subForums.length} sub-forums for ${itemTitle}:`, subForums);
      }

      // Mark this title as seen
      seenTitles.add(itemTitle);

      items.push({
        title: itemTitle,
        meta: meta,
        pairs: pairs,
        link: titleLink ? titleLink.href : '#',
        subForums: subForums
      });
    });

    if (title || items.length > 0) {
      categories.push({
        title,
        items
      });
    }
  });

  console.log("[GitHub Everywhere VOZ] Extracted", categories.length, "categories");

  return { categories };
}

function extractForumListData() {
  console.log("[GitHub Everywhere VOZ] Extracting forum list data...");

  const titleEl = document.querySelector('h1.p-title-value, .p-title-value, h1');
  const title = titleEl ? titleEl.textContent.trim() : 'Forum List';

  // Extract breadcrumb from DOM - only get the first breadcrumb list
  const breadcrumbs = [];
  const breadcrumbContainer = document.querySelector('.p-breadcrumbs');
  if (breadcrumbContainer) {
    const breadcrumbEls = breadcrumbContainer.querySelectorAll('li');
    breadcrumbEls.forEach(el => {
      const link = el.querySelector('a');
      if (link) {
        breadcrumbs.push({ text: link.textContent.trim(), href: link.href });
      }
    });
  }

  console.log("[GitHub Everywhere VOZ] Forum list breadcrumbs:", breadcrumbs);

  // Extract pagination
  const pagination = {
    currentPage: 1,
    totalPages: 1,
    pages: []
  };

  const pageNavEl = document.querySelector('.pageNav');
  if (pageNavEl) {
    const currentPageEl = pageNavEl.querySelector('.pageNav-page--current a');
    if (currentPageEl) {
      pagination.currentPage = parseInt(currentPageEl.textContent.trim());
    }

    // Extract all page numbers
    const pageEls = pageNavEl.querySelectorAll('.pageNav-page a');
    pageEls.forEach(el => {
      const pageNum = parseInt(el.textContent.trim());
      const pageUrl = el.href;
      if (!isNaN(pageNum)) {
        pagination.pages.push({ num: pageNum, url: pageUrl });
      }
    });

    // Get total pages from the last page link
    const lastPageEl = pageNavEl.querySelector('.pageNav-page:last-child a');
    if (lastPageEl) {
      const lastPageNum = parseInt(lastPageEl.textContent.trim());
      if (!isNaN(lastPageNum)) {
        pagination.totalPages = lastPageNum;
      }
    }
  }

  // Extract threads
  const threads = [];
  const threadEls = document.querySelectorAll('.structItem--thread, .structItem');

  threadEls.forEach(thread => {
    // Extract avatar
    const avatarEl = thread.querySelector('.structItem-cell--icon .avatar img, .avatar img');
    const avatar = avatarEl ? (avatarEl.src || avatarEl.getAttribute('data-src')) : '';

    // Extract prefix first (if exists)
    const prefixEl = thread.querySelector('.structItem-title .labelLink, .structItem-title .label');
    const prefix = prefixEl ? prefixEl.textContent.trim() : '';

    // Extract main thread title link (exclude prefix links)
    const titleLinks = thread.querySelectorAll('.structItem-title a');
    let titleLink = null;
    let threadTitle = '';

    titleLinks.forEach(link => {
      // Skip if this is a prefix link (has labelLink class or contains label span)
      if (!link.classList.contains('labelLink') && !link.querySelector('.label')) {
        titleLink = link;
        threadTitle = link.textContent.trim();
      }
    });

    // Fallback: if no link found, try the old method
    if (!titleLink) {
      titleLink = thread.querySelector('.structItem-title a:not(.labelLink)');
      if (titleLink) {
        threadTitle = titleLink.textContent.trim();
      }
    }

    const authorEl = thread.querySelector('.username, a[data-username], .structItem-minor .username');
    const author = authorEl ? authorEl.textContent.trim() : '';

    const metaEl = thread.querySelector('.structItem-minor');
    const meta = metaEl ? metaEl.textContent.trim() : '';

    // Extract replies and views
    const repliesEl = thread.querySelector('.structItem-cell--meta dl:first-child dd, .pairs--justified:first-child dd');
    const replies = repliesEl ? repliesEl.textContent.trim() : '';

    const viewsEl = thread.querySelector('.structItem-cell--meta dl:last-child dd, .pairs--justified:last-child dd');
    const views = viewsEl ? viewsEl.textContent.trim() : '';

    if (threadTitle) {
      threads.push({
        title: threadTitle,
        author: author,
        avatar: avatar,
        meta: meta,
        replies: replies,
        views: views,
        prefix: prefix,
        link: titleLink ? titleLink.href : '#'
      });
    }
  });

  console.log("[GitHub Everywhere VOZ] Extracted", threads.length, "threads");

  return {
    title,
    breadcrumbs,
    threads,
    pagination
  };
}

function getGitHubCSS() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --ghx-bg-canvas: #0d1117;
      --ghx-bg-subtle: #161b22;
      --ghx-bg-muted: #21262d;
      --ghx-border: #30363d;
      --ghx-border-muted: #21262d;
      --ghx-fg-default: #c9d1d9;
      --ghx-fg-muted: #8b949e;
      --ghx-fg-subtle: #6e7681;
      --ghx-accent: #58a6ff;
      --ghx-accent-emphasis: #1f6feb;
      --ghx-success: #238636;
      --ghx-btn-bg: #21262d;
      --ghx-btn-hover: #30363d;
      --ghx-radius: 6px;
      --ghx-radius-lg: 12px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      background: var(--ghx-bg-canvas);
      color: var(--ghx-fg-default);
      font-size: 14px;
      line-height: 1.5;
    }

    /* Header */
    .gh-header {
      background: var(--ghx-bg-subtle);
      border-bottom: 1px solid var(--ghx-border);
      padding: 12px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .gh-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      text-decoration: none;
      position: relative;
      z-index: 1001;
    }

    .gh-logo svg {
      width: 32px;
      height: 32px;
      color: #ffffff;
    }

    /* Theme-specific icon colors */
    html[data-gh-everywhere="light"] .gh-logo svg {
      color: #0d1117;
    }

    html[data-gh-everywhere="dark"] .gh-logo svg {
      color: #ffffff;
    }

    .gh-nav {
      display: flex;
      gap: 8px;
      margin-left: auto;
      align-items: center;
      flex-shrink: 0;
    }

    .gh-nav a {
      color: #ffffff;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: var(--ghx-radius);
      font-weight: 500;
      font-size: 14px;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .gh-nav a:hover {
      background: rgba(177, 186, 196, 0.12);
    }

    .gh-nav-primary {
      background: rgba(240, 246, 252, 0.1) !important;
      border: 1px solid rgba(240, 246, 252, 0.1) !important;
      color: #ffffff !important;
      border-radius: var(--ghx-radius) !important;
      font-weight: 600 !important;
    }

    .gh-nav-primary:hover {
      background: rgba(240, 246, 252, 0.2) !important;
      border-color: rgba(240, 246, 252, 0.2) !important;
    }

    /* Main content */
    .gh-container {
      max-width: 1012px;
      margin: 0 auto;
      padding: 0 32px 32px 32px;
    }

    .gh-homepage-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    /* Breadcrumb */
    .gh-breadcrumb {
      color: var(--ghx-fg-muted);
      font-size: 14px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .gh-breadcrumb a {
      color: var(--ghx-accent);
      text-decoration: none;
    }

    .gh-breadcrumb a:hover {
      text-decoration: underline;
    }

    .gh-breadcrumb span {
      color: var(--ghx-fg-default);
    }

    /* Homepage - Trending style */
    .gh-trending-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--ghx-border);
    }

    .gh-trending-header h1 {
      font-size: 24px;
      font-weight: 600;
      color: var(--ghx-fg-default);
    }

    .gh-trending-tabs {
      display: flex;
      gap: 8px;
    }

    .gh-tab {
      background: transparent;
      border: none;
      color: var(--ghx-fg-muted);
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-radius: var(--ghx-radius);
    }

    .gh-tab:hover {
      background: var(--ghx-bg-muted);
      color: var(--ghx-fg-default);
    }

    .gh-tab.active {
      background: var(--ghx-accent-emphasis);
      color: #ffffff;
    }

    .gh-category-section {
      margin-bottom: 32px;
    }

    .gh-category-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--ghx-fg-default);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--ghx-border-muted);
    }

    .gh-repo-list {
      display: grid;
      gap: 16px;
    }

    .gh-repo-item {
      background: transparent;
      border: 1px solid var(--ghx-border);
      border-radius: var(--ghx-radius);
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: border-color 0.15s;
    }

    .gh-repo-item:hover {
      border-color: var(--ghx-accent);
    }

    .gh-repo-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .gh-repo-icon svg {
      width: 16px;
      height: 16px;
      fill: var(--ghx-success);
    }

    .gh-repo-content {
      flex: 1;
      min-width: 0;
    }

    .gh-repo-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .gh-repo-title a {
      color: var(--ghx-accent);
      text-decoration: none;
    }

    .gh-repo-title a:hover {
      text-decoration: underline;
    }

    .gh-repo-meta {
      font-size: 12px;
      color: var(--ghx-fg-muted);
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .gh-repo-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .gh-repo-meta-label {
      color: var(--ghx-fg-muted);
      font-weight: 500;
    }

    .gh-repo-meta-value {
      color: var(--ghx-fg-default);
      font-weight: 600;
    }

    .gh-repo-description {
      font-size: 12px;
      color: var(--ghx-fg-muted);
      margin-top: 8px;
      line-height: 1.4;
    }

    .gh-subforums {
      margin-top: 8px;
      font-size: 12px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .gh-subforums-label {
      color: var(--ghx-fg-muted);
      font-weight: 500;
    }

    .gh-subforum-link {
      color: var(--ghx-accent);
      text-decoration: none;
      font-size: 12px;
    }

    .gh-subforum-link:hover {
      text-decoration: underline;
    }

    .gh-language-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    /* PR List (Forum List) */
    .gh-pr-header {
      background: transparent;
      border-bottom: 1px solid var(--ghx-border);
      padding: 24px 0 16px 0;
      margin-bottom: 16px;
    }

    .gh-pr-header-title h1 {
      color: var(--ghx-fg-default);
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .gh-pr-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .gh-pr-item {
      background: transparent;
      border: 1px solid var(--ghx-border);
      border-radius: var(--ghx-radius);
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: border-color 0.15s;
    }

    .gh-pr-item:hover {
      border-color: var(--ghx-accent);
    }

    .gh-pr-avatar {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .gh-pr-avatar img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--ghx-border);
    }

    .gh-pr-avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--ghx-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      border: 1px solid var(--ghx-border);
    }

    .gh-pr-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .gh-pr-icon svg {
      width: 16px;
      height: 16px;
      fill: var(--ghx-success);
    }

    .gh-pr-content {
      flex: 1;
      min-width: 0;
    }

    .gh-pr-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .gh-pr-title a {
      color: var(--ghx-fg-default);
      text-decoration: none;
    }

    .gh-pr-title a:hover {
      color: var(--ghx-accent);
    }

    .gh-pr-prefix {
      background: rgba(56, 139, 253, 0.15);
      color: var(--ghx-accent);
      border: none;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
    }

    .gh-pr-meta {
      font-size: 12px;
      color: var(--ghx-fg-muted);
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .gh-pr-author {
      font-weight: 600;
      color: var(--ghx-fg-default);
    }

    .gh-pr-stats {
      color: var(--ghx-fg-muted);
      display: flex;
      gap: 12px;
    }

    .gh-pr-stats::before {
      content: "·";
      margin-right: 4px;
    }

    /* Pagination */
    .gh-pagination {
      margin-top: 24px;
      padding: 16px 0;
      border-top: 1px solid var(--ghx-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .gh-pagination-actions {
      display: flex;
      gap: 8px;
    }

    .gh-pagination-prev,
    .gh-pagination-next {
      background: var(--ghx-btn-bg);
      border: 1px solid var(--ghx-border);
      color: var(--ghx-fg-default);
      padding: 5px 12px;
      border-radius: var(--ghx-radius);
      font-size: 14px;
      text-decoration: none;
      transition: background 0.15s;
    }

    .gh-pagination-prev:hover,
    .gh-pagination-next:hover {
      background: var(--ghx-btn-hover);
    }

    .gh-pagination-disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .gh-pagination-numbers {
      display: flex;
      gap: 4px;
    }

    .gh-pagination-page {
      background: var(--ghx-btn-bg);
      border: 1px solid var(--ghx-border);
      color: var(--ghx-fg-default);
      min-width: 32px;
      padding: 5px 8px;
      border-radius: var(--ghx-radius);
      font-size: 14px;
      text-align: center;
      text-decoration: none;
      transition: background 0.15s;
    }

    .gh-pagination-page:hover {
      background: var(--ghx-btn-hover);
    }

    .gh-pagination-current {
      background: var(--ghx-accent-emphasis);
      border-color: var(--ghx-accent-emphasis);
      color: #ffffff;
    }

    .gh-pagination-ellipsis {
      padding: 5px 8px;
      color: var(--ghx-fg-muted);
    }

    @media (max-width: 768px) {
      .gh-pagination {
        flex-direction: column;
      }

      .gh-pagination-numbers {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
    }

    /* Buttons */
    .gh-btn {
      background: var(--ghx-btn-bg);
      border: 1px solid var(--ghx-border);
      color: var(--ghx-fg-default);
      border-radius: var(--ghx-radius);
      padding: 5px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .gh-btn:hover {
      background: var(--ghx-btn-hover);
    }

    .gh-btn-primary {
      background: var(--ghx-success);
      border-color: rgba(240, 246, 252, 0.1);
      color: #ffffff;
    }

    .gh-btn-primary:hover {
      background: #2da042;
    }

    /* Footer */
    .gh-footer {
      margin-top: 48px;
      padding: 32px 0;
      border-top: 1px solid var(--ghx-border);
      text-align: center;
      color: var(--ghx-fg-muted);
      font-size: 12px;
    }

    /* Issue header */
    .gh-issue-header {
      background: transparent;
      border-bottom: 1px solid var(--ghx-border);
      padding: 24px 0 16px 0;
      margin: 0 0 16px 0;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .gh-issue-status {
      width: 28px;
      height: 28px;
      background: var(--ghx-success);
      border-radius: 50%;
      flex-shrink: 0;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white'%3E%3Cpath d='M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0-9a8 8 0 1 0 0 16A8 8 0 0 0 8 .5ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z'/%3E%3C/svg%3E");
      background-size: 16px 16px;
      background-position: center;
      background-repeat: no-repeat;
    }

    .gh-issue-title {
      flex: 1;
    }

    .gh-issue-title h1 {
      color: var(--ghx-fg-default);
      font-size: 24px;
      font-weight: 400;
      margin: 0;
    }

    .gh-issue-meta {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--ghx-fg-muted);
    }

    /* Comments */
    .gh-comment {
      background: transparent;
      border: none;
      padding: 0;
      margin: 0 0 8px 0;
      display: flex;
      gap: 16px;
    }

    .gh-comment-avatar {
      width: 48px;
      flex-shrink: 0;
    }

    .gh-comment-avatar img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--ghx-border);
    }

    .gh-comment-main {
      flex: 1;
      background: var(--ghx-bg-canvas);
      border: 1px solid var(--ghx-border);
      border-radius: var(--ghx-radius);
      overflow: hidden;
      min-height: 100px;
    }

    .gh-comment-header {
      background: var(--ghx-bg-subtle);
      border-bottom: 1px solid var(--ghx-border);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--ghx-fg-muted);
    }

    .gh-comment-author {
      color: var(--ghx-fg-default);
      font-weight: 600;
      text-decoration: none;
    }

    .gh-comment-author:hover {
      color: var(--ghx-accent);
    }

    .gh-comment-author-badge {
      background: var(--ghx-btn-bg);
      border: 1px solid var(--ghx-border);
      border-radius: 12px;
      padding: 0 8px;
      font-size: 11px;
      color: var(--ghx-fg-muted);
    }

    .gh-comment-body {
      padding: 16px 16px 0 16px;
      color: var(--ghx-fg-default);
      font-size: 14px;
      line-height: 1.5;
    }

    .gh-comment-body p {
      margin: 0 0 8px 0;
    }

    .gh-comment-body p:last-child {
      margin-bottom: 0;
    }

    /* Hide ads and scripts in comments */
    .gh-comment-body .adsbypubpower,
    .gh-comment-body pubtag,
    .gh-comment-body script,
    .gh-comment-body style,
    .gh-comment-body iframe[src*="ads"],
    .gh-comment-body iframe[src*="banner"],
    .gh-comment-body .ad-slot,
    .gh-comment-body [class*="ad-"],
    .gh-comment-body [id*="ad-"],
    .gh-comment-body [class*="pub"],
    .gh-comment-body [id*="pub"],
    .gh-comment-body ins,
    .gh-comment-body .adsbox,
    .gh-comment-body .ad-container,
    .gh-comment-body .advertisement,
    .gh-comment-body [data-ad-slot],
    .gh-comment-body [data-ad-client] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      left: -99999px !important;
    }

    .gh-comment-body p:last-child {
      margin: 0;
    }

    .gh-comment-body a {
      color: var(--ghx-accent);
      text-decoration: none;
    }

    .gh-comment-body a:hover {
      text-decoration: underline;
    }

    /* Fix VOZ images width */
    .gh-comment-body img,
    .bbImageWrapper,
    .js-lbImage,
    .bbImageWrapper img,
    .js-lbImage img {
      max-width: 100% !important;
      height: auto !important;
      width: auto !important;
      display: block !important;
    }

    .gh-comment-footer {
      background: transparent;
      border-top: 1px solid var(--ghx-border);
      padding: 8px 16px;
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 10;
      display: none !important;
    }

    .gh-comment-btn {
      background: transparent;
      color: var(--ghx-fg-muted);
      border: none;
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: var(--ghx-radius);
      pointer-events: auto;
      position: relative;
      z-index: 11;
    }

    .gh-comment-btn:hover {
      background: var(--ghx-bg-muted);
    }

    /* Reactions */
    .gh-reactions {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      padding: 0 16px;
    }

    .gh-reaction {
      background: var(--ghx-bg-subtle);
      border: 1px solid var(--ghx-border);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      color: var(--ghx-fg-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Reply box */
    .gh-reply-box {
      background: var(--ghx-bg-canvas);
      border: 1px solid var(--ghx-border);
      border-radius: var(--ghx-radius);
      padding: 16px;
      margin: 24px 0 0 64px;
    }

    .gh-reply-box h3 {
      color: var(--ghx-fg-default);
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    .gh-reply-textarea {
      width: 100%;
      min-height: 100px;
      background: var(--ghx-bg-canvas);
      border: 1px solid var(--ghx-border);
      border-radius: var(--ghx-radius);
      padding: 8px 12px;
      color: var(--ghx-fg-default);
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
    }

    .gh-reply-textarea:focus {
      outline: none;
      border-color: var(--ghx-accent-emphasis);
      box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.3);
    }

    /* Buttons */
    .gh-btn {
      background: var(--ghx-btn-bg);
      border: 1px solid var(--ghx-border);
      color: var(--ghx-fg-default);
      border-radius: var(--ghx-radius);
      padding: 5px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .gh-btn:hover {
      background: var(--ghx-btn-hover);
    }

    .gh-btn-primary {
      background: var(--ghx-success);
      border-color: rgba(240, 246, 252, 0.1);
      color: #ffffff;
    }

    .gh-btn-primary:hover {
      background: #2da042;
    }

    /* Footer */
    .gh-footer {
      margin-top: 48px;
      padding: 32px 0;
      border-top: 1px solid var(--ghx-border);
      text-align: center;
      color: var(--ghx-fg-muted);
      font-size: 12px;
    }

    /* Quote */
    .gh-quote {
      background: var(--ghx-bg-subtle);
      border-left: 4px solid var(--ghx-border);
      padding: 8px 16px;
      margin: 8px 0;
      font-size: 13px;
      color: var(--ghx-fg-muted);
    }

    /* Force hide all scroll/nav buttons, ads, and VOZ branding */
    .u-navButtons, .js-navButtons, .u-scrollButtons, .js-scrollButtons,
    .navButtons, .scrollButtons, .button-scroll, .scroll-button,
    .js-selectToQuoteEnd,
    pubtag, .adsbypubpower, .ad-slot, .adsbox, .ad-container,
    .advertisement, [class*="ad-"], [id*="ad-"], [class*="pub"], [id*="pub"],
    ins, [data-ad-slot], [data-ad-client], iframe[src*="ads"], iframe[src*="banner"],
    .p-header-logo, .p-header-logo img, .p-header-logo--image {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      position: absolute !important;
      left: -99999px !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    ::-webkit-scrollbar-track {
      background: var(--ghx-bg-canvas);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--ghx-border);
      border-radius: 6px;
      border: 3px solid var(--ghx-bg-canvas);
    }

    @media (max-width: 768px) {
      .gh-header {
        padding: 12px 16px;
      }

      .gh-container {
        padding: 16px;
      }

      .gh-comment {
        flex-direction: column;
        gap: 8px;
      }

      .gh-comment-avatar {
        width: 100%;
        display: flex;
      }

      .gh-reply-box {
        margin-left: 0;
      }
    }
  `;
}

function generateGitHubHTML(data) {
  const { title, breadcrumbs, comments, pagination } = data;

  // Build breadcrumb from DOM data or fallback to URL
  let breadcrumbHTML = '';
  if (breadcrumbs && breadcrumbs.length > 0) {
    breadcrumbHTML = `<div class="gh-breadcrumb">
      ${breadcrumbs.map((bc, idx) => {
        if (idx === breadcrumbs.length - 1) {
          return `<span>${escapeHtml(bc.text)}</span>`;
        }
        return `<a href="${escapeHtml(bc.href)}">${escapeHtml(bc.text)}</a> / `;
      }).join('')}
    </div>`;
  } else {
    // Fallback to URL-based breadcrumb
    const pathParts = location.pathname.split('/').filter(p => p);
    breadcrumbHTML = `<div class="gh-breadcrumb">
      <a href="/">voz.vn</a>${pathParts.length > 0 ? ' / ' + pathParts.map(p => `<span>${escapeHtml(p)}</span>`).join(' / ') : ' / <span>' + escapeHtml(title) + '</span>'}
    </div>`;
  }

  const commentsHTML = comments.map((comment, idx) => `
    <div class="gh-comment" data-original-index="${idx}">
      <div class="gh-comment-avatar">
        ${comment.avatar ?
          `<img src="${escapeHtml(comment.avatar)}" alt="${escapeHtml(comment.username)}">` :
          `<div style="width:40px;height:40px;border-radius:50%;background:var(--ghx-accent);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;">${escapeHtml(comment.username.charAt(0)).toUpperCase()}</div>`
        }
      </div>
      <div class="gh-comment-main">
        <div class="gh-comment-header">
          <a href="#" class="gh-comment-author">${escapeHtml(comment.username)}</a>
          <span class="gh-comment-author-badge">${idx === 0 ? 'Original Poster' : 'Senior Member'}</span>
          <span>${comment.timestamp ? escapeHtml(new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })) : 'Apr 11, 2025'}</span>
        </div>
        <div class="gh-comment-body">
          ${comment.content}
        </div>
        ${comment.reactions.length > 0 ? `
          <div class="gh-reactions">
            ${comment.reactions.map(r => `<span class="gh-reaction">${r.emoji} ${r.count}</span>`).join('')}
          </div>
        ` : ''}
        <div class="gh-comment-footer">
          <button class="gh-comment-btn">👍 React</button>
          <button class="gh-comment-btn">Reply</button>
          <button class="gh-comment-btn">Quote</button>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="gh-wrapper">
      <!-- Header -->
      <header class="gh-header">
        <a href="#" class="gh-logo">
          ${GH_MARK_SVG}
          voz
        </a>
        <nav class="gh-nav">
          <a href="/login/">Login</a>
          <a href="/register/" class="gh-nav-primary">Register</a>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="gh-container">
        ${breadcrumbHTML}

        <!-- Issue Header -->
        <div class="gh-issue-header">
          <div class="gh-issue-status"></div>
          <div class="gh-issue-title">
            <h1>${escapeHtml(title)}</h1>
            <div class="gh-issue-meta">
              <span>#1089186</span>
              <span>Opened Apr 11, 2025 by ${escapeHtml(comments[0]?.username || 'vtalinh')}</span>
              <span>${comments.length} comments</span>
            </div>
          </div>
        </div>

        ${commentsHTML}

        ${pagination && pagination.pages.length > 1 ? `
          <div class="gh-pagination">
            <div class="gh-pagination-actions">
              ${pagination.currentPage > 1 ? `
                <a href="${escapeHtml(pagination.pages[0].url.replace(/page-\d+/, `page-${pagination.currentPage - 1}`))}" class="gh-pagination-prev">Previous</a>
              ` : '<span class="gh-pagination-prev gh-pagination-disabled">Previous</span>'}
              ${pagination.currentPage < pagination.totalPages ? `
                <a href="${escapeHtml(pagination.pages[0].url.replace(/page-\d+/, `page-${pagination.currentPage + 1}`))}" class="gh-pagination-next">Next</a>
              ` : '<span class="gh-pagination-next gh-pagination-disabled">Next</span>'}
            </div>
            <div class="gh-pagination-numbers">
              ${pagination.pages.slice(0, 7).map(p => `
                <a href="${escapeHtml(p.url)}" class="gh-pagination-page ${p.num === pagination.currentPage ? 'gh-pagination-current' : ''}">${p.num}</a>
              `).join('')}
              ${pagination.totalPages > 7 ? `<span class="gh-pagination-ellipsis">...</span>` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Reply Box -->
        <div class="gh-reply-box">
          <h3>Leave a comment</h3>
          <textarea class="gh-reply-textarea" placeholder="Add your comment here..."></textarea>
          <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px;">
            <button class="gh-btn">Cancel</button>
            <button class="gh-btn gh-btn-primary">Comment</button>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="gh-footer">
        <p>© 2026 GitHub, Inc.</p>
      </footer>
    </div>
  `;
}

function transformThreadDetailPage() {
  console.log("[GitHub Everywhere VOZ] Transforming thread detail page...");

  try {
    const data = extractThreadData();
    const githubHTML = generateGitHubHTML(data);

    // Step 1: Hide all VOZ elements
    console.log("[GitHub Everywhere VOZ] Hiding VOZ elements...");
    const hideStyle = document.createElement('style');
    hideStyle.setAttribute('data-gh-hide', 'true');
    hideStyle.textContent = `
      /* Hide ALL VOZ elements */
      .p-header, .p-nav, .p-navSticky, .p-nav-inner,
      .p-breadcrumbs, .p-breadcrumb,
      .p-title, .p-body-main, .p-body-inner,
      article.message, .message, .structItem,
      .block-container, .block-header,
      .p-footer, .offCanvasMenu,
      .p-pageWrapper, .p-body, .p-body-content,
      .u-navButtons, .js-navButtons, .u-scrollButtons, .js-scrollButtons,
      .navButtons, .scrollButtons,
      .button-scroll, .scroll-button,
      .has-scroll-buttons, .is-active {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -99999px !important;
        pointer-events: none !important;
      }

      /* Hide any floating/fixed elements */
      [style*="position: fixed"], [style*="position:sticky"] {
        display: none !important;
      }

      body {
        background: var(--ghx-bg-canvas) !important;
        color: var(--ghx-fg-default) !important;
      }

      html {
        background: var(--ghx-bg-canvas) !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Step 2: Inject GitHub CSS
    console.log("[GitHub Everywhere VOZ] Injecting GitHub CSS...");
    const githubStyle = document.createElement('style');
    githubStyle.setAttribute('data-gh-css', 'true');
    githubStyle.textContent = getGitHubCSS();
    document.head.appendChild(githubStyle);

    // Step 3: Append GitHub HTML to body
    console.log("[GitHub Everywhere VOZ] Appending GitHub HTML...");
    const container = document.createElement('div');
    container.innerHTML = githubHTML;
    document.body.appendChild(container.firstElementChild);

    console.log("[GitHub Everywhere VOZ] GitHub wrapper added. Checking...");
    console.log("[GitHub Everywhere VOZ] .gh-wrapper count:", document.querySelectorAll('.gh-wrapper').length);
    console.log("[GitHub Everywhere VOZ] .gh-header count:", document.querySelectorAll('.gh-header').length);
    console.log("[GitHub Everywhere VOZ] .gh-comment count:", document.querySelectorAll('.gh-comment').length);

    // Add event listeners using delegation for better reliability
    setTimeout(() => {
      // Use event delegation on the wrapper
      const wrapper = document.querySelector('.gh-wrapper');
      if (wrapper) {
        console.log("[GitHub Everywhere VOZ] Setting up event delegation on wrapper");

        wrapper.addEventListener('click', function(e) {
          // Check if clicked element is a comment button
          if (e.target.classList.contains('gh-comment-btn')) {
            e.preventDefault();
            e.stopPropagation();
            console.log("[GitHub Everywhere VOZ] Comment button clicked:", e.target.textContent);
            alert('Feature coming soon!');
          }

          // Check if clicked element is the primary button
          if (e.target.classList.contains('gh-btn-primary')) {
            e.preventDefault();
            e.stopPropagation();
            const textarea = document.querySelector('.gh-reply-textarea');
            if (textarea && textarea.value.trim()) {
              alert('Comment submitted! (Demo mode)');
              textarea.value = '';
            }
          }
        }, false);

        // Also add direct listeners as backup
        const buttons = document.querySelectorAll('.gh-comment-btn');
        console.log("[GitHub Everywhere VOZ] Found", buttons.length, "comment buttons");
        buttons.forEach((btn) => {
          btn.style.pointerEvents = 'auto';
        });

        const primaryBtn = document.querySelector('.gh-btn-primary');
        if (primaryBtn) {
          primaryBtn.style.pointerEvents = 'auto';
        }

        console.log("[GitHub Everywhere VOZ] Event delegation set up");
      }
    }, 200);

    console.log("[GitHub Everywhere VOZ] Page transformed successfully");
  } catch (error) {
    console.error("[GitHub Everywhere VOZ] Error transforming page:", error);
  }
}

function generateHomepageHTML(data) {
  const { categories } = data;

  const categoriesHTML = categories.map(category => {
    const itemsHTML = category.items.map(item => {
      // Build metadata display from pairs or meta text
      let metaHTML = '';
      if (item.pairs && item.pairs.length > 0) {
        metaHTML = `<div class="gh-repo-meta">
          ${item.pairs.map(p => `<span class="gh-repo-meta-item"><span class="gh-repo-meta-label">${escapeHtml(p.label)}</span> <span class="gh-repo-meta-value">${escapeHtml(p.value)}</span></span>`).join(' · ')}
        </div>`;
      } else if (item.meta) {
        metaHTML = `<div class="gh-repo-meta">${escapeHtml(item.meta)}</div>`;
      }

      return `
        <div class="gh-repo-item">
          <div class="gh-repo-icon">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M10.5 7.75a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm1.43.75a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5h-3.32Z"/>
            </svg>
          </div>
          <div class="gh-repo-content">
            <div class="gh-repo-title">
              <a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a>
            </div>
            ${metaHTML}
            ${item.subForums && item.subForums.length > 0 ? `
              <div class="gh-subforums">
                <span class="gh-subforums-label">Sub-forums:</span>
                ${item.subForums.map(sf => `<a href="${escapeHtml(sf.link)}" class="gh-subforum-link">${escapeHtml(sf.title)}</a>`).join(' · ')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="gh-category-section">
        ${category.title ? `<h2 class="gh-category-title">${escapeHtml(category.title)}</h2>` : ''}
        <div class="gh-repo-list">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="gh-wrapper">
      <!-- Header -->
      <header class="gh-header">
        <a href="/" class="gh-logo">
          ${GH_MARK_SVG}
          voz
        </a>
        <nav class="gh-nav">
          <a href="/login/">Login</a>
          <a href="/register/" class="gh-nav-primary">Register</a>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="gh-homepage-container">
        ${categoriesHTML}
      </main>

      <!-- Footer -->
      <footer class="gh-footer">
        <p>© 2026 GitHub, Inc.</p>
      </footer>
    </div>
  `;
}

function generateForumListHTML(data) {
  const { title, breadcrumbs, threads, pagination } = data;

  // Build breadcrumb from DOM data or fallback to URL
  let breadcrumbHTML = '';
  if (breadcrumbs && breadcrumbs.length > 0) {
    breadcrumbHTML = `<div class="gh-breadcrumb">
      ${breadcrumbs.map((bc, idx) => {
        if (idx === breadcrumbs.length - 1) {
          return `<span>${escapeHtml(bc.text)}</span>`;
        }
        return `<a href="${escapeHtml(bc.href)}">${escapeHtml(bc.text)}</a> / `;
      }).join('')}
    </div>`;
  } else {
    // Fallback to URL-based breadcrumb
    const pathParts = location.pathname.split('/').filter(p => p);
    breadcrumbHTML = `<div class="gh-breadcrumb">
      <a href="/">voz.vn</a>${pathParts.length > 0 ? ' / ' + pathParts.map(p => `<span>${escapeHtml(p)}</span>`).join(' / ') : ''}
    </div>`;
  }

  const threadsHTML = threads.map(thread => {
    // Build stats string
    let statsStr = [];
    if (thread.replies !== '') statsStr.push(`${thread.replies} replies`);
    if (thread.views !== '') statsStr.push(`${thread.views} views`);

    return `
      <div class="gh-pr-item">
        <div class="gh-pr-avatar">
          ${thread.avatar ?
            `<img src="${escapeHtml(thread.avatar)}" alt="${escapeHtml(thread.author)}">` :
            `<div class="gh-pr-avatar-placeholder">${escapeHtml(thread.author.charAt(0) || '?').toUpperCase()}</div>`
          }
        </div>
        <div class="gh-pr-icon">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0-9a8 8 0 1 0 0 16A8 8 0 0 0 8 .5ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z"/>
          </svg>
        </div>
        <div class="gh-pr-content">
          <div class="gh-pr-title">
            ${thread.prefix ? `<span class="gh-pr-prefix">${escapeHtml(thread.prefix)}</span>` : ''}
            <a href="${escapeHtml(thread.link)}">${escapeHtml(thread.title)}</a>
          </div>
          <div class="gh-pr-meta">
            ${thread.author ? `<span class="gh-pr-author">${escapeHtml(thread.author)}</span>` : ''}
            ${statsStr.length > 0 ? `<span class="gh-pr-stats">${escapeHtml(statsStr.join(' · '))}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Build pagination
  let paginationHTML = '';
  if (pagination.pages.length > 1) {
    paginationHTML = `
      <div class="gh-pagination">
        <div class="gh-pagination-actions">
          ${pagination.currentPage > 1 ? `
            <a href="${escapeHtml(pagination.pages[0].url.replace(/page-\d+/, `page-${pagination.currentPage - 1}`))}" class="gh-pagination-prev">Previous</a>
          ` : '<span class="gh-pagination-prev gh-pagination-disabled">Previous</span>'}
          ${pagination.currentPage < pagination.totalPages ? `
            <a href="${escapeHtml(pagination.pages[0].url.replace(/page-\d+/, `page-${pagination.currentPage + 1}`))}" class="gh-pagination-next">Next</a>
          ` : '<span class="gh-pagination-next gh-pagination-disabled">Next</span>'}
        </div>
        <div class="gh-pagination-numbers">
          ${pagination.pages.slice(0, 7).map(p => `
            <a href="${escapeHtml(p.url)}" class="gh-pagination-page ${p.num === pagination.currentPage ? 'gh-pagination-current' : ''}">${p.num}</a>
          `).join('')}
          ${pagination.totalPages > 7 ? `<span class="gh-pagination-ellipsis">...</span>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="gh-wrapper">
      <!-- Header -->
      <header class="gh-header">
        <a href="/" class="gh-logo">
          ${GH_MARK_SVG}
          voz
        </a>
        <nav class="gh-nav">
          <a href="/login/">Login</a>
          <a href="/register/" class="gh-nav-primary">Register</a>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="gh-container">
        ${breadcrumbHTML}

        <div class="gh-pr-header">
          <div class="gh-pr-header-title">
            <h1>${escapeHtml(title)}</h1>
          </div>
        </div>

        <div class="gh-pr-list">
          ${threadsHTML}
        </div>

        ${paginationHTML}
      </main>

      <!-- Footer -->
      <footer class="gh-footer">
        <p>© 2026 GitHub, Inc.</p>
      </footer>
    </div>
  `;
}

function transformForumListPage() {
  console.log("[GitHub Everywhere VOZ] Transforming forum list page...");

  try {
    const data = extractForumListData();
    console.log("[GitHub Everywhere VOZ] Forum list data:", data);

    const githubHTML = generateForumListHTML(data);

    // Step 1: Hide all VOZ elements
    console.log("[GitHub Everywhere VOZ] Hiding VOZ elements...");
    const hideStyle = document.createElement('style');
    hideStyle.setAttribute('data-gh-hide', 'true');
    hideStyle.textContent = `
      /* Hide ALL VOZ elements */
      .p-header, .p-nav, .p-navSticky, .p-nav-inner,
      .p-breadcrumbs, .p-breadcrumb,
      .p-title, .p-body-main, .p-body-inner,
      article.message, .message, .structItem,
      .block-container, .block-header,
      .p-footer, .offCanvasMenu,
      .p-pageWrapper, .p-body, .p-body-content,
      .u-navButtons, .js-navButtons, .u-scrollButtons, .js-scrollButtons,
      .navButtons, .scrollButtons,
      .button-scroll, .scroll-button,
      .has-scroll-buttons, .is-active {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -99999px !important;
        pointer-events: none !important;
      }

      /* Hide any floating/fixed elements */
      [style*="position: fixed"], [style*="position:sticky"] {
        display: none !important;
      }

      body {
        background: var(--ghx-bg-canvas) !important;
        color: var(--ghx-fg-default) !important;
      }

      html {
        background: var(--ghx-bg-canvas) !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Step 2: Inject GitHub CSS
    console.log("[GitHub Everywhere VOZ] Injecting GitHub CSS...");
    const githubStyle = document.createElement('style');
    githubStyle.setAttribute('data-gh-css', 'true');
    githubStyle.textContent = getGitHubCSS();
    document.head.appendChild(githubStyle);

    // Step 3: Append GitHub HTML to body
    console.log("[GitHub Everywhere VOZ] Appending GitHub HTML...");
    const container = document.createElement('div');
    container.innerHTML = githubHTML;
    document.body.appendChild(container.firstElementChild);

    console.log("[GitHub Everywhere VOZ] GitHub wrapper added. Checking...");
    console.log("[GitHub Everywhere VOZ] .gh-wrapper count:", document.querySelectorAll('.gh-wrapper').length);
    console.log("[GitHub Everywhere VOZ] .gh-header count:", document.querySelectorAll('.gh-header').length);
    console.log("[GitHub Everywhere VOZ] .gh-pr-item count:", document.querySelectorAll('.gh-pr-item').length);

    console.log("[GitHub Everywhere VOZ] Forum list page transformed successfully");
  } catch (error) {
    console.error("[GitHub Everywhere VOZ] Error transforming forum list page:", error);
  }
}

function transformHomePage() {
  console.log("[GitHub Everywhere VOZ] Transforming home page...");

  try {
    const data = extractHomePageData();
    console.log("[GitHub Everywhere VOZ] Homepage data:", data);

    const githubHTML = generateHomepageHTML(data);

    // Step 1: Hide all VOZ elements
    console.log("[GitHub Everywhere VOZ] Hiding VOZ elements...");
    const hideStyle = document.createElement('style');
    hideStyle.setAttribute('data-gh-hide', 'true');
    hideStyle.textContent = `
      /* Hide ALL VOZ elements */
      .p-header, .p-nav, .p-navSticky, .p-nav-inner,
      .p-breadcrumbs, .p-breadcrumb,
      .p-title, .p-body-main, .p-body-inner,
      article.message, .message, .structItem,
      .block-container, .block-header,
      .p-footer, .offCanvasMenu,
      .p-pageWrapper, .p-body, .p-body-content,
      .u-navButtons, .js-navButtons, .u-scrollButtons, .js-scrollButtons,
      .navButtons, .scrollButtons,
      .button-scroll, .scroll-button,
      .has-scroll-buttons, .is-active {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -99999px !important;
        pointer-events: none !important;
      }

      /* Hide any floating/fixed elements */
      [style*="position: fixed"], [style*="position:sticky"] {
        display: none !important;
      }

      body {
        background: var(--ghx-bg-canvas) !important;
        color: var(--ghx-fg-default) !important;
      }

      html {
        background: var(--ghx-bg-canvas) !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Step 2: Inject GitHub CSS
    console.log("[GitHub Everywhere VOZ] Injecting GitHub CSS...");
    const githubStyle = document.createElement('style');
    githubStyle.setAttribute('data-gh-css', 'true');
    githubStyle.textContent = getGitHubCSS();
    document.head.appendChild(githubStyle);

    // Step 3: Append GitHub HTML to body
    console.log("[GitHub Everywhere VOZ] Appending GitHub HTML...");
    const container = document.createElement('div');
    container.innerHTML = githubHTML;
    document.body.appendChild(container.firstElementChild);

    console.log("[GitHub Everywhere VOZ] GitHub wrapper added. Checking...");
    console.log("[GitHub Everywhere VOZ] .gh-wrapper count:", document.querySelectorAll('.gh-wrapper').length);
    console.log("[GitHub Everywhere VOZ] .gh-header count:", document.querySelectorAll('.gh-header').length);
    console.log("[GitHub Everywhere VOZ] .gh-repo-item count:", document.querySelectorAll('.gh-repo-item').length);

    console.log("[GitHub Everywhere VOZ] Home page transformed successfully");
  } catch (error) {
    console.error("[GitHub Everywhere VOZ] Error transforming home page:", error);
  }
}

function transformAuthPage() {
  console.log("[GitHub Everywhere VOZ] Transforming auth page (login/register)...");

  try {
    // Get page title
    const titleEl = document.querySelector('h1.p-title-value, .p-title-value, h1');
    const title = titleEl ? titleEl.textContent.trim() : 'Authentication';

    // Get the main form
    const formEl = document.querySelector('form') || document.querySelector('.block-container') || document.querySelector('.p-body-main');

    if (!formEl) {
      console.log("[GitHub Everywhere VOZ] No form found, using basic transformation");
      return;
    }

    // Get form HTML
    const formHTML = formEl.outerHTML;

    // Step 1: Hide all VOZ elements
    const hideStyle = document.createElement('style');
    hideStyle.setAttribute('data-gh-hide', 'true');
    hideStyle.textContent = `
      /* Hide ALL VOZ elements */
      .p-header, .p-nav, .p-navSticky, .p-nav-inner,
      .p-breadcrumbs, .p-breadcrumb,
      .p-footer, .offCanvasMenu,
      .p-pageWrapper, .p-body, .p-body-content,
      .u-navButtons, .js-navButtons, .u-scrollButtons, .js-scrollButtons,
      .navButtons, .scrollButtons,
      .button-scroll, .scroll-button {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -99999px !important;
        pointer-events: none !important;
      }

      /* Hide ads */
      pubtag, .adsbypubpower, .ad-slot, .adsbox {
        display: none !important;
        visibility: hidden !important;
      }

      body {
        background: var(--ghx-bg-canvas) !important;
        color: var(--ghx-fg-default) !important;
      }

      html {
        background: var(--ghx-bg-canvas) !important;
      }
    `;
    document.head.appendChild(hideStyle);

    // Step 2: Inject GitHub CSS
    const githubStyle = document.createElement('style');
    githubStyle.setAttribute('data-gh-css', 'true');
    githubStyle.textContent = getGitHubCSS();
    document.head.appendChild(githubStyle);

    // Step 3: Create GitHub-style page
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="gh-wrapper">
        <header class="gh-header">
          <a href="/" class="gh-logo">
            ${GH_MARK_SVG}
            voz
          </a>
          <nav class="gh-nav">
            <a href="/login/">Login</a>
            <a href="/register/" class="gh-nav-primary">Register</a>
          </nav>
        </header>

        <main class="gh-auth-page">
          <div class="gh-auth-form">
            <h1>${escapeHtml(title)}</h1>
            ${formHTML}
          </div>
        </main>

        <footer class="gh-footer">
          <p>© 2026 GitHub, Inc.</p>
        </footer>
      </div>
    `;

    // Replace body content
    document.body.innerHTML = '';
    document.body.appendChild(container.firstElementChild);

    // Add auth page specific styles
    const authStyle = document.createElement('style');
    authStyle.setAttribute('data-gh-auth-style', 'true');
    authStyle.textContent = `
      .gh-auth-page {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 120px);
        padding: 40px 20px;
      }

      .gh-auth-form {
        width: 100%;
        max-width: 340px;
      }

      .gh-auth-form h1 {
        color: var(--ghx-fg-default);
        font-size: 24px;
        font-weight: 600;
        text-align: center;
        margin-bottom: 20px;
      }

      .gh-auth-form form,
      .gh-auth-form .block-container {
        background: transparent !important;
        border: 1px solid var(--ghx-border) !important;
        border-radius: var(--ghx-radius) !important;
        padding: 20px !important;
      }

      .gh-auth-form .block-header {
        display: none !important;
      }

      .gh-auth-form input[type="text"],
      .gh-auth-form input[type="password"],
      .gh-auth-form input[type="email"] {
        width: 100% !important;
        background: var(--ghx-bg-canvas) !important;
        border: 1px solid var(--ghx-border) !important;
        color: var(--ghx-fg-default) !important;
        border-radius: var(--ghx-radius) !important;
        padding: 5px 12px !important;
        font-size: 14px !important;
        margin-bottom: 15px !important;
        box-sizing: border-box !important;
      }

      .gh-auth-form input:focus {
        outline: none !important;
        border-color: var(--ghx-accent-emphasis) !important;
        box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.3) !important;
      }

      .gh-auth-form button,
      .gh-auth-form .button,
      .gh-auth-form input[type="submit"] {
        width: 100% !important;
        background: var(--ghx-success) !important;
        border-color: rgba(240, 246, 252, 0.1) !important;
        color: #ffffff !important;
        border-radius: var(--ghx-radius) !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        margin-top: 10px !important;
      }

      .gh-auth-form .formRow,
      .gh-auth-form .formRowGroup {
        margin-bottom: 15px !important;
      }

      .gh-auth-form label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--ghx-fg-default);
      }

      .gh-auth-form .icon-container,
      .gh-auth-form .fa--xf {
        display: none !important;
      }
    `;
    document.head.appendChild(authStyle);

    console.log("[GitHub Everywhere VOZ] Auth page transformed successfully");
  } catch (error) {
    console.error("[GitHub Everywhere VOZ] Error transforming auth page:", error);
  }
}

export function init() {
  console.log("[GitHub Everywhere VOZ] Initializing...");

  const type = detectPageType();
  console.log("[GitHub Everywhere VOZ] Page type detected:", type);
  document.documentElement.setAttribute("data-gh-page", type);

  // Wait for page to fully load before transforming
  if (type === "thread-detail") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          transformThreadDetailPage();
        }, 100);
      });
    } else {
      setTimeout(() => {
        transformThreadDetailPage();
      }, 100);
    }
  } else if (type === "home") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          transformHomePage();
        }, 100);
      });
    } else {
      setTimeout(() => {
        transformHomePage();
      }, 100);
    }
  } else if (type === "forum-list") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          transformForumListPage();
        }, 100);
      });
    } else {
      setTimeout(() => {
        transformForumListPage();
      }, 100);
    }
  } else if (type === "auth") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          transformAuthPage();
        }, 100);
      });
    } else {
      setTimeout(() => {
        transformAuthPage();
      }, 100);
    }
  } else {
    console.log("[GitHub Everywhere VOZ] Page type not supported for full transformation yet:", type);
  }
}
