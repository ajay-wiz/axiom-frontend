/* ============================================
   MAIN.JS - Portfolio Frontend Logic
   ============================================ */

import api from './api.js';

// ============ STATE ============
const state = {
  currentPage: 0,
  currentCategory: null,
  totalPages: 0,
  likedItems: new Set(JSON.parse(localStorage.getItem('liked') || '[]')),
  openModalId: null,
};

// ============ CURSOR ============
function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
  });

  function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, .media-card, .filter-btn, .action-btn').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
}

// ============ LOADING SCREEN ============
function initLoader() {
  setTimeout(() => {
    document.getElementById('loading-screen')?.classList.add('done');
    document.body.style.overflow = '';
  }, 2200);
}

// ============ NAVBAR ============
function initNavbar() {
  const nav = document.getElementById('navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ============ PARTICLES ============
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  const particles = Array.from({length: 80}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.4 + 0.1,
    color: Math.random() > 0.5 ? '0,229,255' : '255,0,128',
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,229,255,${0.06 * (1 - dist/120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ============ SCROLL REVEAL ============
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============ SKILL BARS ============
function initSkillBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.skill-fill').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }
    });
  }, { threshold: 0.3 });
  const skillsSection = document.querySelector('.skills-grid');
  if (skillsSection) observer.observe(skillsSection);
}

// ============ CATEGORIES ============
async function loadCategories() {
  try {
    const res = await api.getCategories();
    const categories = res.data;
    const filterBar = document.querySelector('.filter-bar');
    if (!filterBar) return;

    filterBar.innerHTML = `<button class="filter-btn active" data-cat="null">All</button>`;
    categories.forEach(cat => {
      if (cat.slug === 'all') return;
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.cat = cat.id;
      btn.textContent = cat.name;
      filterBar.appendChild(btn);
    });

    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPage = 0;
      state.currentCategory = btn.dataset.cat === 'null' ? null : parseInt(btn.dataset.cat);
      loadMedia(true);
    });
  } catch (err) {
    console.warn('Could not load categories', err);
  }
}

// ============ MEDIA GRID ============
async function loadMedia(reset = false) {
  const grid = document.getElementById('media-grid');
  if (!grid) return;
  if (reset) { grid.innerHTML = ''; state.currentPage = 0; }

  try {
    let res;
    if (state.currentCategory) {
      res = await api.getMediaByCategory(state.currentCategory, state.currentPage);
    } else {
      res = await api.getMedia(state.currentPage);
    }

    const page = res.data;
    state.totalPages = page.totalPages;

    if (page.content.length === 0 && state.currentPage === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px;color:var(--text-muted);font-family:var(--font-mono);font-size:13px;letter-spacing:0.2em">NO MEDIA FOUND</div>`;
      return;
    }

    page.content.forEach(media => {
      grid.insertAdjacentHTML('beforeend', renderMediaCard(media));
    });

    // Re-init cursor hover for new cards
    document.querySelectorAll('.media-card').forEach(card => {
      const ring = document.querySelector('.cursor-ring');
      card.addEventListener('mouseenter', () => ring?.classList.add('hover'));
      card.addEventListener('mouseleave', () => ring?.classList.remove('hover'));
    });

    const loadMoreBtn = document.getElementById('load-more-btn');
    const paginationInfo = document.getElementById('pagination-info');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = state.currentPage >= state.totalPages - 1 ? 'none' : 'block';
    }
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${grid.children.length} of ${page.totalElements} projects`;
    }
  } catch (err) {
    console.warn('Could not load media', err);
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px;color:var(--text-muted);font-family:var(--font-mono);font-size:13px">BACKEND NOT CONNECTED — SHOWING DEMO MODE</div>`;
    renderDemoMedia(grid);
  }
}

