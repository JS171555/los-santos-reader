(async()=>{
 const f=document.getElementById('f-reset');
 if(!App.configured)return UI.toast('Configure js/config.js.','error');
 await new Promise(r=>setTimeout(r,600)); // aguarda o Supabase processar o link
 if(!await App.auth.session()){f.hidden=true;document.getElementById('bad').hidden=false;return}
 f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button'),d=Object.fromEntries(new FormData(f));
  if(d.password.length<8)return UI.toast('A senha precisa ter ao menos 8 caracteres.','error');
  if(d.password!==d.confirm)return UI.toast('As senhas não coincidem.','error');
  UI.busy(b,true);const {error}=await App.auth.setPassword(d.password);
  if(error){UI.busy(b,false);return UI.toast(App.err(error),'error')}
  UI.toast('Senha atualizada.','success');setTimeout(()=>location.replace('app.html'),900)});
})();
