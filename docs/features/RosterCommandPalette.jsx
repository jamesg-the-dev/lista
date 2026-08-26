import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Minimal parser (self-contained for demo) ────────────────────────────────

const STAFF = [
  { staffId: "s1", firstName: "James",     lastName: "Chen",    displayName: "James Chen",    aliases: ["Jimmy", "Jim"], isActive: true,  roles: ["bar"] },
  { staffId: "s2", firstName: "James",     lastName: "Okafor",  displayName: "James Okafor",  aliases: [],               isActive: true,  roles: ["floor"] },
  { staffId: "s3", firstName: "Sarah",     lastName: "O'Brien", displayName: "Sarah O'Brien", aliases: ["Sez"],          isActive: true,  roles: ["floor"] },
  { staffId: "s4", firstName: "Anne-Marie",lastName: "Dubois",  displayName: "Anne-Marie Dubois", aliases: [],           isActive: true,  roles: ["kitchen"] },
  { staffId: "s5", firstName: "Zoë",       lastName: "Nguyen",  displayName: "Zoë Nguyen",    aliases: [],               isActive: true,  roles: ["coffee"] },
  { staffId: "s6", firstName: "Tom",       lastName: "Hardy",   displayName: "Tom Hardy",     aliases: [],               isActive: false, roles: ["bar"] },
];

const COMMANDS = [
  { id: "create-shift",  label: "Create shift",  icon: "＋", description: "Add a new shift for a staff member",      example: "James Chen 10am–4pm Sunday" },
  { id: "remove-shift",  label: "Remove shift",  icon: "−", description: "Delete an existing shift",                  example: "Remove James Chen Sunday" },
  { id: "swap-shift",    label: "Swap shifts",   icon: "⇄", description: "Swap two staff members' shifts",            example: "Swap James and Sarah Sunday" },
  { id: "copy-week",     label: "Copy last week",icon: "⊙", description: "Duplicate last week's roster to this week", example: "Copy last week" },
  { id: "clear-day",    label: "Clear day",      icon: "✕", description: "Remove all shifts on a given day",         example: "Clear Sunday" },
];

const WEEKDAYS = { sunday:0,sun:0,monday:1,mon:1,tuesday:2,tue:2,tues:2,wednesday:3,wed:3,thursday:4,thu:4,thur:4,thurs:4,friday:5,fri:5,saturday:6,sat:6 };
const MONTHS   = { january:1,jan:1,february:2,feb:2,march:3,mar:3,april:4,apr:4,may:5,june:6,jun:6,july:7,jul:7,august:8,aug:8,september:9,sep:9,sept:9,october:10,oct:10,november:11,nov:11,december:12,dec:12 };
const PRESETS  = { breakfast:{start:"07:00",end:"11:00"},morning:{start:"08:00",end:"12:00"},lunch:{start:"11:00",end:"15:00"},afternoon:{start:"13:00",end:"17:00"},dinner:{start:"17:00",end:"23:00"},arvo:{start:"13:00",end:"17:00"},brekkie:{start:"07:00",end:"11:00"},opening:{start:"07:00",end:"11:00"},closing:{start:"18:00",end:null} };
const FILLER   = new Set(["for","on","at","in","from","the","a","an","please","pls","shift","work","working","and","roster","create","remove","add","schedule","book","put","assign"]);

function lev(a, b) {
  if (a===b) return 0; if(!a.length) return b.length; if(!b.length) return a.length;
  const d = Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) d[i][0]=i; for(let j=0;j<=b.length;j++) d[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
    const c=a[i-1]===b[j-1]?0:1; d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  } return d[a.length][b.length];
}

function fuzzy(a,b){ if(a===b) return true; const t=b.length<=4?0:b.length<=6?1:2; return t>0&&Math.abs(a.length-b.length)<=t&&lev(a,b)<=t; }

function stripOrdinal(s){ return s.replace(/^(\d{1,2})(st|nd|rd|th)$/i,"$1"); }

