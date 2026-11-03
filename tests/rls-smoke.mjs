// Teste de integração (RLS/XP). Uso: npm i @supabase/supabase-js && SUPABASE_URL=... SUPABASE_ANON_KEY=... USER_EMAIL=... USER_PASSWORD=... [BOOK_ID=<livro publicado>] node tests/rls-smoke.mjs
// Use uma conta COMUM (não admin) já confirmada.
import {createClient} from '@supabase/supabase-js';
const {SUPABASE_URL:U,SUPABASE_ANON_KEY:K,USER_EMAIL:E,USER_PASSWORD:P,BOOK_ID:B}=process.env,mk=()=>createClient(U,K,{auth:{persistSession:false}});
let fails=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)fails++};
const a=mk(),anon=mk(),{data:s,error:e}=await a.auth.signInWithPassword({email:E,password:P});if(e)throw e;const uid=s.user.id;
await a.from('profiles').update({role:'admin'}).eq('id',uid);
ok((await a.from('profiles').select('role').eq('id',uid).single()).data.role==='user','usuário comum não vira admin');
ok(!!(await a.from('xp_transactions').insert({user_id:uid,kind:'pages',xp:999,pages:99})).error,'não insere XP direto');
const xp=async()=>(await a.from('user_xp').select('total_xp').maybeSingle()).data?.total_xp??0,x0=await xp();
await a.from('user_xp').update({total_xp:99999}).eq('user_id',uid);ok(await xp()===x0,'não altera o próprio XP');
ok(((await a.from('reading_progress').select('user_id').neq('user_id',uid)).data||[]).length===0,'não vê progresso alheio');
ok((await a.rpc('admin_stats')).data==null,'admin_stats vazio para não-admin');
ok(!!(await anon.rpc('get_ranking',{p_period:'all'})).error,'anônimo não acessa o ranking');
if(B){const g=async()=>(await a.from('reading_progress').select('credited_pages,seconds_read').eq('book_id',B).maybeSingle()).data||{credited_pages:0,seconds_read:0},p0=await g();
 await a.rpc('save_progress',{p_book:B,p_session:crypto.randomUUID(),p_page:90,p_total:100,p_seconds:9999});const p1=await g();
 ok(p1.seconds_read-p0.seconds_read<=120,'tempo por salvamento limitado a 120 s');ok(p1.credited_pages-p0.credited_pages<=10,'máx. 10 páginas creditadas por salvamento')}
console.log(fails?`${fails} falha(s)`:'tudo certo');process.exit(fails?1:0);
