(async()=>{
 const $=s=>document.querySelector(s);
 $('#out').onclick=()=>App.auth.signOut();$('#out2').onclick=()=>App.auth.signOut();
 if(!App.configured)return location.replace('login.html');
 const r=await App.auth.requireAuth();if(!r)return;
 const {user,profile:p}=r,fmt=d=>new Date(d).toLocaleDateString('pt-BR');
 $('#skel').hidden=true;$('#content').hidden=false;
 $('#hello').textContent='Olá, '+p.display_name;
 $('#email').textContent=user.email;$('#since').textContent=fmt(p.created_at);
 $('#role').textContent=p.role==='admin'?'Administrador':'Leitor';
 gsap.from('#content > *',{opacity:0,y:14,duration:.45,stagger:.08});
})();
