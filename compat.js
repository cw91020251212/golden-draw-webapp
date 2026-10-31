import * as THREE from './three.module.js';
// Canvas fallback projects the same 3D positions and camera, preserving draw behaviour.
export class CompatibleRenderer{
 constructor(getState){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.getState=getState;this.shadowMap={};this.pixelRatio=1;this.last=0;}
 setPixelRatio(n){this.pixelRatio=Math.min(n,1.5);}
 setClearColor(){}
 setSize(w,h){this.w=w;this.h=h;this.domElement.width=w*this.pixelRatio;this.domElement.height=h*this.pixelRatio;this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
 render(scene,camera,force=false){const now=performance.now();if(!force&&now-this.last<45)return;this.last=now;const {balls,rotor,cupBallRecords=[]}=this.getState();const c=this.ctx,w=this.w,h=this.h;c.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);c.clearRect(0,0,w,h);camera.updateMatrixWorld();const p=(x,y,z=0)=>{const v=new THREE.Vector3(x,y,z).project(camera);return[(v.x+1)*w/2,(1-v.y)*h/2];};const scale=(x,y,z=0)=>{const a=p(x,y,z),b=p(x+.123,y,z);return Math.hypot(a[0]-b[0],a[1]-b[1]);};
 const poly=(pts,fill,stroke=null,lw=1)=>{c.beginPath();pts.forEach((v,i)=>{const a=p(...v);i?c.lineTo(...a):c.moveTo(...a);});c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
 const line=(a,b,color,width)=>{const pa=p(...a),pb=p(...b);c.beginPath();c.moveTo(...pa);c.lineTo(...pb);c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.stroke();};
 const circle=(r,y,z,stroke,lw,fill)=>{const pts=[];for(let i=0;i<100;i++){const a=i/100*Math.PI*2;pts.push([Math.cos(a)*r,Math.sin(a)*r+y,z]);}poly(pts,fill,stroke,lw);};
 const gold=c.createLinearGradient(w*.3,0,w*.7,h);gold.addColorStop(0,'#fff1b4');gold.addColorStop(.2,'#c8953e');gold.addColorStop(.48,'#f7d67e');gold.addColorStop(.72,'#a97124');gold.addColorStop(1,'#e8bd67');
 const disk=[];for(let i=0;i<100;i++){const a=i/100*Math.PI*2;disk.push([Math.cos(a)*2.72,-2.43,Math.sin(a)*2.72]);}poly(disk,'#436876','#bcaa67',1);
 poly([[-1.3,-2.35,.85],[1.3,-2.35,.85],[1.3,-1.95,.85],[-1.3,-1.95,.85]],gold,'#e8c777',1);poly([[-1.3,-1.95,.85],[1.3,-1.95,.85],[1.3,-1.95,-.8],[-1.3,-1.95,-.8]],'#d3ac5d','#f1da9b',1);
 const stemWidth=scale(0,-1.7,0)*1.3;line([-.95,-2,0],[-.95,-1.08,0],gold,stemWidth);line([.95,-2,0],[.95,-1.08,0],gold,stemWidth);
 const rimWidth=Math.max(4,scale(0,.05,.43)*.56);circle(1.53,.05,-.43,'#a97b32',rimWidth,'#c7e4e313');for(let i=0;i<10;i++){const a=i*Math.PI/5;line([Math.cos(a)*1.53,Math.sin(a)*1.53+.05,-.43],[Math.cos(a)*1.53,Math.sin(a)*1.53+.05,.43],'#bca36b',1.3);}
 circle(1.48,.05,.02,'#dbf1ec66',1,'#cde9ef12');
 for(let i=0;i<6;i++){const a=i*Math.PI/3+rotor.rotation.z;const x=Math.cos(a),y=Math.sin(a);line([0,.05,-.08],[x*1.38,y*1.38+.05,-.08],gold,2);const points=[[1.05,-.23],[1.38,-.23],[1.38,.23],[1.05,.23]].map(([px,py])=>[px*x-py*y,px*y+py*x+.05,0]);poly(points,'#d5eddf25','#d4bf85',1);}
 circle(.30,.05,-.08,gold,1,'#bb8c3f');circle(.1,.05,.05,'#f6e2aa',1,'#e1b657');
 const drawBall=b=>{const v=b.mesh.position,a=p(v.x,v.y,v.z),r=scale(v.x,v.y,v.z);if(r<.2)return;const grad=c.createRadialGradient(a[0]-r*.35,a[1]-r*.45,r*.1,a[0],a[1],r);const base= b.n===0?'#bd4040':([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46].includes(b.n)?['#ee8c72','#c73330','#742a22']:[3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48].includes(b.n)?['#8ebad2','#306e96','#1a3c62']:['#9ace90','#398453','#205538']);grad.addColorStop(0,base[0]);grad.addColorStop(.65,base[1]);grad.addColorStop(1,base[2]);c.beginPath();c.arc(...a,r,0,Math.PI*2);c.fillStyle=grad;c.fill();c.beginPath();c.ellipse(a[0],a[1],r*.66,r*.72,0,0,Math.PI*2);c.fillStyle='#fff0cc';c.fill();c.fillStyle='#3c3421';c.font=`bold ${Math.max(6,r*.87)}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(b.n,...a);c.beginPath();c.arc(a[0]-r*.36,a[1]-r*.47,r*.16,0,7);c.fillStyle='#ffffffa0';c.fill();};const sorted=balls.filter(b=>b.mesh.visible).sort((a,b)=>b.mesh.position.distanceToSquared(camera.position)-a.mesh.position.distanceToSquared(camera.position));for(const b of sorted)drawBall(b);
 circle(1.53,.05,.43,gold,rimWidth);circle(1.43,.05,.45,'#e5d3a2',1.3);for(let i=0;i<10;i++){const a=i*Math.PI/5,v=p(Math.cos(a)*1.53,Math.sin(a)*1.53+.05,.46);c.beginPath();c.arc(...v,Math.max(1.5,rimWidth*.29),0,7);c.fillStyle='#7a612f';c.fill();}
	 // Magazine glass and brass rails remain in front of the loaded balls.
	 for(let col=0;col<7;col++){const x=(col-3)*.265;poly([[x-.133,1.78,.17],[x+.133,1.78,.17],[x+.133,4.24,.17],[x-.133,4.24,.17]],'#c4ebef0b','#cceae83a',1);line([x-.132,1.78,.17],[x-.132,4.24,.17],gold,1.4);}
	 const rackWidth=Math.max(3,scale(0,3,0)*.5);for(const z of [-.18,.18]){line([-.96,1.74,z],[.96,1.74,z],gold,rackWidth);line([-.96,4.24,z],[.96,4.24,z],gold,rackWidth);line([-.96,1.74,z],[-.96,4.24,z],gold,rackWidth);line([.96,1.74,z],[.96,4.24,z],gold,rackWidth);}
	 const trackCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(1.045,.19,.70),new THREE.Vector3(1.19,-.12,.75),new THREE.Vector3(1.19,-.38,.80),new THREE.Vector3(.842,-1.222,.87),new THREE.Vector3(0,-1.57,.95)]),trackPoints=trackCurve.getPoints(48);for(const side of [-1,1])for(let i=1;i<trackPoints.length;i++){const a=trackPoints[i-1],b=trackPoints[i];line([a.x+side*.065,a.y,a.z],[b.x+side*.065,b.y,b.z],side<0?'#f2d58e':'#bd913f',Math.max(2,scale(a.x,a.y,a.z)*.19));}
	 poly([[-.24,-1.35,.45],[.24,-1.35,.45],[.12,-1.72,.8],[-.12,-1.72,.8]],gold,'#e9cc84',1);
	 poly([[-1,-1.8,.72],[1,-1.8,.72],[1,-1.8,1.19],[-1,-1.8,1.19]],'#bb934e','#f0ce82',1);line([-1,-1.72,1.20],[1,-1.72,1.20],gold,2);
	 // Repaint the seven extracted balls above the tray front.
	 const cupRing=y=>Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2;return[Math.cos(a)*1.06,y,.97+Math.sin(a)*1.06];});poly(cupRing(-1.71),'#d6eeec12','#d7f4f44a',1);
	 const cupBalls=[...balls.filter(b=>b.mesh.visible&&b.state==='drawn'),...cupBallRecords.flat().filter(r=>r.mesh.visible)].sort((a,b)=>b.mesh.position.distanceToSquared(camera.position)-a.mesh.position.distanceToSquared(camera.position));for(const b of cupBalls)drawBall(b);poly(cupRing(-1.09),null,'#d7f4f488',1.3);for(const x of [-1.06,1.06])line([x,-1.71,.97],[x,-1.09,.97],'#d7f4f43a',1);
 const a=p(0,-2.14,.86);c.fillStyle='#634e2a';c.font=`${Math.max(7,scale(0,-2.14,.86)*.6)}px Georgia`;c.textAlign='center';c.fillText('THE GOLDEN DRAW',...a);
 }
}
