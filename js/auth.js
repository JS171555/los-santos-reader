const App=window.App={};const C=window.APP_CONFIG;
App.configured=!C.SUPABASE_URL.startsWith('COLE');
App.sb=App.configured?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const ERR={'Invalid login credentials':'E-mail ou senha incorretos.','Email not confirmed':'Confirme seu e-mail antes de entrar.','User already registered':'Este e-mail já está cadastrado.','Password should be at least 6 characters':'A senha precisa ter ao menos 8 caracteres.'};
App.err=e=>ERR[e?.message]||(/rate limit/i.test(e?.message||'')?'Muitas tentativas. Aguarde alguns minutos.':'Algo deu errado. Tente novamente.');
const url=p=>new URL(p,location.href).href;
App.auth={
 signUp:(name,email,password)=>App.sb.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:url('login.html')}}),
 signIn:(email,password)=>App.sb.auth.signInWithPassword({email,password}),
 forgot:email=>App.sb.auth.resetPasswordForEmail(email,{redirectTo:url('reset.html')}),
 setPassword:password=>App.sb.auth.updateUser({password}),
 async session(){return (await App.sb.auth.getSession()).data.session},
 async signOut(){await App.sb.auth.signOut();location.replace('login.html')},
 async requireAuth(){ // proteção de página privada; RLS protege os dados no servidor
  const s=await this.session();if(!s){location.replace('login.html');return null}
  const {data:profile}=await App.sb.from('profiles').select('*').eq('id',s.user.id).single();
  if(!profile||profile.status==='suspended'){await App.sb.auth.signOut();location.replace('login.html?blocked=1');return null}
  return {user:s.user,profile};
 }
};
