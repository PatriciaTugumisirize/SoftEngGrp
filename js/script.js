const App = (function(){
  // configure API base
  const API_BASE = (function(){
    // change this to your backend URL / port
    return 'http://localhost:5000';
  })();

  // optionally set a token if your backend requires Authorization (JWT)
  function authHeader(headers = {}) {
    const token = localStorage.getItem('token'); // set token if you have one
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // Small helper for fetch JSON with error handling
  async function fetchJSON(path, opts = {}) {
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  /* --------- List page logic ---------- */
  async function loadOrganizations(selectEl) {
    try {
      const orgs = await fetchJSON('/api/organizations', { headers: authHeader() });
      // fill select
      selectEl.innerHTML = '<option value="">All organizations</option>';
      orgs.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name;
        selectEl.appendChild(opt);
      });
      return orgs;
    } catch (err) {
      console.warn('Failed to load organizations', err.message);
      // keep empty
      return [];
    }
  }

  async function loadOpportunities({search='', orgId=''} = {}) {
    // Basic fetch list and client-side filter
    const listEl = document.getElementById('list');
    const emptyEl = document.getElementById('empty');
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    try {
      const data = await fetchJSON('/api/opportunities', { headers: authHeader() });
      let items = data || [];
      if (orgId) items = items.filter(i => (i.organizationId || '') === orgId);
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(i =>
          (i.title || '').toLowerCase().includes(q) ||
          (i.skills || []).join(', ').toLowerCase().includes(q)
        );
      }
      if (items.length === 0) {
        emptyEl.style.display = 'block';
        return;
      }
      // render
      items.forEach(renderOpportunity);
    } catch (err) {
      emptyEl.textContent = 'Failed to load opportunities: ' + err.message;
      emptyEl.style.display = 'block';
    }
  }

  function renderOpportunity(opp) {
    const listEl = document.getElementById('list');
    const card = document.createElement('div');
    card.className = 'opp-card';

    card.innerHTML = `
      <div class="opp-top">
        <div>
          <div class="opp-title">${escapeHTML(opp.title || '')}</div>
          <div class="opp-org">${escapeHTML(opp.organizationName || '')}</div>
        </div>
        <div class="small">${escapeHTML(opp.duration || '')}</div>
      </div>
      <div class="small">${escapeHTML((opp.description || '').slice(0, 200))}${(opp.description||'').length>200?'...':''}</div>
      <div class="opp-skills"></div>
      <div class="opp-actions">
        <button class="btn" data-action="edit">Edit</button>
        <button class="btn" data-action="delete">Delete</button>
        <div style="margin-left:auto" class="small">${opp.deadline ? 'Deadline: ' + new Date(opp.deadline).toLocaleDateString() : ''}</div>
      </div>
    `;
    // skills
    const skillsEl = card.querySelector('.opp-skills');
    (opp.skills || []).forEach(s => {
      const sp = document.createElement('span');
      sp.className = 'skill';
      sp.textContent = s;
      skillsEl.appendChild(sp);
    });

    // action handlers
    card.querySelector('button[data-action="edit"]').addEventListener('click', () => {
      // go to form page with id param
      location.href = `form.html?id=${encodeURIComponent(opp.id)}`;
    });

    card.querySelector('button[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this opportunity?')) return;
      try {
        await fetchJSON(`/api/opportunities/${opp.id}`, { method: 'DELETE', headers: authHeader() });
        card.remove();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    });

    listEl.appendChild(card);
  }

  /* --------- Form page logic ---------- */
  function fillFormFields(data) {
    document.getElementById('oppId').value = data.id || '';
    document.getElementById('title').value = data.title || '';
    document.getElementById('description').value = data.description || '';
    document.getElementById('skills').value = (data.skills || []).join(', ');
    document.getElementById('duration').value = data.duration || '';
    document.getElementById('deadline').value = data.deadline ? data.deadline.split('T')[0] : '';
    document.getElementById('formTitle').textContent = data.id ? 'Edit Opportunity' : 'New Opportunity';
    // documents: we won't pre-fill file inputs. Show note if docs exist
    if (Array.isArray(data.documents) && data.documents.length) {
      const msg = document.createElement('div');
      msg.className = 'muted';
      msg.innerHTML = 'Existing documents: ' + data.documents.map(d => `<a href="${d.url}" target="_blank">${escapeHTML(d.filename || d.url)}</a>`).join(', ');
      const form = document.getElementById('oppForm');
      form.insertBefore(msg, form.querySelector('.actions'));
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    clearErrors();
    const id = document.getElementById('oppId').value;
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const skills = document.getElementById('skills').value.trim();
    const duration = document.getElementById('duration').value.trim();
    const deadline = document.getElementById('deadline').value;
    const orgId = document.getElementById('organization').value;
    const files = document.getElementById('documents').files;

    // validation
    if (!title) return showFieldError('titleErr', 'Title is required.');

    // build FormData
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('skills', skills); // backend expected comma-separated or adapt
    fd.append('duration', duration);
    if (deadline) fd.append('deadline', deadline);
    if (orgId) fd.append('organizationId', orgId);
    for (let i = 0; i < files.length; i++) fd.append('documents', files[i]);

    try {
      const method = id ? 'PUT' : 'POST';
      const path = id ? `/api/opportunities/${id}` : '/api/opportunities';
      // fetch with auth header (note: don't set Content-Type — browser will set boundary)
      const opts = { method, body: fd, headers: authHeader() };
      const res = await fetch(API_BASE + path, opts);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} - ${txt}`);
      }
      // success
      showMessage('Saved successfully. Redirecting to list...', false);
      setTimeout(() => location.href = 'index.html', 900);
    } catch (err) {
      showMessage('Save failed: ' + err.message, true);
    }
  }

  /* --------- helpers & UI -------- */
  function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function showFieldError(id, msg){ const el = document.getElementById(id); if(el) el.textContent = msg; }

  function clearErrors(){
    const errs = document.querySelectorAll('.err'); errs.forEach(e=>e.textContent='');
    const msg = document.getElementById('formMessage'); if(msg) msg.textContent='';
  }

  function showMessage(msg, isError){
    const el = document.getElementById('formMessage');
    if (!el) return alert(msg);
    el.textContent = msg;
    el.style.color = isError ? 'var(--danger)' : 'inherit';
  }

  /* --------- public init functions ---------- */
  return {
    // called on index.html
    initListPage: async function(){
      const search = document.getElementById('search');
      const orgFilter = document.getElementById('orgFilter');
      const reloadBtn = document.getElementById('reloadBtn');

      await loadOrganizations(orgFilter);
      await loadOpportunities();

      search.addEventListener('input', () => loadOpportunities({ search: search.value, orgId: orgFilter.value }));
      orgFilter.addEventListener('change', () => loadOpportunities({ search: search.value, orgId: orgFilter.value }));
      reloadBtn.addEventListener('click', () => loadOpportunities({ search: search.value, orgId: orgFilter.value }));
    },

    // called on form.html
    initFormPage: async function(){
      const params = new URLSearchParams(location.search);
      const id = params.get('id');

      const orgSelect = document.getElementById('organization');
      await loadOrganizations(orgSelect);

      if (id) {
        // editing: fetch data and fill form
        try {
          const data = await fetchJSON(`/api/opportunities/${id}`, { headers: authHeader() });
          fillFormFields(data);
        } catch (err) {
          showMessage('Failed to load opportunity: ' + err.message, true);
        }
      }

      document.getElementById('oppForm').addEventListener('submit', submitForm);
      document.getElementById('cancelBtn').addEventListener('click', () => location.href = 'index.html');
    }
  };
})();

