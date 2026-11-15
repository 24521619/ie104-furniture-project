// Product tabs filter (?c=chair also works), add-to-cart buttons, subscribe form
const grid=document.getElementById('grid'),tabs=document.getElementById('tabs');
function filter(f){
  let n=0;grid.querySelectorAll('.pc').forEach(c=>{const ok=f==='all'||c.dataset.c===f;c.hidden=!ok;if(ok)n++});
  document.getElementById('empty').hidden=n>0;
  tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));
}
if(tabs){tabs.onclick=e=>{const b=e.target.closest('button');if(b)filter(b.dataset.f)};
  filter(new URLSearchParams(location.search).get('c')||'all');}
if(grid)grid.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b){e.preventDefault();Cart.add(1)}});
const sf=document.getElementById('sf');
if(sf)sf.onsubmit=e=>{e.preventDefault();Cart.toast('Thanks for subscribing!');sf.reset()};
