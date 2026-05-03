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
  let dragging = false;
  let didDrag = false;
  let startX = 0;
  let startScrollLeft = 0;

  scrollView.addEventListener('pointerdown', (event) => {
    dragging = true;
    didDrag = false;
    scrollView.classList.add('dragging');
    scrollView.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startScrollLeft = scrollView.scrollLeft;
  });

  scrollView.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }
    event.preventDefault();
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) {
      didDrag = true;
    }
    scrollView.scrollLeft = startScrollLeft - delta;
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
    scrollView.addEventListener(eventName, () => {
      dragging = false;
      scrollView.classList.remove('dragging');
    });
  });

  scrollView.addEventListener('click', (event) => {
    if (!didDrag) {
      return;
    }
    event.preventDefault();
    didDrag = false;
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
  developer: 'content/developer.txt',
  pitch: 'content/pitch.txt',
  description: 'content/description.txt',
  mainText: 'content/main-text.txt',
};

function renderText(target, text) {
  const content = text.trim();
  if (!content) {
    return;
  }

  if (target.dataset.textFormat === 'paragraphs') {
    target.replaceChildren();
    content
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        const element = document.createElement('p');
        element.textContent = paragraph;
        target.appendChild(element);
      });
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
