// Set current year in footer
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// Active nav highlighting on scroll (IntersectionObserver)
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  if (!('IntersectionObserver' in window) || navLinks.length === 0 || sections.length === 0) return;

  const linkById = new Map(navLinks.map(link => [link.getAttribute('href').slice(1), link]));

  function setActive(id) {
    navLinks.forEach(a => { a.classList.remove('active'); a.setAttribute('aria-current', 'false'); });
    const activeLink = linkById.get(id);
    if (activeLink) { activeLink.classList.add('active'); activeLink.setAttribute('aria-current', 'true'); }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, {
    root: null,
    rootMargin: '-120px 0px -60% 0px',
    threshold: 0.1
  });

  sections.forEach(sec => observer.observe(sec));
});

// Copy email to clipboard with feedback
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('copy-email-btn');
  const emailEl = document.getElementById('contact-email');
  if (!btn || !emailEl) return;

  const getEmail = () => (emailEl.getAttribute('href') || '').replace('mailto:', '') || emailEl.textContent.trim();

  btn.addEventListener('click', async () => {
    const email = getEmail();
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
        ok = true;
      } else {
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }

    const originalText = btn.textContent;
    btn.textContent = ok ? 'Copied!' : 'Copy failed';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1400);
  });
});
