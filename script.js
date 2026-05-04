function prepareExternalAssetLinks(root = document) {
  root.querySelectorAll('.gallery a, .asset-card').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });

  root.querySelectorAll('.asset-card img').forEach((image) => {
    image.draggable = false;
  });
}

prepareExternalAssetLinks();

function titleFromFileName(fileName) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  return withoutExtension
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function createAssetCard(src, title) {
  const link = document.createElement('a');
  link.className = 'asset-card';
  link.href = src;
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noreferrer');

  const image = document.createElement('img');
  image.src = src;
  image.alt = title;
  image.draggable = false;

  const label = document.createElement('span');
  label.textContent = title;

  link.append(image, label);
  return link;
}

function getGitHubApiUrl(container, folderPath) {
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalPreview) {
    return null;
  }

  const configuredOwner = container.dataset.githubOwner;
  const configuredRepo = container.dataset.githubRepo;
  if (configuredOwner && configuredRepo) {
    return `https://api.github.com/repos/${configuredOwner}/${configuredRepo}/contents/${folderPath}`;
  }

  const hostParts = window.location.hostname.split('.');
  const isGitHubPages = window.location.hostname.endsWith('.github.io');
  if (!isGitHubPages || hostParts.length === 0) {
    return null;
  }

  const owner = hostParts[0];
  const repo = window.location.pathname.split('/').filter(Boolean)[0];
  if (!owner || !repo) {
    return null;
  }

  return `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`;
}

function getLocalDirectoryUrl(folderPath) {
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!isLocalPreview) {
    return null;
  }

  return `${folderPath.replace(/\/?$/, '/')}`;
}

function parseLocalDirectoryListing(html, folderPath) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('a'))
    .map((link) => decodeURIComponent(link.getAttribute('href') || ''))
    .filter((href) => href && href !== '../')
    .map((href) => href.replace(/^.*\//, ''))
    .map((name) => ({
      name,
      path: `${folderPath.replace(/\/?$/, '/')}${encodeURIComponent(name)}`,
      type: 'file',
    }));
}

function fetchFolderFiles(container, folderPath) {
  const localDirectoryUrl = getLocalDirectoryUrl(folderPath);
  if (localDirectoryUrl) {
    return fetch(localDirectoryUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load ${localDirectoryUrl}`);
        }
        return response.text();
      })
      .then((html) => parseLocalDirectoryListing(html, folderPath));
  }

  const apiUrl = getGitHubApiUrl(container, folderPath);
  if (!apiUrl) {
    return Promise.reject(new Error(`Unable to resolve folder source for ${folderPath}`));
  }

  return fetch(apiUrl, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${apiUrl}`);
      }
      return response.json();
    });
}

function renderAssetCards(container, files) {
  const imageFiles = getImageFiles(files);

  if (imageFiles.length === 0) {
    return;
  }

  container.replaceChildren();
  imageFiles.forEach((file) => {
    const src = file.download_url || file.path;
    container.appendChild(createAssetCard(src, titleFromFileName(file.name)));
  });
}

function getImageFiles(files) {
  return files
    .filter((file) => file.type === 'file')
    .filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function getVideoFiles(files) {
  return files
    .filter((file) => file.type === 'file')
    .filter((file) => /\.(mp4|webm|mov)$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function renderVideoCards(container, files) {
  const videoFiles = getVideoFiles(files);

  if (videoFiles.length === 0) {
    return;
  }

  container.replaceChildren();
  videoFiles.forEach((file) => {
    const src = file.download_url || file.path;
    const title = titleFromFileName(file.name);
    const card = document.createElement('article');
    card.className = 'video-card';

    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const label = document.createElement('h3');
    label.textContent = title;

    card.append(video, label);
    container.appendChild(card);
    observeAutoplayVideo(video);
  });
}

const autoplayVideoObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {
          // Some browsers still block autoplay until the user interacts.
        });
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.45 })
  : null;

function observeAutoplayVideo(video) {
  if (!autoplayVideoObserver) {
    video.play().catch(() => {
      // Keep controls available if autoplay is blocked.
    });
    return;
  }

  autoplayVideoObserver.observe(video);
}

