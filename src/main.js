import './style.css';
import { event, chapters, speakers, schedule, sponsors } from './data.js';
import { chapterAt, chapterProgress, clamp } from './journey.js';

const icon = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><ellipse cx="20" cy="20" rx="17" ry="7" stroke="currentColor" stroke-width="1.5" transform="rotate(-40 20 20)"/><ellipse cx="20" cy="20" rx="17" ry="7" stroke="currentColor" stroke-width="1.5" transform="rotate(40 20 20)"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>`;
const arrow = '<span aria-hidden="true">↗</span>';
let current=0, world, quick=matchMedia('(prefers-reduced-motion: reduce)').matches, sound=false, audioContext, audioNodes=[], lastFocus, touchStart, audioTimer;
const app=document.querySelector('#app');
app.innerHTML=`
  <a class="skip" href="#accessible">Saltar al contenido accesible</a>
  <canvas id="universe" aria-label="Universo tridimensional de QuantumBeers. Usa el scroll o el menú para explorar." role="img"></canvas>
  <div class="vignette" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
  <header class="header"><a href="#inicio" class="brand" aria-label="QuantumBeers, inicio">${icon}<span>QUANTUM<span class="brand-light">BEERS</span><small>SCIENCE. UNFILTERED.</small></span></a>
    <nav class="desktop-nav" aria-label="Navegación principal"><a href="#evento">El evento</a><a href="#ponentes">Ponentes</a><a href="#programa">Programa</a><a href="#pub" data-detail="sponsors">Patrocinadores</a><a href="#pub">Experiencia</a><a href="#entradas" data-detail="location">Ubicación</a></nav>
    <div class="header-actions"><button class="text-button quick-button" title="Abrir toda la información sin animaciones">Vista rápida <span>☷</span></button><a class="ticket-nav" href="#entradas">Entradas ${arrow}</a><button class="menu-button" aria-label="Abrir menú" aria-expanded="false">☰</button></div>
  </header>
  <nav class="mobile-nav" aria-label="Menú móvil" hidden>${chapters.map(c=>`<a href="#${c.id}"><small>${c.number}</small>${c.label} ${arrow}</a>`).join('')}<button class="text-button" data-modal="sponsors">Patrocinadores ↗</button><button class="text-button" data-modal="location">Ubicación ↗</button></nav>
  <main id="experience" aria-label="Recorrido por el multiverso">
    <section class="scene-content hero active" data-scene="0" aria-labelledby="hero-title">
      <div class="eyebrow"><i></i> TECH TALKS. COLD BEERS. INFINITE POSSIBILITIES.</div>
      <h1 id="hero-title">Reality is<br>overrated.<br><em>Beer is not.</em></h1>
      <p class="hero-description">Las ideas del futuro se encuentran<br>con las mejores conversaciones del presente.</p>
      <a class="primary" href="#evento">Entra en el multiverso <span>↗</span></a>
      <div class="hero-meta"><span>${event.date}<small>PRÓXIMA COORDENADA</small></span><b>×</b><span>VITORIA-GASTEIZ, ES<small>PLANETA TIERRA</small></span></div>
    </section>
    <div class="portal-label" aria-hidden="true"><span class="cross">+</span><span>QUANTUM GATE / 001<br><strong>REALITY IS OPTIONAL</strong></span><span class="tiny-line"></span></div>
    <div class="hero-wordmark" aria-hidden="true">QUANTUMBEERS<span>®</span></div>
    <section class="scene-content" data-scene="1" aria-labelledby="lab-title" inert><div class="eyebrow">02 / EL LABORATORIO</div><h2 id="lab-title">Buenas ideas.<br><em>Cero filtros.</em></h2><p>No necesitas un doctorado. Solo curiosidad.<br>Una noche para acercarte a la computación cuántica, la IA y todo lo que está a punto de cambiarlo todo.</p><div class="editorial-stats"><div>03<span>CHARLAS PARA ABRIR LA MENTE</span></div><div>∞<span>CONVERSACIONES POSIBLES</span></div></div><button class="outline" data-modal="event">Descubre el evento ${arrow}</button></section>
    <section class="scene-content" data-scene="2" aria-labelledby="speakers-title" inert><div class="eyebrow">03 / LAS MENTES DETRÁS DEL SALTO</div><h2 id="speakers-title">Fuera de<br><em>lo predecible.</em></h2><p>Tres miradas al futuro. Ninguna charla de ascensor.</p><div class="speaker-list">${speakers.map((s,i)=>`<button data-speaker="${i}"><span class="speaker-no">0${i+1}</span><span><strong>${s.name}</strong><small>${s.field}</small></span>${arrow}</button>`).join('')}</div><span class="data-note">PONENTES FICTICIOS · EDICIÓN DEMO</span></section>
    <section class="scene-content" data-scene="3" aria-labelledby="time-title" inert><div class="eyebrow">04 / LA DIMENSIÓN TEMPORAL</div><h2 id="time-title">El tiempo<br><em>es relativo.</em></h2><p>Las buenas noches pasan demasiado rápido.<br>Esta empieza a las 18:00.</p><div class="time-event"><span id="time-hour">18:00</span><div><small id="time-type">BIENVENIDA</small><strong id="time-title-text">Apertura del portal</strong><p id="time-who">Check-in · Primera cerveza · Primeras conexiones</p></div></div><div class="time-dots" aria-label="Explorar horarios">${schedule.map((s,i)=>`<button data-time="${i}" class="${i===0?'selected':''}" aria-label="Ver ${s.time}: ${s.title}"></button>`).join('')}</div><button class="outline" data-modal="schedule">Ver el programa completo ${arrow}</button></section>
    <section class="scene-content" data-scene="4" aria-labelledby="pub-title" inert><div class="eyebrow amber">05 / THE QUANTUM PUB</div><h2 id="pub-title">Aquí ocurren<br><em>las conexiones.</em></h2><p>Colapsa la función de onda. Pide una cerveza.<br>Conoce a tu próxima gran idea, a tu futuro equipo o a alguien tan curioso como tú.</p><div class="pub-actions"><button class="outline" data-modal="balance">Quantum Balance Challenge ${arrow}</button><button class="text-button" data-modal="sponsors">Quienes lo hacen posible ↗</button></div><button class="beer-secret" data-beer><span>◈</span> ¿Está llena o vacía? <small>OBSERVA LA CERVEZA DE SCHRÖDINGER ↗</small></button></section>
    <section class="scene-content" data-scene="5" aria-labelledby="final-title" inert><div class="eyebrow">06 / TU PRÓXIMO SALTO</div><h2 id="final-title">El futuro<br>se vive <em>juntos.</em></h2><p>Tu próximo gran descubrimiento podría empezar<br>con un «¿y tú a qué te dedicas?».</p><div class="final-info"><span>${event.date}<small>${event.time}</small></span><span>VITORIA-GASTEIZ<small>ESPACIO POR CONFIRMAR</small></span></div><button class="primary" data-modal="tickets">Quiero estar dentro ${arrow}</button><button class="text-button location-button" data-modal="location">Consultar ubicación ↗</button><span class="data-note">DEMO CONCEPTUAL · INSCRIPCIONES NO ABIERTAS</span></section>
  </main>
  <aside class="chapter-rail" aria-label="Dimensiones">${chapters.map((c,i)=>`<a href="#${c.id}" class="${i===0?'active':''}" aria-label="${c.number}: ${c.name}"><span>${c.name}</span><b>${c.number}</b><i></i></a>`).join('')}</aside>
  <footer class="hud"><div class="scroll-cue"><span>↓</span><div>SCROLL PARA EXPLORAR<small>UN UNIVERSO. SEIS DIMENSIONES.</small></div></div><div class="chapter-status"><span id="chapter-number">01 / 06</span><span id="chapter-name">EL PORTAL</span><div class="progress-line"><i></i></div></div><div class="settings"><button id="sound" aria-pressed="false" aria-label="Activar sonido ambiente"><span class="sound-bars">ıııı</span> SOUND OFF</button><button id="motion" aria-pressed="${quick}" title="Alternar movimiento reducido">${quick?'MOVIMIENTO REDUCIDO':'FULL EXPERIENCE'} <span>◉</span></button></div></footer>
  <div class="demo-badge">CONCEPTO / DATOS DE DEMOSTRACIÓN</div>
  <div class="scroll-track" aria-hidden="true"></div>
  <section id="accessible" class="accessible" hidden></section>
  <dialog id="info-dialog" aria-labelledby="dialog-title"><div class="dialog-top"><span>QUANTUMBEERS / EXPLORER</span><button class="close-dialog" aria-label="Cerrar ventana">×</button></div><div id="dialog-body"></div></dialog>
  <div class="toast" role="status"></div>
  <div class="loader" aria-live="polite"><div>${icon}</div><span>ABRIENDO EL MULTIVERSO</span><small>La realidad puede esperar.</small></div>
