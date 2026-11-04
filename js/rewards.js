window.Rewards={last:null,busy:null,userId:null,lastNotificationId:null,initialized:false,prefs:null,
 // A linha de base é por sessão/conta: carregar a página nunca conta como ganho de XP.
 async init(userId,prefs){
  if(!userId)return;
  if(this.userId===userId&&this.initialized){this.prefs=prefs||this.prefs;return}
  this.userId=userId;this.prefs=prefs||null;this.initialized=false;this.last=null;this.lastNotificationId=null;
  const sb=App.sb;if(!sb)return;
  const [x,n]=await Promise.all([
   sb.from('user_xp').select('total_xp').maybeSingle(),
   sb.from('notifications').select('id').eq('read',false).order('id',{ascending:false}).limit(1)
  ]);
  if(x.error||n.error)return;
  this.last=x.data?.total_xp??0;this.lastNotificationId=n.data?.[0]?.id??0;this.initialized=true;
 },
 check(){if(this.busy)return this.busy;this.busy=this._check().catch(()=>{}).finally(()=>{this.busy=null});return this.busy},
 async _check(){
  const sb=App.sb;if(!sb||!this.initialized||!this.userId)return;
  const [x,n]=await Promise.all([
   sb.from('user_xp').select('total_xp').maybeSingle(),
   sb.from('notifications').select('*').eq('read',false).order('id')
  ]);
  if(x.error||n.error)return;
  const total=x.data?.total_xp??0;
  if(total>this.last&&this.prefs?.notify_xp!==false)this.pop('+'+(total-this.last)+' XP');
  this.last=total;
  const fresh=(n.data||[]).filter(m=>Number(m.id)>Number(this.lastNotificationId));
  if(fresh.length){
   const show=this.prefs?.notify_achievements!==false?fresh:[];
   show.forEach((m,i)=>setTimeout(()=>UI.toast(m.title+(m.body?' · '+m.body:''),'success'),i*600));
   await sb.from('notifications').update({read:true}).in('id',fresh.map(m=>m.id));
   this.lastNotificationId=Math.max(this.lastNotificationId,...fresh.map(m=>Number(m.id)));
  }
 },
 pop(txt){const e=document.createElement('div');e.className='xp-pop';e.setAttribute('role','status');e.textContent=txt;document.body.append(e);
  if(!window.gsap){setTimeout(()=>e.remove(),1800);return}
  gsap.fromTo(e,{xPercent:-50,y:0,opacity:0,scale:.7},{opacity:1,y:-60,scale:1,duration:.5,ease:'back.out(2)',onComplete:()=>gsap.to(e,{opacity:0,y:-100,duration:.6,delay:.8,onComplete:()=>e.remove()})})}};
