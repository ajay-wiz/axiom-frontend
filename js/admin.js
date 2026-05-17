/* ============================================
   ADMIN DASHBOARD JAVASCRIPT
   ============================================ */

import api from './api.js';

// ============ STATE ============
const state = {
  admin: null,
  currentPage: 'dashboard',
  media: { page: 0, total: 0, data: [] },
  comments: { page: 0, total: 0, data: [], filter: undefined },
  categories: [],
  testimonials: [],
  editingMedia: null,
  editingTestimonial: null,
  confirmCallback: null,
};

// ============ AUTH ============
async function checkAuth() {
  const token = localStorage.getItem('admin_token');
  if (!token) { showLogin(); return; }
  try {
    await api.verify();
    state.admin = { username: localStorage.getItem('admin_username'), fullName: localStorage.getItem('admin_fullName') };
    showDashboard();
  } catch {
    localStorage.clear();
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('admin-name-display').textContent = state.admin?.fullName || state.admin?.username || 'Admin';
  document.getElementById('admin-avatar-char').textContent = (state.admin?.fullName || 'A').charAt(0).toUpperCase();
  navigateTo('dashboard');
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn-login');
    const errEl = document.getElementById('login-error');
    const username = form.querySelector('[name="username"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    btn.disabled = true; btn.textContent = 'AUTHENTICATING...';
    errEl.classList.remove('show');
    try {
      const res = await api.login({ username, password });
      const { token, username: uname, fullName } = res.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_username', uname);
      localStorage.setItem('admin_fullName', fullName);
      state.admin = { username: uname, fullName };
      showDashboard();
    } catch (err) {
      errEl.textContent = err.message || 'Invalid credentials';
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.textContent = 'SIGN IN';
    }
  });
}

function logout() {
  localStorage.clear();
  state.admin = null;
  showLogin();
}

// ============ NAVIGATION ============
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.dash-page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
  document.getElementById('topbar-title').textContent = pageTitles[page] || page;

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'media': loadMediaPage(); break;
    case 'comments': loadCommentsPage(); break;
    case 'categories': loadCategoriesPage(); break;
    case 'testimonials': loadTestimonialsPage(); break;
  }
}

const pageTitles = {
  dashboard: 'Dashboard',
  media: 'Media Manager',
  comments: 'Comment Moderation',
  categories: 'Categories',
  testimonials: 'Testimonials',
};

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    const res = await api.getDashboardStats();
    const stats = res.data;
    setText('stat-media', formatCount(stats.totalMedia));
    setText('stat-views', formatCount(stats.totalViews));
    setText('stat-likes', formatCount(stats.totalLikes));
    setText('stat-comments', formatCount(stats.totalComments));
    setText('stat-pending', formatCount(stats.pendingComments));
    setText('stat-featured', formatCount(stats.featuredMedia));
    updatePendingBadge(stats.pendingComments);
  } catch (err) {
    console.warn('Could not load stats:', err);
  }
}

function updatePendingBadge(count) {
  const badge = document.getElementById('comments-badge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline' : 'none'; }
}

