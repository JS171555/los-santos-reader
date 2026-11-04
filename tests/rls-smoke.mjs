// Teste de integração contra Supabase LOCAL e descartável. Nunca execute em produção.
// Dependência: npm i --no-save @supabase/supabase-js@2.45.4
// Uso: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... USER_EMAIL=... USER_PASSWORD=... TEST_BOOK_ID=... node tests/rls-smoke.mjs
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
const {SUPABASE_URL:U,SUPABASE_ANON_KEY:K,USER_EMAIL:E,USER_PASSWORD:P,TEST_BOOK_ID:B}=process.env;
if(!U||!K||!E||!P||!B){console.error('Defina SUPABASE_URL, SUPABASE_ANON_KEY, USER_EMAIL, USER_PASSWORD e TEST_BOOK_ID.');process.exit(2)}
let host;try{host=new URL(U).hostname}catch{console.error('SUPABASE_URL inválida.');process.exit(2)}
if(!['localhost','127.0.0.1','::1'].includes(host)){console.error('Bloqueado: este teste grava dados e só pode apontar para Supabase local.');process.exit(2)}
const a=createClient(U,K,{auth:{persistSession:false}}),anon=createClient(U,K,{auth:{persistSession:false}});
let fails=0;const check=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)fails++};
const {data:auth,error:loginError}=await a.auth.signInWithPassword({email:E,password:P});
if(loginError||!auth?.user){console.error('Falha no login local:',loginError?.message||'usuário ausente');process.exit(2)}
const uid=auth.user.id,profile=await a.from('profiles').select('role').eq('id',uid).single();
check(!profile.error&&profile.data?.role==='user','conta fixture é usuário comum');
if(!profile.error&&profile.data?.role==='user'){
 await a.from('profiles').update({role:'admin'}).eq('id',uid);const after=await a.from('profiles').select('role').eq('id',uid).single();
 const unchanged=!after.error&&after.data?.role==='user';check(unchanged,'usuário comum não altera o próprio papel');
 if(!unchanged){const recovery=await a.from('profiles').update({role:'user'}).eq('id',uid);if(recovery.error)console.error('ATENÇÃO: não foi possível restaurar o papel da fixture:',recovery.error.message)}
}
const directXp=await a.from('xp_transactions').insert({user_id:uid,kind:'pages',xp:999,pages:99});
check(Boolean(directXp.error),'usuário não insere transações de XP diretamente');
const x=await a.from('user_xp').select('total_xp').maybeSingle(),xpBefore=x.data?.total_xp??0;
await a.from('user_xp').update({total_xp:99999}).eq('user_id',uid);
const xpAfter=await a.from('user_xp').select('total_xp').maybeSingle();
check(!xpAfter.error&&(xpAfter.data?.total_xp??0)===xpBefore,'usuário não altera o próprio XP');
const privateRows=await a.from('reading_progress').select('user_id').neq('user_id',uid);
check(!privateRows.error&&(privateRows.data||[]).length===0,'não vê progresso alheio');
const adminStats=await a.rpc('admin_stats');check(!adminStats.error&&adminStats.data==null,'admin_stats não expõe dados a não-admin');
const anonymousRank=await anon.rpc('get_ranking',{p_period:'all'});check(Boolean(anonymousRank.error),'anônimo não acessa o ranking');
const book=await a.from('books').select('pages').eq('id',B).single();
if(book.error||!Number.isInteger(book.data?.pages)||book.data.pages<1){console.error('TEST_BOOK_ID precisa ser um livro local publicado com books.pages válido.');process.exit(2)}
const before=await a.from('reading_progress').select('credited_pages,seconds_read,total_pages').eq('book_id',B).maybeSingle();
if(before.error){console.error('Falha ao consultar progresso fixture:',before.error.message);process.exit(2)}
const old=before.data||{credited_pages:0,seconds_read:0};
const saved=await a.rpc('save_progress',{p_book:B,p_session:randomUUID(),p_page:book.data.pages,p_total:1,p_seconds:9999});
check(!saved.error,'save_progress aceita progresso usando a contagem canônica');
if(!saved.error){
 const next=await a.from('reading_progress').select('credited_pages,seconds_read,total_pages').eq('book_id',B).single();
 check(!next.error&&next.data.total_pages===book.data.pages,'total_pages vem do catálogo, não do parâmetro do cliente');
 check(!next.error&&next.data.seconds_read-old.seconds_read<=120,'tempo por salvamento limitado a 120 s');
 check(!next.error&&next.data.credited_pages-old.credited_pages<=10,'máximo de 10 páginas creditadas por salvamento');
}
console.log(fails?`${fails} falha(s)`:'tudo certo');process.exit(fails?1:0);
