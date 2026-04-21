// host.jsx — runs inside Illustrator via CSInterface.evalScript()

function createBlob(paramsJSON) {
  var params = JSON.parse(paramsJSON);
  var doc = app.activeDocument;
  var W = doc.width;
  var H = doc.height;
  var cx = W / 2;
  var cy = H / 2;
  var r = Math.min(W, H) * 0.5 * (params.radius / 100) * 0.85;

  var pts = generateBlobPoints(cx, cy, r, params.points, params.noise, params.seed);
  var pathData = buildPathData(pts, params.smooth);

  var layer = doc.activeLayer;
  var pathItem = layer.pathItems.add();
  pathItem.setEntirePath(pathData);
  pathItem.closed = true;

  // fill
  var fc = new RGBColor();
  var fhex = params.fill.replace('#','');
  fc.red   = parseInt(fhex.substr(0,2),16);
  fc.green = parseInt(fhex.substr(2,2),16);
  fc.blue  = parseInt(fhex.substr(4,2),16);
  pathItem.filled = true;
  pathItem.fillColor = fc;

  // stroke
  if (params.sw > 0) {
    var sc = new RGBColor();
    var shex = params.stroke.replace('#','');
    sc.red   = parseInt(shex.substr(0,2),16);
    sc.green = parseInt(shex.substr(2,2),16);
    sc.blue  = parseInt(shex.substr(4,2),16);
    pathItem.stroked = true;
    pathItem.strokeColor = sc;
    pathItem.strokeWidth = params.sw;
  } else {
    pathItem.stroked = false;
  }

  return 'ok';
}

// ── Simplex noise (2D) ──────────────────────────────────────────────
var grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
var _p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
var perm = [];
for (var i=0;i<512;i++) perm[i]=_p[i&255];

function dot2(g,x,y){return g[0]*x+g[1]*y;}
function snoise(xin,yin){
  var F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  var s=(xin+yin)*F2,i=Math.floor(xin+s),j=Math.floor(yin+s);
  var t=(i+j)*G2,X0=i-t,Y0=j-t,x0=xin-X0,y0=yin-Y0;
  var i1=x0>y0?1:0,j1=x0>y0?0:1;
  var x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
  var ii=i&255,jj=j&255;
  var gi0=perm[ii+perm[jj]]%12,gi1=perm[ii+i1+perm[jj+j1]]%12,gi2=perm[ii+1+perm[jj+1]]%12;
  var n0=0,n1=0,n2=0;
  var t0=0.5-x0*x0-y0*y0; if(t0>=0){t0*=t0;n0=t0*t0*dot2(grad3[gi0],x0,y0);}
  var t1=0.5-x1*x1-y1*y1; if(t1>=0){t1*=t1;n1=t1*t1*dot2(grad3[gi1],x1,y1);}
  var t2=0.5-x2*x2-y2*y2; if(t2>=0){t2*=t2;n2=t2*t2*dot2(grad3[gi2],x2,y2);}
  return 70*(n0+n1+n2);
}

function generateBlobPoints(cx, cy, radius, numPts, noiseAmt, seed) {
  var pts = [];
  var nScale = 0.8 + seed * 0.001;
  for (var i = 0; i < numPts; i++) {
    var angle = (i / numPts) * Math.PI * 2;
    var nx = Math.cos(angle) * nScale + seed * 0.1;
    var ny = Math.sin(angle) * nScale + seed * 0.1;
    var n = snoise(nx, ny);
    var r = radius * (1 + n * (noiseAmt / 100) * 0.8);
    // Illustrator Y axis is flipped (origin bottom-left)
    pts.push([cx + Math.cos(angle) * r, cy - Math.sin(angle) * r]);
  }
  return pts;
}

function buildPathData(pts, smooth) {
  var n = pts.length;
  var tension = (smooth / 100) * 0.5;
  var result = [];
  for (var i = 0; i < n; i++) {
    var p0 = pts[(i - 1 + n) % n];
    var p1 = pts[i];
    var p2 = pts[(i + 1) % n];
    var p3 = pts[(i + 2) % n];
    var cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    var cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    var cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    var cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    var prev = pts[(i - 1 + n) % n];
    var pp0 = pts[(i - 2 + n) % n];
    var pp2 = pts[i];
    var pp3 = pts[(i + 1) % n];
    var lcp2x = p1[0] - (pp3[0] - pp0[0]) * tension;
    var lcp2y = p1[1] - (pp3[1] - pp0[1]) * tension;
    result.push([p1, [lcp2x, lcp2y], [cp1x, cp1y]]);
  }
  // format for setEntirePath: array of [anchor, leftDir, rightDir]
  var pathArr = [];
  for (var j = 0; j < result.length; j++) {
    pathArr.push([result[j][0], result[j][1], result[j][2]]);
  }
  return pathArr;
}
