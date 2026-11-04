(async()=>{
 const $=s=>document.querySelector(s),id=new URLSearchParams(location.search).get('id'),sb=App.sb,E=D.esc;
 if(!App.configured)return location.replace('login.html');
 const ctx=await App.auth.requireAuth();if(!ctx)return;await window.Rewards?.init(ctx.user.id,ctx.profile);
 $('#back').href='book.html?id='+id;
 const fatal=m=>{$('#stage').innerHTML=`<div class="card empty" style="margin:auto"><i class="fa-solid fa-triangle-exclamation"></i><h3>${m}</h3><a class="btn" href="app.html">Voltar à biblioteca</a></div>`};
 if(!id)return fatal('Livro não informado');
 let book,prog,bms,pdf;
 try{const [b,p,m]=await Promise.all([sb.from('books').select('id,title,pdf_path,pages').eq('id',id).maybeSingle(),sb.from('reading_progress').select('*').eq('book_id',id).maybeSingle(),sb.from('bookmarks').select('*').eq('book_id',id).order('page')]);
  if(b.error||p.error||m.error)throw 0;book=b.data;if(!book?.pdf_path)return fatal('Livro indisponível');prog=p.data;bms=m.data;
  const u=await sb.storage.from('pdfs').createSignedUrl(book.pdf_path,3600);if(u.error)throw 0;
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  pdf=await pdfjsLib.getDocument(u.data.signedUrl).promise}catch{return fatal('Não foi possível abrir o livro')}
 document.title=book.title+' · Leitor';$('#rt').textContent=book.title;
 const N=pdf.numPages;if(!Number.isInteger(book.pages)||book.pages!==N)return fatal('A contagem de páginas deste PDF não corresponde ao catálogo. Avise um administrador para corrigir os dados do livro.');let page=Math.min(Math.max(prog?.last_page||1,1),N),mode=ctx.profile.reader_fit||'width',scale=1,busy=false,again=false,first=true;
 try{document.body.dataset.theme=localStorage.getItem('reader-theme')||ctx.profile.reader_theme||'dark'}catch{}
 const ui=()=>{$('#pi').value=page;$('#pi').max=N;$('#pt').textContent='/ '+N;$('#pb').style.width=page/N*100+'%';$('#zl').textContent=Math.round(scale*100)+'%';
  const on=bms.some(b=>b.page===page),i=$('#bm');i.setAttribute('aria-pressed',on);i.firstElementChild.className=`fa-${on?'solid':'regular'} fa-bookmark`};
 async function render(){
  if(busy){again=true;return}busy=true;
  try{do{again=false;const pg=await pdf.getPage(page),v0=pg.getViewport({scale:1}),st=$('#stage');
   scale=mode==='width'?(st.clientWidth-32)/v0.width:mode==='height'?(st.clientHeight-32)/v0.height:scale;
   const dpr=Math.min(window.devicePixelRatio||1,3),base=pg.getViewport({scale:scale*dpr}),ratio=Math.min(1,Math.sqrt(6e6/(base.width*base.height)),6144/base.width,6144/base.height),d=dpr*ratio,vp=pg.getViewport({scale:scale*d}),c=$('#cv');c.width=vp.width;c.height=vp.height;c.style.width=vp.width/d+'px';c.style.height=vp.height/d+'px';
   await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
   if(first){first=false;$('#rsk').remove();c.hidden=false;if(prog&&page>1)UI.toast('Continuando da página '+page+'.','info')}
  }while(again);ui()}catch{UI.toast('Não foi possível renderizar esta página. Tente novamente.','error')}finally{busy=false;if(again){again=false;render()}}}
 const go=n=>{n=Math.min(Math.max(Math.round(+n)||page,1),N);if(n===page)return ui();page=n;dirty=true;$('#stage').scrollTo(0,0);render();clearTimeout(tm);tm=setTimeout(save,2500)};
 const zoom=f=>{mode='free';scale=Math.min(4,Math.max(.3,scale*f));render()},fit=m=>{mode=m;render()};
 // Tempo ativo: conta só com aba visível, janela em foco e atividade nos últimos 60 s
 const sess=App.uuid();let act=0,sent=0,idle=Date.now(),dirty=true,chain=Promise.resolve(),done=prog?.status==='finished',tm;
 ['pointermove','pointerdown','keydown','wheel','touchstart','scroll'].forEach(e=>addEventListener(e,()=>idle=Date.now(),{passive:true,capture:true}));
 setInterval(()=>{if(!document.hidden&&document.hasFocus()&&Date.now()-idle<6e4)act++},1000);
 function save(){chain=chain.then(async()=>{const sec=Math.min(act-sent,120);if(!dirty&&!sec)return;
  const {data,error}=await sb.rpc('save_progress',{p_book:id,p_session:sess,p_page:page,p_total:N,p_seconds:sec});if(error)return;
  sent+=sec;dirty=false;window.Rewards?.check();if(data?.status==='finished'&&!done){done=true;UI.toast('Livro concluído! Parabéns.','success')}}).catch(()=>{})}
 setInterval(save,3e4);document.addEventListener('visibilitychange',()=>document.hidden&&save());addEventListener('pagehide',save);
 $('#pv').onclick=()=>go(page-1);$('#nx').onclick=()=>go(page+1);$('#pi').onchange=e=>go(e.target.value);
 $('#zo').onclick=()=>zoom(.85);$('#zi').onclick=()=>zoom(1.2);$('#fw').onclick=()=>fit('width');$('#fh').onclick=()=>fit('height');
 $('#th').onclick=()=>{const t=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=t;try{localStorage.setItem('reader-theme',t)}catch{}};
 const fs=$('#fs');if(!document.fullscreenEnabled||!document.documentElement.requestFullscreen)fs.hidden=true;else{fs.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{UI.toast('Tela cheia indisponível neste navegador.','info')}}}
 document.addEventListener('fullscreenchange',()=>{fs.firstElementChild.className='fa-solid fa-'+(document.fullscreenElement?'compress':'expand');fs.setAttribute('aria-label',document.fullscreenElement?'Sair da tela cheia':'Tela cheia')});
 $('#bm').onclick=async()=>{const b=bms.find(x=>x.page===page);
  if(b){const {error}=await sb.from('bookmarks').delete().eq('id',b.id);if(error)return UI.toast('Não foi possível remover o marcador.','error');bms=bms.filter(x=>x!==b);UI.toast('Marcador removido.','info')}
  else{const {data,error}=await sb.from('bookmarks').insert({book_id:id,page}).select().single();if(error)return UI.toast('Não foi possível salvar o marcador.','error');bms.push(data);bms.sort((a,c)=>a.page-c.page);UI.toast('Página '+page+' marcada.','success')}ui()};
 $('#bl').onclick=()=>{const m=UI.modal('');const draw=()=>{m.firstChild.innerHTML=`<h3>Meus marcadores</h3>`+(bms.length?bms.map(b=>`<div class="item"><div><strong>Página ${b.page}</strong><small>${new Date(b.created_at).toLocaleDateString('pt-BR')}</small></div><div class="acts"><button class="btn ghost" data-g="${b.page}">Ir</button><button class="ib" data-d="${b.id}" aria-label="Excluir marcador"><i class="fa-solid fa-trash"></i></button></div></div>`).join(''):'<p class="sub">Nenhum marcador neste livro ainda.</p>')+'<div class="acts"><button class="btn ghost" data-x>Fechar</button></div>'};draw();
  m.onclick=async e=>{const t=e.target.closest('button');if(!t)return;if('x'in t.dataset)return m.close();if(t.dataset.g){m.close();return go(t.dataset.g)}
   if(t.dataset.d){const {error}=await sb.from('bookmarks').delete().eq('id',t.dataset.d);if(error)return UI.toast('Erro ao excluir.','error');bms=bms.filter(b=>b.id!==t.dataset.d);draw();ui()}}};
 addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||document.querySelector('.ov'))return;
  ({ArrowRight:()=>go(page+1),PageDown:()=>go(page+1),ArrowLeft:()=>go(page-1),PageUp:()=>go(page-1),Home:()=>go(1),End:()=>go(N)})[e.key]?.()});
 let tx=null,ty=null;$('#stage').addEventListener('touchstart',e=>{if(e.touches.length!==1){tx=ty=null;return}tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
 $('#stage').addEventListener('touchend',e=>{if(tx===null||ty===null||mode==='free'||e.changedTouches.length!==1){tx=ty=null;return}const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=ty=null;if(Math.abs(dx)>60&&Math.abs(dy)<40)go(page+(dx<0?1:-1))},{passive:true});
 $('#stage').addEventListener('touchcancel',()=>{tx=ty=null},{passive:true});
 let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>mode!=='free'&&render(),200)});
 await render();save();
})();
