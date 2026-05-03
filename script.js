function prepareExternalAssetLinks(root = document) {
  root.querySelectorAll('.gallery a, .asset-card').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
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

function renderAssetCards(container, files) {
  const imageFiles = files
    .filter((file) => file.type === 'file')
    .filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (imageFiles.length === 0) {
    return;
  }

  container.replaceChildren();
  imageFiles.forEach((file) => {
    const src = file.download_url || encodeURI(file.path);
    container.appendChild(createAssetCard(src, titleFromFileName(file.name)));
  });
}

document.querySelectorAll('[data-asset-folder]').forEach((container) => {
  const folderPath = container.dataset.assetFolder;
  const apiUrl = getGitHubApiUrl(container, folderPath);
  if (!apiUrl) {
    return;
  }

  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${apiUrl}`);
      }
      return response.json();
    })
    .then((files) => {
      if (Array.isArray(files)) {
        renderAssetCards(container, files);
      }
    })
    .catch(() => {
      // Keep the HTML fallback cards if GitHub's directory API is unavailable.
    });
});

document.querySelectorAll('.asset-scroll').forEach((scrollView) => {
  let isDown = false;
  let hasDragged = false;
  let startX = 0;
  let startScrollLeft = 0;

  scrollView.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    isDown = true;
    hasDragged = false;
    scrollView.classList.add('dragging');
    startX = event.pageX;
    startScrollLeft = scrollView.scrollLeft;

    if (event.pointerType !== 'touch') {
      event.preventDefault();
    }
  });

  document.addEventListener('pointermove', (event) => {
    if (!isDown) {
      return;
    }

    event.preventDefault();
    const delta = event.pageX - startX;
    if (Math.abs(delta) > 4) {
      hasDragged = true;
    }
    scrollView.scrollLeft = startScrollLeft - delta;
  });

  ['pointerup', 'pointercancel'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!isDown) {
        return;
      }

      isDown = false;
      scrollView.classList.remove('dragging');
    });
  });

  scrollView.addEventListener('click', (event) => {
    if (!hasDragged) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    hasDragged = false;
  }, true);

  scrollView.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    event.preventDefault();
    scrollView.scrollLeft += event.deltaY;
  }, { passive: false });
});

const textFiles = {
  developer: 'content/developer.md',
  pitch: 'content/pitch.md',
  upperTitle: 'content/upper-title.md',
  upperText: 'content/upper-text.md',
  midTitle: 'content/mid-title.md',
  midText: 'content/mid-text.md',
};

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

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
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

  if (target.dataset.textFormat === 'inline-markdown') {
    target.innerHTML = renderInlineMarkdown(stripHeadingMarker(content));
    return;
  }

  target.textContent = content;
}

Object.entries(textFiles).forEach(([key, path]) => {
  fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${path}`);
      }
      return response.text();
    })
    .then((text) => {
      document.querySelectorAll(`[data-text-key="${key}"]`).forEach((target) => {
        renderText(target, text);
      });
    })
    .catch(() => {
      // Keep the HTML fallback text when the page is opened directly from disk.
    });
});