function renderGalleryImages(container, files) {
  const imageFiles = getImageFiles(files);

  if (imageFiles.length === 0) {
    return;
  }

  container.replaceChildren();
  imageFiles.forEach((file, index) => {
    const src = file.download_url || file.path;
    const title = titleFromFileName(file.name) || `Screenshot ${index + 1}`;
    const link = document.createElement('a');
    link.href = src;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');

    const image = document.createElement('img');
    image.src = src;
    image.alt = title;
    image.loading = 'lazy';

    link.appendChild(image);
    container.appendChild(link);
  });
}

document.querySelectorAll('[data-asset-folder]').forEach((container) => {
  const folderPath = container.dataset.assetFolder;

  fetchFolderFiles(container, folderPath)
    .then((files) => {
      if (Array.isArray(files)) {
        renderAssetCards(container, files);
      }
    })
    .catch(() => {
      // Keep the HTML fallback cards if GitHub's directory API is unavailable.
    });
});

document.querySelectorAll('[data-gallery-folder]').forEach((container) => {
  const folderPath = container.dataset.galleryFolder;

  fetchFolderFiles(container, folderPath)
    .then((files) => {
      if (Array.isArray(files)) {
        renderGalleryImages(container, files);
      }
    })
    .catch(() => {
      // No screenshots are shown if the directory API is unavailable.
    });
});

document.querySelectorAll('[data-video-folder]').forEach((container) => {
  const folderPath = container.dataset.videoFolder;

  fetchFolderFiles(container, folderPath)
    .then((files) => {
      if (Array.isArray(files)) {
        renderVideoCards(container, files);
      }
    })
    .catch(() => {
      // No videos are shown if the directory API is unavailable.
    });
});

document.querySelectorAll('.asset-scroll').forEach((scrollView) => {
  scrollView.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    event.preventDefault();
    scrollView.scrollLeft += event.deltaY;
  }, { passive: false });
});

const textFiles = {
  pitch: 'pitch.md',
  upperTitle: 'upper-title.md',
  upperText: 'upper-text.md',
  midTitle: 'mid-title.md',
  midText: 'mid-text.md',
  pressReadyTitle: 'press-ready-title.md',
  pressReadyText: 'press-ready-text.md',
  contactTitle: 'contact-title.md',
  contactText: 'contact-text.md',
};

const defaultLanguage = 'zh-TW';
const supportedLanguages = ['zh-TW', 'en', 'ja'];
const initialUrlLanguage = getUrlLanguage();
let currentLanguage = supportedLanguages.includes(initialUrlLanguage)
  ? initialUrlLanguage
  : localStorage.getItem('press-kit-language') || defaultLanguage;

if (!supportedLanguages.includes(currentLanguage)) {
  currentLanguage = defaultLanguage;
}

function contentPath(fileName, language = currentLanguage) {
  return `content/${language}/${fileName}`;
}

function fetchLanguageFile(fileName, language = currentLanguage) {
  return fetch(contentPath(fileName, language), { cache: 'no-store' })
    .then((response) => {
      if (response.ok) {
        return response.text();
      }

      if (language !== defaultLanguage) {
        return fetch(contentPath(fileName, defaultLanguage), { cache: 'no-store' }).then((fallbackResponse) => {
          if (!fallbackResponse.ok) {
            throw new Error(`Unable to load ${fileName}`);
          }
          return fallbackResponse.text();
        });
      }

      throw new Error(`Unable to load ${fileName}`);
    });
}

function fetchLanguageJson(fileName, language = currentLanguage) {
  return fetchLanguageFile(fileName, language).then((text) => JSON.parse(text));
}

function getUrlLanguage() {
  const language = new URLSearchParams(window.location.search).get('lang');
  return supportedLanguages.includes(language) ? language : null;
}

function updateLanguageControl() {
  document.querySelectorAll('[data-language-select]').forEach((select) => {
    select.value = currentLanguage;
  });
}