function renderMediaCard(media) {
  const liked = state.likedItems.has(media.id);
  
  let thumbUrl = '';
  if (media.thumbnailPath) {
    if (media.thumbnailPath.startsWith('http')) {
      thumbUrl = media.thumbnailPath;
    } else {
      thumbUrl = `http://localhost:8080/api${media.thumbnailPath}`;
    }
  }

  const thumb = thumbUrl
    ? `<img class="media-thumb" src="${thumbUrl}" alt="${media.title}" loading="lazy">`
    : `<div class="media-thumb-placeholder"><div class="thumb-icon">🎬</div></div>`;

  return `
  <div class="media-card" data-id="${media.id}" onclick="openModal(${media.id})">
    ${thumb}
    <div class="media-overlay">
      <div class="media-category-tag">${media.categoryName || media.mediaType || 'VIDEO'}</div>
      <div class="media-title-card">${media.title}</div>
      <div class="media-meta">
        <span>👁 ${formatCount(media.viewCount)}</span>
        <span>❤️ ${formatCount(media.likeCount)}</span>
        ${media.duration ? `<span>⏱ ${media.duration}</span>` : ''}
      </div>
      <div class="media-actions" onclick="event.stopPropagation()">
        <button class="action-btn ${liked ? 'liked' : ''}" onclick="handleLike(event, ${media.id})" data-like-btn="${media.id}">
          ${liked ? '❤️' : '🤍'} <span data-like-count="${media.id}">${formatCount(media.likeCount)}</span>
        </button>
        <button class="action-btn" onclick="openModal(${media.id})">💬 Comments</button>
        <button class="action-btn" onclick="handleShare(event, ${media.id}, '${escapeHtml(media.title)}')">🔗 Share</button>
      </div>
    </div>
    <div class="play-btn-card">
      <svg width="18" height="20" viewBox="0 0 18 20" fill="white"><path d="M0 0v20l18-10z"/></svg>
    </div>
  </div>`;
}

function renderDemoMedia(grid) {
  const demos = [
    { id: 1, title: 'Cinematic Travel Montage — Bali 2024', cat: 'CINEMATIC', views: '47.2K', likes: '1.8K', dur: '4:12' },
    { id: 2, title: 'FPS Gaming Highlights — Season 12', cat: 'GAMING', views: '92.4K', likes: '3.2K', dur: '6:30' },
    { id: 3, title: 'Instagram Reels — Fashion Collection', cat: 'REELS', views: '128K', likes: '5.1K', dur: '0:58' },
    { id: 4, title: 'Motion Graphics — Brand Identity', cat: 'MOTION', views: '34.5K', likes: '980', dur: '2:45' },
    { id: 5, title: 'Short Film — The Last Light', cat: 'CINEMATIC', views: '21.3K', likes: '740', dur: '8:20' },
    { id: 6, title: 'VALORANT Fragmovie', cat: 'GAMING', views: '76.8K', likes: '2.9K', dur: '5:15' },
  ];
  demos.forEach(d => {
    grid.insertAdjacentHTML('beforeend', `
      <div class="media-card demo-card" onclick="openDemoModal(${d.id}, '${d.title}')">
        <div class="media-thumb-placeholder">
          <div class="thumb-icon">🎬</div>
        </div>
        <div class="media-overlay">
          <div class="media-category-tag">${d.cat}</div>
          <div class="media-title-card">${d.title}</div>
          <div class="media-meta">
            <span>👁 ${d.views}</span>
            <span>❤️ ${d.likes}</span>
            <span>⏱ ${d.dur}</span>
          </div>
          <div class="media-actions">
            <button class="action-btn">🤍 ${d.likes}</button>
            <button class="action-btn">💬 Comments</button>
            <button class="action-btn">🔗 Share</button>
          </div>
        </div>
        <div class="play-btn-card">
          <svg width="18" height="20" viewBox="0 0 18 20" fill="white"><path d="M0 0v20l18-10z"/></svg>
        </div>
      </div>
    `);
  });
}

