document.querySelectorAll('.gallery a, .asset-card').forEach((link) => {
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noreferrer');
});
