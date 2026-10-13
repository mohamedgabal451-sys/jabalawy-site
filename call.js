/* مكالمة صوتية داخل التطبيق (WebRTC مجانية، الإشارات عبر Supabase Realtime على قناة خاصة) */
(function(){
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
let sb=null,oid=null,ch=null,pc=null,ls=null,st='idle',pending=[],timer=null,readyP=null;
const $=id=>document.getElementById(id);
let micOn=true,spkOn=true;
function addStyle(){if($('jcCtrlCss'))return;const st=document.createElement('style');st.id='jcCtrlCss';st.textContent='#jcOv{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(40,30,4,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}#jcOv .jc-box{margin:auto;max-width:300px;width:100%;background:linear-gradient(160deg,#FFD65A 0%,#F5B82E 55%,#E8A000 100%)!important;color:#0F6B47!important;border-radius:28px!important;padding:14px 14px 12px!important;box-shadow:0 24px 60px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.55)!important;border:1px solid rgba(255,255,255,.35)}#jcOv .jc-logo{display:block;height:26px;width:auto;margin:0 auto 8px 0;background:#fff;border-radius:9px;padding:3px 7px;box-sizing:content-box}#jcOv .jc-t{font-size:14px;font-weight:800;letter-spacing:.2px;color:#0F6B47;margin-bottom:6px}#jcOv .jc-b .btn{font-size:12px!important;padding:6px 12px!important;border-radius:99px!important;background:rgba(15,107,71,.12)!important;color:#0F6B47!important;box-shadow:none!important;font-weight:800}#jcOv .jc-b .btn.bad{background:#0F6B47!important;color:#fff!important}#jcOv .jc-b .btn.ok{background:#0F6B47!important;color:#fff!important}#jcOv .jc-tm{background:rgba(15,107,71,.12);color:#0F6B47}#jcOv .jc-tm::before{background:#0F6B47}#jcOv .jc-ic{width:44px;height:44px;background:rgba(15,107,71,.12);color:#0F6B47}#jcOv .jc-ic.off{background:#0F6B47;color:#fff}#jcOv .jc-lbl{color:#0F6B47;font-weight:700}.jc-ctrls{display:flex;justify-content:center;gap:14px;margin:10px 0 2px}.jc-ic{width:58px;height:58px;border-radius:50%;border:0;display:grid;place-items:center;background:rgba(255,255,255,.16);color:#fff;cursor:pointer;padding:0;box-shadow:none}.jc-ic.off{background:#fff;color:#0B5D44}.jc-ic svg{width:18px;height:18px}.jc-lbl{display:block;text-align:center;font-size:11px;color:#dff3ea;margin-top:6px}.jc-tm{display:inline-flex;align-items:center;gap:6px;margin:2px auto 8px;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.14);color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;font-variant-numeric:tabular-nums;direction:ltr}.jc-tm.hide{display:none}.jc-tm::before{content:"";width:8px;height:8px;border-radius:50%;background:#5CE1A0;box-shadow:0 0 0 0 rgba(92,225,160,.7);animation:jcPulse 1.8s ease-out infinite}@keyframes jcPulse{0%{box-shadow:0 0 0 0 rgba(92,225,160,.7)}70%{box-shadow:0 0 0 9px rgba(92,225,160,0)}100%{box-shadow:0 0 0 0 rgba(92,225,160,0)}}@media (prefers-reduced-motion:reduce){.jc-tm::before{animation:none}}';document.head.appendChild(st)}
const IC_MIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const IC_MIC_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3"/></svg>';
const IC_SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const IC_SPK_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';
function setMic(on){micOn=on;if(ls)ls.getAudioTracks().forEach(t=>t.enabled=on);paintCtrls()}
function setSpk(on){spkOn=on;const a=$('jcA');if(a)a.volume=on?1:0.35;paintCtrls()}
function paintCtrls(){const m=document.getElementById('jcMic'),k=document.getElementById('jcSpk');
 if(m){m.innerHTML=micOn?IC_MIC:IC_MIC_OFF;m.classList.toggle('off',!micOn);m.setAttribute('aria-label',micOn?'كتم المايك':'تشغيل المايك');m.nextElementSibling.textContent=micOn?'المايك مفتوح':'المايك مغلق'}
 if(k){k.innerHTML=spkOn?IC_SPK:IC_SPK_OFF;k.classList.toggle('off',!spkOn);k.setAttribute('aria-label',spkOn?'إيقاف مكبر الصوت':'تشغيل مكبر الصوت');k.nextElementSibling.textContent=spkOn?'مكبر الصوت':'صوت خافت'}}
let tmrI=null,tmrT0=0;
function startTimer(){if(tmrI)return;tmrT0=Date.now();const el=$('jcTm');if(!el)return;el.classList.remove('hide');
 const tick=()=>{const s=Math.floor((Date.now()-tmrT0)/1000);el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};tick();tmrI=setInterval(tick,1000)}
function stopTimer(){if(tmrI){clearInterval(tmrI);tmrI=null}const el=$('jcTm');if(el){el.classList.add('hide');el.textContent=''}}
function ctrlRow(b){addStyle();const r=document.createElement('div');r.className='jc-ctrls';
 r.innerHTML='<div><button class="jc-ic" id="jcMic" onclick="JCall.toggleMic()"></button><span class="jc-lbl"></span></div><div><button class="jc-ic" id="jcSpk" onclick="JCall.toggleSpk()"></button><span class="jc-lbl"></span></div>';
 b.appendChild(r);paintCtrls()}
function ov(){if($('jcOv'))return $('jcOv');const d=document.createElement('div');d.id='jcOv';d.className='jc-ov hide';
 d.innerHTML='<div class="jc-box"><img class="jc-logo" src="../customer/logo-header.png" alt="جبلاوى"><div class="jc-t" id="jcT"></div><div class="jc-tm hide" id="jcTm"></div><div class="jc-b" id="jcB"></div><audio id="jcA" autoplay></audio></div>';document.body.appendChild(d);return d}
function show(t,btns){const d=ov();d.classList.remove('hide');$('jcT').textContent=t;const b=$('jcB');b.innerHTML='';
 (btns||[]).forEach(([label,cls,fn])=>{const x=document.createElement('button');x.className='btn '+cls;x.textContent=label;x.onclick=fn;b.appendChild(x)});
 if(st==='connected'){ctrlRow(b);startTimer()}}
function hide(){const d=$('jcOv');if(d)d.classList.add('hide')}
function send(type,extra){if(ch)ch.send({type:'broadcast',event:'signal',payload:Object.assign({type:type},extra||{})})}
let ringT=null,ringAC=null;
function ringCtx(){try{ringAC=ringAC||new(window.AudioContext||window.webkitAudioContext)();if(ringAC.state==='suspended')ringAC.resume();return ringAC}catch(e){return null}}
function glass(c,f,t,dur,v){
 const g=c.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);g.connect(c.destination);
 const o=c.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);o.start(t);o.stop(t+dur+0.05);
 const h=c.createGain();h.gain.setValueAtTime(0.0001,t);h.gain.exponentialRampToValueAtTime(v*0.25,t+0.003);h.gain.exponentialRampToValueAtTime(0.0001,t+Math.min(dur,0.2));h.connect(c.destination);
 const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f*2;o2.connect(h);o2.start(t);o2.stop(t+0.25)}
