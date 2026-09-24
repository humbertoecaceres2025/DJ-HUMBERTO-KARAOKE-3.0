"use strict";

/* =========================================================
   DJ HUMBERTO KARAOKE 3.0 PRO
   Sistema local HTML + CSS + JavaScript
========================================================= */

const $ = id => document.getElementById(id);

const state = {

  started:false,

  tracks:[],
  currentIndex:-1,

  queue:[],
  history:JSON.parse(
    localStorage.getItem("DJH_KARAOKE_HISTORY") || "[]"
  ),

  singer:"",

  shuffle:false,
  repeat:false,
  autoNext:true,
  scoreEnabled:true,

  emergencyIndex:0,

  lyrics:[],

  ids:[],
  idTimer:null,

  audioContext:null,

  masterGain:null,
  musicGain:null,
  micBus:null,
  idBus:null,

  analyser:null,

  recordDestination:null,
  recorder:null,
  recordingChunks:[],

  microphones:[
    null,
    null
  ],

  micNodes:[
    null,
    null
  ],

  secondWindow:null,

  score:0

};


/* =========================================================
   UTILIDADES
========================================================= */

function esc(text){

  return String(text || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


function formatTime(seconds){

  if(!Number.isFinite(seconds)){
    return "00:00";
  }

  seconds=Math.max(0,seconds);

  const minutes=Math.floor(seconds/60);

  const secs=Math.floor(seconds%60);

  return String(minutes).padStart(2,"0")
    + ":" +
    String(secs).padStart(2,"0");

}


function fileInfo(filename){

  const clean=filename
    .replace(/\.[^/.]+$/,"")
    .replace(/[_]+/g," ");

  const parts=clean.split(/\s[-–—]\s/);

  if(parts.length>1){

    return {
      artist:parts[0],
      title:parts.slice(1).join(" - ")
    };

  }

  return {
    artist:"",
    title:clean
  };

}


/* =========================================================
   AUDIO ENGINE
========================================================= */

function initializeAudio(){

  if(state.audioContext){
    return;
  }

  const AudioContext=
    window.AudioContext ||
    window.webkitAudioContext;

  state.audioContext=new AudioContext();

  state.masterGain=
    state.audioContext.createGain();

  state.musicGain=
    state.audioContext.createGain();

  state.micBus=
    state.audioContext.createGain();

  state.idBus=
    state.audioContext.createGain();

  state.analyser=
    state.audioContext.createAnalyser();

  state.analyser.fftSize=1024;

  state.masterGain.gain.value=
    Number($("masterVolume").value);

  state.musicGain.gain.value=1;

  state.micBus.gain.value=1;

  state.idBus.gain.value=
    Number($("idVolume").value);

  state.musicGain.connect(
    state.masterGain
  );

  state.micBus.connect(
    state.masterGain
  );

  state.idBus.connect(
    state.masterGain
  );

  state.masterGain.connect(
    state.analyser
  );

  state.masterGain.connect(
    state.audioContext.destination
  );

  state.recordDestination=
    state.audioContext.createMediaStreamDestination();

  state.masterGain.connect(
    state.recordDestination
  );

}


/* =========================================================
   INICIO
========================================================= */

$("startSystem").addEventListener(
  "click",
  async ()=>{

    initializeAudio();

    await state.audioContext.resume();

    state.started=true;

    $("bootScreen").classList.add("hidden");

    $("karaokeApp").classList.remove("hidden");

    $("systemStatus").textContent=
      "● SISTEMA ACTIVO";

    loadMicrophoneDevices();

    startClock();

    drawVisualizer();

  }
);


/* =========================================================
   RELOJ
========================================================= */

function startClock(){

  function update(){

    const now=new Date();

    $("clock").textContent=
      now.toLocaleTimeString(
        "es-AR",
        {
          hour:"2-digit",
          minute:"2-digit",
          second:"2-digit"
        }
      );

  }

  update();

  setInterval(update,1000);

}


/* =========================================================
   BIBLIOTECA
========================================================= */

$("mediaFiles").addEventListener(
  "change",
  event=>{
    addFiles(
      Array.from(event.target.files)
    );
  }
);


$("folderFiles").addEventListener(
  "change",
  event=>{
    addFiles(
      Array.from(event.target.files)
    );
  }
);


function addFiles(files){

  files.forEach(file=>{

    if(
      !file.type.startsWith("audio/") &&
      !file.type.startsWith("video/")
    ){
      return;
    }

    const exists=
      state.tracks.some(
        track=>
          track.file.name===file.name &&
          track.file.size===file.size
      );

    if(exists){
      return;
    }

    const info=fileInfo(file.name);

    state.tracks.push({

      file:file,

      url:URL.createObjectURL(file),

      title:info.title,

      artist:info.artist,

      lyrics:null

    });

  });

  renderLibrary();

}


$("librarySearch").addEventListener(
  "input",
  renderLibrary
);


function renderLibrary(){

  const search=
    $("librarySearch").value
      .toLowerCase()
      .trim();

  const filtered=
    state.tracks
      .map((track,index)=>({
        track,
        index
      }))
      .filter(item=>
        (
          item.track.title+
          " "+
          item.track.artist
        )
        .toLowerCase()
        .includes(search)
      );

  const html=filtered.map(
    ({track,index})=>`

      <div class="list-item">

        <div class="item-info">

          <strong>
            ${esc(track.title)}
          </strong>

          <small>
            ${esc(track.artist || "Artista desconocido")}
          </small>

        </div>

        <button onclick="loadTrack(${index})">
          ▶
        </button>

        <button onclick="addToQueue(${index})">
          ＋
        </button>

        <button onclick="setEmergency(${index})">
          🚨
        </button>

      </div>

    `
  ).join("");

  $("libraryList").innerHTML=
    html ||
    `<div class="info">
      No hay canciones cargadas.
    </div>`;

}


window.loadTrack=async function(index){

  if(!state.tracks[index]){
    return;
  }

  const track=state.tracks[index];

  state.currentIndex=index;

  state.score=0;

  $("scoreValue").textContent="0";

  const video=$("mainVideo");

  video.pause();

  video.src=track.url;

  video.load();

  $("currentSong").textContent=
    track.title;

  $("currentArtist").textContent=
    track.artist;

  $("currentSingerDisplay").textContent=
    state.singer || "SIN CANTANTE";

  if(track.lyrics){

    state.lyrics=track.lyrics;

  }else{

    state.lyrics=[];

    $("lyricsEditor").value="";

  }

  $("currentLyric").textContent=
    "Preparado para cantar";

  $("nextLyric").textContent=
    track.title;

  applyPlaybackRate();

  addHistory();

};


function addToQueue(index){

  if(!state.tracks[index]){
    return;
  }

  const singer=
    $("singerName").value.trim() ||
    state.singer ||
    "Sin cantante";

  state.queue.push({

    trackIndex:index,

    singer:singer

  });

  $("singerName").value="";

  renderQueue();

}


window.addToQueue=addToQueue;


/* =========================================================
   COLA
========================================================= */

$("addCurrentToQueue").addEventListener(
  "click",
  ()=>{

    if(state.currentIndex<0){
      alert("Primero carga una canción.");
      return;
    }

    addToQueue(state.currentIndex);

  }
);


function renderQueue(){

  if(!state.queue.length){

    $("queueList").innerHTML=
      `<div class="info">
        La cola está vacía.
      </div>`;

    return;

  }

  $("queueList").innerHTML=
    state.queue.map(
      (item,index)=>{

        const track=
          state.tracks[item.trackIndex];

        if(!track){
          return "";
        }

        return `

          <div class="list-item">

            <div class="item-info">

              <strong>
                ${esc(track.title)}
              </strong>

              <small>
                🎤 ${esc(item.singer)}
              </small>

            </div>

            <button
              onclick="playQueue(${index})">
              ▶
            </button>

            <button
              onclick="removeQueue(${index})">
              ×
            </button>

          </div>

        `;

      }
    ).join("");

}


window.removeQueue=function(index){

  state.queue.splice(index,1);

  renderQueue();

};


window.playQueue=async function(index){

  if(!state.queue[index]){
    return;
  }

  const item=
    state.queue.splice(index,1)[0];

  state.singer=item.singer;

  $("currentSinger").value=
    state.singer;

  await loadTrack(item.trackIndex);

  renderQueue();

  playCurrent();

};


/* =========================================================
   REPRODUCTOR
========================================================= */

const video=$("mainVideo");


$("playBtn").addEventListener(
  "click",
  ()=>{

    if(video.paused){

      playCurrent();

    }else{

      pauseCurrent();

    }

  }
);


function playCurrent(){

  if(!video.src){
    alert("Carga primero una canción.");
    return;
  }

  if(state.audioContext){
    state.audioContext.resume();
  }

  video.play()
    .then(()=>{
      $("playBtn").textContent="⏸";
    })
    .catch(()=>{
      alert(
        "El navegador bloqueó la reproducción. Presiona nuevamente PLAY."
      );
    });

}


function pauseCurrent(){

  video.pause();

  $("playBtn").textContent="▶";

}


$("stopBtn").addEventListener(
  "click",
  ()=>{

    video.pause();

    video.currentTime=0;

    $("playBtn").textContent="▶";

  }
);


$("previousBtn").addEventListener(
  "click",
  previousTrack
);


$("nextBtn").addEventListener(
  "click",
  nextTrack
);


$("shuffleBtn").addEventListener(
  "click",
  ()=>{

    state.shuffle=!state.shuffle;

    $("shuffleBtn").style.borderColor=
      state.shuffle ? "#00eaff" : "";

  }
);


$("repeatBtn").addEventListener(
  "click",
  ()=>{

    state.repeat=!state.repeat;

    $("repeatBtn").style.borderColor=
      state.repeat ? "#ff2584" : "";

  }
);


video.addEventListener(
  "timeupdate",
  ()=>{

    if(video.duration){

      $("progressBar").value=
        (video.currentTime/video.duration)*100;

    }

    $("timeDisplay").textContent=
      formatTime(video.currentTime)+
      " / "+
      formatTime(video.duration);

    updateLyrics();

    calculateScore();

  }
);


video.addEventListener(
  "ended",
  ()=>{

    $("playBtn").textContent="▶";

    if(state.repeat){

      video.currentTime=0;

      playCurrent();

      return;

    }

    if(state.autoNext){

      nextTrack();

    }

  }
);


$("progressBar").addEventListener(
  "input",
  event=>{

    if(video.duration){

      video.currentTime=
        video.duration*
        (Number(event.target.value)/100);

    }

  }
);


$("masterVolume").addEventListener(
  "input",
  event=>{

    if(state.masterGain){

      state.masterGain.gain.value=
        Number(event.target.value);

    }

  }
);


/* =========================================================
   SIGUIENTE / ANTERIOR
========================================================= */

async function nextTrack(){

  if(state.queue.length){

    await window.playQueue(0);

    return;

  }

  if(!state.tracks.length){
    return;
  }

  let index;

  if(state.shuffle){

    index=
      Math.floor(
        Math.random()*state.tracks.length
      );

  }else{

    index=
      state.currentIndex+1;

    if(index>=state.tracks.length){
      index=0;
    }

  }

  await loadTrack(index);

  playCurrent();

}


async function previousTrack(){

  if(video.currentTime>5){

    video.currentTime=0;

    return;

  }

  let index=
    state.currentIndex-1;

  if(index<0){
    index=state.tracks.length-1;
  }

  await loadTrack(index);

  playCurrent();

}


/* =========================================================
   AUTO NEXT
========================================================= */

$("autoNextBtn").addEventListener(
  "click",
  ()=>{

    state.autoNext=
      !state.autoNext;

    $("autoNextBtn").textContent=
      "AUTO NEXT: "+
      (
        state.autoNext ?
        "ACTIVADO" :
        "DESACTIVADO"
      );

  }
);


/* =========================================================
   VELOCIDAD / TONO BÁSICO
========================================================= */

$("speedControl").addEventListener(
  "input",
  applyPlaybackRate
);

$("pitchControl").addEventListener(
  "input",
  applyPlaybackRate
);


function applyPlaybackRate(){

  const speed=
    Number($("speedControl").value);

  const pitch=
    Number($("pitchControl").value);

  /*
    Limitación del navegador:
    playbackRate modifica velocidad y tono juntos.
    No es pitch-shifting profesional independiente.
  */

  video.playbackRate=
    speed*pitch;

}


/* =========================================================
   CANTANTE
========================================================= */

$("saveSingerBtn").addEventListener(
  "click",
  ()=>{

    state.singer=
      $("currentSinger").value.trim();

    $("currentSingerDisplay").textContent=
      state.singer ||
      "SIN CANTANTE";

  }
);


/* =========================================================
   HISTORIAL
========================================================= */

function addHistory(){

  if(state.currentIndex<0){
    return;
  }

  const track=
    state.tracks[state.currentIndex];

  state.history.unshift({

    title:track.title,

    artist:track.artist,

    singer:state.singer,

    date:new Date().toLocaleString("es-AR")

  });

  state.history=
    state.history.slice(0,50);

  localStorage.setItem(
    "DJH_KARAOKE_HISTORY",
    JSON.stringify(state.history)
  );

  renderHistory();

}


function renderHistory(){

  $("historyList").innerHTML=
    state.history
      .slice(0,15)
      .map(item=>`

        <div class="list-item">

          <div class="item-info">

            <strong>
              ${esc(item.title)}
            </strong>

            <small>
              🎤 ${esc(item.singer || "Sin cantante")}
              • ${esc(item.date)}
            </small>

          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
   LETRAS LRC
========================================================= */

function parseLRC(text){

  const lines=[];

  text.split(/\r?\n/).forEach(line=>{

    const matches=
      [...line.matchAll(
        /\[(\d+):(\d+(?:\.\d+)?)\]/g
      )];

    const lyric=
      line.replace(
        /\[(\d+):(\d+(?:\.\d+)?)\]/g,
        ""
      ).trim();

    matches.forEach(match=>{

      const minutes=
        Number(match[1]);

      const seconds=
        Number(match[2]);

      lines.push({

        time:
          minutes*60+
          seconds,

        text:lyric

      });

    });

  });

  return lines.sort(
    (a,b)=>a.time-b.time
  );

}


/* =========================================================
   LETRAS SRT
========================================================= */

function parseSRT(text){

  const lines=[];

  const blocks=
    text.split(/\r?\n\r?\n/);

  blocks.forEach(block=>{

    const timeMatch=
      block.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );

    if(!timeMatch){
      return;
    }

    const start=
      Number(timeMatch[1])*3600+
      Number(timeMatch[2])*60+
      Number(timeMatch[3])+
      Number(timeMatch[4])/1000;

    const parts=
      block.split(/\r?\n/);

    const lyric=
      parts
        .slice(2)
        .join(" ")
        .trim();

    lines.push({

      time:start,

      text:lyric

    });

  });

  return lines;

}


/* =========================================================
   ARCHIVOS DE LETRAS
========================================================= */

$("lyricsFiles").addEventListener(
  "change",
  async event=>{

    const files=
      Array.from(event.target.files);

    if(!files.length){
      return;
    }

    const file=files[0];

    const text=
      await file.text();

    let parsed=[];

    if(
      file.name
        .toLowerCase()
        .endsWith(".lrc")
    ){

      parsed=parseLRC(text);

    }else if(
      file.name
        .toLowerCase()
        .endsWith(".srt")
    ){

      parsed=parseSRT(text);

    }else{

      parsed=[
        {
          time:0,
          text:text
        }
      ];

    }

    state.lyrics=parsed;

    $("lyricsEditor").value=text;

    if(state.currentIndex>=0){

      state.tracks[
        state.currentIndex
      ].lyrics=parsed;

    }

    updateLyrics();

  }
);


$("lyricsEditor").addEventListener(
  "input",
  ()=>{

    const text=
      $("lyricsEditor").value;

    const parsed=parseLRC(text);

    if(parsed.length){

      state.lyrics=parsed;

    }else{

      state.lyrics=[
        {
          time:0,
          text:text
        }
      ];

    }

    if(state.currentIndex>=0){

      state.tracks[
        state.currentIndex
      ].lyrics=state.lyrics;

    }

  }
);


$("editorFocusBtn").addEventListener(
  "click",
  ()=>{

    $("lyricsEditor").focus();

  }
);


/* =========================================================
   SINCRONIZACIÓN
========================================================= */

function updateLyrics(){

  if(!state.lyrics.length){
    return;
  }

  const time=
    video.currentTime;

  let index=-1;

  for(
    let i=0;
    i<state.lyrics.length;
    i++
  ){

    if(
      state.lyrics[i].time<=time
    ){

      index=i;

    }

  }

  if(index<0){
    return;
  }

  $("currentLyric").textContent=
    state.lyrics[index].text;

  $("nextLyric").textContent=
    state.lyrics[index+1]?.text ||
    "";

}


/* =========================================================
   SCORE DE ACTUACIÓN
========================================================= */

$("scoreBtn").addEventListener(
  "click",
  ()=>{

    state.scoreEnabled=
      !state.scoreEnabled;

    $("scoreBtn").textContent=
      "⭐ SCORE: "+
      (
        state.scoreEnabled ?
        "ACTIVADO" :
        "DESACTIVADO"
      );

  }
);


function calculateScore(){

  if(!state.scoreEnabled){
    return;
  }

  if(!state.lyrics.length){
    return;
  }

  let lyricActive=false;

  for(
    let i=0;
    i<state.lyrics.length;
    i++
  ){

    const current=
      state.lyrics[i];

    const next=
      state.lyrics[i+1];

    const end=
      next ?
      next.time :
      video.duration;

    if(
      video.currentTime>=current.time &&
      video.currentTime<end
    ){

      lyricActive=true;

      break;

    }

  }

  /*
    Es un indicador básico de actuación,
    no una medición profesional de afinación.
  */

  if(lyricActive){

    state.score=
      Math.min(
        100,
        state.score+0.015
      );

    $("scoreValue").textContent=
      Math.round(state.score);

  }

}


/* =========================================================
   CUENTA REGRESIVA
========================================================= */

$("countdownBtn").addEventListener(
  "click",
  startCountdown
);


function startCountdown(){

  let number=3;

  $("countdown").textContent=
    number;

  $("countdown").classList.remove(
    "hidden"
  );

  const timer=
    setInterval(()=>{

      number--;

      if(number<=0){

        clearInterval(timer);

        $("countdown")
          .classList.add("hidden");

        playCurrent();

      }else{

        $("countdown").textContent=
          number;

      }

    },1000);

}


/* =========================================================
   CANCIÓN DE EMERGENCIA
========================================================= */

window.setEmergency=function(index){

  state.emergencyIndex=index;

  const track=
    state.tracks[index];

  if(track){

    alert(
      "Canción de emergencia seleccionada:\n"+
      track.title
    );

  }

};


$("emergencyBtn").addEventListener(
  "click",
  async ()=>{

    if(!state.tracks.length){

      alert(
        "Carga primero una canción."
      );

      return;

    }

    await loadTrack(
      state.emergencyIndex
    );

    playCurrent();

  }
);


/* =========================================================
   MICROFONOS
========================================================= */

async function loadMicrophoneDevices(){

  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.enumerateDevices
  ){
    return;
  }

  try{

    const devices=
      await navigator.mediaDevices
        .enumerateDevices();

    const inputs=
      devices.filter(
        d=>d.kind==="audioinput"
      );

    populateMicSelect(
      $("mic1Device"),
      inputs
    );

    populateMicSelect(
      $("mic2Device"),
      inputs
    );

  }catch(error){

    console.warn(error);

  }

}


function populateMicSelect(
  select,
  devices
){

  select.innerHTML=
    `<option value="">
      Dispositivo predeterminado
    </option>`;

  devices.forEach(
    (device,index)=>{

      const option=
        document.createElement("option");

      option.value=
        device.deviceId;

      option.textContent=
        device.label ||
        `Micrófono ${index+1}`;

      select.appendChild(option);

    }
  );

}


async function toggleMicrophone(index){

  initializeAudio();

  const micNumber=index+1;

  const stream=
    state.microphones[index];

  if(stream){

    stream.getTracks()
      .forEach(track=>track.stop());

    state.microphones[index]=null;

    $(`mic${micNumber}On`)
      .textContent=
      "🎙 ACTIVAR";

    return;

  }

  try{

    const device=
      $(`mic${micNumber}Device`)
        .value;

    const constraints={

      audio:device
        ? {
            deviceId:{
              exact:device
            },
            echoCancellation:true,
            noiseSuppression:true,
            autoGainControl:false
          }
        : {
            echoCancellation:true,
            noiseSuppression:true,
            autoGainControl:false
          }

    };

    const newStream=
      await navigator.mediaDevices
        .getUserMedia(
          constraints
        );

    state.microphones[index]=
      newStream;

    const source=
      state.audioContext
        .createMediaStreamSource(
          newStream
        );

    const gain=
      state.audioContext
        .createGain();

    const volume=
      state.audioContext
        .createGain();

    const delay=
      state.audioContext
        .createDelay(1);

    const echo=
      state.audioContext
        .createGain();

    const reverb=
      state.audioContext
        .createGain();

    const convolver=
      state.audioContext
        .createConvolver();

    gain.gain.value=
      Number(
        $(`mic${micNumber}Gain`).value
      );

    volume.gain.value=
      Number(
        $(`mic${micNumber}Volume`).value
      );

    delay.delayTime.value=.22;

    echo.gain.value=
      Number(
        $(`mic${micNumber}Echo`).value
      );

    reverb.gain.value=
      Number(
        $(`mic${micNumber}Reverb`).value
      );

    convolver.buffer=
      createReverbImpulse();

    source.connect(gain);

    gain.connect(volume);

    volume.connect(
      state.micBus
    );

    gain.connect(delay);

    delay.connect(echo);

    echo.connect(
      state.micBus
    );

    gain.connect(convolver);

    convolver.connect(reverb);

    reverb.connect(
      state.micBus
    );

    state.micNodes[index]={
      gain,
      volume,
      echo,
      reverb
    };

    $(`mic${micNumber}On`)
      .textContent=
      "⏹ DESACTIVAR";

    await loadMicrophoneDevices();

  }catch(error){

    console.error(error);

    alert(
      "No se pudo activar el micrófono.\n\n"+
      "Comprueba los permisos del navegador."
    );

  }

}


function createReverbImpulse(){

  const length=
    state.audioContext.sampleRate*1.5;

  const impulse=
    state.audioContext.createBuffer(
      2,
      length,
      state.audioContext.sampleRate
    );

  for(
    let channel=0;
    channel<2;
    channel++
  ){

    const data=
      impulse.getChannelData(channel);

    for(
      let i=0;
      i<length;
      i++
    ){

      data[i]=
        (
          Math.random()*2-1
        )*
        Math.pow(
          1-i/length,
          3
        );

    }

  }

  return impulse;

}


$("mic1On").addEventListener(
  "click",
  ()=>toggleMicrophone(0)
);

$("mic2On").addEventListener(
  "click",
  ()=>toggleMicrophone(1)
);


$("mic1Mute").addEventListener(
  "click",
  ()=>muteMicrophone(0)
);

$("mic2Mute").addEventListener(
  "click",
  ()=>muteMicrophone(1)
);


function muteMicrophone(index){

  const node=
    state.micNodes[index];

  if(!node){
    return;
  }

  if(node.volume.gain.value>0){

    node.volume.gain.value=0;

  }else{

    node.volume.gain.value=
      Number(
        $(
          `mic${index+1}Volume`
        ).value
      );

  }

}


for(let i=1;i<=2;i++){

  $(`mic${i}Volume`)
    .addEventListener(
      "input",
      event=>{

        const node=
          state.micNodes[i-1];

        if(node){

          node.volume.gain.value=
            Number(event.target.value);

        }

      }
    );

  $(`mic${i}Gain`)
    .addEventListener(
      "input",
      event=>{

        const node=
          state.micNodes[i-1];

        if(node){

          node.gain.gain.value=
            Number(event.target.value);

        }

      }
    );

  $(`mic${i}Echo`)
    .addEventListener(
      "input",
      event=>{

        const node=
          state.micNodes[i-1];

        if(node){

          node.echo.gain.value=
            Number(event.target.value);

        }

      }
    );

  $(`mic${i}Reverb`)
    .addEventListener(
      "input",
      event=>{

        const node=
          state.micNodes[i-1];

        if(node){

          node.reverb.gain.value=
            Number(event.target.value);

        }

      }
    );

}


/* =========================================================
   DJ HUMBERTO IDS
========================================================= */

$("idFiles").addEventListener(
  "change",
  async event=>{

    initializeAudio();

    for(
      const file of event.target.files
    ){

      try{

        const buffer=
          await state.audioContext
            .decodeAudioData(
              await file.arrayBuffer()
            );

        state.ids.push(buffer);

      }catch(error){

        console.warn(
          "No se pudo cargar ID",
          file.name
        );

      }

    }

  }
);


function playRandomID(){

  if(!state.ids.length){

    alert(
      "Carga primero los audios de DJ HUMBERTO ID."
    );

    return;

  }

  initializeAudio();

  const source=
    state.audioContext
      .createBufferSource();

  const gain=
    state.audioContext
      .createGain();

  source.buffer=
    state.ids[
      Math.floor(
        Math.random()*state.ids.length
      )
    ];

  gain.gain.value=
    Number(
      $("idVolume").value
    );

  source.connect(gain);

  gain.connect(
    state.idBus
  );

  /*
    Ducking automático.
  */

  state.musicGain.gain
    .setTargetAtTime(
      .30,
      state.audioContext.currentTime,
      .08
    );

  source.onended=()=>{

    state.musicGain.gain
      .setTargetAtTime(
        1,
        state.audioContext.currentTime,
        .18
      );

  };

  source.start();

}


$("playIdBtn").addEventListener(
  "click",
  playRandomID
);


$("idVolume").addEventListener(
  "input",
  event=>{

    if(state.idBus){

      state.idBus.gain.value=
        Number(event.target.value);

    }

  }
);


$("autoIdBtn").addEventListener(
  "click",
  ()=>{

    if(state.idTimer){

      clearInterval(
        state.idTimer
      );

      state.idTimer=null;

      $("autoIdBtn").textContent=
        "AUTO ID: OFF";

      return;

    }

    const minutes=
      Number(
        $("idInterval").value
      );

    playRandomID();

    state.idTimer=
      setInterval(
        playRandomID,
        minutes*60*1000
      );

    $("autoIdBtn").textContent=
      "AUTO ID: ON";

  }
);


/* =========================================================
   GRABACIÓN
========================================================= */

$("recordStart").addEventListener(
  "click",
  ()=>{

    initializeAudio();

    if(
      !window.MediaRecorder
    ){

      alert(
        "Este navegador no permite grabación."
      );

      return;

    }

    const type=
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
      ?
      "audio/webm;codecs=opus"
      :
      "audio/webm";

    state.recordingChunks=[];

    state.recorder=
      new MediaRecorder(
        state.recordDestination.stream,
        {
          mimeType:type
        }
      );

    state.recorder.ondataavailable=
      event=>{

        if(event.data.size){

          state.recordingChunks
            .push(event.data);

        }

      };

    state.recorder.onstop=
      ()=>{

        const blob=
          new Blob(
            state.recordingChunks,
            {
              type:type
            }
          );

        const url=
          URL.createObjectURL(blob);

        const link=
          document.createElement("a");

        link.href=url;

        link.download=
          "DJ-HUMBERTO-KARAOKE-"+

          new Date()
            .toISOString()
            .replace(/[:.]/g,"-")+

          ".webm";

        link.click();

        setTimeout(
          ()=>URL.revokeObjectURL(url),
          2000
        );

        $("recordStatus").textContent=
          "Grabación finalizada.";

      };

    state.recorder.start();

    $("recordStart").disabled=true;

    $("recordStop").disabled=false;

    $("recordStatus").textContent=
      "🔴 GRABANDO...";

  }
);


$("recordStop").addEventListener(
  "click",
  ()=>{

    if(
      state.recorder &&
      state.recorder.state!=="inactive"
    ){

      state.recorder.stop();

    }

    $("recordStart").disabled=false;

    $("recordStop").disabled=true;

  }
);


/* =========================================================
   PANTALLA COMPLETA
========================================================= */

$("fullscreenBtn").addEventListener(
  "click",
  ()=>{

    if(!document.fullscreenElement){

      document.documentElement
        .requestFullscreen?.();

    }else{

      document.exitFullscreen?.();

    }

  }
);


/* =========================================================
   MODO PROYECTOR
========================================================= */

$("projectorBtn").addEventListener(
  "click",
  ()=>{

    document.body.classList.toggle(
      "projector"
    );

  }
);


/* =========================================================
   SEGUNDA PANTALLA
========================================================= */

$("secondScreenBtn").addEventListener(
  "click",
  ()=>{

    const win=
      window.open(
        "",
        "DJ_HUMBERTO_SECOND_SCREEN",
        "width=1200,height=800"
      );

    if(!win){

      alert(
        "El navegador bloqueó la segunda pantalla."
      );

      return;

    }

    state.secondWindow=win;

    win.document.write(`

      <!DOCTYPE html>

      <html>

      <head>

        <title>
          DJ HUMBERTO • SEGUNDA PANTALLA
        </title>

        <style>

          *{
            box-sizing:border-box;
          }

          body{
            margin:0;
            min-height:100vh;
            display:grid;
            place-items:center;
            background:
              radial-gradient(
                circle,
                #18265b,
                #03040a 70%
              );
            color:white;
            font-family:Arial;
            text-align:center;
          }

          .box{
            width:90%;
          }

          #song{
            font-size:6vw;
            font-weight:900;
          }

          #singer{
            color:#00eaff;
            font-size:3vw;
          }

          #lyrics{
            margin-top:60px;
            font-size:4vw;
            font-weight:bold;
          }

          #next{
            margin-top:20px;
            color:#9ba8ca;
            font-size:2vw;
          }

        </style>

      </head>

      <body>

        <div class="box">

          <div id="singer">
            SIN CANTANTE
          </div>

          <div id="song">
            DJ HUMBERTO
          </div>

          <div id="lyrics">
            KARAOKE 3.0
          </div>

          <div id="next"></div>

        </div>

        <script>

          setInterval(()=>{

            if(!window.opener){
              return;
            }

            document.getElementById(
              "song"
            ).textContent=
              window.opener.document
                .getElementById(
                  "currentSong"
                ).textContent;

            document.getElementById(
              "singer"
            ).textContent=
              window.opener.document
                .getElementById(
                  "currentSingerDisplay"
                ).textContent;

            document.getElementById(
              "lyrics"
            ).textContent=
              window.opener.document
                .getElementById(
                  "currentLyric"
                ).textContent;

            document.getElementById(
              "next"
            ).textContent=
              window.opener.document
                .getElementById(
                  "nextLyric"
                ).textContent;

          },200);

        <\/script>

      </body>

      </html>

    `);

    win.document.close();

  }
);


/* =========================================================
   VISUALIZADOR
========================================================= */

function drawVisualizer(){

  const canvas=
    $("visualizer");

  const ctx=
    canvas.getContext("2d");

  function resize(){

    canvas.width=
      canvas.clientWidth*
      window.devicePixelRatio;

    canvas.height=
      canvas.clientHeight*
      window.devicePixelRatio;

  }

  resize();

  window.addEventListener(
    "resize",
    resize
  );

  function animate(){

    requestAnimationFrame(
      animate
    );

    if(!state.analyser){
      return;
    }

    const data=
      new Uint8Array(
        state.analyser.frequencyBinCount
      );

    state.analyser
      .getByteFrequencyData(data);

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const bars=90;

    const step=
      Math.floor(
        data.length/bars
      );

    const width=
      canvas.width/bars;

    for(
      let i=0;
      i<bars;
      i++
    ){

      const value=
        data[i*step]/255;

      const height=
        value*
        canvas.height*
        .45;

      const gradient=
        ctx.createLinearGradient(
          0,
          canvas.height-height,
          0,
          canvas.height
        );

      gradient.addColorStop(
        0,
        "#00eaff"
      );

      gradient.addColorStop(
        .5,
        "#9b4dff"
      );

      gradient.addColorStop(
        1,
        "#ff2584"
      );

      ctx.fillStyle=gradient;

      ctx.fillRect(
        i*width,
        canvas.height-height,
        width*.7,
        height
      );

    }

  }

  animate();

}


/* =========================================================
   ATAJOS
========================================================= */

document.addEventListener(
  "keydown",
  event=>{

    if(
      event.target.matches(
        "input,textarea,select"
      )
    ){
      return;
    }

    switch(
      event.key.toLowerCase()
    ){

      case " ":

        event.preventDefault();

        if(video.paused){
          playCurrent();
        }else{
          pauseCurrent();
        }

        break;

      case "n":

        nextTrack();

        break;

      case "p":

        previousTrack();

        break;

      case "m":

        toggleMicrophone(0);

        break;

      case "f":

        $("fullscreenBtn").click();

        break;

      case "r":

        if(
          state.recorder &&
          state.recorder.state!=="inactive"
        ){

          $("recordStop").click();

        }else{

          $("recordStart").click();

        }

        break;

    }

  }
);


/* =========================================================
   LIMPIEZA
========================================================= */

window.addEventListener(
  "beforeunload",
  ()=>{

    state.tracks.forEach(
      track=>{

        if(track.url){

          URL.revokeObjectURL(
            track.url
          );

        }

      }
    );

    state.microphones.forEach(
      stream=>{

        if(stream){

          stream.getTracks()
            .forEach(
              track=>track.stop()
            );

        }

      }
    );

  }
);


/* =========================================================
   INICIALIZACIÓN
========================================================= */

renderLibrary();

renderQueue();

renderHistory();
