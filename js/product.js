const $=id=>document.getElementById(id),U=95;let q=1;
const fm=n=>(n).toFixed(2);
function sync(){$('q').textContent=q;$('bt').textContent=fm(U*q);$('tot').textContent=fm(U)}
$('mn').onclick=()=>{q=Math.max(1,q-1);sync()};
$('pl').onclick=()=>{q=Math.min(9,q+1);sync()};
$('add').onclick=()=>Cart.add(q);
$('sw').onclick=e=>{const b=e.target.closest('button');if(!b)return;[...$('sw').children].forEach(x=>{x.setAttribute('aria-pressed',x===b);x.textContent=x===b?'✓':''});
$('cn').textContent=b.dataset.n};
$('th').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=[...$('th').children].indexOf(b);[...$('th').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});$('chair').style.setProperty('--zoom',b.dataset.zoom);$('chair').style.objectPosition=b.dataset.position;$('chair').alt=b.getAttribute('aria-label')+' of the mustard yellow lounge chair';$('cnt').textContent='0'+(i+1)+' / 03'};
$('tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.t;[...$('tabs').children].forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.pn').forEach((p,j)=>p.classList.toggle('on',j===i))};
sync();