function beep(){const c=ringCtx();if(!c)return;const t=c.currentTime;glass(c,1567.98,t,0.35,0.5);glass(c,2093,t+0.09,0.5,0.4)}
function vib(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
function ringIncoming(){stopRing();const pat=()=>{const c=ringCtx();if(c){const t=c.currentTime;[1046.5,1318.5,1567.98,2093].forEach((f,i)=>glass(c,f,t+i*0.12,0.5,0.3));glass(c,2093,t+0.6,0.8,0.18);const u=t+2.6;[1046.5,1318.5,1567.98,2093].forEach((f,i)=>glass(c,f,u+i*0.12,0.5,0.3));glass(c,2093,u+0.6,0.8,0.18)}vib([400,200,400])};pat();ringT=setInterval(pat,5400)}
function ringOutgoing(){stopRing();const pat=()=>{const c=ringCtx();if(c){const t=c.currentTime;glass(c,1318.5,t,0.7,0.16);glass(c,1567.98,t+0.35,0.7,0.12)}};pat();ringT=setInterval(pat,3200)}
function stopRing(){if(ringT){clearInterval(ringT);ringT=null}try{navigator.vibrate&&navigator.vibrate(0)}catch(e){}}
function media(){return navigator.mediaDevices.getUserMedia({audio:true,video:false})}
function makePc(){
 pc=new RTCPeerConnection(ICE);
 ls.getTracks().forEach(t=>pc.addTrack(t,ls));
 pc.onicecandidate=e=>{if(e.candidate)send('ice',{cand:e.candidate})};
 pc.ontrack=e=>{const a=$('jcA');if(a)a.srcObject=e.streams[0]};
 pc.onconnectionstatechange=()=>{
  if(!pc)return;
  if(pc.connectionState==='connected')show('متصل',[['إنهاء المكالمة','bad',hangup]]);
  if(pc.connectionState==='failed')cleanup('تعذّر الاتصال على هذه الشبكة، حاول مرة أخرى');
 };
}
async function flush(){const list=pending;pending=[];for(const c of list){try{await pc.addIceCandidate(c)}catch(e){}}}
function cleanup(msg){stopRing();stopTimer();micOn=true;spkOn=true;const aa=$('jcA');if(aa)aa.volume=1;
 clearTimeout(timer);
 if(pc){try{pc.close()}catch(e){}}
 if(ls){ls.getTracks().forEach(t=>t.stop())}
 pc=null;ls=null;st='idle';pending=[];
 if(msg)show(msg,[['حسناً','',hide]]);else hide();
}
async function onSig(m){
 const p=(m&&m.payload)||m||{};
 try{
 switch(p.type){
  case 'ring':
   if(st!=='idle'){send('decline',{busy:1});return}
   st='ringing';ringIncoming();
   show('مكالمة واردة',[['ردّ','ok',accept],['رفض','bad',decline]]);
   timer=setTimeout(()=>{if(st==='ringing'){send('decline');cleanup('')}},30000);
   break;
  case 'accept':
   if(st==='calling'&&pc){clearTimeout(timer);stopRing();st='connected';
    const o=await pc.createOffer();await pc.setLocalDescription(o);send('offer',{sdp:o});
    show('جارٍ الاتصال...',[['إنهاء','bad',hangup]]);}
   break;
  case 'offer':
   if(st==='connected'&&pc){await pc.setRemoteDescription(p.sdp);await flush();
    const a=await pc.createAnswer();await pc.setLocalDescription(a);send('answer',{sdp:a});}
   break;
  case 'answer':
   if(pc&&st==='connected'){await pc.setRemoteDescription(p.sdp);await flush();}
   break;
  case 'ice':
   if(!p.cand)break;
   if(pc&&pc.remoteDescription)await pc.addIceCandidate(p.cand).catch(()=>{});else pending.push(p.cand);
   break;
  case 'decline':
   if(st==='calling')cleanup(p.busy?'الطرف الآخر مشغول حالياً':'تم رفض المكالمة');
   break;
  case 'hangup':
   if(st!=='idle')cleanup('انتهت المكالمة');
   break;
 }}catch(e){cleanup('حدث خطأ في المكالمة')}
}
async function start(){
 if(!sb||!oid||!ch||!readyP){alert('الاتصال غير متاح الآن، حاول بعد لحظات');return}
 if(st!=='idle')return;
 const ok=await Promise.race([readyP,new Promise(r=>setTimeout(()=>r(false),6000))]);
 if(!ok){alert('تعذّر الاتصال بقناة المكالمة، أعد تحميل الصفحة وحاول مرة أخرى');return}
 try{ls=await media()}catch(e){alert('يرجى السماح باستخدام الميكروفون من إعدادات المتصفح');return}
 st='calling';makePc();send('ring');ringOutgoing();
 show('جارٍ الاتصال...',[['إلغاء','bad',hangup]]);
 timer=setTimeout(()=>{if(st==='calling'){send('hangup');cleanup('لم يتم الرد')}},30000);
}
async function accept(){
 clearTimeout(timer);stopRing();
 try{ls=await media()}catch(e){decline();alert('يرجى السماح باستخدام الميكروفون');return}
 st='connected';makePc();send('accept');
 show('جارٍ الاتصال...',[['إنهاء','bad',hangup]]);
}
function decline(){send('decline');cleanup('')}
function hangup(){if(st!=='idle')send('hangup');cleanup('')}
async function attach(client,id){
 if(!client||!id)return;
 if(oid===id&&ch)return;
 if(oid===id)return;
 if(ch){try{ch.unsubscribe()}catch(e){}ch=null}
 sb=client;oid=id;
 const r=await sb.rpc('call_channel_token',{p_order:id});
 if(oid!==id)return;
 if(r.error||!r.data){oid=null;return}
 ch=sb.channel('call:'+id+':'+r.data,{config:{broadcast:{self:false}}});
 readyP=new Promise(res=>{ch.on('broadcast',{event:'signal'},onSig).subscribe(s=>{if(s==='SUBSCRIBED')res(true);if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){console.warn('call channel',s);res(false)}})});
}
window.JCall={attach:attach,start:start,hangup:hangup,toggleMic:function(){setMic(!micOn)},toggleSpk:function(){setSpk(!spkOn)}};
})();
