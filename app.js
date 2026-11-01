import * as THREE from './three.module.js';
import { buildMachine } from './machine-model.js?v=remove-result-plaques-1';
import {CompatibleRenderer} from './compat.js?v=shared-entry-final-1';
import {resetTickets,addTicket,finishTickets,getTicketsCopyText} from './tickets.js?v=button3';
const $=id=>document.getElementById(id);
const reds=new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
const blues=new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
const colorOf=n=>reds.has(n)?'red':blues.has(n)?'blue':'green';
function uniform(n){const a=new Uint32Array(1),limit=4294967296-(4294967296%n);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function randomDraw(){const a=Array.from({length:49},(_,i)=>i+1);for(let i=48;i>0;i--){const j=uniform(i+1);[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,7);}
let quickActive=false,quickSession=false;
let phase='idle',paused=false,elapsed=0,order=[],revealed=[],extracting=null,nextIndex=0,view='auto',rate=Number($('speed').value),soundOn=false,audio=null,effectsBus=null,motor=null,motorTone=null,motorNoise=null,rolling=null,lastBallHit=-1,sortStarted=false,trayMoves=[];
const soundtrack=new Audio('./playful-original.mp3');soundtrack.loop=true;soundtrack.volume=.32;soundtrack.preload='none';
function sortedMain(){return revealed.slice(0,6).sort((a,b)=>a-b);}
function resetSort(){sortStarted=false;trayMoves=[];$('orderlabel').textContent='依出珠次序';$('draworder').hidden=true;$('draworder').textContent='';}
const numbers=$('numbers');
function setStageStatus(text){const node=$('scene-status');if(node)node.textContent=text;}
function setLiveDrawDisplay(active){document.body.classList.toggle('live-draw',!!active);const actions=$('live-actions'),overlay=$('live-settings-overlay'),settings=$('inline-settings'),home=document.querySelector('.controls-card');if(actions)actions.hidden=!active;if(active){if(settings&&overlay&&settings.parentElement!==overlay)overlay.appendChild(settings);if(overlay)overlay.hidden=true;if(settings)settings.open=false;}else{if(overlay)overlay.hidden=true;if(settings&&home&&settings.parentElement!==home)home.appendChild(settings);if(settings)settings.open=false;}const toggle=$('live-settings-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');}
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const RESULT_SHOT_DWELL_MS=3200;
let resultShot=null,resultShotStable=false,resultShotStableAt=0,pendingStableFrame=null,resultReturnView='auto';
let batchTotal=4,batchIndex=0,batchResults=[],batchActive=false,roundOrders=[],timelineAt=Date.now();
function selectView(mode){view=mode;const shown=view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===shown);b.setAttribute('aria-pressed',String(b.dataset.view===shown));});const names={auto:'自動運鏡',wide:'全景',close:'近鏡',orbit:'環繞',results:'收珠特寫'};const label=$('camera-summary');if(label)label.textContent=`鏡頭：${names[shown]||names[view]}`;$('result-focus').hidden=true;$('studio').classList.toggle('result-shot',view==='results');}
function leaveResults(){resultShot=null;resultShotStable=false;resultShotStableAt=0;pendingStableFrame=null;$('result-focus').hidden=true;$('studio').classList.remove('result-shot');document.querySelector('[data-view="results"]').disabled=true;if(view==='results')selectView(resultReturnView);}
function fillResultFocus(){const fill=(el,n)=>{el.textContent=String(n).padStart(2,'0');el.className='number '+colorOf(n);el.setAttribute('aria-label','號碼 '+n);};$('focus-numbers').innerHTML=revealed.slice(0,6).map(n=>`<div class="number ${colorOf(n)}" aria-label="正選號碼 ${n}">${String(n).padStart(2,'0')}</div>`).join('');fill($('focus-extra'),revealed[6]);$('focus-order').textContent='依出珠次序 · 即將排序';}
function startResultShot(){qaEvent('result-shot-start',{round:batchIndex+1,drawCount:revealed.length});resultReturnView=view==='results'?resultReturnView:view;resultShotStable=false;resultShotStableAt=0;resultShot={from:camera.position.clone(),target:cameraTarget.clone(),time:0};$('result-focus').hidden=true;document.querySelector('[data-view="results"]').disabled=false;document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=true);selectView('results');setStageStatus('後方共用入口到交會點 · 六球左槽／特別號開閘右轉');}

function clearNumbers(){resetSort();numbers.innerHTML=Array.from({length:6},(_,i)=>`<div data-slot="${i}" class="number empty" aria-label="第 ${i+1} 個號碼尚未抽出">—</div>`).join('');$('extra').className='number empty';$('extra').textContent='＋';$('extra').setAttribute('aria-label','特別號碼尚未抽出');}
clearNumbers();
let renderer,scene,camera,root,rotor,balls=[],cupGroup,cupBallLayer,cupBallRecords=[],machineModel=null,clock=new THREE.Clock(),cameraTarget=new THREE.Vector3(0,1.1,0),mouseX=0,machineBounds=null,fitProbeCamera=null,machineFitVertices=null,fitCameraCache=new Map();
const sphereGeo=new THREE.SphereGeometry(.095,22,16),plainBallMaterial=new THREE.MeshStandardMaterial({color:0xf4eddb,roughness:.24,metalness:.04}),temp=new THREE.Vector3();
let selectorMouth=null,selectorOcclusion=null,receiverEntryStart=null,receiverJunction=null,receiverEntryLane=null;
let mainResultSlot=null,specialResultSlot=null,diverterGatePivot=null;
let diverterGateAngle=0,diverterGateTarget=0,diverterGateState='closed',diverterGateTransition=null;
let trayShotUntil=0;
const NORMAL_PICKUP_DURATION=3.6;
const SPECIAL_PICKUP_DURATION=12;
const pickupStart=i=>quickActive?0.9+i*1.45:8+i*19;
const DRAW_END=8+6*19+SPECIAL_PICKUP_DURATION;
const timelineRate=()=>quickActive?1:rate;
// The supplied video shows clockwise mixing and no clear reversal; ease the speed only slightly at selection.
const spinDirection=()=>-1;
function motorSpeed(){return -3.45;}