`;

const canvas=document.querySelector('#universe');
const dialog=document.querySelector('#info-dialog');
const body=document.querySelector('#dialog-body');
const content=document.querySelector('#accessible');
const chapterNodes=[...document.querySelectorAll('[data-scene]')];

function scheduleHTML(){return `<div class="full-schedule">${schedule.map(s=>`<article><time>${s.time}</time><div><small>${s.type}</small><h3>${s.title}</h3><p>${s.who}</p></div></article>`).join('')}</div><p class="fine-print">Programa de demostración. Horarios y participantes ficticios.</p>`;}
function sponsorsHTML(){return `<p>La ciencia necesita curiosidad. Y buenos compañeros de viaje.</p><div class="sponsors">${sponsors.map((s,i)=>`<button data-sponsor="${i}"><b>${s.mark}</b><strong>${s.name}</strong><small>${s.description}</small><span>Partner de demostración ↗</span></button>`).join('')}</div><p class="fine-print">Marcas ficticias. Los enlaces oficiales se activarán al confirmar los patrocinadores.</p>`;}
function eventHTML(){return `<p class="dialog-lead">Ciencia sin pedestal.<br>Cerveza sin complicaciones.</p><p>QuantumBeers reúne a personas curiosas alrededor de las tecnologías que están transformando nuestro mundo. Charlas cercanas, preguntas sin miedo y conversaciones que continúan cuando se apaga el proyector.</p><div class="detail-columns"><div><h3>Ven como eres.</h3><p>No hacen falta conocimientos técnicos previos. Investigadores, estudiantes, profesionales y curiosos comparten la misma barra.</p></div><div><h3>Qué incluye la experiencia</h3><p>Tres charlas, encuentro con ponentes, networking y el Quantum Balance Challenge. Disponibilidad y condiciones de entradas por confirmar.</p></div></div><p class="fine-print">Concepto de evento: fecha, programa y participantes son datos de demostración.</p>`;}
function locationHTML(){return `<p class="dialog-lead">Próxima parada:<br>Vitoria-Gasteiz, planeta Tierra.</p><div class="location-grid"><div class="map-art" aria-hidden="true"><i></i><b>+</b><span>VITORIA-GASTEIZ<br>42.8467° N / 2.6716° W</span></div><div><h3>${event.venue}</h3><p>${event.address}</p><p>${event.dateLong}<br>${event.time}</p><a class="outline" href="https://www.openstreetmap.org/?mlat=42.8467&mlon=-2.6716#map=13/42.8467/-2.6716" target="_blank" rel="noopener noreferrer">Explorar Vitoria-Gasteiz ↗</a></div></div><p class="fine-print">Ubicación ilustrativa. El mapa muestra el centro de Vitoria-Gasteiz, no una sede confirmada.</p>`;}
function ticketHTML(){return `<p class="dialog-lead">Reserva un hueco<br>para lo inesperado.</p><div class="notice"><span>EDICIÓN DE DEMOSTRACIÓN</span><h3>El portal aún no admite reservas.</h3><p>Esta web presenta el concepto de QuantumBeers. La fecha es ilustrativa y todavía no hay entradas a la venta. No se recogen datos personales ni se realizan cargos.</p></div><button class="primary" id="calendar">Guardar fecha de ejemplo ↓</button><p class="fine-print">Se descargará un calendario marcado como «DEMO — fecha sin confirmar».</p>`;}
function balanceHTML(){return `<p class="dialog-lead">Mantén el equilibrio.<br>Desafía la incertidumbre.</p><p>En el evento, una webcam convertirá tu postura en el control de un reto de equilibrio. Aquí puedes probar la mecánica con el ratón, el dedo o las flechas del teclado.</p><div class="balance-game" tabindex="0" aria-label="Reto de equilibrio. Usa flechas izquierda y derecha o arrastra el control."><div class="balance-line"><i class="balance-orb"></i><span class="balance-target"></span></div><div class="balance-score">10.0</div><span class="balance-state">MANTÉN EL QUBIT EN EL CENTRO</span><input id="balance-input" type="range" min="-100" max="100" value="0" aria-label="Control de equilibrio"/><button class="primary" id="start-balance">Comenzar el reto ↗</button></div><p class="fine-print">Demo local de la mecánica. No se activa la cámara ni se envían imágenes.</p>`;}

function openModal(type, index){
  lastFocus=document.activeElement;let title,html;
  if(type==='speaker'){const s=speakers[index];title=s.name;html=`<div class="speaker-profile"><div class="portrait" style="--portrait-color:${s.color}"><span>${s.initials}</span><small>HOLOGRAM / 0${Number(index)+1}</small><div class="portrait-scan"></div></div><div><div class="eyebrow">${s.field}</div><h3>${s.role}</h3><p>${s.bio}</p><div class="talk-info"><small>${s.time} / EN EL AUDITORIO</small><h3>${s.talk}</h3><p>${s.description}</p></div></div></div><p class="fine-print">Perfil y representación ficticios de demostración.</p>`;}
  else {const map={event:['El evento',eventHTML],schedule:['Tu línea temporal',scheduleHTML],sponsors:['Entrelazados con el futuro',sponsorsHTML],location:['Las coordenadas',locationHTML],tickets:['Tu próximo salto',ticketHTML],balance:['Quantum Balance Challenge',balanceHTML]};[title,html]=[map[type][0],map[type][1]()];}
  body.innerHTML=`<h2 id="dialog-title">${title}</h2>${html}`;dialog.showModal();document.body.classList.add('modal-open');
  if(type==='balance')initBalance();
}
function closeModal(){dialog.close();document.body.classList.remove('modal-open');stopGame();lastFocus?.focus();}
document.querySelector('.close-dialog').onclick=closeModal;
dialog.addEventListener('cancel',e=>{e.preventDefault();closeModal();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});

function goTo(index){
  if(quick){document.querySelector(`#read-${chapters[index].id}`)?.scrollIntoView({behavior:'auto'});return;}
  const top=chapterProgress(index)*(document.documentElement.scrollHeight-innerHeight);
  window.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  world?.pulse();
}
function toast(text){const n=document.querySelector('.toast');n.textContent=text;n.classList.add('show');clearTimeout(n.timer);n.timer=setTimeout(()=>n.classList.remove('show'),4500);}
let beerCount=0;
function observeBeer(){beerCount++;world?.pulse();toast(['La cerveza estaba llena. Ahora está… observada. 🍺','Superposición resuelta: una cerveza para ti y otra para tu yo paralelo.','Error 418: el universo es una cervecera.','La espuma existe en todos los universos. Tu sed, solo en este.'][((beerCount-1)%4)]);}
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#"]');if(link&&!link.classList.contains('skip')){const id=link.getAttribute('href').slice(1);const i=chapters.findIndex(c=>c.id===id);if(i>=0){e.preventDefault();goTo(i);history.replaceState(null,'',`#${id}`);document.querySelector('.mobile-nav').hidden=true;document.querySelector('.menu-button').setAttribute('aria-expanded','false');if(link.dataset.detail)openModal(link.dataset.detail);}}
  const modal=e.target.closest('[data-modal]');if(modal)openModal(modal.dataset.modal);
  const speaker=e.target.closest('[data-speaker]');if(speaker)openModal('speaker',Number(speaker.dataset.speaker));
  const sponsor=e.target.closest('[data-sponsor]');if(sponsor){const s=sponsors[sponsor.dataset.sponsor];if(s.url)window.open(s.url,'_blank','noopener');else toast(`${s.name} es una marca ficticia de demostración. Enlace pendiente de confirmar.`);}
  const time=e.target.closest('[data-time]');if(time)showTime(Number(time.dataset.time));
  if(e.target.closest('[data-beer]'))observeBeer();
  if(e.target.closest('#calendar'))downloadCalendar();
});
function showTime(i){const s=schedule[i];document.querySelector('#time-hour').textContent=s.time;document.querySelector('#time-type').textContent=s.type;document.querySelector('#time-title-text').textContent=s.title;document.querySelector('#time-who').textContent=s.who;document.querySelectorAll('[data-time]').forEach((b,j)=>{b.classList.toggle('selected',i===j);b.setAttribute('aria-pressed',String(i===j));});}
document.querySelector('.menu-button').onclick=e=>{const n=document.querySelector('.mobile-nav');n.hidden=!n.hidden;e.currentTarget.setAttribute('aria-expanded',String(!n.hidden));};
document.querySelector('.quick-button').onclick=()=>toggleQuick(!quick);
document.querySelector('.skip').onclick=e=>{e.preventDefault();toggleQuick(true);content.focus();};
function toggleQuick(value, fallback=false){
  quick=value;document.body.classList.toggle('quick-mode',quick);content.hidden=!quick;content.tabIndex=-1;
  document.querySelector('#experience').inert=quick;document.querySelector('.chapter-rail').inert=quick;
  document.querySelector('#motion').setAttribute('aria-pressed',String(quick));document.querySelector('#motion').innerHTML=`${quick?'MOVIMIENTO REDUCIDO':'FULL EXPERIENCE'} <span>◉</span>`;
  world?.setReduced(quick);if(world)world.visible=!quick;
  if(quick){content.innerHTML=`<div class="read-intro"><div class="eyebrow">${fallback?'MODO COMPATIBLE / SIN WEBGL':'MODO LECTURA / SIN MOVIMIENTO'}</div><h1>Un universo de ideas.<br><em>Una noche para conectar.</em></h1><p>QuantumBeers · ${event.date} · Vitoria-Gasteiz · Datos de demostración</p>${fallback?'':'<button class="outline" id="return-world">Volver a la experiencia 3D ↗</button>'}</div><section id="read-inicio"><h2>Reality is overrated. Beer is not.</h2><p>Tecnología, curiosidad y buenas conversaciones.</p></section><section id="read-evento"><div class="eyebrow">01 / EL EVENTO</div><h2>QuantumBeers</h2>${eventHTML()}</section><section id="read-ponentes"><div class="eyebrow">02 / PONENTES</div><h2>Mentes fuera de lo predecible</h2><div class="read-speakers">${speakers.map((s,i)=>`<button data-speaker="${i}"><span>${s.initials}</span><h3>${s.name}</h3><p>${s.role}</p><small>Consultar biografía ↗</small></button>`).join('')}</div><p class="fine-print">Perfiles ficticios de demostración.</p></section><section id="read-programa"><div class="eyebrow">03 / PROGRAMA</div><h2>Tu línea temporal</h2>${scheduleHTML()}</section><section id="read-pub"><div class="eyebrow">04 / THE QUANTUM PUB</div><h2>La ciencia continúa en la barra.</h2><p>Networking, conversaciones con los ponentes y un reto de equilibrio.</p><button class="outline" data-modal="balance">Probar Quantum Balance ↗</button><h3 class="sponsor-heading">Quienes lo hacen posible</h3>${sponsorsHTML()}</section><section id="read-entradas"><div class="eyebrow">05 / TU PRÓXIMO SALTO</div><h2>Nos vemos al otro lado.</h2>${locationHTML()}${ticketHTML()}</section><footer class="read-footer">QUANTUMBEERS / SCIENCE. UNFILTERED.<br>Concepto y datos de demostración.</footer>`;document.querySelector('#return-world')?.addEventListener('click',()=>toggleQuick(false));}
  window.scrollTo({top:0,behavior:'instant'});
}
document.querySelector('#motion').onclick=()=>toggleQuick(!quick);