// ============ MODAL ============
window.openModal = async function(id) {
  state.openModalId = id;
  const modal = document.getElementById('video-modal');
  if (!modal) return;

  try {
    api.incrementView(id).catch(() => {});
    const res = await api.getMediaById(id);
    const media = res.data;
    const likedRes = await api.hasLiked(id).catch(() => ({ data: false }));

    let embedUrl = media.videoUrl;
    if (embedUrl) {
      try {
        if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
          const ytMatch = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
          if (ytMatch && ytMatch[1]) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        } else if (embedUrl.includes('instagram.com')) {
          const igMatch = embedUrl.match(/\/reel\/([^\/?]+)/) || embedUrl.match(/\/p\/([^\/?]+)/);
          if (igMatch && igMatch[1]) embedUrl = `https://www.instagram.com/p/${igMatch[1]}/embed/`;
        } else if (embedUrl.includes('vimeo.com')) {
          const vimeoMatch = embedUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
          if (vimeoMatch && vimeoMatch[1]) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
      } catch (e) {
        console.warn("Could not parse embed URL", e);
      }
    }

    document.getElementById('modal-video-embed').innerHTML =
      embedUrl
        ? `<iframe src="${embedUrl}" allowfullscreen allow="autoplay"></iframe>`
        : `<div style="width:100%;height:100%;background:#0d1420;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-family:var(--font-mono);font-size:14px">No video source available</div>`;

    document.getElementById('modal-title').textContent = media.title;
    document.getElementById('modal-desc').textContent = media.description || '';
    document.getElementById('modal-views').textContent = `👁 ${formatCount(media.viewCount)} views`;
    document.getElementById('modal-likes').textContent = `❤️ ${formatCount(media.likeCount)} likes`;

    const likeBtn = document.getElementById('modal-like-btn');
    likeBtn.dataset.id = id;
    likeBtn.dataset.liked = likedRes.data ? 'true' : 'false';
    updateLikeBtn(likeBtn, likedRes.data, media.likeCount);

    await loadModalComments(id);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    openDemoModal(id, 'Video Preview');
  }
};

window.openDemoModal = function(id, title) {
  const modal = document.getElementById('video-modal');
  if (!modal) return;
  document.getElementById('modal-video-embed').innerHTML =
    `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>`;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent = 'This is a demo preview. Connect the backend to display actual video content.';
  document.getElementById('modal-views').textContent = '👁 Demo';
  document.getElementById('modal-likes').textContent = '❤️ Demo';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  const modal = document.getElementById('video-modal');
  modal?.classList.remove('open');
  document.getElementById('modal-video-embed').innerHTML = '';
  document.body.style.overflow = '';
  state.openModalId = null;
};

async function loadModalComments(mediaId) {
  const list = document.getElementById('comment-list');
  if (!list) return;
  try {
    const res = await api.getComments(mediaId);
    const comments = res.data;
    if (comments.length === 0) {
      list.innerHTML = `<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;letter-spacing:0.1em">BE THE FIRST TO COMMENT</div>`;
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-author">${escapeHtml(c.authorName)}</div>
        <div class="comment-text">${escapeHtml(c.content)}</div>
        <div class="comment-date">${formatDate(c.createdAt)}</div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '';
  }
}

function initCommentForm() {
  const form = document.getElementById('comment-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.openModalId) return;
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const content = form.querySelector('[name="content"]').value.trim();
    if (!name || !content) { showToast('Name and comment are required', 'error'); return; }
    try {
      await api.addComment(state.openModalId, { authorName: name, authorEmail: email, content });
      form.reset();
      showToast('Comment submitted for review!', 'success');
    } catch (err) {
      showToast('Could not submit comment', 'error');
    }
  });
}

