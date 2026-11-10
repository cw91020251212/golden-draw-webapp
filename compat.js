import * as THREE from './three.module.js';

// Lightweight fallback mirrors only the visible machine and receiver geometry.
export class CompatibleRenderer {
  constructor(getState) {
    this.domElement = document.createElement('canvas');
    this.ctx = this.domElement.getContext('2d');
    this.getState = getState;
    this.shadowMap = {};
    this.pixelRatio = 1;
    this.last = 0;
  }
  setPixelRatio(n) { this.pixelRatio = Math.min(n, 1.5); }
  setClearColor() {}
  setSize(w, h) {
    this.w = w;
    this.h = h;
    this.domElement.width = Math.max(1, Math.round(w * this.pixelRatio));
    this.domElement.height = Math.max(1, Math.round(h * this.pixelRatio));
    this.domElement.style.width = `${w}px`;
    this.domElement.style.height = `${h}px`;
  }
  render(_scene, camera, force = false) {
    const now = performance.now();
    if (!force && now - this.last < 45) return;
    this.last = now;
    const state = this.getState();
    const { balls = [], rotor, cupBallRecords = [], receiverEntryLane, mainResultSlot, specialResultSlot, diverterGatePivot } = state;
    const c = this.ctx, w = this.w, h = this.h;
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.clearRect(0, 0, w, h);
    camera.updateMatrixWorld();
    const project = (x, y, z = 0) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return [(v.x + 1) * w / 2, (1 - v.y) * h / 2];
    };
    const path = (points, stroke, width = 1, fill = null) => {
      if (!points || points.length < 2) return;
      c.beginPath();
      points.forEach((v, i) => {
        const q = Array.isArray(v) ? project(...v) : project(v.x, v.y, v.z);
        i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]);
      });
      if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
    };
    const line = (a, b, color, width = 1) => path([a, b], color, width);
    const circle = (radius, cy, cz, color, width = 1, fill = null) => {
      const points = Array.from({ length: 120 }, (_, i) => {
        const a = i / 120 * Math.PI * 2;
        return [Math.cos(a) * radius, Math.sin(a) * radius + cy, cz];
      });
      path(points, color, width, fill);
    };
    const gold = '#d0aa5d', bright = '#f3d68a', dark = '#70501f', glass = '#d8f4f044';

    // Broad cabinet and feet.
    path([[-1.36,-2.47,.72],[1.36,-2.47,.72],[1.36,-1.79,.72],[-1.36,-1.79,.72]], gold, 2, '#96743d');
    path([[-1.15,-2.28,.79],[1.15,-2.28,.79],[1.15,-2.02,.79],[-1.15,-2.02,.79]], dark, 1, '#b18b48');
    for (const x of [-1.12,1.12]) {
      line([x,-2.45,0],[x,-2.65,0],dark,Math.max(2,w*.003));
      circle(.11,-2.68,0,gold,2,'#a47e39');
      line([x,-1.83,-.18],[x*.93,1.02,-.18],dark,Math.max(3,w*.004));
      line([x,-1.80,.48],[x*.78,-.68,.48],gold,Math.max(2,w*.003));
    }

    // Five-column transparent magazine with the numbered balls inside.
    path([[-.74,1.78,.32],[.74,1.78,.32],[.74,4.18,.32],[-.74,4.18,.32]],gold,2,'#c5a35b22');
    line([-.74,1.80,.32],[.74,1.80,.32],bright,2);
    line([-.74,4.16,.32],[.74,4.16,.32],bright,2);
    for (let col=0;col<5;col++) {
      const x=(col-2)*.252;
      line([x,1.86,.28],[x,4.08,.28],glass,Math.max(2,w*.002));
    }

    // The drum is a shallow circle with visible depth rings, not a sphere or flat disc.
    circle(1.48,.05,-.54,'#a67d37aa',Math.max(2,w*.002));
    circle(1.42,.05,-.50,'#d9edee77',Math.max(2,w*.002));
    circle(1.48,.05,.56,bright,Math.max(3,w*.004));
    circle(1.365,.05,.57,gold,Math.max(2,w*.002));
    for (const x of [-1.18,1.18]) {
      line([x*.98,.05,-.52],[x*.98,.05,.52],gold,Math.max(1,w*.0015));
    }

    // Central three-spoke rotor, clockwise position, and short visible selector tube.
    if (rotor) {
      const a0=rotor.rotation.z;
      const center=[0,.16,.12];
      for (let i=0;i<6;i++) {
        const a=-Math.PI/2+i*Math.PI/3+a0;
        line(center,[Math.cos(a)*1.18,0.16+Math.sin(a)*1.18,.18],bright,Math.max(2,w*.003));
      }
      circle(.25,.05,.30,gold,2,'#bd9148');
    }
    line([0,-1.12,.20],[0,-1.46,.24],glass,Math.max(4,w*.006));
    line([-.12,-1.14,.22],[.12,-1.14,.22],bright,2);
    if (state.machineModel?.chuteEnd) {
      const end=state.machineModel.chuteEnd;
      line([0,-1.46,.24],[end.x,end.y,end.z],glass,Math.max(3,w*.004));
    }
    const outline=state.machineModel?.trayOutline;
    if (outline) {
      path(outline.floor,bright,Math.max(2,w*.003));
      path(outline.crest,gold,Math.max(2,w*.003));
      path(outline.glass,'#d7f3f2',Math.max(1.5,w*.002),'#d7f3f233');
    }
    if (diverterGatePivot) {
      diverterGatePivot.updateMatrixWorld(true);
      const panel=diverterGatePivot.getObjectByName('retainer-panel');
      if(panel){panel.updateMatrixWorld(true);      const hw=.021,hh=.25,hd=.15;
      const vertices=[[-hw,-hh,-hd],[hw,-hh,-hd],[hw,hh,-hd],[-hw,hh,-hd],[-hw,-hh,-hd]]
        .map(v=>panel.localToWorld(new THREE.Vector3(...v)));path(vertices,'#f6d278',2,'#e7c56a88');}
    }

    const reds = new Set([1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
    const blues = new Set([3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48]);
    const drawBall = b => {
      const pos=b.mesh.position,center=project(pos.x,pos.y,pos.z);
      const edge=project(pos.x+.095,pos.y,pos.z),r=Math.max(2,Math.hypot(edge[0]-center[0],edge[1]-center[1]));
      const base=reds.has(b.n)?'#c83b36':blues.has(b.n)?'#3675a2':'#43865a';
      const grad=c.createRadialGradient(center[0]-r*.30,center[1]-r*.36,r*.08,center[0],center[1],r);
      grad.addColorStop(0,'#fff3d0');grad.addColorStop(.35,base);grad.addColorStop(1,'#312b24');
      c.beginPath();c.arc(center[0],center[1],r,0,Math.PI*2);c.fillStyle=grad;c.fill();
      c.beginPath();c.ellipse(center[0],center[1],r*.60,r*.62,0,0,Math.PI*2);c.fillStyle='#fff0cc';c.fill();
      c.fillStyle='#30291f';c.font=`bold ${Math.max(6,r*.82)}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(b.n),center[0],center[1]);
    };
    const visibleBalls=balls.filter(b=>b.mesh.visible).sort((a,b)=>b.mesh.position.distanceToSquared(camera.position)-a.mesh.position.distanceToSquared(camera.position));
    for(const b of visibleBalls)drawBall(b);
    for(const record of cupBallRecords.flat())if(record.mesh?.visible)drawBall(record);
  }
}
