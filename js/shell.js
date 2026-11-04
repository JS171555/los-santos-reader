window.Shell={async init(active){
 if(!App.configured)return location.replace('login.html');
 const r=await App.auth.requireAuth();if(!r)return null;
 const n=(k,h,i,t)=>`<a class="nav ${active===k?'on':''}" ${active===k?'aria-current="page"':''} href="${h}"><i class="fa-solid fa-${i}"></i>${t}</a>`;
 document.getElementById('side').innerHTML=`<div class="logo">Los Santos Reader</div>${n('home','app.html','house','Início')}${n('game','game.html','trophy','Conquistas')}${n('profile','profile.html','user','Perfil')}${r.profile.role==='admin'?n('admin','admin.html','screwdriver-wrench','Admin'):''}<button class="nav out" id="out"><i class="fa-solid fa-right-from-bracket"></i>Sair</button>`;
 document.getElementById('out').onclick=()=>App.auth.signOut();if(window.Rewards){await Rewards.init(r.user.id,r.profile);Rewards.check()}const m=document.querySelector('main');if(m){m.id='main';const a=document.createElement('a');a.className='skip';a.href='#main';a.textContent='Pular para o conteúdo';document.body.prepend(a)}return r}};
