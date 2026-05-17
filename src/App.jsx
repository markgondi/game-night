import { useState, useEffect, useRef, useMemo } from "react";


const CX_LABEL = ['','Light','Medium-Light','Medium','Medium-Heavy','Heavy'];
// Slightly brighter for contrast on dark cards
const CX_COLOR = ['','#5DCE8A','#9BD968','#FFC93C','#FF8A4C','#FF6464'];
const CATEGORIES = ['Strategy','Word','Party','Abstract','Engine Building','Co-op','Deduction','Dice','Card','Other'];
// Deeper saturated jewel tones — work on dark backgrounds
const CARD_BG = ['#6B3A1A','#1F4D3A','#1F3A5C','#5C2A3A','#3A2A5C','#1F4F4D'];

function uid() { return 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function cardBg(g) { return CARD_BG[g.id?.charCodeAt(1)%CARD_BG.length||0]; }

const T = {
  // Dark warm base — charcoal with brown undertones, not pure black
  bg:'#15110D', surface:'#1E1916', card:'#26201C',
  // Warm off-white text, muted warm grey for secondary
  ink:'#F2EDE5', sub:'#8F857A',
  // Subtle borders + faint fills
  faint:'rgba(242,237,229,0.04)', border:'rgba(242,237,229,0.08)', borderMed:'rgba(242,237,229,0.16)',
  // Shadows are darker / wider on dark themes
  shadow:'0 2px 10px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.02)',
  shadowMd:'0 8px 28px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
  // Bright orange — the gamer accent
  amber:'#FF6B1F', amberBg:'rgba(255,107,31,0.12)', amberBd:'rgba(255,107,31,0.45)',
  // Brighter danger to read on dark
  danger:'#FF5C5C', dangerBg:'rgba(255,92,92,0.1)', dangerBd:'rgba(255,92,92,0.32)',
  serif:"'Cormorant Garamond', Georgia, serif",
  sans:"'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; margin:0; padding:0; }
  ::-webkit-scrollbar { display:none; }
  body { background:${T.bg}; }
  .press { cursor:pointer; transition:transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.12s; -webkit-user-select:none; user-select:none; }
  .press:active { transform:scale(0.96); opacity:0.8; }
  .card-press { cursor:pointer; transition:transform 0.13s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.13s; -webkit-user-select:none; user-select:none; }
  .card-press:active { transform:scale(0.975); box-shadow:0 1px 3px rgba(0,0,0,0.4) !important; }
  input, textarea, select { font-family:${T.sans}; -webkit-appearance:none; appearance:none; }
  input::placeholder, textarea::placeholder { color:${T.sub}; opacity:0.5; }
  input:focus, textarea:focus { outline:none; }
  textarea { resize:vertical; }
  .page-in { animation:pageIn 0.22s ease both; }
  @keyframes pageIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  .sheet-in { animation:sheetIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes sheetIn { from { transform:translateY(100%); } to { transform:translateY(0); } }
  .dot-anim { transition:width 0.28s cubic-bezier(0.34,1.4,0.64,1), background 0.2s; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translate(-50%, 8px); } to { opacity:1; transform:translate(-50%, 0); } }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%      { transform: scale(1.4); opacity: 0; }
  }
`;

// ── Base input style (no hooks, safe to reuse) ────────────────────────────────
const IS = {
  width:'100%', background:T.card, borderRadius:11, padding:'13px 15px',
  fontSize:15, fontFamily:T.sans, color:T.ink, lineHeight:1.4,
  transition:'border-color 0.15s',
};

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Btn({ children, onClick, variant='primary', size='md', full, disabled }) {
  const pad  = {sm:'8px 16px',md:'13px 22px',lg:'16px 28px'}[size];
  const fs   = {sm:13,md:15,lg:16}[size];
  const V    = {
    primary:      {bg:T.ink,        color:'#15110D', border:'none'},
    amber:        {bg:T.amber,      color:'#15110D', border:'none'},
    outline:      {bg:'transparent',color:T.ink,     border:`1.5px solid ${T.borderMed}`},
    ghost:        {bg:'transparent',color:T.sub,     border:'none'},
    danger:       {bg:T.danger,     color:'#15110D',    border:'none'},
    dangerOutline:{bg:T.dangerBg,   color:T.danger,  border:`1.5px solid ${T.dangerBd}`},
  }[variant];
  return (
    <button className="press" onClick={disabled?undefined:onClick} style={{
      background:V.bg, color:V.color, border:V.border, borderRadius:11,
      padding:pad, fontSize:fs, fontFamily:T.sans, fontWeight:500,
      cursor:disabled?'not-allowed':'pointer', width:full?'100%':undefined,
      opacity:disabled?0.38:1, display:'inline-flex', alignItems:'center',
      justifyContent:'center', gap:7, letterSpacing:'-0.01em',
    }}>{children}</button>
  );
}

function Lbl({ children }) {
  return <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:8}}>{children}</div>;
}

function Hr({ style }) {
  return <div style={{height:1,background:T.border,...style}}/>;
}

function CxDots({ value, sz=8 }) {
  return (
    <div style={{display:'flex',gap:4,alignItems:'center'}}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{width:sz,height:sz,borderRadius:'50%',background:i<=value?CX_COLOR[value]:'rgba(242,237,229,0.12)',transition:'background 0.2s'}}/>
      ))}
      <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginLeft:5}}>{CX_LABEL[value]}</span>
    </div>
  );
}

function Steps({ total, current }) {
  return (
    <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} className="dot-anim" style={{height:6,borderRadius:3,width:i===current?22:6,background:i===current?T.amber:i<current?T.ink:T.border}}/>
      ))}
    </div>
  );
}

function GameImg({ game, height, radius=0 }) {
  const col = cardBg(game);
  const [failed, setFailed] = useState(false);

  // Show fallback if no image OR if image failed to load
  if (!game.image || failed) {
    return (
      <div style={{
        height, borderRadius:radius,
        background:`linear-gradient(135deg, ${col} 0%, ${col}dd 60%, rgba(0,0,0,0.45) 100%)`,
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
        position:'relative',
      }}>
        <div style={{
          fontFamily:T.serif, fontSize:Math.floor(height/3.5), fontWeight:700,
          color:'rgba(255,255,255,0.55)', textAlign:'center', padding:'0 14px',
          lineHeight:1.05, letterSpacing:'-0.02em',
          textShadow:'0 1px 2px rgba(0,0,0,0.3)',
        }}>{game.name}</div>
      </div>
    );
  }

  return (
    <div style={{height, borderRadius:radius, overflow:'hidden', background:col, position:'relative'}}>
      <img
        src={game.image}
        alt={game.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setFailed(true)}
        style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}
      />
    </div>
  );
}

// ── Proper sub-components to avoid hooks-in-map ───────────────────────────────

// Used in NSetup — each player row owns its own focus state
function PlayerRow({ index, value, onChange }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{width:26,height:26,borderRadius:'50%',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.sans,fontSize:11,fontWeight:600,color:T.sub,flexShrink:0}}>{index+1}</div>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={`Player ${index+1}`}
        onFocus={()=>setFocus(true)}
        onBlur={()=>setFocus(false)}
        style={{...IS, border:`1.5px solid ${focus?T.amber:T.border}`}}
      />
    </div>
  );
}

// Multi-select chips: which players get a veto.
// `playerNames` = array of trimmed names (filtered, non-empty)
// `selectedIndices` = which players are on
// `excludeIndex` = the picker — shown but visually disabled, never toggleable
// onChange called with the new array
function VetoerChips({ playerNames, selectedIndices, onChange, excludeIndex }) {
  function toggle(i) {
    if (i === excludeIndex) return; // hard rule: picker can't be a vetoer
    if (selectedIndices.includes(i)) onChange(selectedIndices.filter(x => x !== i));
    else onChange([...selectedIndices, i].sort((a,b)=>a-b));
  }
  if (playerNames.length === 0) return null;
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
      {playerNames.map((name, i) => {
        const isPicker = i === excludeIndex;
        const on = !isPicker && selectedIndices.includes(i);
        return (
          <button key={i} className="press" onClick={()=>toggle(i)} disabled={isPicker} style={{
            padding:'7px 13px', borderRadius:18,
            border:`1.5px solid ${isPicker ? T.border : (on ? T.danger : T.border)}`,
            background: isPicker ? T.faint : (on ? T.dangerBg : 'transparent'),
            color: isPicker ? T.sub : (on ? T.danger : T.sub),
            fontFamily:T.sans, fontSize:12, fontWeight:500,
            cursor: isPicker ? 'not-allowed' : 'pointer',
            whiteSpace:'nowrap', transition:'all 0.15s',
            opacity: isPicker ? 0.5 : 1,
          }}>
            {name}
            {isPicker && <span style={{fontSize:10,marginLeft:5,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>(picker)</span>}
          </button>
        );
      })}
    </div>
  );
}

// Single-select: which player makes the final pick
function PickerSelect({ playerNames, selectedIndex, onChange }) {
  if (playerNames.length === 0) return null;
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
      {playerNames.map((name, i) => {
        const on = selectedIndex === i;
        return (
          <button key={i} className="press" onClick={()=>onChange(i)} style={{
            padding:'7px 13px', borderRadius:18,
            border:`1.5px solid ${on?T.amber:T.border}`,
            background: on?T.amberBg:'transparent',
            color: on?T.amber:T.sub,
            fontFamily:T.sans, fontSize:12, fontWeight:500,
            cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
          }}>{name}</button>
        );
      })}
    </div>
  );
}

// Used in AddTab — number field with its own focus state
function NumField({ label, value, onChange, min=1, max=20 }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <Lbl>{label}</Lbl>
      <input
        type='number' min={min} max={max} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        onFocus={()=>setFocus(true)}
        onBlur={()=>setFocus(false)}
        style={{...IS, border:`1.5px solid ${focus?T.amber:T.border}`}}
      />
    </div>
  );
}

// Used in FInput — text input with focus highlight
function FInput({ label, value, onChange, placeholder, type='text', mb=18 }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{marginBottom:mb}}>
      {label&&<Lbl>{label}</Lbl>}
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{...IS, border:`1.5px solid ${focus?T.amber:T.border}`}}
      />
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder, rows=4 }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{marginBottom:18}}>
      {label&&<Lbl>{label}</Lbl>}
      <textarea
        value={value} placeholder={placeholder} rows={rows}
        onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{...IS, border:`1.5px solid ${focus?T.amber:T.border}`, lineHeight:1.65}}
      />
    </div>
  );
}

// Used in NPlaying — each score row owns its focus state
function ScoreRow({ name, value, onChange, isLast }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'11px 16px'}}>
        <div style={{flex:1,fontFamily:T.sans,fontSize:15,color:T.ink}}>{name}</div>
        <input
          type='number' value={value||''} placeholder='0'
          onChange={e=>onChange(e.target.value)}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
          style={{width:70,background:T.bg,border:`1px solid ${focus?T.amber:T.border}`,borderRadius:9,padding:'9px 0',textAlign:'center',fontFamily:T.sans,fontSize:17,color:T.ink,outline:'none',transition:'border-color 0.15s'}}
        />
      </div>
      {!isLast&&<Hr/>}
    </div>
  );
}

// ── Sync Pill (header status indicator) ──────────────────────────────────────
// ── Install Hint (iOS Safari "Add to Home Screen" prompt) ────────────────────
// iOS doesn't fire a native beforeinstallprompt event, so we have to nudge
// users manually. Shows once per device — dismissed = gone forever (this device).
function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed? — running in standalone mode means yes.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    // Are we on iOS Safari? (Android Chrome shows its own prompt.)
    const ua = window.navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    if (!isIOS || !isSafari) return;

    // Have they dismissed it before?
    try {
      if (localStorage.getItem('gn4-install-dismissed') === '1') return;
    } catch {}

    // Delay so it doesn't appear immediately on first open
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try { localStorage.setItem('gn4-install-dismissed', '1'); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position:'fixed', bottom:'max(76px, env(safe-area-inset-bottom))', left:'50%',
      transform:'translateX(-50%)', width:'calc(100% - 32px)', maxWidth:430,
      background:T.card, borderRadius:14, padding:'14px 16px',
      border:`1.5px solid ${T.amberBd}`, boxShadow:T.shadowMd,
      zIndex:300, display:'flex', gap:12, alignItems:'flex-start',
      animation:'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        width:38, height:38, borderRadius:9, background:T.amberBg,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v12"/>
          <polyline points="6,10 12,4 18,10"/>
          <rect x="4" y="18" width="16" height="3" rx="0.5"/>
        </svg>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontFamily:T.sans, fontSize:13, fontWeight:600, color:T.ink, marginBottom:3}}>
          Install Game Night
        </div>
        <div style={{fontFamily:T.sans, fontSize:12, color:T.sub, lineHeight:1.5}}>
          Tap <strong style={{color:T.ink}}>Share</strong> then <strong style={{color:T.ink}}>Add to Home Screen</strong>
        </div>
      </div>
      <button onClick={dismiss} className="press" style={{
        flexShrink:0, width:28, height:28, borderRadius:'50%',
        background:'transparent', border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:T.sub,
      }}>
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/>
          <line x1="13" y1="1" x2="1" y2="13"/>
        </svg>
      </button>
    </div>
  );
}

function SyncPill({ profile, syncing, justSynced, onClick }) {
  // States: not connected | syncing | just synced (green flash) | connected idle
  const tickRef = useRef(0);
  const [, force] = useState(0);

  // Re-render every 30s while connected so "Xm ago" stays fresh
  useEffect(() => {
    if (!profile?.username || syncing) return;
    const t = setInterval(() => { tickRef.current++; force(x => x + 1); }, 30 * 1000);
    return () => clearInterval(t);
  }, [profile?.username, syncing]);

  let leftIcon, mainText, subText, color, bg, border;

  if (syncing) {
    leftIcon = <div style={{width:11,height:11,border:`1.8px solid ${T.amberBd}`,borderTopColor:T.amber,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>;
    mainText = 'Syncing…';
    subText  = profile?.username || '';
    color    = T.amber; bg = T.amberBg; border = T.amber;
  } else if (justSynced) {
    leftIcon = (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#5DCE8A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2.5,7.5 5.5,10.5 11.5,3.5"/>
      </svg>
    );
    mainText = 'Up to date';
    subText  = profile?.username || '';
    color    = '#5DCE8A'; bg = 'rgba(93,206,138,0.12)'; border = 'rgba(93,206,138,0.45)';
  } else if (profile?.username) {
    // connected — pulse green dot, show "synced Xm ago"
    leftIcon = (
      <div style={{position:'relative',width:8,height:8}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'#5DCE8A'}}/>
        <div style={{position:'absolute',inset:-2,borderRadius:'50%',border:'1.5px solid #5DCE8A',opacity:0.5,animation:'pulse 2s ease-in-out infinite'}}/>
      </div>
    );
    mainText = profile.username;
    subText  = profile.syncedAt ? timeAgo(profile.syncedAt) : '';
    color    = T.ink; bg = T.faint; border = T.borderMed;
  } else {
    // not connected
    leftIcon = (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="5" r="2.4"/>
        <path d="M2 12.2c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2"/>
      </svg>
    );
    mainText = 'Sync BGG';
    subText  = '';
    color    = T.ink; bg = 'transparent'; border = T.borderMed;
  }

  return (
    <button className="press" onClick={onClick} style={{
      flexShrink:0,
      display:'flex', alignItems:'center', gap:8,
      padding: subText ? '5px 12px 5px 11px' : '8px 14px',
      borderRadius:22,
      border:`1.5px solid ${border}`,
      background:bg, color,
      fontFamily:T.sans, cursor:'pointer',
      transition:'all 0.2s',
    }}>
      {leftIcon}
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',lineHeight:1.15}}>
        <span style={{fontSize:12,fontWeight:600,letterSpacing:'-0.01em'}}>{mainText}</span>
        {subText && <span style={{fontSize:9.5,opacity:0.65,fontWeight:500,marginTop:1}}>{subText}</span>}
      </div>
    </button>
  );
}

// ── Library ───────────────────────────────────────────────────────────────────
function LibraryTab({ games, onSelect, onOpenProfile, profile }) {
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('');
  const [foc,setFoc]=useState(false);
  const filtered=games.filter(g=>(!q||g.name.toLowerCase().includes(q.toLowerCase()))&&(!cat||g.category===cat));

  // Empty library — first-run sync prompt
  if (games.length === 0) {
    return (
      <div className="page-in" style={{paddingTop:32,textAlign:'center'}}>
        <div style={{
          width:64, height:64, borderRadius:'50%',
          background:T.amberBg, border:`1.5px solid ${T.amberBd}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 22px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        </div>
        <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,marginBottom:10,lineHeight:1.1}}>Your library is empty</h1>
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:26,lineHeight:1.6,maxWidth:300,margin:'0 auto 26px'}}>
          Connect your BoardGameGeek account to fill your collection with the games you actually own.
        </p>
        <Btn onClick={onOpenProfile} variant='amber' size='lg'>Connect BoardGameGeek</Btn>
        <p style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:24,lineHeight:1.6,opacity:0.7}}>
          Your collection on BGG must be public.
        </p>
      </div>
    );
  }

  return (
    <div className="page-in">
      <div style={{position:'relative',marginBottom:14}}>
        <input
          value={q} onChange={e=>setQ(e.target.value)} placeholder="Search collection…"
          onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          style={{...IS,border:`1.5px solid ${foc?T.amber:T.border}`,paddingLeft:44}}
        />
        <svg style={{position:'absolute',left:15,top:'50%',transform:'translateY(-50%)',opacity:0.4,pointerEvents:'none'}} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      <div style={{display:'flex',gap:7,overflowX:'auto',marginBottom:18,paddingBottom:2}}>
        {['All',...CATEGORIES].map(c=>{
          const on=(c==='All'&&!cat)||c===cat;
          return (
            <button key={c} className="press" onClick={()=>setCat(c==='All'?'':c)} style={{flexShrink:0,padding:'7px 14px',borderRadius:20,border:`1.5px solid ${on?T.amber:T.border}`,background:on?T.amberBg:'transparent',color:on?T.amber:T.sub,fontFamily:T.sans,fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s'}}>{c}</button>
          );
        })}
      </div>

      <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginBottom:14}}>{filtered.length} {filtered.length===1?'game':'games'}</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {filtered.map(g=>(
          <div key={g.id} className="card-press" onClick={()=>onSelect(g)} style={{background:T.card,borderRadius:13,overflow:'hidden',boxShadow:T.shadow,position:'relative'}}>
            <GameImg game={g} height={110}/>
            <div style={{padding:'11px 12px 13px'}}>
              <div style={{fontFamily:T.serif,fontSize:16,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:4}}>{g.name}</div>
              <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginBottom:8}}>{g.minPlayers}–{g.maxPlayers} players · {g.category}</div>
              <CxDots value={g.complexity}/>
              {g.bgg && (g.bgg.myRating || g.bgg.myPlays > 0) && (
                <div style={{display:'flex',gap:10,marginTop:8,fontFamily:T.sans,fontSize:10,color:T.sub}}>
                  {g.bgg.myRating && <span style={{color:T.amber,fontWeight:600}}>★ {g.bgg.myRating.toFixed(1)}</span>}
                  {g.bgg.myPlays > 0 && <span>{g.bgg.myPlays} {g.bgg.myPlays===1?'play':'plays'}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0&&<div style={{textAlign:'center',padding:'72px 0',color:T.sub,fontFamily:T.sans,fontSize:14}}>No games match your filter</div>}
    </div>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ game, onClose }) {
  const [rules,setRules]=useState(false);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:400,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div className="sheet-in" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,margin:'0 auto',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 -12px 48px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}><div style={{width:36,height:4,borderRadius:2,background:T.border}}/></div>
        <GameImg game={game} height={230}/>
        <div style={{padding:'20px 20px 36px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
            <div>
              <h2 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,lineHeight:1.05,marginBottom:5}}>{game.name}</h2>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>{game.category}</div>
            </div>
            <button className="press" onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.faint,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.sub,flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div style={{display:'flex',gap:10,marginBottom:20}}>
            <div style={{background:T.card,borderRadius:11,padding:'11px 16px',flex:1}}>
              <Lbl>Players</Lbl>
              <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.ink}}>{game.minPlayers}–{game.maxPlayers}</div>
            </div>
            <div style={{background:T.card,borderRadius:11,padding:'11px 16px',flex:2}}>
              <Lbl>Complexity</Lbl>
              <CxDots value={game.complexity} sz={9}/>
            </div>
          </div>

          {game.bgg && (
            <div style={{background:T.card,borderRadius:11,padding:'14px 16px',marginBottom:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <Lbl>BoardGameGeek</Lbl>
                {game.bgg.year && <div style={{fontFamily:T.sans,fontSize:11,color:T.sub}}>{game.bgg.year}</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:game.bgg.categories?.length?12:0}}>
                {game.bgg.myRating != null && (
                  <div>
                    <div style={{fontFamily:T.sans,fontSize:10,color:T.sub,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:3}}>My rating</div>
                    <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.amber}}>★ {game.bgg.myRating.toFixed(1)}</div>
                  </div>
                )}
                {game.bgg.bggRating != null && (
                  <div>
                    <div style={{fontFamily:T.sans,fontSize:10,color:T.sub,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:3}}>BGG average</div>
                    <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{game.bgg.bggRating.toFixed(1)}</div>
                  </div>
                )}
                {game.bgg.myPlays > 0 && (
                  <div>
                    <div style={{fontFamily:T.sans,fontSize:10,color:T.sub,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:3}}>Plays logged</div>
                    <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{game.bgg.myPlays}</div>
                  </div>
                )}
                {game.bgg.playingTime && (
                  <div>
                    <div style={{fontFamily:T.sans,fontSize:10,color:T.sub,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:3}}>Playing time</div>
                    <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{game.bgg.playingTime}<span style={{fontSize:13,fontWeight:400,marginLeft:3,color:T.sub}}>min</span></div>
                  </div>
                )}
              </div>
              {game.bgg.categories?.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                  {game.bgg.categories.slice(0, 5).map(c => (
                    <span key={c} style={{fontFamily:T.sans,fontSize:10,padding:'3px 9px',borderRadius:20,background:T.bg,color:T.sub,fontWeight:500}}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {game.description&&<p style={{fontFamily:T.sans,fontSize:15,color:T.ink,lineHeight:1.7,marginBottom:18}}>{game.description}</p>}

          {game.rules&&(
            <div style={{marginBottom:20}}>
              <button className="press" onClick={()=>setRules(!rules)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:'13px 16px',cursor:'pointer',fontFamily:T.sans,fontSize:14,fontWeight:500,color:T.ink}}>
                <span>How to play</span>
                <svg style={{transition:'transform 0.22s',transform:rules?'rotate(180deg)':'none'}} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round"><polyline points="2,5 7,10 12,5"/></svg>
              </button>
              {rules&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderTop:'none',borderRadius:'0 0 11px 11px',padding:'0 16px 18px',fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.75,whiteSpace:'pre-wrap'}}>{game.rules}</div>}
            </div>
          )}

          {game.bggId && (
            <a href={`https://boardgamegeek.com/boardgame/${game.bggId}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',display:'block'}}>
              <Btn variant='outline' full>View on BoardGameGeek →</Btn>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Remote Voting Session ────────────────────────────────────────────────────
// Owner-side UI. Three states:
//   1. Setup — pick eligible games, list players, generate session
//   2. Active — live status of incoming votes, copy link, vote yourself
//   3. Complete — view assembled pool, hand off to the existing veto/pick flow

function NSessionSetup({ games, onCreated, onCancel, history }) {
  const [rows, setRows] = useState(['', '', '', '']);
  const [count, setCount] = useState(4);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [vetoers, setVetoers] = useState(null);     // null = default (everyone except picker)
  const [picker, setPicker]   = useState(null);     // null = default (last)
  const [picksPerPlayer, setPicksPerPlayer] = useState(3);  // 2 or 3
  const [vetoMode, setVetoMode] = useState('remote');       // 'remote' | 'in-person'
  // Last picker memory: read from history first (cloud-backed, follows the group).
  // Falls back to localStorage if no history entry has it yet.
  const [lastPicker, setLastPicker] = useState(null);

  useEffect(() => {
    (async () => {
      const mostRecent = (history || []).find(e => e && e.finalPickerName);
      if (mostRecent?.finalPickerName) {
        setLastPicker(mostRecent.finalPickerName);
        return;
      }
      try {
        const r = await window.storage.get('gn4-last-picker');
        if (r) setLastPicker(JSON.parse(r.value));
      } catch {}
    })();
  }, [history]);

  const names = rows.slice(0, count).map(n => n.trim()).filter(Boolean);
  const total = names.length;
  const valid = total >= 2 && games.length > 0;

  // Picker: default to last
  const effectivePicker = picker === null
    ? Math.max(0, total - 1)
    : (picker < total ? picker : Math.max(0, total - 1));

  // Vetoers: default to everyone except picker. Picker always excluded.
  const defaultVetoers = names.map((_, i) => i).filter(i => i !== effectivePicker);
  const effectiveVetoers = vetoers === null
    ? defaultVetoers
    : vetoers.filter(i => i < total && i !== effectivePicker);

  function updateRow(i, val) {
    setRows(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  function randomisePicker() {
    if (total < 2) return;
    let candidates = names.map((_, i) => i);
    if (lastPicker && candidates.length > 1) {
      const lastIdx = names.findIndex(n => n.toLowerCase() === lastPicker.toLowerCase());
      if (lastIdx >= 0) candidates = candidates.filter(i => i !== lastIdx);
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    setPicker(choice);
  }

  async function create() {
    if (!valid) return;
    setCreating(true);
    setError(null);
    try {
      const players = names.map(n => ({ id: randomPlayerId(), name: n }));
      const pickerId = players[effectivePicker].id;
      const vetoerIds = effectiveVetoers.map(i => players[i].id);

      const result = await SessionApi.create({
        games,
        players,
        format: {
          picksPerPlayer,
          vetoMode,
          pickerId,
          vetoerIds,
        },
      });
      // We also stash the indices locally so the owner can run the in-person night later
      onCreated({
        ...result,
        players,
        pickerIndex: effectivePicker,
        vetoerIndices: effectiveVetoers,
        picksPerPlayer,
        vetoMode,
      });
    } catch (e) {
      setError(e.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,marginBottom:6}}>Remote voting</h1>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:24,lineHeight:1.55}}>
        Send your friends a link. They nominate games, vetoes happen, the picker chooses.
      </p>

      {/* Players */}
      <div style={{background:T.card,borderRadius:14,padding:20,marginBottom:14,boxShadow:T.shadow}}>
        <Lbl>Players</Lbl>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {Array.from({length:count}).map((_,i)=>(
            <PlayerRow key={i} index={i} value={rows[i]||''} onChange={v=>updateRow(i,v)}/>
          ))}
        </div>
        <div style={{display:'flex',gap:10,marginTop:14}}>
          {count>1 && <Btn variant='ghost' size='sm' onClick={()=>{ setCount(c=>c-1); setRows(r=>r.slice(0,-1)); }}>Remove</Btn>}
          <Btn variant='outline' size='sm' onClick={()=>{ setCount(c=>c+1); setRows(r=>[...r,'']); }}>Add player</Btn>
        </div>
      </div>

      {total >= 2 && (
        <div style={{background:T.card,borderRadius:14,padding:20,marginBottom:14,boxShadow:T.shadow}}>
          <Lbl>Format</Lbl>

          {/* Picks per player */}
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:16}}>
            <span style={{fontFamily:T.sans,fontSize:13,color:T.sub,flexShrink:0}}>Each player nominates</span>
            <div style={{display:'flex',gap:7}}>
              {[2, 3].map(n => (
                <button key={n} className="press" onClick={()=>setPicksPerPlayer(n)} style={{
                  width:48, height:36, borderRadius:9,
                  border:`1.5px solid ${picksPerPlayer===n?T.amber:T.border}`,
                  background:picksPerPlayer===n?T.amberBg:'transparent',
                  color:picksPerPlayer===n?T.amber:T.sub,
                  fontFamily:T.sans, fontSize:13, fontWeight:600,
                  cursor:'pointer', transition:'all 0.15s',
                }}>{n}</button>
              ))}
              <span style={{fontFamily:T.sans,fontSize:12,color:T.sub,alignSelf:'center',marginLeft:4}}>games</span>
            </div>
          </div>

          {/* Final picker */}
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:7}}>
              <span style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Final picker</span>
              <button className="press" onClick={randomisePicker} style={{
                background:'none', border:'none', cursor:'pointer',
                fontFamily:T.sans, fontSize:11, color:T.amber, fontWeight:600,
                display:'flex',alignItems:'center',gap:4,
              }}>
                <span style={{fontSize:13}}>🎲</span> Randomise
              </button>
            </div>
            <PickerSelect
              playerNames={names}
              selectedIndex={effectivePicker}
              onChange={setPicker}
            />
            {lastPicker && (
              <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:6,opacity:0.8}}>
                Last picker: {lastPicker}
              </div>
            )}
            <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:6,lineHeight:1.5,fontStyle:'italic'}}>
              The picker doesn't nominate or veto.
            </div>
          </div>

          {/* Veto mode toggle */}
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:7}}>Veto mode</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="press" onClick={()=>setVetoMode('remote')} style={{
                textAlign:'left',padding:'12px 14px',borderRadius:10,cursor:'pointer',
                border:`1.5px solid ${vetoMode==='remote'?T.amber:T.border}`,
                background:vetoMode==='remote'?T.amberBg:'transparent',
                fontFamily:T.sans,
              }}>
                <div style={{fontSize:13,fontWeight:600,color:vetoMode==='remote'?T.amber:T.ink,marginBottom:2}}>Remote vetoes</div>
                <div style={{fontSize:11,color:T.sub,lineHeight:1.5}}>
                  Players veto from their own link. You confirm the final pool when everyone's done.
                </div>
              </button>
              <button className="press" onClick={()=>setVetoMode('in-person')} style={{
                textAlign:'left',padding:'12px 14px',borderRadius:10,cursor:'pointer',
                border:`1.5px solid ${vetoMode==='in-person'?T.amber:T.border}`,
                background:vetoMode==='in-person'?T.amberBg:'transparent',
                fontFamily:T.sans,
              }}>
                <div style={{fontSize:13,fontWeight:600,color:vetoMode==='in-person'?T.amber:T.ink,marginBottom:2}}>In-person vetoes</div>
                <div style={{fontSize:11,color:T.sub,lineHeight:1.5}}>
                  Pass the phone at the table — vetoes happen sequentially after everyone arrives.
                </div>
              </button>
            </div>
          </div>

          {/* Vetoers — picker filtered out visually */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:7}}>
              <span style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Vetoers</span>
              <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,opacity:0.7}}>tap to toggle</span>
            </div>
            <VetoerChips
              playerNames={names}
              selectedIndices={effectiveVetoers}
              excludeIndex={effectivePicker}
              onChange={setVetoers}
            />
          </div>
        </div>
      )}

      {total < 2 && (
        <div style={{background:T.card,borderRadius:14,padding:'16px 20px',marginBottom:14,boxShadow:T.shadow,fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.6}}>
          Add at least 2 player names to choose vetoers and the final picker.
        </div>
      )}

      {error && (
        <div style={{background:T.dangerBg,borderRadius:10,padding:'11px 14px',marginBottom:14,fontFamily:T.sans,fontSize:13,color:T.danger,lineHeight:1.5}}>
          {error}
        </div>
      )}

      <div style={{display:'flex',gap:10}}>
        <Btn onClick={create} full disabled={!valid || creating}>
          {creating ? 'Creating…' : 'Create voting session'}
        </Btn>
        <Btn onClick={onCancel} variant='ghost'>Back</Btn>
      </div>

      {games.length === 0 && (
        <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:14,textAlign:'center'}}>
          You need to sync games first — Library → Connect BGG.
        </p>
      )}
    </div>
  );
}

function NSessionActive({ session, games, onClear, onBack }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copyState, setCopyState] = useState('idle');
  const [transitioning, setTransitioning] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null); // { playerId, action: 'nominate'|'veto' }

  // Poll every 4s
  useEffect(() => {
    let stopped = false;
    let timer = null;
    async function poll() {
      try {
        const r = await SessionApi.getResults(session.sessionId, session.ownerKey);
        if (!stopped) {
          setResults(r);
          setError(null);
        }
      } catch (e) {
        if (!stopped) setError(e.message);
      }
      if (!stopped) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [session.sessionId, session.ownerKey]);

  function copyLink() {
    navigator.clipboard.writeText(session.viewerUrl).then(() => {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    });
  }

  async function endSession() {
    if (!window.confirm('End this voting session and clear all votes?')) return;
    try { await SessionApi.destroy(session.sessionId, session.ownerKey); } catch {}
    onClear();
  }

  async function setPhase(newPhase) {
    setTransitioning(true);
    try {
      await SessionApi.setPhase(session.sessionId, session.ownerKey, newPhase);
      // Force immediate poll instead of waiting up to 4s
      const r = await SessionApi.getResults(session.sessionId, session.ownerKey);
      setResults(r);
    } catch (e) {
      alert(`Couldn't change phase: ${e.message}`);
    } finally {
      setTransitioning(false);
    }
  }

  if (!results) {
    return (
      <div className="page-in">
        {onBack && <SessionBackBtn onBack={onBack}/>}
        <div style={{textAlign:'center',padding:'60px 0',fontFamily:T.serif,fontSize:18,color:T.sub}}>Loading session…</div>
        {error && <p style={{fontFamily:T.sans,fontSize:13,color:T.danger,textAlign:'center'}}>{error}</p>}
      </div>
    );
  }

  const phase = results.phase || 'nominate';
  const format = results.format || {};
  const players = results.players;
  const pickerId = format.pickerId;
  const vetoerIds = new Set(format.vetoerIds || []);
  const vetoMode = format.vetoMode || 'in-person';
  const picksPerPlayer = format.picksPerPlayer || 3;

  const nominators = players.filter(p => p.id !== pickerId);
  const vetoers = players.filter(p => vetoerIds.has(p.id));

  const nominations = results.nominations || [];
  const vetoes = results.vetoes || [];
  const nominatedSet = new Set(nominations.map(n => n.playerId));
  const vetoedSet = new Set(vetoes.map(v => v.playerId));

  // Helper: status pill for a player
  function StatusPill({ submitted, byHost, label }) {
    const color = submitted ? '#5DCE8A' : T.sub;
    return (
      <span style={{fontFamily:T.sans,fontSize:11,color,letterSpacing:'0.07em',textTransform:'uppercase',fontWeight:600}}>
        {label}{byHost && ' (host)'}
      </span>
    );
  }

  // Phase labels for the top
  const phaseLabel = {
    nominate: { tag:'Nomination phase', desc:`Each player nominates ${picksPerPlayer} games from their link.` },
    veto:     { tag:'Veto phase',       desc:'Each eligible player vetoes one game (or skips) from their link.' },
    review:   { tag:'Review',           desc:'Confirm the final pool before sending to the picker.' },
    pick:     { tag:'Final pick',       desc:'Picker is choosing the game from their own link.' },
    complete: { tag:'Complete',         desc:'Session is over.' },
  }[phase] || { tag: phase, desc:'' };

  const allNominated = nominators.every(p => nominatedSet.has(p.id));
  const allVetoed = vetoers.every(p => vetoedSet.has(p.id));

  // Build the final pool from nominations minus vetoes
  const pool = [...new Set(nominations.flatMap(n => n.picks))];
  const removedGameIds = new Set(vetoes.filter(v => !v.skipped && v.gameId).map(v => v.gameId));
  const finalPool = pool.filter(gid => !removedGameIds.has(gid));
  const poolGames = finalPool.map(gid => games.find(g => g.id === gid)).filter(Boolean);

  return (
    <div className="page-in">
      {onBack && <SessionBackBtn onBack={onBack}/>}

      <div style={{marginBottom:6}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:5}}>
          {phaseLabel.tag}
        </div>
        <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,marginBottom:8}}>Voting session</h1>
        <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:22,lineHeight:1.55}}>
          <code style={{fontFamily:'monospace',color:T.amber,fontSize:13,letterSpacing:'0.05em'}}>{session.sessionId}</code>
          {' · '}{phaseLabel.desc}
        </p>
      </div>

      {/* Share link — visible in nominate AND veto phases (vetoers also use link) */}
      {(phase === 'nominate' || phase === 'veto') && (
        <div style={{background:T.card,borderRadius:14,padding:'14px 16px',marginBottom:14,boxShadow:T.shadow}}>
          <Lbl>Share this link with players</Lbl>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input readOnly value={session.viewerUrl}
              onClick={e => e.target.select()}
              style={{...IS,fontSize:12,fontFamily:'monospace',padding:'10px 12px',color:T.sub,border:`1.5px solid ${T.border}`}}
            />
            <Btn onClick={copyLink} size='sm' variant='primary'>
              {copyState === 'copied' ? 'Copied' : 'Copy'}
            </Btn>
          </div>
        </div>
      )}

      {/* ── NOMINATE PHASE ─── */}
      {phase === 'nominate' && (
        <>
          <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:14,boxShadow:T.shadow}}>
            {players.map((p, i) => {
              const isPicker = p.id === pickerId;
              const nom = nominations.find(n => n.playerId === p.id);
              return (
                <div key={p.id}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:isPicker ? T.amber : (nom ? '#5DCE8A' : T.border),flexShrink:0}}/>
                    <div style={{flex:1,fontFamily:T.sans,fontSize:15,color:T.ink}}>
                      {p.name}
                      {isPicker && <span style={{fontSize:10,color:T.amber,marginLeft:8,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>· picker</span>}
                    </div>
                    {isPicker
                      ? <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,fontStyle:'italic'}}>doesn't nominate</span>
                      : <StatusPill submitted={!!nom} byHost={nom?.byHost} label={nom ? 'nominated' : 'waiting'}/>}
                  </div>
                  {i < players.length-1 && <Hr/>}
                </div>
              );
            })}
          </div>

          <Btn variant='outline' full onClick={()=>window.open(session.viewerUrl, '_blank')}>Vote myself</Btn>

          {allNominated && (
            <div style={{background:T.amberBg,border:`1.5px solid ${T.amberBd}`,borderRadius:12,padding:14,marginTop:14,marginBottom:14}}>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.amber,fontWeight:600,marginBottom:8,letterSpacing:'0.02em'}}>
                ✓ All nominations in
              </div>
              <p style={{fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.55,marginBottom:12}}>
                {vetoMode === 'remote'
                  ? 'Open the veto phase so eligible players can veto from their link.'
                  : 'Move to the review step. Vetoes will happen in person on this device.'}
              </p>
              <Btn variant='amber' full disabled={transitioning} onClick={()=>setPhase(vetoMode === 'remote' ? 'veto' : 'review')}>
                {transitioning ? 'Opening…' : (vetoMode === 'remote' ? 'Open veto phase →' : 'Continue to review →')}
              </Btn>
            </div>
          )}
        </>
      )}

      {/* ── VETO PHASE (remote only) ─── */}
      {phase === 'veto' && (
        <>
          <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:14,boxShadow:T.shadow}}>
            {players.map((p, i) => {
              const isPicker = p.id === pickerId;
              const isVetoer = vetoerIds.has(p.id);
              const veto = vetoes.find(v => v.playerId === p.id);
              let label = 'waiting';
              if (veto) {
                if (veto.skipped) label = 'skipped';
                else {
                  const g = games.find(g => g.id === veto.gameId);
                  label = g ? `vetoed ${g.name.length > 18 ? g.name.slice(0,16)+'…' : g.name}` : 'vetoed';
                }
              }
              return (
                <div key={p.id}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:isPicker ? T.amber : (!isVetoer ? T.sub : (veto ? '#5DCE8A' : T.border)),flexShrink:0}}/>
                    <div style={{flex:1,fontFamily:T.sans,fontSize:15,color:T.ink}}>
                      {p.name}
                      {isPicker && <span style={{fontSize:10,color:T.amber,marginLeft:8,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>· picker</span>}
                      {!isVetoer && !isPicker && <span style={{fontSize:10,color:T.sub,marginLeft:8,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>· no veto</span>}
                    </div>
                    {isPicker
                      ? <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,fontStyle:'italic'}}>doesn't veto</span>
                      : !isVetoer
                        ? <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,fontStyle:'italic'}}>—</span>
                        : <StatusPill submitted={!!veto} byHost={veto?.byHost} label={label}/>}
                  </div>
                  {i < players.length-1 && <Hr/>}
                </div>
              );
            })}
          </div>

          <Btn variant='outline' full onClick={()=>window.open(session.viewerUrl, '_blank')}>Veto myself</Btn>

          {allVetoed && (
            <div style={{background:T.amberBg,border:`1.5px solid ${T.amberBd}`,borderRadius:12,padding:14,marginTop:14,marginBottom:14}}>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.amber,fontWeight:600,marginBottom:8,letterSpacing:'0.02em'}}>
                ✓ All vetoes in
              </div>
              <p style={{fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.55,marginBottom:12}}>
                Review the final pool before moving to the final pick.
              </p>
              <Btn variant='amber' full disabled={transitioning} onClick={()=>setPhase('review')}>
                {transitioning ? 'Loading…' : 'Review final pool →'}
              </Btn>
            </div>
          )}
        </>
      )}

      {/* ── REVIEW PHASE ─── */}
      {phase === 'review' && (
        <>
          <div style={{background:T.card,borderRadius:14,padding:'16px 18px',marginBottom:14,boxShadow:T.shadow}}>
            <Lbl>Final pool ({poolGames.length} {poolGames.length === 1 ? 'game' : 'games'})</Lbl>
            {poolGames.length === 0 ? (
              <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,fontStyle:'italic'}}>
                Everything was vetoed. Go back to veto phase to undo one.
              </p>
            ) : (
              <ul style={{listStyle:'none',padding:0,margin:0}}>
                {poolGames.map(g => (
                  <li key={g.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',fontFamily:T.sans,fontSize:14,color:T.ink}}>
                    <div style={{width:34,height:34,borderRadius:7,overflow:'hidden',flexShrink:0}}>
                      <GameImg game={g} height={34}/>
                    </div>
                    <span style={{flex:1}}>{g.name}</span>
                    <span style={{fontSize:11,color:T.sub}}>{g.minPlayers}–{g.maxPlayers}p</span>
                  </li>
                ))}
              </ul>
            )}
            {removedGameIds.size > 0 && (
              <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.border}`,fontFamily:T.sans,fontSize:11,color:T.sub,lineHeight:1.5}}>
                Vetoed: {Array.from(removedGameIds).map(gid => games.find(g=>g.id===gid)?.name).filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          <div style={{background:T.card,borderRadius:14,padding:'14px 16px',marginBottom:14,boxShadow:T.shadow,fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.6}}>
            Picker tonight: <strong style={{color:T.amber}}>{players.find(p => p.id === pickerId)?.name}</strong>
          </div>

          {/* Two paths from review:
              1. Send to the picker on their own link (remote)
              2. Run the pick in person on this device                              */}
          <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:10}}>
            How will {players.find(p => p.id === pickerId)?.name} pick?
          </div>

          <Btn variant='amber' full disabled={poolGames.length === 0 || transitioning} onClick={()=>setPhase('pick')}>
            {transitioning ? 'Opening…' : `Send pick link to ${players.find(p => p.id === pickerId)?.name} →`}
          </Btn>

          <div style={{textAlign:'center',margin:'10px 0',fontFamily:T.sans,fontSize:11,color:T.sub,letterSpacing:'0.08em',textTransform:'uppercase',opacity:0.7}}>
            or
          </div>

          <Btn variant='outline' full disabled={poolGames.length === 0} onClick={()=>{
            // In-person path: build a local session and hand off to the host's device.
            // Carry playerIds alongside players so NPlaying can record the picker's id
            // in the history entry.
            const pickerIndex = players.findIndex(p => p.id === pickerId);
            const localSession = {
              phase: 'pick',
              players: players.map(p => p.name),
              playerIds: players.map(p => p.id),
              picksPerPlayer,
              pickerIndex,
              nominatorIndices: players.map((_, i) => i).filter(i => i !== pickerIndex),
              currentNominator: 0,
              nominations: Object.fromEntries(
                nominations.map(n => [players.findIndex(p => p.id === n.playerId), n.picks])
              ),
              pool,
              vetoerIndices: Array.from(vetoerIds).map(vid => players.findIndex(p => p.id === vid)),
              currentVetoIndex: 0,
              vetoes: Object.fromEntries(
                vetoes.map(v => [players.findIndex(p => p.id === v.playerId), v.skipped ? null : v.gameId])
              ),
              remaining: finalPool,
              chosenGame: null,
              scores: {},
              sourceSessionId: session.sessionId,
            };
            window.dispatchEvent(new CustomEvent('start-local-from-remote', {
              detail: { localSession, sourceSessionId: session.sessionId }
            }));
          }}>
            Pick in person on this device →
          </Btn>

          <div style={{display:'flex',gap:10,marginTop:18}}>
            {vetoMode === 'remote' && (
              <Btn variant='ghost' full disabled={transitioning} onClick={()=>setPhase('veto')}>
                ← Back to veto
              </Btn>
            )}
            <Btn variant='ghost' full disabled={transitioning} onClick={()=>setPhase('nominate')}>
              ← Back to nominate
            </Btn>
          </div>
        </>
      )}

      {/* ── PICK PHASE — picker is choosing from their own device ─────── */}
      {phase === 'pick' && (
        <>
          <div style={{background:T.card,borderRadius:14,padding:'14px 16px',marginBottom:14,boxShadow:T.shadow}}>
            <Lbl>Share this link with {players.find(p => p.id === pickerId)?.name}</Lbl>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input readOnly value={session.viewerUrl}
                onClick={e => e.target.select()}
                style={{...IS,fontSize:12,fontFamily:'monospace',padding:'10px 12px',color:T.sub,border:`1.5px solid ${T.border}`}}
              />
              <Btn onClick={copyLink} size='sm' variant='primary'>
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </Btn>
            </div>
            <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:10,lineHeight:1.5}}>
              {players.find(p => p.id === pickerId)?.name} opens the link, taps their name, and chooses the final game.
            </p>
          </div>

          {results.finalPickedGameId ? (() => {
            const picked = games.find(g => g.id === results.finalPickedGameId);
            return (
              <div style={{background:T.amberBg,border:`1.5px solid ${T.amberBd}`,borderRadius:12,padding:16,marginBottom:14}}>
                <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:8}}>
                  ✓ {players.find(p => p.id === pickerId)?.name} picked
                </div>
                {picked && (
                  <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
                    <div style={{width:54,height:54,borderRadius:9,overflow:'hidden',flexShrink:0}}>
                      <GameImg game={picked} height={54}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:3}}>{picked.name}</div>
                      <div style={{fontFamily:T.sans,fontSize:11,color:T.sub}}>{picked.minPlayers}–{picked.maxPlayers}p · {picked.category}</div>
                    </div>
                  </div>
                )}
                <Btn variant='amber' full onClick={()=>{
                  // Build local session jumping straight to NPlaying with the chosen game.
                  // playerIds is carried so NPlaying can record the picker's id in history.
                  const pickerIndex = players.findIndex(p => p.id === pickerId);
                  const localSession = {
                    phase: 'playing',
                    players: players.map(p => p.name),
                    playerIds: players.map(p => p.id),
                    picksPerPlayer,
                    pickerIndex,
                    nominatorIndices: players.map((_, i) => i).filter(i => i !== pickerIndex),
                    currentNominator: 0,
                    nominations: Object.fromEntries(
                      nominations.map(n => [players.findIndex(p => p.id === n.playerId), n.picks])
                    ),
                    pool,
                    vetoerIndices: Array.from(vetoerIds).map(vid => players.findIndex(p => p.id === vid)),
                    currentVetoIndex: 0,
                    vetoes: Object.fromEntries(
                      vetoes.map(v => [players.findIndex(p => p.id === v.playerId), v.skipped ? null : v.gameId])
                    ),
                    remaining: finalPool,
                    chosenGame: results.finalPickedGameId,
                    scores: {},
                    sourceSessionId: session.sessionId,
                  };
                  window.dispatchEvent(new CustomEvent('start-local-from-remote', {
                    detail: { localSession, sourceSessionId: session.sessionId }
                  }));
                }}>
                  Start playing →
                </Btn>
              </div>
            );
          })() : (
            <div style={{background:T.card,borderRadius:12,padding:16,marginBottom:14,boxShadow:T.shadow,textAlign:'center'}}>
              <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:6}}>
                Waiting for {players.find(p => p.id === pickerId)?.name}…
              </div>
              <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,lineHeight:1.55,marginBottom:0}}>
                They need to open the link and choose from {poolGames.length} {poolGames.length === 1 ? 'game' : 'games'}.
              </p>
            </div>
          )}

          <Btn variant='ghost' full disabled={transitioning} onClick={()=>setPhase('review')}>
            ← Back to review
          </Btn>
        </>
      )}

      {/* Always available: end session */}
      <div style={{marginTop:18}}>
        <Btn onClick={endSession} variant='dangerOutline' full>End session and discard votes</Btn>
      </div>
    </div>
  );
}

// Reusable back arrow at the top of session screens
// Reusable top-of-screen back button. Used across the Tonight tab flow.
//   - `label` controls the link text (e.g. "Back", "All sessions", "Cancel night")
//   - If `confirm` is provided, a window.confirm is shown before calling onBack —
//     use this for screens where going back discards real progress (vetoes, etc).
function BackBtn({ onBack, label = 'Back', confirm = null }) {
  function handle() {
    if (confirm && !window.confirm(confirm)) return;
    onBack();
  }
  return (
    <button className="press" onClick={handle} style={{
      display:'flex',alignItems:'center',gap:6,
      background:'none',border:'none',padding:'4px 0 14px',
      color:T.sub,fontFamily:T.sans,fontSize:13,fontWeight:500,
      cursor:'pointer',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9,2 3,7 9,12"/>
      </svg>
      {label}
    </button>
  );
}

// Kept for backwards compatibility — NSessionActive uses the older name
function SessionBackBtn({ onBack }) {
  return <BackBtn onBack={onBack} label="All sessions"/>;
}
function NightTab({
  games, session, onUpdate, onFinish, onGoToLibrary,
  voteSessions, activeVoteSessionId, onSelectVoteSession,
  onAddVoteSession, onRemoveVoteSession,
  history,
}) {
  const [view, setView] = useState('home'); // 'home' | 'local' | 'remote-setup'
  const hasRemoteSessions = voteSessions.length > 0;
  const activeRemote = voteSessions.find(s => s.sessionId === activeVoteSessionId);

  // Block all paths if library empty AND nothing in flight
  if (games.length === 0 && !session && !hasRemoteSessions) {
    return (
      <div className="page-in" style={{paddingTop:32,textAlign:'center'}}>
        <h1 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:10}}>No games yet</h1>
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:22,lineHeight:1.5,maxWidth:300,margin:'0 auto 22px'}}>
          You'll need a library before you can run a game night. Connect BoardGameGeek first.
        </p>
        <Btn onClick={onGoToLibrary} variant='amber'>Go to Library</Btn>
      </div>
    );
  }

  // Active local session takes the screen (in-person game night in progress).
  // onCancelSession lets nested screens nuke the whole session and return home.
  const cancelLocalSession = () => onUpdate(null);
  if (session) {
    if(session.phase==='nominate') return <NNominate games={games} session={session} onUpdate={onUpdate} onCancelSession={cancelLocalSession}/>;
    if(session.phase==='pool')     return <NPool     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='veto')     return <NVeto     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='pick')     return <NPick     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='playing')  return <NPlaying  games={games} session={session} onUpdate={onUpdate} onFinish={onFinish}/>;
  }

  // Remote session being viewed in detail
  if (activeRemote) {
    return (
      <NSessionActive
        session={activeRemote}
        games={games}
        onBack={() => onSelectVoteSession(null)}
        onClear={() => { onRemoveVoteSession(activeRemote.sessionId); }}
      />
    );
  }

  // Setup flows. NSetup gets onBack to return to the NightTab home view.
  if (view === 'local') return <NSetup onStart={onUpdate} history={history} onBack={() => setView('home')}/>;
  if (view === 'remote-setup') return (
    <NSessionSetup
      games={games}
      onCreated={s => { onAddVoteSession(s); setView('home'); }}
      onCancel={() => setView('home')}
      history={history}
    />
  );

  // Home view — varies depending on whether there are any remote sessions yet
  if (hasRemoteSessions) {
    return (
      <NSessionList
        sessions={voteSessions}
        onOpen={onSelectVoteSession}
        onNewRemote={() => setView('remote-setup')}
        onNewLocal={() => setView('local')}
      />
    );
  }

  // No remote sessions yet — original two-choice screen
  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Tonight</h1>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:28,lineHeight:1.5}}>
        How are you running game night?
      </p>

      <button className="card-press" onClick={()=>setView('local')} style={{
        width:'100%',background:T.card,borderRadius:14,padding:'18px 20px',marginBottom:12,
        border:`1.5px solid ${T.border}`,boxShadow:T.shadow,
        textAlign:'left',cursor:'pointer',display:'block',
      }}>
        <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:4}}>In-person</div>
        <div style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.5}}>
          Everyone's here. Pass the phone around to nominate, veto, and pick.
        </div>
      </button>

      <button className="card-press" onClick={()=>setView('remote-setup')} style={{
        width:'100%',background:T.card,borderRadius:14,padding:'18px 20px',marginBottom:12,
        border:`1.5px solid ${T.border}`,boxShadow:T.shadow,
        textAlign:'left',cursor:'pointer',display:'block',
      }}>
        <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:4}}>
          Remote voting
          <span style={{fontSize:10,padding:'2px 7px',background:T.amberBg,color:T.amber,borderRadius:6,marginLeft:8,letterSpacing:'0.05em',textTransform:'uppercase',verticalAlign:'middle',fontWeight:600}}>New</span>
        </div>
        <div style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.5}}>
          Send a link to friends to nominate before they arrive. You assemble the pool when they're all in.
        </div>
      </button>
    </div>
  );
}

// ── Voting Session List — shown when there's 1+ active remote sessions ───────
function NSessionList({ sessions, onOpen, onNewRemote, onNewLocal }) {
  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Tonight</h1>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:24,lineHeight:1.5}}>
        Your active voting sessions
      </p>

      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
        {sessions.map(s => (
          <NSessionListRow key={s.sessionId} session={s} onClick={() => onOpen(s.sessionId)}/>
        ))}
      </div>

      <Btn onClick={onNewRemote} variant='amber' full>+ New voting session</Btn>
      <div style={{textAlign:'center',margin:'18px 0 0',fontFamily:T.sans,fontSize:12,color:T.sub,letterSpacing:'0.08em',textTransform:'uppercase'}}>or</div>
      <button className="press" onClick={onNewLocal} style={{
        width:'100%',marginTop:18,padding:'14px 18px',borderRadius:11,
        border:`1.5px solid ${T.border}`,background:'transparent',
        color:T.ink,fontFamily:T.sans,fontSize:14,fontWeight:500,cursor:'pointer',
        transition:'all 0.15s',
      }}>
        Run an in-person night now →
      </button>
    </div>
  );
}

// Single row in the session list — polls for vote progress so the count is live
function NSessionListRow({ session, onClick }) {
  const [meta, setMeta] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    async function tick() {
      try {
        const m = await SessionApi.getMeta(session.sessionId);
        if (!cancelled) setMeta(m);
      } catch (e) {
        // 404 or gone — flag for the user
        if (!cancelled) setMissing(true);
      }
    }
    tick();
    timer = setInterval(tick, 5000); // moderate poll on the list view
    return () => { cancelled = true; clearInterval(timer); };
  }, [session.sessionId]);

  const totalPlayers = meta?.players?.length ?? session.players?.length ?? 0;
  const votedCount = meta?.votedPlayerIds?.length ?? 0;
  const complete = totalPlayers > 0 && votedCount >= totalPlayers;
  const age = timeAgo(session.createdAt);

  return (
    <button className="card-press" onClick={onClick} disabled={missing} style={{
      width:'100%', textAlign:'left', cursor: missing ? 'default' : 'pointer',
      background:T.card, borderRadius:13, padding:'14px 16px',
      border:`1.5px solid ${complete ? T.amberBd : T.border}`,
      boxShadow:T.shadow, display:'block',
      opacity: missing ? 0.55 : 1,
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,gap:10}}>
        <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700,color:T.ink,letterSpacing:'0.08em'}}>
          {session.sessionId.toUpperCase()}
        </div>
        {missing
          ? <div style={{fontFamily:T.sans,fontSize:11,color:T.danger,fontWeight:500}}>Expired</div>
          : complete
            ? <div style={{fontFamily:T.sans,fontSize:11,color:T.amber,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>All voted</div>
            : <div style={{fontFamily:T.sans,fontSize:11,color:T.sub}}>{votedCount}/{totalPlayers} voted</div>
        }
      </div>
      <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{totalPlayers > 0 ? `${totalPlayers} player${totalPlayers===1?'':'s'}` : '…'}</span>
        <span>Created {age}</span>
      </div>
    </button>
  );
}

function NSetup({ onStart, history, onBack }) {
  const [rows, setRows]   = useState(['','','']);
  const [count, setCount] = useState(3);
  // The in-person flow used to track a "nominatorCount" (first N players nominate).
  // With explicit picker exclusion, we don't need that — non-picker players ALL nominate.
  // We do track picksPerPlayer (2 or 3).
  const [picksPerPlayer, setPicksPerPlayer] = useState(3);
  // Vetoers and picker — `null` means "use defaults" until the user touches them.
  const [vetoers, setVetoers] = useState(null);   // null | number[] (indices into `names`)
  const [picker, setPicker]   = useState(null);   // null | number
  // Last picker memory: read from history (cloud-backed) first, fall back to localStorage.
  // History is the source of truth — it travels with the backup code across devices.
  const [lastPicker, setLastPicker] = useState(null);

  useEffect(() => {
    (async () => {
      // 1) Look at the most recent completed history entry with a picker recorded.
      const mostRecent = (history || []).find(e => e && e.finalPickerName);
      if (mostRecent?.finalPickerName) {
        setLastPicker(mostRecent.finalPickerName);
        return;
      }
      // 2) Fallback: localStorage from older sessions or pre-cloud era.
      try {
        const r = await window.storage.get('gn4-last-picker');
        if (r) setLastPicker(JSON.parse(r.value));
      } catch {}
    })();
  }, [history]);

  // Filled player names only (trimmed, non-empty)
  const names = rows.slice(0,count).map(n=>n.trim()).filter(Boolean);
  const total = names.length;
  const valid = total >= 2;  // need at least 2 — picker + 1 nominator

  // Resolve picker. Default to last player. Clamp to valid range.
  const effectivePicker = picker === null
    ? Math.max(0, total - 1)
    : (picker < total ? picker : Math.max(0, total - 1));

  // Resolve vetoers. Default: everyone except picker. Always exclude picker
  // even if user previously toggled them on (the picker rule is hard).
  const defaultVetoers = names.map((_, i) => i).filter(i => i !== effectivePicker);
  const effectiveVetoers = (vetoers === null
    ? defaultVetoers
    : vetoers.filter(i => i < total && i !== effectivePicker));

  // Nominators = everyone except the picker (no longer configurable as a count)
  const nominators = names.map((_, i) => i).filter(i => i !== effectivePicker);

  function addPlayer() {
    setCount(c => c + 1);
    setRows(r => [...r, '']);
  }

  function removePlayer() {
    if(count <= 1) return;
    setCount(c => c - 1);
    setRows(r => r.slice(0, -1));
  }

  function updateRow(i, val) {
    setRows(prev => { const next=[...prev]; next[i]=val; return next; });
  }

  // Randomise the final picker. If we know who picked last time and there's
  // more than one option, exclude them to spread it around.
  function randomisePicker() {
    if (total < 2) return;
    let candidates = names.map((_, i) => i);
    if (lastPicker && candidates.length > 1) {
      const lastIdx = names.findIndex(n => n.toLowerCase() === lastPicker.toLowerCase());
      if (lastIdx >= 0) candidates = candidates.filter(i => i !== lastIdx);
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    setPicker(choice);
  }

  function start() {
    if(!valid) return;
    onStart({
      phase: 'nominate',
      players: names,
      // Picker is a hard role — store the index. Picker is excluded from nominate + veto.
      pickerIndex: effectivePicker,
      // Nominators are walked in order: indices of all non-picker players.
      nominatorIndices: nominators,
      currentNominator: 0,            // walks nominatorIndices, NOT players
      picksPerPlayer,                 // 2 or 3
      nominations: {},                // { playerIndex: [gameId×N] }
      pool: [],
      vetoerIndices: effectiveVetoers,
      currentVetoIndex: 0,             // walks vetoerIndices
      vetoes: {},                      // { playerIndex: gameId | null (skipped) }
      remaining: [],
      chosenGame: null,
      scores: {},
    });
  }

  // Dynamic format-step text
  let steps = null;
  if (total >= 2) {
    const nominatorNames = nominators.map(i => names[i]).filter(Boolean);
    const s1 = nominators.length === 1
      ? `${nominatorNames[0]} nominates ${picksPerPlayer} games`
      : `${nominatorNames.length} players each nominate ${picksPerPlayer} games (everyone except the picker)`;
    const vetoCount = effectiveVetoers.length;
    const s2 = vetoCount === 0
      ? 'No vetoes — straight to the final pick'
      : vetoCount === 1
        ? `${names[effectiveVetoers[0]]} gets a veto (pass the phone)`
        : `${vetoCount} players each get a veto (pass the phone)`;
    const s3 = `${names[effectivePicker] || 'Picker'} makes the final pick`;
    steps = [s1, s2, s3];
  }

  return (
    <div className="page-in">
      {onBack && <BackBtn onBack={onBack}/>}
      <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Tonight</h1>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:28,lineHeight:1.5}}>
        {total === 0
          ? 'Add player names to begin.'
          : total === 1
            ? 'Need at least 2 players (picker + 1 nominator).'
            : `${total} players tonight.`}
      </p>

      {/* Players card */}
      <div style={{background:T.card,borderRadius:14,padding:20,marginBottom:14,boxShadow:T.shadow}}>
        <Lbl>Players</Lbl>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {Array.from({length:count}).map((_,i)=>(
            <PlayerRow key={i} index={i} value={rows[i]||''} onChange={val=>updateRow(i,val)}/>
          ))}
        </div>
        <div style={{display:'flex',gap:10,marginTop:14}}>
          {count>1&&<Btn onClick={removePlayer} variant='ghost' size='sm'>Remove</Btn>}
          <Btn onClick={addPlayer} variant='outline' size='sm'>Add player</Btn>
        </div>
      </div>

      {/* Format card */}
      <div style={{background:T.card,borderRadius:14,padding:20,marginBottom:28,boxShadow:T.shadow}}>
        <Lbl>Format</Lbl>

        {steps ? (
          steps.map((text, i) => (
            <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:i<steps.length-1?12:0}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.sans,fontSize:11,fontWeight:600,color:T.sub,flexShrink:0,marginTop:1}}>{i+1}</div>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.55,paddingTop:2}}>{text}</div>
            </div>
          ))
        ) : (
          <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.55,fontStyle:'italic'}}>
            Add at least 2 player names to see the format.
          </p>
        )}

        {total >= 2 && (
          <>
            <Hr style={{margin:'16px 0'}}/>

            {/* Nominations per player */}
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}>
              <span style={{fontFamily:T.sans,fontSize:13,color:T.sub,flexShrink:0}}>Each player nominates</span>
              <div style={{display:'flex',gap:7}}>
                {[2, 3].map(n => (
                  <button key={n} className="press" onClick={()=>setPicksPerPlayer(n)} style={{
                    width:48, height:36, borderRadius:9,
                    border:`1.5px solid ${picksPerPlayer===n?T.amber:T.border}`,
                    background:picksPerPlayer===n?T.amberBg:'transparent',
                    color:picksPerPlayer===n?T.amber:T.sub,
                    fontFamily:T.sans, fontSize:13, fontWeight:600,
                    cursor:'pointer', transition:'all 0.15s',
                  }}>{n}</button>
                ))}
                <span style={{fontFamily:T.sans,fontSize:12,color:T.sub,alignSelf:'center',marginLeft:4}}>games</span>
              </div>
            </div>

            {/* Final picker */}
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:7}}>
                <span style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Final picker</span>
                <button className="press" onClick={randomisePicker} style={{
                  background:'none', border:'none', cursor:'pointer',
                  fontFamily:T.sans, fontSize:11, color:T.amber, fontWeight:600,
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  <span style={{fontSize:13}}>🎲</span> Randomise
                </button>
              </div>
              <PickerSelect
                playerNames={names}
                selectedIndex={effectivePicker}
                onChange={setPicker}
              />
              {lastPicker && (
                <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:6,opacity:0.8}}>
                  Last picker: {lastPicker}
                </div>
              )}
              <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:6,lineHeight:1.5,fontStyle:'italic'}}>
                The picker doesn't nominate or veto. Their job is the final choice.
              </div>
            </div>

            {/* Vetoers — picker is filtered out before rendering */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:7}}>
                <span style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Vetoers</span>
                <span style={{fontFamily:T.sans,fontSize:11,color:T.sub,opacity:0.7}}>tap to toggle</span>
              </div>
              <VetoerChips
                playerNames={names}
                selectedIndices={effectiveVetoers}
                excludeIndex={effectivePicker}
                onChange={setVetoers}
              />
            </div>
          </>
        )}
      </div>

      <Btn onClick={start} full disabled={!valid}>Start game night</Btn>
    </div>
  );
}

function NNominate({ games, session, onUpdate, onCancelSession }) {
  const { players, currentNominator, nominations } = session;
  const picksPerPlayer = session.picksPerPlayer ?? 3;
  // Old sessions might not have nominatorIndices — derive: everyone except picker.
  const pickerIndex = session.pickerIndex ?? players.length - 1;
  const nominatorIndices = session.nominatorIndices
    ?? players.map((_, i) => i).filter(i => i !== pickerIndex);

  const currentPlayerIndex = nominatorIndices[currentNominator];
  const currentPlayerName = players[currentPlayerIndex];

  const [picks, setPicks] = useState(nominations[currentPlayerIndex] || []);
  // When currentNominator changes (forward or back), reload picks from saved nominations
  useEffect(() => {
    setPicks(nominations[currentPlayerIndex] || []);
  }, [currentNominator]);
  const [q, setQ] = useState('');
  const [foc, setFoc] = useState(false);
  const pc = players.length;

  // Only games that support the full table's player count
  const eligible = games.filter(g => g.minPlayers <= pc && g.maxPlayers >= pc);
  const filtered = eligible.filter(g => !q || g.name.toLowerCase().includes(q.toLowerCase()));

  function toggle(id) {
    if (picks.includes(id)) { setPicks(p => p.filter(x => x !== id)); return; }
    if (picks.length >= picksPerPlayer) return;
    setPicks(p => [...p, id]);
  }

  function confirm() {
    if (picks.length !== picksPerPlayer) return;
    // Key nominations by the actual player index (not the position in nominatorIndices)
    // so we can look them up consistently later.
    const newNom = { ...nominations, [currentPlayerIndex]: picks };
    const isLast = currentNominator >= nominatorIndices.length - 1;
    if (isLast) {
      const pool = [...new Set(Object.values(newNom).flat())];
      onUpdate({ ...session, nominations: newNom, pool, phase: 'pool' });
    } else {
      onUpdate({ ...session, nominations: newNom, currentNominator: currentNominator + 1 });
      setPicks([]);
    }
  }

  // Back behaviour: step back one nominator if possible, else exit session.
  // Going back one nominator preserves their previous picks so they can edit.
  function goBack() {
    if (currentNominator > 0) {
      onUpdate({ ...session, currentNominator: currentNominator - 1 });
      // The picks state will be re-initialised when the component re-renders
      // with the new currentPlayerIndex
    } else if (onCancelSession) {
      onCancelSession();
    }
  }
  const backLabel = currentNominator > 0 ? 'Previous player' : 'Cancel night';
  const backConfirm = currentNominator > 0
    ? null  // soft back — previous player's picks are preserved
    : 'Cancel this night and lose all nominations so far?';

  // Picker doesn't appear in this loop at all — they're filtered out of nominatorIndices.
  // But just in case (e.g. stale session), show a clear message.
  if (!currentPlayerName) {
    return (
      <div className="page-in">
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,textAlign:'center',padding:'40px 16px'}}>
          Loading nominations…
        </p>
      </div>
    );
  }

  return (
    <div className="page-in">
      <BackBtn onBack={goBack} label={backLabel} confirm={backConfirm}/>
      <div style={{marginBottom:22}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:5}}>
          Nomination {currentNominator+1} of {nominatorIndices.length}
        </div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:16}}>{currentPlayerName}</h2>
        <Steps total={nominatorIndices.length} current={currentNominator}/>
        <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:10,fontStyle:'italic'}}>
          Picker tonight: {players[pickerIndex]} (doesn't nominate)
        </div>
      </div>

      {/* Current player's picks only — no other player's choices visible */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {Array.from({length: picksPerPlayer}).map((_,i)=>{
          const g=picks[i]?games.find(x=>x.id===picks[i]):null;
          return (
            <div key={i} onClick={g?()=>toggle(picks[i]):undefined} style={{flex:1,minHeight:46,borderRadius:10,padding:'10px 8px',border:`1.5px solid ${g?T.amber:T.border}`,background:g?T.amberBg:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:g?'pointer':'default',transition:'all 0.15s'}}>
              {g?<div style={{fontFamily:T.sans,fontSize:12,color:T.amber,textAlign:'center',fontWeight:500,lineHeight:1.3}}>{g.name}</div>
                :<div style={{fontFamily:T.sans,fontSize:12,color:T.border,fontWeight:500}}>Pick {i+1}</div>}
            </div>
          );
        })}
      </div>

      <div style={{position:'relative',marginBottom:14}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"
          onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          style={{...IS,border:`1.5px solid ${foc?T.amber:T.border}`,paddingLeft:42}}
        />
        <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',opacity:0.3,pointerEvents:'none'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginBottom:9,letterSpacing:'0.02em'}}>
        Showing games for {pc} {pc===1?'player':'players'} · {eligible.length} available
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,maxHeight:'38vh',overflowY:'auto',marginBottom:16}}>
        {filtered.map(g=>{
          const on=picks.includes(g.id);
          return (
            <div key={g.id} className="card-press" onClick={()=>toggle(g.id)} style={{background:on?T.amberBg:T.card,border:`1.5px solid ${on?T.amber:T.border}`,borderRadius:11,overflow:'hidden',cursor:'pointer',boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative'}}>
              <GameImg game={g} height={82}/>
              <div style={{padding:'8px 10px 10px'}}>
                <div style={{fontFamily:T.serif,fontSize:14,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:2}}>{g.name}</div>
                <div style={{fontFamily:T.sans,fontSize:10,color:T.sub}}>{g.minPlayers}–{g.maxPlayers}p</div>
              </div>
              {on&&<div style={{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:'50%',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:8,height:8,borderRadius:'50%',background:'#FFFFFF'}}/></div>}
            </div>
          );
        })}
        {eligible.length===0&&(
          <div style={{gridColumn:'1 / -1',padding:'32px 16px',textAlign:'center',background:T.card,borderRadius:11,border:`1px dashed ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:16,color:T.ink,marginBottom:4}}>No games for {pc} players</div>
            <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,lineHeight:1.5}}>Try a different group size, or add more games to your collection.</div>
          </div>
        )}
      </div>

      <Btn onClick={confirm} full disabled={picks.length!==picksPerPlayer}>
        {picks.length<picksPerPlayer
          ? `Choose ${picksPerPlayer-picks.length} more`
          : currentNominator < nominatorIndices.length - 1
            ? 'Confirm — pass to next player'
            : 'Confirm — reveal pool'}
      </Btn>
    </div>
  );
}

