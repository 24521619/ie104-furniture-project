// Trang chủ: lưới sản phẩm bán chạy (lấy từ API) + tab danh mục + form đăng ký nhận tin.
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs');

function gridState(html) { grid.innerHTML = `<div class="empty">${html}</div>`; }

async function loadGrid(cat = 'all') {
  tabs.querySelectorAll('button').forEach(b => { const on = b.dataset.f === cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  grid.setAttribute('aria-busy', 'true'); grid.classList.add('loading');
  try {
    const res = await API.getProducts({ cat: cat === 'all' ? '' : cat, limit: 8 });
    grid.innerHTML = res.items.length ? res.items.map(cardHTML).join('') : '';
    if (!res.items.length) gridState('Danh mục này chưa có sản phẩm, bạn quay lại sau nhé.');
  } catch (e) {
    gridState(`${esc(e.message)}<br><button type="button" class="retry" data-retry>Thử lại</button>`);
  } finally { grid.removeAttribute('aria-busy'); grid.classList.remove('loading'); }
}

if (grid && tabs) {
  tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) loadGrid(b.dataset.f); });
  grid.addEventListener('click', e => { if (e.target.closest('[data-retry]')) loadGrid(tabs.querySelector('.on')?.dataset.f || 'all'); });
  loadGrid();
}

const sf = document.getElementById('sf');
if (sf) sf.addEventListener('submit', e => {
  e.preventDefault();
  const email = sf.querySelector('input').value.trim();
  if (!EMAIL_RE.test(email)) { toast('Vui lòng nhập email hợp lệ'); sf.querySelector('input').focus(); return; }
  toast('Cảm ơn bạn đã đăng ký nhận tin!'); sf.reset();
});
