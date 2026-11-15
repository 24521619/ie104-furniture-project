// Shared cart (localStorage) + toast
const Cart={
  get(){try{return +localStorage.getItem('cart')||0}catch(e){return 0}},
  add(n){try{localStorage.setItem('cart',this.get()+n)}catch(e){}this.render();this.toast('Added to cart ('+this.get()+')')},
  render(){const b=document.getElementById('cart');if(b)b.textContent='Cart ('+this.get()+')'},
  toast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1500)}
};
document.addEventListener('DOMContentLoaded',()=>Cart.render());