function NPool({ games, session, onUpdate }) {
  const poolGames=session.pool.map(id=>games.find(g=>g.id===id)).filter(Boolean);
  const pickerIndex = session.pickerIndex ?? session.players.length - 1;
  const nominatorIndices = session.nominatorIndices
    ?? session.players.map((_,i)=>i).filter(i => i !== pickerIndex);

  // Back behaviour: return to the last nominator so they can edit their picks
  function goBack() {
    onUpdate({
      ...session,
      phase: 'nominate',
      currentNominator: Math.max(0, nominatorIndices.length - 1),
    });
  }

  return (
    <div className="page-in">
      <BackBtn onBack={goBack} label="Back to nominations"/>
      <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:5}}>The Pool</h2>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:22,lineHeight:1.5}}>{poolGames.length} games nominated. Each eligible player gets one veto.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
        {poolGames.map(g=>(
          <div key={g.id} style={{background:T.card,borderRadius:12,overflow:'hidden',boxShadow:T.shadow}}>
            <GameImg game={g} height={90}/>
            <div style={{padding:'9px 12px 12px'}}>
              <div style={{fontFamily:T.serif,fontSize:14,fontWeight:700,color:T.ink,marginBottom:2}}>{g.name}</div>
              <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginBottom:6}}>{g.minPlayers}–{g.maxPlayers}p · {g.category}</div>
              <CxDots value={g.complexity} sz={7}/>
            </div>
          </div>
        ))}
      </div>
      <Btn onClick={()=>{
        const vetoerIndices = session.vetoerIndices ?? session.players.map((_,i)=>i);
        // If no one is set to veto, skip the veto round entirely
        if (vetoerIndices.length === 0) {
          onUpdate({...session, vetoes:{}, remaining: session.pool, phase:'pick', vetoerIndices});
        } else {
          onUpdate({...session, phase:'veto', currentVetoIndex:0, vetoes:{}, vetoerIndices});
        }
      }} full>Begin veto round</Btn>
      <div style={{textAlign:'center',marginTop:16}}>
        <button className="press" onClick={()=>{
          if (window.confirm('Cancel this night and lose all progress?')) onUpdate(null);
        }} style={{background:'none',border:'none',fontFamily:T.sans,fontSize:13,color:T.sub,cursor:'pointer'}}>Cancel night</button>
      </div>
    </div>
  );
}

