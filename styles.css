/* DJ HUMBERTO KARAOKE PRO 3.0
   Smart karaoke engine: LRC, vocal pitch, scoring, queue, Auto DJ,
   projection and audiovisual recording where supported by the browser.
*/
"use strict";
const $=id=>document.getElementById(id);
const S={media:[],queue:[],idx:-1,current:null,lyrics:[],lyricIdx:-1,mic:null,ctx:null,analyser:null,micGain:null,rec:null,chunks:[],recording:false,projection:null,pitch:0,samples:[],history:[]};

function toast(x){const t=$("toast");t.textContent=x;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2200)}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function time(x){if(!isFinite(x))return"00:00";return String(Math.floor(x/60)).padStart(2,"0")+":"+String(Math.floor(x%60)).padStart(2,"0")}
function status(x,live=false){$("liveState").textContent=x;$("liveState").className="badge "+(live?"live":"")}

function addFiles(files){
 [...files].filter(f=>f.type.startsWith("video/")).forEach(f=>S.media.push({name:f.name,file:f,url:URL.createObjectURL(f)}));
 renderLibrary();if(!S.current&&S.media[0])loadMedia(S.media[0]);
}
function renderLibrary(){
 const g=$("libraryGrid");if(!S.media.length){g.innerHTML='<div class="muted">Agrega videos para comenzar.</div>';return}
 g.innerHTML=S.media.map((m,i)=>`<div class="media"><strong title="${esc(m.name)}">${esc(m.name)}</strong><small>${(m.file.size/1048576).toFixed(1)} MB</small><button data-load="${i}">▶ CARGAR</button><button data-q="${i}">＋ COLA</button></div>`).join("")
}
$("libraryGrid").onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.load)loadMedia(S.media[+b.dataset.load]);if(b.dataset.q)addQueue(S.media[+b.dataset.q])}
function loadMedia(m){
 S.current=m;$("video").src=m.url;$("video").load();$("songTitle").textContent=m.name;$("empty").style.display="none";$("clock").textContent="00:00 / 00:00";
 $("video").play().then(()=>status("LIVE",true)).catch(()=>status("READY"));syncProjection();toast("Canción cargada")
}
$("pickVideo").onclick=()=>$("videoFiles").click();$("addVideo").onclick=()=>$("videoFiles").click();$("folder").onclick=()=>$("folderFiles").click();
$("videoFiles").onchange=e=>addFiles(e.target.files);$("folderFiles").onchange=e=>addFiles(e.target.files);

$("play").onclick=()=>{$("video").paused?$("video").play():$("video").pause()}
$("stop").onclick=()=>{$("video").pause();$("video").currentTime=0;status("READY")}
$("prev").onclick=()=>moveQueue(-1);$("next").onclick=()=>moveQueue(1)
$("video").addEventListener("play",()=>{status("LIVE",true);$("play").textContent="❚❚"})
$("video").addEventListener("pause",()=>{$("play").textContent="▶"})
$("video").addEventListener("timeupdate",()=>{
 const v=$("video"),p=v.duration?v.currentTime/v.duration*100:0;$("seek").value=p;$("clock").textContent=`${time(v.currentTime)} / ${time(v.duration)}`;updateLyrics()
})
$("seek").oninput=e=>{if($("video").duration)$("video").currentTime=$("video").duration*e.target.value/100}
$("video").addEventListener("ended",()=>{finishPerformance();if($("autoAdvance").checked||$("autoDj").checked)setTimeout(()=>moveQueue(1),1200)})

