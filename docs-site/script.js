document.querySelectorAll('.menu-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = document.querySelector('.nav-links');
    if (nav) nav.classList.toggle('open');
  });
});

const path = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach((link) => {
  const href = link.getAttribute('href');
  if (href === path || (path === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});