function NVeto({ games, session, onUpdate }) {
  const { players, pool, vetoes } = session;
  const pickerIndex = session.pickerIndex ?? players.length - 1;
  // Backwards-compat: older sessions used currentVetoPlayer + everyone-vetoes assumption.
  // New sessions use currentVetoIndex into a vetoerIndices array.
  // Always filter out the picker as a safety check, even if old vetoerIndices has them.
  const rawVetoerIndices = session.vetoerIndices ?? players.map((_,i)=>i);
  const vetoerIndices = rawVetoerIndices.filter(i => i !== pickerIndex);
  const currentVetoIndex = session.currentVetoIndex ?? session.currentVetoPlayer ?? 0;
  const currentPlayerIndex = vetoerIndices[currentVetoIndex];
  const currentPlayerName = players[currentPlayerIndex];

  const [sel, setSel] = useState(null);
  // confirmAction: null | 'remove' | 'skip' — second tap confirms
  const [confirmAction, setConfirmAction] = useState(null);

  // If no vetoers configured, jump straight to pick
  useEffect(() => {
    if (vetoerIndices.length === 0) {
      onUpdate({ ...session, remaining: pool, phase: 'pick' });
    }
  }, []);

  // Reset confirm state when player changes
  useEffect(() => {
    setSel(null);
    setConfirmAction(null);
  }, [currentVetoIndex]);

  // vetoes stores only "removed game IDs" — skips have value null. Filter to actual removals.
  const removedGameIds = Object.values(vetoes).filter(v => v !== null && v !== undefined);
  const available = pool.filter(id => !removedGameIds.includes(id));
  const poolGames = available.map(id => games.find(g => g.id === id)).filter(Boolean);

  function commit(v) {
    // v is the gameId being removed, or null for skip
    const allV = { ...vetoes, [currentPlayerIndex]: v };
    const remaining = pool.filter(id => !Object.values(allV).filter(x => x !== null && x !== undefined).includes(id));
    const isLast = currentVetoIndex >= vetoerIndices.length - 1;
    if (isLast) {
      onUpdate({ ...session, vetoes: allV, remaining: remaining.length ? remaining : pool, phase: 'pick', vetoerIndices });
    } else {
      onUpdate({ ...session, vetoes: allV, currentVetoIndex: currentVetoIndex + 1, vetoerIndices });
    }
  }

  function requestRemove() {
    if (!sel) return;
    if (available.length <= 1) return;
    setConfirmAction('remove');
  }
  function requestSkip() {
    setConfirmAction('skip');
  }
  function confirmAction_finalise() {
    if (confirmAction === 'remove') commit(sel);
    if (confirmAction === 'skip') commit(null);
  }

  // Back behaviour: step back one vetoer (undoing their veto), or return to pool
  // on the first vetoer. Both branches need a confirm because vetoes are real progress.
  function goBack() {
    if (currentVetoIndex > 0) {
      // Undo the previous vetoer's veto and step back to them
      const prevIndex = vetoerIndices[currentVetoIndex - 1];
      const newVetoes = { ...vetoes };
      delete newVetoes[prevIndex];
      onUpdate({ ...session, currentVetoIndex: currentVetoIndex - 1, vetoes: newVetoes });
    } else {
      // First vetoer — go back to the pool screen
      onUpdate({ ...session, phase: 'pool', vetoes: {}, currentVetoIndex: 0 });
    }
  }
  const backLabel = currentVetoIndex > 0 ? 'Previous vetoer' : 'Back to pool';
  const backConfirm = currentVetoIndex > 0
    ? 'Undo previous veto?'
    : null;  // no real progress lost yet when returning to pool from first vetoer

  // If somehow we have no current player (e.g. stale session, picker got into the loop)
  if (!currentPlayerName) {
    return (
      <div className="page-in">
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,textAlign:'center',padding:'40px 16px'}}>
          Skipping veto phase…
        </p>
      </div>
    );
  }

  // Render confirm overlay if we're awaiting confirmation
  const showingConfirm = confirmAction !== null;
  const selectedGame = sel ? games.find(g => g.id === sel) : null;

  return (
    <div className="page-in">
      <BackBtn onBack={goBack} label={backLabel} confirm={backConfirm}/>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.danger,marginBottom:5}}>Veto phase · pass the phone</div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:14}}>
          {currentPlayerName}, your turn
        </h2>
        <Steps total={vetoerIndices.length} current={currentVetoIndex}/>
      </div>

      <div style={{
        background:T.amberBg, border:`1px solid ${T.amberBd}`, borderRadius:10,
        padding:'10px 14px', marginBottom:18,
        fontFamily:T.sans, fontSize:12, color:T.amber, lineHeight:1.5,
      }}>
        Hand the phone to <strong>{currentPlayerName}</strong>. Only they should tap below.
      </div>

      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:14,lineHeight:1.5}}>
        Pick a game to remove from the pool, or skip your veto.
      </p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
        {poolGames.map(g=>{
          const on=sel===g.id;
          return (
            <div key={g.id} className="card-press" onClick={()=>{ setSel(on?null:g.id); setConfirmAction(null); }} style={{background:on?T.dangerBg:T.card,border:`1.5px solid ${on?T.danger:T.border}`,borderRadius:12,overflow:'hidden',boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative'}}>
              <GameImg game={g} height={85}/>
              <div style={{padding:'8px 11px 11px'}}>
                <div style={{fontFamily:T.serif,fontSize:14,fontWeight:700,color:T.ink}}>{g.name}</div>
                <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:2}}>{g.minPlayers}–{g.maxPlayers}p</div>
              </div>
              {on&&<div style={{position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:T.danger,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
              </div>}
            </div>
          );
        })}
      </div>

      <div style={{display:'flex',gap:10}}>
        <Btn onClick={requestRemove} variant='danger' full disabled={!sel || available.length<=1}>
          {sel ? `Veto ${selectedGame?.name}` : 'Select a game to veto'}
        </Btn>
        <Btn onClick={requestSkip} variant='outline'>Skip my veto</Btn>
      </div>
      {available.length<=1 && sel && (
        <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,textAlign:'center',marginTop:10}}>
          Can't veto the last remaining game
        </div>
      )}

      {/* Confirmation overlay — addresses the "someone tapped through for me" bug.
          The veto isn't recorded until this is confirmed. */}
      {showingConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(6px)'}}
             onClick={()=>setConfirmAction(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:T.surface, borderRadius:16, padding:24, maxWidth:380, width:'100%',
            boxShadow:T.shadowMd, border:`1px solid ${T.border}`,
          }}>
            <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.danger,marginBottom:6}}>
              Confirm — {currentPlayerName} only
            </div>
            <h3 style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:12,lineHeight:1.2}}>
              {confirmAction === 'remove'
                ? `Veto ${selectedGame?.name}?`
                : `Skip ${currentPlayerName}'s veto?`}
            </h3>
            <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.55,marginBottom:18}}>
              {confirmAction === 'remove'
                ? 'This removes it from the pool. Make sure it\'s your turn before confirming.'
                : 'No game will be removed on your turn. Make sure it\'s your turn before confirming.'}
            </p>
            <div style={{display:'flex',gap:10}}>
              <Btn onClick={confirmAction_finalise} variant={confirmAction==='remove' ? 'danger' : 'amber'} full>
                {confirmAction === 'remove' ? 'Yes, veto it' : 'Yes, skip'}
              </Btn>
              <Btn onClick={()=>setConfirmAction(null)} variant='ghost'>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NPick({ games, session, onUpdate }) {
  const {players,remaining}=session;
  // New sessions store pickerIndex; legacy ones fall back to "last player"
  const pickerIndex = session.pickerIndex ?? players.length - 1;
  const picker = players[pickerIndex];
  const [sel,setSel]=useState(null);
  const remainGames=remaining.map(id=>games.find(g=>g.id===id)).filter(Boolean);

  // Back behaviour: depends on what came before.
  // If there were vetoers, return to the last veto step.
  // If no vetoes happened (vetoerIndices empty or this session jumped from pool→pick),
  // go back to the pool screen.
  const vetoerIndices = session.vetoerIndices ?? [];
  function goBack() {
    if (vetoerIndices.length > 0) {
      // Return to the last vetoer and undo their veto so they can redo
      const lastIdx = vetoerIndices.length - 1;
      const lastPlayerIdx = vetoerIndices[lastIdx];
      const newVetoes = { ...(session.vetoes || {}) };
      delete newVetoes[lastPlayerIdx];
      onUpdate({ ...session, phase:'veto', currentVetoIndex:lastIdx, vetoes:newVetoes });
    } else {
      onUpdate({ ...session, phase:'pool' });
    }
  }

  return (
    <div className="page-in">
      <BackBtn
        onBack={goBack}
        label={vetoerIndices.length > 0 ? 'Back to veto' : 'Back to pool'}
        confirm="Going back will let you redo the last step. Continue?"
      />
      <div style={{marginBottom:22}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:5}}>Final pick</div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink}}>{picker}</h2>
      </div>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.ink,marginBottom:20,lineHeight:1.55}}>
        Choose the final game from the remaining list. {remainGames.length} {remainGames.length===1?'game remains':'games remain'} after vetoes.
      </p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
        {remainGames.map(g=>{
          const on=sel===g.id;
          return (
            <div key={g.id} className="card-press" onClick={()=>setSel(on?null:g.id)} style={{background:on?T.amberBg:T.card,border:`1.5px solid ${on?T.amber:T.border}`,borderRadius:13,overflow:'hidden',boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative',transform:on?'scale(1.02)':'none'}}>
              <GameImg game={g} height={115}/>
              <div style={{padding:'11px 12px 13px'}}>
                <div style={{fontFamily:T.serif,fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>{g.name}</div>
                <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginBottom:7}}>{g.minPlayers}–{g.maxPlayers}p · {g.category}</div>
                <CxDots value={g.complexity}/>
              </div>
              {on&&<div style={{position:'absolute',top:10,right:10,width:22,height:22,borderRadius:'50%',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:9,height:9,borderRadius:'50%',background:'#FFFFFF'}}/></div>}
            </div>
          );
        })}
      </div>
      <Btn onClick={()=>onUpdate({...session,chosenGame:sel,phase:'playing',scores:{}})} full disabled={!sel}>
        {sel?`Play ${games.find(g=>g.id===sel)?.name}`:'Select a game'}
      </Btn>
    </div>
  );
}

