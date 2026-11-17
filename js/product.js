// Trang chi tiết sản phẩm. Sản phẩm lấy từ GET /api/products/:id, id nằm trên địa chỉ: product.html#<id>
const $ = id => document.getElementById(id);
const VIEWS = [['Toàn cảnh', 1, '50% 50%'], ['Cận cảnh', 1.6, '50% 60%'], ['Chi tiết', 2.3, '50% 68%']];
const num = n => String(n ?? '').replace('.', ',');
let p = null, q = 1, color = '', reqId = 0;

async function load() {
  const my = ++reqId;
  const id = decodeURIComponent(location.hash.slice(1)) || PRODUCTS[0].id;
  $('pd').className = 'is-loading';
  try {
    const prod = await API.getProduct(id);
    if (my !== reqId) return;
    p = prod; render();
    $('pd').className = '';
    loadRelated(p);
  } catch (e) {
    if (my !== reqId) return;
    $('pd').className = 'is-error';
    $('pd-msg').innerHTML = `<h1>${e.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'}</h1><p>${esc(e.message)}</p>
      <p><a class="btn-main" style="display:inline-grid;place-items:center;width:auto;padding:0 28px" href="products.html">Xem tất cả sản phẩm</a>
      ${e.status === 404 ? '' : '<button type="button" class="btn-line" data-retry style="margin-left:8px">Thử lại</button>'}</p>`;
    document.title = 'Akio — Không tìm thấy sản phẩm';
  }
}

function render() {
  q = 1;
  const colors = p.colors || [];
  color = colors[0] ? colors[0][0] : '';
  document.title = `Akio — ${p.name}`;
  $('bc-cat').textContent = CATEGORIES[p.cat] || 'Sản phẩm'; $('bc-cat').href = 'products.html#' + (p.cat || '');
  $('bc-name').textContent = p.name;

  $('chair').src = p.img; $('chair').alt = p.alt || p.name;
  $('pill').textContent = p.pill || ''; $('pill').hidden = !p.pill;
  $('th').innerHTML = VIEWS.map(([label, z, pos], i) =>
    `<button type="button" class="${i ? '' : 'on'}" aria-label="${label}" aria-pressed="${!i}" data-i="${i}">
      <img src="${esc(p.img)}" alt="" loading="lazy" decoding="async" style="--zoom:${z};object-position:${pos}"></button>`).join('');
  showView(0);

  $('ey').textContent = (p.collection || '').toLocaleUpperCase('vi');
  $('name').textContent = p.name;
  $('tagline').textContent = p.tagline || '';
  $('rate').textContent = p.rating ? `${num(p.rating)} · ${p.reviews || 0} đánh giá` : 'Chưa có đánh giá';
  $('tot').textContent = money(p.price);
  $('old').textContent = p.old ? money(p.old) : '';
  $('save').hidden = !p.old;
  $('save').textContent = p.old ? `Tiết kiệm ${money(p.old - p.price)}` : '';
  $('desc').textContent = p.desc || '';

  $('sw').innerHTML = colors.map(([n, c], i) =>
    `<button type="button" style="--c:${esc(c)}" data-n="${esc(n)}" aria-pressed="${!i}" aria-label="${esc(n)}">${i ? '' : '✓'}</button>`).join('');
  $('cn').textContent = color;
  $('color-row').hidden = !colors.length;
  $('finish').textContent = p.finish || ''; $('finish-row').hidden = !p.finish;

  $('ov-text').textContent = [p.desc, p.tagline].filter(Boolean).join(' ');
  $('specs').innerHTML = Object.entries(p.specs || {}).map(([k, v]) => `<div class="row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
  $('tab-rev').textContent = `Đánh giá (${p.reviews || 0})`;
  $('rev-h').innerHTML = `Được ${p.reviews || 0} khách hàng<br>yêu thích.`;
  $('rev-p').textContent = p.rating ? `Điểm ${num(p.rating)}/5 cho sự êm ái và kiểu dáng.` : '';
  $('rev-score').textContent = p.rating ? `★★★★★  ${num(p.rating)}` : 'Chưa có đánh giá';

  selectTab(0);
  sync();
}

// Sản phẩm liên quan: cùng danh mục trước, sau đó các danh mục khác
async function loadRelated(cur) {
  try {
    const res = await API.getProducts({ limit: 100 });
    if (cur !== p) return;
    const all = res.items.filter(x => x.id !== cur.id);
    const related = [...all.filter(x => x.cat === cur.cat), ...all.filter(x => x.cat !== cur.cat)].slice(0, 3);
    $('rel').innerHTML = related.map(r => `<a href="product.html#${encodeURIComponent(r.id)}"><div class="ph"><img src="${esc(r.img)}" alt="${esc(r.alt || r.name)}" loading="lazy" decoding="async"></div><small>${esc(CATEGORIES[r.cat] || '')}</small><div class="rn"><b>${esc(r.name)}</b><span>${money(r.price)}</span></div></a>`).join('');
  } catch (e) { $('rel').innerHTML = ''; }
}

function sync() { $('q').textContent = q; $('bt').textContent = money(p.price * q); $('mn').disabled = q <= 1; $('pl').disabled = q >= 9; }

function showView(i) {
  const [label, z, pos] = VIEWS[i];
  [...$('th').children].forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-pressed', j === i); });
  $('chair').style.setProperty('--zoom', z); $('chair').style.objectPosition = pos;
  $('chair').alt = `${label}: ${p.name}`;
  $('cnt').textContent = `0${i + 1} / 0${VIEWS.length}`;
}

function selectTab(i) {
  [...$('tabs').children].forEach((x, j) => { x.classList.toggle('on', j === i); x.setAttribute('aria-selected', j === i); });
  document.querySelectorAll('.pn').forEach((s, j) => s.classList.toggle('on', j === i));
}

$('mn').onclick = () => { q = Math.max(1, q - 1); sync(); };
$('pl').onclick = () => { q = Math.min(9, q + 1); sync(); };
$('add').onclick = async () => {
  if (!p) return;
  $('add').disabled = true;
  await Cart.add(p.id, q, color);
  $('add').disabled = false;
};
$('sw').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  [...$('sw').children].forEach(x => { x.setAttribute('aria-pressed', x === b); x.textContent = x === b ? '✓' : ''; });
  color = b.dataset.n; $('cn').textContent = color;
};
$('th').onclick = e => { const b = e.target.closest('button'); if (b) showView(+b.dataset.i); };
$('tabs').onclick = e => { const b = e.target.closest('button'); if (b) selectTab(+b.dataset.t); };
$('pd-msg').addEventListener('click', e => { if (e.target.closest('[data-retry]')) load(); });

window.addEventListener('hashchange', () => { load(); window.scrollTo(0, 0); });
load();
