import * as THREE from './three.module.js';
import { buildRollPlan, rollPosition, rollSteps } from './roll-physics.js?v=roll-physics-1';
import { fullscreenButtonState, shouldShowStageActions } from './fullscreen-controls.js?v=fullscreen-controls-1';
import { WIDE_CAMERA_POS, WIDE_CAMERA_TARGET } from './wide-camera.js?v=ref-shot-20';
import { orbitFromOffset, orbitAround, nudgeOrbit, startPointer, stepPointer, releaseIsTap, pinchScale } from './orbit-camera.js?v=one-finger-1';
import { buildMachine, BALL_R } from './machine-model.js?v=ref-shot-27';
import { MIX_OMEGA, stepDrumMix, readDrumBody } from './drum-mix.js?v=mix-pile-3';
import { sceneTapAction } from './scene-tap.js?v=local-preview-reveal-skip-1';
import { lineupSlots } from './lineup.js?v=tv-reveal-1';
import {CompatibleRenderer} from './compat.js?v=ref-shot-27';
import {resetTickets,addTicket,finishTickets,getTicketsCopyText} from './tickets.js?v=button3';
import {MAX_REHEARSAL_ENTRIES,parseTicketFields,extractTicketRowsFromOcr,mergeTicketRows,buildRehearsalDraw}from './ticket-input.js?v=ticket-grid-5';
import {MUSIC_STORAGE_KEY,DEFAULT_TRACK_URL,DEFAULT_TRACK_NAME,MUSIC_LOOPS,clampVolume,readMusicPrefs,writeMusicPrefs,musicControlState} from './music-panel.js?v=music-panel-1';
import { openCelebration } from './celebration.js?v=celebration-4';
const $=id=>document.getElementById(id);
const reds=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const blues=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
const colorOf=n=>reds.has(n)?'red':blues.has(n)?'blue':'green';
function uniform(n){const a=new Uint32Array(1),limit=4294967296-(4294967296%n);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function randomDraw(){const a=Array.from({length:49},(_,i)=>i+1);for(let i=48;i>0;i--){const j=uniform(i+1);[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,7);}
let quickActive=false,quickSession=false;
let phase='idle',paused=false,elapsed=0,order=[],revealed=[],extracting=null,nextIndex=0,view='wide',rate=Number($('speed').value),soundOn=false,machineOn=false,audio=null,effectsBus=null,motor=null,motorTone=null,motorNoise=null,rolling=null,lastBallHit=-1,sortStarted=false,trayMoves=[];
let immersiveMode=false,nativeFullscreenActive=false;
function storedMusicPrefs(){try{return readMusicPrefs(localStorage.getItem(MUSIC_STORAGE_KEY));}catch{return readMusicPrefs(null);}}
const musicSaved=storedMusicPrefs();soundOn=musicSaved.on;
const soundtrack=new Audio(DEFAULT_TRACK_URL);soundtrack.loop=MUSIC_LOOPS;soundtrack.volume=musicSaved.volume;soundtrack.preload='auto';
let musicTrackLabel=DEFAULT_TRACK_NAME,customTrackUrl=null;
function sortedMain(){return revealed.slice(0,6).sort((a,b)=>a-b);}
function resetSort(){sortStarted=false;trayMoves=[];$('orderlabel').textContent='依出珠次序';$('draworder').hidden=true;$('draworder').textContent='';}
const numbers=$('numbers');
function setStageStatus(text){const node=$('scene-status');if(node)node.textContent=text;}
function updateFullscreenButton(){const button=$('fullscreen-toggle');if(!button)return;const state=fullscreenButtonState(immersiveMode);button.textContent=state.text;button.setAttribute('aria-label',state.ariaLabel);button.setAttribute('aria-pressed',state.pressed);button.dataset.fullscreenMode=nativeFullscreenActive?'native':immersiveMode?'css-fallback':'inactive';}
function syncImmersiveLayout(){const studio=$('studio'),actions=$('live-actions'),overlay=$('live-settings-overlay'),settings=$('inline-settings'),controls=document.querySelector('.controls-card'),secondary=controls?.querySelector('.secondary'),startButton=$('start');if(!studio||!actions||!controls)return;const drawActive=document.body.classList.contains('live-draw'),compactViewport=matchMedia('(max-width:760px)').matches,showActions=shouldShowStageActions({drawActive,immersive:immersiveMode,compactViewport});studio.classList.toggle('is-immersive',immersiveMode);studio.classList.toggle('draw-active',drawActive);document.body.classList.toggle('immersive-view',immersiveMode);actions.hidden=!showActions;if(immersiveMode&&!drawActive&&startButton&&startButton.parentElement!==actions)actions.insertBefore(startButton,actions.firstChild);else if(startButton&&startButton.parentElement!==controls)controls.insertBefore(startButton,secondary);if(showActions&&overlay&&settings&&settings.parentElement!==overlay)overlay.appendChild(settings);else if(!showActions&&settings&&settings.parentElement!==controls){overlay.hidden=true;settings.open=false;controls.appendChild(settings);}if(!drawActive&&!immersiveMode){if(overlay)overlay.hidden=true;if(settings)settings.open=false;}updateFullscreenButton();placeMusicDock();requestAnimationFrame(fitSafeRows);}
function setLiveDrawDisplay(active){document.body.classList.toggle('live-draw',!!active);if(active){const overlay=$('live-settings-overlay'),settings=$('inline-settings');if(overlay)overlay.hidden=true;if(settings)settings.open=false;}else if(!immersiveMode){const overlay=$('live-settings-overlay'),settings=$('inline-settings');if(overlay)overlay.hidden=true;if(settings)settings.open=false;}syncImmersiveLayout();}
function setImmersiveMode(active,native=false){immersiveMode=!!active;nativeFullscreenActive=!!active&&!!native;syncImmersiveLayout();}
async function toggleImmersiveMode(){const studio=$('studio');if(immersiveMode){if(document.fullscreenElement===studio&&document.exitFullscreen){try{await document.exitFullscreen();}catch{}if(document.fullscreenElement!==studio)setImmersiveMode(false);}else setImmersiveMode(false);return;}if(typeof studio.requestFullscreen==='function'){try{await studio.requestFullscreen();setImmersiveMode(true,true);return;}catch{}}setImmersiveMode(true,false);}
function handleFullscreenChange(){const studio=$('studio');if(document.fullscreenElement===studio)setImmersiveMode(true,true);else if(nativeFullscreenActive)setImmersiveMode(false,false);}
function handleImmersiveEscape(event){if(event.key==='Escape'&&immersiveMode&&document.fullscreenElement!==$('studio'))setImmersiveMode(false,false);}
function placeMusicDock(){const dock=$('music-dock'),live=$('live-actions'),home=document.querySelector('.controls-card .secondary');if(!dock||!live||!home)return;const phoneLive=document.body.classList.contains('live-draw')&&matchMedia('(max-width:760px)').matches;const parent=(phoneLive||immersiveMode)?live:home;if(dock.parentElement!==parent){closeMusicSettings();parent.appendChild(dock);}}
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const RESULT_SHOT_DWELL_MS=3200;
let resultShot=null,resultShotStable=false,resultShotStableAt=0,pendingStableFrame=null,resultReturnView='auto';
let batchTotal=4,batchIndex=0,batchResults=[],batchActive=false,roundOrders=[],timelineAt=Date.now(),meditationRehearsalActive=false,rehearsalOrder=null,rehearsalEntries=[],prizeTicketIndex=0,celebrationHold=false,celebrationStop=null;
function selectView(mode){view=mode;const shown=view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===shown);b.setAttribute('aria-pressed',String(b.dataset.view===shown));});const names={auto:'自動運鏡',wide:'全景',close:'近鏡',orbit:'環繞',results:'收珠特寫'};const label=$('camera-summary');if(label)label.textContent=`鏡頭：${names[shown]||names[view]}`;$('result-focus').hidden=true;$('studio').classList.toggle('result-shot',view==='results');}
function leaveResults(){resultShot=null;resultShotStable=false;resultShotStableAt=0;pendingStableFrame=null;$('result-focus').hidden=true;$('studio').classList.remove('result-shot');document.querySelector('[data-view="results"]').disabled=true;if(view==='results')selectView(resultReturnView);}
function fillResultFocus(){const fill=(el,n)=>{el.textContent=String(n).padStart(2,'0');el.className='number '+colorOf(n);el.setAttribute('aria-label','號碼 '+n);};$('focus-numbers').innerHTML=revealed.slice(0,6).map(n=>`<div class="number ${colorOf(n)}" aria-label="正選號碼 ${n}">${String(n).padStart(2,'0')}</div>`).join('');fill($('focus-extra'),revealed[6]);$('focus-order').textContent='依出珠次序 · 即將排序';}
function startResultShot(){qaEvent('result-shot-start',{round:batchIndex+1,drawCount:revealed.length});resultReturnView=view==='results'?resultReturnView:view;resultShotStable=false;resultShotStableAt=0;resultShot={from:camera.position.clone(),target:cameraTarget.clone(),time:0};$('result-focus').hidden=true;document.querySelector('[data-view="results"]').disabled=false;document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=true);selectView('results');setStageStatus('六個正選在左側低位排好 · 特別號留在右側高位格');}

function clearNumbers(){resetSort();numbers.innerHTML=Array.from({length:6},(_,i)=>`<div data-slot="${i}" class="number empty" aria-label="第 ${i+1} 個號碼尚未抽出">—</div>`).join('');$('extra').className='number empty';$('extra').textContent='＋';$('extra').setAttribute('aria-label','特別號碼尚未抽出');}
clearNumbers();
let renderer,scene,camera,root,rotor,balls=[],cupGroup,cupBallLayer,cupBallRecords=[],machineModel=null,clock=new THREE.Clock(),cameraTarget=new THREE.Vector3(0,1.1,0),mouseX=0,machineBounds=null,fitProbeCamera=null,machineFitVertices=null,fitCameraCache=new Map();
const sphereGeo=new THREE.SphereGeometry(BALL_R,22,16),plainBallMaterial=new THREE.MeshStandardMaterial({color:0xf4eddb,roughness:.24,metalness:.04});
let selectorMouth=null,selectorOcclusion=null,receiverEntryStart=null,receiverJunction=null,receiverEntryLane=null;
let mainResultSlot=null,specialResultSlot=null,diverterGatePivot=null;
let diverterGateAngle=0,diverterGateTarget=0,diverterGateState='down',diverterGateTransition=null;
let trayShotUntil=0,cameraHold=false,ballClose=null,snapCamera=false;
let userOrbit=false,orbit=null,orbitDrag=null,pendingLineup=false,lineup=null,lineupLabel=null,revealComplete=false;
const NORMAL_PICKUP_DURATION=3.6;
const SPECIAL_PICKUP_DURATION=3.6;
const pickupStart=i=>quickActive?0.9+i*1.45:8+i*19;
const DRAW_END=8+6*19+SPECIAL_PICKUP_DURATION;
const timelineRate=()=>quickActive?1:rate;
// Clockwise, about one turn a second, so the paddles fling the pile instead of nudging it.
function motorSpeed(){return MIX_OMEGA;}