function update(){
  if(quick)return;
  const p=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));world?.setProgress(p);const next=chapterAt(p);
  if(next!==current){current=next;chapterNodes.forEach((n,i)=>{n.classList.toggle('active',i===next);n.inert=i!==next;});document.querySelectorAll('.chapter-rail a').forEach((n,i)=>{n.classList.toggle('active',i===next);if(i===next)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});document.querySelector('#chapter-number').textContent=`0${next+1} / 06`;document.querySelector('#chapter-name').textContent=chapters[next].name.toUpperCase();document.body.dataset.chapter=next;}
  document.querySelector('.progress-line i').style.width=`${p*100}%`;
  const heroOpacity=clamp(1-p*15);document.querySelector('.hero-wordmark').style.opacity=heroOpacity;document.querySelector('.portal-label').style.opacity=heroOpacity;
  if(next===3)showTime(Math.min(5,Math.floor(clamp((p-.57)/.18)*6)));
}
addEventListener('scroll',update,{passive:true});
// Native scrolling remains usable with touch, wheel, PageDown, Home and End.
addEventListener('keydown',e=>{if(dialog.open||quick||e.target.closest('button,a,input'))return;if(e.key==='ArrowRight'){e.preventDefault();goTo(Math.min(5,current+1));}if(e.key==='ArrowLeft'){e.preventDefault();goTo(Math.max(0,current-1));}});