function scoreStaff(q, s) {
  const ql = q.toLowerCase().trim();
  if (!ql) return null;
  const fl=s.firstName.toLowerCase(), ll=s.lastName.toLowerCase(), dl=s.displayName.toLowerCase();
  const aliases=(s.aliases||[]).map(a=>a.toLowerCase());
  const base=(on,conf)=>({staffId:s.staffId,displayName:s.displayName,matchConfidence:s.isActive?conf:conf*0.5,isActive:s.isActive,matchedOn:on});
  if(ql===dl||ql===`${fl} ${ll}`) return base("exact",1);
  if(aliases.includes(ql)) return base("alias",0.95);
  const init=/^([a-z])\.?\s+(.+)$/.exec(ql);
  if(init&&init[1]===fl[0]&&init[2]===ll) return base("initial-surname",0.9);
  if(ql===fl) return base("first-name",0.75);
  if(ql===ll) return base("first-name",0.7);
  const parts=ql.split(" ");
  if(parts.length===2&&fuzzy(parts[0],fl)&&fuzzy(parts[1],ll)) return base("fuzzy",0.8);
  if(fuzzy(ql,fl)) return base("fuzzy",0.6);
  if(fuzzy(ql,dl)) return base("fuzzy",0.6);
  for(const a of aliases) if(fuzzy(ql,a)) return base("fuzzy",0.55);
  return null;
}

function matchStaff(query) {
  const res=STAFF.map(s=>scoreStaff(query,s)).filter(Boolean).sort((a,b)=>b.matchConfidence-a.matchConfidence);
  if(res.length&&res[0].matchConfidence>=0.9) return res.filter(r=>r.matchConfidence>=0.9);
  return res;
}

function parseTime(s) {
  if(s==="noon"||s==="midday") return {h:12,m:0,mer:"pm"};
  if(s==="midnight") return {h:0,m:0,mer:"am"};
  const mil=/^([01]\d|2[0-3])([0-5]\d)$/.exec(s);
  if(mil&&s.length===4) return {h:+mil[1],m:+mil[2],mer:null};
  const r=/^(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a|p)?$/i.exec(s);
  if(!r) return null;
  const h=+r[1],m=r[2]?+r[2]:0;
  if(h>24||m>59) return null;
  const mer=r[3]?r[3][0].toLowerCase()==="a"?"am":"pm":null;
  return {h,m,mer};
}

function toMins({h,m,mer}) {
  let hh=h;
  if(mer==="pm"&&hh<12) hh+=12;
  if(mer==="am"&&hh===12) hh=0;
  return hh*60+m;
}

function fmtMins(mins) {
  const m=((mins%1440)+1440)%1440;
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
}

function resolveRange(a,b) {
  if(a.mer&&b.mer) return {s:toMins(a),e:toMins(b),inf:false};
  const sOpts=a.mer?[a.mer]:["am","pm"], eOpts=b.mer?[b.mer]:["am","pm"];
  const combos=[];
  for(const so of sOpts) for(const eo of eOpts) {
    const s=toMins({...a,mer:so}),e=toMins({...b,mer:eo});
    let dur=e-s; if(dur<=0) dur+=1440;
    if(dur<60||dur>14*60) continue;
    let rank=0; if(so==="am"&&eo==="pm") rank+=3; if(so==="pm"&&eo==="am") rank+=1;
    if(dur>=4*60&&dur<=10*60) rank+=2;
    combos.push({s,e,rank});
  }
  if(!combos.length) return {s:toMins(a),e:toMins(b),inf:true};
  combos.sort((x,y)=>y.rank-x.rank);
  return {s:combos[0].s,e:combos[0].e,inf:true};
}

