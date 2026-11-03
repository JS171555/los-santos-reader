(async()=>{
 const ctx=await Shell.init('admin');if(!ctx)return;
 if(ctx.profile.role!=='admin'){UI.toast('Acesso restrito a administradores.','error');return setTimeout(()=>location.replace('app.html'),900)}
 const $=s=>document.querySelector(s),pane=$('#pane'),E=D.esc,sb=App.sb;let tab='dash';
 const fail=fn=>D.err(pane,fn),loading=()=>pane.innerHTML='<div class="sk" style="height:140px"></div>';
 $('#tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;tab=b.dataset.t;document.querySelectorAll('#tabs .chip').forEach(x=>x.classList.toggle('on',x===b));go()};
 const go=()=>({dash:tDash,books:tBooks,cats:tCats})[tab]();
 async function tDash(){loading();
  const [s,c]=await Promise.all([sb.rpc('admin_stats'),sb.from('categories').select('name,book_categories(count)')]);
  if(s.error||!s.data||c.error)return fail(tDash);
  const d=s.data,cc=c.data.map(x=>[x.name,x.book_categories[0].count]),max=Math.max(1,...cc.map(x=>x[1]));
  pane.innerHTML=`<div class="row">${[['Usuários',d.users],['Livros cadastrados',d.books],['Livros publicados',d.published],['Categorias',d.categories],['Favoritos',d.favorites]].map(([l,v])=>`<div class="card"><small>${l}</small><strong class="big">${v}</strong></div>`).join('')}</div>
  <div class="card" style="margin-top:1rem"><h3>Livros por categoria</h3>${cc.map(([n,v])=>`<div class="bar2"><span>${E(n)}</span><i style="width:${v/max*100}%"></i><b>${v}</b></div>`).join('')||'<p class="sub">Nenhuma categoria criada.</p>'}</div>
  <p class="sub" style="margin-top:1rem">Leituras, páginas lidas e rankings aparecem aqui a partir das Fases 3 e 4.</p>`}
 const bk=(l,k)=>`<button class="ib" data-a="${k}" aria-label="${l}" title="${l}">`;
 async function tBooks(){loading();
  const r=await sb.from('books').select('*,book_categories(category_id)').order('created_at',{ascending:false});if(r.error)return fail(tBooks);
  const L=r.data;pane.innerHTML=`<div class="acts" style="margin:0 0 .5rem"><button class="btn" id="nb"><i class="fa-solid fa-plus"></i>Novo livro</button></div>`+
  (L.length?L.map(b=>`<div class="item" data-id="${b.id}"><div><strong>${E(b.title)}</strong><small>${E(b.author)}</small></div><span class="badge ${b.is_published?'ok':''}">${b.is_published?'Publicado':'Rascunho'}</span><div class="acts">
  ${bk(b.is_published?'Despublicar':'Publicar','pub')}<i class="fa-solid fa-${b.is_published?'eye-slash':'eye'}"></i></button>${bk('Destaque','feat').replace('class="ib"',`class="ib ${b.is_featured?'on':''}"`)}<i class="fa-solid fa-star"></i></button>${bk('Editar','edit')}<i class="fa-solid fa-pen"></i></button>${bk('Excluir','del')}<i class="fa-solid fa-trash"></i></button></div></div>`).join(''):'<div class="card empty"><i class="fa-solid fa-book"></i><h3>Nenhum livro cadastrado</h3><p class="sub">Cadastre o primeiro livro para abrir a biblioteca.</p></div>');
  $('#nb').onclick=()=>bookForm();
  pane.onclick=async e=>{const a=e.target.closest('[data-a]');if(!a)return;const b=L.find(x=>x.id===a.closest('.item').dataset.id);
   if(a.dataset.a==='edit')return bookForm(b);
   if(a.dataset.a==='del'){if(!await UI.confirm(`Excluir <b>${E(b.title)}</b>? Capa e PDF também serão removidos.`))return;
    await sb.storage.from('covers').remove([b.cover_path].filter(Boolean));await sb.storage.from('pdfs').remove([b.pdf_path].filter(Boolean));
    const {error}=await sb.from('books').delete().eq('id',b.id);error?UI.toast('Não foi possível excluir.','error'):(UI.toast('Livro excluído.','success'),tBooks());return}
   const patch=a.dataset.a==='pub'?{is_published:!b.is_published}:{is_featured:!b.is_featured};
   const {error}=await sb.from('books').update(patch).eq('id',b.id);error?UI.toast('Não foi possível atualizar. Publicar exige um PDF.','error'):(UI.toast('Livro atualizado.','success'),tBooks())}}
 async function bookForm(b){
  const {data:cats,error}=await sb.from('categories').select('*').order('name');if(error)return UI.toast('Erro ao carregar categorias.','error');
  const cur=b?(await sb.from('book_categories').select('category_id').eq('book_id',b.id)).data.map(x=>x.category_id):[];
  const f=(l,n,v='',ex='')=>`<div class="field"><label>${l}</label><input class="input" name="${n}" value="${E(v)}" ${ex}></div>`;
  const m=UI.modal(`<form id="bf"><h2>${b?'Editar livro':'Novo livro'}</h2>${f('Título','title',b?.title,'required maxlength=200')}${f('Autor','author',b?.author,'required maxlength=120')}
  <div class="field"><label>Descrição</label><textarea class="input" name="description">${E(b?.description)}</textarea></div>
  ${f('Páginas','pages',b?.pages,'type=number min=1')}${f('Data de publicação','published_at',b?.published_at,'type=date')}${f('Tags (separadas por vírgula)','tags',b?.tags.join(', '))}
  <div class="field"><label>Categorias</label><div class="checks">${cats.map(c=>`<label><input type="checkbox" name="cat" value="${c.id}" ${cur.includes(c.id)?'checked':''}>${E(c.name)}</label>`).join('')||'<small>Crie categorias na aba Categorias.</small>'}</div></div>
  <div class="field"><label>Capa (JPG, PNG ou WebP, até 5 MB)${b?.cover_path?' · já enviada':''}</label><input class="input" type="file" name="cover" accept="image/jpeg,image/png,image/webp"></div>
  <div class="field"><label>PDF (até 50 MB)${b?.pdf_path?' · já enviado':''}</label><input class="input" type="file" name="pdf" accept="application/pdf"></div>
  <div class="checks"><label><input type="checkbox" name="pub" ${b?.is_published?'checked':''}>Publicado</label><label><input type="checkbox" name="feat" ${b?.is_featured?'checked':''}>Em destaque</label></div>
  <div class="acts"><button type="button" class="btn ghost" id="cx">Cancelar</button><button class="btn" type="submit">Salvar livro</button></div></form>`);
  m.querySelector('#cx').onclick=m.close;
  m.querySelector('#bf').onsubmit=async e=>{e.preventDefault();const fm=new FormData(e.target),btn=e.submitter,cv=fm.get('cover'),pdf=fm.get('pdf');
   if(cv.size&&(cv.size>5242880||!/^image\/(jpeg|png|webp)$/.test(cv.type)))return UI.toast('Capa inválida: use JPG, PNG ou WebP até 5 MB.','error');
   if(pdf.size&&(pdf.size>52428800||pdf.type!=='application/pdf'))return UI.toast('PDF inválido ou maior que 50 MB.','error');
   if(fm.get('pub')&&!pdf.size&&!b?.pdf_path)return UI.toast('Envie o PDF para publicar o livro.','error');
   UI.busy(btn,true);const id=b?.id||crypto.randomUUID(),old=[];
   try{const row={title:fm.get('title').trim(),author:fm.get('author').trim(),description:fm.get('description').trim()||null,pages:+fm.get('pages')||null,published_at:fm.get('published_at')||null,
     tags:fm.get('tags').split(',').map(x=>x.trim()).filter(Boolean),is_published:!!fm.get('pub'),is_featured:!!fm.get('feat')};
    if(cv.size){const p=`${id}/cover-${Date.now()}.${cv.type.split('/')[1]}`,u=await sb.storage.from('covers').upload(p,cv,{contentType:cv.type});if(u.error)throw u.error;if(b?.cover_path)old.push(['covers',b.cover_path]);row.cover_path=p}
    if(pdf.size){const p=`${id}/book-${Date.now()}.pdf`,u=await sb.storage.from('pdfs').upload(p,pdf,{contentType:'application/pdf'});if(u.error)throw u.error;if(b?.pdf_path)old.push(['pdfs',b.pdf_path]);row.pdf_path=p}
    const w=b?await sb.from('books').update(row).eq('id',id):await sb.from('books').insert({...row,id});if(w.error)throw w.error;
    await sb.from('book_categories').delete().eq('book_id',id);const ids=fm.getAll('cat');
    if(ids.length){const c=await sb.from('book_categories').insert(ids.map(category_id=>({book_id:id,category_id})));if(c.error)throw c.error}
    for(const [bu,p] of old)await sb.storage.from(bu).remove([p]);
    UI.toast('Livro salvo.','success');m.close();tBooks()}
   catch{UI.toast('Não foi possível salvar o livro. Tente novamente.','error');UI.busy(btn,false)}}}
 async function tCats(){loading();const r=await sb.from('categories').select('*').order('name');if(r.error)return fail(tCats);
  pane.innerHTML=`<div class="acts" style="margin:0 0 .5rem"><button class="btn" id="nc"><i class="fa-solid fa-plus"></i>Nova categoria</button></div>`+
  (r.data.length?r.data.map(c=>`<div class="item" data-id="${c.id}"><div><strong>${E(c.name)}</strong><small>${E(c.description)}</small></div><div class="acts">${bk('Editar','edit')}<i class="fa-solid fa-pen"></i></button>${bk('Excluir','del')}<i class="fa-solid fa-trash"></i></button></div></div>`).join(''):'<div class="card empty"><i class="fa-solid fa-tags"></i><h3>Nenhuma categoria</h3><p class="sub">Crie categorias para organizar os livros.</p></div>');
  const form=c=>{const m=UI.modal(`<form><h2>${c?'Editar categoria':'Nova categoria'}</h2><div class="field"><label>Nome</label><input class="input" name="name" value="${E(c?.name)}" required minlength="2" maxlength="40"></div><div class="field"><label>Descrição</label><textarea class="input" name="description">${E(c?.description)}</textarea></div><div class="acts"><button type="button" class="btn ghost" id="cx">Cancelar</button><button class="btn" type="submit">Salvar</button></div></form>`);
   m.querySelector('#cx').onclick=m.close;m.querySelector('form').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),row={name:d.name.trim(),description:d.description.trim()||null};
    UI.busy(e.submitter,true);const w=c?await sb.from('categories').update(row).eq('id',c.id):await sb.from('categories').insert(row);
    if(w.error){UI.busy(e.submitter,false);return UI.toast(w.error.code==='23505'?'Já existe uma categoria com esse nome.':'Não foi possível salvar.','error')}
    UI.toast('Categoria salva.','success');m.close();tCats()}};
  $('#nc').onclick=()=>form();
  pane.onclick=async e=>{const a=e.target.closest('[data-a]');if(!a)return;const c=r.data.find(x=>x.id===a.closest('.item').dataset.id);
   if(a.dataset.a==='edit')return form(c);if(!await UI.confirm(`Excluir a categoria <b>${E(c.name)}</b>? Os livros continuam cadastrados.`))return;
   const {error}=await sb.from('categories').delete().eq('id',c.id);error?UI.toast('Não foi possível excluir.','error'):(UI.toast('Categoria excluída.','success'),tCats())}}
 tDash();
})();