async function toggleSound(){
  if(!sound){try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();const master=audioContext.createGain();master.gain.setValueAtTime(0,audioContext.currentTime);master.gain.linearRampToValueAtTime(.045,audioContext.currentTime+2);master.connect(audioContext.destination);for(const f of [55,82.41,110.2]){const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.connect(master);o.start();audioNodes.push(o);}audioNodes.push(master);sound=true;}catch{toast('El sonido no está disponible en este dispositivo.');return;}}
  else{audioNodes.forEach(n=>{if(n.stop)n.stop();n.disconnect();});audioNodes=[];sound=false;}
  document.querySelector('#sound').innerHTML=`<span class="sound-bars ${sound?'playing':''}">ıııı</span> SOUND ${sound?'ON':'OFF'}`;document.querySelector('#sound').setAttribute('aria-pressed',String(sound));document.querySelector('#sound').setAttribute('aria-label',sound?'Desactivar sonido ambiente':'Activar sonido ambiente');
}
document.querySelector('#sound').onclick=toggleSound;
document.addEventListener('visibilitychange',()=>{if(audioContext){if(document.hidden)audioContext.suspend();else if(sound)audioContext.resume();}});
function downloadCalendar(){const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//QuantumBeers//Demo//ES','BEGIN:VEVENT','UID:quantumbeers-demo-20261203@quantumbeers.example','DTSTAMP:20261101T000000Z','DTSTART:20261203T170000Z','DTEND:20261203T220000Z','SUMMARY:DEMO — QuantumBeers (fecha sin confirmar)','DESCRIPTION:Evento ficticio de demostración. No constituye una reserva.','LOCATION:Vitoria-Gasteiz - sede sin confirmar','STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR'].join('\r\n');const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='quantumbeers-demo.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Calendario de ejemplo descargado. Fecha sin confirmar.');}

let gameFrame=0, gameRunning=false;
function stopGame(){gameRunning=false;cancelAnimationFrame(gameFrame);}
function initBalance(){
  const area=body.querySelector('.balance-game'),input=body.querySelector('#balance-input'),orb=body.querySelector('.balance-orb'),score=body.querySelector('.balance-score'),state=body.querySelector('.balance-state'),start=body.querySelector('#start-balance');
  let startAt=0,previous=0,total=0;
  area.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();input.value=clamp(Number(input.value)+(e.key==='ArrowLeft'?-5:5),-100,100);}});
  start.onclick=()=>{stopGame();gameRunning=true;startAt=performance.now();previous=startAt;total=0;start.hidden=true;input.value=0;area.focus();state.textContent='COMPENSA EL MOVIMIENTO CON EL CONTROL';
    function tick(now){if(!gameRunning)return;const elapsed=(now-startAt)/1000;const offset=Number(input.value)*.48+Math.sin(elapsed*1.9)*22+Math.sin(elapsed*3.1)*8;orb.style.left=`${clamp(50+offset,3,97)}%`;if(Math.abs(offset)<12)total+=(now-previous)/1000;previous=now;score.textContent=Math.max(0,10-elapsed).toFixed(1);if(elapsed>=10){gameRunning=false;state.textContent=`${total.toFixed(1)} S EN EQUILIBRIO · ${total>6?'¡ESTADO CUÁNTICO ESTABLE!':'PRUEBA OTRA SUPERPOSICIÓN'}`;start.textContent='Volver a intentarlo ↗';start.hidden=false;return;}gameFrame=requestAnimationFrame(tick);}gameFrame=requestAnimationFrame(tick);
  };
}

async function boot(){
  try{const {QuantumWorld}=await import('./world.js');world=new QuantumWorld(canvas,{onReady:()=>document.querySelector('.loader').classList.add('loaded'),onObject:action=>{if(action.startsWith('speaker:'))openModal('speaker',Number(action.split(':')[1]));else if(action==='beer')observeBeer();else if(action==='portal'){world.pulse();goTo(1);}else openModal(action);},onQuality:()=>{document.body.dataset.quality='eco';}});}
  catch(error){console.error('WebGL initialization:',error);toggleQuick(true,true);document.querySelector('.loader').classList.add('loaded');document.querySelector('#motion').disabled=true;document.querySelector('.quick-button').disabled=true;}
  if(quick&&world)toggleQuick(true);
  const idx=chapters.findIndex(c=>`#${c.id}`===location.hash);if(idx>0)goTo(idx);update();
}
canvas.addEventListener('world-error',()=>{world?.dispose();world=null;toggleQuick(true,true);toast('Se ha activado la vista compatible. Toda la información sigue disponible.');});
boot();