function parseShiftText(raw) {
  const now = new Date();
  const tokens = raw.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const result = { staff:null, date:null, start:null, end:null, openEnded:false, ambiguities:[], confidence:"low" };
  const remaining = [...tokens];

  // Presets
  for(let i=0;i<remaining.length;i++) {
    const p=PRESETS[remaining[i]];
    if(p&&result.start===null) {
      const [sh,sm]=p.start.split(":").map(Number);
      result.start=sh*60+sm;
      if(p.end){const[eh,em]=p.end.split(":").map(Number);result.end=eh*60+em;}else result.openEnded=true;
      remaining.splice(i,1); i--; continue;
    }
  }

  // Glued range e.g. 10am-4pm
  for(let i=0;i<remaining.length;i++) {
    const gr=/^(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a|p)?)-(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a|p)?|close)$/i.exec(remaining[i]);
    if(gr&&result.start===null) {
      const a=parseTime(gr[1]);
      if(a) {
        if(gr[2].toLowerCase()==="close") { const r={h:a.h,m:a.m,mer:a.mer};if(!r.mer)r.mer=r.h>=6&&r.h<=11?"am":"pm"; result.start=toMins(r);result.openEnded=true; }
        else { const b=parseTime(gr[2]); if(b){const r=resolveRange(a,b);result.start=r.s;result.end=r.e;} }
        remaining.splice(i,1); break;
      }
    }
  }

  // "to/till/until close" range
  if(result.start===null) {
    for(let i=0;i<remaining.length-1;i++) {
      const sep=["to","till","til","until","thru","-","–"].includes(remaining[i+1]);
      if(!sep) continue;
      const a=parseTime(remaining[i]);
      if(!a) continue;
      const endWord=remaining[i+2];
      if(endWord==="close"||endWord==="closing") {
        const r={...a}; if(!r.mer) r.mer=r.h>=6&&r.h<=11?"am":"pm";
        result.start=toMins(r); result.openEnded=true;
        remaining.splice(i,3); break;
      }
      const b=parseTime(endWord||"");
      if(b){const r=resolveRange(a,b);result.start=r.s;result.end=r.e;remaining.splice(i,3);break;}
    }
  }

  // Standalone times
  if(result.start===null) {
    for(let i=0;i<remaining.length;i++) {
      const t=parseTime(remaining[i]);
      if(!t) continue;
      const mer=t.mer||(t.h>=6&&t.h<=11?"am":"pm");
      if(result.start===null){result.start=toMins({...t,mer});remaining.splice(i,1);i--;if(!t.mer)result.ambiguities.push("am/pm inferred");}
      else if(result.end===null&&!result.openEnded){result.end=toMins({...t,mer});remaining.splice(i,1);break;}
    }
  }

  // Duration
  for(let i=0;i<remaining.length-1;i++) {
    if(remaining[i]==="for"&&/^\d+(?:\.\d)?$/.test(remaining[i+1])&&["h","hr","hrs","hours","hour"].includes(remaining[i+2]||"")) {
      if(result.start!==null&&result.end===null){result.end=(result.start+parseFloat(remaining[i+1])*60)%1440;remaining.splice(i,3);break;}
    }
  }

  // Date: today/tomorrow
  for(let i=0;i<remaining.length;i++) {
    const l=remaining[i];
    if(l==="today"){result.date=new Date();remaining.splice(i,1);break;}
    if(["tomorrow","tmr","tmrw","tomo"].includes(l)){const d=new Date();d.setDate(d.getDate()+1);result.date=d;remaining.splice(i,1);break;}
  }

  // Date: this/next + weekday or bare weekday
  if(!result.date) {
    for(let i=0;i<remaining.length;i++) {
      const isNext=remaining[i]==="next";
      const isMod=["this","coming","upcoming"].includes(remaining[i]);
      const wdIdx=(isNext||isMod)?i+1:i;
      const wdTok=remaining[wdIdx];
      if(!wdTok) continue;
      const wd=WEEKDAYS[wdTok.replace(/[.]/g,"")];
      if(wd===undefined) continue;
      const today=new Date(); const todayDow=today.getDay();
      let delta=(wd-todayDow+7)%7; if(delta===0) delta=7;
      if(isNext) delta+=7;
      const d=new Date(); d.setDate(d.getDate()+delta);
      result.date=d;
      remaining.splice(i,(isNext||isMod)?2:1); break;
    }
  }

  // Date: "23 August" / "August 23" / numeric
  if(!result.date) {
    for(let i=0;i<remaining.length;i++) {
      const a=stripOrdinal(remaining[i]);
      const next=remaining[i+1]?stripOrdinal(remaining[i+1]):null;
      const aDay=/^\d{1,2}$/.test(a)&&+a>=1&&+a<=31;
      const aMonth=MONTHS[a.replace(/[.]/g,"")];
      const bMonth=next?MONTHS[next.replace(/[.]/g,"")]:null;
      const bDay=next&&/^\d{1,2}$/.test(next)&&+next<=31;
      let day=null,month=null,span=0;
      if(aDay&&bMonth!==undefined){day=+a;month=bMonth;span=2;}
      else if(aMonth!==undefined&&bDay){day=+next;month=aMonth;span=2;}
      if(day&&month){
        const yr=new Date().getFullYear();
        const d=new Date(yr,month-1,day);
        result.date=d; remaining.splice(i,span); break;
      }
      // numeric 23/8
      const num=/^(\d{1,2})[/](\d{1,2})$/.exec(a);
      if(num){const d=new Date(new Date().getFullYear(),+num[2]-1,+num[1]);result.date=d;remaining.splice(i,1);break;}
    }
  }

  // Staff from what's left
  const staffQuery=remaining.filter(t=>!FILLER.has(t)).join(" ").trim();
  if(staffQuery) {
    const candidates=matchStaff(staffQuery);
    result.staff=candidates.length>0?candidates[0]:null;
    result.staffQuery=staffQuery;
    result.staffCandidates=candidates;
  }

  // Confidence
  const has = x => x!==null&&x!==undefined;
  const core = has(result.staff)&&has(result.date)&&has(result.start);
  if(core&&result.staff?.matchConfidence>=0.9&&result.ambiguities.length===0) result.confidence="high";
  else if(core) result.confidence="medium";
  else if(has(result.staff)||has(result.date)) result.confidence="medium";
  else result.confidence="low";

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if(!d) return null;
  return d.toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"});
}

