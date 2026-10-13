/* مكالمة صوتية داخل التطبيق (WebRTC مجانية، الإشارات عبر Supabase Realtime على قناة خاصة) */
(function(){
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
let sb=null,oid=null,ch=null,pc=null,ls=null,st='idle',pending=[],timer=null;
const $=id=>document.getElementById(id);
function ov(){if($('jcOv'))return $('jcOv');const d=document.createElement('div');d.id='jcOv';d.className='jc-ov hide';
 d.innerHTML='<div class="jc-box"><div class="jc-t" id="jcT"></div><div class="jc-b" id="jcB"></div><audio id="jcA" autoplay></audio></div>';document.body.appendChild(d);return d}
function show(t,btns){const d=ov();d.classList.remove('hide');$('jcT').textContent=t;const b=$('jcB');b.innerHTML='';
 (btns||[]).forEach(([label,cls,fn])=>{const x=document.createElement('button');x.className='btn '+cls;x.textContent=label;x.onclick=fn;b.appendChild(x)})}
function hide(){const d=$('jcOv');if(d)d.classList.add('hide')}
function send(type,extra){if(ch)ch.send({type:'broadcast',event:'signal',payload:Object.assign({type:type},extra||{})})}
function beep(){try{const c=new (window.AudioContext||window.webkitAudioContext)();const o=c.createOscillator();o.frequency.value=880;o.connect(c.destination);o.start();setTimeout(()=>{o.stop();c.close()},500)}catch(e){}}
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
function cleanup(msg){
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
   st='ringing';beep();
   show('مكالمة واردة',[['ردّ','ok',accept],['رفض','bad',decline]]);
   timer=setTimeout(()=>{if(st==='ringing'){send('decline');cleanup('')}},30000);
   break;
  case 'accept':
   if(st==='calling'&&pc){clearTimeout(timer);st='connected';
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
 if(!sb||!oid||!ch){alert('الاتصال غير متاح الآن، حاول بعد لحظات');return}
 if(st!=='idle')return;
 try{ls=await media()}catch(e){alert('يرجى السماح باستخدام الميكروفون من إعدادات المتصفح');return}
 st='calling';makePc();send('ring');
 show('جارٍ الاتصال...',[['إلغاء','bad',hangup]]);
 timer=setTimeout(()=>{if(st==='calling'){send('hangup');cleanup('لم يتم الرد')}},30000);
}
async function accept(){
 clearTimeout(timer);
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
 ch.on('broadcast',{event:'signal'},onSig).subscribe(s=>{if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')console.warn('call channel',s)});
}
window.JCall={attach:attach,start:start,hangup:hangup};
})();
