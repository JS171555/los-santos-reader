(async()=>{
 const ctx=await Shell.init('game');if(!ctx)return;
 const $=s=>document.querySelector(s),pane=$('#pane'),sb=App.sb,E=D.esc;let tab='sum',per='week',xpHistory=[],xpOffset=0,xpHasMore=false,xpLoading=false;const XP_PAGE_SIZE=20;
 const lvl=x=>Math.floor(Math.sqrt(x/100))+1,loading=()=>pane.innerHTML='<div class="sk" style="height:160px"></div>',fail=fn=>D.err(pane,fn),
  em=(i,h,p)=>`<div class="card empty"><i class="fa-solid fa-${i}"></i><h3>${h}</h3><p class="sub">${p}</p></div>`;
 $('#tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;tab=b.dataset.t;document.querySelectorAll('#tabs .chip').forEach(x=>x.classList.toggle('on',x===b));go()};
 const go=()=>({sum:tSum,rank:tRank,ach:tAch,his:tHis})[tab]();
 async function tSum(){loading();
  const [x,s,g,p]=await Promise.all([sb.from('user_xp').select('*').maybeSingle(),sb.rpc('my_stats'),sb.from('reading_goals').select('daily_pages').maybeSingle(),sb.from('reading_progress').select('seconds_read,status')]);
  if(x.error||s.error||g.error||p.error)return fail(tSum);
  const xp=x.data?.total_xp||0,l=lvl(xp),b=100*(l-1)**2,n=100*l*l,st=s.data,goal=g.data?.daily_pages||5,fin=p.data.filter(r=>r.status==='finished').length,hrs=(p.data.reduce((a,r)=>a+r.seconds_read,0)/3600).toFixed(1);
  pane.innerHTML=`<div class="card"><small>Nível</small><strong class="big">${l}</strong><div class="xpbar"><i id="xb"></i></div><small>${xp} XP · faltam ${n-xp} para o nível ${l+1}</small></div>
  <div class="row" style="margin-top:1rem">${[['Sequência',st.streak+' dia(s)'],['Páginas validadas',x.data?.pages_read||0],['Livros concluídos',fin],['Tempo de leitura',hrs+' h']].map(([a,v])=>`<div class="card"><small>${a}</small><strong>${v}</strong></div>`).join('')}</div>
  <div class="card" style="margin-top:1rem"><h3>Meta diária</h3><p class="sub">Hoje: ${st.today_pages} de ${goal} páginas</p><div class="xpbar"><i id="gb"></i></div>
  <form id="gf" class="acts" style="justify-content:flex-start"><input class="input pg" name="g" type="number" min="1" max="500" value="${goal}" aria-label="Meta diária de páginas" style="width:90px"><button class="btn ghost">Salvar meta</button></form></div>`;
  gsap.fromTo('#xb',{width:0},{width:Math.round((xp-b)/(n-b)*100)+'%',duration:.9,ease:'power2.out'});gsap.fromTo('#gb',{width:0},{width:Math.min(100,st.today_pages/goal*100)+'%',duration:.9,ease:'power2.out'});
  $('#gf').onsubmit=async e=>{e.preventDefault();const v=Math.min(500,Math.max(1,+e.target.g.value||5)),{error}=await sb.from('reading_goals').upsert({user_id:ctx.user.id,daily_pages:v});error?UI.toast('Não foi possível salvar a meta.','error'):(UI.toast('Meta atualizada.','success'),tSum())}}
 async function tRank(){loading();const r=await sb.rpc('get_ranking',{p_period:per});if(r.error)return fail(tRank);
  pane.innerHTML=`<div class="chips">${[['week','Semanal'],['month','Mensal'],['all','Geral']].map(([k,n])=>`<button class="chip ${per===k?'on':''}" data-p="${k}">${n}</button>`).join('')}</div>`+
  (r.data.length?`<div class="card">${r.data.map(u=>`<div class="rk ${u.r_me?'me':''}"><b>${u.r_pos}º</b><div><strong>${D.avatarImg(u.r_avatar)}${E(u.r_name)}${u.r_me?' (você)':''}</strong><br><small>Nível ${u.r_level||1}</small></div><b>${u.r_xp} XP</b></div>`).join('')}</div>`:em('ranking-star','Ninguém pontuou neste período','Leia páginas para entrar no ranking.'));
  pane.onclick=e=>{const b=e.target.closest('[data-p]');if(b){per=b.dataset.p;tRank()}}}
 async function tAch(){loading();const [a,u]=await Promise.all([sb.from('achievements').select('*').order('sort'),sb.from('user_achievements').select('code,unlocked_at')]);if(a.error||u.error)return fail(tAch);
  const got=new Map(u.data.map(x=>[x.code,x.unlocked_at])),card=x=>`<div class="card ach ${got.has(x.code)?'on':''}"><i class="fa-solid fa-${E(x.icon)}"></i><h3>${E(x.name)}</h3><small>${got.has(x.code)?'Desbloqueada em '+D.fmt(got.get(x.code).slice(0,10)):E(x.description)}</small></div>`;
  pane.innerHTML=`<p class="sub">${got.size} de ${a.data.length} desbloqueadas</p><div class="row">${a.data.filter(x=>got.has(x.code)).map(card).join('')}${a.data.filter(x=>!got.has(x.code)).map(card).join('')}</div>`;gsap.from('.ach',{opacity:0,y:12,stagger:.04,duration:.3})}
 async function tHis(reset=true){
  if(reset){xpHistory=[];xpOffset=0;xpHasMore=true}
  if(xpLoading)return;xpLoading=true;if(!xpHistory.length)loading();
  const r=await sb.from('xp_transactions').select('*,books(title)').order('created_at',{ascending:false}).order('id',{ascending:false}).range(xpOffset,xpOffset+XP_PAGE_SIZE-1);xpLoading=false;
  if(r.error)return fail(()=>tHis(reset));
  xpHistory.push(...r.data);xpOffset+=r.data.length;xpHasMore=r.data.length===XP_PAGE_SIZE;
  const K={pages:'Páginas lidas',completion:'Livro concluído',daily:'Bônus do dia',goal:'Meta diária batida'};
  pane.innerHTML=xpHistory.length?`<div class="card">${xpHistory.map(t=>`<div class="item"><div><strong>${K[t.kind]||'XP recebido'}${t.pages?' · '+t.pages+' pág.':''}</strong><small>${E(t.books?.title||'')} ${new Date(t.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</small></div><b>+${t.xp} XP</b></div>`).join('')}</div>${xpHasMore?'<div class="acts" style="justify-content:center;margin-top:1rem"><button class="btn ghost" id="more-xp">Carregar mais</button></div>':''}`:em('clock-rotate-left','Nenhum XP ainda','Leia no leitor: cada página validada rende XP.');
  const more=$('#more-xp');if(more)more.onclick=()=>tHis(false);
 }
 tSum();
})();