function envTexture(){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');g.fillStyle='#6f8290';g.fillRect(0,0,1024,512);const grad=g.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#ffffff');grad.addColorStop(.35,'#b6c4c8');grad.addColorStop(.55,'#2e4757');grad.addColorStop(1,'#a6a398');g.fillStyle=grad;g.fillRect(0,0,1024,512);g.fillStyle='#ffeed1';g.fillRect(90,30,140,220);g.fillStyle='#ffffff';g.fillRect(590,70,70,290);g.fillStyle='#e5edec';g.fillRect(830,90,130,120);const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
function ballTexture(n){const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle=({red:'#cf292f',blue:'#226596',green:'#23834e'})[colorOf(n)];g.fillRect(0,0,256,128);for(let row=0;row<2;row++)for(let col=0;col<4;col++){const x=32+col*64,y=32+row*64;g.fillStyle='#fff4d1';g.beginPath();g.ellipse(x,y,23,21,0,0,Math.PI*2);g.fill();g.fillStyle='#3b3021';g.font='bold 24px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n,x,y+1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData={number:n,color:colorOf(n)};return t;}
function init(){scene=new THREE.Scene();scene.environment=envTexture();camera=new THREE.PerspectiveCamera(37,1,.1,70);camera.position.set(3,2.5,11.6);try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{renderer=new CompatibleRenderer(()=>({balls,rotor,cupBallRecords,machineModel,receiverEntryLane,mainResultSlot,specialResultSlot,diverterGatePivot}));$('scene').dataset.renderer='compatible';}renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('scene').appendChild(renderer.domElement);$('loading').remove();
scene.add(new THREE.HemisphereLight(0xdcecf5,0x72664c,2.3));const key=new THREE.DirectionalLight(0xffe6b7,4.3);key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=7;key.shadow.camera.bottom=-4;key.shadow.bias=-.001;scene.add(key);const rim=new THREE.DirectionalLight(0xcceeff,3);rim.position.set(3,3,-4);scene.add(rim);const front=new THREE.PointLight(0xffd08a,16,12);front.position.set(2,2,4);scene.add(front);
root=new THREE.Group();scene.add(root);
const gold=new THREE.MeshStandardMaterial({color:0xc79a45,metalness:.88,roughness:.23});
const darkGold=new THREE.MeshStandardMaterial({color:0x8e692d,metalness:.8,roughness:.3});
const brightGold=new THREE.MeshStandardMaterial({color:0xe6bb67,metalness:.8,roughness:.2});
const glass=new THREE.MeshPhysicalMaterial({color:0xd6eeec,metalness:0,roughness:.1,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false});
const edgeGlass=new THREE.MeshPhysicalMaterial({color:0xd7f4f4,roughness:.1,metalness:.2,transparent:true,opacity:.16,depthWrite:false});
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
const floorMat=new THREE.MeshStandardMaterial({color:0x254755,roughness:.55,metalness:.2});
const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.7,2.95,.20,96),floorMat);
floor.position.y=-2.74;floor.receiveShadow=true;scene.add(floor);
const stageRing=new THREE.Mesh(new THREE.TorusGeometry(2.71,.012,8,120),gold);
stageRing.rotation.x=Math.PI/2;stageRing.position.y=-2.64;scene.add(stageRing);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({opacity:.22}));
ground.rotation.x=-Math.PI/2;ground.position.y=-2.84;ground.receiveShadow=true;scene.add(ground);
for(let i=0;i<49;i++){const n=i+1,m=new THREE.Mesh(sphereGeo,new THREE.MeshStandardMaterial({map:ballTexture(n),roughness:.28,metalness:.08}));m.castShadow=true;root.add(m);balls.push({n,mesh:m,plainMaterial:m.material,vel:new THREE.Vector3(),state:'rack',rack:new THREE.Vector3(((i%7)-3)*.20,1.98+Math.floor(i/7)*.315,0)});}
cupGroup=new THREE.Group();cupGroup.name='machine-result-slots';root.add(cupGroup);cupBallLayer=new THREE.Group();cupBallLayer.name='cleared-result-balls';cupGroup.add(cupBallLayer);
resetMachine();root.updateMatrixWorld(true);captureMachineBounds();fitProbeCamera=new THREE.PerspectiveCamera(camera.fov,camera.aspect,camera.near,camera.far);new ResizeObserver(resize).observe($('scene'));resize();animate();}
function resize(){const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
function resetMachine(){
 balls.forEach(b=>{b.mesh.material=b.plainMaterial;b.mesh.position.copy(b.rack);b.mesh.rotation.set(0,.4,0);b.mesh.visible=true;b.state='rack';b.nextKick=0;b.vel.set(0,0,0);});
 rotor.rotation.set(0,0,0);trayShotUntil=0;resetDiverterGate();
}
function clearCupBalls(){cupBallRecords=[];if(!cupBallLayer)return;while(cupBallLayer.children.length){const m=cupBallLayer.children[cupBallLayer.children.length-1];if(m.material&&m.material!==plainBallMaterial)m.material.dispose();cupBallLayer.remove(m);}}
function cupSlot(drawIndex){
 if(drawIndex===6)return specialResultSlot.localToWorld(new THREE.Vector3(.22,.145,0));
 // Video order reads left-to-right in the long main lane; later arrivals stop to the right.
 const localX=-.75+drawIndex*.27;
 return mainResultSlot.localToWorld(new THREE.Vector3(localX,.145,0));
}
function showCupBall(b){if(!b.numberedMaterial)b.numberedMaterial=new THREE.MeshStandardMaterial({map:ballTexture(b.n),roughness:.28,metalness:.08});b.mesh.material=b.numberedMaterial;}
function setDiverterGate(open,round=batchIndex+1){
 const target=open?Math.PI/2:0;
 if(!diverterGatePivot||(diverterGateTarget===target&&diverterGateTransition===null))return;
 diverterGateTarget=target;diverterGateState=open?'opening':'closing';
 diverterGateTransition={from:diverterGateAngle,to:target,started:realTime*1000,duration:Math.max(60,450/Math.max(1,rate))};
 qaEvent(open?'diverter-gate-opening':'diverter-gate-closing',{round,angle:diverterGateAngle,target});
 setStageStatus(open?'右側特別號分流片開啟中':'特別號已通過分流點 · 分流片關閉中');
}
function updateDiverterGate(){
 if(!diverterGatePivot||!diverterGateTransition)return;
 const tr=diverterGateTransition,t=Math.min(1,(realTime*1000-tr.started)/tr.duration),e=t*t*(3-2*t);
 diverterGateAngle=tr.from+(tr.to-tr.from)*e;diverterGatePivot.rotation.y=diverterGateAngle;
 if(t>=1){
  diverterGateAngle=tr.to;diverterGatePivot.rotation.y=diverterGateAngle;diverterGateTransition=null;
  diverterGateState=diverterGateAngle===0?'closed':'open';
  qaEvent(diverterGateState==='open'?'diverter-gate-open':'diverter-gate-closed',{round:batchIndex+1,angle:diverterGateAngle});
  setStageStatus(diverterGateState==='open'?'右側特別號分流片已開啟':'六加一結果已入承接台 · 分流片已關');
 }
}
function resetDiverterGate(){
 diverterGateAngle=0;diverterGateTarget=0;diverterGateState='closed';diverterGateTransition=null;
 if(diverterGatePivot)diverterGatePivot.rotation.y=0;
}
function revealCupTicket(event){const {index,main,extra,order=[]}=event.detail||{};qaEvent('ticket-revealed',{ticket:index});const sorted=[...main].sort((a,b)=>a-b);Array.from(numbers.children).forEach((el,i)=>{const n=sorted[i];el.textContent=String(n).padStart(2,'0');el.className='number '+colorOf(n)+' reveal';el.setAttribute('aria-label',`由小至大第 ${i+1} 個正選號碼：${n}`);});$('extra').textContent=String(extra).padStart(2,'0');$('extra').className='number '+colorOf(extra)+' reveal';$('extra').setAttribute('aria-label',`特別號碼 ${extra}`);$('orderlabel').textContent='由小至大排列';$('draworder').hidden=false;$('draworder').textContent='原出珠次序：'+order.map(n=>String(n).padStart(2,'0')).join(' → ');$('instruction').textContent=`第 ${index} 注票券已揭曉並整理號碼；攪珠機已在每注完成後復位到完整 49 球池。`;setStageStatus(`第 ${index} 注票券已揭曉 · 49 球池已復位`);}
function syncDrum(){const enabled=!quickActive&&!extracting&&phase!=='sorting'&&(!quickSession||nextIndex<order.length);$('scene').setAttribute('aria-disabled',String(!enabled));}
function updateTiming(){const seconds=Math.round(DRAW_END/rate+2.4);const durationText=rate===1?'每注約 2 分鐘':`每注約 ${seconds} 秒`;document.querySelector('.timing').textContent=`${rate===1?'正常節奏':$('speed').selectedOptions[0].textContent.split(' · ')[0]} · ${durationText}`;updateSettingsSummary();}
function updateSettingsSummary(){const summary=document.querySelector('[data-settings-summary]');if(!summary)return;const speed=$('speed').selectedOptions[0].textContent.split(' · ')[0];summary.textContent=`${speed} · 音樂${soundOn?'開':'關'}`;}
updateTiming();
function setStartLabel(){ $('start').textContent=`開始攪 ${$('entry-count').value} 注 ↗`; }
function begin(){
 if(batchActive||quickActive)return;
 clearCupBalls();quickSession=false;batchTotal=Number($('entry-count').value);batchIndex=0;batchResults=[];roundOrders=[];
 batchActive=true;$('summary').classList.remove('copy-error');resetTickets(batchTotal);$('entry-count').disabled=true;$('copy').disabled=true;timelineAt=Date.now();beginRound(true);
}
function beginRound(scroll=false){qaEvent('round-start',{round:batchIndex+1});
 leaveResults();clearCupBalls();resetMachine();qaEvent('diverter-gate-reset',{round:batchIndex+1,state:diverterGateState,angle:diverterGateAngle});phase='running';selectView('auto');trayShotUntil=0;setLiveDrawDisplay(true);paused=false;elapsed=0;order=randomDraw();roundOrders[batchIndex]=order.slice();revealed=[];extracting=null;qaEvent('round-reset-state',{round:batchIndex+1,rackCount:balls.filter(b=>b.state==='rack').length,cupRecordCount:cupBallRecords.length,activeDrawnCount:balls.filter(b=>b.state==='drawn'||b.state==='extract').length,drawOrderLength:order.length,gateState:diverterGateState,gateAngle:diverterGateAngle});nextIndex=0;clearNumbers();ensureEffects();
 $('start').disabled=true;$('start').textContent=`正在攪第 ${batchIndex+1} / ${batchTotal} 注…`;$('pause').disabled=false;$('pause').textContent='暫停';
 $('status').textContent=`第 ${batchIndex+1} / ${batchTotal} 注 · 彩球入圓鼓`;$('instruction').textContent='透明圓鼓內持續順時針攪珠；選中球進入鼓底中央直管後被機身遮擋，切到承接台才在後方共用入口現身，再滾向交會點分流。';
 $('summary').textContent=`已完成 ${batchIndex} / ${batchTotal} 注，完成的卡片已放在下方。`;$('progressfill').style.width='0%';setStageStatus(`第 ${batchIndex+1} 注抽球中 · 電視鏡頭自動切換`);syncDrum();
 if(soundOn)startAudio();if(scroll){$('studio').focus({preventScroll:true});$('studio').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});}
}
function reset(){
 setLiveDrawDisplay(false);quickActive=false;quickSession=false;batchActive=false;batchIndex=0;batchResults=[];roundOrders=[];timelineAt=Date.now();leaveResults();clearCupBalls();selectView('auto');phase='idle';paused=false;elapsed=0;order=[];revealed=[];nextIndex=0;extracting=null;clearNumbers();resetMachine();resetTickets(Number($('entry-count').value));
 $('entry-count').disabled=false;$('summary').classList.remove('copy-error');$('status').textContent='準備就緒';$('step').textContent='49 顆彩球 · 等候入鼓';$('instruction').textContent='準備就緒，等待抽獎開始。';$('start').disabled=false;setStartLabel();$('pause').disabled=true;$('pause').textContent='暫停';$('copy').disabled=true;$('summary').textContent='完成攪珠後，可按鈕揭曉每注，亦可一次複製全部號碼。';$('progressfill').style.width='0%';setMotor(0);setRolling(false);setEffectsActive(false);setStageStatus('待機／設定 · 小型構圖');syncDrum();
}
function finishRound(){
 if(!batchActive||phase!=='sorting'||!resultShotStable||!resultShotStableAt||performance.now()-resultShotStableAt<RESULT_SHOT_DWELL_MS)return;
 qaEvent('result-shot-dwell-complete',{round:batchIndex+1,elapsed:performance.now()-resultShotStableAt});qaEvent('round-end',{round:batchIndex+1});const result={main:sortedMain(),extra:revealed[6],index:batchIndex+1};batchResults.push(result);addTicket({...result,order:revealed.slice()});clearCupBalls();resetMachine();batchIndex++;
 if(batchIndex<batchTotal){beginRound();return;}
 phase='done';batchActive=false;finishTickets();setStageStatus('本批已完成 · 球池已復位 · 各注結果保留在票券');setLiveDrawDisplay(false);selectView('auto');$('entry-count').disabled=false;$('status').textContent=`${batchTotal} 注全部完成`;$('step').textContent='到下方按「揭曉」查看號碼';$('instruction').textContent='攪珠完成！機台已復位到完整 49 球池；按下方「揭曉」查看各注獨立票券。';$('start').disabled=false;setStartLabel();$('copy').disabled=false;$('summary').textContent=`已完成 ${batchTotal} 注，向下按鈕揭曉或一次複製全部；單式填寫只用每注六個正選。`;setMotor(0);setRolling(false);setEffectsActive(false);syncDrum();
}
// Unadvertised one-ball interaction, independent of the selected ticket batch.
	function startFromDrum(){
	 if(quickActive||phase==='sorting'||extracting||(quickSession&&nextIndex>=order.length))return;
	 // From standby, reuse Start's selected-batch initialization before advancing one ball.
	 if(!batchActive&&!quickActive&&phase==='idle')begin();
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
 balls.forEach(b=>{if(b.state==='rack'||b.state==='fall'){const i=b.n-1;b.mesh.position.set((i%7-3)*.255,-.85+Math.floor(i/7)*.25,((i%3)-1)*.16);b.state='drum';b.vel.set(0,0,0);}});
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
  phase='sorting';syncDrum();startResultShot();
  $('status').textContent='六顆正選在左長槽 · 特別號在右短格';
  $('step').textContent=`第 ${batchIndex+1} / ${batchTotal} 注 · 六正選＋一特別號已入承接台`;
  $('instruction').textContent='球由後方共用入口滾到交會點；前六顆沿共面斜槽進入左側長槽，第七顆到達交會點後活門打開，再轉入右側短格。票券可在下方手動揭曉。';
  $('pause').disabled=true;$('start').textContent='結果特寫中…';$('progressfill').style.width='100%';setMotor(0);
 }
}
function updateSorting(){if(batchActive&&phase==='sorting')finishRound();}