function envTexture(){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');g.fillStyle='#c6a15a';g.fillRect(0,0,1024,512);const grad=g.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#fff8e6');grad.addColorStop(.28,'#f0c86a');grad.addColorStop(.52,'#1c4658');grad.addColorStop(1,'#e2c078');g.fillStyle=grad;g.fillRect(0,0,1024,512);g.fillStyle='#fff3c4';g.fillRect(80,20,180,240);g.fillStyle='#ffe7a8';g.fillRect(560,40,90,300);g.fillStyle='#f6e2b0';g.fillRect(800,70,160,140);const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
function ballTexture(n){const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle=({red:'#cf292f',blue:'#226596',green:'#23834e'})[colorOf(n)];g.fillRect(0,0,256,128);for(let row=0;row<2;row++)for(let col=0;col<4;col++){const x=32+col*64,y=32+row*64;g.fillStyle='#fff4d1';g.beginPath();g.ellipse(x,y,23,21,0,0,Math.PI*2);g.fill();g.fillStyle='#3b3021';g.font='bold 24px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n,x,y+1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData={number:n,color:colorOf(n)};return t;}
function init(){scene=new THREE.Scene();scene.environment=envTexture();camera=new THREE.PerspectiveCamera(37,1,.1,70);camera.position.set(...WIDE_CAMERA_POS);cameraTarget.set(...WIDE_CAMERA_TARGET);try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{renderer=new CompatibleRenderer(()=>({balls,rotor,cupBallRecords,machineModel,receiverEntryLane,mainResultSlot,specialResultSlot,diverterGatePivot}));$('scene').dataset.renderer='compatible';}renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('scene').appendChild(renderer.domElement);$('loading').remove();
scene.add(new THREE.HemisphereLight(0xfff6e4,0x6d909c,0.95));const key=new THREE.DirectionalLight(0xfff3d2,2.65);key.position.set(3.4,8.2,6.4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=12;key.shadow.bias=-0.00025;key.shadow.normalBias=0.045;key.shadow.camera.near=2;key.shadow.camera.far=24;key.shadow.camera.left=-4.6;key.shadow.camera.right=4.6;key.shadow.camera.top=6.2;key.shadow.camera.bottom=-4.4;const keyTarget=new THREE.Object3D();keyTarget.position.set(-0.25,-0.6,0.35);scene.add(keyTarget);key.target=keyTarget;scene.add(key);const fill=new THREE.DirectionalLight(0xffe8c0,0.32);fill.position.set(-3.2,3.4,1.6);scene.add(fill);const front=new THREE.PointLight(0xffe6b4,8,18);front.position.set(1.8,0.6,6.2);scene.add(front);
root=new THREE.Group();scene.add(root);
const gold=new THREE.MeshStandardMaterial({color:0xe0b44c,metalness:.94,roughness:.16});
const darkGold=new THREE.MeshStandardMaterial({color:0xb1842c,metalness:.9,roughness:.22});
const brightGold=new THREE.MeshStandardMaterial({color:0xf6d278,metalness:.93,roughness:.12});
const glass=new THREE.MeshPhysicalMaterial({color:0xd9f3f1,metalness:0,roughness:.06,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});
const edgeGlass=new THREE.MeshPhysicalMaterial({color:0xe7fbfb,roughness:.08,metalness:.15,transparent:true,opacity:.30,depthWrite:false});
machineModel=buildMachine(THREE,root,{gold,darkGold,brightGold,glass,edgeGlass});
rotor=machineModel.rotor;
selectorMouth=machineModel.selectorMouth;
selectorOcclusion=machineModel.selectorOcclusion;
receiverEntryStart=machineModel.receiverEntryStart;
receiverJunction=machineModel.receiverJunction;
receiverEntryLane=machineModel.receiverEntryLane;
mainResultSlot=machineModel.mainResultSlot;
specialResultSlot=machineModel.specialResultSlot;
diverterGatePivot=machineModel.diverterGatePivot;
const floorMat=new THREE.MeshStandardMaterial({color:0x356674,roughness:.62,metalness:.08});
const floor=new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.62,.18,96),floorMat);
floor.position.y=-3.64;floor.receiveShadow=true;floor.castShadow=false;scene.add(floor);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=512;shadowCanvas.height=512;const shadowCtx=shadowCanvas.getContext('2d');const shadowGrad=shadowCtx.createRadialGradient(256,256,28,256,256,248);shadowGrad.addColorStop(0,'rgba(0,0,0,0.50)');shadowGrad.addColorStop(.42,'rgba(0,0,0,0.22)');shadowGrad.addColorStop(.72,'rgba(0,0,0,0.06)');shadowGrad.addColorStop(1,'rgba(0,0,0,0)');shadowCtx.fillStyle=shadowGrad;shadowCtx.fillRect(0,0,512,512);const contact=new THREE.Mesh(new THREE.PlaneGeometry(3.35,2.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));contact.name='stage-contact-shadow';contact.rotation.x=-Math.PI/2;contact.position.set(-0.48,-3.528,0.65);contact.renderOrder=2;scene.add(contact);
for(let i=0;i<49;i++){const n=i+1,m=new THREE.Mesh(sphereGeo,new THREE.MeshStandardMaterial({map:ballTexture(n),roughness:.28,metalness:.08}));m.castShadow=true;root.add(m);balls.push({n,mesh:m,plainMaterial:m.material,vel:new THREE.Vector3(),state:'rack',rack:machineModel.rackPosition(i)});}
cupGroup=new THREE.Group();cupGroup.name='machine-result-slots';root.add(cupGroup);cupBallLayer=new THREE.Group();cupBallLayer.name='cleared-result-balls';cupGroup.add(cupBallLayer);
resetMachine();root.updateMatrixWorld(true);captureMachineBounds();fitProbeCamera=new THREE.PerspectiveCamera(camera.fov,camera.aspect,camera.near,camera.far);new ResizeObserver(resize).observe($('scene'));if(window.visualViewport){visualViewport.addEventListener('resize',fitSafeRows);visualViewport.addEventListener('scroll',fitSafeRows);}window.addEventListener('resize',fitSafeRows);resize();snapCamera=true;animate();}
function resize(){placeMusicDock();const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fitSafeRows();}
function rowFullyInside(row){
 if(!row||row.hidden)return true;
 const style=getComputedStyle(row);
 if(style.display==='none'||style.visibility==='hidden')return true;
 const vv=window.visualViewport;
 const top=vv?vv.offsetTop:0;
 const left=vv?vv.offsetLeft:0;
 const right=left+(vv?vv.width:innerWidth);
 const bottom=top+(vv?vv.height:innerHeight);
 const parts=[row,...row.querySelectorAll('button,.number')].filter(el=>!el.closest('.music-popover'));
 return parts.every(el=>{
  const r=el.getBoundingClientRect();
  if(r.width<2||r.height<2)return true;
  return r.top>=top-0.5&&r.left>=left-0.5&&r.bottom<=bottom-0.5&&r.right<=right+0.5;
 });
}
function fitSafeRows(){
 for(const id of ['live-actions','numbers']){
  const row=$(id);if(!row)continue;
  row.classList.remove('is-offscreen');
  if(!rowFullyInside(row))row.classList.add('is-offscreen');
 }
}
function resetMachine(){
 clearLineup();
 balls.forEach(b=>{b.mesh.material=b.plainMaterial;b.mesh.position.copy(b.rack);b.mesh.rotation.set(0,.4,0);b.mesh.visible=true;b.state='rack';b.nextKick=0;b.vel.set(0,0,0);});
 rotor.rotation.set(0,0,0);trayShotUntil=0;resetDiverterGate();
}
function clearCupBalls(){cupBallRecords=[];if(!cupBallLayer)return;while(cupBallLayer.children.length){const m=cupBallLayer.children[cupBallLayer.children.length-1];if(m.material&&m.material!==plainBallMaterial)m.material.dispose();cupBallLayer.remove(m);}}
function cupSlot(drawIndex){
 if(drawIndex===6)return machineModel.specialRest.clone();
 return machineModel.mainRests[drawIndex].clone();
}
function showCupBall(b){if(!b.numberedMaterial)b.numberedMaterial=new THREE.MeshStandardMaterial({map:ballTexture(b.n),roughness:.28,metalness:.08});b.mesh.material=b.numberedMaterial;}
function applyRetainer(){
 if(!diverterGatePivot)return;
 const swing=diverterGatePivot.userData.swing;
 if(typeof swing==='number'){diverterGatePivot.rotation.z=diverterGateAngle*swing;return;}
 const base=diverterGatePivot.userData.baseY||0,travel=diverterGatePivot.userData.travel||0.26;
 diverterGatePivot.position.y=base+diverterGateAngle*travel;
}
function setDiverterGate(up,round=batchIndex+1){
 const target=up?1:0;
 if(!diverterGatePivot||(diverterGateTarget===target&&diverterGateTransition===null))return;
 diverterGateTarget=target;diverterGateState=up?'raising':'lowering';
 diverterGateTransition={from:diverterGateAngle,to:target,started:realTime*1000,duration:Math.max(80,520/Math.max(1,rate))};
 qaEvent(up?'retainer-raising':'retainer-lowering',{round,lift:diverterGateAngle,target});
 qaEvent(up?'diverter-opening':'diverter-closing',{round,lift:diverterGateAngle,target});
 setStageStatus(up?'活門打開，特別號轉入右側':'活門關上，右路封住，正選只向左');
}
function updateDiverterGate(){
 if(!diverterGatePivot||!diverterGateTransition)return;
 const tr=diverterGateTransition,t=Math.min(1,(realTime*1000-tr.started)/tr.duration),e=t*t*(3-2*t);
 diverterGateAngle=tr.from+(tr.to-tr.from)*e;applyRetainer();
 if(t>=1){
  diverterGateAngle=tr.to;applyRetainer();diverterGateTransition=null;
  diverterGateState=diverterGateAngle>0.5?'up':'down';
  qaEvent(diverterGateState==='up'?'retainer-up':'retainer-down',{round:batchIndex+1,lift:diverterGateAngle});
  qaEvent(diverterGateState==='up'?'diverter-open':'diverter-closed',{round:batchIndex+1,lift:diverterGateAngle});
  setStageStatus(diverterGateState==='up'?'活門已開，右路通向特別號':'活門已關，六顆正選只向左');
 }
}
function resetDiverterGate(){
 diverterGateAngle=0;diverterGateTarget=0;diverterGateState='down';diverterGateTransition=null;
 applyRetainer();
}
function revealCupTicket(event){const {index,main,extra,order=[]}=event.detail||{};qaEvent('ticket-revealed',{ticket:index});const sorted=[...main].sort((a,b)=>a-b);Array.from(numbers.children).forEach((el,i)=>{const n=sorted[i];el.textContent=String(n).padStart(2,'0');el.className='number '+colorOf(n)+' reveal';el.setAttribute('aria-label',`由小至大第 ${i+1} 個正選號碼：${n}`);});$('extra').textContent=String(extra).padStart(2,'0');$('extra').className='number '+colorOf(extra)+' reveal';$('extra').setAttribute('aria-label',`特別號碼 ${extra}`);$('orderlabel').textContent='由小至大排列';$('draworder').hidden=false;$('draworder').textContent='原出珠次序：'+order.map(n=>String(n).padStart(2,'0')).join(' → ');$('instruction').textContent=`第 ${index} 注票券已揭曉並整理號碼；攪珠機已在每注完成後復位到完整 49 球池。`;setStageStatus(`第 ${index} 注票券已揭曉 · 49 球池已復位`);}
function syncDrum(){const enabled=(batchActive&&phase==='sorting')||(!quickActive&&!extracting&&phase!=='sorting'&&(!quickSession||nextIndex<order.length));$('scene').setAttribute('aria-disabled',String(!enabled));}
function updateTiming(){const seconds=Math.round(DRAW_END/rate+2.4);const durationText=rate===1?'每注約 2 分鐘':`每注約 ${seconds} 秒`;document.querySelector('.timing').textContent=`${rate===1?'正常節奏':$('speed').selectedOptions[0].textContent.split(' · ')[0]} · ${durationText}`;updateSettingsSummary();}
function updateSettingsSummary(){const summary=document.querySelector('[data-settings-summary]');if(!summary)return;const speed=$('speed').selectedOptions[0].textContent.split(' · ')[0];summary.textContent=`${speed} · 音樂${soundOn?'開':'關'}`;}
updateTiming();
function setStartLabel(){ $('start').textContent=`開始攪 ${$('entry-count').value} 注 ↗`; }
function begin(){
 if(batchActive||quickActive)return;
 machineOn=true;

 clearCupBalls();quickSession=false;batchTotal=meditationRehearsalActive?1:Number($('entry-count').value);batchIndex=0;batchResults=[];roundOrders=[];
 batchActive=true;$('summary').classList.remove('copy-error');resetTickets(batchTotal);$('entry-count').disabled=true;$('copy').disabled=true;timelineAt=Date.now();beginRound(true);
}
function beginRound(scroll=false){qaEvent('round-start',{round:batchIndex+1});
 leaveResults();clearCupBalls();resetMachine();qaEvent('diverter-gate-reset',{round:batchIndex+1,state:diverterGateState,angle:diverterGateAngle});phase='running';trayShotUntil=0;setLiveDrawDisplay(true);paused=false;elapsed=0;order=meditationRehearsalActive&&rehearsalOrder?rehearsalOrder.slice():randomDraw();roundOrders[batchIndex]=order.slice();revealed=[];extracting=null;qaEvent('round-reset-state',{round:batchIndex+1,rackCount:balls.filter(b=>b.state==='rack').length,cupRecordCount:cupBallRecords.length,activeDrawnCount:balls.filter(b=>b.state==='drawn'||b.state==='extract').length,drawOrderLength:order.length,gateState:diverterGateState,gateAngle:diverterGateAngle});nextIndex=0;clearNumbers();ensureEffects();
 $('start').disabled=true;$('start').textContent=`正在攪第 ${batchIndex+1} / ${batchTotal} 注…`;$('pause').disabled=false;$('pause').textContent='暫停';
 $('status').textContent=`第 ${batchIndex+1} / ${batchTotal} 注 · 彩球入圓鼓`;$('instruction').textContent='透明圓鼓內六片金輻持續順時針攪珠。選中球由鼓底中央透明管落下，掉到平頂中間；活門關上時前六顆只向左滾並依次排好，第七顆特別號時活門打開，滾入右側。';
 $('summary').textContent=`已完成 ${batchIndex} / ${batchTotal} 注，完成的卡片已放在下方。`;$('progressfill').style.width='0%';setStageStatus(`第 ${batchIndex+1} 注抽球中 · 電視鏡頭自動切換`);syncDrum();
 if(soundOn)startAudio();if(scroll){$('studio').focus({preventScroll:true});$('studio').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});}
}
function reset(){
 abortCelebrationHold();
 machineOn=false;meditationRehearsalActive=false;rehearsalOrder=null;rehearsalEntries=[];prizeTicketIndex=0;userOrbit=false;orbit=null;orbitDrag=null;
 setLiveDrawDisplay(false);quickActive=false;quickSession=false;batchActive=false;batchIndex=0;batchResults=[];roundOrders=[];timelineAt=Date.now();leaveResults();clearCupBalls();phase='idle';paused=false;elapsed=0;order=[];revealed=[];nextIndex=0;extracting=null;clearNumbers();resetMachine();resetTickets(Number($('entry-count').value));
 $('entry-count').disabled=false;$('summary').classList.remove('copy-error');$('status').textContent='準備就緒';$('step').textContent='49 顆彩球 · 等候入鼓';$('instruction').textContent='準備就緒，等待抽獎開始。';$('start').disabled=false;setStartLabel();$('pause').disabled=true;$('pause').textContent='暫停';$('copy').disabled=true;$('summary').textContent='完成攪珠後，可按鈕揭曉每注，亦可一次複製全部號碼。';$('progressfill').style.width='0%';setMotor(0);setRolling(false);setEffectsActive(false);setStageStatus('待機／設定 · 小型構圖');const meditationStatus=$('meditation-status');if(meditationStatus)meditationStatus.textContent='每注輸入一組；彩排每次只開一注，隨機挑一注對獎。只屬模擬，不是真實開獎。';syncDrum();
 if(camera&&(view==='wide'||view==='auto')){camera.position.set(...WIDE_CAMERA_POS);cameraTarget.set(...WIDE_CAMERA_TARGET);camera.lookAt(cameraTarget);snapCamera=true;}
}
function completeBatchFinish(){
 phase='done';batchActive=false;machineOn=false;finishTickets();setStageStatus(meditationRehearsalActive?'中獎彩排完成 · 你輸入的六個正選已出現':'本批已完成 · 球池已復位 · 各注結果保留在票券');setLiveDrawDisplay(false);$('entry-count').disabled=false;$('status').textContent=`${batchTotal} 注全部完成`;$('step').textContent='到下方按「揭曉」查看號碼';$('instruction').textContent=meditationRehearsalActive?'本次只開一注；按下方「揭曉」查看號碼。':'攪珠完成！機台已復位到完整 49 球池；按下方「揭曉」查看各注獨立票券。';$('start').disabled=false;setStartLabel();$('copy').disabled=false;$('summary').textContent=meditationRehearsalActive?'彩排只開一注；按「揭曉」查看，或複製號碼。':`已完成 ${batchTotal} 注，向下按鈕揭曉或一次複製全部；單式填寫只用每注六個正選。`;setMotor(0);setRolling(false);setEffectsActive(false);syncDrum();meditationRehearsalActive=false;rehearsalOrder=null;rehearsalEntries=[];prizeTicketIndex=0;
}
function finishRound({skipped=false}={}){
 if(celebrationHold)return;
 if(!batchActive||phase!=='sorting'||(!revealComplete&&!skipped))return;
 revealComplete=false;
 if(skipped)qaEvent('result-reveal-skipped',{round:batchIndex+1});else qaEvent('result-shot-dwell-complete',{round:batchIndex+1,elapsed:performance.now()-resultShotStableAt});qaEvent('round-end',{round:batchIndex+1});const result={main:sortedMain(),extra:revealed[6],index:batchIndex+1};batchResults.push(result);addTicket({...result,order:revealed.slice()});
 if(meditationRehearsalActive&&batchIndex+1>=batchTotal&&beginMeditationCelebration(batchResults,prizeTicketIndex+1))return;
 clearCupBalls();resetMachine();batchIndex++;
 if(batchIndex<batchTotal){beginRound();return;}
 completeBatchFinish();
}
// Unadvertised one-ball interaction, independent of the selected ticket batch.
function powerOn(){
 if(machineOn||batchActive||quickActive||phase==='sorting')return;
 machineOn=true;phase='running';paused=false;elapsed=0;order=[];nextIndex=0;extracting=null;timelineAt=Date.now();
 $('status').textContent='已開機';$('step').textContent='圓鼓攪拌中 · 再拍一下開始';$('instruction').textContent='機已開啟。再拍一下圓鼓，或按「開始攪」正式開攪。';setStageStatus('已開機 · 再拍圓鼓開始攪珠');
 $('start').disabled=false;$('pause').disabled=true;syncDrum();
 const firstFrame=1/60;simulate(firstFrame);rotor.rotation.z+=firstFrame*motorSpeed();updateCamera(firstFrame);renderer.render(scene,camera,true);
 ensureEffects();setMotor(.028);if(soundOn)startAudio();
}
	function startFromDrum(){
	 if(quickActive||extracting||(quickSession&&nextIndex>=order.length))return;
	 const action=sceneTapAction({machineOn,drawing:batchActive&&phase==='running',revealing:batchActive&&phase==='sorting',blocked:false});
	 if(action==='advance'){finishRound({skipped:true});return;}
	 if(action==='power'){powerOn();return;}
	 if(action==='draw'){begin();return;}
	 // During an automatic batch, skip only the wait for the next ball.
	 // Keep the batch, results and selected rate on their existing timeline.
	 if(batchActive){
  updateTimeline();if(paused||extracting||phase!=='running'||nextIndex>=order.length)return;
  elapsed=pickupStart(nextIndex);timelineAt=Date.now();balls.forEach(b=>{b.nextKick=0;});
  const firstFrame=1/60;advanceTimeline(firstFrame);simulate(firstFrame);rotor.rotation.z-=.18;updateCamera(firstFrame);renderer.render(scene,camera,true);
  ensureEffects();setMotor(.028);if(soundOn)startAudio();syncDrum();return;
 }
 if(!quickSession){clearCupBalls();quickSession=true;order=randomDraw();revealed=[];nextIndex=0;clearNumbers();resetMachine();}
 // The manual path starts at pickup, not at the automatic magazine-loading delay.
 balls.forEach(b=>{if(b.state==='rack'||b.state==='fall'){const i=b.n-1;b.mesh.position.set(((i%6)-2.5)*.24,-.72+Math.floor(i/6)*.22,((i%3)-1)*.15);b.state='drum';b.vel.set(0,0,0);}});
 quickActive=true;leaveResults();phase='running';paused=false;elapsed=0;extracting=null;timelineAt=Date.now();balls.forEach(b=>{b.nextKick=0;});
 $('start').disabled=true;$('pause').disabled=false;$('pause').textContent='暫停';$('entry-count').disabled=true;
 $('status').textContent='圓鼓持續順時針攪珠 · 等待選球';$('step').textContent=`已揭曉 ${revealed.length} / ${order.length} 顆`;$('instruction').textContent='正在攪珠…';$('progressfill').style.width='0%';syncDrum();
 // Commit visible motion in this input event, without waiting for release or a timer.
 const firstFrame=1/60;advanceTimeline(firstFrame);simulate(firstFrame);rotor.rotation.z-=.18;updateCamera(firstFrame);renderer.render(scene,camera,true);
 ensureEffects();setMotor(.028);if(soundOn)startAudio();setStageStatus('單顆抽珠中 · 電視式自動運鏡');
}
function finishQuickDraw(sorted=false){
 if(phase==='sorting'&&!sorted)return;
 quickActive=false;phase='done';paused=false;$('start').disabled=false;setStartLabel();$('pause').disabled=true;$('pause').textContent='暫停';$('entry-count').disabled=false;
 $('status').textContent=revealed.length===7?'出珠完畢':'出珠完成';$('step').textContent=`已抽出 ${revealed.length} / ${order.length} 顆`;$('instruction').textContent=revealed.length===7?'七顆號碼已全部抽出。':`本次號碼：${String(revealed[revealed.length-1]).padStart(2,'0')}`;$('progressfill').style.width='100%';setMotor(0);setRolling(false);setEffectsActive(false);syncDrum();
}
function reveal(n,i){
 revealed.push(n);trayShotUntil=elapsed+2.4;
 $('instruction').textContent=`第 ${i+1} 顆已在前方承接台停定：${String(n).padStart(2,'0')}。`;
  if(i===6){
   phase='sorting';syncDrum();pendingLineup=true;
   $('status').textContent='特別號近鏡';
   $('step').textContent=`第 ${batchIndex+1} / ${batchTotal} 注 · 特別號碼 ${String(n).padStart(2,'0')}`;
   $('instruction').textContent='特別號先給近鏡，然後六個正選由小至大排成平排，特別號在正下方。';
   $('pause').disabled=true;$('start').textContent='結果特寫中…';$('progressfill').style.width='100%';setMotor(0);
   document.querySelector('[data-view="results"]').disabled=false;
   document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=true);
  }
}
function updateSorting(){if(batchActive&&phase==='sorting')finishRound();}