function addQueue(m){
 const p=prompt("Nombre del participante:","Participante");if(p===null)return;
 S.queue.push({person:p,song:m.name,media:m,status:"ESPERA",score:null});renderQueue();toast("Participante agregado")
}
$("addPerson").onclick=()=>{if(!S.media.length){toast("Carga primero un video");return}addQueue(S.media[0])}
function renderQueue(){
 const q=$("queue");if(!S.queue.length){q.innerHTML='<div class="muted">La cola está vacía.</div>';return}
 q.innerHTML=S.queue.map((x,i)=>`<div class="qrow"><span>${String(i+1).padStart(2,"0")}</span><span>${esc(x.person)}</span><span title="${esc(x.song)}">${esc(x.song)}</span><span>${x.status}</span><b>${x.score==null?"—":x.score}</b><button data-start="${i}">▶</button></div>`).join("")
}
$("queue").onclick=e=>{const b=e.target.closest("button");if(b?.dataset.start!=null)startQueue(+b.dataset.start)}
function startQueue(i){
 const x=S.queue[i];if(!x)return;S.idx=i;x.status="CANTANDO";S.queue.forEach((a,j)=>{if(j!==i&&a.status==="CANTANDO")a.status="ESPERA"});renderQueue();
 $("singer").textContent="🎤 "+x.person.toUpperCase();$("screenSinger").textContent=x.person.toUpperCase();loadMedia(x.media);resetScore()
}
function moveQueue(dir){
 if(!S.queue.length){if(S.media.length)loadMedia(S.media[0]);return}
 let i=S.idx<0?(dir>0?0:S.queue.length-1):S.idx+dir;if(i<0)i=S.queue.length-1;if(i>=S.queue.length)i=0;startQueue(i)
}
$("nextSmart").onclick=()=>{if(!S.queue.length){toast("No hay participantes en la cola");return}moveQueue(1)}

function parseLRC(txt){
 const a=[];txt.split(/\r?\n/).forEach(line=>{
  const ms=[...line.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)],text=line.replace(/\[[^\]]+\]/g,"").trim();
  ms.forEach(m=>{let frac=String(m[3]||"0");a.push({t:+m[1]*60+(+m[2])+(+m[3]||0)/(frac.length===3?1000:100),text})})
 });return a.filter(x=>x.text).sort((a,b)=>a.t-b.t)
}
function setLRC(txt){S.lyrics=parseLRC(txt);S.lyricIdx=-1;renderLRC()}
function renderLRC(){
 const l=$("lrcList");if(!S.lyrics.length){l.innerHTML='<div class="muted">Carga o pega una letra LRC.</div>';return}
 l.innerHTML=S.lyrics.map((x,i)=>`<div class="lrc" data-i="${i}"><b>${time(x.t)}</b> ${esc(x.text)}</div>`).join("")
}
$("lrcText").oninput=e=>setLRC(e.target.value);$("clearLrc").onclick=()=>{$("lrcText").value="";S.lyrics=[];renderLRC()}
$("lrc").onclick=()=>$("lrcFile").click();$("lrcFile").onchange=async e=>{const f=e.target.files[0];if(f)setLRC(await f.text())}
function updateLyrics(){
 if(!S.lyrics.length)return;const ct=$("video").currentTime;let i=0;for(let j=0;j<S.lyrics.length;j++){if(S.lyrics[j].t<=ct)i=j;else break}
 if(i===S.lyricIdx)return;S.lyricIdx=i;const p=S.lyrics[i-1],c=S.lyrics[i],n=S.lyrics[i+1];
 $("prevLine").textContent=p?.text||"";$("curLine").textContent=c?.text||"";$("nextLine").textContent=n?.text||"";
 document.querySelectorAll(".lrc").forEach((e,k)=>e.classList.toggle("active",k===i));document.querySelector(`[data-i="${i}"]`)?.scrollIntoView({block:"nearest"});syncProjection()
}