function updateLanguageUrl(language) {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  window.history.replaceState({}, '', url);
}

function renderFactsheet(data) {
  document.querySelectorAll('[data-factsheet]').forEach((list) => {
    list.replaceChildren();

    Object.entries(data).forEach(([key, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');

      term.textContent = key;
      detail.textContent = String(value || '').trim() || '-';

      row.append(term, detail);
      list.appendChild(row);
    });
  });
}

function loadFactsheetContent(language = currentLanguage) {
  fetchLanguageJson('factsheet.json', language)
    .then((data) => {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        renderFactsheet(data);
      }
    })
    .catch(() => {
      // Leave the factsheet empty if the JSON cannot be loaded.
    });
}

function getYouTubeEmbedUrl(value) {
  const input = value.trim();
  if (!input) {
    return null;
  }

  try {
    const url = new URL(input);
    let videoId = '';

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.replace('/', '');
    } else if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/embed/')[1];
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/shorts/')[1];
      } else {
        videoId = url.searchParams.get('v') || '';
      }
    }

    videoId = videoId.split(/[?&/]/)[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function loadYouTubeContent(language = currentLanguage) {
  fetchLanguageFile('youtube-url.md', language)
    .then((text) => {
      const embedUrl = getYouTubeEmbedUrl(text);
      if (!embedUrl) {
        return;
      }

      document.querySelectorAll('[data-youtube-player]').forEach((iframe) => {
        iframe.src = embedUrl;
      });
    })
    .catch(() => {
      // Keep the HTML fallback YouTube embed.
    });
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSafeUrl(url) {
  return /^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(url);
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const trimmedUrl = url.trim();
    if (!isSafeUrl(trimmedUrl)) {
      return label;
    }

    const target = /^https?:/i.test(trimmedUrl) ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href="${escapeHtml(trimmedUrl)}"${target}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

function stripHeadingMarker(value) {
  return value.replace(/^#{1,6}\s+/, '');
}

function renderSingleHeadingMarkdown(value) {
  const trimmed = value.trim();
  const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (!heading) {
    return `<p>${renderInlineMarkdown(trimmed)}</p>`;
  }

  const level = heading[1].length;
  return `<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`;
}

function renderMarkdown(value) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) {
      return;
    }

    blocks.push(`<ul>${list.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const listItem = trimmed.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks.join('');
}

function renderText(target, text) {
  const content = text.trim();
  if (!content) {
    return;
  }

  if (target.dataset.textFormat === 'markdown') {
    target.innerHTML = renderMarkdown(content);
    return;
  }

  if (target.dataset.textFormat === 'heading-markdown') {
    target.innerHTML = renderSingleHeadingMarkdown(content);
    return;
  }

  if (target.dataset.textFormat === 'inline-markdown') {
    target.innerHTML = renderInlineMarkdown(stripHeadingMarker(content));
    return;
  }

  target.textContent = content;
}

function loadMarkdownContent(language = currentLanguage) {
  Object.entries(textFiles).forEach(([key, fileName]) => {
    fetchLanguageFile(fileName, language)
      .then((text) => {
        document.querySelectorAll(`[data-text-key="${key}"]`).forEach((target) => {
          renderText(target, text);
        });
      })
      .catch(() => {
        // Keep the HTML fallback text when the Markdown cannot be loaded.
      });
  });
}

function loadLanguage(language, options = {}) {
  if (!supportedLanguages.includes(language)) {
    language = defaultLanguage;
  }

  currentLanguage = language;
  localStorage.setItem('press-kit-language', currentLanguage);
  if (options.updateUrl !== false) {
    updateLanguageUrl(currentLanguage);
  }
  document.documentElement.lang = currentLanguage;
  updateLanguageControl();
  loadMarkdownContent(currentLanguage);
  loadFactsheetContent(currentLanguage);
  loadYouTubeContent(currentLanguage);
}

document.querySelectorAll('[data-language-select]').forEach((select) => {
  select.addEventListener('change', () => {
    loadLanguage(select.value);
  });
});

loadLanguage(currentLanguage, { updateUrl: false });
