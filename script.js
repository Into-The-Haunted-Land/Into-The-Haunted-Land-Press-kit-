document.querySelectorAll('.gallery a, .asset-card').forEach((link) => {
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noreferrer');
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
