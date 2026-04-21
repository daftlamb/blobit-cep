// ── Simplex noise (2D) ──────────────────────────────────────────────
const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const perm = (function(){
  const p=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  const r=new Uint8Array(512);
  for(let i=0;i<512;i++) r[i]=p[i&255];
  return r;
})();
function dot3(g,x,y){return g[0]*x+g[1]*y;}
function snoise(xin,yin){
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  const s=(xin+yin)*F2,i=Math.floor(xin+s),j=Math.floor(yin+s);
  const t=(i+j)*G2,X0=i-t,Y0=j-t,x0=xin-X0,y0=yin-Y0;
  const i1=x0>y0?1:0,j1=x0>y0?0:1;
  const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
  const ii=i&255,jj=j&255;
  const gi0=perm[ii+perm[jj]]%12,gi1=perm[ii+i1+perm[jj+j1]]%12,gi2=perm[ii+1+perm[jj+1]]%12;
  let n0=0,n1=0,n2=0;
  let t0=0.5-x0*x0-y0*y0; if(t0>=0){t0*=t0;n0=t0*t0*dot3(grad3[gi0],x0,y0);}
  let t1=0.5-x1*x1-y1*y1; if(t1>=0){t1*=t1;n1=t1*t1*dot3(grad3[gi1],x1,y1);}
  let t2=0.5-x2*x2-y2*y2; if(t2>=0){t2*=t2;n2=t2*t2*dot3(grad3[gi2],x2,y2);}
  return 70*(n0+n1+n2);
}

// ── Blob generation ─────────────────────────────────────────────────
function generateBlobPoints(cx, cy, radius, numPts, noiseAmt, seed) {
  const pts = [];
  const nScale = 0.8 + seed * 0.001;
  for (let i = 0; i < numPts; i++) {
    const angle = (i / numPts) * Math.PI * 2;
    const nx = Math.cos(angle) * nScale + seed * 0.1;
    const ny = Math.sin(angle) * nScale + seed * 0.1;
    const n = snoise(nx, ny);
    const r = radius * (1 + n * (noiseAmt / 100) * 0.8);
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}

function catmullSegs(pts, smooth) {
  const n = pts.length, tension = smooth / 100 * 0.5, segs = [];
  for (let i = 0; i < n; i++) {
    const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
    segs.push({
      p1, p2,
      cp1: { x: p1.x+(p2.x-p0.x)*tension, y: p1.y+(p2.y-p0.y)*tension },
      cp2: { x: p2.x-(p3.x-p1.x)*tension, y: p2.y-(p3.y-p1.y)*tension }
    });
  }
  return segs;
}

// ── Canvas preview ───────────────────────────────────────────────────
const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');

function drawPreview() {
  const W = preview.offsetWidth || 220;
  preview.width = W; preview.height = W;
  pctx.fillStyle = '#111'; pctx.fillRect(0,0,W,W);
  const p = getParams();
  const r = W * 0.5 * (p.radius/100) * 0.85;
  const pts = generateBlobPoints(W/2, W/2, r, p.points, p.noise, p.seed);
  const segs = catmullSegs(pts, p.smooth);
  pctx.beginPath();
  pctx.moveTo(segs[0].p1.x, segs[0].p1.y);
  segs.forEach(s => pctx.bezierCurveTo(s.cp1.x,s.cp1.y,s.cp2.x,s.cp2.y,s.p2.x,s.p2.y));
  pctx.closePath();
  pctx.fillStyle = p.fill; pctx.fill();
  if (p.sw > 0) { pctx.strokeStyle = p.stroke; pctx.lineWidth = p.sw*(W/500); pctx.stroke(); }
}

// ── Params ───────────────────────────────────────────────────────────
function getParams() {
  return {
    points: +document.getElementById('sl-points').value,
    radius: +document.getElementById('sl-radius').value,
    noise:  +document.getElementById('sl-noise').value,
    smooth: +document.getElementById('sl-smooth').value,
    seed:   +document.getElementById('sl-seed').value,
    fill:   document.getElementById('cl-fill').value,
    stroke: document.getElementById('cl-stroke').value,
    sw:     +document.getElementById('sl-sw').value,
  };
}

['points','radius','noise','smooth','seed','sw'].forEach(n => {
  const sl = document.getElementById('sl-'+n);
  const vl = document.getElementById('val-'+n);
  sl.addEventListener('input', () => { vl.textContent = sl.value; drawPreview(); });
});
['cl-fill','cl-stroke'].forEach(id => document.getElementById(id).addEventListener('input', drawPreview));

// ── Generate in Illustrator via CSInterface ──────────────────────────
const cs = new CSInterface();

document.getElementById('btn-generate').addEventListener('click', () => {
  const p = getParams();
  const json = JSON.stringify(p);
  const status = document.getElementById('status');
  status.textContent = 'Generating...';
  cs.evalScript('createBlob(' + JSON.stringify(json) + ')', (result) => {
    if (result === 'ok') {
      status.textContent = '✓ Done';
      setTimeout(() => status.textContent = '', 2000);
    } else {
      status.textContent = 'Error: ' + result;
    }
  });
});

document.getElementById('btn-random').addEventListener('click', () => {
  const sl = document.getElementById('sl-seed');
  sl.value = Math.floor(Math.random() * 999) + 1;
  document.getElementById('val-seed').textContent = sl.value;
  drawPreview();
});

drawPreview();
