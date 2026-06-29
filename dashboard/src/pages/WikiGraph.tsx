import { useEffect, useRef, useState, useCallback } from "react";
import { Share2, Loader2, ZoomIn, ZoomOut, RotateCw, Square, Box, RefreshCw } from "lucide-react";
import { wiki } from "../api";

type GraphMode = "2d" | "3d";

interface GraphNode { id: string; type: string; title: string; tags: string[]; confidence: string; inbound_count: number; mastery?: number; }
interface GraphEdge { source: string; target: string; type: string; shared_tags: number; rel_type?: string; }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; }
interface LayoutNode extends GraphNode { x: number; y: number; z: number; vx: number; vy: number; vz: number; pinned: boolean; }

const NODE_RADIUS = 8, REPULSION = 12000, ATTRACTION = 0.002, DAMPING = 0.82, CENTER_GRAV = 0.002, IDEAL_DIST = 280;
const REPULSION_3D = 18000, ATTRACTION_3D = 0.002, IDEAL_DIST_3D = 320, FOV_3D = 600, DEPTH_3D = 400;

function nodeRadius(n: GraphNode | LayoutNode): number {
  return NODE_RADIUS + Math.min((n.inbound_count ?? 0) * 2, 14);
}
function edgeWidth(e: GraphEdge): number {
  return 0.5 + Math.min((e.shared_tags ?? 0) * 0.4, 2);
}

const TYPE_COLORS: Record<string, string> = { entity: "#60a5fa", concept: "#34d399", comparison: "#fbbf24" };
const TYPE_COLORS_3D: Record<string, string> = { entity: "#7dd3fc", concept: "#6ee7b7", comparison: "#fde68a" };

const EDGE_TYPE_COLORS: Record<string, string> = {
  prerequisite: "#f97316",
  contains: "#60a5fa",
  applies_to: "#34d399",
};
const EDGE_TYPE_COLORS_HL: Record<string, string> = {
  prerequisite: "#fdba74",
  contains: "#93c5fd",
  applies_to: "#6ee7b7",
};
const DIRECTED_TYPES = new Set(["prerequisite", "contains", "applies_to"]);
const EDGE_LABELS: Record<string, string> = { prerequisite: "前置", contains: "包含", related: "關聯", applies_to: "應用" };

const MASTERY_GLOW = ["rgba(0,0,0,0)","rgba(148,163,184,0.25)","rgba(96,165,250,0.3)","rgba(52,211,153,0.35)","rgba(251,191,36,0.4)","rgba(192,132,252,0.45)"];

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
  const [pathChain, setPathChain] = useState<{ path: string; title: string; mastery: number }[] | null>(null);
  const [loadingPath, setLoadingPath] = useState(false);
  const [masteryMin, setMasteryMin] = useState(0);
  const [bloomGraph, setBloomGraph] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showRecommend, setShowRecommend] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);

