import { useEffect, useRef, useState, useCallback } from "react";
import { Share2, Loader2, ZoomIn, ZoomOut, RotateCw, Square, Box, RefreshCw } from "lucide-react";
import { wiki } from "../api";

type GraphMode = "2d" | "3d";

interface GraphNode { id: string; type: string; title: string; tags: string[]; confidence: string; }
interface GraphEdge { source: string; target: string; type: string; }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; }
interface LayoutNode extends GraphNode { x: number; y: number; z: number; vx: number; vy: number; vz: number; pinned: boolean; }

const NODE_RADIUS = 8, REPULSION = 3000, ATTRACTION = 0.004, DAMPING = 0.85, CENTER_GRAV = 0.004, IDEAL_DIST = 160;
const REPULSION_3D = 4000, ATTRACTION_3D = 0.004, IDEAL_DIST_3D = 180, FOV_3D = 600, DEPTH_3D = 400;

const TYPE_COLORS: Record<string, string> = { entity: "#60a5fa", concept: "#34d399", comparison: "#fbbf24" };
const TYPE_COLORS_3D: Record<string, string> = { entity: "#7dd3fc", concept: "#6ee7b7", comparison: "#fde68a" };

function forceLayout2D(nodes: LayoutNode[], edges: GraphEdge[], w: number, h: number): void {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist2 = dx*dx + dy*dy, dist = Math.sqrt(dist2) || 1;
      const f = REPULSION / dist2, fx = (dx / dist) * f, fy = (dy / dist) * f;
      if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
      if (!b.pinned) { b.vx += fx; b.vy += fy; }
    }
  }
  for (const e of edges) {
    const s = nodes.find(n => n.id === e.source), t = nodes.find(n => n.id === e.target);
    if (!s || !t) continue;
    const dx = t.x-s.x, dy = t.y-s.y, dist = Math.sqrt(dx*dx+dy*dy) || 1;
    const f = ATTRACTION * (dist - IDEAL_DIST), fx = (dx/dist)*f, fy = (dy/dist)*f;
    if (!s.pinned) { s.vx += fx; s.vy += fy; }
    if (!t.pinned) { t.vx -= fx; t.vy -= fy; }
  }
  for (const n of nodes) {
    if (n.pinned) continue;
    n.vx += (cx-n.x)*CENTER_GRAV; n.vy += (cy-n.y)*CENTER_GRAV;
    n.vx *= DAMPING; n.vy *= DAMPING; n.x += n.vx; n.y += n.vy;
    n.x = Math.max(20, Math.min(w-20, n.x)); n.y = Math.max(20, Math.min(h-20, n.y));
  }
}

function forceLayout3D(nodes: LayoutNode[], edges: GraphEdge[]): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z, dist2=dx*dx+dy*dy+dz*dz, dist=Math.sqrt(dist2)||1;
      const f=REPULSION_3D/dist2, fx=dx/dist*f, fy=dy/dist*f, fz=dz/dist*f;
      if (!a.pinned) { a.vx-=fx; a.vy-=fy; a.vz-=fz; }
      if (!b.pinned) { b.vx+=fx; b.vy+=fy; b.vz+=fz; }
    }
  }
  for (const e of edges) {
    const s=nodes.find(n=>n.id===e.source), t=nodes.find(n=>n.id===e.target);
    if (!s||!t) continue;
    const dx=t.x-s.x, dy=t.y-s.y, dz=t.z-s.z, dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
    const f=ATTRACTION_3D*(dist-IDEAL_DIST_3D), fx=dx/dist*f, fy=dy/dist*f, fz=dz/dist*f;
    if (!s.pinned) { s.vx+=fx; s.vy+=fy; s.vz+=fz; }
    if (!t.pinned) { t.vx-=fx; t.vy-=fy; t.vz-=fz; }
  }
  for (const n of nodes) {
    if (n.pinned) continue;
    n.vx+=-n.x*CENTER_GRAV; n.vy+=-n.y*CENTER_GRAV; n.vz+=-n.z*CENTER_GRAV;
    n.vx*=DAMPING; n.vy*=DAMPING; n.vz*=DAMPING; n.x+=n.vx; n.y+=n.vy; n.z+=n.vz;
    const B=400;
    n.x=Math.max(-B,Math.min(B,n.x)); n.y=Math.max(-B,Math.min(B,n.y)); n.z=Math.max(-B,Math.min(B,n.z));
  }
}