function fmtTime(mins) { if(mins===null||mins===undefined) return null; return fmtMins(mins); }

const CONFIDENCE_STYLES = {
  high:   { dot: "#22c55e", label: "Ready",  bg: "#f0fdf4", text: "#15803d" },
  medium: { dot: "#f59e0b", label: "Review", bg: "#fffbeb", text: "#b45309" },
  low:    { dot: "#94a3b8", label: "Incomplete", bg: "#f8fafc", text: "#64748b" },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function CommandOption({ cmd, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
        borderRadius:8, cursor:"pointer", transition:"background 120ms",
        background: isSelected ? "#f1f5f9" : "transparent",
      }}
      onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
      onMouseLeave={e=>e.currentTarget.style.background=isSelected?"#f1f5f9":"transparent"}
    >
      <span style={{fontSize:16,width:24,textAlign:"center",color:"#475569",flexShrink:0}}>{cmd.icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13.5,fontWeight:500,color:"#0f172a"}}>{cmd.label}</span>
          <span style={{fontSize:11,color:"#94a3b8",fontFamily:"ui-monospace,monospace",background:"#f1f5f9",padding:"1px 6px",borderRadius:4}}>{cmd.example}</span>
        </div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{cmd.description}</div>
      </div>
      <span style={{fontSize:11,color:"#cbd5e1",flexShrink:0}}>↵</span>
    </div>
  );
}

function ParseChip({ label, value, missing, inferred }) {
  const hasValue = value !== null && value !== undefined;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 9px", borderRadius:20, fontSize:12, fontWeight:500,
      background: missing ? "#fef2f2" : inferred ? "#fffbeb" : "#f0f9ff",
      color:       missing ? "#ef4444" : inferred ? "#b45309" : "#0369a1",
      border:`1px solid ${missing?"#fecaca":inferred?"#fde68a":"#bae6fd"}`,
      whiteSpace:"nowrap",
    }}>
      <span style={{fontSize:10,opacity:0.7}}>{label}</span>
      <span>{hasValue ? value : "—"}</span>
      {inferred && <span style={{fontSize:9,opacity:0.6}}>~</span>}
    </span>
  );
}

function ConfidencePip({ level }) {
  const s = CONFIDENCE_STYLES[level];
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:500,
      background:s.bg,color:s.text,flexShrink:0,
    }}>
      <span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
      {s.label}
    </span>
  );
}

function StaffPickerRow({ candidates, selected, onSelect }) {
  if(!candidates||candidates.length<=1) return null;
  return (
    <div style={{padding:"8px 14px",borderTop:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:"#94a3b8",marginRight:2}}>Who?</span>
      {candidates.slice(0,5).map(c=>(
        <button key={c.staffId} onClick={()=>onSelect(c)}
          style={{
            fontSize:12,padding:"3px 10px",borderRadius:20,border:"1px solid",cursor:"pointer",
            background:selected?.staffId===c.staffId?"#0f172a":"transparent",
            color:selected?.staffId===c.staffId?"#fff":"#334155",
            borderColor:selected?.staffId===c.staffId?"#0f172a":"#e2e8f0",
            transition:"all 120ms",
          }}>
          {c.displayName}
        </button>
      ))}
    </div>
  );
}

