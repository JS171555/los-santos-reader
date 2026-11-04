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
UI.modal=html=>{const opener=document.activeElement,o=document.createElement('div');o.className='ov';o.innerHTML=`<div class="modal card" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;document.body.append(o);
 const panel=o.firstElementChild,title=panel.querySelector('h1,h2,h3');if(title){if(!title.id)title.id='dialog-title';panel.setAttribute('aria-labelledby',title.id)}else panel.setAttribute('aria-label','Caixa de diálogo');
 const focusable=()=>[...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>!x.hidden);
 const close=()=>{document.removeEventListener('keydown',k);gsap.to(o,{opacity:0,duration:.15,onComplete:()=>{o.remove();if(opener?.isConnected)opener.focus()}})},k=e=>{
  if(e.key==='Escape'){close();return}if(e.key!=='Tab')return;const items=focusable();if(!items.length){e.preventDefault();panel.focus();return}
  const first=items[0],last=items.at(-1),outside=!panel.contains(document.activeElement);if(e.shiftKey&&(document.activeElement===first||outside)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||outside)){e.preventDefault();first.focus()}
 };
 o.addEventListener('mousedown',e=>e.target===o&&close());document.addEventListener('keydown',k);
 gsap.from(o,{opacity:0,duration:.2});gsap.from(panel,{y:20,duration:.25});requestAnimationFrame(()=>{if(!o.isConnected)return;(focusable()[0]||panel).focus()});o.close=close;return o};
UI.confirm=msg=>new Promise(res=>{const m=UI.modal(`<h3>Confirmar exclusão</h3><p class="sub">${msg}</p><div class="acts"><button class="btn ghost" data-v="0">Cancelar</button><button class="btn danger" data-v="1">Excluir</button></div>`);
 m.onclick=e=>{const b=e.target.closest('[data-v]');if(b){m.close();res(b.dataset.v==='1')}}});