function rotatePoint(x: number, y: number, z: number, rx: number, ry: number): [number,number,number] {
  const cosY=Math.cos(ry), sinY=Math.sin(ry), x1=x*cosY+z*sinY, z1=-x*sinY+z*cosY;
  const cosX=Math.cos(rx), sinX=Math.sin(rx);
  return [x1, y*cosX-z1*sinX, y*sinX+z1*cosX];
}

function project3D(x:number,y:number,z:number,w:number,h:number){
  const s=FOV_3D/(FOV_3D+z+DEPTH_3D); return { sx: w/2+x*s, sy: h/2+y*s, s };
}

function hexAlpha(hex: string, alpha: number): string {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

export default function WikiGraph() {
  const [data, setData] = useState<GraphData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [hoveredNode, setHoveredNode] = useState<string|null>(null);
  const [mode, setMode] = useState<GraphMode>("2d");
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayoutNode[]>([]);
  const animRef = useRef<number>(0);
  const [dim, setDim] = useState({ w: 800, h: 600 });
  const dimRef = useRef({ w: 800, h: 600 });
  const [scale2D, setScale2D] = useState(1);
  const [offset2D, setOffset2D] = useState({ x: 0, y: 0 });
  const scale2DRef = useRef(1), offset2DRef = useRef({ x: 0, y: 0 });
  const modeRef = useRef<GraphMode>("2d"), rotRef = useRef({ x: 0.3, y: 0 });
  const scale3DRef = useRef(1), orbitRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const hoveredRef = useRef<string|null>(null);
  const projectedRef = useRef<Array<{ id: string; sx: number; sy: number; s: number }>>([]);
  const starsRef = useRef<Array<{ x: number; y: number; r: number; a: number }>>([]);
  const drag2DRef = useRef<{ node: LayoutNode|null; ox: number; oy: number; svgLeft: number; svgTop: number; sc: number; offX: number; offY: number }>({ node: null, ox: 0, oy: 0, svgLeft: 0, svgTop: 0, sc: 1, offX: 0, offY: 0 });
  const drag3DRef = useRef<{ node: LayoutNode|null; lastX: number; lastY: number; s: number }>({ node: null, lastX: 0, lastY: 0, s: 1 });
  const pan2DRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const prevModeRef = useRef<GraphMode>("2d");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { scale2DRef.current = scale2D; }, [scale2D]);
  useEffect(() => { offset2DRef.current = offset2D; }, [offset2D]);
  useEffect(() => { dimRef.current = dim; }, [dim]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await wiki.graph(); setData(d); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!data) return;
    const w = containerRef.current?.clientWidth ?? 800, h = containerRef.current?.clientHeight ?? 600;
    setDim({ w, h }); dimRef.current = { w, h };
    const spread = Math.min(w, h) * 0.38;
    layoutRef.current = data.nodes.map(node => ({
      ...node, x: w/2+(Math.random()-0.5)*spread*2, y: h/2+(Math.random()-0.5)*spread*2, z: 0, vx: 0, vy: 0, vz: 0, pinned: false,
    }));
  }, [data]);

  useEffect(() => {
    const nodes = layoutRef.current, { w, h } = dimRef.current;
    if (!nodes.length) { prevModeRef.current = mode; return; }
    if (mode === "3d" && prevModeRef.current === "2d") {
      const spread = Math.min(w,h)*0.25;
      for (const n of nodes) { n.x -= w/2; n.y -= h/2; n.z = (Math.random()-0.5)*spread; n.vz = 0; }
      rotRef.current = { x: 0.3, y: 0 }; scale3DRef.current = 1;
    } else if (mode === "2d" && prevModeRef.current === "3d") {
      for (const n of nodes) { n.x += w/2; n.y += h/2; n.z = 0; n.vz = 0; }
    }
    prevModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio||1, w = container.clientWidth, h = container.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr; canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  }, [mode]);

  useEffect(() => {
    starsRef.current = Array.from({ length: 260 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random()<0.06 ? Math.random()*1.4+0.7 : Math.random()*0.7+0.15,
      a: Math.random()*0.55+0.15,
    }));
  }, []);

  const simulate = useCallback(() => {
    const nodes = layoutRef.current, edges = data?.edges ?? [];
    if (!nodes.length) { animRef.current = requestAnimationFrame(simulate); return; }
    const currentMode = modeRef.current, { w, h } = dimRef.current;
    for (let iter = 0; iter < 4; iter++) {
      if (currentMode === "3d") forceLayout3D(nodes, edges);
      else forceLayout2D(nodes, edges, w, h);
    }
    if (currentMode === "2d") {
      const svg = svgRef.current;
      if (svg) {
        const g = svg.querySelector("g[data-graph]") as SVGGElement|null;
        if (g) {
          const sc = scale2DRef.current, off = offset2DRef.current;
          g.setAttribute("transform", `translate(${off.x},${off.y}) scale(${sc})`);
          const nm = new Map(nodes.map(n => [n.id, n]));
          g.querySelectorAll<SVGCircleElement>("circle").forEach(c => { const n = nm.get(c.getAttribute("data-id")??""); if (n) { c.setAttribute("cx", String(n.x)); c.setAttribute("cy", String(n.y)); } });
          g.querySelectorAll<SVGLineElement>("line").forEach(l => { const sn = nm.get(l.getAttribute("data-source")??""), tn = nm.get(l.getAttribute("data-target")??""); if (sn&&tn) { l.setAttribute("x1",String(sn.x)); l.setAttribute("y1",String(sn.y)); l.setAttribute("x2",String(tn.x)); l.setAttribute("y2",String(tn.y)); } });
          g.querySelectorAll<SVGTextElement>("text").forEach(t => { const n = nm.get(t.getAttribute("data-id")??""); if (n) { t.setAttribute("x",String(n.x)); t.setAttribute("y",String(n.y-NODE_RADIUS-6)); } });
        }
      }
    } else {
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(simulate); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { animRef.current = requestAnimationFrame(simulate); return; }
      const dpr = window.devicePixelRatio||1, cw = canvas.width/dpr, ch = canvas.height/dpr;
      const rx = rotRef.current.x, ry = rotRef.current.y, s3d = scale3DRef.current, hov = hoveredRef.current;
      ctx.save(); ctx.scale(dpr, dpr);
      ctx.fillStyle = "#05050e"; ctx.fillRect(0,0,cw,ch);
      const neb = ctx.createRadialGradient(cw*.5,ch*.5,0,cw*.5,ch*.5,Math.min(cw,ch)*.7);
      neb.addColorStop(0,"rgba(35,15,90,0.22)"); neb.addColorStop(.45,"rgba(10,8,45,0.12)"); neb.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = neb; ctx.fillRect(0,0,cw,ch);
      for (const star of starsRef.current) { ctx.beginPath(); ctx.arc(star.x*cw,star.y*ch,star.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${star.a.toFixed(2)})`; ctx.fill(); }
      const projected = nodes.map(n => { const [rx2,ry2,rz]=rotatePoint(n.x*s3d,n.y*s3d,n.z*s3d,rx,ry); const {sx,sy,s}=project3D(rx2,ry2,rz,cw,ch); return {id:n.id,title:n.title,type:n.type,sx,sy,s,rz}; });
      projectedRef.current = projected.map(({id,sx,sy,s})=>({id,sx,sy,s}));
      const sorted = [...projected].sort((a,b)=>a.rz-b.rz);
      for (const e of edges) {
        const sn=projected.find(p=>p.id===e.source), tn=projected.find(p=>p.id===e.target);
        if (!sn||!tn) continue;
        const isHL = hov===e.source||hov===e.target;
        const grad = ctx.createLinearGradient(sn.sx,sn.sy,tn.sx,tn.sy);
        grad.addColorStop(0,isHL?"rgba(130,180,255,0.35)":"rgba(80,120,200,0.06)");
        grad.addColorStop(.5,isHL?"rgba(150,200,255,0.55)":"rgba(100,150,220,0.13)");
        grad.addColorStop(1,isHL?"rgba(130,180,255,0.35)":"rgba(80,120,200,0.06)");
        ctx.beginPath(); ctx.moveTo(sn.sx,sn.sy); ctx.lineTo(tn.sx,tn.sy);
        ctx.strokeStyle=grad; ctx.lineWidth=isHL?1.3:0.7; ctx.stroke();
      }
      for (const n of sorted) {
        const color=TYPE_COLORS_3D[n.type]??"#7dd3fc", r=Math.max(4,NODE_RADIUS*n.s*2.6), isHov=n.id===hov, depth=Math.max(0.1,Math.min(1,n.s*2.6));
        const coronaR=r*(isHov?5.5:4), corona=ctx.createRadialGradient(n.sx,n.sy,r*.4,n.sx,n.sy,coronaR);
        corona.addColorStop(0,hexAlpha(color,(isHov?0.38:0.16)*depth)); corona.addColorStop(1,hexAlpha(color,0));
        ctx.beginPath(); ctx.arc(n.sx,n.sy,coronaR,0,Math.PI*2); ctx.fillStyle=corona; ctx.fill();
        const body=ctx.createRadialGradient(n.sx-r*.32,n.sy-r*.32,0,n.sx,n.sy,r);
        body.addColorStop(0,hexAlpha(color,isHov?1:Math.min(1,depth*1.3))); body.addColorStop(.55,hexAlpha(color,(isHov?.82:.65)*depth)); body.addColorStop(1,hexAlpha(color,(isHov?.22:.08)*depth));
        ctx.beginPath(); ctx.arc(n.sx,n.sy,r,0,Math.PI*2); ctx.fillStyle=body; ctx.fill();
        const cR=r*.32, core=ctx.createRadialGradient(n.sx-cR*.5,n.sy-cR*.5,0,n.sx,n.sy,cR);
        core.addColorStop(0,`rgba(255,255,255,${((isHov?.98:.72)*depth).toFixed(2)})`); core.addColorStop(1,"rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(n.sx,n.sy,cR,0,Math.PI*2); ctx.fillStyle=core; ctx.fill();
        const label=n.title.length>20?n.title.slice(0,20)+"…":n.title, fontSize=Math.max(8,Math.round(Math.min(12,8+depth*5))), labelA=isHov?.97:Math.max(.25,.3+depth*.65);
        ctx.font=`${fontSize}px system-ui,sans-serif`; ctx.textAlign="center";
        ctx.shadowColor=hexAlpha(color,isHov?.85:.55*depth); ctx.shadowBlur=isHov?10:5;
        ctx.fillStyle=isHov?"rgba(220,240,255,0.97)":`rgba(190,220,255,${labelA.toFixed(2)})`;
        ctx.fillText(label,n.sx,n.sy-r-4); ctx.shadowBlur=0; ctx.shadowColor="transparent";
      }
      {
        const ax=cw-44, ay=ch-44;
        for (const [x,y,z,col] of [[18,0,0,"#f87171"],[0,-18,0,"#4ade80"],[0,0,18,"#60a5fa"]] as [number,number,number,string][]) {
          const [rx2,ry2]=rotatePoint(x,y,z,rx,ry), {sx:ex,sy:ey}=project3D(rx2*.5,ry2*.5,0,0,0);
          ctx.shadowColor=col; ctx.shadowBlur=5; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+ex,ay+ey);
          ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();
        }
        ctx.shadowBlur=0; ctx.shadowColor="transparent";
      }
      ctx.restore();
    }
    animRef.current = requestAnimationFrame(simulate);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, simulate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width, h = entry.contentRect.height;
        setDim({ w, h }); dimRef.current = { w, h };
        const canvas = canvasRef.current;
        if (canvas) { const dpr = window.devicePixelRatio||1; canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=`${w}px`; canvas.style.height=`${h}px`; }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown2D = useCallback((nodeId: string, e: React.MouseEvent) => {
    const node = layoutRef.current.find(n => n.id === nodeId), svg = svgRef.current;
    if (!node || !svg) return;
    e.stopPropagation(); node.pinned = true;
    const rect = svg.getBoundingClientRect(), sc = scale2DRef.current, offX = offset2DRef.current.x, offY = offset2DRef.current.y;
    const ox = e.clientX-(rect.left+offX+node.x*sc), oy = e.clientY-(rect.top+offY+node.y*sc);
    drag2DRef.current = { node, ox, oy, svgLeft: rect.left, svgTop: rect.top, sc, offX, offY };
    const onMove = (ev: MouseEvent) => { const d = drag2DRef.current; if (!d.node) return; d.node.x=(ev.clientX-d.ox-d.svgLeft-d.offX)/d.sc; d.node.y=(ev.clientY-d.oy-d.svgTop-d.offY)/d.sc; };
    const onUp = () => { const d=drag2DRef.current; if (d.node){d.node.pinned=false;d.node.vx=0;d.node.vy=0;} drag2DRef.current.node=null; document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  const handleSVGMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const tag = (e.target as Element).tagName.toLowerCase();
    if (tag === "circle" || tag === "text") return;
    pan2DRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!pan2DRef.current.active) return;
    const dx = e.clientX-pan2DRef.current.lastX, dy = e.clientY-pan2DRef.current.lastY;
    pan2DRef.current.lastX = e.clientX; pan2DRef.current.lastY = e.clientY;
    const next = { x: offset2DRef.current.x+dx, y: offset2DRef.current.y+dy };
    offset2DRef.current = next; setOffset2D(next);
  }, []);

  const handleSVGMouseUp = useCallback(() => { pan2DRef.current.active = false; }, []);

  const hitTest3D = useCallback((mx: number, my: number) =>
    projectedRef.current.find(({ sx, sy, s }) => { const dx=mx-sx,dy=my-sy; return Math.sqrt(dx*dx+dy*dy)<Math.max(6,NODE_RADIUS*s*2.5)+5; }), []);

  const handle3DMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect(), hit = hitTest3D(e.clientX-rect.left, e.clientY-rect.top);
    if (hit) { const node=layoutRef.current.find(n=>n.id===hit.id); if (node){node.pinned=true; drag3DRef.current={node,lastX:e.clientX,lastY:e.clientY,s:hit.s};} }
    else orbitRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  }, [hitTest3D]);

  const handle3DMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect(), hit = hitTest3D(e.clientX-rect.left, e.clientY-rect.top);
    setHoveredNode(hit ? hit.id : null);
    const d = drag3DRef.current;
    if (d.node) {
      const dsx=e.clientX-d.lastX, dsy=e.clientY-d.lastY;
      d.lastX=e.clientX; d.lastY=e.clientY;
      const [wx,wy,wz]=rotatePoint(dsx/(d.s*scale3DRef.current),dsy/(d.s*scale3DRef.current),0,-rotRef.current.x,-rotRef.current.y);
      d.node.x+=wx; d.node.y+=wy; d.node.z+=wz; return;
    }
    if (orbitRef.current.active) {
      rotRef.current.y+=(e.clientX-orbitRef.current.lastX)*0.005; rotRef.current.x+=(e.clientY-orbitRef.current.lastY)*0.005;
      orbitRef.current.lastX=e.clientX; orbitRef.current.lastY=e.clientY;
    }
  }, [hitTest3D]);

  const handle3DMouseUp = useCallback(() => {
    const d=drag3DRef.current;
    if (d.node){d.node.pinned=false;d.node.vx=0;d.node.vy=0;d.node.vz=0;d.node=null;}
    orbitRef.current.active=false;
  }, []);

  const handle3DWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault(); scale3DRef.current=Math.max(0.3,Math.min(3,scale3DRef.current-e.deltaY*0.001));
  }, []);

  const applyZoom2D = useCallback((mx: number, my: number, delta: number) => {
    const oldScale=scale2DRef.current, newScale=Math.max(0.3,Math.min(3,oldScale+delta));
    if (newScale===oldScale) return;
    const ratio=newScale/oldScale, newOffset={x:mx-(mx-offset2DRef.current.x)*ratio, y:my-(my-offset2DRef.current.y)*ratio};
    scale2DRef.current=newScale; offset2DRef.current=newOffset; setScale2D(newScale); setOffset2D(newOffset);
  }, []);

  const headerBar = (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-text-secondary" />
        <h1 className="text-lg font-semibold">Wiki Graph</h1>
        {data && <span className="text-xs text-text-tertiary">{data.nodes.length} nodes · {data.edges.length} edges</span>}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => void load()} className="rounded p-1.5 text-text-tertiary hover:text-text-secondary transition-colors mr-1"><RefreshCw className="h-4 w-4" /></button>
        <div className="flex rounded border border-current/20 overflow-hidden mr-2">
          {(["2d","3d"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode===m?"bg-midground/30 text-text-primary":"text-text-tertiary hover:text-text-secondary"}`}>
              {m === "2d" ? <Square className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />} {m.toUpperCase()}
            </button>
          ))}
        </div>
        <button title="Zoom in" className="rounded bg-current/10 p-1.5 hover:bg-current/20" onClick={() => { if (mode==="2d"){const{w,h}=dimRef.current;applyZoom2D(w/2,h/2,.2);}else scale3DRef.current=Math.min(scale3DRef.current+.2,3); }}><ZoomIn className="h-4 w-4" /></button>
        <button title="Zoom out" className="rounded bg-current/10 p-1.5 hover:bg-current/20" onClick={() => { if (mode==="2d"){const{w,h}=dimRef.current;applyZoom2D(w/2,h/2,-.2);}else scale3DRef.current=Math.max(scale3DRef.current-.2,.3); }}><ZoomOut className="h-4 w-4" /></button>
        <button title="Reset" className="rounded bg-current/10 p-1.5 hover:bg-current/20" onClick={() => { if (mode==="2d"){const z={x:0,y:0};setOffset2D(z);offset2DRef.current=z;setScale2D(1);scale2DRef.current=1;}else{rotRef.current={x:.3,y:0};scale3DRef.current=1;} }}><RotateCw className="h-4 w-4" /></button>
      </div>
    </div>
  );

  if (loading) return <div>{headerBar}<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div></div>;
  if (error) return <div>{headerBar}<div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-400">{error}</div></div>;

  const graphNodes = layoutRef.current;

  return (
    <div className="flex flex-col" style={{ minHeight: 500 }}>
      {headerBar}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-text-secondary">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type.charAt(0).toUpperCase()+type.slice(1)}
          </span>
        ))}
      </div>
      <div ref={containerRef} className={`relative flex-1 overflow-hidden rounded-lg border ${mode==="3d"?"border-white/5 bg-[#05050e]":"border-current/10 bg-current/[0.02]"}`} style={{ height: 480 }}>
        <svg ref={svgRef} width="100%" height="100%" className="select-none" style={{ display: mode==="2d"?"block":"none" }}
          onMouseDown={handleSVGMouseDown} onMouseMove={handleSVGMouseMove} onMouseUp={handleSVGMouseUp} onMouseLeave={handleSVGMouseUp}
          onWheel={e => { e.preventDefault(); const rect=svgRef.current!.getBoundingClientRect(); applyZoom2D(e.clientX-rect.left,e.clientY-rect.top,-e.deltaY*.001); }}>
          <g data-graph transform={`translate(${offset2D.x},${offset2D.y}) scale(${scale2D})`}>
            {data?.edges.map((edge, i) => {
              const nm=new Map(graphNodes.map(n=>[n.id,n])), src=nm.get(edge.source), tgt=nm.get(edge.target), hl=hoveredNode===edge.source||hoveredNode===edge.target;
              return <line key={`e-${i}`} data-source={edge.source} data-target={edge.target} x1={src?.x??0} y1={src?.y??0} x2={tgt?.x??0} y2={tgt?.y??0} stroke={hl?"#ffffff":"currentColor"} strokeOpacity={hl?.6:.15} strokeWidth={hl?2:1} />;
            })}
            {graphNodes.map(node => {
              const isHov=hoveredNode===node.id, color=TYPE_COLORS[node.type]??"#888";
              return (
                <g key={node.id}>
                  <circle data-id={node.id} cx={node.x} cy={node.y} r={isHov?NODE_RADIUS+3:NODE_RADIUS} fill={color} fillOpacity={isHov?1:.75}
                    stroke={isHov?"#fff":"none"} strokeWidth={2} style={{cursor:"grab"}}
                    onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                    onMouseDown={e => handleMouseDown2D(node.id, e)} />
                  {isHov && <text data-id={node.id} x={node.x} y={node.y-NODE_RADIUS-6} textAnchor="middle" fill="currentColor" fontSize={11} className="pointer-events-none">{node.title.length>26?node.title.slice(0,26)+"…":node.title}</text>}
                </g>
              );
            })}
          </g>
        </svg>
        <canvas ref={canvasRef} className="select-none" style={{ display: mode==="3d"?"block":"none", width:"100%", height:"100%" }}
          onMouseDown={handle3DMouseDown} onMouseMove={handle3DMouseMove} onMouseUp={handle3DMouseUp} onMouseLeave={handle3DMouseUp} onWheel={handle3DWheel} />
        {!graphNodes.length && <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-text-tertiary">No graph data available.</p></div>}
      </div>
    </div>
  );
}
