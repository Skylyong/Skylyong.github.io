(function () {
  const drawer = document.getElementById('left-nav-drawer');
  const toggle = document.querySelector('.left-nav-toggle');
  const overlay = document.querySelector('.left-nav-overlay');
  const closeButton = document.querySelector('.left-nav-close');

  if (!drawer || !toggle || !overlay) {
    return;
  }

  let closeTimer = null;
  let searchIndex = null;
  let searchPromise = null;
  let privateSearchIndex = null;
  let privateSearchPromise = null;
  let contentIndex = null;
  let contentPromise = null;

  function setOpen(isOpen) {
    window.clearTimeout(closeTimer);

    if (isOpen) {
      drawer.hidden = false;
      overlay.hidden = false;
      window.requestAnimationFrame(() => {
        document.body.classList.add('left-nav-open');
        toggle.setAttribute('aria-expanded', 'true');
      });
      const input = drawer.querySelector('.left-nav-search-input');
      if (input) {
        window.setTimeout(() => input.focus(), 160);
      }
      return;
    }

    document.body.classList.remove('left-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    closeTimer = window.setTimeout(() => {
      if (!document.body.classList.contains('left-nav-open')) {
        drawer.hidden = true;
        overlay.hidden = true;
      }
    }, 180);
  }

  function switchTab(tabName) {
    drawer.querySelectorAll('.left-nav-tab').forEach((tab) => {
      const active = tab.getAttribute('data-left-nav-tab') === tabName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    drawer.querySelectorAll('.left-nav-panel').forEach((panel) => {
      const active = panel.getAttribute('data-left-nav-panel') === tabName;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function normalize(text) {
    return (text || '').toLocaleLowerCase();
  }

  function getRoot() {
    const configuredRoot = document.documentElement.getAttribute('data-root');
    if (configuredRoot) {
      return configuredRoot;
    }

    const rootPath = window.siteMeta && window.siteMeta.root;
    return rootPath || '/';
  }

  function resolveUrl(path) {
    if (!path) {
      return '#';
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) {
      return path;
    }

    return `${getRoot().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  function getChildText(node, selector) {
    const child = node.querySelector(selector);
    return child ? child.textContent.trim() : '';
  }

  function getEntryTerms(node, selector) {
    return Array.from(node.querySelectorAll(selector))
      .map((item) => item.textContent.trim())
      .filter(Boolean);
  }

  function parseSearchXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid search index');
    }

    return Array.from(doc.querySelectorAll('entry')).map((entry) => {
      const linkNode = entry.querySelector('link');
      const title = getChildText(entry, 'title') || '[Untitled Post]';
      const content = stripHtml(getChildText(entry, 'content'));
      const categories = getEntryTerms(entry, 'categories category');
      const tags = getEntryTerms(entry, 'tags tag');
      const url =
        getChildText(entry, 'url') ||
        (linkNode ? linkNode.getAttribute('href') : '') ||
        '#';

      return {
        title,
        content,
        categories,
        tags,
        url,
        haystack: normalize([title, content, categories.join(' '), tags.join(' ')].join(' ')),
      };
    });
  }

  function loadXmlSearchIndex(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Search index unavailable');
        }
        return response.text();
      })
      .then((xmlText) => parseSearchXml(xmlText));
  }

  function loadSearchIndex(input) {
    if (searchIndex) {
      return Promise.resolve(searchIndex);
    }

    if (!searchPromise) {
      const url = input.getAttribute('data-search-url') || '/search.xml';
      searchPromise = loadXmlSearchIndex(url).then((items) => {
        searchIndex = items;
        return searchIndex;
      });
    }

    return searchPromise;
  }

  function loadPrivateSearchIndex(input) {
    const url = input.getAttribute('data-private-search-url');

    if (!url) {
      return Promise.resolve([]);
    }

    if (privateSearchIndex) {
      return Promise.resolve(privateSearchIndex);
    }

    if (!privateSearchPromise) {
      privateSearchPromise = loadXmlSearchIndex(url)
        .then((items) => {
          privateSearchIndex = items;
          return privateSearchIndex;
        })
        .catch(() => []);
    }

    return privateSearchPromise;
  }

  function loadContentIndex() {
    if (contentIndex) {
      return Promise.resolve(contentIndex);
    }

    if (!contentPromise) {
      const url = drawer.getAttribute('data-content-url') || resolveUrl('content.json');
      contentPromise = fetch(url, { credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Content index unavailable');
          }
          return response.json();
        })
        .then((data) => {
          contentIndex = Array.isArray(data) ? data : data.posts || [];
          return contentIndex;
        });
    }

    return contentPromise;
  }

  function makeSnippet(text, terms) {
    const normalized = normalize(text);
    const firstMatch = terms
      .map((term) => normalized.indexOf(term))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];
    const start = Math.max(0, (firstMatch || 0) - 42);
    const snippet = text.slice(start, start + 118).trim();
    return `${start > 0 ? '...' : ''}${snippet}${text.length > start + 118 ? '...' : ''}`;
  }

  function renderResults(resultsElement, statusElement, results, terms) {
    resultsElement.innerHTML = '';

    if (!results.length) {
      statusElement.textContent = 'No results.';
      return;
    }

    statusElement.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;
    const fragment = document.createDocumentFragment();

    results.forEach((result) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const title = document.createElement('span');
      const snippet = document.createElement('span');

      link.href = result.url;
      title.className = 'left-nav-result-title';
      title.textContent = result.title;
      snippet.className = 'left-nav-result-snippet';
      snippet.textContent = makeSnippet(result.content || result.title, terms);

      link.append(title, snippet);
      item.appendChild(link);
      fragment.appendChild(item);
    });

    resultsElement.appendChild(fragment);
  }

  function search(input) {
    const statusElement = drawer.querySelector('.left-nav-search-status');
    const resultsElement = drawer.querySelector('.left-nav-search-results');
    const query = input.value.trim();

    if (!statusElement || !resultsElement) {
      return;
    }

    if (!query) {
      statusElement.textContent = '';
      resultsElement.innerHTML = '';
      return;
    }

    const terms = normalize(query).split(/\s+/).filter(Boolean);
    statusElement.textContent = 'Loading...';

    Promise.allSettled([loadSearchIndex(input), loadPrivateSearchIndex(input)])
      .then((loadedIndexes) => {
        const items = loadedIndexes
          .filter((result) => result.status === 'fulfilled')
          .flatMap((result) => result.value);

        if (!items.length && loadedIndexes.every((result) => result.status === 'rejected')) {
          throw new Error('Search index unavailable');
        }

        const results = items
          .map((item) => {
            if (!terms.every((term) => item.haystack.includes(term))) {
              return null;
            }
            const titleScore = terms.reduce(
              (score, term) => score + (normalize(item.title).includes(term) ? 3 : 0),
              0,
            );
            const metaScore = terms.reduce(
              (score, term) =>
                score + (normalize(item.categories.join(' ') + ' ' + item.tags.join(' ')).includes(term) ? 2 : 0),
              0,
            );
            return { ...item, score: titleScore + metaScore };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
          .slice(0, 10);

        renderResults(resultsElement, statusElement, results, terms);
      })
      .catch(() => {
        statusElement.textContent = 'Search index unavailable.';
        resultsElement.innerHTML = '';
      });
  }

  function hasMeta(post, metaName, name) {
    return (post[metaName] || []).some((item) => item && item.name === name);
  }

  function renderMetaPosts(metaName, name, posts) {
    const statusElement = drawer.querySelector(`[data-left-nav-status="${metaName}"]`);
    const postsElement = drawer.querySelector(`[data-left-nav-posts="${metaName}"]`);

    if (!statusElement || !postsElement) {
      return;
    }

    postsElement.innerHTML = '';

    if (!posts.length) {
      statusElement.textContent = `No posts found for ${name}.`;
      return;
    }

    statusElement.textContent = `${posts.length} post${posts.length === 1 ? '' : 's'} in ${name}`;
    const fragment = document.createDocumentFragment();

    posts.forEach((post) => {
      const item = document.createElement('li');
      const time = document.createElement('time');
      const link = document.createElement('a');

      time.dateTime = post.date || '';
      time.textContent = formatDate(post.date);
      link.href = resolveUrl(post.path);
      link.textContent = post.title || '[Untitled Post]';

      item.append(time, link);
      fragment.appendChild(item);
    });

    postsElement.appendChild(fragment);
  }

  function selectMeta(button) {
    const metaName = button.getAttribute('data-left-nav-meta');
    const name = button.getAttribute('data-left-nav-name');
    const statusElement = drawer.querySelector(`[data-left-nav-status="${metaName}"]`);

    drawer.querySelectorAll(`[data-left-nav-meta="${metaName}"]`).forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    if (statusElement) {
      statusElement.textContent = 'Loading...';
    }

    loadContentIndex()
      .then((posts) => {
        const matchingPosts = posts
          .filter((post) => hasMeta(post, metaName, name))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        renderMetaPosts(metaName, name, matchingPosts);
      })
      .catch(() => {
        if (statusElement) {
          statusElement.textContent = 'Content index unavailable.';
        }
      });
  }

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('left-nav-open'));
  });

  overlay.addEventListener('click', () => setOpen(false));

  if (closeButton) {
    closeButton.addEventListener('click', () => setOpen(false));
  }

  drawer.querySelectorAll('.left-nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-left-nav-tab'));
    });
  });

  drawer.querySelectorAll('.left-nav-chip').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectMeta(button));
  });

  const searchInput = drawer.querySelector('.left-nav-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => search(searchInput));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && searchInput.value) {
        searchInput.value = '';
        search(searchInput);
        event.stopPropagation();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('left-nav-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
