const App=window.App={};const C=window.APP_CONFIG;
App.configured=!C.SUPABASE_URL.startsWith('COLE');
App.uuid=()=>{if(window.crypto?.randomUUID)return window.crypto.randomUUID();const b=new Uint8Array(16);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(b);else for(let i=0;i<b.length;i++)b[i]=Math.random()*256|0;b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return [...b].map((x,i)=>`${[4,6,8,10].includes(i)?'-':''}${x.toString(16).padStart(2,'0')}`).join('')};
App.sb=App.configured?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const ERR={'Invalid login credentials':'E-mail ou senha incorretos.','Email not confirmed':'Confirme seu e-mail antes de entrar.','User already registered':'Este e-mail já está cadastrado.','Password should be at least 6 characters':'A senha precisa ter ao menos 6 caracteres.','Provider not enabled':'O login com Google ainda não está habilitado no Supabase.','Unsupported provider':'O login com Google não está disponível.','OAuth error':'Não foi possível autenticar com Google.'};
App.err=e=>ERR[e?.message]||(/rate limit/i.test(e?.message||'')?'Muitas tentativas. Aguarde alguns minutos.':'Algo deu errado. Tente novamente.');
const url=p=>new URL(p,location.href).href;
App.auth={
 signUp:(name,email,password)=>App.sb.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:url('login.html')}}),
 signIn:(email,password)=>App.sb.auth.signInWithPassword({email,password}),
 signInWithGoogle:()=>App.sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:url('login.html'),queryParams:{prompt:'select_account'}}}),
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