function ConfirmRow({ parsed, onConfirm, onBack }) {
  const dateStr = fmtDate(parsed.date);
  const startStr = fmtTime(parsed.start);
  const endStr = parsed.openEnded ? "close" : fmtTime(parsed.end);
  const staff = parsed.staff;
  const canCommit = staff && parsed.date && parsed.start !== null;

  return (
    <div style={{padding:"12px 14px 14px",borderTop:"1px solid #f1f5f9"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <ParseChip label="👤" value={staff?.displayName||null} missing={!staff}/>
        <ParseChip label="📅" value={dateStr} missing={!dateStr}/>
        <ParseChip label="🕐" value={startStr ? `${startStr}${endStr?` – ${endStr}`:""}` : null} missing={parsed.start===null} inferred={parsed.ambiguities.includes("am/pm inferred")}/>
        {parsed.openEnded && <ParseChip label="" value="until close" missing={false}/>}
        <div style={{marginLeft:"auto"}}>
          <ConfidencePip level={parsed.confidence}/>
        </div>
      </div>

      {parsed.ambiguities.length>0&&(
        <div style={{fontSize:11,color:"#b45309",marginBottom:8,padding:"4px 8px",background:"#fffbeb",borderRadius:6}}>
          {parsed.ambiguities.join(" · ")}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={onBack} style={{
          fontSize:12,color:"#64748b",background:"none",border:"1px solid #e2e8f0",
          borderRadius:6,padding:"5px 12px",cursor:"pointer",
        }}>← Edit</button>
        <div style={{flex:1}}/>
        <button
          onClick={canCommit?onConfirm:undefined}
          style={{
            fontSize:13,fontWeight:600,padding:"7px 18px",borderRadius:8,border:"none",cursor:canCommit?"pointer":"not-allowed",
            background:canCommit?"#0f172a":"#e2e8f0",color:canCommit?"#fff":"#94a3b8",
            transition:"all 120ms",display:"flex",alignItems:"center",gap:6,
          }}>
          Create shift
          <span style={{
            fontSize:10,padding:"1px 5px",borderRadius:4,
            background:canCommit?"rgba(255,255,255,0.15)":"transparent",color:"inherit",
          }}>↵</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main palette ─────────────────────────────────────────────────────────────

export default function RosterCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("browse"); // browse | compose | confirm | success
  const [selectedCmd, setSelectedCmd] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [lastCreated, setLastCreated] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filter commands while browsing
  const filteredCmds = useMemo(()=>{
    if(!query||phase!=="browse") return COMMANDS;
    const q=query.toLowerCase();
    return COMMANDS.filter(c=>
      c.label.toLowerCase().includes(q)||
      c.id.includes(q)||
      c.description.toLowerCase().includes(q)
    );
  },[query,phase]);

  // Live parse while composing
  useEffect(()=>{
    if(phase!=="compose"&&phase!=="confirm") return;
    const p = parseShiftText(query);
    if(selectedStaff) p.staff=selectedStaff;
    setParsed(p);
  },[query,phase,selectedStaff]);

  const openPalette = useCallback(()=>{
    setOpen(true); setPhase("browse"); setQuery(""); setSelectedCmd(null);
    setParsed(null); setSelectedStaff(null); setCursorIdx(0);
    setTimeout(()=>inputRef.current?.focus(),0);
  },[]);

  const closePalette = useCallback(()=>{
    setOpen(false); setQuery(""); setPhase("browse"); setLastCreated(null);
  },[]);

  const selectCommand = useCallback((cmd)=>{
    setSelectedCmd(cmd);
    setPhase("compose");
    setQuery("");
    setSelectedStaff(null);
    setTimeout(()=>inputRef.current?.focus(),0);
  },[]);

  const handleConfirm = useCallback(()=>{
    if(!parsed||!parsed.staff||!parsed.date||parsed.start===null) return;
    // In real app: dispatch CreateShiftCommand here
    setLastCreated({
      staff: parsed.staff.displayName,
      date: fmtDate(parsed.date),
      start: fmtTime(parsed.start),
      end: parsed.openEnded?"close":fmtTime(parsed.end),
    });
    setPhase("success");
    setTimeout(closePalette,1800);
  },[parsed,closePalette]);

  const handleKeyDown = useCallback((e)=>{
    if(e.key==="Escape"){ if(phase==="compose"||phase==="confirm"){setPhase("browse");setQuery("");} else closePalette(); return; }

    if(phase==="browse") {
      if(e.key==="ArrowDown"){e.preventDefault();setCursorIdx(i=>Math.min(i+1,filteredCmds.length-1));}
      if(e.key==="ArrowUp"){e.preventDefault();setCursorIdx(i=>Math.max(i-1,0));}
      if(e.key==="Enter"&&filteredCmds[cursorIdx]){e.preventDefault();selectCommand(filteredCmds[cursorIdx]);}
    }

    if(phase==="compose") {
      if(e.key==="Enter"){
        e.preventDefault();
        if(parsed?.confidence==="high") handleConfirm();
        else setPhase("confirm");
      }
      if(e.key==="Backspace"&&query===""){ setPhase("browse"); }
    }

    if(phase==="confirm") {
      if(e.key==="Enter"){ e.preventDefault(); handleConfirm(); }
    }
  },[phase,filteredCmds,cursorIdx,selectCommand,parsed,query,handleConfirm,closePalette]);

  // Close on outside click
  useEffect(()=>{
    if(!open) return;
    const handler = (e)=>{ if(!containerRef.current?.contains(e.target)) closePalette(); };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[open,closePalette]);

  // Keyboard shortcut to open
  useEffect(()=>{
    const handler=(e)=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){ e.preventDefault(); open?closePalette():openPalette(); }
      if(e.key==="/"&&!open&&document.activeElement===document.body){ e.preventDefault(); openPalette(); }
    };
    document.addEventListener("keydown",handler);
    return ()=>document.removeEventListener("keydown",handler);
  },[open,openPalette,closePalette]);

  const placeholder = phase==="browse"
    ? "Search commands…"
    : `${selectedCmd?.icon} ${selectedCmd?.label} — e.g. "${selectedCmd?.example}"`;

  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",minHeight:"100vh",background:"#f8fafc",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>

      {/* Trigger button */}
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:13,color:"#94a3b8",marginBottom:12}}>Press <kbd style={{background:"#e2e8f0",padding:"2px 6px",borderRadius:4,fontSize:12,fontFamily:"monospace"}}>/</kbd> or <kbd style={{background:"#e2e8f0",padding:"2px 6px",borderRadius:4,fontSize:12,fontFamily:"monospace"}}>⌘K</kbd> to open</p>
        <button onClick={openPalette} style={{
          padding:"9px 20px",borderRadius:10,border:"1px solid #e2e8f0",
          background:"#fff",color:"#334155",fontSize:13.5,fontWeight:500,cursor:"pointer",
          boxShadow:"0 1px 3px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:8,
        }}>
          <span style={{color:"#94a3b8"}}>🔍</span> Roster command…
          <span style={{fontSize:11,color:"#cbd5e1",background:"#f8fafc",border:"1px solid #e2e8f0",padding:"1px 6px",borderRadius:4,fontFamily:"monospace",marginLeft:4}}>⌘K</span>
        </button>
      </div>

      {/* Success toast */}
      {lastCreated&&(
        <div style={{
          position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",
          background:"#0f172a",color:"#fff",padding:"10px 20px",borderRadius:12,
          fontSize:13,fontWeight:500,boxShadow:"0 4px 24px rgba(0,0,0,0.18)",
          display:"flex",alignItems:"center",gap:8,zIndex:9999,
        }}>
          <span style={{color:"#22c55e"}}>✓</span>
          {lastCreated.staff} · {lastCreated.date} · {lastCreated.start}{lastCreated.end?` – ${lastCreated.end}`:""}
        </div>
      )}

      {/* Overlay */}
      {open&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.35)",backdropFilter:"blur(2px)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:120}} onClick={closePalette}>

          {/* Palette */}
          <div ref={containerRef} onClick={e=>e.stopPropagation()} style={{
            width:"100%",maxWidth:560,background:"#fff",borderRadius:14,
            boxShadow:"0 8px 40px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.06)",
            overflow:"hidden",
          }}
          onKeyDown={handleKeyDown}>

            {/* Input row */}
            <div style={{display:"flex",alignItems:"center",gap:0,borderBottom:phase==="browse"?"none":"1px solid #f1f5f9"}}>
              {phase==="compose"||phase==="confirm"?(
                <div style={{
                  display:"flex",alignItems:"center",gap:6,padding:"0 0 0 14px",
                  flexShrink:0,
                }}>
                  <span style={{fontSize:15}}>{selectedCmd?.icon}</span>
                  <span style={{fontSize:12.5,fontWeight:600,color:"#334155",whiteSpace:"nowrap"}}>{selectedCmd?.label}</span>
                  <span style={{color:"#e2e8f0",fontSize:18,margin:"0 2px"}}>›</span>
                </div>
              ):(
                <span style={{padding:"0 0 0 16px",color:"#94a3b8",fontSize:15,flexShrink:0}}>🔍</span>
              )}

              <input
                ref={inputRef}
                value={query}
                onChange={e=>{ setQuery(e.target.value); if(phase==="confirm") setPhase("compose"); setCursorIdx(0); }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                style={{
                  flex:1,padding:"15px 14px",border:"none",outline:"none",
                  fontSize:14.5,color:"#0f172a",background:"transparent",
                  fontFamily:"inherit",
                }}
              />

              {phase==="compose"&&parsed&&(
                <div style={{padding:"0 14px",display:"flex",alignItems:"center"}}>
                  <ConfidencePip level={parsed.confidence}/>
                </div>
              )}

              <button onClick={closePalette} style={{padding:"0 14px",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:18,lineHeight:1,flexShrink:0}}>×</button>
            </div>

            {/* Browse phase: command list */}
            {phase==="browse"&&(
              <div style={{padding:"6px 6px",maxHeight:360,overflowY:"auto"}}>
                {filteredCmds.length===0?(
                  <div style={{padding:"20px 14px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No commands match "{query}"</div>
                ):filteredCmds.map((cmd,i)=>(
                  <CommandOption key={cmd.id} cmd={cmd} isSelected={i===cursorIdx} onClick={()=>selectCommand(cmd)}/>
                ))}
                <div style={{padding:"8px 14px 4px",borderTop:"1px solid #f8fafc",display:"flex",gap:12}}>
                  <span style={{fontSize:11,color:"#cbd5e1"}}>↑↓ navigate</span>
                  <span style={{fontSize:11,color:"#cbd5e1"}}>↵ select</span>
                  <span style={{fontSize:11,color:"#cbd5e1"}}>esc close</span>
                </div>
              </div>
            )}

            {/* Compose phase: live parse + chips */}
            {(phase==="compose")&&parsed&&(
              <>
                <div style={{padding:"10px 14px",background:"#fafafa",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",borderBottom:"1px solid #f1f5f9"}}>
                  <ParseChip label="👤" value={parsed.staff?.displayName||parsed.staffQuery||null} missing={!parsed.staff&&!parsed.staffQuery}/>
                  <ParseChip label="📅" value={fmtDate(parsed.date)} missing={!parsed.date}/>
                  <ParseChip label="🕐"
                    value={parsed.start!==null?`${fmtTime(parsed.start)}${parsed.end!==null?` – ${fmtTime(parsed.end)}`:parsed.openEnded?" – close":""}`:null}
                    missing={parsed.start===null}
                    inferred={parsed.ambiguities.includes("am/pm inferred")}
                  />
                </div>

                <StaffPickerRow
                  candidates={parsed.staffCandidates}
                  selected={parsed.staff}
                  onSelect={s=>setSelectedStaff(s)}
                />

                <div style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"#cbd5e1",flex:1}}>
                    {parsed.confidence==="high"
                      ? "↵ to create"
                      : parsed.confidence==="medium"
                      ? "↵ to review · fill in missing details first"
                      : "type a name, date and time"}
                  </span>
                  {parsed.confidence!=="low"&&(
                    <button onClick={()=>setPhase("confirm")} style={{
                      fontSize:11,color:"#64748b",background:"none",border:"1px solid #e2e8f0",
                      borderRadius:6,padding:"3px 10px",cursor:"pointer",
                    }}>Review ›</button>
                  )}
                </div>
              </>
            )}

            {/* Confirm phase */}
            {phase==="confirm"&&parsed&&(
              <ConfirmRow
                parsed={parsed}
                onConfirm={handleConfirm}
                onBack={()=>setPhase("compose")}
              />
            )}

            {/* Success phase */}
            {phase==="success"&&(
              <div style={{padding:"20px 14px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✓</div>
                <div style={{fontSize:14,fontWeight:600,color:"#15803d"}}>Shift created</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>Closing…</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}