function NPlaying({ games, session, onUpdate, onFinish }) {
  const {players,chosenGame,scores:saved={}}=session;
  const game=games.find(g=>g.id===chosenGame);
  const [scores,setScores]=useState(saved);
  const [rsc,setRsc]=useState({});
  const [rulesOpen,setRulesOpen]=useState(false);

  const totals={};
  players.forEach(p=>{ totals[p]=(scores[p]||[]).reduce((a,b)=>a+b,0); });
  const sorted=[...players].sort((a,b)=>totals[b]-totals[a]);
  const roundsDone=Math.max(0,...Object.values(scores).map(a=>a?.length||0));

  function addRound(){
    const ns={...scores};
    players.forEach(p=>{ if(!ns[p])ns[p]=[]; ns[p]=[...ns[p],Number(rsc[p]||0)]; });
    setScores(ns); onUpdate({...session,scores:ns}); setRsc({});
  }

  if(!game) return null;

  // Back behaviour: return to the final pick step. Discards any unsaved scores.
  function goBack() {
    onUpdate({ ...session, phase:'pick', chosenGame:null, scores:{} });
  }

  return (
    <div className="page-in">
      <BackBtn
        onBack={goBack}
        label="Back to pick"
        confirm={Object.values(scores).some(a => a && a.length > 0)
          ? 'Discard the current scores and pick a different game?'
          : 'Pick a different game?'}
      />
      <div style={{borderRadius:14,overflow:'hidden',marginBottom:18,boxShadow:T.shadowMd}}>
        <GameImg game={game} height={165}/>
        <div style={{background:T.card,padding:'14px 16px'}}>
          <h2 style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.ink,marginBottom:3}}>{game.name}</h2>
          <div style={{fontFamily:T.sans,fontSize:12,color:T.sub}}>{game.category} · {roundsDone} {roundsDone===1?'round':'rounds'} complete</div>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:12,boxShadow:T.shadow}}>
        <div style={{padding:'14px 16px 12px'}}><div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub}}>Scoreboard</div></div>
        <Hr/>
        {sorted.map((p,r)=>(
          <div key={p}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px'}}>
              <div style={{width:22,fontFamily:T.sans,fontSize:12,fontWeight:600,color:r===0?T.amber:T.sub,textAlign:'center'}}>{r+1}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.sans,fontSize:15,color:T.ink,fontWeight:r===0?600:400}}>{p}</div>
                {(scores[p]||[]).length>0&&<div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:1}}>{(scores[p]||[]).join(' + ')}</div>}
              </div>
              <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:r===0?T.amber:T.ink}}>{totals[p]}</div>
            </div>
            {r<sorted.length-1&&<Hr/>}
          </div>
        ))}
      </div>

      {/* Round entry — ScoreRow is a proper component, no hooks-in-map */}
      <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:12,boxShadow:T.shadow}}>
        <div style={{padding:'14px 16px 12px'}}><div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub}}>Round {roundsDone+1}</div></div>
        <Hr/>
        {players.map((p,i)=>(
          <ScoreRow key={p} name={p} value={rsc[p]} onChange={v=>setRsc(s=>({...s,[p]:v}))} isLast={i===players.length-1}/>
        ))}
        <div style={{padding:'12px 16px 16px'}}><Btn onClick={addRound} full size='sm'>Add round</Btn></div>
      </div>

      {game.rules&&(
        <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:20,boxShadow:T.shadow}}>
          <button className="press" onClick={()=>setRulesOpen(!rulesOpen)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',background:'none',border:'none',padding:'14px 16px',cursor:'pointer',fontFamily:T.sans,fontSize:14,fontWeight:500,color:T.ink}}>
            <span>How to play</span>
            <svg style={{transition:'transform 0.22s',transform:rulesOpen?'rotate(180deg)':'none',flexShrink:0}} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round"><polyline points="2,5 7,10 12,5"/></svg>
          </button>
          {rulesOpen&&<><Hr/><div style={{padding:'14px 16px 18px',fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.75,whiteSpace:'pre-wrap'}}>{game.rules}</div></>}
        </div>
      )}

      <Btn onClick={()=>{
        // Save to history only if any scores were recorded
        const anyScores = Object.values(scores).some(arr => arr && arr.length > 0);
        if(anyScores) {
          // Picker name comes from the players array (always names in local sessions).
          // Picker ID is only present for sessions that came from a remote source —
          // see NSessionActive where playerIds is layered onto the localSession.
          const pickerIndex = session.pickerIndex;
          const finalPickerName = (pickerIndex !== undefined && players[pickerIndex])
            ? players[pickerIndex]
            : null;
          const finalPickerId = (pickerIndex !== undefined && session.playerIds?.[pickerIndex])
            ? session.playerIds[pickerIndex]
            : null;

          // Compute the winner from totals (highest score wins by default).
          // Stored explicitly so future stats don't have to re-derive (and so games
          // where low-score-wins can be handled later via a per-game override).
          let winner = null;
          let maxScore = -Infinity;
          for (const p of players) {
            const t = totals[p];
            if (typeof t === 'number' && t > maxScore) {
              maxScore = t;
              winner = p;
            }
          }

          // Extract which games were vetoed during the night. Includes both
          // in-person and remote vetoes — both end up in session.vetoes
          // (keyed by player index, value is gameId or null for skip).
          const vetoedGameIds = Object.values(session.vetoes || {})
            .filter(gid => gid !== null && gid !== undefined);

          onFinish({
            id: uid(),
            finishedAt: Date.now(),
            completedAt: Date.now(),
            gameId: game.id,
            gameName: game.name,
            pickedGameId: game.id,
            pickedGameName: game.name,
            players: [...players],
            scores: {...scores},
            totals: {...totals},
            winner,                                     // explicit winner name (null if no scores)
            vetoedGameIds,                              // games knocked out during this night
            finalPickerName,
            finalPickerId,                              // populated when picker came from a remote session
            sessionId: session.sourceSessionId || null, // remote-session ID if applicable
          });
        } else {
          onUpdate(null);
        }
      }} variant='outline' full>End night</Btn>
    </div>
  );
}

