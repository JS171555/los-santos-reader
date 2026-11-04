(async()=>{
 if(!await Shell.init('home'))return;
 const $=s=>document.querySelector(s),view=$('#view'),st={q:'',cat:'',fav:false,prog:''};let books=[],allBooks=[],cats=[],favs=new Set(),prog=new Map(),t,visitOrder=new Map(),visitInitialized=false;
 const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const empty=(i,h,p)=>`<div class="card empty"><i class="fa-solid fa-${i}"></i><h3>${h}</h3><p class="sub">${p}</p></div>`;
 const sec=(h,l)=>`<section class="book-shelf" aria-label="${D.esc(h)}"><h2 class="sec">${D.esc(h)}</h2><div class="grid shelf-track" role="list">${l.map(b=>D.card(b,favs.has(b.id))).join('')}</div></section>`;
 function chips(){$('#chips').innerHTML=[['','','Todos'],['fav','1','Favoritos'],['prog','reading','Em andamento'],['prog','finished','Concluídos'],...cats.map(c=>['cat',c.id,c.name])].map(([k,v,n])=>
  `<button class="chip ${(k==='fav'?st.fav:k==='cat'?st.cat===v:k==='prog'?st.prog===v:!st.fav&&!st.cat&&!st.prog)?'on':''}" data-k="${k}" data-v="${v}">${D.esc(n)}</button>`).join('')}
 function draw(){
  const f=books.filter(b=>(!st.cat||D.catIds(b).includes(st.cat))&&(!st.fav||favs.has(b.id))&&(!st.prog||prog.get(b.id)?.status===st.prog));
  if(!books.length&&!st.q)view.innerHTML=empty('book-open','Nenhum livro publicado ainda','Volte em breve: novos títulos chegam por aqui.');
  else if(!f.length)view.innerHTML=empty('magnifying-glass',st.fav?'Você ainda não tem favoritos':'Nada encontrado',st.fav?'Toque no coração de um livro para guardá-lo aqui.':'Tente outro termo ou categoria.');
  else if(st.q||st.cat||st.fav||st.prog)view.innerHTML=sec('Resultados',f);
  else{const ft=f.filter(b=>b.is_featured),cr=f.filter(b=>prog.get(b.id)?.status==='reading');view.innerHTML=(cr.length?sec('Continuar lendo',cr):'')+(ft.length?sec('Em destaque',ft):'')+sec('Lançamentos',f.slice(0,6))+cats.map(c=>{const cb=f.filter(b=>D.catIds(b).includes(c.id));return cb.length?sec(c.name,cb):''}).join('')+sec('Todos os livros',f)}
  gsap.from('.book',{opacity:0,y:14,duration:.35,stagger:.025})}
 let searchSeq=0;
 function orderBooks(rows){
  if(!visitInitialized){let previous=null;try{previous=localStorage.getItem('lsr-home-order-v1')}catch{}
   const signature=items=>items.map(x=>String(x.id)).join('|');let ordered=shuffle(rows);
   if(ordered.length>1&&signature(ordered)===previous)[ordered[0],ordered[1]]=[ordered[1],ordered[0]];
   visitOrder=new Map(ordered.map((item,index)=>[item.id,index]));try{localStorage.setItem('lsr-home-order-v1',signature(ordered))}catch{}visitInitialized=true;return ordered}
  return [...rows].sort((a,b)=>(visitOrder.get(a.id)??Number.MAX_SAFE_INTEGER)-(visitOrder.get(b.id)??Number.MAX_SAFE_INTEGER))
 }
 async function load(){
  view.innerHTML=`<div class="grid shelf-track" aria-label="Carregando capas">${'<div class="book" aria-hidden="true"><div class="cv sk"></div></div>'.repeat(8)}</div>`;
  try{const [b,c,f,p]=await Promise.all([D.books(''),App.sb.from('categories').select('*').order('name'),App.sb.from('favorites').select('book_id'),App.sb.from('reading_progress').select('book_id,status,updated_at')]);
   if(b.error||c.error||f.error)throw 0;books=orderBooks(b.data);allBooks=books;cats=c.data;favs=new Set(f.data.map(x=>x.book_id));prog=new Map((p.data||[]).map(x=>[x.book_id,x]));chips();draw()}
  catch{D.err(view,load)}}
 async function search(q){const seq=++searchSeq;if(!q.trim()){st.q='';books=allBooks;draw();return}
  try{const {data,error}=await D.books(q);if(error)throw error;if(seq!==searchSeq)return;st.q=q;books=orderBooks(data);draw()}
  catch{if(seq===searchSeq)D.err(view,()=>search(q))}}
 $('#q').oninput=e=>{clearTimeout(t);searchSeq++;const q=e.target.value;t=setTimeout(()=>search(q),300)};
 $('#chips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;st.fav=b.dataset.k==='fav';st.cat=b.dataset.k==='cat'?b.dataset.v:'';st.prog=b.dataset.k==='prog'?b.dataset.v:'';chips();draw()};
 view.onclick=async e=>{const b=e.target.closest('.fav');if(!b)return;await D.toggleFav(b,favs);if(st.fav)draw()};
 load();
})();
