(async()=>{
 const $=s=>document.querySelector(s);
 if(!App.configured){UI.toast('Configure js/config.js com a URL e a chave anon do Supabase.','error');return}
 const oauthParams=new URLSearchParams(location.hash.slice(1));
 const oauthError=oauthParams.get('error_description')||new URLSearchParams(location.search).get('error_description');
 if(oauthError){history.replaceState(null,'',location.pathname);UI.toast(oauthError.replace(/\+/g,' '),'error')}
 if(await App.auth.session())return location.replace('app.html');
 if(location.search.includes('blocked'))UI.toast('Conta indisponível. Fale com o administrador.','error');
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>UI.show(b.dataset.go));
 document.querySelectorAll('[data-google-signin]').forEach(b=>b.addEventListener('click',async()=>{
  UI.busy(b,true);try{const {error}=await App.auth.signInWithGoogle();if(error)throw error}
  catch(e){UI.toast(App.err(e),'error');UI.busy(b,false)}
 }));
 const run=(form,fn)=>form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type=submit]');UI.busy(b,true);
  try{await fn(Object.fromEntries(new FormData(form)))}catch(x){UI.toast(App.err(x),'error')}UI.busy(b,false)});
 run($('#f-login'),async d=>{const {error}=await App.auth.signIn(d.email,d.password);if(error)throw error;location.replace('app.html')});
 run($('#f-register'),async d=>{
  if(d.password.length<8)return UI.toast('A senha precisa ter ao menos 8 caracteres.','error');
  if(d.password!==d.confirm)return UI.toast('As senhas não coincidem.','error');
  const {data,error}=await App.auth.signUp(d.name.trim(),d.email,d.password);if(error)throw error;
  if(data.session)return location.replace('app.html');
  UI.toast('Conta criada. Confirme seu e-mail para entrar.','success');UI.show('login')});
 run($('#f-forgot'),async d=>{const {error}=await App.auth.forgot(d.email);if(error)throw error;
  UI.toast('Se o e-mail existir, enviamos o link de redefinição.','success');UI.show('login')});
})();