function simulate(dt){
 const radius=1.385,centerY=.05,spin=spinDirection(elapsed);
 for(const b of balls){
  if(b.state==='rack'&&elapsed>(b.n-1)*.032){b.state='fall';b.vel.set(Math.sin(b.n*12.71)*.22,-.1,Math.cos(b.n*8.17)*.34);}
  if(b.state!=='fall'&&b.state!=='drum')continue;
  const p=b.mesh.position;
  b.vel.y-=8.8*dt;
  if(b.state==='drum'){
   const rx=p.x,ry=p.y-centerY;
   b.vel.x+=(-ry*spin*1.7+Math.sin(elapsed*4.1+b.n*2.37)*.9)*dt;
   b.vel.y+=(rx*spin*1.7+Math.sin(elapsed*3.4+b.n*1.31)*.65)*dt;
   b.vel.z+=Math.sin(elapsed*3+b.n*1.73)*1.15*dt;
   const blade=Math.cos((Math.atan2(ry,rx)-rotor.rotation.z)*3);
   if(p.y<-.52&&elapsed>(b.nextKick||0)&&blade>-.15){
    b.vel.y=Math.max(b.vel.y,2.35+.55*(.5+.5*Math.sin(b.n*2.71+elapsed*5)));
    b.vel.x+=Math.sin(b.n+elapsed*3)*.35;b.vel.z+=Math.cos(b.n+elapsed*2)*.24;
    b.nextKick=elapsed+.48+(b.n%5)*.065;
   }
  }
  b.vel.y=Math.min(3.3,b.vel.y);
  const speed=b.vel.length();if(speed>4.6)b.vel.multiplyScalar(4.6/speed);
  p.addScaledVector(b.vel,dt);
  if(b.state==='fall'&&p.y<1.30){b.state='drum';playImpact(.19,.72);}
  if(b.state==='drum'){
   const radial=new THREE.Vector3(p.x,p.y-centerY,p.z),distance=radial.length();
   if(distance>radius){
    radial.normalize();p.copy(radial).multiplyScalar(radius);p.y+=centerY;
    const normalSpeed=b.vel.dot(radial);
    if(normalSpeed>0){b.vel.addScaledVector(radial,-1.58*normalSpeed);collisionSound(normalSpeed,.68);}
   }
  }
  if(b.state==='drum'){
   const depthLimit=machineModel.drumHalfDepth-.095;
   if(p.z>depthLimit){p.z=depthLimit;if(b.vel.z>0)b.vel.z*=-.62;}
   else if(p.z<-depthLimit){p.z=-depthLimit;if(b.vel.z<0)b.vel.z*=-.62;}
  }
  b.vel.multiplyScalar(Math.pow(.994,dt*60));
  b.mesh.rotation.x+=b.vel.y*dt*2;b.mesh.rotation.z-=b.vel.x*dt*2;
 }
 for(let i=0;i<balls.length;i++){
  const a=balls[i];if(a.state!=='drum')continue;
  for(let j=i+1;j<balls.length;j++){
   const b=balls[j];if(b.state!=='drum')continue;
   temp.subVectors(a.mesh.position,b.mesh.position);const d=temp.length();
   if(d<.19&&d>.00001){
    temp.multiplyScalar(1/d);const overlap=(.19-d)*.5;
    a.mesh.position.addScaledVector(temp,overlap);b.mesh.position.addScaledVector(temp,-overlap);
    const rel=a.vel.clone().sub(b.vel).dot(temp);
    if(rel<0){a.vel.addScaledVector(temp,-rel*.66);b.vel.addScaledVector(temp,rel*.66);collisionSound(-rel,.55);}
   }
  }
 }
}
function extraction(){
 if(!extracting&&nextIndex<order.length&&elapsed>=pickupStart(nextIndex)){
  const b=balls.find(b=>b.n===order[nextIndex]);
  const index=nextIndex;b.state='extract';
  const duration=quickActive?1.35:(index===6?SPECIAL_PICKUP_DURATION:NORMAL_PICKUP_DURATION);
  extracting={b,index,start:pickupStart(index),duration,from:b.mesh.position.clone(),tubeLogged:false,hiddenLogged:false,receiverLogged:false,junctionLogged:false,gateRequested:false,gatePassed:false,gateCloseRequested:false,sfx:{slot:false}};
  qaEvent('ball-selected',{round:batchIndex+1,index:index+1,n:b.n});
  $('status').textContent=index===6?'特別號在中央直管短暫停留':'選中球落入鼓底中央直管';
  $('step').textContent=`第 ${index+1} / ${order.length} 顆`;nextIndex++;
 }
 if(!extracting)return;
 const e=extracting,t=Math.min(1,(elapsed-e.start)/e.duration),p=e.b.mesh.position;
 const mouth=selectorMouth.clone(),hidden=selectorOcclusion.clone(),slot=cupSlot(e.index);
 const clamp01=x=>Math.max(0,Math.min(1,x));
 const logTube=()=>{if(e.tubeLogged)return;e.tubeLogged=true;qaEvent('selector-tube-entry',{round:batchIndex+1,index:e.index+1,n:e.b.n});playImpact(.18,.72);};
 const occlude=()=>{e.b.mesh.visible=false;p.copy(hidden);if(!e.hiddenLogged){e.hiddenLogged=true;qaEvent('selector-tube-occluded',{round:batchIndex+1,index:e.index+1,n:e.b.n});}};
 const showAtRear=()=>{
  if(!e.receiverLogged){e.receiverLogged=true;e.b.mesh.visible=true;showCupBall(e.b);p.copy(receiverEntryStart);qaEvent('receiver-rear-entry-visible',{round:batchIndex+1,index:e.index+1,n:e.b.n});qaEvent('cup-ball-visible',{round:batchIndex+1,index:e.index+1,n:e.b.n,color:colorOf(e.b.n),slot:e.index===6?'special':'main'});}
  e.b.mesh.visible=true;showCupBall(e.b);
 };
 const markJunction=()=>{if(e.junctionLogged)return;e.junctionLogged=true;qaEvent('receiver-junction-reached',{round:batchIndex+1,index:e.index+1,n:e.b.n,slot:e.index===6?'special':'main'});};
 const approachJunction=progress=>{showAtRear();const u=clamp01(progress);p.lerpVectors(receiverEntryStart,receiverJunction,smooth(u));e.b.mesh.rotation.z=-u*2.2;if(u>=1)markJunction();};
 const moveIntoSlot=progress=>{showAtRear();const u=clamp01(progress);p.lerpVectors(receiverJunction,slot,smooth(u));e.b.mesh.rotation.z=(e.index===6?1:-1)*u*4.2;};
 if(e.index!==6){
  if(t<.18){e.b.mesh.visible=true;p.lerpVectors(e.from,mouth,smooth(t/.18));p.y+=Math.sin(Math.PI*t/.18)*.10;}
  else if(t<.31){logTube();e.b.mesh.visible=true;p.lerpVectors(mouth,hidden,smooth((t-.18)/.13));}
  else if(t<.60){logTube();occlude();}
  else{
   logTube();const routeProgress=clamp01((t-.60)/.40),approachRatio=.38;
   if(routeProgress<approachRatio)approachJunction(routeProgress/approachRatio);
   else{approachJunction(1);moveIntoSlot((routeProgress-approachRatio)/(1-approachRatio));}
  }
  if(t>=.96&&!e.sfx.slot){e.sfx.slot=true;playImpact(.15,.54);}
  if(t>=1){
   e.b.state='drawn';e.b.mesh.visible=true;e.b.mesh.rotation.set(0,.4,e.b.mesh.rotation.z);
   qaEvent('ball-in-cup',{round:batchIndex+1,index:e.index+1,n:e.b.n,color:colorOf(e.b.n),slot:'main'});
   qaEvent('main-ball-landed-left-slot',{round:batchIndex+1,index:e.index+1,n:e.b.n,drawOrder:e.index+1});
   setStageStatus(`第 ${e.index+1} 顆已由交會點停入左側長槽`);reveal(e.b.n,e.index);extracting=null;if(quickActive)finishQuickDraw();
  }
  return;
 }

 // The special ball is hidden in the selector tube, then appears at the shared rear feed.
 if(t<.055){e.b.mesh.visible=true;p.lerpVectors(e.from,mouth,smooth(t/.055));p.y+=Math.sin(Math.PI*t/.055)*.06;}
 else if(t<.75){logTube();e.b.mesh.visible=true;p.copy(mouth);p.y+=.025*Math.sin((t-.055)*18);}
 else if(t<.90){logTube();occlude();}
 else{
  logTube();const approachProgress=clamp01((t-.90)/.10),approachRatio=.42;
  if(approachProgress<approachRatio)approachJunction(approachProgress/approachRatio);
  else{
   approachJunction(1);
   if(!e.gateRequested){e.gateRequested=true;setDiverterGate(true,batchIndex+1);qaEvent('special-ball-waiting-for-gate',{round:batchIndex+1,index:7,n:e.b.n,gateState:diverterGateState});setStageStatus('第七顆已到共同交會點 · 特別號活門開啟中');}
   if(diverterGateState==='open'||e.gatePassed){
    const branchProgress=clamp01((approachProgress-approachRatio)/(1-approachRatio));moveIntoSlot(branchProgress);
    if(!e.gatePassed&&branchProgress>=.04){e.gatePassed=true;qaEvent('special-ball-gate-crossed',{round:batchIndex+1,index:7,n:e.b.n,gateState:diverterGateState});setStageStatus('特別號已通過活門 · 轉入右側短槽');}
    if(e.gatePassed&&!e.gateCloseRequested&&branchProgress>=.62){e.gateCloseRequested=true;setDiverterGate(false,batchIndex+1);}
   }else{showAtRear();p.copy(receiverJunction);e.b.mesh.rotation.z=0;}
  }
 }
 if(t>=1&&e.gatePassed){
  e.b.state='drawn';e.b.mesh.visible=true;e.b.mesh.rotation.set(0,.4,e.b.mesh.rotation.z);
  if(!e.sfx.slot){e.sfx.slot=true;playImpact(.15,.54);}
  qaEvent('ball-in-cup',{round:batchIndex+1,index:7,n:e.b.n,color:colorOf(e.b.n),slot:'special',gateState:diverterGateState});
  qaEvent('special-ball-in-right-slot',{round:batchIndex+1,index:7,n:e.b.n,gateState:diverterGateState});
  qaEvent('special-ball-landed-right-slot',{round:batchIndex+1,index:7,n:e.b.n,drawOrder:7});
  setStageStatus('第七顆特別號已停入右側短格');reveal(e.b.n,e.index);extracting=null;if(quickActive)finishQuickDraw();
 }
}
const smooth=t=>t*t*(3-2*t);
let realTime=0;
function updateCamera(dt){
 let mode=resultShot?'results':view;
 if(mode==='auto'){
  if(phase==='running'&&extracting){const progress=(elapsed-extracting.start)/extracting.duration;mode=progress>(extracting.index===6?.90:.60)?'results':'close';}
  else if(phase==='running'&&elapsed<trayShotUntil)mode='results';
  else if(phase==='running'){const cut=Math.floor(Math.max(0,elapsed-5)/7)%2;mode=elapsed<5||cut===0?'wide':'close';}
  else mode='wide';
 }
 const desired=new THREE.Vector3(),target=new THREE.Vector3(),aspect=camera.aspect,fit=aspect<.67?1.12:1;
 if(mode==='results'){
  const distance=Math.max(2.2,1.75/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*aspect));
  desired.set(-.18,-1.57+distance*.55,1.00+distance);target.set(-.18,-1.57,1.00);
 }else if(mode==='mix'){
  const distance=Math.max(6.2,3.3/aspect);desired.set(.32,.70,distance);target.set(0,.05,.05);
 }else if(mode==='close'){
  const distance=Math.max(6.0,3.0/aspect);desired.set(1.45,.65,distance);target.set(0,.05,.04);
 }else if(mode==='orbit'){
  desired.set(Math.sin(realTime*.14)*5,2.45,Math.cos(realTime*.14)*3+10.2*fit);target.set(0,.90,0);
 }else{
  desired.set(2.6+mouseX*.25,2.65,14.3*fit);target.set(0,.85,0);
 }
 if(!resultShot&&mode==='wide')fitNarrowRunningCamera(mode,desired,target);
 if(mode==='results'&&resultShot){
  resultShot.time+=dt;const t=reducedMotion()?1:smooth(Math.min(1,resultShot.time/2.6));
  camera.position.lerpVectors(resultShot.from,desired,t);cameraTarget.lerpVectors(resultShot.target,target,t);
  if(t===1&&!resultShotStable){
   resultShotStable=true;resultShotStableAt=0;pendingStableFrame={round:batchIndex+1,duration:resultShot.time};
   setStageStatus('六加一承接台特寫已穩定 · 即將下一注');resultShot=null;
   document.querySelectorAll('[data-view]:not([data-view="results"])').forEach(b=>b.disabled=false);
   if(phase==='done'&&!batchActive){setLiveDrawDisplay(false);selectView('auto');}
  }
 }else{const blend=reducedMotion()?1:1-Math.exp(-dt*(mode==='results'?2.5:1.8));camera.position.lerp(desired,blend);cameraTarget.lerp(target,blend);}
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
 if(phase==='running'&&!paused){const dt=realDt*timelineRate(),physicsDt=Math.min(dt,.12),steps=Math.max(1,Math.ceil(physicsDt/.012));for(let i=0;i<steps;i++)simulate(physicsDt/steps);rotor.rotation.z+=dt*motorSpeed(elapsed);
 $('progressfill').style.width=Math.min(99,(elapsed/(quickActive?3.5:DRAW_END))*100)+'%';
 if(!extracting){$('status').textContent=(quickActive?'':`第 ${batchIndex+1} / ${batchTotal} 注 · `)+(quickActive?'持續攪珠':elapsed<3?'彩球入鼓':'自動攪珠中');$('step').textContent=`已揭曉 ${revealed.length} / ${order.length} 顆`;}
 setMotor(.028);const extractProgress=extracting?(elapsed-extracting.start)/extracting.duration:0;setRolling(!!extracting&&extractProgress>=.60&&extractProgress<.99);
 }else{setMotor(0);setRolling(false);}if(!paused)updateCamera(realDt);renderer.render(scene,camera);if(pendingStableFrame){resultShotStableAt=performance.now();qaEvent('result-shot-stable',{round:pendingStableFrame.round,duration:pendingStableFrame.duration});pendingStableFrame=null;}
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
function startAudio(){try{soundtrack.play().catch(()=>{$('musicstatus').textContent='《Gilded Winter Gala》載入／播放失敗，請檢查音檔後重試。';});}catch{$('musicstatus').textContent='《Gilded Winter Gala》載入／播放失敗，請檢查音檔後重試。';}}
function setMotor(v){if(motor&&audio){motor.gain.setTargetAtTime(v*2.5,audio.currentTime,.08);motorTone.frequency.setTargetAtTime(57*Math.sqrt(timelineRate()),audio.currentTime,.1);}}
function setRolling(active){if(rolling&&audio)rolling.gain.setTargetAtTime(active?.18:0,audio.currentTime,.018);}
function collisionSound(speed,brightness){if(!audio||audio.state!=='running'||speed<.25||audio.currentTime-lastBallHit<.038)return;lastBallHit=audio.currentTime;playImpact(Math.min(.18,.045+speed*.035),brightness);}
function playImpact(level=.16,brightness=.6){if(!audio||audio.state!=='running'||phase!=='running'||paused)return;const now=audio.currentTime,duration=.075+Math.random()*.055,len=Math.max(1,Math.floor(audio.sampleRate*duration)),buf=audio.createBuffer(1,len,audio.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buf;filter.type='bandpass';filter.frequency.value=500+brightness*1500;filter.Q.value=.7;gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);src.connect(filter);filter.connect(gain);gain.connect(effectsBus);src.start(now);src.stop(now+duration);const thump=audio.createOscillator(),tg=audio.createGain();thump.type='sine';thump.frequency.setValueAtTime(105+Math.random()*35,now);thump.frequency.exponentialRampToValueAtTime(58,now+.075);tg.gain.setValueAtTime(level*.42,now);tg.gain.exponentialRampToValueAtTime(.001,now+.09);thump.connect(tg);tg.connect(effectsBus);thump.start(now);thump.stop(now+.1);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};thump.onended=()=>{thump.disconnect();tg.disconnect();};}
document.addEventListener('ticket:revealed',revealCupTicket);$('start').addEventListener('click',begin);$('reset').addEventListener('click',reset);$('live-pause')?.addEventListener('click',()=>$('pause').click());$('live-reset')?.addEventListener('click',()=>$('reset').click());$('live-settings-toggle')?.addEventListener('click',()=>{const overlay=$('live-settings-overlay');if(!overlay)return;overlay.hidden=!overlay.hidden;const settings=$('inline-settings');if(settings)settings.open=!overlay.hidden;$('live-settings-toggle').setAttribute('aria-expanded',String(!overlay.hidden));});$('pause').addEventListener('click',()=>{updateTimeline();if(phase!=='running')return;paused=!paused;timelineAt=Date.now();syncDrum();$('pause').textContent=paused?'繼續攪珠':'暫停';if($('live-pause'))$('live-pause').textContent=paused?'繼續':'暫停';$('status').textContent=paused?'已暫停':'攪拌中';if(paused){setMotor(0);setRolling(false);setEffectsActive(false);}else{ensureEffects();if(soundOn)startAudio();}});$('speed').addEventListener('change',e=>{updateTimeline();rate=Number(e.target.value);updateTiming();});$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'關閉背景音樂':'開啟背景音樂');if(soundOn){$('musicstatus').textContent='背景音樂播放中';startAudio();}else{soundtrack.pause();try{soundtrack.currentTime=0;}catch{}$('musicstatus').textContent='背景音樂已關閉';}updateSettingsSummary();});document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(phase==='sorting'&&b.dataset.view!=='results')return;if(b.dataset.view!=='results')resultShot=null;selectView(b.dataset.view);}));$('scene').addEventListener('pointermove',e=>{const r=$('scene').getBoundingClientRect();mouseX=((e.clientX-r.left)/r.width-.5)*2;});$('scene').addEventListener('pointerleave',()=>mouseX=0);
$('entry-count').addEventListener('change',()=>{if(!batchActive&&!quickActive){setStartLabel();resetTickets(Number($('entry-count').value));}});
// Pointer-down is the manual fast-start; pointer-up/click must not draw twice.
$('scene').addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)startFromDrum();});
$('scene').addEventListener('click',e=>{if(e.detail===0)startFromDrum();});
$('scene').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)startFromDrum();}});
$('copy').addEventListener('click',async()=>{if(!batchResults.length)return;const text=getTicketsCopyText()+'\n（隨機娛樂模擬，非開獎預測；特別號不是單式填寫號碼。）';const feedback=$('summary');feedback.classList.remove('copy-error');feedback.textContent='';try{await navigator.clipboard.writeText(text);$('copy').textContent='全部已複製 ✓';setTimeout(()=>$('copy').textContent='複製全部號碼 ↗',1800);}catch{feedback.textContent=text+' — 請長按選取複製。';feedback.classList.add('copy-error');}});
document.addEventListener('visibilitychange',()=>{updateTimeline();if(document.hidden){setMotor(0);setRolling(false);}clock.getDelta();});
resetTickets(Number($('entry-count').value));syncDrum();
try{init();}catch(error){$('loading').textContent='無法啟動 3D。請使用支援 WebGL 的新版瀏覽器，並開啟硬件加速。';$('start').disabled=true;console.error(error);}


