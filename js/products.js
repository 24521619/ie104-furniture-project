// Trang danh sách sản phẩm: tìm kiếm, lọc theo danh mục & khoảng giá, phân trang.
// Mọi bộ lọc được gửi lên GET /api/products?cat=&q=&min=&max=&page=&limit=
const PAGE_SIZE = 8;
const $ = id => document.getElementById(id);
const grid = $('grid'), pager = $('pager');
const state = { cat: 'all', q: '', price: '', page: 1 };
let reqId = 0;

// Khoảng giá: giá trị "min-max" (để trống một bên = không giới hạn)
const PRICE = { '': ['', ''], 'lt2': ['', 2000000], '2-5': [2000000, 5000000], '5-10': [5000000, 10000000], 'gt10': [10000000, ''] };

async function load() {
  const my = ++reqId;
  [...$('tabs').children].forEach(b => { const on = b.dataset.f === state.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  grid.classList.add('loading'); grid.setAttribute('aria-busy', 'true');
  const [min, max] = PRICE[state.price] || PRICE[''];
  try {
    const res = await API.getProducts({ cat: state.cat === 'all' ? '' : state.cat, q: state.q, min, max, page: state.page, limit: PAGE_SIZE });
    if (my !== reqId) return; // đã có yêu cầu mới hơn
    state.page = res.page;
    grid.innerHTML = res.items.length ? res.items.map(cardHTML).join('')
      : `<div class="empty">Không tìm thấy sản phẩm phù hợp.<br><button type="button" class="retry" data-reset>Xoá bộ lọc</button></div>`;
    $('count').textContent = res.total ? `${res.total} sản phẩm` + (res.totalPages > 1 ? ` · trang ${res.page}/${res.totalPages}` : '') : '0 sản phẩm';
    renderPager(res);
  } catch (e) {
    if (my !== reqId) return;
    grid.innerHTML = `<div class="empty">${esc(e.message)}<br><button type="button" class="retry" data-retry>Thử lại</button></div>`;
    $('count').textContent = ''; pager.innerHTML = '';
  } finally {
    if (my === reqId) { grid.classList.remove('loading'); grid.removeAttribute('aria-busy'); }
  }
}

function renderPager({ page, totalPages }) {
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  const btn = (p, label, extra = '') => `<button type="button" data-page="${p}" ${extra}>${label}</button>`;
  let html = btn(page - 1, '‹ Trước', `aria-label="Trang trước"${page <= 1 ? ' disabled' : ''}`);
  for (let p = 1; p <= totalPages; p++) html += btn(p, p, p === page ? 'class="on" aria-current="page"' : `aria-label="Trang ${p}"`);
  html += btn(page + 1, 'Sau ›', `aria-label="Trang sau"${page >= totalPages ? ' disabled' : ''}`);
  pager.innerHTML = html;
}

function setCat(c) { state.cat = CATEGORIES[c] ? c : 'all'; state.page = 1; }

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setCat(b.dataset.f);
  history.replaceState(null, '', state.cat === 'all' ? location.pathname : '#' + state.cat);
  load();
});

let t;
$('q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });
$('search').addEventListener('submit', e => { e.preventDefault(); clearTimeout(t); state.q = $('q').value.trim(); state.page = 1; load(); });
$('price').addEventListener('change', e => { state.price = e.target.value; state.page = 1; load(); });

pager.addEventListener('click', e => {
  const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
  state.page = +b.dataset.page; load();
  $('top').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

grid.addEventListener('click', e => {
  if (e.target.closest('[data-retry]')) load();
  if (e.target.closest('[data-reset]')) { state.q = ''; state.price = ''; $('q').value = ''; $('price').value = ''; setCat('all'); history.replaceState(null, '', location.pathname); load(); }
});

window.addEventListener('hashchange', () => { setCat(location.hash.slice(1)); load(); });
setCat(location.hash.slice(1));
load();