// ── Scores Tab ────────────────────────────────────────────────────────────────
function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ystrd = new Date(today); ystrd.setDate(today.getDate()-1);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if(day.getTime()===today.getTime()) return `Today · ${d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`;
  if(day.getTime()===ystrd.getTime()) return `Yesterday · ${d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`;
  return d.toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'});
}

// Compact relative time — "just now", "5m", "2h", "3d", "Apr 8"
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 30 * 1000) return 'just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString([], {month:'short', day:'numeric'});
}

function ScoreList({ players, totals, sorted }) {
  return (
    <div style={{background:T.card,borderRadius:14,overflow:'hidden',boxShadow:T.shadow}}>
      {sorted.map((p,r)=>(
        <div key={p}>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px'}}>
            <div style={{width:22,fontFamily:T.sans,fontSize:12,fontWeight:600,color:r===0?T.amber:T.sub,textAlign:'center'}}>{r+1}</div>
            <div style={{fontFamily:T.sans,fontSize:15,color:T.ink,fontWeight:r===0?600:400,flex:1}}>{p}</div>
            <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:r===0?T.amber:T.ink}}>{totals[p]||0}</div>
          </div>
          {r<sorted.length-1&&<Hr/>}
        </div>
      ))}
    </div>
  );
}

function HistoryCard({ entry, games, onDelete }) {
  const [open, setOpen] = useState(false);
  const game = games.find(g => g.id === entry.gameId);
  const sorted = [...entry.players].sort((a,b)=>(entry.totals[b]||0)-(entry.totals[a]||0));
  const winner = sorted[0];
  const winScore = entry.totals[winner];
  const hasScores = Object.values(entry.scores||{}).some(a=>a&&a.length>0);

  return (
    <div style={{background:T.card,borderRadius:14,overflow:'hidden',boxShadow:T.shadow,marginBottom:10}}>
      <button className="press" onClick={()=>setOpen(!open)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
        <div style={{width:44,height:44,borderRadius:10,overflow:'hidden',flexShrink:0}}>
          {game ? <GameImg game={game} height={44}/> : <div style={{width:44,height:44,background:T.bg}}/>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:T.serif,fontSize:16,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.gameName}</div>
          <div style={{fontFamily:T.sans,fontSize:11,color:T.sub}}>{formatDate(entry.finishedAt)}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontFamily:T.sans,fontSize:10,color:T.sub,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:1}}>Winner</div>
          <div style={{fontFamily:T.sans,fontSize:13,color:T.amber,fontWeight:600}}>{winner}{hasScores?` · ${winScore}`:''}</div>
        </div>
        <svg style={{transition:'transform 0.22s',transform:open?'rotate(180deg)':'none',flexShrink:0,marginLeft:4}} width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={T.sub} strokeWidth="1.8" strokeLinecap="round"><polyline points="2,5 7,10 12,5"/></svg>
      </button>
      {open&&(
        <>
          <Hr/>
          <div style={{padding:'12px 16px 14px'}}>
            {sorted.map((p,r)=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:r<sorted.length-1?`1px solid ${T.border}`:'none'}}>
                <div style={{width:18,fontFamily:T.sans,fontSize:11,fontWeight:600,color:r===0?T.amber:T.sub,textAlign:'center'}}>{r+1}</div>
                <div style={{flex:1,fontFamily:T.sans,fontSize:14,color:T.ink,fontWeight:r===0?600:400}}>{p}</div>
                <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:r===0?T.amber:T.ink}}>{entry.totals[p]||0}</div>
              </div>
            ))}
            <button className="press" onClick={()=>onDelete(entry.id)} style={{marginTop:12,background:'none',border:'none',fontFamily:T.sans,fontSize:12,color:T.sub,cursor:'pointer',padding:'4px 0'}}>Remove from history</button>
          </div>
        </>
      )}
    </div>
  );
}

