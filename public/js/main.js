// Tiny client-side helper: when a search form is submitted, disable the button
// so the user does not send the same request twice while the server waits for the API.
document.querySelectorAll('.search-form').forEach((form) => {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    button.textContent = 'Loading…';
  });
});

// If the user comes back with the browser "Back" button, the page may be restored
// from cache with the button still disabled. Reset it.
window.addEventListener('pageshow', () => {
  document.querySelectorAll('.search-form button[type="submit"]').forEach((button) => {
    button.disabled = false;
    button.textContent = 'Show holidays';
  });
});