const BLOOM_G = ["remember","understand","apply","analyze","evaluate","create"] as const;
const BLOOM_GL: Record<string,string> = { remember:"記憶",understand:"理解",apply:"應用",analyze:"分析",evaluate:"評估",create:"創作" };
const BLOOM_GC: Record<string,string> = { remember:"#94a3b8",understand:"#60a5fa",apply:"#34d399",analyze:"#fbbf24",evaluate:"#f97316",create:"#c084fc" };
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayoutNode[]>([]);
  const animRef = useRef<number>(0);
  const [dim, setDim] = useState({ w: 800, h: 520 });
  const dimRef = useRef({ w: 800, h: 520 });
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
    const w = containerRef.current?.clientWidth ?? 800, h = containerRef.current?.clientHeight ?? 520;
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
        const w3d = edgeWidth(e as GraphEdge);
        const rt = (e as GraphEdge).rel_type ?? "related";
        const typeHex = EDGE_TYPE_COLORS[rt];
        const grad = ctx.createLinearGradient(sn.sx,sn.sy,tn.sx,tn.sy);
        if (typeHex) {
          const rv=parseInt(typeHex.slice(1,3),16), gv=parseInt(typeHex.slice(3,5),16), bv=parseInt(typeHex.slice(5,7),16);
          grad.addColorStop(0,isHL?`rgba(${rv},${gv},${bv},0.45)`:`rgba(${rv},${gv},${bv},0.10)`);
          grad.addColorStop(.5,isHL?`rgba(${rv},${gv},${bv},0.65)`:`rgba(${rv},${gv},${bv},0.18)`);
          grad.addColorStop(1,isHL?`rgba(${rv},${gv},${bv},0.45)`:`rgba(${rv},${gv},${bv},0.10)`);
        } else {
          grad.addColorStop(0,isHL?"rgba(130,180,255,0.35)":"rgba(80,120,200,0.06)");
          grad.addColorStop(.5,isHL?"rgba(150,200,255,0.55)":"rgba(100,150,220,0.13)");
          grad.addColorStop(1,isHL?"rgba(130,180,255,0.35)":"rgba(80,120,200,0.06)");
        }
        ctx.beginPath(); ctx.moveTo(sn.sx,sn.sy); ctx.lineTo(tn.sx,tn.sy);
        ctx.strokeStyle=grad; ctx.lineWidth=isHL?w3d*0.8+0.5:w3d*0.5; ctx.stroke();
      }
      for (const n of sorted) {
        const srcNode = nodes.find(nd=>nd.id===n.id);
        const baseR = srcNode ? nodeRadius(srcNode) : NODE_RADIUS;
        const color=TYPE_COLORS_3D[n.type]??"#7dd3fc", r=Math.max(4,baseR*n.s*2.6*0.7), isHov=n.id===hov, depth=Math.max(0.1,Math.min(1,n.s*2.6));
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

  const hitTest3D = useCallback((mx: number, my: number) => {
    const nodeMap = new Map((data?.nodes ?? []).map(n => [n.id, n]));
    return projectedRef.current.find(({ id, sx, sy, s }) => {
      const base = nodeRadius(nodeMap.get(id) ?? { inbound_count: 0 } as GraphNode);
      const dx=mx-sx, dy=my-sy;
      return Math.sqrt(dx*dx+dy*dy) < Math.max(6, base*s*2.5*0.7)+5;
    });
  }, [data]);

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

  const btnStyle: React.CSSProperties = { borderRadius: 6, padding: "4px 6px", background: "rgba(128,128,128,0.1)", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center" };
  const headerBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Share2 style={{ width: 18, height: 18 }} />
        <h1 className="wiki-heading" style={{ margin: 0 }}>Wiki Graph</h1>
        {data && <span className="wiki-muted">{data.nodes.length} nodes · {data.edges.length} edges</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button style={btnStyle} onClick={() => void load()} title="Refresh"><RefreshCw style={{ width: 14, height: 14 }} /></button>
        <button style={{ ...btnStyle, background: showRecommend ? "rgba(250,204,21,0.15)" : "rgba(128,128,128,0.1)", color: showRecommend ? "#facc15" : "inherit" }}
          title="下一步學習推薦"
          onClick={async () => {
            if (showRecommend) { setShowRecommend(false); return; }
            setShowRecommend(true);
            if (!recommendations.length) {
              setLoadingRec(true);
              try { const r = await wiki.nextToLearn(); setRecommendations(r ?? []); } catch (e) { console.error(e); }
              setLoadingRec(false);
            }
          }}
        >推薦</button>
        <div style={{ display: "flex", borderRadius: 6, border: "1px solid rgba(128,128,128,0.2)", overflow: "hidden", marginRight: 8 }}>
          {(["2d","3d"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: mode===m ? "rgba(128,128,128,0.25)" : "transparent", color: "inherit" }}>
              {m === "2d" ? <Square style={{ width: 12, height: 12 }} /> : <Box style={{ width: 12, height: 12 }} />} {m.toUpperCase()}
            </button>
          ))}
        </div>
        <button style={btnStyle} title="Zoom in" onClick={() => { if (mode==="2d"){const{w,h}=dimRef.current;applyZoom2D(w/2,h/2,.2);}else scale3DRef.current=Math.min(scale3DRef.current+.2,3); }}><ZoomIn style={{ width: 14, height: 14 }} /></button>
        <button style={btnStyle} title="Zoom out" onClick={() => { if (mode==="2d"){const{w,h}=dimRef.current;applyZoom2D(w/2,h/2,-.2);}else scale3DRef.current=Math.max(scale3DRef.current-.2,.3); }}><ZoomOut style={{ width: 14, height: 14 }} /></button>
        <button style={btnStyle} title="Reset" onClick={() => { if (mode==="2d"){const z={x:0,y:0};setOffset2D(z);offset2DRef.current=z;setScale2D(1);scale2DRef.current=1;}else{rotRef.current={x:.3,y:0};scale3DRef.current=1;} }}><RotateCw style={{ width: 14, height: 14 }} /></button>
      </div>
    </div>
  );

  if (loading) return <div>{headerBar}<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem 0" }}><Loader2 style={{ width:24, height:24 }} /></div></div>;
  if (error) return <div>{headerBar}<div className="wiki-error">{error}</div></div>;

  const graphNodes = layoutRef.current;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {headerBar}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, marginBottom: 10, alignItems: "center" }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", backgroundColor: color }} />
            {type.charAt(0).toUpperCase()+type.slice(1)}
          </span>
        ))}
        <span style={{ width: 1, height: 13, background: "rgba(128,128,128,0.25)", margin: "0 2px" }} />
        {(["prerequisite","contains","related","applies_to"] as const).map(rt => {
          const color = EDGE_TYPE_COLORS[rt] ?? "rgba(128,128,128,0.5)";
          const directed = DIRECTED_TYPES.has(rt);
          return (
            <span key={rt} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="22" height="10" style={{ overflow: "visible", flexShrink: 0 }}>
                <line x1="0" y1="5" x2={directed ? 14 : 22} y2="5" stroke={color} strokeWidth="1.5" strokeOpacity={rt === "related" ? 0.5 : 0.9} />
                {directed && <polygon points="14,2 22,5 14,8" fill={color} opacity={0.9} />}
              </svg>
              {EDGE_LABELS[rt]}
            </span>
          );
        })}
        <span style={{ marginLeft: 4, color: "var(--color-text-tertiary,#888)" }}>
          節點大小 = 被引用次數
        </span>
      </div>

      {/* Node filter row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: "var(--color-text-tertiary,#888)", flexShrink: 0 }}>節點篩選：</span>
        <label style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--color-text-secondary,#aaa)" }}>
          熟練度 ≥
          <select value={masteryMin} onChange={e => setMasteryMin(Number(e.target.value))}
            style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(128,128,128,0.2)", background: "rgba(128,128,128,0.06)", color: "inherit", cursor: "pointer" }}>
            {[0,1,2,3,4,5].map(v => <option key={v} value={v}>{v === 0 ? "全部" : v}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setBloomGraph("")}
            style={{ fontSize: 11, padding: "1px 8px", borderRadius: 9999, border: `1px solid ${!bloomGraph ? "rgba(128,128,128,0.5)" : "rgba(128,128,128,0.2)"}`, background: !bloomGraph ? "rgba(128,128,128,0.12)" : "transparent", cursor: "pointer", color: "inherit" }}>全部</button>
          {BLOOM_G.map(b => (
            <button key={b} onClick={() => setBloomGraph(bloomGraph === b ? "" : b)}
              style={{ fontSize: 11, padding: "1px 8px", borderRadius: 9999, cursor: "pointer",
                border: `1px solid ${bloomGraph === b ? BLOOM_GC[b] : "rgba(128,128,128,0.2)"}`,
                background: bloomGraph === b ? `${BLOOM_GC[b]}22` : "transparent",
                color: bloomGraph === b ? BLOOM_GC[b] : "var(--color-text-secondary,#aaa)",
              }}>{BLOOM_GL[b]}</button>
          ))}
        </div>
        {(masteryMin > 0 || bloomGraph) && (
          <button onClick={() => { setMasteryMin(0); setBloomGraph(""); }}
            style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, border: "1px solid rgba(128,128,128,0.2)", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary,#888)" }}>清除篩選</button>
        )}
      </div>

      {/* Recommend panel */}
      {showRecommend && (
        <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(250,204,21,0.25)", background: "rgba(250,204,21,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#facc15" }}>下一步學習推薦</span>
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary,#888)" }}>前置依賴已達熟練度 3+</span>
          </div>
          {loadingRec && <span style={{ fontSize: 12, color: "var(--color-text-tertiary,#888)" }}>載入中…</span>}
          {!loadingRec && recommendations.length === 0 && <span style={{ fontSize: 12, color: "var(--color-text-tertiary,#888)" }}>暫無推薦（需先在頁面設定 prerequisite 關係與 mastery 等級）</span>}
          {!loadingRec && recommendations.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recommendations.map(r => (
                <button key={r.path}
                  onClick={async () => {
                    setLoadingPath(true);
                    try { const res = await wiki.learningPath(r.path); setPathChain(res.chain ?? []); } catch (e) { console.error(e); }
                    setLoadingPath(false);
                  }}
                  style={{ fontSize: 12, padding: "3px 10px", borderRadius: 9999, cursor: "pointer",
                    border: "1px solid rgba(250,204,21,0.3)", background: "rgba(250,204,21,0.06)",
                    color: "var(--color-text-primary,#fff)",
                  }}
                >
                  {r.title.length > 18 ? r.title.slice(0,18)+"…" : r.title}
                  {r.bloom && <span style={{ marginLeft: 4, fontSize: 9, color: BLOOM_GC[r.bloom] ?? "#888" }}>{BLOOM_GL[r.bloom]}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} style={{ position: "relative", overflow: "hidden", borderRadius: 8, border: `1px solid ${mode==="3d"?"rgba(255,255,255,0.06)":"rgba(128,128,128,0.15)"}`, background: mode==="3d"?"#05050e":"rgba(128,128,128,0.02)", height: 520 }}>
        <svg ref={svgRef} width="100%" height="100%" className="select-none" style={{ display: mode==="2d"?"block":"none" }}
          onMouseDown={handleSVGMouseDown} onMouseMove={handleSVGMouseMove} onMouseUp={handleSVGMouseUp} onMouseLeave={handleSVGMouseUp}
          onWheel={e => { e.preventDefault(); const rect=svgRef.current!.getBoundingClientRect(); applyZoom2D(e.clientX-rect.left,e.clientY-rect.top,-e.deltaY*.001); }}>
          <defs>
            {(["prerequisite","contains","applies_to"] as const).map(rt => (
              [
                <marker key={rt} id={`arr-${rt}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={EDGE_TYPE_COLORS[rt]} />
                </marker>,
                <marker key={`${rt}-hl`} id={`arr-${rt}-hl`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={EDGE_TYPE_COLORS_HL[rt]} />
                </marker>,
              ]
            ))}
            <marker id="arr-path" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#facc15" />
            </marker>
          </defs>
          <g data-graph transform={`translate(${offset2D.x},${offset2D.y}) scale(${scale2D})`}>
            {data?.edges.map((edge, i) => {
              const nm=new Map(graphNodes.map(n=>[n.id,n])), src=nm.get(edge.source), tgt=nm.get(edge.target);
              const hl=hoveredNode===edge.source||hoveredNode===edge.target;
              const w = edgeWidth(edge);
              const rt = edge.rel_type ?? "related";
              const directed = DIRECTED_TYPES.has(rt);
              const chainPaths = pathChain ? new Set(pathChain.map(p => p.path)) : null;
              const inPathEdge = chainPaths?.has(edge.source) && chainPaths?.has(edge.target) && rt === "prerequisite";
              const stroke = inPathEdge ? "#facc15"
                : hl ? (EDGE_TYPE_COLORS_HL[rt] ?? "#ffffff")
                : rt === "related" ? "currentColor" : (EDGE_TYPE_COLORS[rt] ?? "currentColor");
              const opacity = inPathEdge ? 0.9 : hl ? 0.75 : rt === "related" ? 0.18 : 0.6;
              const marker = (directed || inPathEdge) ? `url(#arr-${inPathEdge ? "path" : rt}${hl&&!inPathEdge?"-hl":""})` : undefined;
              return (
                <line key={`e-${i}`} data-source={edge.source} data-target={edge.target}
                  x1={src?.x??0} y1={src?.y??0} x2={tgt?.x??0} y2={tgt?.y??0}
                  stroke={stroke} strokeOpacity={opacity} strokeWidth={hl?w+1:w}
                  markerEnd={marker} />
              );
            })}
            {graphNodes.map(node => {
              const isHov=hoveredNode===node.id, color=TYPE_COLORS[node.type]??"#888", r=nodeRadius(node);
              const m = node.mastery ?? 0;
              const inPath = pathChain?.some(p => p.path === node.id);
              const pathIdx = pathChain ? pathChain.findIndex(p => p.path === node.id) : -1;
              const glowColor = m > 0 ? MASTERY_GLOW[m] : undefined;
              const passFilter = (masteryMin === 0 || m >= masteryMin) && (!bloomGraph || (node as any).bloom === bloomGraph);
              const dimmed = !passFilter && (masteryMin > 0 || bloomGraph !== "");
              const nodeBloom: string = (node as any).bloom ?? "";
              return (
                <g key={node.id}>
                  {/* mastery glow ring */}
                  {m > 0 && <circle data-id={node.id} cx={node.x} cy={node.y} r={r+6+m} fill={glowColor} className="pointer-events-none" />}
                  {/* path highlight ring */}
                  {inPath && <circle data-id={node.id} cx={node.x} cy={node.y} r={r+4} fill="rgba(250,204,21,0.18)" stroke="#facc15" strokeWidth={1.5} className="pointer-events-none" />}
                  <circle data-id={node.id} cx={node.x} cy={node.y} r={isHov?r+3:r} fill={color}
                    fillOpacity={dimmed ? 0.08 : isHov?1:inPath?1:.75}
                    stroke={inPath?"#facc15":isHov?"#fff":"none"} strokeWidth={2} style={{cursor: dimmed?"default":"pointer"}}
                    onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                    onMouseDown={e => handleMouseDown2D(node.id, e)}
                    onClick={async () => {
                      if (pathChain?.some(p => p.path === node.id)) { setPathChain(null); return; }
                      setLoadingPath(true);
                      try { const r2 = await wiki.learningPath(node.id); setPathChain(r2.chain ?? []); }
                      catch (e) { console.error(e); }
                      setLoadingPath(false);
                    }} />
                  {(isHov || inPath) && !dimmed && (
                    <text data-id={node.id} x={node.x} y={node.y-r-6} textAnchor="middle" fill={inPath?"#facc15":"currentColor"} fontSize={11} className="pointer-events-none">
                      {node.title.length>26?node.title.slice(0,26)+"…":node.title}
                      {inPath && pathIdx >= 0 && ` [${pathIdx+1}]`}
                      {isHov && nodeBloom && ` · ${BLOOM_GL[nodeBloom]??nodeBloom}`}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <canvas ref={canvasRef} className="select-none" style={{ display: mode==="3d"?"block":"none", width:"100%", height:"100%" }}
          onMouseDown={handle3DMouseDown} onMouseMove={handle3DMouseMove} onMouseUp={handle3DMouseUp} onMouseLeave={handle3DMouseUp} onWheel={handle3DWheel} />
        {!graphNodes.length && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><p className="wiki-muted">No graph data available.</p></div>}
        {loadingPath && <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", borderRadius:6, padding:"4px 12px", fontSize:12, color:"#facc15" }}>載入學習路徑…</div>}
      </div>

      {/* Learning path panel */}
      {pathChain && pathChain.length > 0 && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(250,204,21,0.3)", background: "rgba(250,204,21,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#facc15" }}>學習路徑（{pathChain.length} 步）</span>
            <button onClick={() => setPathChain(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(128,128,128,0.6)", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {pathChain.map((p, i) => (
              <span key={p.path} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span style={{ color: "#facc15", opacity: 0.5, fontSize: 10 }}>→</span>}
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 9999, background: `rgba(250,204,21,${0.05 + i * 0.04})`, border: "1px solid rgba(250,204,21,0.25)", color: "var(--color-text-primary,#fff)" }}>
                  {p.title.length > 20 ? p.title.slice(0,20)+"…" : p.title}
                  {p.mastery > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: "#facc15" }}>{'★'.repeat(Math.min(p.mastery,3))}</span>}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
