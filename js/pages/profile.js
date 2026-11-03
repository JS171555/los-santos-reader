(async()=>{
 const ctx=await Shell.init('profile');if(!ctx)return;
 const $=s=>document.querySelector(s),box=$('#box'),sb=App.sb,E=D.esc,p=ctx.profile,lvl=x=>Math.floor(Math.sqrt(x/100))+1;
 const K={pages:'Páginas lidas',completion:'Livro concluído',daily:'Bônus do dia',goal:'Meta diária batida'};
 async function load(){box.innerHTML='<div class="sk" style="height:220px"></div>';
  try{const R=await Promise.all([sb.from('user_xp').select('*').maybeSingle(),sb.rpc('get_ranking',{p_period:'all'}),sb.from('reading_progress').select('seconds_read,status'),sb.rpc('my_activity'),
    sb.from('user_achievements').select('code').order('unlocked_at',{ascending:false}),sb.from('xp_transactions').select('*,books(title)').order('created_at',{ascending:false}).limit(6),sb.from('achievements').select('code,name,icon')]);
   if(R.some(r=>r.error))throw 0;const [x,rk,pr,act,ua,tx,ach]=R,xp=x.data?.total_xp||0,pg=x.data?.pages_read||0,pos=rk.data.find(r=>r.r_me)?.r_pos,
    fin=pr.data.filter(r=>r.status==='finished').length,rd=pr.data.length-fin,secs=pr.data.reduce((a,r)=>a+r.seconds_read,0),max=Math.max(1,...act.data.map(d=>d.pages)),best=act.data.reduce((a,d)=>d.pages>a.pages?d:a,{pages:0}),
    names=new Map(ach.data.map(a=>[a.code,a]));
   box.innerHTML=`<div class="card sect head"><div>${p.avatar_url?`<img class="avbig" alt="Sua foto" src="${D.avatar(p.avatar_url)}">`:`<span class="avbig" aria-hidden="true">${E(p.display_name[0].toUpperCase())}</span>`}</div>
    <div><h1 style="margin:0">${E(p.display_name)}</h1><p class="sub" style="margin:0">Membro desde ${D.fmt(p.created_at.slice(0,10))}</p></div><a class="btn ghost" href="settings.html"><i class="fa-solid fa-gear"></i>Editar perfil</a></div>
   <div class="row sect">${[['Nível',lvl(xp)],['XP total',xp],['Ranking',pos?pos+'º':'—'],['Livros concluídos',fin],['Em andamento',rd],['Páginas lidas',pg]].map(([a,v])=>`<div class="card"><small>${a}</small><strong class="big">${v}</strong></div>`).join('')}</div>
   ${!pos&&!ctx.profile.show_in_ranking?'<p class="sub">Você está fora do ranking (Configurações → Privacidade).</p>':''}
   <div class="card sect"><h3>Estatísticas de leitura</h3><div class="row"><div><small>Tempo ativo total</small><strong>${(secs/3600).toFixed(1)} h</strong></div><div><small>Ritmo médio</small><strong>${pg?Math.round(secs/pg)+' s/página':'—'}</strong></div><div><small>Melhor dia (14 dias)</small><strong>${best.pages?best.pages+' pág.':'—'}</strong></div></div>
   <div class="chart" role="img" aria-label="Páginas validadas por dia nos últimos 14 dias">${act.data.map(d=>`<i style="height:${d.pages/max*100}%" title="${D.fmt(d.day)}: ${d.pages} pág., ${d.minutes} min"></i>`).join('')}</div><div class="chart-l"><span>${D.fmt(act.data[0].day)}</span><span>Hoje</span></div></div>
   <div class="card sect"><h3>Conquistas recentes</h3>${ua.data.length?ua.data.slice(0,4).map(u=>`<div class="item"><div><i class="fa-solid fa-${E(names.get(u.code)?.icon)}" style="color:var(--sand)"></i> <strong>${E(names.get(u.code)?.name)}</strong></div></div>`).join('')+'<p class="alt"><a href="game.html">Ver todas</a></p>':'<p class="sub">Nenhuma ainda. Leia para desbloquear.</p>'}</div>
   <div class="card sect"><h3>Atividade recente</h3>${tx.data.length?tx.data.map(t=>`<div class="item"><div><strong>${K[t.kind]}${t.pages?' · '+t.pages+' pág.':''}</strong><small>${E(t.books?.title||'')} ${new Date(t.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</small></div><b>+${t.xp} XP</b></div>`).join(''):'<p class="sub">Sem atividade ainda.</p>'}</div>`;
   gsap.from('#box > *',{opacity:0,y:14,duration:.4,stagger:.07})}catch{D.err(box,load)}}
 load();
})();