// ============ LIKES ============
window.handleLike = async function(event, id) {
  event.stopPropagation();
  const btn = event.currentTarget;
  try {
    const res = await api.toggleLike(id);
    const { liked, likeCount } = res.data;
    btn.classList.toggle('liked', liked);
    btn.innerHTML = `${liked ? '❤️' : '🤍'} <span>${formatCount(likeCount)}</span>`;
    if (liked) state.likedItems.add(id); else state.likedItems.delete(id);
    localStorage.setItem('liked', JSON.stringify([...state.likedItems]));

    const modalLikeBtn = document.getElementById('modal-like-btn');
    if (modalLikeBtn && modalLikeBtn.dataset.id == id) {
      updateLikeBtn(modalLikeBtn, liked, likeCount);
    }
  } catch (err) {
    showToast('Could not process like', 'error');
  }
};

function updateLikeBtn(btn, liked, count) {
  btn.textContent = liked ? `❤️ Liked (${formatCount(count)})` : `🤍 Like (${formatCount(count)})`;
  btn.classList.toggle('liked', liked);
  btn.onclick = () => handleModalLike(btn);
}

window.handleModalLike = async function(btn) {
  const id = state.openModalId;
  if (!id) return;
  try {
    const res = await api.toggleLike(id);
    const { liked, likeCount } = res.data;
    updateLikeBtn(btn, liked, likeCount);
    btn.dataset.liked = liked.toString();
    if (liked) state.likedItems.add(id); else state.likedItems.delete(id);
    localStorage.setItem('liked', JSON.stringify([...state.likedItems]));
  } catch (err) {
    showToast('Backend not connected', 'error');
  }
};

window.handleShare = function(event, id, title) {
  event.stopPropagation();
  const url = `${window.location.origin}${window.location.pathname}?media=${id}`;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard!', 'success'));
  }
};

// ============ TESTIMONIALS ============
async function loadTestimonials() {
  const grid = document.querySelector('.testimonials-grid');
  if (!grid) return;
  try {
    const res = await api.getTestimonials();
    const testimonials = res.data;
    if (testimonials.length === 0) return;
    grid.innerHTML = testimonials.map(t => `
      <div class="testimonial-card reveal">
        <div class="stars">${'⭐'.repeat(t.rating || 5)}</div>
        <div class="quote-mark">"</div>
        <div class="testimonial-text">${escapeHtml(t.content)}</div>
        <div class="testimonial-author">
          <div class="author-avatar">${t.clientName.charAt(0)}</div>
          <div>
            <div class="author-name">${escapeHtml(t.clientName)}</div>
            <div class="author-role">${escapeHtml(t.clientTitle || '')} ${t.clientCompany ? '— ' + t.clientCompany : ''}</div>
          </div>
        </div>
      </div>
    `).join('');
    // Re-init scroll reveal
    document.querySelectorAll('.testimonial-card.reveal').forEach(el => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.1 });
      observer.observe(el);
    });
  } catch (err) {
    console.warn('Could not load testimonials', err);
  }
}

// ============ CONTACT FORM ============
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.status === 200) {
        showToast('Message sent! Will reply within 24 hours. ✨', 'success');
        form.reset();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (err) {
      showToast('Oops! Something went wrong. Please try again or email directly.', 'error');
      console.error(err);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

// ============ LOAD MORE ============
function initLoadMore() {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.currentPage++;
    loadMedia(false);
  });
}

// ============ SMOOTH SCROLL ============
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ============ UTILS ============
function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============ CLOSE MODAL ON OUTSIDE CLICK ============
function initModalClose() {
  const modal = document.getElementById('video-modal');
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
  document.body.style.overflow = 'hidden';
  initLoader();
  initCursor();
  initNavbar();
  initParticles();
  initScrollReveal();
  initSkillBars();
  initSmoothScroll();
  initLoadMore();
  initCommentForm();
  initContactForm();
  initModalClose();

  // Load dynamic content
  await loadCategories();
  await loadMedia(true);
  await loadTestimonials();

  // Check for media query param
  const params = new URLSearchParams(window.location.search);
  const mediaId = params.get('media');
  if (mediaId) setTimeout(() => openModal(parseInt(mediaId)), 2500);
});