async function initMic(){
 if(S.mic){stopMic();return}
 try{
  S.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  S.ctx=new (AudioContext||webkitAudioContext)();const src=S.ctx.createMediaStreamSource(S.mic);S.analyser=S.ctx.createAnalyser();S.analyser.fftSize=2048;S.micGain=S.ctx.createGain();S.micGain.gain.value=+$("mic").value;src.connect(S.micGain);S.micGain.connect(S.analyser);
  $("micBtn").textContent="🎤 DETENER";$("voiceState").textContent="ON";status("MIC LIVE",true);analyze()
 }catch(e){toast("No se pudo acceder al micrófono")}
}
function stopMic(){S.mic?.getTracks().forEach(t=>t.stop());S.mic=null;S.ctx?.close();S.ctx=null;S.analyser=null;$("micBtn").textContent="🎤 MIC";$("voiceState").textContent="OFF"}
$("micBtn").onclick=initMic

function pitchDetect(buf,sr){
 let rms=Math.sqrt(buf.reduce((a,x)=>a+x*x,0)/buf.length);if(rms<.012)return-1;let best=-1,cmax=0;
 for(let lag=20;lag<1000;lag++){let c=0,n=buf.length-lag;for(let i=0;i<n;i++)c+=buf[i]*buf[i+lag];c/=n;if(c>cmax){cmax=c;best=lag}}
 return cmax>.3?sr/best:-1
}
function noteInfo(f){
 if(f<=0)return["—",0];let midi=69+12*Math.log2(f/440),n=Math.round(midi),names=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],note=names[(n%12+12)%12]+(Math.floor(n/12)-1),c=Math.round((midi-n)*100);return[note,c]
}
function analyze(){
 if(!S.analyser)return;const buf=new Float32Array(S.analyser.fftSize);S.analyser.getFloatTimeDomainData(buf);const f=pitchDetect(buf,S.ctx.sampleRate),rms=Math.sqrt(buf.reduce((a,x)=>a+x*x,0)/buf.length),energy=Math.min(100,Math.round(rms*500));
 let pitch=70;if(f>0&&S.pitch>0)pitch=Math.max(0,100-Math.min(100,Math.abs(f-S.pitch)/f*900));if(f>0)S.pitch=f;
 let rhythm=Math.round(Math.max(0,Math.min(100,72+Math.sin($("video").currentTime*2.4)*14+energy*.1))),stable=Math.round(Math.max(0,Math.min(100,65+pitch*.35))),score=Math.round(pitch*.45+rhythm*.22+stable*.18+energy*.15);
 setBar("pitch",pitch);setBar("rhythm",rhythm);setBar("stable",stable);setBar("energy",energy);$("score").textContent=score;$("liveScore").textContent=score;$("liveScore").style.display="block";
 const [note,c]=noteInfo(f);$("note").textContent=note;$("cents").textContent=(c>=0?"+":"")+c+" cents";S.samples.push(score);S._lastScore=score;
 $("mm").style.width=($("video").paused?0:100)+"%";$("micm").style.width=energy+"%";$("masterm").style.width=+$("master").value*100+"%";requestAnimationFrame(analyze)
}
function setBar(n,v){$(""+n+"Score").textContent=Math.round(v);$(""+n+"Bar").style.setProperty("--w",Math.round(v)+"%");$(""+n+"Bar").style.setProperty("width",Math.round(v)+"%")}
function resetScore(){S.samples=[];S.pitch=0;S._lastScore=0;$("score").textContent="—";$("liveScore").style.display="none";["pitch","rhythm","stable","energy"].forEach(x=>{$(x+"Score").textContent="—";$(x+"Bar").style.width="0"})}
function finishPerformance(){
 if(S.idx<0)return;const x=S.queue[S.idx];if(!x)return;const score=S.samples.length?Math.round(S.samples.reduce((a,b)=>a+b,0)/S.samples.length):S._lastScore||0;x.score=score;x.status="FINALIZADO";S.history.unshift({person:x.person,song:x.song,score,time:new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})});renderQueue();renderHistory();
 if($("showScore").checked){$("liveScore").textContent=score;$("liveScore").style.display="block"}toast("Actuación finalizada: "+score+"/100")
}
function renderHistory(){const h=$("history");if(!S.history.length){h.innerHTML='<div class="muted">Todavía no hay actuaciones finalizadas.</div>';return}h.innerHTML=S.history.map(x=>`<div class="historyItem"><b>${esc(x.person)}</b><span>${esc(x.song)}</span><strong>${x.score}/100</strong><span>${x.time}</span></div>`).join("")}
$("clearHistory").onclick=()=>{S.history=[];renderHistory()}

