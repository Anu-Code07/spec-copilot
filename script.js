/* SpecDrive docs — interactions & animations */

// Theme
const THEME_KEY = 'specdrive-theme';
const root = document.documentElement;

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  });
}

applyTheme(getPreferredTheme());

document.querySelectorAll('.theme-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });
});

// Mobile menu
document.querySelectorAll('.menu-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });
});

// Active nav link
const page = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a[href]').forEach((link) => {
  const href = link.getAttribute('href');
  if (href === page || (page === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

document.querySelectorAll('.sidebar nav a[href]').forEach((link) => {
  if (link.getAttribute('href') === page) link.classList.add('active');
});

// Header scroll shadow
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// Code copy buttons
document.querySelectorAll('.code-block').forEach((block) => {
  const pre = block.querySelector('pre');
  const btn = block.querySelector('.copy-btn');
  if (!pre || !btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent ?? '');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    } catch {
      btn.textContent = 'Failed';
    }
  });
});

// Smooth anchor scroll offset for sticky header
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const id = anchor.getAttribute('href')?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
