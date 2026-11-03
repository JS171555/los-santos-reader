gsap.globalTimeline.timeScale(matchMedia('(prefers-reduced-motion:reduce)').matches?50:1);
window.UI={
 toast(msg,type='info'){
  let b=document.getElementById('toasts');
  if(!b){b=document.createElement('div');b.id='toasts';b.setAttribute('aria-live','polite');document.body.append(b)}
  const t=document.createElement('div');t.className='toast '+type;
  t.innerHTML=`<i class="fa-solid fa-${{success:'circle-check',error:'circle-xmark',info:'circle-info'}[type]}"></i><span></span>`;
  t.lastChild.textContent=msg;b.append(t);gsap.from(t,{x:40,opacity:0,duration:.35,ease:'power2.out'});
  setTimeout(()=>gsap.to(t,{opacity:0,y:-8,duration:.25,onComplete:()=>t.remove()}),4500);
 },
 busy(b,on){b.disabled=on;b.classList.toggle('loading',on)},
 show(id){
  const cur=document.querySelector('[data-panel]:not([hidden])'),n=document.getElementById(id);
  if(cur===n)return;if(cur)cur.hidden=true;n.hidden=false;
  gsap.fromTo(n,{opacity:0,y:12},{opacity:1,y:0,duration:.3});
 }
};
UI.modal=html=>{const o=document.createElement('div');o.className='ov';o.innerHTML=`<div class="modal card" role="dialog" aria-modal="true">${html}</div>`;document.body.append(o);
 const close=()=>{document.removeEventListener('keydown',k);gsap.to(o,{opacity:0,duration:.15,onComplete:()=>o.remove()})},k=e=>e.key==='Escape'&&close();
 o.addEventListener('mousedown',e=>e.target===o&&close());document.addEventListener('keydown',k);
 gsap.from(o,{opacity:0,duration:.2});gsap.from(o.firstChild,{y:20,duration:.25});o.close=close;return o};
UI.confirm=msg=>new Promise(res=>{const m=UI.modal(`<h3>Confirmar exclusão</h3><p class="sub">${msg}</p><div class="acts"><button class="btn ghost" data-v="0">Cancelar</button><button class="btn danger" data-v="1">Excluir</button></div>`);
 m.onclick=e=>{const b=e.target.closest('[data-v]');if(b){m.close();res(b.dataset.v==='1')}}});