function simulate(dt){
 const drum=[];
 for(const b of balls){
  if(b.state==='rack'&&elapsed>(b.n-1)*.032){b.state='fall';b.vel.set(Math.sin(b.n*12.71)*.22,-.1,Math.cos(b.n*8.17)*.34);}
  if(b.state==='fall'){
   const p=b.mesh.position;
   b.vel.y-=8.8*dt;
   b.vel.y=Math.min(3.3,b.vel.y);
   const speed=b.vel.length();if(speed>4.6)b.vel.multiplyScalar(4.6/speed);
   p.addScaledVector(b.vel,dt);
   b.vel.multiplyScalar(Math.pow(.994,dt*60));
   b.mesh.rotation.x+=b.vel.y*dt*2;b.mesh.rotation.z-=b.vel.x*dt*2;
   if(p.y<1.30){b.state='drum';playImpact(.19,.72);drum.push(b);}
  }else if(b.state==='drum') drum.push(b);
 }
 if(!drum.length)return;
 const bodies=drum.map(b=>readDrumBody({n:b.n,x:b.mesh.position.x,y:b.mesh.position.y,z:b.mesh.position.z,vx:b.vel.x,vy:b.vel.y,vz:b.vel.z,armed:b.armed,rest:b.rest,nextKick:b.nextKick}));
 stepDrumMix(bodies,dt,{elapsed,rotorZ:rotor.rotation.z,depthLimit:machineModel.drumHalfDepth-BALL_R,onWall:s=>collisionSound(s,.68),onBall:s=>collisionSound(s,.55)});
 drum.forEach((b,i)=>{
  const s=bodies[i];
  b.mesh.position.set(s.x,s.y,s.z);
  b.vel.set(s.vx,s.vy,s.vz);
  b.armed=s.armed;b.rest=s.rest;b.nextKick=s.nextKick;
  b.mesh.rotation.x+=s.vy*dt*2;b.mesh.rotation.z-=s.vx*dt*2;
 });
}
function applyRollPlans(mesh,initialQuaternion,plans){const parentWorld=mesh.parent?mesh.parent.getWorldQuaternion(new THREE.Quaternion()):new THREE.Quaternion();const worldQuaternion=parentWorld.clone().multiply(initialQuaternion);for(const item of plans){for(const step of rollSteps(item.plan,item.progress)){const axis=new THREE.Vector3(...step.axis);worldQuaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,step.angle));}}mesh.quaternion.copy(parentWorld.invert().multiply(worldQuaternion));}
function extraction(){
 if(!extracting&&nextIndex<order.length&&elapsed>=pickupStart(nextIndex)){
  const b=balls.find(b=>b.n===order[nextIndex]);
  const index=nextIndex;b.state='extract';
  const duration=quickActive?1.35:(index===6?SPECIAL_PICKUP_DURATION:NORMAL_PICKUP_DURATION);
  extracting={b,index,start:pickupStart(index),duration,from:b.mesh.position.clone(),rotationStart:b.mesh.quaternion.clone(),dropRollPlan:buildRollPlan(machineModel.dropPath.slice(2),BALL_R),rollPlan:buildRollPlan(index===6?machineModel.specialRoll:machineModel.rollPath(index),BALL_R),tubeLogged:false,rollLogged:false,gateRequested:false,sfx:{slot:false}};
  qaEvent('ball-selected',{round:batchIndex+1,index:index+1,n:b.n});
  ballClose=null;
  $('status').textContent=index===6?'特別號落入鼓底中央透明管':'選中球落入鼓底中央透明管';
  $('step').textContent=`第 ${index+1} / ${order.length} 顆`;nextIndex++;
 }
 if(!extracting)return;
 const e=extracting,t=Math.min(1,(elapsed-e.start)/e.duration),p=e.b.mesh.position;
 const drop=machineModel.dropPath;
 const clamp01=x=>Math.max(0,Math.min(1,x));
 const logTube=()=>{if(e.tubeLogged)return;e.tubeLogged=true;showCupBall(e.b);qaEvent('selector-tube-entry',{round:batchIndex+1,index:e.index+1,n:e.b.n});playImpact(.18,.72);};
 const glide=(a,b,u)=>{p.lerpVectors(a,b,clamp01(u));};
 // Receiver rolling is recalculated from travelled path distance, so timeline catch-up does not add phantom spin.
 if(e.index!==6){
  if(!e.gateRequested){e.gateRequested=true;setDiverterGate(false);}
  // Mouth, down the centre tube, fall onto the flat crown, then left. The gate stays shut across the right mouth.
  if(t<.14){e.b.mesh.visible=true;glide(e.from,drop[0],smooth(t/.14));p.y+=Math.sin(Math.PI*t/.14)*.08;}
  else if(t<.28){logTube();e.b.mesh.visible=true;glide(drop[0],drop[1],smooth((t-.14)/.14));}
  else if(t<.42){logTube();e.b.mesh.visible=true;glide(drop[1],drop[2],smooth((t-.28)/.14));}
  else if(t<.56){logTube();e.b.mesh.visible=true;const u=smooth((t-.42)/.14);p.fromArray(rollPosition(e.dropRollPlan,u));applyRollPlans(e.b.mesh,e.rotationStart,[{plan:e.dropRollPlan,progress:u}]);}
  else{
   logTube();e.b.mesh.visible=true;
   const u=smooth(clamp01((t-.56)/.44));
   p.fromArray(rollPosition(e.rollPlan,u));
   applyRollPlans(e.b.mesh,e.rotationStart,[{plan:e.dropRollPlan,progress:1},{plan:e.rollPlan,progress:u}]);
   if(!e.rollLogged){e.rollLogged=true;qaEvent('ball-rolling-left',{round:batchIndex+1,index:e.index+1,n:e.b.n,color:colorOf(e.b.n)});}
  }
  if(t>=.96&&!e.sfx.slot){e.sfx.slot=true;playImpact(.15,.54);}
  if(t>=1){
   p.copy(machineModel.mainRests[e.index]);e.b.state='drawn';e.b.mesh.visible=true;
   qaEvent('ball-in-cup',{round:batchIndex+1,index:e.index+1,n:e.b.n,color:colorOf(e.b.n),slot:'main'});
   qaEvent('main-ball-rolled-left',{round:batchIndex+1,index:e.index+1,n:e.b.n,drawOrder:e.index+1});
   setStageStatus(e.index===0?'第 1 顆已滾到左壁停定':`第 ${e.index+1} 顆已挨著前一顆，由左至右排好`);
   startBallClose(e.b.mesh);
   reveal(e.b.n,e.index);extracting=null;if(quickActive)finishQuickDraw();
  }
  return;
 }
 // Same continuous fall-and-roll as balls 1–6. The gate starts opening with the
 // selection, so it is clear before the ball reaches the right shoulder.
 // The roll is driven only by this ball's own progress, never parked on the crown.
 if(!e.gateRequested){e.gateRequested=true;setDiverterGate(true);qaEvent('diverter-gate-open',{round:batchIndex+1,index:7,n:e.b.n});setStageStatus('活門打開，特別號轉入右側');}
 if(t<.14){e.b.mesh.visible=true;glide(e.from,drop[0],smooth(t/.14));p.y+=Math.sin(Math.PI*t/.14)*.08;}
 else if(t<.28){logTube();e.b.mesh.visible=true;glide(drop[0],drop[1],smooth((t-.14)/.14));}
 else if(t<.42){logTube();e.b.mesh.visible=true;glide(drop[1],drop[2],smooth((t-.28)/.14));}
 else if(t<.56){logTube();e.b.mesh.visible=true;const u=smooth((t-.42)/.14);p.fromArray(rollPosition(e.dropRollPlan,u));applyRollPlans(e.b.mesh,e.rotationStart,[{plan:e.dropRollPlan,progress:u}]);}
 else{
  logTube();e.b.mesh.visible=true;
  const u=smooth(clamp01((t-.56)/.44));
  p.fromArray(rollPosition(e.rollPlan,u));
  applyRollPlans(e.b.mesh,e.rotationStart,[{plan:e.dropRollPlan,progress:1},{plan:e.rollPlan,progress:u}]);
  if(!e.rollLogged){e.rollLogged=true;qaEvent('special-ball-drops-to-peak',{round:batchIndex+1,index:7,n:e.b.n,gateState:diverterGateState});}
 }
 if(t>=1){
  p.copy(machineModel.specialRest);e.b.state='drawn';e.b.mesh.visible=true;
  if(!e.sfx.slot){e.sfx.slot=true;playImpact(.15,.54);}
  qaEvent('ball-in-cup',{round:batchIndex+1,index:7,n:e.b.n,color:colorOf(e.b.n),slot:'special',gateState:diverterGateState});
  qaEvent('special-ball-rolled-right',{round:batchIndex+1,index:7,n:e.b.n,drawOrder:7});
  setStageStatus('特別號已沿右側短斜面停定');startBallClose(e.b.mesh,true);reveal(e.b.n,e.index);extracting=null;if(quickActive)finishQuickDraw();
 }
}
const smooth=t=>t*t*(3-2*t);
function applyUserOrbit(){
 const eye=orbitAround(WIDE_CAMERA_TARGET,orbit);
 camera.position.set(eye[0],eye[1],eye[2]);
 cameraTarget.set(...WIDE_CAMERA_TARGET);
 camera.lookAt(cameraTarget);
}
function ensureUserOrbit(){
 if(userOrbit&&orbit)return;
 const pivot=WIDE_CAMERA_TARGET;
 orbit=orbitFromOffset([camera.position.x-pivot[0],camera.position.y-pivot[1],camera.position.z-pivot[2]]);
 userOrbit=true;
}
function cameraBusy(){return !!(cameraHold||ballClose||resultShot||lineup||pendingLineup);}
function resetOfficialCamera(){
 if(!camera)return;
 userOrbit=false;orbit=null;orbitDrag=null;ballClose=null;
 if(view==='results')leaveResults();
 selectView('wide');
 camera.position.set(...WIDE_CAMERA_POS);
 cameraTarget.set(...WIDE_CAMERA_TARGET);
 camera.lookAt(cameraTarget);
 snapCamera=true;
 setStageStatus('已回到預設全景');
}
let realTime=0;
const BALL_CLOSE_HOLD=1.6;
const LINEUP_MOVE=0.65;
const PAN_APPROACH=0.45;
const PAN_HOLD=0.7;
const PAN_TRAVEL=0.5;
const PULL_TIME=0.6;
const FRAME_HOLD=2.4;
const LINEUP_CENTER=[0,-1.45,2.15];
function startBallClose(mesh,force=false){if(!mesh||(!force&&view!=='wide'))return;ballClose={mesh,start:realTime,hold:BALL_CLOSE_HOLD};}
function faceLineupBall(mesh){
 mesh.rotation.order='YXZ';
 mesh.rotation.set(Math.PI/4,Math.PI/4,0);
}
function clearLineup(){
 lineup=null;pendingLineup=false;revealComplete=false;ballClose=null;snapCamera=true;hideTvDigits();
 if(lineupLabel){root.remove(lineupLabel);lineupLabel.material.map?.dispose();lineupLabel.material.dispose();lineupLabel=null;}
 document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=false);
 const results=document.querySelector('[data-view="results"]');
 if(results&&view!=='results')results.disabled=true;
}
function lineupPose(slots){
 const pts=[...slots.row.map(s=>s.position),slots.extra.position];
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const p of pts){
  minX=Math.min(minX,p[0]-BALL_R);maxX=Math.max(maxX,p[0]+BALL_R);
  minY=Math.min(minY,p[1]-BALL_R);maxY=Math.max(maxY,p[1]+BALL_R);
 }
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2,z=pts[0][2];
 const vFov=THREE.MathUtils.degToRad(camera.fov);
 const hFov=2*Math.atan(Math.tan(vFov/2)*Math.max(.45,camera.aspect));
 const dist=Math.max((maxX-minX)/2/Math.tan(hFov/2),(maxY-minY)/2/Math.tan(vFov/2))*1.16;
 return {pos:[cx,cy,z+dist],target:[cx,cy,z]};
}
function applyLineupCamera(){
 camera.position.set(...lineup.pose.pos);
 cameraTarget.set(...lineup.pose.target);
 camera.lookAt(cameraTarget);
}
function makeLineupLabel(){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const g=c.getContext('2d');
 g.clearRect(0,0,512,128);
 g.fillStyle='#f4f7f2';
 g.font='700 72px Arial,"PingFang TC","Microsoft JhengHei",sans-serif';
 g.textAlign='center';g.textBaseline='middle';
 g.fillText('特別號碼',256,64);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));
 sprite.name='special-lineup-label';
 sprite.scale.set(0.78,.2,1);
 return sprite;
}
function startLineup(){
 const main=revealed.slice(0,6),special=revealed[6];
 const slots=lineupSlots(main,special,LINEUP_CENTER);
 const byNumber=new Map(balls.map(b=>[b.n,b]));
 const items=[];
 const place=(slot)=>{
  const b=byNumber.get(slot.n);if(!b)return;
  showCupBall(b);b.state='drawn';b.mesh.visible=true;
  items.push({mesh:b.mesh,from:b.mesh.position.clone(),to:new THREE.Vector3(...slot.position)});
 };
 slots.row.forEach(place);place(slots.extra);
 const shown=new Set(items.map(item=>item.mesh));
 balls.forEach(b=>{if(!shown.has(b.mesh))b.mesh.visible=false;});
 if(lineupLabel){root.remove(lineupLabel);lineupLabel.material.map?.dispose();lineupLabel.material.dispose();}
 lineupLabel=makeLineupLabel();
 lineupLabel.position.set(slots.extra.position[0]-0.46,slots.extra.position[1]+0.34,slots.extra.position[2]);
 root.add(lineupLabel);
 lineup={t0:realTime,items,pose:lineupPose(slots),stops:items.slice(0,6).map(item=>item.to.clone()),phase:'arrange',phaseStart:realTime};
 ballClose=null;cameraHold=false;
 applyLineupCamera();
 setStageStatus(`正選由小至大排好 · 特別號碼 ${String(special).padStart(2,'0')}`);
 $('status').textContent='六正選平排 · 特別號在下方';
}
function closeOnBall(point){
 return {pos:[point.x,point.y+0.02,point.z+1.18],target:[point.x,point.y,point.z]};
}
function lerpPose(a,b,u){
 return {
  pos:a.pos.map((v,i)=>v+(b.pos[i]-v)*u),
  target:a.target.map((v,i)=>v+(b.target[i]-v)*u)
 };
}
function applyPose(pose){
 camera.position.set(...pose.pos);
 cameraTarget.set(...pose.target);
 camera.lookAt(cameraTarget);
}
function panPose(t,stops,widePose){
 if(t<PAN_APPROACH)return {done:false,index:0,pose:lerpPose(widePose,closeOnBall(stops[0]),smooth(t/PAN_APPROACH))};
 let time=t-PAN_APPROACH;
 for(let i=0;i<stops.length;i++){
  if(time<PAN_HOLD)return {done:false,index:i,pose:closeOnBall(stops[i])};
  time-=PAN_HOLD;
  if(i===stops.length-1)return {done:true,index:i,pose:closeOnBall(stops[i])};
  if(time<PAN_TRAVEL)return {done:false,index:i,pose:lerpPose(closeOnBall(stops[i]),closeOnBall(stops[i+1]),smooth(time/PAN_TRAVEL))};
  time-=PAN_TRAVEL;
 }
 return {done:true,index:stops.length-1,pose:closeOnBall(stops[stops.length-1])};
}
function tvChip(n){return `<div class="tv-digit ${colorOf(n)}">${n}</div>`;}
function showTvDigits(mode,focusN){
 const board=$('tv-digits');if(!board||revealed.length<7)return;
 const main=[...revealed.slice(0,6)].sort((a,b)=>a-b);
 $('tv-main').innerHTML=main.map(tvChip).join('');
 $('tv-extra').innerHTML=tvChip(revealed[6]);
 $('tv-hero').innerHTML=tvChip(focusN??main[0]);
 board.hidden=false;
 board.classList.toggle('is-pan',mode==='pan');
 board.classList.toggle('is-frame',mode!=='pan');
}
function hideTvDigits(){const board=$('tv-digits');if(board)board.hidden=true;}
function finishLineupCamera(){
 lineup=null;pendingLineup=false;snapCamera=true;hideTvDigits();
 document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=false);
 if(userOrbit&&orbit){applyUserOrbit();return;}
 camera.position.set(...WIDE_CAMERA_POS);
 cameraTarget.set(...WIDE_CAMERA_TARGET);
 camera.lookAt(cameraTarget);
}
function frameCelebrationScene(){
 if(!lineup)return;
 for(const item of lineup.items){item.mesh.position.copy(item.to);faceLineupBall(item.mesh);}
 const pose=lineup.pose,pull=1.22,lift=0.34;
 const targetX=pose.target[0],targetY=pose.target[1]+lift,targetZ=pose.target[2];
 camera.position.set(targetX+(pose.pos[0]-pose.target[0])*pull,targetY+(pose.pos[1]-pose.target[1])*pull,targetZ+(pose.pos[2]-pose.target[2])*pull);
 cameraTarget.set(targetX,targetY,targetZ);
 camera.lookAt(cameraTarget);
}
function presentCelebrationScene(){
 if(revealed.length<7)return;
 pendingLineup=false;ballClose=null;cameraHold=false;
 if(!lineup)startLineup();
 lineup.phase='hold';lineup.phaseStart=realTime;
 if(lineupLabel)lineupLabel.visible=false;
 hideTvDigits();
 frameCelebrationScene();
 if(renderer)renderer.render(scene,camera,true);
}
function updateLineup(){
 if(celebrationHold){frameCelebrationScene();return;}
 const age=realTime-lineup.t0;
 const u=smooth(Math.min(1,age/LINEUP_MOVE));
 for(const item of lineup.items){
  item.mesh.position.lerpVectors(item.from,item.to,u);
  faceLineupBall(item.mesh);
 }
 const sortedShown=[...revealed.slice(0,6)].sort((a,b)=>a-b);
 if(lineup.phase==='arrange'){
  applyLineupCamera();
  showTvDigits('frame',sortedShown[0]);
  if(u>=1){lineup.phase='pan';lineup.phaseStart=realTime;$('status').textContent='逐個近看號碼';}
  return;
 }
 if(lineupLabel)lineupLabel.visible=lineup.phase==='pull'||lineup.phase==='hold';
 if(lineup.phase==='pan'){
  const pan=panPose(realTime-lineup.phaseStart,lineup.stops,lineup.pose);
  applyPose(pan.pose);
  showTvDigits('pan',sortedShown[pan.index]??sortedShown[0]);
  if(pan.done){lineup.phase='pull';lineup.phaseStart=realTime;lineup.fromPose=pan.pose;$('status').textContent='七顆號碼全覽';}
  return;
 }
 if(lineup.phase==='pull'){
  const k=smooth(Math.min(1,(realTime-lineup.phaseStart)/PULL_TIME));
  applyPose(lerpPose(lineup.fromPose,lineup.pose,k));
  showTvDigits('frame',revealed[6]);
  if(k>=1){lineup.phase='hold';lineup.phaseStart=realTime;}
  return;
 }
 applyLineupCamera();
 showTvDigits('frame',revealed[6]);
 if(realTime-lineup.phaseStart<FRAME_HOLD)return;
 if(batchActive){if(!revealComplete){revealComplete=true;pendingStableFrame={round:batchIndex+1,duration:realTime-lineup.t0};}return;}
 finishLineupCamera();
}
function updateCamera(dt){
 if(pendingLineup&&!ballClose&&!lineup&&!cameraHold){
  const specialBall=balls.find(b=>b.n===revealed[6]);
  if(specialBall)startBallClose(specialBall.mesh,true);
  else{pendingLineup=false;startLineup();return;}
 }
 if(ballClose&&!cameraHold&&!resultShot&&(view==='wide'||pendingLineup)){
  const age=realTime-ballClose.start;
  if(age<=ballClose.hold){
   const ball=ballClose.mesh.position,nudge=reducedMotion()?0:age;
   const dist=0.92-nudge*0.05,side=Math.sin(nudge*0.85)*0.1;
   camera.position.set(ball.x+side,ball.y+0.16,ball.z+dist);
   cameraTarget.set(ball.x,ball.y,ball.z);
   camera.lookAt(cameraTarget);
   return;
  }
  ballClose=null;
  if(pendingLineup){pendingLineup=false;startLineup();return;}
  snapCamera=true;
 }
 if(lineup){updateLineup();return;}
 if(cameraHold){camera.lookAt(cameraTarget);return;}
 if(userOrbit&&orbit&&!resultShot&&view!=='results'){snapCamera=false;applyUserOrbit();return;}
 let mode=resultShot?'results':view;
 if(mode==='auto'){
  if(phase==='running'&&extracting){const progress=(elapsed-extracting.start)/extracting.duration;mode=progress>(extracting.index===6?.72:.40)?'results':'close';}
  else if(phase==='running'&&elapsed<trayShotUntil)mode='results';
  else if(phase==='running'){const cut=Math.floor(Math.max(0,elapsed-5)/7)%2;mode=elapsed<5||cut===0?'wide':'close';}
  else mode='wide';
 }
 const desired=new THREE.Vector3(),target=new THREE.Vector3(),aspect=camera.aspect,fit=aspect<.67?1.12:1;
 if(mode==='results'){
  const focus=machineModel.trayFocus;
  const vFov=THREE.MathUtils.degToRad(camera.fov);
  const hFov=2*Math.atan(Math.tan(vFov/2)*Math.max(.45,aspect));
  const distance=Math.max(2.35,(1.7)/Math.tan(hFov/2));
  // Same kind of view as the wood CAD: front-right, slightly above, looking along the trough.
  desired.set(focus.x+distance*0.78,focus.y+distance*0.46,focus.z+distance*0.58);
  target.set(focus.x-0.2,focus.y+0.08,focus.z-0.02);
 }else if(mode==='mix'){
  const distance=Math.max(6.2,3.3/aspect);desired.set(.32,.70,distance);target.set(0,.05,.05);
 }else if(mode==='close'){
  desired.set(0.2,0.85,11.4);target.set(0,0.55,0.15);
 }else if(mode==='orbit'){
  desired.set(Math.sin(realTime*.14)*5,2.45,Math.cos(realTime*.14)*3+10.2*fit);target.set(0,.90,0);
 }else{
  desired.set(...WIDE_CAMERA_POS);target.set(...WIDE_CAMERA_TARGET);
 }
 if(!resultShot&&mode==='close')fitNarrowRunningCamera(mode,desired,target);
 if(mode==='results'&&resultShot){
  resultShot.time+=dt;const t=reducedMotion()?1:smooth(Math.min(1,resultShot.time/2.6));
  camera.position.lerpVectors(resultShot.from,desired,t);cameraTarget.lerpVectors(resultShot.target,target,t);
  if(t===1&&!resultShotStable){
   resultShotStable=true;resultShotStableAt=0;pendingStableFrame={round:batchIndex+1,duration:resultShot.time};
   setStageStatus('六加一承接台特寫已穩定 · 即將下一注');resultShot=null;
   document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=false);
   if(phase==='done'&&!batchActive){setLiveDrawDisplay(false);}
  }
 }else{const blend=snapCamera||reducedMotion()?1:1-Math.exp(-dt*(mode==='results'?2.5:1.8));snapCamera=false;camera.position.lerp(desired,blend);cameraTarget.lerp(target,blend);}
 camera.lookAt(cameraTarget);
}
function captureMachineBounds(){const excluded=new Set(balls.map(b=>b.mesh)),coords=[],v=new THREE.Vector3();machineBounds=new THREE.Box3().makeEmpty();root.traverse(o=>{if(!o.isMesh||excluded.has(o)||!o.geometry?.attributes?.position)return;const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);coords.push(v.x,v.y,v.z);machineBounds.expandByPoint(v);}});machineFitVertices=new Float32Array(coords);}
function fitNarrowRunningCamera(mode,desired,target){if(!machineBounds||!machineFitVertices||!fitProbeCamera)return;const center=machineBounds.getCenter(new THREE.Vector3()),ray=desired.clone().sub(target),baseDistance=ray.length();ray.normalize();const probe=fitProbeCamera,key=[mode,camera.aspect.toFixed(5),camera.fov.toFixed(3),...desired.toArray().map(v=>v.toFixed(3)),...target.toArray().map(v=>v.toFixed(3))].join('|');let fit=fitCameraCache.get(key);if(!fit){let distance=baseDistance,pivot=center.clone();probe.aspect=camera.aspect;probe.fov=camera.fov;probe.near=camera.near;probe.far=camera.far;probe.updateProjectionMatrix();probe.up.copy(camera.up);const v=new THREE.Vector3(),safeSpan=1.80;for(let iteration=0;iteration<24;iteration++){probe.position.copy(pivot).addScaledVector(ray,distance);probe.lookAt(pivot);probe.updateMatrixWorld(true);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let i=0;i<machineFitVertices.length;i+=3){v.set(machineFitVertices[i],machineFitVertices[i+1],machineFitVertices[i+2]).project(probe);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}const spanY=maxY-minY,centerY=(minY+maxY)/2,halfView=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),cosElevation=Math.max(.01,Math.sqrt(1-ray.y*ray.y));if(Math.abs(centerY)>.0005)pivot.y+=centerY*halfView/cosElevation;const extentX=Math.max(Math.abs(minX),Math.abs(maxX));if(Math.abs(centerY)<=.0005&&Math.abs(spanY-safeSpan)<=.001&&extentX<=.82)break;const ratio=spanY/safeSpan;if(Math.abs(ratio-1)>.0005)distance*=Math.pow(ratio,.9);if(extentX>.82)distance*=Math.pow(extentX/.82,.9);}fit={distance,pivotY:pivot.y};fitCameraCache.set(key,fit);}const fittedTarget=new THREE.Vector3(center.x,fit.pivotY,center.z);probe.position.copy(fittedTarget).addScaledVector(ray,fit.distance);desired.copy(probe.position);target.copy(fittedTarget);}
function advanceTimeline(realSeconds){
 let left=realSeconds,guard=0;
 while(left>0&&(batchActive||quickActive)&&!paused&&guard++<10000){
  const d=Math.min(left,.1);left-=d;
  if(phase==='running'){elapsed+=d*timelineRate();extraction();}
  else if(phase==='sorting'){const priorIndex=batchIndex;updateSorting();if(phase!=='sorting'||batchIndex!==priorIndex)break;}
 }
}
function updateTimeline(){const now=Date.now(),dt=Math.max(0,(now-timelineAt)/1000);timelineAt=now;if(batchActive&&!paused)advanceTimeline(dt);}
function animate(){
 requestAnimationFrame(animate);const realDt=Math.min(clock.getDelta(),.1);if(!paused)realTime+=realDt;updateTimeline();if(!paused)updateDiverterGate();
 // Manual cycles advance only with rendered frames; background catch-up must never skip them.
 if(quickActive&&!paused)advanceTimeline(realDt);
 if(phase==='running'&&!paused){if(machineOn&&!batchActive&&!quickActive)elapsed+=realDt*timelineRate();const dt=realDt*timelineRate(),physicsDt=Math.min(dt,.12),steps=Math.max(1,Math.ceil(physicsDt/.012));for(let i=0;i<steps;i++)simulate(physicsDt/steps);rotor.rotation.z+=dt*motorSpeed(elapsed);
 if(batchActive||quickActive){$('progressfill').style.width=Math.min(99,(elapsed/(quickActive?3.5:DRAW_END))*100)+'%';
 if(!extracting){$('status').textContent=(quickActive?'':`第 ${batchIndex+1} / ${batchTotal} 注 · `)+(quickActive?'持續攪珠':elapsed<3?'彩球入鼓':'自動攪珠中');$('step').textContent=`已揭曉 ${revealed.length} / ${order.length} 顆`;}}
 setMotor(.028);const extractProgress=extracting?(elapsed-extracting.start)/extracting.duration:0;setRolling(!!extracting&&extractProgress>=.60&&extractProgress<.99);
 }else{setMotor(0);setRolling(false);}if(!paused||userOrbit)updateCamera(realDt);renderer.render(scene,camera);if(pendingStableFrame){resultShotStableAt=performance.now();qaEvent('result-shot-stable',{round:pendingStableFrame.round,duration:pendingStableFrame.duration});pendingStableFrame=null;}
}
setInterval(updateTimeline,250);
// Required physical effects are unlocked by Start, never by the music toggle.
function initAudio(){
 if(audio)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio unavailable');
 audio=new AC();effectsBus=audio.createGain();effectsBus.gain.value=0;
 const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;
 effectsBus.connect(limiter);limiter.connect(audio.destination);
 motor=audio.createGain();motor.gain.value=0;motor.connect(effectsBus);
 motorTone=audio.createOscillator();motorTone.type='triangle';motorTone.frequency.value=57;
 const toneGain=audio.createGain();toneGain.gain.value=.04;motorTone.connect(toneGain);toneGain.connect(motor);motorTone.start();
 const len=Math.floor(audio.sampleRate*2),buffer=audio.createBuffer(1,len,audio.sampleRate),data=buffer.getChannelData(0);let v=0;
 for(let i=0;i<len;i++){v=(v+(Math.random()*2-1)*.045)*.985;data[i]=v;}
 motorNoise=audio.createBufferSource();motorNoise.buffer=buffer;motorNoise.loop=true;
 const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;
 const noiseGain=audio.createGain();noiseGain.gain.value=.65;motorNoise.connect(filter);filter.connect(noiseGain);noiseGain.connect(motor);motorNoise.start();
 // Rolling texture is enabled only while a ball visibly travels in the receiver.
 const rollBuffer=audio.createBuffer(1,len,audio.sampleRate),rd=rollBuffer.getChannelData(0);
 for(let i=0;i<len;i++){const t=i/audio.sampleRate;rd[i]=(Math.random()*2-1)*(.24+.76*Math.pow(.5+.5*Math.sin(t*2*Math.PI*31),8));}
 const rollSource=audio.createBufferSource();rollSource.buffer=rollBuffer;rollSource.loop=true;
 const rollFilter=audio.createBiquadFilter();rollFilter.type='bandpass';rollFilter.frequency.value=780;rollFilter.Q.value=.55;
 rolling=audio.createGain();rolling.gain.value=0;rollSource.connect(rollFilter);rollFilter.connect(rolling);rolling.connect(effectsBus);rollSource.start();
}
function setEffectsActive(active){if(audio&&effectsBus)effectsBus.gain.setTargetAtTime(active?.85:0,audio.currentTime,.012);}
function ensureEffects(){
 const status=$('effectsstatus');
 try{initAudio();lastBallHit=-1;setEffectsActive(true);const ready=()=>{status.textContent=audio.state==='running'?'碰撞、滾珠、落槽聲 · 與動作同步':'請按「暫停」再「繼續攪珠」以恢復聲音';};
 if(audio.state!=='running')audio.resume().then(ready).catch(()=>{status.textContent='瀏覽器未能播放音效，請按暫停後再繼續。';});else ready();
 }catch{status.textContent='此瀏覽器不支援攪珠音效，請使用新版瀏覽器。';}
}
function persistMusic(){try{localStorage.setItem(MUSIC_STORAGE_KEY,writeMusicPrefs({on:soundOn,volume:soundtrack.volume}));}catch{}}
function syncMusicUi(){const playing=soundOn&&!soundtrack.paused;const state=musicControlState(playing);const playBtn=$('music-play');if(playBtn){playBtn.setAttribute('aria-pressed',String(playing));playBtn.setAttribute('aria-label',state.ariaLabel);playBtn.classList.toggle('is-on',playing);const full=playBtn.querySelector('.music-label-full');if(full)full.textContent=state.label;}const legacy=$('sound');if(legacy){legacy.setAttribute('aria-pressed',String(soundOn));legacy.setAttribute('aria-label',soundOn?'關閉背景音樂':'開啟背景音樂');}const status=$('musicstatus');if(status)status.textContent=playing?'背景音樂播放中':soundOn?'點一下畫面即播放':'背景音樂已關閉';const track=$('music-track');if(track)track.textContent=musicTrackLabel;const vol=$('music-volume');if(vol&&document.activeElement!==vol)vol.value=String(Math.round(soundtrack.volume*100));updateSettingsSummary();persistMusic();}
function playMusic(){soundOn=true;soundtrack.loop=MUSIC_LOOPS;soundtrack.volume=clampVolume(soundtrack.volume);persistMusic();const failed=()=>{const status=$('musicstatus');if(status)status.textContent=`${musicTrackLabel}載入／播放失敗，請檢查音檔後重試。`;};try{soundtrack.play().then(()=>syncMusicUi()).catch(failed);}catch{failed();}syncMusicUi();}
function pauseMusic(){soundOn=false;soundtrack.pause();syncMusicUi();}
function toggleMusic(){if(soundtrack.paused)playMusic();else pauseMusic();}
function closeMusicSettings(){const pop=$('music-popover'),btn=$('music-settings');if(pop)pop.hidden=true;if(btn)btn.setAttribute('aria-expanded','false');}
function toggleMusicSettings(){const pop=$('music-popover'),btn=$('music-settings');if(!pop||!btn)return;const willOpen=pop.hidden;pop.hidden=!willOpen;btn.setAttribute('aria-expanded',String(willOpen));if(!willOpen)return;pop.style.top='auto';pop.style.bottom='calc(100% + 8px)';requestAnimationFrame(()=>{if(pop.hidden)return;const r=pop.getBoundingClientRect();if(r.top<8){pop.style.bottom='auto';pop.style.top='calc(100% + 8px)';}});}
function useDefaultTrack(){if(customTrackUrl){URL.revokeObjectURL(customTrackUrl);customTrackUrl=null;}const resume=!soundtrack.paused||soundOn;soundtrack.src=DEFAULT_TRACK_URL;soundtrack.loop=MUSIC_LOOPS;musicTrackLabel=DEFAULT_TRACK_NAME;if(resume)playMusic();else syncMusicUi();}
function useTrackFile(file){if(!file)return;if(customTrackUrl)URL.revokeObjectURL(customTrackUrl);customTrackUrl=URL.createObjectURL(file);const resume=!soundtrack.paused||soundOn;soundtrack.src=customTrackUrl;soundtrack.loop=MUSIC_LOOPS;musicTrackLabel=file.name;if(resume)playMusic();else syncMusicUi();}
function startAudio(){playMusic();}
function nudgeMusic(){if(!soundOn||!soundtrack.paused)return;soundtrack.loop=MUSIC_LOOPS;soundtrack.play().then(()=>syncMusicUi()).catch(()=>{});}
function setMotor(v){if(motor&&audio){motor.gain.setTargetAtTime(v*2.5,audio.currentTime,.08);motorTone.frequency.setTargetAtTime(57*Math.sqrt(timelineRate()),audio.currentTime,.1);}}
function setRolling(active){if(rolling&&audio)rolling.gain.setTargetAtTime(active?.18:0,audio.currentTime,.018);}
function collisionSound(speed,brightness){if(!audio||audio.state!=='running'||speed<.25||audio.currentTime-lastBallHit<.038)return;lastBallHit=audio.currentTime;playImpact(Math.min(.18,.045+speed*.035),brightness);}
function playImpact(level=.16,brightness=.6){if(!audio||audio.state!=='running'||phase!=='running'||paused)return;const now=audio.currentTime,duration=.075+Math.random()*.055,len=Math.max(1,Math.floor(audio.sampleRate*duration)),buf=audio.createBuffer(1,len,audio.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buf;filter.type='bandpass';filter.frequency.value=500+brightness*1500;filter.Q.value=.7;gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);src.connect(filter);filter.connect(gain);gain.connect(effectsBus);src.start(now);src.stop(now+duration);const thump=audio.createOscillator(),tg=audio.createGain();thump.type='sine';thump.frequency.setValueAtTime(105+Math.random()*35,now);thump.frequency.exponentialRampToValueAtTime(58,now+.075);tg.gain.setValueAtTime(level*.42,now);tg.gain.exponentialRampToValueAtTime(.001,now+.09);thump.connect(tg);tg.connect(effectsBus);thump.start(now);thump.stop(now+.1);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};thump.onended=()=>{thump.disconnect();tg.disconnect();};}
const ticketRowsHost=$('ticket-entry-rows');
function getTicketRows(){return ticketRowsHost?[...ticketRowsHost.querySelectorAll('.ticket-entry-row')]:[];}
function getTicketFieldRows(){return getTicketRows().map(row=>[...row.querySelectorAll('.ticket-number-input')].map(input=>input.value));}
function updateTicketRowLabels(){const rows=getTicketRows();rows.forEach((row,rowIndex)=>{row.setAttribute('aria-label',`第 ${rowIndex+1} 注`);const label=row.querySelector('.ticket-row-label'),remove=row.querySelector('.ticket-row-remove');if(label)label.textContent=`${rowIndex+1}注`;if(remove)remove.setAttribute('aria-label',`刪除第 ${rowIndex+1} 注`);row.querySelectorAll('.ticket-number-input').forEach((input,slot)=>input.setAttribute('aria-label',`第 ${rowIndex+1} 注，第 ${slot+1} 個號碼`));});const add=$('ticket-add');if(add){add.disabled=rows.length>=MAX_REHEARSAL_ENTRIES;add.textContent=rows.length>=MAX_REHEARSAL_ENTRIES?'已達 100 注':'＋ 加一注';}}
function appendTicketEntryRow(values=[],focusFirst=false){if(!ticketRowsHost||getTicketRows().length>=MAX_REHEARSAL_ENTRIES)return null;const row=document.createElement('div');row.className='ticket-entry-row';row.setAttribute('role','group');const label=document.createElement('span');label.className='ticket-row-label';row.append(label);const fields=document.createElement('div');fields.className='ticket-number-fields';const inputs=[];for(let slot=0;slot<6;slot++){const input=document.createElement('input');input.type='text';input.className='ticket-number-input';input.inputMode='numeric';input.pattern='(?:0[1-9]|[1-4][0-9])';input.maxLength=2;input.autocomplete='off';input.placeholder='00';input.setAttribute('aria-describedby','rehearsal-hint');if(values[slot]!==undefined&&values[slot]!==null)input.value=String(values[slot]).padStart(2,'0');inputs.push(input);fields.append(input);input.addEventListener('input',()=>{const digits=input.value.replace(/\D/g,'').slice(0,2);if(input.value!==digits)input.value=digits;updateTicketInputStatus();if(digits.length===2){if(slot<5){inputs[slot+1].focus();}else{const rows=getTicketRows(),next=rows[rows.indexOf(row)+1];if(next)next.querySelector('.ticket-number-input')?.focus();else if(rows.length<MAX_REHEARSAL_ENTRIES)appendTicketEntryRow([],true);}}});input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&slot>0){event.preventDefault();inputs[slot-1].focus();}else if(event.key==='Enter'){event.preventDefault();if(slot<5)inputs[slot+1].focus();else{const rows=getTicketRows(),next=rows[rows.indexOf(row)+1];if(next)next.querySelector('.ticket-number-input')?.focus();else if(rows.length<MAX_REHEARSAL_ENTRIES)appendTicketEntryRow([],true);}}});}row.append(fields);const remove=document.createElement('button');remove.type='button';remove.className='ticket-row-remove';remove.textContent='−';remove.addEventListener('click',()=>{if(getTicketRows().length===1){inputs.forEach(input=>input.value='');inputs[0].focus();}else row.remove();updateTicketRowLabels();updateTicketInputStatus();});row.append(remove);ticketRowsHost.append(row);updateTicketRowLabels();if(focusFirst)inputs[0].focus();return row;}
function setTicketGridRows(entries=[]){if(!ticketRowsHost)return;ticketRowsHost.replaceChildren();entries.slice(0,MAX_REHEARSAL_ENTRIES).forEach(entry=>appendTicketEntryRow(entry,false));if(entries.length<MAX_REHEARSAL_ENTRIES)appendTicketEntryRow([],false,false);updateTicketRowLabels();updateTicketInputStatus();}
function updateTicketInputStatus(){const status=$('meditation-status');if(!status)return;const fields=getTicketFieldRows();if(!fields.some(row=>row.some(value=>value.trim()))){status.textContent='每注六格；每格輸入兩位數（01–49）。';return;}try{const entries=parseTicketFields(fields);status.textContent=`已輸入 ${entries.length} 注；每次彩排只開一注，隨機揀一注對獎。`;}catch(error){status.textContent=error.message;}}
function focusTicketInputForError(error){const rows=getTicketRows(),match=String(error?.message||'').match(/第\s*(\d+)\s*注/),row=rows[Math.max(0,(Number(match?.[1])||1)-1)]||rows[0];if(!row)return;const inputs=[...row.querySelectorAll('.ticket-number-input')],target=inputs.find(input=>!input.value)||inputs[0];target?.focus();}
if(ticketRowsHost&&!ticketRowsHost.children.length)appendTicketEntryRow();
$('ticket-add')?.addEventListener('click',()=>{const row=appendTicketEntryRow([],true);if(!row&&$('meditation-status'))$('meditation-status').textContent='每次彩排最多 100 注。';});
$('meditation-rehearse')?.addEventListener('click',()=>{if(batchActive||quickActive)return;const status=$('meditation-status');try{rehearsalEntries=parseTicketFields(getTicketFieldRows());}catch(error){if(status)status.textContent=error.message;focusTicketInputForError(error);return;}meditationRehearsalActive=true;const draw=buildRehearsalDraw(rehearsalEntries,uniform);prizeTicketIndex=draw.prizeTicketIndex;rehearsalOrder=draw.order;begin();});
let ocrScriptPromise=null;function loadTesseract(){if(window.Tesseract)return Promise.resolve(window.Tesseract);if(!ocrScriptPromise)ocrScriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.async=true;script.onload=()=>resolve(window.Tesseract);script.onerror=()=>{ocrScriptPromise=null;reject(new Error('OCR 引擎載入失敗，請檢查網絡或改為手動輸入。'));};document.head.append(script);});return ocrScriptPromise;}
$('recognize-ticket-photo')?.addEventListener('click',async()=>{
 const file=$('ticket-photo')?.files?.[0],status=$('meditation-status'),button=$('recognize-ticket-photo');
 if(!file){if(status)status.textContent='請先拍攝或選擇一張六合彩相片。';return;}
 const originalLabel=button.textContent;button.disabled=true;button.textContent='載入中…';let worker;
 try{
  if(status)status.textContent='正在載入 OCR，首次使用可能需要數秒。';
  const api=await loadTesseract();
  worker=await api.createWorker('eng',1,{logger:m=>{if(!status)return;if(m.status==='recognizing text'){const percent=Math.round((m.progress||0)*100);status.textContent=`正在辨識號碼 ${percent}%…`;button.textContent=`辨識 ${percent}%`;}else if(m.status==='loading language traineddata'||m.status==='loading tesseract core'){status.textContent='正在載入 OCR 引擎…';button.textContent='載入中…';}}});
  const linesFrom=result=>{const lines=[];for(const block of result?.data?.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){const text=String(line.text||'').trim();if(text)lines.push({text,bbox:line.bbox});}return lines.sort((a,b)=>(a.bbox?.y0??0)-(b.bbox?.y0??0));};
  const ticketLines=lines=>lines.filter(line=>(line.text.match(/\+/g)||[]).length>=3&&line.bbox);
  const textFromLines=lines=>lines.map(line=>line.text).join('\n');
  await worker.setParameters({tessedit_char_whitelist:'0123456789+/',preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
  if(status)status.textContent='正在辨識整張票面…';
  const whole=await worker.recognize(file,{}, {blocks:true});
  const wholeLines=linesFrom(whole),wholeTicketLines=ticketLines(wholeLines);
  const wholeText=wholeTicketLines.length?textFromLines(wholeTicketLines):String(whole.data.text||'');

  await worker.setParameters({tessedit_pageseg_mode:'11'});
  if(status)status.textContent='正在比對票面各行…';
  const scattered=await worker.recognize(file,{}, {blocks:true});
  const scatteredLines=linesFrom(scattered),scatteredTicketLines=ticketLines(scatteredLines);
  const scatteredText=scatteredTicketLines.length?textFromLines(scatteredTicketLines):String(scattered.data.text||'');

  let focusedText='';
  if(scatteredTicketLines.length>=2&&typeof createImageBitmap==='function'){
   try{
    if(status)status.textContent='正在放大號碼區再辨識…';
    const bitmap=await createImageBitmap(file);
    try{
     const boxes=scatteredTicketLines.map(line=>line.bbox).filter(box=>box&&Number.isFinite(box.x0)&&Number.isFinite(box.y0));
     const minX=Math.min(...boxes.map(box=>box.x0)),maxX=Math.max(...boxes.map(box=>box.x1));
     const minY=Math.min(...boxes.map(box=>box.y0)),maxY=Math.max(...boxes.map(box=>box.y1));
     const meanLineHeight=boxes.reduce((sum,box)=>sum+box.y1-box.y0,0)/boxes.length;
     const padX=Math.max(8,Math.round((maxX-minX)*0.025)),padY=Math.max(5,Math.round(meanLineHeight*0.45));
     const left=Math.max(0,Math.floor(minX-padX)),top=Math.max(0,Math.floor(minY-padY));
     const right=Math.min(bitmap.width,Math.ceil(maxX+padX)),bottom=Math.min(bitmap.height,Math.ceil(maxY+padY));
     const width=right-left,height=bottom-top;
     if(width>0&&height>0){
      const scale=Math.min(4,Math.max(1,1800/width)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      const context=canvas.getContext('2d');
      if(context){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,left,top,width,height,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(blob){const focused=await worker.recognize(blob,{}, {blocks:true});focusedText=String(focused.data.text||'');}}
     }
    }finally{bitmap.close?.();}
   }catch{}
  }
  const focusedRows=extractTicketRowsFromOcr(focusedText),scatteredRows=extractTicketRowsFromOcr(scatteredText),wholeRows=extractTicketRowsFromOcr(wholeText);
  let rows;if(scatteredTicketLines.length>=2&&focusedRows.length>=scatteredTicketLines.length)rows=focusedRows;else{rows=mergeTicketRows(focusedRows,scatteredRows);rows=mergeTicketRows(rows,wholeRows);}
  const raw=$('ocr-raw');
  if(raw)raw.textContent=[`整張票面（區塊模式）\n${whole.data.text||'（未辨識到文字）'}`,`整張票面（分散模式）\n${scattered.data.text||'（未辨識到文字）'}`,`放大號碼區\n${focusedText||'（未能裁出號碼區）'}`].join('\n\n---\n\n');
  const rawDetails=$('ocr-details');if(rawDetails)rawDetails.hidden=false;
  if(rows.length>MAX_REHEARSAL_ENTRIES){if(status)status.textContent='相片辨識超過 100 注，請分批辨識。';return;}
  setTicketGridRows(rows);
  const detectedLineCount=Math.max(wholeTicketLines.length,scatteredTicketLines.length);
  if(status)status.textContent=rows.length?(rows.length<detectedLineCount?`辨識到 ${rows.length} 注，可能有漏讀；請核對或手動補上。`:`相片辨識到 ${rows.length} 注；已填入六格，可逐格核對或修改。`):'未辨識到完整注數；請確保相片正面清晰，或手動輸入。';
 }catch(error){if(status)status.textContent=error.message||'相片辨識失敗，請改為手動輸入。';}
 finally{try{if(worker)await worker.terminate();}catch{}button.disabled=false;button.textContent=originalLabel;}
});
$('ticket-photo')?.addEventListener('change',()=>{const file=$('ticket-photo').files?.[0],preview=$('ticket-photo-preview'),status=$('meditation-status');if(!file||!preview)return;if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);const url=URL.createObjectURL(file);preview.dataset.objectUrl=url;preview.src=url;preview.hidden=false;if(status)status.textContent='已選好相片；按「辨識號碼」開始。';});
$('meditation-clear')?.addEventListener('click',()=>{const status=$('meditation-status'),recognize=$('recognize-ticket-photo');if(recognize?.disabled){if(status)status.textContent='辨識中，完成後可清空注單。';return;}const photo=$('ticket-photo'),preview=$('ticket-photo-preview'),details=$('ocr-details'),raw=$('ocr-raw');setTicketGridRows([]);if(photo)photo.value='';if(preview){if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);delete preview.dataset.objectUrl;preview.removeAttribute('src');preview.hidden=true;}if(details){details.open=false;details.hidden=true;}if(raw)raw.textContent='';if(status)status.textContent='已清空注單和相片，可重新輸入或選相。'});
function abortCelebrationHold(){
 celebrationStop?.();celebrationStop=null;
 const dialog=$('meditation-celebration');
 if(dialog&&!dialog.hidden){dialog.hidden=true;dialog.replaceChildren();}
 if(!celebrationHold)return;
 celebrationHold=false;
 if(lineup||pendingLineup||ballClose)clearLineup();
}
function closeMeditationCelebration(){
 const dialog=$('meditation-celebration');
 if(dialog){dialog.hidden=true;dialog.replaceChildren();}
 celebrationStop?.();celebrationStop=null;
 if(!celebrationHold)return;
 celebrationHold=false;
 if(lineup||pendingLineup||ballClose)clearLineup();
 clearCupBalls();resetMachine();batchIndex++;
 completeBatchFinish();
 const reveal=$('tickets')?.querySelector('button');
 if(reveal)reveal.focus();
}
function beginMeditationCelebration(results,ticketIndex){
 const chosen=rehearsalEntries[ticketIndex-1],status=$('meditation-status');
 const match=results.length===1&&results[0].main.length===6&&chosen&&results[0].main.slice().sort((a,b)=>a-b).every((n,i)=>n===chosen.slice().sort((a,b)=>a-b)[i]);
 if(!match){if(status)status.textContent='彩排結果未能對上指定注單，請再試一次。';return false;}
 const dialog=$('meditation-celebration');
 if(!dialog)return false;
 if(status)status.textContent=`彩排完成：只開一注，命中你輸入的第 ${ticketIndex} 注，恭喜！`;
 celebrationHold=true;phase='celebrating';
 presentCelebrationScene();
 if(audio&&audio.state==='suspended')audio.resume().catch(()=>{});
 celebrationStop=openCelebration(dialog,{numbers:results[0].main,ticketIndex,colorOf,reducedMotion:reducedMotion(),audioContext:audio,onClose:closeMeditationCelebration});
 setStageStatus('中獎彩排完成 · 恭喜你中頭獎');
 return true;
}
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||$('meditation-celebration')?.hidden)return;event.preventDefault();event.stopPropagation();closeMeditationCelebration();},true);
document.addEventListener('ticket:revealed',revealCupTicket);$('fullscreen-toggle')?.addEventListener('click',toggleImmersiveMode);document.addEventListener('fullscreenchange',handleFullscreenChange);document.addEventListener('keydown',handleImmersiveEscape);window.addEventListener('resize',syncImmersiveLayout);$('start').addEventListener('click',begin);$('reset').addEventListener('click',reset);$('live-pause')?.addEventListener('click',()=>$('pause').click());$('live-reset')?.addEventListener('click',()=>$('reset').click());$('live-settings-toggle')?.addEventListener('click',()=>{const overlay=$('live-settings-overlay');if(!overlay)return;overlay.hidden=!overlay.hidden;const settings=$('inline-settings');if(settings)settings.open=!overlay.hidden;$('live-settings-toggle').setAttribute('aria-expanded',String(!overlay.hidden));});$('settings-close')?.addEventListener('click',()=>{const settings=$('inline-settings');if(settings)settings.open=false;const overlay=$('live-settings-overlay');if(overlay)overlay.hidden=true;const toggle=$('live-settings-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');});$('pause').addEventListener('click',()=>{updateTimeline();if(phase!=='running')return;paused=!paused;timelineAt=Date.now();syncDrum();$('pause').textContent=paused?'繼續攪珠':'暫停';if($('live-pause'))$('live-pause').textContent=paused?'繼續':'暫停';$('status').textContent=paused?'已暫停':'攪拌中';if(paused){setMotor(0);setRolling(false);setEffectsActive(false);}else{ensureEffects();if(soundOn)startAudio();}});$('speed').addEventListener('change',e=>{updateTimeline();rate=Number(e.target.value);updateTiming();});$('sound').addEventListener('click',toggleMusic);$('music-play')?.addEventListener('click',toggleMusic);$('music-settings')?.addEventListener('click',toggleMusicSettings);$('music-popover-close')?.addEventListener('click',closeMusicSettings);$('music-use-default')?.addEventListener('click',useDefaultTrack);$('music-volume')?.addEventListener('input',()=>{soundtrack.volume=clampVolume(Number($('music-volume').value)/100);persistMusic();});$('music-pick')?.addEventListener('click',()=>$('music-file')?.click());$('music-file')?.addEventListener('change',()=>{const file=$('music-file').files&&$('music-file').files[0];useTrackFile(file);$('music-file').value='';});soundtrack.addEventListener('play',syncMusicUi);soundtrack.addEventListener('pause',syncMusicUi);document.addEventListener('pointerdown',e=>{const pop=$('music-popover'),dock=$('music-dock');if(!pop||pop.hidden||(dock&&dock.contains(e.target)))return;closeMusicSettings();});syncMusicUi();nudgeMusic();document.addEventListener('click',nudgeMusic);document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(phase==='sorting'&&b.dataset.view!=='results')return;userOrbit=false;orbit=null;orbitDrag=null;snapCamera=true;if(b.dataset.view!=='results')resultShot=null;selectView(b.dataset.view);}));$('scene').addEventListener('pointermove',e=>{const r=$('scene').getBoundingClientRect();mouseX=((e.clientX-r.left)/r.width-.5)*2;});$('scene').addEventListener('pointerleave',()=>mouseX=0);
$('entry-count').addEventListener('change',()=>{if(!batchActive&&!quickActive){meditationRehearsalActive=false;rehearsalOrder=null;setStartLabel();resetTickets(Number($('entry-count').value));}});
// Pointer-down is the manual fast-start; pointer-up/click must not draw twice.
$('orbit-reset')?.addEventListener('click',resetOfficialCamera);
const scenePointers=new Map();
function pointerPair(){return [...scenePointers.values()];}
function beginOnePointer(id,x,y){orbitDrag={...startPointer(x,y),id,mode:'one'};}
$('scene').addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 scenePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(scenePointers.size===1)beginOnePointer(e.pointerId,e.clientX,e.clientY);
 else if(scenePointers.size>=2){const [a,b]=pointerPair();orbitDrag={mode:'pinch',dist:Math.hypot(a.x-b.x,a.y-b.y)||1,moved:true};}
 try{$('scene').setPointerCapture(e.pointerId);}catch{}
});
$('scene').addEventListener('pointermove',e=>{
 if(!scenePointers.has(e.pointerId))return;
 scenePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(!orbitDrag)return;
 if(orbitDrag.mode==='one'&&e.pointerId===orbitDrag.id){
  const next=stepPointer(orbitDrag,e.clientX,e.clientY);
  orbitDrag={...next,id:orbitDrag.id,mode:'one'};
  if(!next.moved)return;
  if(cameraBusy()){orbitDrag.x=e.clientX;orbitDrag.y=e.clientY;orbitDrag.startX=e.clientX;orbitDrag.startY=e.clientY;return;}
  ensureUserOrbit();
  orbit=nudgeOrbit(orbit,next.dx,next.dy,1);
  applyUserOrbit();
 }else if(orbitDrag.mode==='pinch'&&scenePointers.size>=2){
  const [a,b]=pointerPair();
  const dist=Math.hypot(a.x-b.x,a.y-b.y)||1;
  const scale=pinchScale(orbitDrag.dist,dist);
  orbitDrag.dist=dist;
  if(cameraBusy()||scale===1)return;
  ensureUserOrbit();
  orbit=nudgeOrbit(orbit,0,0,scale);
  applyUserOrbit();
 }
});
function endScenePointer(id){
 scenePointers.delete(id);
 if(orbitDrag?.mode==='one'&&orbitDrag.id===id){
  const tap=releaseIsTap(orbitDrag);
  orbitDrag=null;
  if(tap)startFromDrum();
  return;
 }
 if(scenePointers.size===1){const [leftId,left]=[...scenePointers.entries()][0];beginOnePointer(leftId,left.x,left.y);orbitDrag.moved=true;}
 else if(scenePointers.size===0)orbitDrag=null;
}
$('scene').addEventListener('pointerup',e=>endScenePointer(e.pointerId));
$('scene').addEventListener('pointercancel',e=>endScenePointer(e.pointerId));
$('scene').addEventListener('wheel',e=>{
 if(cameraBusy())return;
 e.preventDefault();
 ensureUserOrbit();
 const scale=Math.exp(e.deltaY*0.0012);
 orbit=nudgeOrbit(orbit,0,0,1/scale);
 applyUserOrbit();
},{passive:false});
$('scene').addEventListener('click',e=>{if(e.detail===0)startFromDrum();});
$('scene').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)startFromDrum();}});
$('copy').addEventListener('click',async()=>{if(!batchResults.length)return;const text=getTicketsCopyText()+'\n（隨機娛樂模擬，非開獎預測；特別號不是單式填寫號碼。）';const feedback=$('summary');feedback.classList.remove('copy-error');feedback.textContent='';try{await navigator.clipboard.writeText(text);$('copy').textContent='全部已複製 ✓';setTimeout(()=>$('copy').textContent='複製全部號碼 ↗',1800);}catch{feedback.textContent=text+' — 請長按選取複製。';feedback.classList.add('copy-error');}});
document.addEventListener('visibilitychange',()=>{updateTimeline();if(document.hidden){setMotor(0);setRolling(false);}clock.getDelta();});
resetTickets(Number($('entry-count').value));syncDrum();syncImmersiveLayout();
try{init();}catch(error){$('loading').textContent='無法啟動 3D。請使用支援 WebGL 的新版瀏覽器，並開啟硬件加速。';$('start').disabled=true;console.error(error);}