function ScoresTab({ session, history, onDeleteEntry, games }) {
  const hasLive = session?.phase === 'playing';
  const hasHistory = history && history.length > 0;

  if(!hasLive && !hasHistory) {
    return (
      <div className="page-in">
        <h1 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:22}}>Scores</h1>
        <div style={{background:T.card,borderRadius:14,padding:'52px 24px',boxShadow:T.shadow,textAlign:'center'}}>
          <div style={{fontFamily:T.serif,fontSize:18,color:T.sub,marginBottom:6}}>No games yet</div>
          <div style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.6}}>Start a game night to track scores.</div>
        </div>
      </div>
    );
  }

  // Prepare live data
  let liveSorted, liveTotals;
  if(hasLive) {
    const {players, scores:saved={}} = session;
    liveTotals = {};
    players.forEach(p => { liveTotals[p] = (saved[p]||[]).reduce((a,b)=>a+b, 0); });
    liveSorted = [...players].sort((a,b)=>liveTotals[b]-liveTotals[a]);
  }

  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:22}}>Scores</h1>

      {hasLive && (
        <div style={{marginBottom:26}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:T.amber}}/>
            <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub}}>Live · {session.chosenGame && games.find(g=>g.id===session.chosenGame)?.name}</div>
          </div>
          <ScoreList players={session.players} totals={liveTotals} sorted={liveSorted}/>
          <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:10,lineHeight:1.5}}>In progress — add rounds under Tonight.</p>
        </div>
      )}

      {hasHistory && (
        <div>
          <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:10}}>
            History · {history.length} {history.length===1?'game':'games'}
          </div>
          {history.map(entry => (
            <HistoryCard key={entry.id} entry={entry} games={games} onDelete={onDeleteEntry}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BGG sync helpers ──────────────────────────────────────────────────────────
// Map BGG's 1-5 weight (decimal) to our 1-5 complexity buckets.
function weightToComplexity(w) {
  if (!w) return 2;
  if (w < 1.5) return 1;
  if (w < 2.5) return 2;
  if (w < 3.5) return 3;
  if (w < 4.2) return 4;
  return 5;
}

// Pick the most recognisable category from BGG's many tags.
function pickCategory(cats = []) {
  if (!cats || !cats.length) return 'Other';
  const lc = cats.map(c => c.toLowerCase());
  // Prefer mapping BGG categories onto our existing buckets
  if (lc.some(c => c.includes('party'))) return 'Party';
  if (lc.some(c => c.includes('word'))) return 'Word';
  if (lc.some(c => c.includes('abstract'))) return 'Abstract';
  if (lc.some(c => c.includes('deduction'))) return 'Deduction';
  if (lc.some(c => c.includes('dice'))) return 'Dice';
  if (lc.some(c => c.includes('card'))) return 'Card';
  if (lc.some(c => c.includes('co-op') || c.includes('cooperative'))) return 'Co-op';
  if (lc.some(c => c.includes('economic') || c.includes('strategy'))) return 'Strategy';
  return 'Strategy';
}

// Convert a BGG collection item + thing details into one of our game records.
function bggToGame(coll, thing) {
  const id = `bgg-${coll.id}`;
  const minP = thing?.minPlayers || coll.minPlayers || 1;
  const maxP = thing?.maxPlayers || coll.maxPlayers || 4;
  const weight = thing?.weight;
  return {
    id,
    bggId: coll.id,
    name: coll.name,
    minPlayers: minP,
    maxPlayers: maxP,
    complexity: weightToComplexity(weight),
    category: pickCategory(thing?.categories),
    image: coll.image || coll.thumbnail || thing?.image || '',
    description: thing?.description?.replace(/&[a-z]+;/g, ' ').slice(0, 220) || '',
    rules: '',
    bgg: {
      year: coll.year,
      weight: weight || null,
      bggRating: thing?.bggRating || coll.bggRating || null,
      myRating: coll.myRating || null,
      myPlays: coll.myPlays || 0,
      categories: thing?.categories || [],
      mechanics: thing?.mechanics || [],
      playingTime: thing?.playingTime || coll.playingTime || null,
    },
  };
}

// Hit the proxy, automatically retrying on 202 (BGG still preparing data).
// Shows progress so the user knows we're waiting on BGG, not stuck.
async function fetchWithRetry(url, onProgress, maxAttempts = 8, delayMs = 4000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      throw new Error('Network error — check your connection.');
    }
    if (res.status !== 202) return res;
    // BGG still preparing — wait and try again
    onProgress?.(`BGG is preparing your collection… (${attempt}/${maxAttempts})`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('BGG took too long to respond. Try again in a minute — large collections take longer to prepare on their side.');
}

async function syncBggUser(username, onProgress) {
  if (!username || !username.trim()) throw new Error('Enter a BGG username');
  const u = username.trim();
  onProgress?.('Fetching collection…');

  const collRes = await fetchWithRetry(
    `/api/bgg?type=collection&user=${encodeURIComponent(u)}&refresh=1`,
    onProgress
  );

  if (collRes.status === 401 || collRes.status === 403) {
    throw new Error(
      `Access denied (HTTP ${collRes.status}). If this is a Netlify gate, ` +
      `check Site configuration → Visitor access. ` +
      `If BGG, your collection may be set to private — go to BGG → Account → Privacy.`
    );
  }
  if (collRes.status === 404) {
    throw new Error('BGG proxy not found at /api/bgg. Make sure the function deployed (Netlify → Functions tab).');
  }
  if (!collRes.ok) {
    let msg = `Request failed (HTTP ${collRes.status})`;
    try {
      const j = await collRes.json();
      if (j.error) msg = `BGG: ${j.error}`;
    } catch {
      msg = `Server returned HTTP ${collRes.status}.`;
    }
    throw new Error(msg);
  }

  const coll = await collRes.json();
  if (coll.error) throw new Error(coll.error);
  if (!Array.isArray(coll)) throw new Error('Unexpected response from BGG proxy.');
  if (coll.length === 0) throw new Error(`No owned games found for "${u}". Check the username spelling, and make sure your BGG collection is set to public.`);

  // Fetch thing details in batches of 20 (URL length safety)
  const ids = coll.map(c => c.id);
  const things = {};
  const batchSize = 20;
  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    onProgress?.(`Fetching details… ${Math.min(i + batchSize, ids.length)}/${ids.length}`);
    try {
      const tr = await fetchWithRetry(`/api/bgg?type=thing&ids=${slice.join(',')}`, onProgress);
      if (tr.ok) {
        const td = await tr.json();
        if (td && !td.error) Object.assign(things, td);
      }
    } catch {
      // Detail fetch failures are non-fatal — base collection data still works
    }
  }
  onProgress?.('Done');
  return coll.map(c => bggToGame(c, things[c.id]));
}

// ── Profile (BGG sync) sheet ──────────────────────────────────────────────────
// ── Backup Sheet (cloud sync via code) ───────────────────────────────────────
function BackupSheet({ code, syncedAt, status, onClose, onCreate, onRestore, onDisconnect }) {
  const [mode, setMode] = useState(code ? 'connected' : 'home'); // 'home' | 'show-new' | 'restore' | 'connected'
  const [generatedCode, setGeneratedCode] = useState(null);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCreate() {
    const newCode = generateBackupCode();
    setGeneratedCode(newCode);
    setMode('show-new');
  }

  async function confirmCreate() {
    await onCreate(generatedCode);
    setMode('connected');
  }

  async function handleRestore() {
    setRestoreError(null);
    if (!restoreInput.trim()) return;
    setRestoring(true);
    try {
      await onRestore(restoreInput);
      setMode('connected');
    } catch (e) {
      setRestoreError(e.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  function copyCode() {
    const c = generatedCode || code;
    navigator.clipboard.writeText(prettyBackupCode(c)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:400,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div className="sheet-in" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,margin:'0 auto',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 -12px 48px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}><div style={{width:36,height:4,borderRadius:2,background:T.border}}/></div>
        <div style={{padding:'18px 22px 36px'}}>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
            <div>
              <h2 style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1.05,marginBottom:4}}>Cloud backup</h2>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Save your library and scores to the cloud</div>
            </div>
            <button className="press" onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.faint,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.sub,flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          {/* HOME — no backup yet */}
          {mode === 'home' && (
            <>
              <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6,marginBottom:22}}>
                Get a backup code to safely keep your library, scores, and BGG profile in the cloud. Use the code on a new phone to restore everything.
              </p>
              <Btn onClick={handleCreate} variant='amber' full>Create new backup code</Btn>
              <div style={{textAlign:'center',margin:'18px 0',fontFamily:T.sans,fontSize:12,color:T.sub,letterSpacing:'0.08em',textTransform:'uppercase'}}>or</div>
              <Btn onClick={()=>setMode('restore')} variant='outline' full>I already have a code — restore</Btn>
              <p style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:24,lineHeight:1.6,opacity:0.8,textAlign:'center'}}>
                Anyone with your code can read or overwrite your backup. Keep it private.
              </p>
            </>
          )}

          {/* SHOW NEW CODE */}
          {mode === 'show-new' && generatedCode && (
            <>
              <Lbl>Your new backup code</Lbl>
              <div style={{
                background:T.card, borderRadius:14, padding:'24px 20px', marginBottom:14,
                textAlign:'center', boxShadow:T.shadow,
                border:`1.5px solid ${T.amberBd}`,
              }}>
                <div style={{
                  fontFamily:'monospace', fontSize:22, fontWeight:700, letterSpacing:'0.1em',
                  color:T.amber, lineHeight:1.4,
                }}>
                  {prettyBackupCode(generatedCode)}
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginBottom:18}}>
                <Btn onClick={copyCode} variant='outline' full>{copied ? 'Copied' : 'Copy code'}</Btn>
              </div>
              <div style={{background:T.dangerBg,borderRadius:10,padding:'12px 14px',marginBottom:18,fontFamily:T.sans,fontSize:13,color:T.danger,lineHeight:1.55,border:`1px solid ${T.dangerBd}`}}>
                <strong style={{display:'block',marginBottom:4}}>Save this code somewhere safe.</strong>
                There is no way to recover it if you lose it. Anyone with this code has full access to your backup.
              </div>
              <Btn onClick={confirmCreate} variant='amber' full>I've saved it — start syncing</Btn>
            </>
          )}

          {/* RESTORE */}
          {mode === 'restore' && (
            <>
              <Lbl>Enter your backup code</Lbl>
              <input
                value={restoreInput}
                onChange={e => setRestoreInput(e.target.value)}
                placeholder="BLUE-WOLF-RIVER-87"
                autoCapitalize="characters"
                spellCheck={false}
                style={{...IS, fontFamily:'monospace', letterSpacing:'0.05em', textTransform:'uppercase'}}
              />
              <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:8,marginBottom:16,lineHeight:1.55}}>
                Restoring overwrites whatever's on this device.
              </p>
              {restoreError && (
                <div style={{background:T.dangerBg,borderRadius:10,padding:'11px 14px',marginBottom:14,fontFamily:T.sans,fontSize:13,color:T.danger,lineHeight:1.5}}>
                  {restoreError}
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <Btn onClick={handleRestore} variant='amber' full disabled={!restoreInput.trim() || restoring}>
                  {restoring ? 'Restoring…' : 'Restore'}
                </Btn>
                <Btn onClick={()=>setMode('home')} variant='ghost'>Back</Btn>
              </div>
            </>
          )}

          {/* CONNECTED */}
          {mode === 'connected' && code && (
            <>
              <div style={{background:T.card,borderRadius:12,padding:'16px 18px',marginBottom:18,boxShadow:T.shadow}}>
                <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:8}}>Backup code</div>
                <div style={{fontFamily:'monospace',fontSize:18,fontWeight:700,letterSpacing:'0.08em',color:T.ink,marginBottom:8}}>{prettyBackupCode(code)}</div>
                <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,display:'flex',alignItems:'center',gap:6}}>
                  {status === 'syncing' && <><span style={{width:6,height:6,borderRadius:'50%',background:T.amber,animation:'pulse 1.5s ease-in-out infinite'}}/>Syncing…</>}
                  {status === 'idle' && syncedAt && <><span style={{width:6,height:6,borderRadius:'50%',background:'#5DCE8A'}}/>Synced {timeAgo(syncedAt)}</>}
                  {status === 'idle' && !syncedAt && <>Waiting for first sync…</>}
                  {status === 'error' && <span style={{color:T.danger}}>Sync failed — will retry</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginBottom:14}}>
                <Btn onClick={copyCode} variant='outline' full>{copied ? 'Copied' : 'Copy code'}</Btn>
              </div>
              <p style={{fontFamily:T.sans,fontSize:12,color:T.sub,lineHeight:1.6,marginBottom:18}}>
                Your library, scores, and profile sync automatically a few seconds after each change. Use this code on another device to restore.
              </p>
              <Btn onClick={onDisconnect} variant='dangerOutline' full>Disconnect from cloud</Btn>
              <p style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:12,lineHeight:1.55,opacity:0.8,textAlign:'center'}}>
                Disconnecting stops syncing on this device. Your cloud backup stays put — restore with the code anytime.
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function ProfileSheet({ profile, onClose, onSync, onDisconnect, syncStatus, syncError }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [foc, setFoc] = useState(false);
  const busy = syncStatus && !syncStatus.startsWith('Done') && !syncStatus.startsWith('Error');

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:400,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div className="sheet-in" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,margin:'0 auto',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 -12px 48px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}><div style={{width:36,height:4,borderRadius:2,background:T.border}}/></div>
        <div style={{padding:'18px 22px 36px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
            <div>
              <h2 style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1.05,marginBottom:4}}>Profile</h2>
              <div style={{fontFamily:T.sans,fontSize:13,color:T.sub}}>Sync your BoardGameGeek collection</div>
            </div>
            <button className="press" onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.faint,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.sub,flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          {profile?.username && (
            <div style={{background:T.card,borderRadius:12,padding:'14px 16px',marginBottom:18,boxShadow:T.shadow}}>
              <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:6}}>Connected as</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                <div>
                  <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{profile.username}</div>
                  {profile.gameCount != null && <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:2}}>{profile.gameCount} games · synced {new Date(profile.syncedAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div>}
                </div>
              </div>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <Lbl>BGG Username</Lbl>
            <input
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="your-bgg-username"
              autoCapitalize="none" autoCorrect="off" spellCheck="false"
              onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
              style={{...IS, border:`1.5px solid ${foc?T.amber:T.border}`}}
            />
            <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginTop:7,lineHeight:1.5}}>
              Your BGG collection must be public. We fetch your owned games, ratings, and play counts.
            </div>
          </div>

          {syncStatus && !syncError && (
            <div style={{background:T.amberBg,borderRadius:10,padding:'11px 14px',marginBottom:14,fontFamily:T.sans,fontSize:13,color:T.amber,display:'flex',alignItems:'center',gap:10}}>
              {busy && <div style={{width:14,height:14,border:`2px solid ${T.amberBd}`,borderTopColor:T.amber,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
              <span>{syncStatus}</span>
            </div>
          )}
          {syncError && (
            <div style={{background:T.dangerBg,borderRadius:10,padding:'11px 14px',marginBottom:14,fontFamily:T.sans,fontSize:13,color:T.danger,lineHeight:1.5}}>
              {syncError}
            </div>
          )}

          <div style={{display:'flex',gap:10,marginBottom:profile?.username?14:0}}>
            <Btn onClick={()=>onSync(username)} variant='primary' full disabled={busy || !username.trim()}>
              {profile?.username ? 'Resync' : 'Connect & Sync'}
            </Btn>
          </div>

          {profile?.username && (
            <Btn onClick={onDisconnect} variant='dangerOutline' full disabled={busy}>
              Disconnect
            </Btn>
          )}

          <div style={{marginTop:22,fontFamily:T.sans,fontSize:11,color:T.sub,lineHeight:1.6,textAlign:'center'}}>
            BGG has no real login system — anyone can read public collections by username.
            Disconnecting clears your library.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sessions API client ──────────────────────────────────────────────────────
const SessionApi = {
  async create({ games, players, format }) {
    // Strip down games to just what we need (don't ship full BGG payload over the wire)
    const slim = games.map(g => ({
      id: g.id,
      name: g.name,
      image: g.image || '',
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      complexity: g.complexity,
      category: g.category,
    }));
    const r = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games: slim, players, format }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async getMeta(sessionId) {
    const r = await fetch(`/api/sessions/${sessionId}/meta`);
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async getResults(sessionId, ownerKey) {
    const r = await fetch(`/api/sessions/${sessionId}/results`, {
      headers: { 'x-owner-key': ownerKey },
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async vote(sessionId, playerId, picks) {
    const r = await fetch(`/api/sessions/${sessionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, picks }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  // Veto submission (remote mode only) — gameId may be null to mean "skip"
  async veto(sessionId, playerId, gameId) {
    const r = await fetch(`/api/sessions/${sessionId}/veto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, gameId: gameId ?? null }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  // Owner-only: transition phase ('veto' | 'review' | 'nominate' | 'complete')
  async setPhase(sessionId, ownerKey, phase) {
    const r = await fetch(`/api/sessions/${sessionId}/phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
      body: JSON.stringify({ phase }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  // Owner-only: nominate on behalf of a player (host override)
  async hostVote(sessionId, ownerKey, playerId, picks) {
    const r = await fetch(`/api/sessions/${sessionId}/host-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
      body: JSON.stringify({ playerId, picks }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  // Owner-only: veto on behalf of a player (host override)
  async hostVeto(sessionId, ownerKey, playerId, gameId) {
    const r = await fetch(`/api/sessions/${sessionId}/host-veto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
      body: JSON.stringify({ playerId, gameId: gameId ?? null }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  // Public: the final picker submits their game choice from their own device
  async submitFinalPick(sessionId, playerId, gameId) {
    const r = await fetch(`/api/sessions/${sessionId}/final-pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, gameId }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async complete(sessionId, ownerKey) {
    const r = await fetch(`/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'x-owner-key': ownerKey },
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async destroy(sessionId, ownerKey) {
    const r = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey },
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
};

// ── Backup (cloud sync via memorable code) ───────────────────────────────────
// Word lists are short, common, easy to type. ~14 bits per word × 3 words + 7 bits
// from the number gives ~49 bits of effective entropy — plenty for personal data
// where the threat model is "random scanning by strangers," not targeted attack.
const BACKUP_WORDS_A = ['BLUE','RED','GOLD','GREEN','GREY','BLACK','WHITE','PINK','TEAL','CORAL','RUST','SAGE','PLUM','MINT','OCEAN','AMBER'];
const BACKUP_WORDS_B = ['WOLF','BEAR','HAWK','LION','OWL','FOX','DEER','ORCA','LYNX','EAGLE','SHARK','RAVEN','OTTER','MOTH','CRAB','HARE'];
const BACKUP_WORDS_C = ['RIVER','PEAK','CLIFF','GLADE','REEF','MESA','BAY','RIDGE','VALE','MARSH','DELTA','FORD','SPRING','MEADOW','GROVE','BROOK'];

function generateBackupCode() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const num = String(Math.floor(Math.random() * 90) + 10); // 10-99
  return `${pick(BACKUP_WORDS_A)}-${pick(BACKUP_WORDS_B)}-${pick(BACKUP_WORDS_C)}-${num}`;
}

// Strip dashes/spaces and uppercase for transport. Server normalizes the same way.
function normalizeBackupCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Format with dashes for display, e.g. "BLUEWOLFRIVER87" → "BLUE-WOLF-RIVER-87"
function prettyBackupCode(raw) {
  const n = normalizeBackupCode(raw);
  // Try to find the digit suffix and rebuild
  const m = n.match(/^([A-Z]+)([A-Z]+)([A-Z]+)(\d+)$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}-${m[4]}`;
  return n;
}

const BackupApi = {
  async save(code, data) {
    const r = await fetch(`/api/backup/${normalizeBackupCode(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        device: navigator.userAgent.slice(0, 64),
      }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
  async fetch(code) {
    const r = await fetch(`/api/backup/${normalizeBackupCode(code)}`);
    if (r.status === 404) return null; // No backup yet — not an error
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  },
};

// Detect /vote/:sessionId route. Must run before main App renders.
function getViewerSessionId() {
  const m = window.location.pathname.match(/^\/vote\/([a-z0-9]{4,})\/?$/i);
  return m ? m[1] : null;
}

// Generate stable random IDs (client-side; sessions function generates IDs server-side too)
function randomPlayerId() {
  return 'p' + Math.random().toString(36).slice(2, 9);
}

// ── Viewer Route ─────────────────────────────────────────────────────────────
function ViewerApp({ sessionId }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [chosenPlayerId, setChosenPlayerId] = useState(null);
  const [picks, setPicks] = useState([]);
  // For veto stage: which game we've selected to remove (null = none yet)
  const [vetoSel, setVetoSel] = useState(null);
  // For final-pick stage (picker only): which game they've selected to play
  const [finalPickSel, setFinalPickSel] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [vetoSubmitted, setVetoSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFoc, setSearchFoc] = useState(false);

  // Load meta on mount, then poll every 8s to detect phase changes.
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    async function load() {
      try {
        const m = await SessionApi.getMeta(sessionId);
        if (cancelled) return;
        setMeta(m);
        setError(null);

        // Restore chosen player from localStorage
        const remembered = localStorage.getItem(`viewer-player-${sessionId}`);
        if (remembered && m.players.some(p => p.id === remembered)) {
          if (chosenPlayerId !== remembered) setChosenPlayerId(remembered);
          // Update local "submitted" flags based on server state
          if (m.nominatedPlayerIds?.includes(remembered)) setSubmitted(true);
          if (m.vetoedPlayerIds?.includes(remembered)) setVetoSubmitted(true);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) timer = setTimeout(load, 3000);
    }
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId, chosenPlayerId]);

  function chooseAs(playerId) {
    setChosenPlayerId(playerId);
    localStorage.setItem(`viewer-player-${sessionId}`, playerId);
    if (meta?.nominatedPlayerIds?.includes(playerId)) setSubmitted(true);
    if (meta?.vetoedPlayerIds?.includes(playerId)) setVetoSubmitted(true);
  }

  const picksPerPlayer = meta?.format?.picksPerPlayer || 3;

  function togglePick(gameId) {
    setPicks(prev => {
      if (prev.includes(gameId)) return prev.filter(x => x !== gameId);
      if (prev.length >= picksPerPlayer) return prev;
      return [...prev, gameId];
    });
  }

  async function submitNominate() {
    if (picks.length !== picksPerPlayer || !chosenPlayerId) return;
    setSubmitting(true);
    try {
      await SessionApi.vote(sessionId, chosenPlayerId, picks);
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVeto(gameId) {
    if (!chosenPlayerId) return;
    setSubmitting(true);
    try {
      await SessionApi.veto(sessionId, chosenPlayerId, gameId);
      setVetoSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFinalPick() {
    if (!finalPickSel || !chosenPlayerId) return;
    setSubmitting(true);
    try {
      await SessionApi.submitFinalPick(sessionId, chosenPlayerId, finalPickSel);
      // The host will see our pick land on the next poll and move us forward.
      // We don't set any local "submitted" state — the meta.finalPickedGameId
      // arriving on the next poll is what flips us into the thank-you screen.
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────
  if (error && !meta) {
    return (
      <ViewerShell>
        <h2 style={{fontFamily:T.serif,fontSize:24,color:T.danger,marginBottom:8}}>Can't load session</h2>
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>{error}</p>
      </ViewerShell>
    );
  }

  if (!meta) {
    return (
      <ViewerShell>
        <div style={{textAlign:'center',padding:'60px 0',fontFamily:T.serif,fontSize:18,color:T.sub}}>Loading…</div>
      </ViewerShell>
    );
  }

  if (meta.readOnly) {
    return (
      <ViewerShell>
        <h2 style={{fontFamily:T.serif,fontSize:24,color:T.ink,marginBottom:8}}>Voting closed</h2>
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>This session is no longer accepting votes.</p>
      </ViewerShell>
    );
  }

  // ── Step 1: choose who you are ──────────────────────────────────────────
  if (!chosenPlayerId) {
    return (
      <ViewerShell title="Game Night Voting">
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:22,lineHeight:1.6}}>
          Tap your name to continue.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {meta.players.map(p => {
            const nominated = meta.nominatedPlayerIds?.includes(p.id);
            const vetoed = meta.vetoedPlayerIds?.includes(p.id);
            const isPicker = p.id === meta.format?.pickerId;
            const done = nominated && (meta.phase !== 'veto' || vetoed || !meta.format?.vetoerIds?.includes(p.id));
            return (
              <button key={p.id} className="press" onClick={()=>chooseAs(p.id)} style={{
                padding:'14px 18px',borderRadius:12,
                border:`1.5px solid ${done?T.amberBd:T.borderMed}`,
                background:done?T.amberBg:T.card,
                color:T.ink,fontFamily:T.sans,fontSize:16,fontWeight:500,
                textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',
              }}>
                <span>
                  {p.name}
                  {isPicker && <span style={{fontSize:10,color:T.amber,marginLeft:8,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>· picker</span>}
                </span>
                {done && <span style={{fontSize:11,color:T.amber,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase'}}>done</span>}
              </button>
            );
          })}
        </div>
      </ViewerShell>
    );
  }

  // ── From here on, we know who the player is. Branch by phase + role. ────
  const me = meta.players.find(p => p.id === chosenPlayerId);
  const isPicker = me?.id === meta.format?.pickerId;
  const isVetoer = (meta.format?.vetoerIds || []).includes(me?.id);
  const phase = meta.phase || 'nominate';

  // Final picker — branching by phase
  if (isPicker) {
    // Phase: pick — show the final pool and let them choose
    if (phase === 'pick') {
      // Already submitted? Backend has finalPickedGameId set
      if (meta.finalPickedGameId) {
        const picked = meta.games.find(g => g.id === meta.finalPickedGameId);
        return (
          <ViewerShell title={`Hi, ${me?.name || ''}`}>
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <div style={{fontSize:42,marginBottom:12}}>✓</div>
              <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Done!</p>
              {picked && <p style={{fontFamily:T.serif,fontSize:18,color:T.amber,marginBottom:8}}>{picked.name}</p>}
              <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
                Your pick is in. The host has everything they need.
              </p>
            </div>
          </ViewerShell>
        );
      }

      // Active pick UI — show the post-veto final pool
      const poolIds = meta.finalPool || meta.pool || [];
      const poolGames = poolIds.map(id => meta.games.find(g => g.id === id)).filter(Boolean);
      const selectedGame = finalPickSel ? meta.games.find(g => g.id === finalPickSel) : null;

      return (
        <ViewerShell title={`Hi, ${me?.name || ''}`}>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:6}}>
              Final pick — your turn
            </div>
            <p style={{fontFamily:T.sans,fontSize:14,color:T.ink,lineHeight:1.55,marginBottom:0}}>
              Choose the game everyone plays tonight. {poolGames.length} {poolGames.length === 1 ? 'game' : 'games'} left after vetoes.
            </p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18,paddingBottom:80}}>
            {poolGames.map(g => {
              const on = finalPickSel === g.id;
              return (
                <div key={g.id} className="card-press" onClick={()=>setFinalPickSel(on?null:g.id)} style={{
                  background:on?T.amberBg:T.card,
                  border:`1.5px solid ${on?T.amber:T.border}`,
                  borderRadius:13,overflow:'hidden',cursor:'pointer',
                  boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative',
                  transform:on?'scale(1.02)':'none',
                }}>
                  <GameImg game={g} height={115}/>
                  <div style={{padding:'11px 12px 13px'}}>
                    <div style={{fontFamily:T.serif,fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>{g.name}</div>
                    <div style={{fontFamily:T.sans,fontSize:11,color:T.sub,marginBottom:7}}>{g.minPlayers}–{g.maxPlayers}p · {g.category}</div>
                    <CxDots value={g.complexity}/>
                  </div>
                  {on && <div style={{position:'absolute',top:10,right:10,width:22,height:22,borderRadius:'50%',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:'#FFFFFF'}}/>
                  </div>}
                </div>
              );
            })}
          </div>

          {/* Sticky submit bar */}
          <div style={{
            position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
            width:'100%', maxWidth:480,
            padding:'12px 22px max(14px, env(safe-area-inset-bottom))',
            background:`linear-gradient(to top, ${T.bg} 70%, rgba(21,17,13,0.85) 100%)`,
            borderTop:`1px solid ${T.border}`,
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            zIndex:200,
          }}>
            <button
              onClick={submitFinalPick}
              disabled={!finalPickSel || submitting}
              className="press"
              style={{
                width:'100%', padding:'14px 18px', borderRadius:12,
                border:'none', cursor: (finalPickSel && !submitting) ? 'pointer' : 'default',
                background: finalPickSel ? T.amber : T.card,
                color: finalPickSel ? '#15110D' : T.sub,
                fontFamily:T.sans, fontSize:14, fontWeight:600,
                transition:'all 0.18s', opacity: submitting ? 0.6 : 1,
              }}>
              {submitting
                ? 'Submitting…'
                : finalPickSel
                  ? `Play ${selectedGame?.name} →`
                  : 'Select a game'}
            </button>
          </div>
        </ViewerShell>
      );
    }

    // Phase: complete — picker's done, just say thanks
    if (phase === 'complete') {
      const picked = meta.finalPickedGameId ? meta.games.find(g => g.id === meta.finalPickedGameId) : null;
      return (
        <ViewerShell title={`Hi, ${me?.name || ''}`}>
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{fontSize:42,marginBottom:12}}>✓</div>
            <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Game night locked in</p>
            {picked && <p style={{fontFamily:T.serif,fontSize:18,color:T.amber,marginBottom:8}}>{picked.name}</p>}
            <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
              Have fun. The host is running the scoring on their device.
            </p>
          </div>
        </ViewerShell>
      );
    }

    // Phase: anything else (nominate, veto, review) — picker waits
    return (
      <ViewerShell title={`Hi, ${me?.name || ''}`}>
        <div style={{background:T.amberBg,border:`1.5px solid ${T.amberBd}`,borderRadius:12,padding:18,marginBottom:14}}>
          <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:6}}>
            You're the final picker
          </div>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.ink,lineHeight:1.55,marginBottom:0}}>
            You don't nominate or veto. When the host opens the pick to you, this page will switch to a game-selection screen.
          </p>
        </div>
        <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.55}}>
          Sit tight — leave this page open. It updates every few seconds.
        </p>
      </ViewerShell>
    );
  }

  // Review or complete — voting is done, host is finalising
  if (phase === 'review' || phase === 'complete') {
    return (
      <ViewerShell title={`Hi, ${me?.name || ''}`}>
        <div style={{textAlign:'center',padding:'40px 0'}}>
          <div style={{fontSize:42,marginBottom:12}}>✓</div>
          <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Thanks!</p>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
            Voting is closed. The host is finalising the final list.
          </p>
        </div>
      </ViewerShell>
    );
  }

  // Veto phase — only show if we're an eligible vetoer
  if (phase === 'veto') {
    if (!isVetoer) {
      return (
        <ViewerShell title={`Hi, ${me?.name || ''}`}>
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{fontSize:36,marginBottom:12}}>✓</div>
            <p style={{fontFamily:T.serif,fontSize:20,color:T.ink,marginBottom:8}}>You're done</p>
            <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
              You don't have a veto in this session. Sit tight — the host will run the rest.
            </p>
          </div>
        </ViewerShell>
      );
    }

    // Already vetoed — thanks screen
    if (vetoSubmitted) {
      return (
        <ViewerShell title={`Hi, ${me?.name || ''}`}>
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{fontSize:42,marginBottom:12}}>✓</div>
            <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Veto submitted</p>
            <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
              Thanks. Waiting for the rest, then the host will confirm the final list.
            </p>
          </div>
        </ViewerShell>
      );
    }

    // Show veto picker — use the pool from meta
    const poolIds = meta.pool || [];
    const poolGames = poolIds.map(id => meta.games.find(g => g.id === id)).filter(Boolean);
    const selectedGame = vetoSel ? meta.games.find(g => g.id === vetoSel) : null;

    return (
      <ViewerShell title={`Hi, ${me?.name || ''}`}>
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.danger,marginBottom:6}}>
            Veto phase
          </div>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.ink,lineHeight:1.55,marginBottom:0}}>
            Pick <strong>one game</strong> to remove from the pool, or skip your veto.
          </p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18,paddingBottom:80}}>
          {poolGames.map(g => {
            const on = vetoSel === g.id;
            return (
              <div key={g.id} className="card-press" onClick={()=>setVetoSel(on?null:g.id)} style={{
                background:on?T.dangerBg:T.card,
                border:`1.5px solid ${on?T.danger:T.border}`,
                borderRadius:11,overflow:'hidden',cursor:'pointer',
                boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative',
              }}>
                <GameImg game={g} height={82}/>
                <div style={{padding:'8px 10px 10px'}}>
                  <div style={{fontFamily:T.serif,fontSize:14,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:2}}>{g.name}</div>
                  <div style={{fontFamily:T.sans,fontSize:10,color:T.sub}}>{g.minPlayers}–{g.maxPlayers}p</div>
                </div>
                {on && <div style={{position:'absolute',top:8,right:8,width:22,height:22,borderRadius:'50%',background:T.danger,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
                </div>}
              </div>
            );
          })}
        </div>

        {/* Sticky bottom bar with action buttons */}
        <div style={{
          position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480,
          padding:'12px 22px max(14px, env(safe-area-inset-bottom))',
          background:`linear-gradient(to top, ${T.bg} 70%, rgba(21,17,13,0.85) 100%)`,
          borderTop:`1px solid ${T.border}`,
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          zIndex:200, display:'flex', gap:10,
        }}>
          <button
            onClick={()=>submitVeto(vetoSel)}
            disabled={!vetoSel || submitting}
            className="press"
            style={{
              flex:1, padding:'13px 16px', borderRadius:12, border:'none',
              cursor: (vetoSel && !submitting) ? 'pointer' : 'default',
              background: vetoSel ? T.danger : T.card,
              color: vetoSel ? '#fff' : T.sub,
              fontFamily:T.sans, fontSize:13, fontWeight:600,
              transition:'all 0.18s', opacity: submitting ? 0.6 : 1,
            }}>
            {submitting && vetoSel ? 'Submitting…' : (selectedGame ? `Veto ${selectedGame.name.length>14 ? selectedGame.name.slice(0,12)+'…' : selectedGame.name}` : 'Select a game')}
          </button>
          <button
            onClick={()=>submitVeto(null)}
            disabled={submitting}
            className="press"
            style={{
              padding:'13px 16px', borderRadius:12,
              border:`1.5px solid ${T.border}`, background:'transparent',
              color:T.sub, fontFamily:T.sans, fontSize:13, fontWeight:600,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}>
            Skip
          </button>
        </div>
      </ViewerShell>
    );
  }

  // ── Nominate phase (the default initial state) ──────────────────────────

  // Already submitted nomination — show thank-you, but tell them if veto is coming
  if (submitted) {
    const vetoComing = isVetoer && meta.format?.vetoMode === 'remote';
    return (
      <ViewerShell title="All done">
        <div style={{textAlign:'center',padding:'40px 0'}}>
          <div style={{fontSize:42,marginBottom:12}}>✓</div>
          <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Thanks!</p>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
            {vetoComing
              ? 'Your nominations are in. When the host opens the veto phase, come back to this page to submit your veto.'
              : 'Your nominations are in. The host will run the rest of the night.'}
          </p>
        </div>
      </ViewerShell>
    );
  }

  // Active nominate UI
  const filtered = meta.games.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ViewerShell title={`Hi, ${me?.name || ''}`}>
      <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.55}}>
        Choose {picksPerPlayer} games you'd like to play. Other players don't see your picks.
      </p>

      {/* Pick slots */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {Array.from({length: picksPerPlayer}).map((_,i)=>{
          const g = picks[i] ? meta.games.find(x=>x.id===picks[i]) : null;
          return (
            <div key={i} onClick={g?()=>togglePick(picks[i]):undefined} style={{
              flex:1,minHeight:46,borderRadius:10,padding:'10px 8px',
              border:`1.5px solid ${g?T.amber:T.border}`,
              background:g?T.amberBg:'transparent',
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor:g?'pointer':'default',transition:'all 0.15s',
            }}>
              {g
                ? <div style={{fontFamily:T.sans,fontSize:12,color:T.amber,fontWeight:500,textAlign:'center',lineHeight:1.3}}>{g.name}</div>
                : <div style={{fontFamily:T.sans,fontSize:12,color:T.border,fontWeight:500}}>Pick {i+1}</div>}
            </div>
          );
        })}
      </div>

      <div style={{position:'relative',marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
          onFocus={()=>setSearchFoc(true)} onBlur={()=>setSearchFoc(false)}
          style={{...IS,border:`1.5px solid ${searchFoc?T.amber:T.border}`,paddingLeft:42}}
        />
        <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',opacity:0.4,pointerEvents:'none'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18,paddingBottom:80}}>
        {filtered.map(g => {
          const on = picks.includes(g.id);
          return (
            <div key={g.id} className="card-press" onClick={()=>togglePick(g.id)} style={{
              background:on?T.amberBg:T.card,
              border:`1.5px solid ${on?T.amber:T.border}`,
              borderRadius:11,overflow:'hidden',cursor:'pointer',
              boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative',
            }}>
              <GameImg game={g} height={82}/>
              <div style={{padding:'8px 10px 10px'}}>
                <div style={{fontFamily:T.serif,fontSize:14,fontWeight:700,color:T.ink,lineHeight:1.2,marginBottom:2}}>{g.name}</div>
                <div style={{fontFamily:T.sans,fontSize:10,color:T.sub}}>{g.minPlayers}–{g.maxPlayers}p</div>
              </div>
              {on && <div style={{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:'50%',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#FFFFFF'}}/>
              </div>}
            </div>
          );
        })}
      </div>

      {/* Sticky submit bar — dynamic counter based on picksPerPlayer */}
      <div style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480,
        padding:'12px 22px max(14px, env(safe-area-inset-bottom))',
        background:`linear-gradient(to top, ${T.bg} 70%, rgba(21,17,13,0.85) 100%)`,
        borderTop:`1px solid ${T.border}`,
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        zIndex:200,
      }}>
        <button
          onClick={submitNominate}
          disabled={picks.length !== picksPerPlayer || submitting}
          className="press"
          style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:12, padding:'13px 18px', borderRadius:12,
            border:'none', cursor: (picks.length === picksPerPlayer && !submitting) ? 'pointer' : 'default',
            background: picks.length === picksPerPlayer ? T.amber : T.card,
            color: picks.length === picksPerPlayer ? '#15110D' : T.sub,
            fontFamily:T.sans, fontSize:14, fontWeight:600,
            transition:'all 0.18s', opacity: submitting ? 0.6 : 1,
          }}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {Array.from({length: picksPerPlayer}).map((_,i) => (
              <div key={i} style={{
                width:7, height:7, borderRadius:'50%',
                background: picks.length > i
                  ? (picks.length === picksPerPlayer ? '#15110D' : T.amber)
                  : (picks.length === picksPerPlayer ? 'rgba(21,17,13,0.25)' : T.borderMed),
                transition:'background 0.18s',
              }}/>
            ))}
            <span style={{fontSize:13, marginLeft:6, opacity:0.85}}>
              {picks.length}/{picksPerPlayer}
            </span>
          </div>
          <span>
            {submitting
              ? 'Submitting…'
              : picks.length === picksPerPlayer
                ? 'Submit my picks →'
                : `Pick ${picksPerPlayer - picks.length} more`}
          </span>
        </button>
      </div>
    </ViewerShell>
  );
}

function ViewerShell({ children, title }) {
  return (
    <>
      <style>{GLOBAL}</style>
      <div style={{minHeight:'100vh',background:T.bg,maxWidth:480,margin:'0 auto',padding:'24px 22px 40px'}}>
        <div style={{fontFamily:T.serif,fontSize:17,fontWeight:600,color:T.ink,marginBottom:4}}>Game Night</div>
        {title && <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,marginTop:18,marginBottom:8,lineHeight:1.05}}>{title}</h1>}
        <div style={{height:1,background:T.border,margin:'16px 0 22px'}}/>
        {children}
      </div>
    </>
  );
}

// ── Stats Tab ──────────────────────────────────────────────────────────────
// Personal stats derived from the local history array. Works with whatever
// data each entry has — older entries without `winner`/`vetoedGameIds` simply
// don't contribute to those sections, so they degrade gracefully.

function StatsTab({ history, games }) {
  const [windowKey, setWindowKey] = useState('all'); // 'all' | 'year' | '90d' | '30d'

  // Filter history to selected time window
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs = {
      all: 0,
      year: now - 365 * 24 * 60 * 60 * 1000,
      '90d': now - 90 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
    };
    const cutoff = cutoffs[windowKey];
    return (history || []).filter(e => (e?.finishedAt || e?.completedAt || 0) >= cutoff);
  }, [history, windowKey]);

  // Empty state — no history at all
  if (!history || history.length === 0) {
    return (
      <div className="page-in">
        <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Stats</h1>
        <div style={{textAlign:'center',padding:'60px 16px'}}>
          <div style={{fontSize:36,marginBottom:14,opacity:0.4}}>📊</div>
          <p style={{fontFamily:T.serif,fontSize:20,color:T.ink,marginBottom:8}}>No game nights yet</p>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6,maxWidth:300,margin:'0 auto'}}>
            Finish a night with scores in the Tonight tab. Your stats will appear here as you play.
          </p>
        </div>
      </div>
    );
  }

  // Empty state for the current window
  if (filtered.length === 0) {
    return (
      <div className="page-in">
        <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Stats</h1>
        <FilterChips value={windowKey} onChange={setWindowKey}/>
        <div style={{textAlign:'center',padding:'40px 16px'}}>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
            No nights in this window. Try a longer time range.
          </p>
        </div>
      </div>
    );
  }

  // ── Aggregations ──────────────────────────────────────────────────────────
  const totalNights = filtered.length;
  const uniqueGames = new Set(filtered.map(e => e.gameId).filter(Boolean));
  const oldest = filtered.reduce((min, e) => Math.min(min, e.finishedAt || e.completedAt || Infinity), Infinity);
  const newest = filtered.reduce((max, e) => Math.max(max, e.finishedAt || e.completedAt || 0), 0);
  const daysSinceLast = newest ? Math.floor((Date.now() - newest) / (24*60*60*1000)) : null;

  // Wins per player. Falls back to deriving from totals if winner isn't explicit.
  const wins = {};
  for (const e of filtered) {
    let w = e.winner;
    if (!w && e.totals) {
      let maxScore = -Infinity;
      for (const [name, total] of Object.entries(e.totals)) {
        if (typeof total === 'number' && total > maxScore) { maxScore = total; w = name; }
      }
    }
    if (w) wins[w] = (wins[w] || 0) + 1;
  }
  const winLeaderboard = Object.entries(wins)
    .sort((a,b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Most played games (by gameId)
  const playCount = {};
  const gameNamesById = {};
  for (const e of filtered) {
    if (e.gameId) {
      playCount[e.gameId] = (playCount[e.gameId] || 0) + 1;
      gameNamesById[e.gameId] = e.gameName || gameNamesById[e.gameId];
    }
  }
  const mostPlayed = Object.entries(playCount)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gid, count]) => ({
      gameId: gid,
      name: gameNamesById[gid] || 'Unknown game',
      count,
      game: games.find(g => g.id === gid),
    }));

  // Picker patterns
  const pickerCounts = {};
  const pickerWins = {}; // games won by picker (picker also won)
  let entriesWithPicker = 0;
  let lastPickByName = {};
  for (const e of filtered) {
    if (e.finalPickerName) {
      entriesWithPicker++;
      pickerCounts[e.finalPickerName] = (pickerCounts[e.finalPickerName] || 0) + 1;
      // Track most recent pick date per picker
      const when = e.finishedAt || e.completedAt;
      if (when && (!lastPickByName[e.finalPickerName] || when > lastPickByName[e.finalPickerName])) {
        lastPickByName[e.finalPickerName] = when;
      }
      // Did the picker also win?
      let w = e.winner;
      if (!w && e.totals) {
        let maxScore = -Infinity;
        for (const [name, total] of Object.entries(e.totals)) {
          if (typeof total === 'number' && total > maxScore) { maxScore = total; w = name; }
        }
      }
      if (w === e.finalPickerName) pickerWins[e.finalPickerName] = (pickerWins[e.finalPickerName] || 0) + 1;
    }
  }
  const topPicker = Object.entries(pickerCounts).sort((a,b) => b[1] - a[1])[0];
  const bestPickerRecord = Object.entries(pickerWins)
    .map(([name, w]) => ({ name, w, total: pickerCounts[name] || 0 }))
    .filter(p => p.total >= 2)  // need at least 2 picks to be meaningful
    .sort((a,b) => (b.w/b.total) - (a.w/a.total))[0];

  // Most-vetoed games
  const vetoCount = {};
  for (const e of filtered) {
    for (const gid of (e.vetoedGameIds || [])) {
      vetoCount[gid] = (vetoCount[gid] || 0) + 1;
    }
  }
  const mostVetoed = Object.entries(vetoCount)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gid, count]) => ({
      gameId: gid,
      name: games.find(g => g.id === gid)?.name || gameNamesById[gid] || 'Unknown game',
      count,
      game: games.find(g => g.id === gid),
    }));

  // Records — only meaningful for games with multiple players
  let closestGame = null;
  let biggestBlowout = null;
  let highestScore = null;
  for (const e of filtered) {
    if (!e.totals) continue;
    const sortedScores = Object.entries(e.totals)
      .filter(([_, t]) => typeof t === 'number')
      .sort((a,b) => b[1] - a[1]);
    if (sortedScores.length >= 2) {
      const margin = sortedScores[0][1] - sortedScores[1][1];
      if (!closestGame || margin < closestGame.margin) {
        closestGame = { entry: e, margin, top: sortedScores[0], second: sortedScores[1] };
      }
      if (!biggestBlowout || margin > biggestBlowout.margin) {
        biggestBlowout = { entry: e, margin, top: sortedScores[0], second: sortedScores[1] };
      }
    }
    if (sortedScores.length > 0) {
      const [name, total] = sortedScores[0];
      if (!highestScore || total > highestScore.total) {
        highestScore = { entry: e, name, total };
      }
    }
  }

  // Picker overdue nudge — who hasn't picked in a long time
  let overduePickerHint = null;
  if (Object.keys(lastPickByName).length >= 2) {
    const sorted = Object.entries(lastPickByName).sort((a,b) => a[1] - b[1]);
    const [name, when] = sorted[0];
    const days = Math.floor((Date.now() - when) / (24*60*60*1000));
    if (days >= 21) overduePickerHint = { name, days };
  }

  // Forgotten games — owned but not in filtered history
  const playedGameIds = new Set([...playCount].map(([gid]) => gid));
  // Find last-played date for each game in library
  const lastPlayedByGameId = {};
  for (const e of (history || [])) {  // use full history, not filtered, for accurate last-played
    if (e.gameId) {
      const when = e.finishedAt || e.completedAt;
      if (when && (!lastPlayedByGameId[e.gameId] || when > lastPlayedByGameId[e.gameId])) {
        lastPlayedByGameId[e.gameId] = when;
      }
    }
  }
  const forgottenGames = games
    .filter(g => lastPlayedByGameId[g.id])  // only games we've played at least once
    .map(g => ({
      game: g,
      lastPlayed: lastPlayedByGameId[g.id],
      daysAgo: Math.floor((Date.now() - lastPlayedByGameId[g.id]) / (24*60*60*1000)),
    }))
    .filter(x => x.daysAgo >= 30)
    .sort((a,b) => b.daysAgo - a.daysAgo)
    .slice(0, 3);

  // Friendly date format
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const days = Math.floor((Date.now() - ts) / (24*60*60*1000));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days/7)}w ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Stats</h1>
      <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:18,lineHeight:1.55}}>
        {totalNights} {totalNights===1?'night':'nights'} · {uniqueGames.size} different {uniqueGames.size===1?'game':'games'}
        {oldest !== Infinity && (
          <> · since {new Date(oldest).toLocaleDateString(undefined, { month:'short', year:'numeric' })}</>
        )}
      </p>

      <FilterChips value={windowKey} onChange={setWindowKey}/>

      {/* Top KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        <Kpi label="Total nights" value={totalNights} sub={daysSinceLast !== null ? `last one ${fmtDate(newest)}` : ''}/>
        <Kpi label="Unique games" value={uniqueGames.size} sub="played"/>
      </div>

      {/* Nudge card */}
      {overduePickerHint && (
        <div style={{
          background:T.card, border:`1px solid ${T.amberBd}`, borderRadius:12,
          padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{
            width:36,height:36,borderRadius:9,background:T.amberBg,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:17,
          }}>🎲</div>
          <div style={{flex:1,fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.5}}>
            <strong style={{color:T.amber,fontWeight:600}}>{overduePickerHint.name}</strong> hasn't picked in {overduePickerHint.days} days. Maybe their turn next time?
          </div>
        </div>
      )}

      {/* Wins leaderboard */}
      {winLeaderboard.length > 0 && (
        <StatsCard label="Who's winning">
          <div>
            {winLeaderboard.slice(0, 6).map((p, i) => (
              <LbRow key={p.name} rank={i}>
                <div style={{flex:1,fontFamily:T.sans,fontSize:15,color:T.ink}}>{p.name}</div>
                <div style={{fontFamily:T.sans,fontSize:13,fontWeight:600,color:T.amber}}>
                  {p.count}<span style={{fontSize:11,color:T.sub,fontWeight:400,marginLeft:4}}>{p.count===1?'win':'wins'}</span>
                </div>
              </LbRow>
            ))}
          </div>
        </StatsCard>
      )}

      {/* Most played */}
      {mostPlayed.length > 0 && (
        <StatsCard label="Most played">
          {mostPlayed.map((g, i) => (
            <GameRow key={g.gameId} game={g.game} name={g.name} suffix={
              <span style={{fontSize:12,color:T.sub,fontWeight:500}}>
                <strong style={{color:T.ink,fontWeight:600}}>{g.count}</strong> times
              </span>
            }/>
          ))}
        </StatsCard>
      )}

      {/* Picker watch — only if we have picker data */}
      {entriesWithPicker >= 2 && (
        <StatsCard label="Picker watch">
          {topPicker && (
            <LbRow rank="·">
              <div style={{flex:1,fontFamily:T.sans,fontSize:14,color:T.ink}}>
                {topPicker[0]} picks most often
                <span style={{
                  display:'inline-block',padding:'2px 7px',borderRadius:6,
                  fontSize:10,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',
                  background:T.amberBg,color:T.amber,marginLeft:6,verticalAlign:'middle',
                }}>{topPicker[1]} times</span>
              </div>
            </LbRow>
          )}
          {bestPickerRecord && (
            <LbRow rank="·">
              <div style={{flex:1,fontFamily:T.sans,fontSize:14,color:T.ink}}>
                {bestPickerRecord.name} wins when they pick
                <span style={{
                  display:'inline-block',padding:'2px 7px',borderRadius:6,
                  fontSize:10,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',
                  background:'rgba(93,206,138,0.12)',color:'#5DCE8A',marginLeft:6,verticalAlign:'middle',
                }}>{bestPickerRecord.w} of {bestPickerRecord.total}</span>
              </div>
            </LbRow>
          )}
        </StatsCard>
      )}

      {/* Most vetoed */}
      {mostVetoed.length > 0 && (
        <StatsCard label="Most vetoed">
          {mostVetoed.map((g) => (
            <GameRow key={g.gameId} game={g.game} name={g.name} suffix={
              <span style={{fontSize:12,color:T.sub,fontWeight:500}}>
                <strong style={{color:T.ink,fontWeight:600}}>{g.count}</strong> {g.count===1?'time':'times'}
              </span>
            }/>
          ))}
        </StatsCard>
      )}

      {/* Records */}
      {(closestGame || biggestBlowout || highestScore) && (
        <StatsCard label="Records">
          {closestGame && (
            <Record
              label="Closest game"
              value={`${closestGame.entry.gameName}, ${closestGame.margin}-point margin`}
              detail={`${closestGame.top[0]} ${closestGame.top[1]} · ${closestGame.second[0]} ${closestGame.second[1]} · ${fmtDate(closestGame.entry.finishedAt)}`}
            />
          )}
          {biggestBlowout && biggestBlowout !== closestGame && (
            <Record
              label="Biggest blowout"
              value={`${biggestBlowout.entry.gameName}, ${biggestBlowout.margin}-point margin`}
              detail={`${biggestBlowout.top[0]} ${biggestBlowout.top[1]} · ${biggestBlowout.second[0]} ${biggestBlowout.second[1]} · ${fmtDate(biggestBlowout.entry.finishedAt)}`}
            />
          )}
          {highestScore && (
            <Record
              label="Highest single score"
              value={`${highestScore.name}, ${highestScore.total} in ${highestScore.entry.gameName}`}
              detail={fmtDate(highestScore.entry.finishedAt)}
            />
          )}
        </StatsCard>
      )}

      {/* Forgotten games */}
      {forgottenGames.length > 0 && (
        <StatsCard label="Forgotten games">
          {forgottenGames.map(({game: g, daysAgo}) => (
            <GameRow key={g.id} game={g} name={g.name} suffix={
              <span style={{fontSize:12,color:T.sub,fontWeight:500}}>
                Last <strong style={{color:T.ink,fontWeight:600}}>{daysAgo}d</strong> ago
              </span>
            }/>
          ))}
          <p style={{fontFamily:T.sans,fontSize:11,color:T.sub,fontStyle:'italic',textAlign:'center',marginTop:8,marginBottom:0}}>
            Games you've played but not recently.
          </p>
        </StatsCard>
      )}

    </div>
  );
}

// ── Sub-components for StatsTab ──────────────────────────────────────────────
function FilterChips({ value, onChange }) {
  const opts = [
    { id: 'all',  label: 'All time' },
    { id: 'year', label: 'This year' },
    { id: '90d',  label: 'Last 90 days' },
    { id: '30d',  label: 'Last 30 days' },
  ];
  return (
    <div style={{display:'flex',gap:8,marginBottom:18,overflowX:'auto'}}>
      {opts.map(o => {
        const on = o.id === value;
        return (
          <button key={o.id} className="press" onClick={()=>onChange(o.id)} style={{
            padding:'7px 14px', borderRadius:18,
            border:`1.5px solid ${on?T.amber:T.border}`,
            background: on?T.amberBg:'transparent',
            color: on?T.amber:T.sub,
            fontFamily:T.sans, fontSize:12, fontWeight:500,
            cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', flexShrink:0,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div style={{
      background:T.card, borderRadius:12, padding:'14px 14px 12px',
      border:`1px solid ${T.border}`, position:'relative', overflow:'hidden',
    }}>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:T.amber,opacity:0.6}}/>
      <div style={{fontFamily:T.sans,fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:T.sub,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1,marginBottom:3}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.sub}}>{sub}</div>}
    </div>
  );
}

function StatsCard({ label, children }) {
  return (
    <div style={{
      background:T.card, borderRadius:14, padding:'16px 18px 12px',
      marginBottom:14, boxShadow:T.shadow, border:`1px solid ${T.border}`,
    }}>
      <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:10}}>
        {label}
      </div>
      {children}
    </div>
  );
}

function LbRow({ rank, children }) {
  const isMedal = typeof rank === 'number' && rank < 3;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
      <div style={{
        width:26, textAlign:'center',
        fontSize: isMedal ? 18 : 13,
        fontFamily: T.sans, fontWeight: isMedal ? 400 : 600,
        color: isMedal ? T.ink : T.sub,
      }}>
        {isMedal ? medals[rank] : (rank === '·' ? '·' : (typeof rank === 'number' ? rank + 1 : rank))}
      </div>
      {children}
    </div>
  );
}

function GameRow({ game, name, suffix }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:`1px solid ${T.border}`}}>
      <div style={{width:36,height:36,borderRadius:6,overflow:'hidden',flexShrink:0,background:T.surface,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {game ? <GameImg game={game} height={36}/> :
          <span style={{fontFamily:T.serif,fontSize:14,color:T.sub}}>{name?.[0] || '?'}</span>}
      </div>
      <div style={{flex:1,fontFamily:T.sans,fontSize:14,color:T.ink,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {name}
      </div>
      {suffix}
    </div>
  );
}

function Record({ label, value, detail }) {
  return (
    <div style={{padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
      <div style={{fontFamily:T.sans,fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:T.sub,marginBottom:5}}>
        {label}
      </div>
      <div style={{fontFamily:T.serif,fontSize:17,fontWeight:700,color:T.ink,lineHeight:1.3,marginBottom:4}}>
        {value}
      </div>
      <div style={{fontFamily:T.sans,fontSize:11,color:T.sub}}>{detail}</div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const NAV=[{id:'library',label:'Library'},{id:'night',label:'Tonight'},{id:'scores',label:'Scores'},{id:'stats',label:'Stats'}];

export default function App() {
  // Route: /vote/:id → viewer experience. Anything else → owner app.
  const viewerSessionId = getViewerSessionId();
  if (viewerSessionId) return <ViewerApp sessionId={viewerSessionId}/>;
  return <OwnerApp/>;
}

function OwnerApp() {
  const [tab,setTab]=useState('library');
  const [games,setGames]=useState([]);
  const [session,setSession]=useState(null);
  const [voteSessions, setVoteSessions] = useState([]); // [{ sessionId, ownerKey, viewerUrl, label, createdAt }]
  const [activeVoteSessionId, setActiveVoteSessionId] = useState(null); // currently being viewed in detail, null = list
  const [history,setHistory]=useState([]);
  const [ready,setReady]=useState(false);
  const [modal,setModal]=useState(null);

  // BGG profile
  const [profile, setProfile] = useState(null);     // { username, gameCount, syncedAt }
  const [showProfile, setShowProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncError, setSyncError]   = useState(null);
  const [justSynced, setJustSynced] = useState(false);

  // Backup (cloud sync)
  const [backupCode, setBackupCode] = useState(null);  // user's saved code, or null if not set up
  const [backupSyncedAt, setBackupSyncedAt] = useState(null);  // last successful upload
  const [backupStatus, setBackupStatus] = useState('idle');    // 'idle' | 'syncing' | 'error'
  const [showBackup, setShowBackup] = useState(false);

  useEffect(()=>{
    (async()=>{
      try {
        const r = await window.storage.get('gn4-games');
        if(r) setGames(JSON.parse(r.value));
      } catch {}
      try{ const r=await window.storage.get('gn4-sess'); if(r) setSession(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-hist'); if(r) setHistory(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-profile'); if(r) setProfile(JSON.parse(r.value)); }catch{}
      // voteSessions: load new plural key, falling back to migrating the old singular key.
      try {
        const r = await window.storage.get('gn4-vote-sessions');
        if (r) {
          const arr = JSON.parse(r.value);
          if (Array.isArray(arr)) setVoteSessions(arr);
        } else {
          // Migrate from old single-session storage
          const old = await window.storage.get('gn4-vote-session');
          if (old) {
            try {
              const oldSession = JSON.parse(old.value);
              if (oldSession && oldSession.sessionId) {
                const migrated = [{ ...oldSession, createdAt: oldSession.createdAt || Date.now() }];
                setVoteSessions(migrated);
                await window.storage.set('gn4-vote-sessions', JSON.stringify(migrated));
                await window.storage.delete('gn4-vote-session');
              }
            } catch {}
          }
        }
      } catch {}
      try{ const r=await window.storage.get('gn4-backup-code'); if(r) setBackupCode(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-backup-synced'); if(r) setBackupSyncedAt(JSON.parse(r.value)); }catch{}
      setReady(true);
    })();
  },[]);

  async function saveGames(g){ setGames(g); try{ await window.storage.set('gn4-games',JSON.stringify(g)); }catch{} }
  async function saveSession(s){ setSession(s); try{ if(s) await window.storage.set('gn4-sess',JSON.stringify(s)); else await window.storage.delete('gn4-sess'); }catch{} }
  async function saveHistory(h){ setHistory(h); try{ await window.storage.set('gn4-hist',JSON.stringify(h)); }catch{} }
  async function saveProfile(p){ setProfile(p); try{ if(p) await window.storage.set('gn4-profile',JSON.stringify(p)); else await window.storage.delete('gn4-profile'); }catch{} }
  async function saveVoteSessions(arr) {
    setVoteSessions(arr);
    try {
      if (arr && arr.length) await window.storage.set('gn4-vote-sessions', JSON.stringify(arr));
      else await window.storage.delete('gn4-vote-sessions');
    } catch {}
  }
  // Add a newly-created session to the list (most recent first)
  async function addVoteSession(s) {
    const stamped = { ...s, createdAt: s.createdAt || Date.now() };
    const next = [stamped, ...voteSessions.filter(x => x.sessionId !== stamped.sessionId)];
    await saveVoteSessions(next);
    setActiveVoteSessionId(stamped.sessionId);
  }
  // Remove a session from the list (after end-session or 404 on backend)
  async function removeVoteSession(sessionId) {
    const next = voteSessions.filter(x => x.sessionId !== sessionId);
    await saveVoteSessions(next);
    if (activeVoteSessionId === sessionId) setActiveVoteSessionId(null);
  }
  async function saveBackupCode(c){ setBackupCode(c); try{ if(c) await window.storage.set('gn4-backup-code',JSON.stringify(c)); else await window.storage.delete('gn4-backup-code'); }catch{} }
  async function saveBackupSyncedAt(t){ setBackupSyncedAt(t); try{ if(t) await window.storage.set('gn4-backup-synced',JSON.stringify(t)); else await window.storage.delete('gn4-backup-synced'); }catch{} }

  // Auto-sync: any time the persistable data changes, queue a debounced upload.
  // 2-second debounce means rapid edits don't hammer the network — we wait for
  // the user to settle before uploading. NOT synced: voteSession (has its own
  // cloud storage) or active in-progress local sessions (would be confusing on restore).
  const backupTimerRef = useRef(null);
  useEffect(() => {
    if (!ready || !backupCode) return;
    // Don't sync when the user is mid-game-night — wait until they finish.
    // This avoids restoring a half-finished veto round on another device.
    if (session && session.phase !== undefined) return;

    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(async () => {
      setBackupStatus('syncing');
      try {
        const payload = {
          games,
          history,
          profile,
          version: 1,
        };
        await BackupApi.save(backupCode, payload);
        await saveBackupSyncedAt(Date.now());
        setBackupStatus('idle');
      } catch (e) {
        console.warn('Backup sync failed:', e);
        setBackupStatus('error');
      }
    }, 2000);

    return () => {
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    };
    // We deliberately watch the things that should trigger sync, not session
  }, [ready, backupCode, games, history, profile]);

  // Restore from a code — overwrites local data.
  async function restoreFromCode(rawCode) {
    const code = normalizeBackupCode(rawCode);
    const record = await BackupApi.fetch(code);
    if (!record) {
      throw new Error('No backup found for that code. Check spelling and try again.');
    }
    const data = record.data || {};
    if (Array.isArray(data.games)) await saveGames(data.games);
    if (Array.isArray(data.history)) await saveHistory(data.history);
    if (data.profile && typeof data.profile === 'object') await saveProfile(data.profile);
    await saveBackupCode(code);
    await saveBackupSyncedAt(record.updatedAt || Date.now());
    return record;
  }

  // Bridge: when remote voting is complete, the panel dispatches an event with a pre-built local session.
  // We start the local night and remove THAT specific remote session from the list,
  // leaving any other parallel sessions alone.
  useEffect(() => {
    function handler(e) {
      const { localSession, sourceSessionId } = e.detail || {};
      if (localSession) saveSession(localSession);
      if (sourceSessionId) removeVoteSession(sourceSessionId);
    }
    window.addEventListener('start-local-from-remote', handler);
    return () => window.removeEventListener('start-local-from-remote', handler);
    // removeVoteSession depends on voteSessions, so re-bind whenever it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteSessions]);


  async function handleSync(username) {
    setSyncError(null);
    setSyncStatus('Connecting…');
    try {
      const bggGames = await syncBggUser(username, msg => setSyncStatus(msg));
      await saveGames(bggGames);
      await saveProfile({
        username: username.trim(),
        gameCount: bggGames.length,
        syncedAt: Date.now(),
      });
      setSyncStatus(`Done — ${bggGames.length} games synced`);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
      setTimeout(() => { setSyncStatus(null); setShowProfile(false); }, 1400);
    } catch (err) {
      setSyncError(err.message || 'Sync failed');
      setSyncStatus(null);
    }
  }

  async function handleDisconnect() {
    // Disconnecting clears everything — BGG is now the only library source
    await saveProfile(null);
    await saveGames([]);
    setShowProfile(false);
  }

  async function finishNight(entry) {
    // History entry IS the source of truth for previous-picker memory now.
    // We still write a localStorage fallback so old code paths or external
    // viewers (without history loaded) can find a value, but it's secondary.
    if (entry?.finalPickerName) {
      try { await window.storage.set('gn4-last-picker', JSON.stringify(entry.finalPickerName)); } catch {}
    }
    // Prepend newest first, cap at 50 entries
    const updated = [entry, ...history].slice(0, 50);
    await saveHistory(updated);
    await saveSession(null);
    setTab('scores');
  }

  async function deleteHistoryEntry(id) {
    await saveHistory(history.filter(e => e.id !== id));
  }

  if(!ready) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:T.bg,fontFamily:T.serif,fontSize:18,color:T.sub}}>Loading…</div>;

  const nightBadge = (!!session || voteSessions.length > 0) && tab!=='night';

  return (
    <>
      <style>{GLOBAL}</style>
      <InstallHint/>
      <div style={{minHeight:'100vh',background:T.bg,maxWidth:480,margin:'0 auto',paddingBottom:72}}>

        <div style={{padding:'24px 22px 0',position:'sticky',top:0,zIndex:100,background:T.bg}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,gap:10}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontFamily:T.serif,fontSize:17,fontWeight:600,color:T.ink,letterSpacing:'-0.01em'}}>Game Night</div>
              <div style={{fontFamily:T.sans,fontSize:12,color:T.sub,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {games.length === 0
                  ? 'Not connected'
                  : `${games.length} game${games.length===1?'':'s'}${profile?.username?` · ${profile.username}`:''}`}
              </div>
            </div>
            <button
              className="press"
              onClick={()=>setShowBackup(true)}
              title="Cloud backup"
              style={{
                flexShrink:0, width:36, height:36, borderRadius:'50%',
                border:`1.5px solid ${backupCode ? 'rgba(93,206,138,0.45)' : T.borderMed}`,
                background:backupCode ? 'rgba(93,206,138,0.10)' : 'transparent',
                color:backupCode ? '#5DCE8A' : T.sub,
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',transition:'all 0.18s',
              }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.5 14.5a3.5 3.5 0 0 1 0-7 4.5 4.5 0 0 1 8.7-1.4A3.5 3.5 0 0 1 14.5 14.5"/>
                {backupCode && backupStatus === 'syncing' && <circle cx="10" cy="11" r="1.2" fill="currentColor"/>}
                {backupCode && backupStatus === 'idle' && <polyline points="7,11 9,13 13,9"/>}
              </svg>
            </button>
            <SyncPill
              profile={profile}
              syncing={!!syncStatus && !syncError && !justSynced}
              justSynced={justSynced}
              onClick={()=>setShowProfile(true)}
            />
          </div>
          <Hr/>
        </div>

        <div style={{padding:'22px 22px 28px'}}>
          {tab==='library'&&<LibraryTab  games={games} onSelect={setModal} onOpenProfile={()=>setShowProfile(true)} profile={profile}/>}
          {tab==='night'  &&<NightTab
            games={games} session={session} onUpdate={saveSession} onFinish={finishNight}
            onGoToLibrary={()=>setTab('library')}
            voteSessions={voteSessions}
            activeVoteSessionId={activeVoteSessionId}
            onSelectVoteSession={setActiveVoteSessionId}
            onAddVoteSession={addVoteSession}
            onRemoveVoteSession={removeVoteSession}
            history={history}
          />}
          {tab==='scores' &&<ScoresTab   session={session} history={history} onDeleteEntry={deleteHistoryEntry} games={games}/>}
          {tab==='stats'  &&<StatsTab    history={history} games={games}/>}
        </div>

        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:T.bg,borderTop:`1px solid ${T.border}`,zIndex:200}}>
          <div style={{display:'flex',padding:'10px 0 18px'}}>
            {NAV.map(t=>{
              const on=tab===t.id;
              return (
                <button key={t.id} className="press" onClick={()=>setTab(t.id)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'4px 0',position:'relative'}}>
                  <div className="dot-anim" style={{height:2,borderRadius:1,background:on?T.ink:'transparent',width:on?20:0}}/>
                  <div style={{fontFamily:T.sans,fontSize:12,fontWeight:on?600:400,color:on?T.ink:T.sub,transition:'color 0.18s',letterSpacing:'-0.01em'}}>{t.label}</div>
                  {t.id==='night'&&nightBadge&&<div style={{position:'absolute',top:4,right:'calc(50% - 20px)',width:6,height:6,borderRadius:'50%',background:T.amber}}/>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {modal&&<DetailSheet game={modal} onClose={()=>setModal(null)}/>}
      {showProfile&&<ProfileSheet
        profile={profile}
        onClose={()=>{ setShowProfile(false); setSyncStatus(null); setSyncError(null); }}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
        syncStatus={syncStatus}
        syncError={syncError}
      />}
      {showBackup&&<BackupSheet
        code={backupCode}
        syncedAt={backupSyncedAt}
        status={backupStatus}
        onClose={()=>setShowBackup(false)}
        onCreate={async (newCode) => { await saveBackupCode(newCode); }}
        onRestore={restoreFromCode}
        onDisconnect={async () => {
          await saveBackupCode(null);
          await saveBackupSyncedAt(null);
          setBackupStatus('idle');
          setShowBackup(false);
        }}
      />}
    </>
  );
}