// Read-only QA diagnostics are available only when the preview URL includes ?qa=1.
const qaActive=new URLSearchParams(location.search).has('qa');
window.__goldenDrawQALog=[];
function qaEvent(type,detail={}){if(!qaActive)return;window.__goldenDrawQALog.push({type,time:performance.now(),...detail});}
if(qaActive){window.__goldenDrawCameraQA=()=>{if(!camera||!renderer)return null;camera.updateMatrixWorld(true);const v=new THREE.Vector3(),rect=renderer.domElement.getBoundingClientRect();function bounds(coords){if(!coords||!coords.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let i=0;i<coords.length;i+=3){v.set(coords[i],coords[i+1],coords[i+2]).project(camera);const x=(v.x+1)*rect.width/2,y=(1-v.y)*rect.height/2;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return{left:minX,top:minY,right:maxX,bottom:maxY,width:maxX-minX,height:maxY-minY,heightPercent:100*(maxY-minY)/rect.height};}const inspectBall=(r,index)=>{const m=r.mesh,map=m.material.map,pixel=map?.image?.getContext('2d').getImageData(0,0,1,1).data;return{n:r.n,drawIndex:r.drawIndex??index,visible:m.visible,numbered:!!map,textureNumber:map?.userData?.number??null,textureColor:map?.userData?.color??null,texturePixel:pixel?Array.from(pixel):null,position:m.position.toArray()};};const cup=cupBallRecords.map((row,ticket)=>row?{ticket:ticket+1,count:row.length,numbered:row.every(r=>!!r.mesh.material.map),balls:row.map(inspectBall)}:null).filter(Boolean),rackBalls=balls.filter(b=>b.state==='rack').map((b,i)=>({n:b.n,visible:b.mesh.visible,textureNumber:b.mesh.material.map?.userData?.number??null,textureColor:b.mesh.material.map?.userData?.color??null}));const activeCup=balls.filter(b=>b.mesh.visible&&(b.state==='drawn'||b.state==='extract'&&b.mesh.material.map)).map(b=>inspectBall(b,order.indexOf(b.n))).sort((a,b)=>a.drawIndex-b.drawIndex);return{phase,paused,view,mode:resultShot?'results':view==='auto'?(phase==='running'?'close':'wide'):view,round:batchIndex+1,batchTotal,drawCount:revealed.length,camera:{position:camera.position.toArray(),target:cameraTarget.toArray(),fov:camera.fov,aspect:camera.aspect},viewport:{canvasWidth:rect.width,canvasHeight:rect.height,canvasLeft:rect.left,canvasTop:rect.top,scene:document.querySelector('#scene').getBoundingClientRect().toJSON(),statusBar:document.querySelector('.stage-caption').getBoundingClientRect().toJSON()},machine:bounds(machineFitVertices),cup,rackBalls,activeCup,pendingExtraction:extracting?{index:extracting.index+1,n:extracting.b.n,progress:Math.min(1,(elapsed-extracting.start)/2.6),position:extracting.b.mesh.position.toArray(),visible:extracting.b.mesh.visible,numbered:!!extracting.b.mesh.material.map,gateState:diverterGateState}:null,machineReset:{rackCount:balls.filter(b=>b.state==='rack').length,activeCount:balls.filter(b=>b.state==='drawn'||b.state==='extract').length,cupRecordCount:cupBallRecords.length,gateState:diverterGateState,gateAngle:diverterGateAngle},drawOrder:order.slice(),revealed:revealed.slice(),resultSlots:(()=>{if(!mainResultSlot||!specialResultSlot)return null;const mp=mainResultSlot.getWorldPosition(new THREE.Vector3()),sp=specialResultSlot.getWorldPosition(new THREE.Vector3()),mq=mainResultSlot.getWorldQuaternion(new THREE.Quaternion()),sq=specialResultSlot.getWorldQuaternion(new THREE.Quaternion()),mr=new THREE.Euler().setFromQuaternion(mq),sr=new THREE.Euler().setFromQuaternion(sq),leftInner=mainResultSlot.localToWorld(new THREE.Vector3(mainResultSlot.userData.slotLength/2,0,0)),rightInner=specialResultSlot.localToWorld(new THREE.Vector3(-specialResultSlot.userData.slotLength/2,0,0)),gatePos=diverterGatePivot?.getWorldPosition(new THREE.Vector3())||null;return{mainCenter:mp.toArray(),specialCenter:sp.toArray(),mainTilt:mr.z,specialTilt:sr.z,mainLength:mainResultSlot.userData.slotLength,specialLength:specialResultSlot.userData.slotLength,lengthRatio:specialResultSlot.userData.slotLength/mainResultSlot.userData.slotLength,mainJunction:leftInner.toArray(),specialJunction:rightInner.toArray(),junctionHeightError:leftInner.y-rightInner.y,junctionGap:Math.hypot(leftInner.x-rightInner.x,leftInner.y-rightInner.y),sameDepthError:sp.z-mp.z,gate:{position:gatePos?.toArray()||null,state:diverterGateState,angle:diverterGateAngle,target:diverterGateTarget,transitioning:!!diverterGateTransition,open:diverterGateState==='open'}};})(),renderer:renderer instanceof CompatibleRenderer?'compatible':'webgl',shot:resultShot?{elapsed:resultShot.time}:null};};}

const shareButton=document.getElementById('share-app');
shareButton?.addEventListener('click',async()=>{const shareData={title:document.title,text:'金球時光｜3D 攪珠遊戲（純粹娛樂模擬，非開獎預測）',url:location.href};try{if(navigator.share&&(!navigator.canShare||navigator.canShare(shareData))){await navigator.share(shareData);return;}await navigator.clipboard.writeText(shareData.url);shareButton.textContent='已複製連結';setTimeout(()=>shareButton.textContent='分享',1800);}catch(error){if(error.name!=='AbortError'){window.prompt('複製以下連結分享：',shareData.url);}}});