// Read-only QA diagnostics are available only when the preview URL includes ?qa=1.
const qaActive=new URLSearchParams(location.search).has('qa');
window.__goldenDrawQALog=[];
function qaEvent(type,detail={}){if(!qaActive)return;window.__goldenDrawQALog.push({type,time:performance.now(),...detail});}
if(qaActive){window.__goldenDrawPreviewBall=(drift=0)=>{window.__goldenDrawShowFinished();const mesh=balls.find(b=>b.n===31).mesh;const p=mesh.position;const dist=0.92-drift*0.05,side=Math.sin(drift*0.85)*0.1;cameraHold=true;camera.position.set(p.x+side,p.y+0.16,p.z+dist);cameraTarget.set(p.x,p.y,p.z);camera.lookAt(cameraTarget);renderer.render(scene,camera,true);};window.__goldenDrawLookTray=()=>selectView('results');window.__goldenDrawFrame=(which)=>{cameraHold=true;const f=machineModel.trayFocus;if(which==='front'){camera.position.set(0,-1.85,5.35);cameraTarget.set(0,-2.45,1.05);}else if(which==='top'){camera.position.set(0,5.2,1.15);cameraTarget.set(0,-2.2,0.55);}else if(which==='persp'){camera.position.set(1.65,-1.35,3.15);cameraTarget.set(0,-2.45,1.15);}else if(which==='drum'){camera.position.set(0,0.16,3.55);cameraTarget.set(0,0.16,0.4);}else if(which==='drum-side'){camera.position.set(1.55,0.42,2.55);cameraTarget.set(0,0.16,0.45);}else{camera.position.set(f.x+1.15,f.y+0.85,f.z+1.7);cameraTarget.copy(f);}camera.lookAt(cameraTarget);renderer.render(scene,camera,true);};window.__goldenDrawCameraQA=()=>{if(!camera||!renderer)return null;camera.updateMatrixWorld(true);const v=new THREE.Vector3(),rect=renderer.domElement.getBoundingClientRect();function bounds(coords){if(!coords||!coords.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let i=0;i<coords.length;i+=3){v.set(coords[i],coords[i+1],coords[i+2]).project(camera);const x=(v.x+1)*rect.width/2,y=(1-v.y)*rect.height/2;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return{left:minX,top:minY,right:maxX,bottom:maxY,width:maxX-minX,height:maxY-minY,heightPercent:100*(maxY-minY)/rect.height};}const inspectBall=(r,index)=>{const m=r.mesh,map=m.material.map,pixel=map?.image?.getContext('2d').getImageData(0,0,1,1).data;return{n:r.n,drawIndex:r.drawIndex??index,visible:m.visible,numbered:!!map,textureNumber:map?.userData?.number??null,textureColor:map?.userData?.color??null,texturePixel:pixel?Array.from(pixel):null,position:m.position.toArray()};};const cup=cupBallRecords.map((row,ticket)=>row?{ticket:ticket+1,count:row.length,numbered:row.every(r=>!!r.mesh.material.map),balls:row.map(inspectBall)}:null).filter(Boolean),rackBalls=balls.filter(b=>b.state==='rack').map((b,i)=>({n:b.n,visible:b.mesh.visible,textureNumber:b.mesh.material.map?.userData?.number??null,textureColor:b.mesh.material.map?.userData?.color??null}));const activeCup=balls.filter(b=>b.mesh.visible&&(b.state==='drawn'||b.state==='extract'&&b.mesh.material.map)).map(b=>inspectBall(b,order.indexOf(b.n))).sort((a,b)=>a.drawIndex-b.drawIndex);return{phase,paused,view,mode:resultShot?'results':view==='auto'?(phase==='running'?'close':'wide'):view,round:batchIndex+1,batchTotal,drawCount:revealed.length,camera:{position:camera.position.toArray(),target:cameraTarget.toArray(),fov:camera.fov,aspect:camera.aspect},viewport:{canvasWidth:rect.width,canvasHeight:rect.height,canvasLeft:rect.left,canvasTop:rect.top,scene:document.querySelector('#scene').getBoundingClientRect().toJSON(),statusBar:document.querySelector('.stage-caption').getBoundingClientRect().toJSON()},machine:bounds(machineFitVertices),cup,rackBalls,activeCup,pendingExtraction:extracting?{index:extracting.index+1,n:extracting.b.n,progress:Math.min(1,(elapsed-extracting.start)/2.6),position:extracting.b.mesh.position.toArray(),visible:extracting.b.mesh.visible,numbered:!!extracting.b.mesh.material.map,gateState:diverterGateState}:null,machineReset:{rackCount:balls.filter(b=>b.state==='rack').length,activeCount:balls.filter(b=>b.state==='drawn'||b.state==='extract').length,cupRecordCount:cupBallRecords.length,gateState:diverterGateState,gateAngle:diverterGateAngle},drawOrder:order.slice(),revealed:revealed.slice(),resultSlots:(()=>{if(!mainResultSlot||!specialResultSlot)return null;const mp=mainResultSlot.getWorldPosition(new THREE.Vector3()),sp=specialResultSlot.getWorldPosition(new THREE.Vector3()),mq=mainResultSlot.getWorldQuaternion(new THREE.Quaternion()),sq=specialResultSlot.getWorldQuaternion(new THREE.Quaternion()),mr=new THREE.Euler().setFromQuaternion(mq),sr=new THREE.Euler().setFromQuaternion(sq),leftInner=mainResultSlot.localToWorld(new THREE.Vector3(mainResultSlot.userData.slotLength/2,0,0)),rightInner=specialResultSlot.localToWorld(new THREE.Vector3(-specialResultSlot.userData.slotLength/2,0,0)),gatePos=diverterGatePivot?.getWorldPosition(new THREE.Vector3())||null;return{mainCenter:mp.toArray(),specialCenter:sp.toArray(),mainTilt:mr.z,specialTilt:sr.z,mainLength:mainResultSlot.userData.slotLength,specialLength:specialResultSlot.userData.slotLength,lengthRatio:specialResultSlot.userData.slotLength/mainResultSlot.userData.slotLength,mainJunction:leftInner.toArray(),specialJunction:rightInner.toArray(),junctionHeightError:leftInner.y-rightInner.y,junctionGap:Math.hypot(leftInner.x-rightInner.x,leftInner.y-rightInner.y),sameDepthError:sp.z-mp.z,gate:{position:gatePos?.toArray()||null,state:diverterGateState,angle:diverterGateAngle,target:diverterGateTarget,transitioning:!!diverterGateTransition,open:diverterGateState==='open'}};})(),renderer:renderer instanceof CompatibleRenderer?'compatible':'webgl',shot:resultShot?{elapsed:resultShot.time}:null};};}

if(qaActive){window.__goldenDrawLayout=()=>{const rests=machineModel.mainRests.map(p=>p.toArray()),special=machineModel.specialRest.toArray(),drop=machineModel.dropPath.map(p=>p.toArray());const left=rests[0],near=rests[5];const pitch=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;const centre=drop[3],spec=special;return{tubeExit:drop[1],landing:drop[2],centre,verticalDrop:drop[1][1]-drop[2][1],forwardRun:centre[2]-drop[2][2],rests,special,leftPitch:pitch(left,near),rightPitch:pitch(centre,spec),tray:machineModel.receiverEntryLane.position.toArray()};};window.__goldenDrawShowFinished=()=>{const nums=[8,15,23,31,42,47,7];balls.forEach(b=>{const i=nums.indexOf(b.n);if(i<0){b.mesh.visible=false;return;}b.mesh.visible=true;b.mesh.position.copy(i<6?machineModel.mainRests[i]:machineModel.specialRest);b.state='drawn';});renderer.render(scene,camera,true);};window.__goldenDrawGate=(open)=>{diverterGateAngle=open?1:0;diverterGateTarget=diverterGateAngle;diverterGateTransition=null;diverterGateState=open?'up':'down';applyRetainer();cameraHold=true;const blade=diverterGatePivot.getObjectByName('retainer-panel');blade.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(blade);const c=box.getCenter(new THREE.Vector3());camera.position.set(c.x+1.15,c.y+0.85,c.z+1.55);cameraTarget.copy(c);camera.lookAt(cameraTarget);renderer.render(scene,camera,true);return{state:diverterGateState,angle:diverterGateAngle,rotZ:diverterGatePivot.rotation.z,center:c.toArray(),size:box.getSize(new THREE.Vector3()).toArray()};};
window.__goldenDrawSpecialClose=()=>{const nums=[39,1,44,49,27,6,36];revealed=nums.slice();balls.forEach(b=>{const i=nums.indexOf(b.n);if(i<0){b.mesh.visible=false;return;}showCupBall(b);b.mesh.visible=true;b.state='drawn';b.mesh.position.copy(i<6?machineModel.mainRests[i]:machineModel.specialRest);});view='wide';cameraHold=false;resultShot=null;pendingLineup=false;lineup=null;const mesh=balls.find(b=>b.n===36).mesh;startBallClose(mesh);const ball=mesh.position;camera.position.set(ball.x,ball.y+0.16,ball.z+0.92);cameraTarget.copy(ball);camera.lookAt(cameraTarget);renderer.render(scene,camera,true);return{close:!!ballClose,hold:ballClose&&ballClose.hold,pos:camera.position.toArray(),target:cameraTarget.toArray(),ball:ball.toArray()};};
window.__goldenDrawLineup=()=>{revealed=[39,1,44,49,27,6,36];balls.forEach(b=>{const i=revealed.indexOf(b.n);if(i<0){b.mesh.visible=false;return;}showCupBall(b);b.mesh.visible=true;b.state='drawn';b.mesh.position.copy(i<6?machineModel.mainRests[i]:machineModel.specialRest);});cameraHold=false;resultShot=null;pendingLineup=false;startLineup();lineup.t0=realTime-LINEUP_MOVE;updateLineup();renderer.render(scene,camera,true);const placed=lineup.items.map(item=>({n:balls.find(b=>b.mesh===item.mesh).n,y:item.mesh.position.y,x:item.mesh.position.x}));return{cam:camera.position.toArray(),target:cameraTarget.toArray(),flat:placed};};
window.__goldenDrawDigitCard=()=>{window.__goldenDrawLineup();lineup.phase='hold';lineup.phaseStart=realTime;showTvDigits('frame',revealed[6]);applyLineupCamera();renderer.render(scene,camera,true);return{mains:document.querySelector('#tv-main').innerText,extra:document.querySelector('#tv-extra').innerText};};
window.__goldenDrawMix=()=>{const mid=0.16;let above=0,bowl=0,slow=0,maxY=-Infinity,minY=Infinity;const drum=balls.filter(b=>b.state==='drum');for(const b of drum){const y=b.mesh.position.y,s=b.vel.length();if(y>mid)above++;if(y<-0.7)bowl++;if(s<0.45&&y<-0.65)slow++;if(y>maxY)maxY=y;if(y<minY)minY=y;}return{drum:drum.length,above,below:drum.length-above,bowl,slow,maxY,minY,elapsed};};
window.__goldenDrawHoldWide=()=>{ballClose=null;lineup=null;pendingLineup=false;cameraHold=true;camera.position.set(...WIDE_CAMERA_POS);cameraTarget.set(...WIDE_CAMERA_TARGET);camera.lookAt(cameraTarget);};
window.__goldenDrawStepMix=(frames=1)=>{paused=true;const dt=1/60;for(let i=0;i<frames;i++){elapsed+=dt;extraction();simulate(dt);rotor.rotation.z+=dt*motorSpeed();}window.__goldenDrawHoldWide();renderer.render(scene,camera,true);return window.__goldenDrawMix();};}
const shareButton=document.getElementById('share-app');
shareButton?.addEventListener('click',async()=>{const shareData={title:document.title,text:'金球時光｜3D 攪珠遊戲（純粹娛樂模擬，非開獎預測）',url:location.href};try{if(navigator.share&&(!navigator.canShare||navigator.canShare(shareData))){await navigator.share(shareData);return;}await navigator.clipboard.writeText(shareData.url);shareButton.textContent='已複製連結';setTimeout(()=>shareButton.textContent='分享',1800);}catch(error){if(error.name!=='AbortError'){window.prompt('複製以下連結分享：',shareData.url);}}});
