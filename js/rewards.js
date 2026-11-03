window.Rewards={last:null,
 async check(){const sb=App.sb;if(!sb)return;
  const [x,n]=await Promise.all([sb.from('user_xp').select('total_xp').maybeSingle(),sb.from('notifications').select('*').eq('read',false).order('id')]);
  const t=x.data?.total_xp??0;if(Rewards.last!==null&&t>Rewards.last&&Rewards.prefs?.notify_xp!==false)Rewards.pop('+'+(t-Rewards.last)+' XP');Rewards.last=t;
  const L=n.data||[],show=L.filter(m=>Rewards.prefs?.notify_achievements!==false);show.forEach((m,i)=>setTimeout(()=>UI.toast(m.title+(m.body?' · '+m.body:''),'success'),i*600));
  if(L.length)await sb.from('notifications').update({read:true}).in('id',L.map(m=>m.id))},
 pop(txt){const e=document.createElement('div');e.className='xp-pop';e.textContent=txt;document.body.append(e);
  gsap.fromTo(e,{xPercent:-50,y:0,opacity:0,scale:.7},{opacity:1,y:-60,scale:1,duration:.5,ease:'back.out(2)',onComplete:()=>gsap.to(e,{opacity:0,y:-100,duration:.6,delay:.8,onComplete:()=>e.remove()})})}};