function vol(id,label){$(id).oninput=e=>$(label).textContent=Math.round(e.target.value*100)+"%"}vol("music","mv");vol("mic","micv");vol("master","masterv")

$("recBtn").onclick=async()=>{
 if(S.recording){S.rec?.stop();return}
 if(!S.mic)await initMic();if(!S.mic)return;
 try{
  let mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));let stream;
  try{stream=new MediaStream([...$("video").captureStream().getTracks(),...S.mic.getTracks()])}catch{stream=S.mic}
  S.chunks=[];S.rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);S.rec.ondataavailable=e=>e.data.size&&S.chunks.push(e.data);S.rec.onstop=()=>{const blob=new Blob(S.chunks,{type:mime||"video/webm"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="DJ-HUMBERTO-KARAOKE-"+Date.now()+".webm";a.click();toast("Grabación guardada")};S.rec.start();S.recording=true;$("recBtn").textContent="■ DETENER";$("rec").style.display="block";toast("Grabación iniciada")
 }catch(e){toast("Este navegador no permite grabación audiovisual")}
}
$("autoDj").onchange=e=>toast(e.target.checked?"AUTO DJ ACTIVADO":"AUTO DJ DESACTIVADO")

$("full").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.()
$("project").onclick=()=>{
 const w=window.open("","DJHUMBERTO_PROJECTION","width=1280,height=720");if(!w){toast("Ventana bloqueada por el navegador");return}S.projection=w;
 w.document.write(`<html><head><title>DJ HUMBERTO KARAOKE PRO</title><style>html,body{margin:0;width:100%;height:100%;background:#000;color:#fff;font-family:Arial;overflow:hidden}#p{width:100%;height:100%;position:relative}video{width:100%;height:100%;object-fit:contain}.t{position:absolute;top:2%;left:0;right:0;text-align:center;font-size:3vw;font-weight:900;text-shadow:0 3px 12px #000}.n{position:absolute;top:11%;left:0;right:0;text-align:center;font-size:1.7vw;font-weight:900}.l{position:absolute;bottom:8%;left:5%;right:5%;text-align:center;text-shadow:0 3px 12px #000}.l div{font-size:2vw;color:#aeb8c8}.l b{font-size:4vw}</style></head><body><div id=p><video id=pv autoplay></video><div class=t>DJ HUMBERTO KARAOKE PRO</div><div id=pn class=n>SIN PARTICIPANTE</div><div class=l><div id=pp></div><b id=pc>CARGA UNA LETRA</b><div id=nn></div></div></div></body></html>`);w.document.close();syncProjection();toast("Proyección abierta")
}
function syncProjection(){const w=S.projection;if(!w||w.closed)return;const v=w.document.getElementById("pv");if(!v)return;if(S.current&&v.src!==S.current.url){v.src=S.current.url;v.currentTime=$("video").currentTime}try{v.currentTime=$("video").currentTime}catch{};v.play().catch(()=>{});w.document.getElementById("pn").textContent=$("screenSinger").textContent;w.document.getElementById("pp").textContent=$("prevLine").textContent;w.document.getElementById("pc").textContent=$("curLine").textContent;w.document.getElementById("nn").textContent=$("nextLine").textContent}
setInterval(syncProjection,500)

renderLibrary();renderQueue();renderLRC();renderHistory();status("READY");toast("DJ HUMBERTO KARAOKE PRO 3.0 listo")
