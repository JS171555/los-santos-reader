window.Rewards={last:null,busy:null,
 // Guarda o último XP visto entre páginas (sessionStorage pode falhar no Safari privado do iPhone)
 _get(){try{const v=sessionStorage.getItem('lsr-xp');return v===null?null:+v}catch{return null}},
 _set(v){try{sessionStorage.setItem('lsr-xp',String(v))}catch{}},
 check(){if(Rewards.busy)return Rewards.busy;Rewards.busy=Rewards._check().catch(()=>{}).finally(()=>{Rewards.busy=null});return Rewards.busy},
 async _check(){const sb=App.sb;if(!sb)return;if(Rewards.last===null)Rewards.last=Rewards._get();
  const [x,n]=await Promise.all([sb.from('user_xp').select('total_xp').maybeSingle(),sb.from('notifications').select('*').eq('read',false).order('id')]);
  if(x.error)return;const t=x.data?.total_xp??0;if(Rewards.last!==null&&t>Rewards.last&&Rewards.prefs?.notify_xp!==false)Rewards.pop('+'+(t-Rewards.last)+' XP');Rewards.last=t;Rewards._set(t);
  const L=n.data||[],show=Rewards.prefs?.notify_achievements!==false?L:[];show.forEach((m,i)=>setTimeout(()=>UI.toast(m.title+(m.body?' · '+m.body:''),'success'),i*600));
  if(L.length)await sb.from('notifications').update({read:true}).in('id',L.map(m=>m.id))},
 pop(txt){const e=document.createElement('div');e.className='xp-pop';e.setAttribute('role','status');e.textContent=txt;document.body.append(e);
  if(!window.gsap){setTimeout(()=>e.remove(),1800);return}
  gsap.fromTo(e,{xPercent:-50,y:0,opacity:0,scale:.7},{opacity:1,y:-60,scale:1,duration:.5,ease:'back.out(2)',onComplete:()=>gsap.to(e,{opacity:0,y:-100,duration:.6,delay:.8,onComplete:()=>e.remove()})})}};
