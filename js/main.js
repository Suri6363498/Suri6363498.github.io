(function () {
  const cfg = window.PORTFOLIO_CONFIG || {};
  const username = cfg.githubUsername || "Suri6363498";
  const includeForks = !!cfg.includeForks;
  const includeArchived = !!cfg.includeArchived;
  const perPage = cfg.perPage || 100;

  const dom = {
    year: document.getElementById("year"),
    profileImg: document.getElementById("profile-img"),
    heroTitle: document.getElementById("hero-title"),
    heroSubtitle: document.getElementById("hero-subtitle"),
    heroMeta: document.getElementById("hero-meta"),
    heroLinks: document.getElementById("hero-links"),
    projectCards: document.getElementById("project-cards"),
    search: document.getElementById("search"),
    languageFilter: document.getElementById("language-filter"),
    sort: document.getElementById("sort"),
    contactEmail: document.getElementById("contact-email"),
    githubLink: document.getElementById("github-link")
  };

  dom.year.textContent = new Date().getFullYear();
  dom.githubLink.href = `https://github.com/${username}`;

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json"
      },
      ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function sortRepos(repos, key) {
    const copy = [...repos];
    if (key === "pushed_at") {
      copy.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    } else if (key === "stargazers_count") {
      copy.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (key === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }

  function renderRepos(repos) {
    const q = (dom.search.value || "").toLowerCase();
    const lang = dom.languageFilter.value;

    let filtered = repos.filter(r => {
      const matchesQ = !q || r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
      const matchesLang = !lang || (r.language || "") === lang;
      return matchesQ && matchesLang;
    });

    filtered = sortRepos(filtered, dom.sort.value);

    dom.projectCards.innerHTML = "";
    if (!filtered.length) {
      dom.projectCards.innerHTML = `<div class="card card--placeholder">No projects match your filters.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(repo => {
      const card = document.createElement("div");
      card.className = "card";

      const homepageLink = repo.homepage && repo.homepage.trim().length > 0 ? `<a class="primary" href="${repo.homepage}" target="_blank" rel="noopener">Live</a>` : "";

      card.innerHTML = `
        <h3>${repo.name}</h3>
        <p>${repo.description || "No description provided."}</p>
        <div class="meta">
          ${repo.language ? `<span>🔤 ${repo.language}</span>` : ""}
          <span>⭐ ${repo.stargazers_count}</span>
          <span>🍴 ${repo.forks_count}</span>
          <span>🕒 Updated ${fmtDate(repo.pushed_at)}</span>
        </div>
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
    const langs = unique(repos.map(r => r.language));
    dom.languageFilter.innerHTML = `<option value="">All languages</option>` + langs.map(l => `<option value="${l}">${l}</option>`).join("");
  }

  async function loadUser() {
    try {
      const user = await fetchJSON(`https://api.github.com/users/${username}`);
      if (user.avatar_url) dom.profileImg.src = user.avatar_url;
      const displayName = user.name || user.login || "Developer";
      dom.heroTitle.textContent = `Hello, I’m ${displayName} 👋`;
      dom.heroSubtitle.textContent = user.bio || "Welcome to my portfolio website 🚀";
      const bits = [];
      if (user.location) bits.push(`📍 ${user.location}`);
      if (user.public_repos != null) bits.push(`📁 ${user.public_repos} repos`);
      dom.heroMeta.textContent = bits.join(" • ");

      dom.heroLinks.innerHTML = "";
      const addLink = (href, label) => {
        const a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        a.target = "_blank";
        a.rel = "noopener";
        dom.heroLinks.appendChild(a);
      };
      addLink(`https://github.com/${username}`, "GitHub");

      if (user.blog) {
        const blog = user.blog.startsWith("http") ? user.blog : `https://${user.blog}`;
        addLink(blog, "Website");
      }
      if (user.twitter_username) {
        addLink(`https://twitter.com/${user.twitter_username}`, "Twitter");
      }
      if (user.email) {
        dom.contactEmail.href = `mailto:${user.email}`;
        dom.contactEmail.textContent = user.email;
      }
    } catch (e) {
      console.warn("Failed to load user profile:", e);
    }
  }

  async function loadRepos() {
    try {
      const repos = await fetchJSON(`https://api.github.com/users/${username}/repos?sort=updated&per_page=${perPage}`);
      let filtered = repos.filter(r => (includeForks || !r.fork) && (includeArchived || !r.archived));
      populateLanguageFilter(filtered);
      renderRepos(filtered);

      // Wire up filters
      const update = () => renderRepos(filtered);
      dom.search.addEventListener("input", update);
      dom.languageFilter.addEventListener("change", update);
      dom.sort.addEventListener("change", update);
    } catch (e) {
      console.error("Failed to load repos:", e);
      dom.projectCards.innerHTML = `<div class="card card--placeholder">Unable to load projects from GitHub. Please try again later.</div>`;
    }
  }

  loadUser();
  loadRepos();
})();
