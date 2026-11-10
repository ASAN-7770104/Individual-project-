// Tiny client-side helper: when a search form is submitted, disable the button
// so the user does not send the same request twice while the server waits for the API.
document.querySelectorAll('.search-form').forEach((form) => {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = 'Searching…';
  });
});

// Cover images come from covers.openlibrary.org, which is sometimes slow or missing a file.
// If an image fails to load, replace it with a "No cover" box so the page never shows a broken image.
function showNoCover(image) {
  const box = document.createElement('div');
  box.className = `${image.className} cover-empty`;
  box.innerHTML = '<span>No cover</span>';
  image.replaceWith(box);
}

document.querySelectorAll('img.cover').forEach((image) => {
  // The error may already have happened before this script ran.
  if (image.complete && image.naturalWidth === 0) showNoCover(image);
  else image.addEventListener('error', () => showNoCover(image), { once: true });
});

// If the user comes back with the browser "Back" button, the page may be restored
// from cache with the button still disabled. Reset it.
window.addEventListener('pageshow', () => {
  document.querySelectorAll('.search-form button[type="submit"]').forEach((button) => {
    button.disabled = false;
    button.textContent = button.dataset.label || 'Search books';
  });
});
