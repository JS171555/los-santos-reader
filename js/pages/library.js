(async()=>{
 if(!await Shell.init('home'))return;
 const $=s=>document.querySelector(s),view=$('#view'),st={q:'',cat:'',fav:false};let books=[],cats=[],favs=new Set(),t;
 const empty=(i,h,p)=>`<div class="card empty"><i class="fa-solid fa-${i}"></i><h3>${h}</h3><p class="sub">${p}</p></div>`;
 const sec=(h,l)=>`<h2 class="sec">${h}</h2><div class="grid">${l.map(b=>D.card(b,favs.has(b.id))).join('')}</div>`;
 function chips(){$('#chips').innerHTML=[['','','Todos'],['fav','1','Favoritos'],...cats.map(c=>['cat',c.id,c.name])].map(([k,v,n])=>
  `<button class="chip ${(k==='fav'?st.fav:k==='cat'?st.cat===v:!st.fav&&!st.cat)?'on':''}" data-k="${k}" data-v="${v}">${D.esc(n)}</button>`).join('')}
 function draw(){
  const f=books.filter(b=>(!st.cat||D.catIds(b).includes(st.cat))&&(!st.fav||favs.has(b.id)));
  if(!books.length&&!st.q)view.innerHTML=empty('book-open','Nenhum livro publicado ainda','Volte em breve: novos títulos chegam por aqui.');
  else if(!f.length)view.innerHTML=empty('magnifying-glass',st.fav?'Você ainda não tem favoritos':'Nada encontrado',st.fav?'Toque no coração de um livro para guardá-lo aqui.':'Tente outro termo ou categoria.');
  else if(st.q||st.cat||st.fav)view.innerHTML=sec('Resultados',f);
  else{const ft=f.filter(b=>b.is_featured);view.innerHTML=(ft.length?sec('Em destaque',ft):'')+sec('Lançamentos',f.slice(0,6))+sec('Todos os livros',[...f].sort((a,b)=>a.title.localeCompare(b.title)))}
  gsap.from('.book',{opacity:0,y:14,duration:.35,stagger:.025})}
 async function load(){
  view.innerHTML='<div class="grid">'+'<div class="sk" style="aspect-ratio:2/3"></div>'.repeat(8)+'</div>';
  try{const [b,c,f]=await Promise.all([D.books(st.q),App.sb.from('categories').select('*').order('name'),App.sb.from('favorites').select('book_id')]);
   if(b.error||c.error||f.error)throw 0;books=b.data;cats=c.data;favs=new Set(f.data.map(x=>x.book_id));chips();draw()}
  catch{D.err(view,load)}}
 $('#q').oninput=e=>{clearTimeout(t);t=setTimeout(()=>{st.q=e.target.value;load()},300)};
 $('#chips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;st.fav=b.dataset.k==='fav';st.cat=b.dataset.k==='cat'?b.dataset.v:'';chips();draw()};
 view.onclick=async e=>{const b=e.target.closest('.fav');if(!b)return;await D.toggleFav(b,favs);if(st.fav)draw()};
 load();
})();
