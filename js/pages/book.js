(async()=>{
 const ctx=await Shell.init('home');if(!ctx)return;
 const id=new URLSearchParams(location.search).get('id'),box=document.getElementById('book'),favs=new Set();
 const nf=()=>box.innerHTML='<div class="card empty"><i class="fa-solid fa-book"></i><h3>Livro não encontrado</h3><p class="sub">Ele pode ter sido removido ou despublicado.</p><a class="btn" href="app.html">Voltar à biblioteca</a></div>';
 async function load(){
  if(!id)return nf();
  try{const [b,f]=await Promise.all([App.sb.from('books').select('*,book_categories(categories(id,name))').eq('id',id).maybeSingle(),App.sb.from('favorites').select('book_id').eq('book_id',id)]);
   if(b.error||f.error)throw 0;if(!b.data)return nf();const x=b.data,t=D.esc(x.title);if(f.data.length)favs.add(id);
   document.title=x.title+' · Los Santos Reader';
   box.innerHTML=`<div class="detail"><div class="cv">${x.cover_path?`<img alt="Capa de ${t}" src="${D.cover(x.cover_path)}">`:`<span>${t}</span>`}</div>
   <div><a href="app.html"><i class="fa-solid fa-arrow-left"></i> Biblioteca</a><h1 style="margin:.6rem 0 .2rem">${t}</h1><p class="sub">${D.esc(x.author)}</p>
   ${x.is_published?'':'<p><span class="badge">Rascunho: visível só para administradores</span></p>'}
   <div class="chips">${x.book_categories.map(c=>`<span class="chip">${D.esc(c.categories.name)}</span>`).join('')}</div>
   <p style="white-space:pre-line;max-width:65ch">${D.esc(x.description)||'Sem descrição.'}</p>
   <dl><dt>Páginas</dt><dd>${x.pages||'—'}</dd><dt>Publicação</dt><dd>${D.fmt(x.published_at)}</dd><dt>Tags</dt><dd>${x.tags.map(D.esc).join(', ')||'—'}</dd></dl>
   <button class="btn ghost fav" style="position:static;width:auto;padding:0 1.1rem;border-radius:12px" data-id="${id}" aria-pressed="false"><i class="regular"></i>Favorito</button></div></div>`;
   const fb=box.querySelector('.fav');D.paint(fb,favs.has(id));fb.onclick=()=>D.toggleFav(fb,favs);
   gsap.from('.detail > *',{opacity:0,y:14,duration:.4,stagger:.1})}
  catch{D.err(box,load)}}
 load();
})();
