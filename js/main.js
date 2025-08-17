(function () {
  const cfg = window.PORTFOLIO_CONFIG || {};
  const username = cfg.githubUsername || "Suri6363498";
  const includeForks = !!cfg.includeForks;
  const includeArchived = !!cfg.includeArchived;
  const perPage = cfg.perPage || 100;
  const cacheTTL = (cfg.cacheTTLMinutes || 30) * 60 * 1000; // ms

  const $ = (sel) => document.querySelector(sel);
  const dom = {
    year: $("#year"),
    profileImg: $("#profile-img"),
    heroTitle: $("#hero-title"),
    heroSubtitle: $("#hero-subtitle"),
    heroMeta: $("#hero-meta"),
    heroLinks: $("#hero-links"),
    projectCards: $("#project-cards"),
    search: $("#search"),
    languageFilter: $("#language-filter"),
    sort: $("#sort"),
    contactEmail: $("#contact-email"),
    githubLink: $("#github-link"),
    navLinks: document.querySelectorAll('.nav-links a[href^="#"]'),
    copyEmailBtn: $("#copy-email-btn")
  };

  // Footer year + GitHub link
  if (dom.year) dom.year.textContent = new Date().getFullYear();
  if (dom.githubLink) dom.githubLink.href = `https://github.com/${username}`;

  // Utilities
  function debounce(fn, delay = 200) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }

  function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

  function cacheGet(key, ttlMs) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.t || !obj.v) return null;
      if (Date.now() - obj.t > ttlMs) return null;
      return obj.v;
    } catch { return null; }
  }
  function cacheSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
    } catch {}
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} for ${url}: ${msg}`);
    }
    return res.json();
  }

  function sortRepos(repos, key) {
    const copy = [...repos];
    if (key === "pushed_at") copy.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    else if (key === "stargazers_count") copy.sort((a, b) => b.stargazers_count - a.stargazers_count);
    else if (key === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }

  function renderRepos(repos) {
    const q = (dom.search?.value || "").toLowerCase().trim();
    const lang = dom.languageFilter?.value || "";

    let filtered = repos.filter(r => {
      const matchesQ = !q || r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
      const matchesLang = !lang || (r.language || "") === lang;
      return matchesQ && matchesLang;
    });

    filtered = sortRepos(filtered, dom.sort?.value || "pushed_at");

    if (!dom.projectCards) return;
    dom.projectCards.innerHTML = "";
    if (!filtered.length) {
      dom.projectCards.innerHTML = `<div class="card card--placeholder">No projects match your filters.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(repo => {
      const card = document.createElement("div");
      card.className = "card";

      const homepageLink = repo.homepage && repo.homepage.trim().length > 0
        ? `<a class="primary" href="${repo.homepage}" target="_blank" rel="noopener">Live</a>`
        : "";

      const badges = [
        repo.language ? `🔤 ${repo.language}` : "",
        `⭐ ${repo.stargazers_count}`,
        `🍴 ${repo.forks_count}`,
        repo.archived ? "🗄️ Archived" : (repo.fork ? "🍴 Fork" : ""),
        `🕒 Updated ${fmtDate(repo.pushed_at)}`
      ].filter(Boolean).map(x => `<span>${x}</span>`).join("");

      card.innerHTML = `
        <h3>${repo.name}</h3>
        <p>${repo.description || "No description provided."}</p>
        <div class="meta">${badges}</div>
        <div class="links">
          <a href="${repo.html_url}" target="_blank" rel="noopener">Repository</a>
          ${homepageLink}
        </div>
      `;
      frag.appendChild(card);
    });

    dom.projectCards.appendChild(frag);
  }

  function populateLanguageFilter(repos) {
    if (!dom.languageFilter) return;
    const langs = unique(repos.map(r => r.language)).sort((a, b) => a.localeCompare(b));
    dom.languageFilter.innerHTML = `<option value="">All languages</option>` + langs.map(l => `<option value="${l}">${l}</option>`).join("");
  }

  async function loadUser() {
    const cacheKey = `gh_user_${username}`;
    try {
      const cached = cacheGet(cacheKey, cacheTTL);
      const user = cached || await fetchJSON(`https://api.github.com/users/${username}`);
      if (!cached) cacheSet(cacheKey, user);

      if (dom.profileImg && user.avatar_url) dom.profileImg.src = user.avatar_url;
      const displayName = user.name || user.login || "Developer";
      if (dom.heroTitle) dom.heroTitle.textContent = `Hello, I’m ${displayName} 👋`;
      if (dom.heroSubtitle) dom.heroSubtitle.textContent = user.bio || "Welcome to my portfolio website 🚀";
      if (dom.heroMeta) {
        const bits = [];
        if (user.location) bits.push(`📍 ${user.location}`);
        if (Number.isFinite(user.public_repos)) bits.push(`📁 ${user.public_repos} repos`);
        dom.heroMeta.textContent = bits.join(" • ");
      }
      if (dom.heroLinks) {
        dom.heroLinks.innerHTML = "";
        const addLink = (href, label) => {
          const a = document.createElement("a");
          a.href = href; a.textContent = label; a.target = "_blank"; a.rel = "noopener";
          dom.heroLinks.appendChild(a);
        };
        addLink(`https://github.com/${username}`, "GitHub");
        if (user.blog) addLink(user.blog.startsWith("http") ? user.blog : `https://${user.blog}`, "Website");
        if (user.twitter_username) addLink(`https://twitter.com/${user.twitter_username}`, "Twitter");
      }
      if (dom.contactEmail && user.email) {
        dom.contactEmail.href = `mailto:${user.email}`;
        dom.contactEmail.textContent = user.email;
      }
    } catch (e) {
      console.warn("Failed to load user profile:", e);
    }
  }

  async function loadRepos() {
    const cacheKey = `gh_repos_${username}`;
    try {
      const cached = cacheGet(cacheKey, cacheTTL);
      const repos = cached || await fetchJSON(`https://api.github.com/users/${username}/repos?sort=updated&per_page=${perPage}`);
      if (!cached) cacheSet(cacheKey, repos);

      let filtered = repos.filter(r => (includeForks || !r.fork) && (includeArchived || !r.archived));
      populateLanguageFilter(filtered);
      renderRepos(filtered);

      // Wire up filters
      const update = () => renderRepos(filtered);
      dom.search?.addEventListener("input", debounce(update, 150));
      dom.languageFilter?.addEventListener("change", update);
      dom.sort?.addEventListener("change", update);
    } catch (e) {
      console.error("Failed to load repos:", e);
      if (dom.projectCards) dom.projectCards.innerHTML = `<div class="card card--placeholder">Unable to load projects from GitHub (rate-limited or offline). Please try again later.</div>`;
    }
  }

  // Nav active link on scroll
  (function navActive() {
    const sections = Array.from(document.querySelectorAll('section[id], header[id]'));
    if (!("IntersectionObserver" in window) || !sections.length || !dom.navLinks?.length) return;

    const byId = new Map(Array.from(dom.navLinks).map(a => [a.getAttribute("href").slice(1), a]));
    function setActive(id) {
      dom.navLinks.forEach(a => { a.classList.remove("active"); a.setAttribute("aria-current", "false"); });
      const link = byId.get(id);
      if (link) { link.classList.add("active"); link.setAttribute("aria-current", "true"); }
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { root: null, rootMargin: "-120px 0px -60% 0px", threshold: 0.1 });

    sections.forEach(sec => io.observe(sec));
  })();

  // Copy email to clipboard
  (function copyEmail() {
    if (!dom.copyEmailBtn || !dom.contactEmail) return;
    const getEmail = () => (dom.contactEmail.getAttribute("href") || "").replace("mailto:", "") || dom.contactEmail.textContent.trim();

    dom.copyEmailBtn.addEventListener("click", async () => {
      const email = getEmail();
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
          ok = true;
        } else {
          const ta = document.createElement("textarea");
          ta.value = email; ta.style.position = "fixed"; ta.style.left = "-9999px";
          document.body.appendChild(ta); ta.select();
          ok = document.execCommand("copy"); document.body.removeChild(ta);
        }
      } catch { ok = false; }

      const original = dom.copyEmailBtn.textContent;
      dom.copyEmailBtn.textContent = ok ? "Copied!" : "Copy failed";
      dom.copyEmailBtn.disabled = true;
      setTimeout(() => { dom.copyEmailBtn.textContent = original; dom.copyEmailBtn.disabled = false; }, 1200);
    });
  })();

  // Kick off
  loadUser();
  loadRepos();
})();
