const D=window.D={
 esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 cover:p=>p?App.sb.storage.from('covers').getPublicUrl(p).data.publicUrl:'',
 fmt:d=>d?new Date(d+(d.length===10?'T12:00':'')).toLocaleDateString('pt-BR'):'—',
 books(q=''){let r=App.sb.from('books').select('*,book_categories(categories(id,name))').eq('is_published',true).order('created_at',{ascending:false});
  q=q.replace(/[%,()*]/g,' ').trim();return q?r.or(`title.ilike.%${q}%,author.ilike.%${q}%`):r},
 catIds:b=>b.book_categories.map(x=>x.categories.id),
 card(b,on){const t=D.esc(b.title);return `<div class="book"><a href="book.html?id=${b.id}"><div class="cv">${b.cover_path?`<img loading="lazy" decoding="async" alt="Capa de ${t}" src="${D.cover(b.cover_path)}">`:`<span>${t}</span>`}</div><h3>${t}</h3><p>${D.esc(b.author)}</p></a><button class="fav${on?' on':''}" data-id="${b.id}" aria-label="Favoritar ${t}" aria-pressed="${on}"><i class="fa-${on?'solid':'regular'} fa-heart"></i></button></div>`},
 paint(btn,on){btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',on);btn.firstElementChild.className=`fa-${on?'solid':'regular'} fa-heart`},
 async toggleFav(btn,favs){const id=btn.dataset.id,on=!favs.has(id);on?favs.add(id):favs.delete(id);D.paint(btn,on);
  const {error}=on?await App.sb.from('favorites').insert({book_id:id}):await App.sb.from('favorites').delete().eq('book_id',id);
  if(error){on?favs.delete(id):favs.add(id);D.paint(btn,!on);UI.toast('Não foi possível atualizar os favoritos.','error')}else UI.toast(on?'Adicionado aos favoritos.':'Removido dos favoritos.','success')},
 err:(el,retry)=>{el.innerHTML='<div class="card empty"><i class="fa-solid fa-triangle-exclamation"></i><h3>Não foi possível carregar</h3><p class="sub">Verifique sua conexão e tente de novo.</p><button class="btn" id="retry">Tentar de novo</button></div>';el.querySelector('#retry').onclick=retry}
};
D.avatar=p=>p?App.sb.storage.from('avatars').getPublicUrl(p).data.publicUrl:'';
D.avatarImg=p=>p?`<img class="av" alt="" loading="lazy" src="${D.avatar(p)}">`:'';