// ============ MEDIA PAGE ============
async function loadMediaPage() {
  const tbody = document.getElementById('media-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading...</td></tr>`;
  try {
    const res = await api.adminGetMedia(state.media.page);
    const page = res.data;
    state.media.data = page.content;
    state.media.total = page.totalPages;
    renderMediaTable(page);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load media. Is the backend running?</td></tr>`;
  }
}

function renderMediaTable(page) {
  const tbody = document.getElementById('media-tbody');
  if (!page.content.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No media found. Upload your first project!</td></tr>`;
    return;
  }
  tbody.innerHTML = page.content.map(m => {
    let thumbUrl = '';
    if (m.thumbnailPath) {
      thumbUrl = m.thumbnailPath.startsWith('http') ? m.thumbnailPath : `http://localhost:8080/api${m.thumbnailPath}`;
    }

    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="media-thumb-small">${thumbUrl ? `<img src="${thumbUrl}" style="width:64px;height:40px;object-fit:cover">` : '🎬'}</div>
          <div>
            <div class="title-cell">${escHtml(m.title)}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">${m.categoryName || m.mediaType || ''}</div>
          </div>
        </div>
      </td>
      <td><span style="font-family:var(--font-mono);font-size:12px">👁 ${formatCount(m.viewCount)}</span></td>
      <td><span style="font-family:var(--font-mono);font-size:12px">❤️ ${formatCount(m.likeCount)}</span></td>
      <td>
        ${m.isFeatured ? '<span class="badge featured">Featured</span>' : ''}
        ${m.isTrending ? '<span class="badge trending">Trending</span>' : ''}
      </td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${fmtDate(m.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="tbl-btn" onclick="openEditMedia(${m.id})">Edit</button>
          <button class="tbl-btn del" onclick="deleteMedia(${m.id}, '${escHtml(m.title)}')">Delete</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  document.getElementById('media-page-info').textContent = `Page ${page.number + 1} of ${page.totalPages} — ${page.totalElements} items`;
  document.getElementById('media-prev-btn').disabled = page.first;
  document.getElementById('media-next-btn').disabled = page.last;
}

// ============ MEDIA MODAL ============
async function loadCategoryOptions() {
  try {
    const res = await api.adminGetCategories();
    state.categories = res.data;
    const sel = document.getElementById('media-category-select');
    if (sel) {
      sel.innerHTML = '<option value="">— Select Category —</option>' +
        state.categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    }
  } catch (err) {}
}

window.openAddMedia = async function() {
  state.editingMedia = null;
  await loadCategoryOptions();
  document.getElementById('media-modal-title').textContent = 'Add New Media';
  document.getElementById('media-form').reset();
  document.getElementById('media-id-field').value = '';
  openModal('media-modal');
};

window.openEditMedia = async function(id) {
  await loadCategoryOptions();
  try {
    const res = await api.getMediaById(id);
    const m = res.data;
    state.editingMedia = m;
    document.getElementById('media-modal-title').textContent = 'Edit Media';
    document.getElementById('media-id-field').value = m.id;
    document.getElementById('media-title-field').value = m.title || '';
    document.getElementById('media-desc-field').value = m.description || '';
    document.getElementById('media-url-field').value = m.videoUrl || '';
    document.getElementById('media-category-select').value = m.categoryId || '';
    document.getElementById('media-type-select').value = m.mediaType || 'VIDEO';
    document.getElementById('media-tags-field').value = m.tags || '';
    document.getElementById('media-duration-field').value = m.duration || '';
    document.getElementById('media-client-field').value = m.clientName || '';
    document.getElementById('media-featured-check').checked = m.isFeatured || false;
    document.getElementById('media-trending-check').checked = m.isTrending || false;
    openModal('media-modal');
  } catch (err) { showToast('Could not load media details', 'error'); }
};

async function saveMedia() {
  const id = document.getElementById('media-id-field').value;
  const dto = {
    title: document.getElementById('media-title-field').value.trim(),
    description: document.getElementById('media-desc-field').value.trim(),
    videoUrl: document.getElementById('media-url-field').value.trim(),
    categoryId: document.getElementById('media-category-select').value || null,
    mediaType: document.getElementById('media-type-select').value,
    tags: document.getElementById('media-tags-field').value.trim(),
    duration: document.getElementById('media-duration-field').value.trim(),
    clientName: document.getElementById('media-client-field').value.trim(),
    isFeatured: document.getElementById('media-featured-check').checked,
    isTrending: document.getElementById('media-trending-check').checked,
  };
  if (!dto.title) { showToast('Title is required', 'error'); return; }

  const formData = new FormData();
  formData.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
  const videoFile = document.getElementById('media-video-file').files[0];
  const thumbFile = document.getElementById('media-thumb-file').files[0];
  if (videoFile) formData.append('video', videoFile);
  if (thumbFile) formData.append('thumbnail', thumbFile);

  try {
    if (id) {
      await api.adminUpdateMedia(id, formData);
      showToast('Media updated successfully!', 'success');
    } else {
      await api.adminCreateMedia(formData);
      showToast('Media created successfully!', 'success');
    }
    closeModal('media-modal');
    loadMediaPage();
  } catch (err) { showToast(err.message || 'Failed to save media', 'error'); }
}

window.deleteMedia = function(id, title) {
  showConfirm(`Delete "${title}"?`, 'This action cannot be undone. The media will be permanently removed.', async () => {
    try {
      await api.adminDeleteMedia(id);
      showToast('Media deleted', 'success');
      loadMediaPage();
    } catch (err) { showToast('Failed to delete', 'error'); }
  });
};

// ============ COMMENTS PAGE ============
async function loadCommentsPage() {
  const tbody = document.getElementById('comments-tbody');
  tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading...</td></tr>`;
  try {
    const res = await api.adminGetComments(state.comments.page, state.comments.filter);
    const page = res.data;
    state.comments.data = page.content;
    renderCommentsTable(page);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Failed to load comments</td></tr>`;
  }
}

function renderCommentsTable(page) {
  const tbody = document.getElementById('comments-tbody');
  if (!page.content.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No comments found</td></tr>`;
    return;
  }
  tbody.innerHTML = page.content.map(c => `
    <tr>
      <td style="font-weight:500;color:var(--text-primary)">${escHtml(c.authorName)}</td>
      <td style="max-width:320px;font-size:13px">${escHtml(c.content)}</td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Media #${c.mediaId}</td>
      <td>${c.isApproved ? '<span class="badge approved">Approved</span>' : '<span class="badge pending">Pending</span>'}</td>
      <td>
        <div class="table-actions">
          ${!c.isApproved ? `<button class="tbl-btn approve" onclick="approveComment(${c.id})">Approve</button>` : ''}
          <button class="tbl-btn del" onclick="deleteComment(${c.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.getElementById('comments-page-info').textContent = `Page ${page.number + 1} of ${page.totalPages} — ${page.totalElements} comments`;
  document.getElementById('comments-prev-btn').disabled = page.first;
  document.getElementById('comments-next-btn').disabled = page.last;
}

window.approveComment = async function(id) {
  try {
    await api.adminApproveComment(id);
    showToast('Comment approved!', 'success');
    loadCommentsPage();
    loadDashboard();
  } catch { showToast('Failed to approve', 'error'); }
};

window.deleteComment = function(id) {
  showConfirm('Delete Comment?', 'This comment will be permanently removed.', async () => {
    try {
      await api.adminDeleteComment(id);
      showToast('Comment deleted', 'success');
      loadCommentsPage();
    } catch { showToast('Failed to delete', 'error'); }
  });
};

// ============ CATEGORIES PAGE ============
async function loadCategoriesPage() {
  try {
    const res = await api.adminGetCategories();
    state.categories = res.data;
    renderCategoriesTable(state.categories);
  } catch (err) {
    document.getElementById('categories-tbody').innerHTML = `<tr><td colspan="3" class="empty-state">Failed to load categories</td></tr>`;
  }
}

function renderCategoriesTable(cats) {
  const tbody = document.getElementById('categories-tbody');
  if (!cats.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No categories yet</td></tr>`;
    return;
  }
  tbody.innerHTML = cats.map(c => `
    <tr>
      <td class="title-cell">${escHtml(c.name)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${c.slug}</td>
      <td>
        <button class="tbl-btn del" onclick="deleteCategory(${c.id}, '${escHtml(c.name)}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.openAddCategory = function() { openModal('category-modal'); };

async function saveCategory() {
  const name = document.getElementById('cat-name-field').value.trim();
  if (!name) { showToast('Category name is required', 'error'); return; }
  try {
    await api.adminCreateCategory({ name });
    showToast('Category created!', 'success');
    closeModal('category-modal');
    document.getElementById('cat-name-field').value = '';
    loadCategoriesPage();
  } catch (err) { showToast(err.message || 'Failed to create', 'error'); }
}

window.deleteCategory = function(id, name) {
  showConfirm(`Delete "${name}"?`, 'Deleting this category will not delete the media, but they will be uncategorized.', async () => {
    try {
      await api.adminDeleteCategory(id);
      showToast('Category deleted', 'success');
      loadCategoriesPage();
    } catch { showToast('Failed to delete', 'error'); }
  });
};

// ============ TESTIMONIALS PAGE ============
async function loadTestimonialsPage() {
  try {
    const res = await api.adminGetTestimonials();
    state.testimonials = res.data;
    renderTestimonialsTable(state.testimonials);
  } catch (err) {
    document.getElementById('testimonials-tbody').innerHTML = `<tr><td colspan="4" class="empty-state">Failed to load testimonials</td></tr>`;
  }
}

function renderTestimonialsTable(items) {
  const tbody = document.getElementById('testimonials-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No testimonials yet</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(t => `
    <tr>
      <td>
        <div class="title-cell">${escHtml(t.clientName)}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">${escHtml(t.clientTitle || '')} ${t.clientCompany ? '— ' + t.clientCompany : ''}</div>
      </td>
      <td style="max-width:300px;font-size:13px;font-style:italic;color:var(--text-secondary)">${escHtml(t.content?.substring(0, 100))}${(t.content?.length > 100) ? '...' : ''}</td>
      <td><span style="color:var(--neon-gold)">${'★'.repeat(t.rating || 5)}</span></td>
      <td>
        <div class="table-actions">
          <button class="tbl-btn" onclick="openEditTestimonial(${t.id})">Edit</button>
          <button class="tbl-btn del" onclick="deleteTestimonial(${t.id}, '${escHtml(t.clientName)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddTestimonial = function() {
  state.editingTestimonial = null;
  document.getElementById('testimonial-modal-title').textContent = 'Add Testimonial';
  document.getElementById('testimonial-form').reset();
  document.getElementById('test-id-field').value = '';
  openModal('testimonial-modal');
};

window.openEditTestimonial = function(id) {
  const t = state.testimonials.find(x => x.id === id);
  if (!t) return;
  state.editingTestimonial = t;
  document.getElementById('testimonial-modal-title').textContent = 'Edit Testimonial';
  document.getElementById('test-id-field').value = t.id;
  document.getElementById('test-name-field').value = t.clientName || '';
  document.getElementById('test-title-field').value = t.clientTitle || '';
  document.getElementById('test-company-field').value = t.clientCompany || '';
  document.getElementById('test-content-field').value = t.content || '';
  document.getElementById('test-rating-field').value = t.rating || 5;
  document.getElementById('test-featured-check').checked = t.isFeatured !== false;
  openModal('testimonial-modal');
};

async function saveTestimonial() {
  const id = document.getElementById('test-id-field').value;
  const data = {
    clientName: document.getElementById('test-name-field').value.trim(),
    clientTitle: document.getElementById('test-title-field').value.trim(),
    clientCompany: document.getElementById('test-company-field').value.trim(),
    content: document.getElementById('test-content-field').value.trim(),
    rating: parseInt(document.getElementById('test-rating-field').value) || 5,
    isFeatured: document.getElementById('test-featured-check').checked,
  };
  if (!data.clientName || !data.content) { showToast('Name and review are required', 'error'); return; }
  try {
    if (id) {
      await api.adminUpdateTestimonial(id, data);
      showToast('Testimonial updated!', 'success');
    } else {
      await api.adminCreateTestimonial(data);
      showToast('Testimonial added!', 'success');
    }
    closeModal('testimonial-modal');
    loadTestimonialsPage();
  } catch (err) { showToast(err.message || 'Failed to save', 'error'); }
}

window.deleteTestimonial = function(id, name) {
  showConfirm(`Delete testimonial from "${name}"?`, 'This will permanently remove the review.', async () => {
    try {
      await api.adminDeleteTestimonial(id);
      showToast('Testimonial deleted', 'success');
      loadTestimonialsPage();
    } catch { showToast('Failed to delete', 'error'); }
  });
};

// ============ UI HELPERS ============
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

function showConfirm(title, msg, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  state.confirmCallback = callback;
  document.getElementById('confirm-dialog').classList.add('open');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

// ============ FILTER TABS ============
function initFilterTabs() {
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      state.comments.filter = filter === 'all' ? undefined : filter === 'approved' ? true : false;
      state.comments.page = 0;
      loadCommentsPage();
    });
  });
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
  initLoginForm();
  await checkAuth();

  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Media page controls
  document.getElementById('add-media-btn')?.addEventListener('click', openAddMedia);
  document.getElementById('media-save-btn')?.addEventListener('click', saveMedia);
  document.getElementById('media-cancel-btn')?.addEventListener('click', () => closeModal('media-modal'));
  document.getElementById('media-prev-btn')?.addEventListener('click', () => { state.media.page--; loadMediaPage(); });
  document.getElementById('media-next-btn')?.addEventListener('click', () => { state.media.page++; loadMediaPage(); });

  // Comments controls
  document.getElementById('comments-prev-btn')?.addEventListener('click', () => { state.comments.page--; loadCommentsPage(); });
  document.getElementById('comments-next-btn')?.addEventListener('click', () => { state.comments.page++; loadCommentsPage(); });
  initFilterTabs();

  // Category controls
  document.getElementById('add-cat-btn')?.addEventListener('click', openAddCategory);
  document.getElementById('cat-save-btn')?.addEventListener('click', saveCategory);
  document.getElementById('cat-cancel-btn')?.addEventListener('click', () => closeModal('category-modal'));

  // Testimonial controls
  document.getElementById('add-test-btn')?.addEventListener('click', openAddTestimonial);
  document.getElementById('test-save-btn')?.addEventListener('click', saveTestimonial);
  document.getElementById('test-cancel-btn')?.addEventListener('click', () => closeModal('testimonial-modal'));

  // Confirm dialog
  document.getElementById('confirm-yes-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.remove('open');
    state.confirmCallback?.();
  });
  document.getElementById('confirm-no-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-dialog').classList.remove('open');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});
