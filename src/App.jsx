import { useState, useEffect, useRef } from "react";


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

function NSessionSetup({ games, onCreated, onCancel }) {
  const [rows, setRows] = useState(['', '', '', '']);
  const [count, setCount] = useState(4);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const names = rows.slice(0, count).map(n => n.trim()).filter(Boolean);
  const valid = names.length >= 2 && games.length > 0;

  function updateRow(i, val) {
    setRows(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  async function create() {
    if (!valid) return;
    setCreating(true);
    setError(null);
    try {
      const players = names.map(n => ({ id: randomPlayerId(), name: n }));
      const result = await SessionApi.create({
        games,
        players,
        format: { nominators: players.length, vetoes: true, picker: 'last' },
      });
      onCreated(result);
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
        Send a link to each friend. They pick 3 games each from your collection before game night.
      </p>

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

      <div style={{background:T.card,borderRadius:14,padding:'16px 20px',marginBottom:24,boxShadow:T.shadow,fontFamily:T.sans,fontSize:13,color:T.sub,lineHeight:1.6}}>
        <Lbl>Format</Lbl>
        Each player nominates 3 games independently. Once everyone's voted, you assemble the pool, run vetoes, and make the final pick at the table.
      </div>

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

function NSessionActive({ session, games, onClear }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copied'

  // Poll results every 4s
  useEffect(() => {
    let stopped = false;
    let timer = null;

    async function poll() {
      try {
        const r = await SessionApi.getResults(session.sessionId, session.ownerKey);
        if (!stopped) setResults(r);
      } catch (e) {
        if (!stopped) setError(e.message);
      }
      if (!stopped) timer = setTimeout(poll, 4000);
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
    try {
      await SessionApi.destroy(session.sessionId, session.ownerKey);
    } catch {}
    onClear();
  }

  if (!results) {
    return (
      <div className="page-in">
        <div style={{textAlign:'center',padding:'60px 0',fontFamily:T.serif,fontSize:18,color:T.sub}}>Loading session…</div>
        {error && <p style={{fontFamily:T.sans,fontSize:13,color:T.danger,textAlign:'center'}}>{error}</p>}
      </div>
    );
  }

  const players = results.players;
  const votedIds = new Set(results.votes.map(v => v.playerId));
  const allVoted = players.every(p => votedIds.has(p.id));

  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:30,fontWeight:700,color:T.ink,marginBottom:6}}>Voting session</h1>
      <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:22,lineHeight:1.55,fontFamily:T.sans}}>
        Session <code style={{fontFamily:'monospace',color:T.amber,fontSize:13,letterSpacing:'0.05em'}}>{session.sessionId}</code> — {votedIds.size} of {players.length} voted
      </p>

      {/* Share link */}
      <div style={{background:T.card,borderRadius:14,padding:'14px 16px',marginBottom:14,boxShadow:T.shadow}}>
        <Lbl>Share this link with players</Lbl>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input
            readOnly value={session.viewerUrl}
            onClick={e => e.target.select()}
            style={{...IS,fontSize:12,fontFamily:'monospace',padding:'10px 12px',color:T.sub,border:`1.5px solid ${T.border}`}}
          />
          <Btn onClick={copyLink} size='sm' variant='primary'>
            {copyState === 'copied' ? 'Copied' : 'Copy'}
          </Btn>
        </div>
      </div>

      {/* Player status list */}
      <div style={{background:T.card,borderRadius:14,overflow:'hidden',marginBottom:18,boxShadow:T.shadow}}>
        {players.map((p, i) => {
          const hasVoted = votedIds.has(p.id);
          return (
            <div key={p.id}>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
                <div style={{
                  width:8,height:8,borderRadius:'50%',
                  background: hasVoted ? '#5DCE8A' : T.border,
                  flexShrink:0,
                }}/>
                <div style={{flex:1,fontFamily:T.sans,fontSize:15,color:T.ink}}>{p.name}</div>
                <div style={{fontFamily:T.sans,fontSize:11,color:hasVoted?'#5DCE8A':T.sub,letterSpacing:'0.07em',textTransform:'uppercase',fontWeight:600}}>
                  {hasVoted ? 'voted' : 'waiting'}
                </div>
              </div>
              {i < players.length-1 && <Hr/>}
            </div>
          );
        })}
      </div>

      {/* Status badges + actions */}
      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <Btn
          variant='outline'
          full
          onClick={()=>window.open(session.viewerUrl, '_blank')}
        >
          Vote myself
        </Btn>
      </div>

      {allVoted && (
        <div style={{background:T.amberBg,border:`1.5px solid ${T.amberBd}`,borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontFamily:T.sans,fontSize:13,color:T.amber,fontWeight:600,marginBottom:8,letterSpacing:'0.02em'}}>
            ✓ Everyone has voted
          </div>
          <p style={{fontFamily:T.sans,fontSize:13,color:T.ink,lineHeight:1.55,marginBottom:12}}>
            Continue to the in-person veto round. Each player will get one veto, and the last player picks the final game.
          </p>
          <Btn
            variant='amber'
            full
            onClick={()=>{
              // Build a regular session from the votes for the existing flow
              const pool = [...new Set(results.votes.flatMap(v => v.picks))];
              const localSession = {
                phase: 'pool',
                players: results.players.map(p => p.name),
                nominatorCount: results.players.length,
                currentNominator: results.players.length, // already done
                nominations: Object.fromEntries(results.votes.map((v,idx) => [idx, v.picks])),
                pool,
                vetoes: {},
                remaining: [],
                chosenGame: null,
                scores: {},
              };
              window.dispatchEvent(new CustomEvent('start-local-from-remote', { detail: localSession }));
            }}
          >
            Continue to veto →
          </Btn>
        </div>
      )}

      <Btn onClick={endSession} variant='dangerOutline' full>End session and discard votes</Btn>
    </div>
  );
}
function NightTab({ games, session, onUpdate, onFinish, onGoToLibrary, voteSession, onVoteSessionChange }) {
  const [view, setView] = useState('home'); // 'home' | 'local' | 'remote-setup'

  // Block all paths if library empty AND nothing in flight
  if (games.length === 0 && !session && !voteSession) {
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

  // Active local session takes the screen
  if (session) {
    if(session.phase==='nominate') return <NNominate games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='pool')     return <NPool     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='veto')     return <NVeto     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='pick')     return <NPick     games={games} session={session} onUpdate={onUpdate}/>;
    if(session.phase==='playing')  return <NPlaying  games={games} session={session} onUpdate={onUpdate} onFinish={onFinish}/>;
  }

  // Active remote voting session next
  if (voteSession) {
    return <NSessionActive session={voteSession} games={games} onClear={()=>onVoteSessionChange(null)}/>;
  }

  // Setup flows
  if (view === 'local')        return <NSetup onStart={onUpdate}/>;
  if (view === 'remote-setup') return <NSessionSetup games={games} onCreated={s => { onVoteSessionChange(s); setView('home'); }} onCancel={()=>setView('home')}/>;

  // Home — pick mode
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

function NSetup({ onStart }) {
  const [rows, setRows]   = useState(['','','']);
  const [count, setCount] = useState(3);
  const [nc, setNc]       = useState(2);

  // Filled player names only (trimmed, non-empty)
  const names = rows.slice(0,count).map(n=>n.trim()).filter(Boolean);
  const total = names.length;
  const valid = total >= 1;

  // Nominator options follow the number of filled names — not empty rows
  const maxNc = total;

  // Auto-clamp nc whenever filled count changes — keep within [1, maxNc]
  useEffect(() => {
    if(maxNc === 0) return;
    setNc(prev => Math.min(Math.max(prev, 1), maxNc));
  }, [maxNc]);

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

  function start() {
    if(!valid) return;
    onStart({
      phase:'nominate', players:names,
      nominatorCount: Math.min(nc, total),
      currentNominator:0, nominations:{}, pool:[],
      vetoes:{}, remaining:[], chosenGame:null, scores:{},
    });
  }

  // Dynamic format-step text, adapting to 1/2/3+ players + nominator choice
  const ncSafe = Math.max(1, Math.min(nc, total));
  let steps = null;
  if (total === 1) {
    steps = ['You nominate 3 games', 'You veto one', 'You pick what to play'];
  } else if (total >= 2) {
    const s1 = ncSafe === 1
      ? 'Player 1 nominates 3 games'
      : ncSafe === total
        ? `All ${total} players each nominate 3 games`
        : `Players 1–${ncSafe} each nominate 3 games`;
    const s2 = total === 2 ? 'Both players get a veto' : `All ${total} players get a veto`;
    const s3 = `Player ${total} makes the final pick`;
    steps = [s1, s2, s3];
  }

  return (
    <div className="page-in">
      <h1 style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:T.ink,marginBottom:6}}>Tonight</h1>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:28,lineHeight:1.5}}>
        {total === 0
          ? 'Add player names to begin.'
          : total === 1
            ? 'Playing solo — pick what to play.'
            : `${total} players tonight.`}
      </p>

      {/* Players card */}
      <div style={{background:T.card,borderRadius:14,padding:20,marginBottom:14,boxShadow:T.shadow}}>
        <Lbl>Players</Lbl>
        {/* PlayerRow is a proper component — hooks are safe here */}
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
            Add player names to see the format.
          </p>
        )}

        {total > 0 && total > 1 && (
          <>
            <Hr style={{margin:'16px 0'}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span style={{fontFamily:T.sans,fontSize:13,color:T.sub,flexShrink:0}}>Nominators</span>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {Array.from({length: maxNc}, (_,i) => i + 1).map(n=>(
                  <button key={n} className="press" onClick={()=>setNc(n)} style={{
                    width:40,height:40,borderRadius:10,
                    border:`1.5px solid ${ncSafe===n?T.amber:T.border}`,
                    background:ncSafe===n?T.amberBg:'transparent',
                    color:ncSafe===n?T.amber:T.sub,
                    fontFamily:T.sans,fontSize:14,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Btn onClick={start} full disabled={!valid}>Start game night</Btn>
    </div>
  );
}

function NNominate({ games, session, onUpdate }) {
  const {players,nominatorCount,currentNominator,nominations}=session;
  const [picks,setPicks]=useState(nominations[currentNominator]||[]);
  const [q,setQ]=useState('');
  const [foc,setFoc]=useState(false);
  const pc = players.length;

  // Only games that support this player count
  const eligible = games.filter(g => g.minPlayers <= pc && g.maxPlayers >= pc);
  const filtered = eligible.filter(g => !q || g.name.toLowerCase().includes(q.toLowerCase()));

  function toggle(id){
    if(picks.includes(id)){setPicks(p=>p.filter(x=>x!==id));return;}
    if(picks.length>=3) return;
    setPicks(p=>[...p,id]);
  }

  function confirm(){
    if(picks.length!==3) return;
    const newNom={...nominations,[currentNominator]:picks};
    const isLast=currentNominator>=nominatorCount-1;
    if(isLast){ const pool=[...new Set(Object.values(newNom).flat())]; onUpdate({...session,nominations:newNom,pool,phase:'pool'}); }
    else { onUpdate({...session,nominations:newNom,currentNominator:currentNominator+1}); setPicks([]); }
  }

  return (
    <div className="page-in">
      <div style={{marginBottom:22}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.sub,marginBottom:5}}>Player {currentNominator+1} of {nominatorCount}</div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:16}}>{players[currentNominator]}</h2>
        <Steps total={nominatorCount} current={currentNominator}/>
      </div>

      {/* Current player's picks only — no other player's choices visible */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {Array.from({length:3}).map((_,i)=>{
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

      <Btn onClick={confirm} full disabled={picks.length!==3}>
        {picks.length<3?`Choose ${3-picks.length} more`:currentNominator<nominatorCount-1?'Confirm — pass to next player':'Confirm — reveal pool'}
      </Btn>
    </div>
  );
}

function NPool({ games, session, onUpdate }) {
  const poolGames=session.pool.map(id=>games.find(g=>g.id===id)).filter(Boolean);
  return (
    <div className="page-in">
      <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:5}}>The Pool</h2>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:22,lineHeight:1.5}}>{poolGames.length} games nominated. Each player gets one veto.</p>
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
      <Btn onClick={()=>onUpdate({...session,phase:'veto',currentVetoPlayer:0,vetoes:{}})} full>Begin veto round</Btn>
      <div style={{textAlign:'center',marginTop:16}}>
        <button className="press" onClick={()=>onUpdate(null)} style={{background:'none',border:'none',fontFamily:T.sans,fontSize:13,color:T.sub,cursor:'pointer'}}>Cancel night</button>
      </div>
    </div>
  );
}

function NVeto({ games, session, onUpdate }) {
  const {players,pool,currentVetoPlayer,vetoes}=session;
  const [sel,setSel]=useState(null);
  const vetoed=Object.values(vetoes);
  const available=pool.filter(id=>!vetoed.includes(id));
  const poolGames=available.map(id=>games.find(g=>g.id===id)).filter(Boolean);

  function proceed(v){
    const allV={...vetoes,...(v?{[currentVetoPlayer]:v}:{})};
    const remaining=pool.filter(id=>!Object.values(allV).includes(id));
    const isLast=currentVetoPlayer>=players.length-1;
    if(isLast) onUpdate({...session,vetoes:allV,remaining:remaining.length?remaining:pool,phase:'pick'});
    else { onUpdate({...session,vetoes:allV,currentVetoPlayer:currentVetoPlayer+1}); setSel(null); }
  }

  return (
    <div className="page-in">
      <div style={{marginBottom:22}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.danger,marginBottom:5}}>Veto round</div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink,marginBottom:16}}>{players[currentVetoPlayer]}</h2>
        <Steps total={players.length} current={currentVetoPlayer}/>
      </div>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:18,lineHeight:1.5}}>Select a game to remove, or skip your veto.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {poolGames.map(g=>{
          const on=sel===g.id;
          return (
            <div key={g.id} className="card-press" onClick={()=>setSel(on?null:g.id)} style={{background:on?T.dangerBg:T.card,border:`1.5px solid ${on?T.danger:T.border}`,borderRadius:12,overflow:'hidden',boxShadow:on?'none':T.shadow,transition:'all 0.15s',position:'relative'}}>
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
        <Btn onClick={()=>sel&&available.length>1&&proceed(sel)} variant='danger' full disabled={!sel||available.length<=1}>
          {sel?`Remove ${games.find(g=>g.id===sel)?.name}`:'Select a game to veto'}
        </Btn>
        <Btn onClick={()=>proceed(null)} variant='outline'>Skip</Btn>
      </div>
      {available.length<=1&&sel&&<div style={{fontFamily:T.sans,fontSize:12,color:T.sub,textAlign:'center',marginTop:10}}>Can't veto the last remaining game</div>}
    </div>
  );
}

function NPick({ games, session, onUpdate }) {
  const {players,nominatorCount,remaining}=session;
  const picker=players[players.length-1];
  const [sel,setSel]=useState(null);
  const remainGames=remaining.map(id=>games.find(g=>g.id===id)).filter(Boolean);

  return (
    <div className="page-in">
      <div style={{marginBottom:22}}>
        <div style={{fontFamily:T.sans,fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T.amber,marginBottom:5}}>Final pick</div>
        <h2 style={{fontFamily:T.serif,fontSize:28,fontWeight:700,color:T.ink}}>{picker}</h2>
      </div>
      <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:20,lineHeight:1.5}}>{remainGames.length} {remainGames.length===1?'game remains':'games remain'}. Choose what everyone's playing tonight.</p>
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

  return (
    <div className="page-in">
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
          onFinish({
            id: uid(),
            finishedAt: Date.now(),
            gameId: game.id,
            gameName: game.name,
            players: [...players],
            scores: {...scores},
            totals: {...totals},
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
    `/api/bgg?type=collection&user=${encodeURIComponent(u)}`,
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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFoc, setSearchFoc] = useState(false);

  // Load session metadata on mount
  useEffect(() => {
    (async () => {
      try {
        const m = await SessionApi.getMeta(sessionId);
        setMeta(m);

        // If we previously chose a player on this device, restore it
        const remembered = localStorage.getItem(`viewer-player-${sessionId}`);
        if (remembered && m.players.some(p => p.id === remembered)) {
          setChosenPlayerId(remembered);
          // If we've already voted, jump straight to thanks
          if (m.votedPlayerIds.includes(remembered)) setSubmitted(true);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [sessionId]);

  function chooseAs(playerId) {
    setChosenPlayerId(playerId);
    localStorage.setItem(`viewer-player-${sessionId}`, playerId);
    if (meta?.votedPlayerIds.includes(playerId)) setSubmitted(true);
  }

  function togglePick(gameId) {
    setPicks(prev => {
      if (prev.includes(gameId)) return prev.filter(x => x !== gameId);
      if (prev.length >= 3) return prev;
      return [...prev, gameId];
    });
  }

  async function submit() {
    if (picks.length !== 3 || !chosenPlayerId) return;
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

  // ── Render states ─────────────
  if (error) {
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

  // Step 1 — choose who you are
  if (!chosenPlayerId) {
    return (
      <ViewerShell title="Game Night Voting">
        <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,marginBottom:22,lineHeight:1.6}}>
          Tap your name to start voting.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {meta.players.map(p => {
            const voted = meta.votedPlayerIds.includes(p.id);
            return (
              <button key={p.id} className="press" onClick={()=>chooseAs(p.id)} style={{
                padding:'14px 18px',borderRadius:12,
                border:`1.5px solid ${voted?T.amberBd:T.borderMed}`,
                background:voted?T.amberBg:T.card,
                color:T.ink,fontFamily:T.sans,fontSize:16,fontWeight:500,
                textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',
              }}>
                <span>{p.name}</span>
                {voted && <span style={{fontSize:11,color:T.amber,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase'}}>voted</span>}
              </button>
            );
          })}
        </div>
      </ViewerShell>
    );
  }

  // Step 3 — already submitted
  if (submitted) {
    return (
      <ViewerShell title="All done">
        <div style={{textAlign:'center',padding:'40px 0'}}>
          <div style={{fontSize:42,marginBottom:12}}>✓</div>
          <p style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Thanks!</p>
          <p style={{fontFamily:T.sans,fontSize:14,color:T.sub,lineHeight:1.6}}>
            Your picks are in. The host will run the rest of the night when everyone has voted.
          </p>
        </div>
      </ViewerShell>
    );
  }

  // Step 2 — pick 3 games
  const me = meta.players.find(p => p.id === chosenPlayerId);
  const filtered = meta.games.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ViewerShell title={`Hi, ${me?.name || ''}`}>
      <p style={{fontFamily:T.sans,fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.55}}>
        Choose 3 games you'd like to play. Other players don't see your picks.
      </p>

      {/* Pick slots */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {Array.from({length:3}).map((_,i)=>{
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

      {/* Search */}
      <div style={{position:'relative',marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
          onFocus={()=>setSearchFoc(true)} onBlur={()=>setSearchFoc(false)}
          style={{...IS,border:`1.5px solid ${searchFoc?T.amber:T.border}`,paddingLeft:42}}
        />
        <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',opacity:0.4,pointerEvents:'none'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      {/* Game grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
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

      <Btn onClick={submit} full disabled={picks.length !== 3 || submitting}>
        {submitting ? 'Submitting…' : picks.length < 3 ? `Choose ${3-picks.length} more` : 'Submit my picks'}
      </Btn>
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

// ── Root ──────────────────────────────────────────────────────────────────────
const NAV=[{id:'library',label:'Library'},{id:'night',label:'Tonight'},{id:'scores',label:'Scores'}];

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
  const [voteSession,setVoteSession]=useState(null); // { sessionId, ownerKey, viewerUrl }
  const [history,setHistory]=useState([]);
  const [ready,setReady]=useState(false);
  const [modal,setModal]=useState(null);

  // BGG profile
  const [profile, setProfile] = useState(null);     // { username, gameCount, syncedAt }
  const [showProfile, setShowProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncError, setSyncError]   = useState(null);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(()=>{
    (async()=>{
      try {
        const r = await window.storage.get('gn4-games');
        if(r) setGames(JSON.parse(r.value));
      } catch {}
      try{ const r=await window.storage.get('gn4-sess'); if(r) setSession(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-hist'); if(r) setHistory(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-profile'); if(r) setProfile(JSON.parse(r.value)); }catch{}
      try{ const r=await window.storage.get('gn4-vote-session'); if(r) setVoteSession(JSON.parse(r.value)); }catch{}
      setReady(true);
    })();
  },[]);

  async function saveGames(g){ setGames(g); try{ await window.storage.set('gn4-games',JSON.stringify(g)); }catch{} }
  async function saveSession(s){ setSession(s); try{ if(s) await window.storage.set('gn4-sess',JSON.stringify(s)); else await window.storage.delete('gn4-sess'); }catch{} }
  async function saveHistory(h){ setHistory(h); try{ await window.storage.set('gn4-hist',JSON.stringify(h)); }catch{} }
  async function saveProfile(p){ setProfile(p); try{ if(p) await window.storage.set('gn4-profile',JSON.stringify(p)); else await window.storage.delete('gn4-profile'); }catch{} }
  async function saveVoteSession(v){ setVoteSession(v); try{ if(v) await window.storage.set('gn4-vote-session',JSON.stringify(v)); else await window.storage.delete('gn4-vote-session'); }catch{} }

  // Bridge: when remote voting is complete, the panel dispatches an event with a pre-built local session
  useEffect(() => {
    function handler(e) {
      saveSession(e.detail);
      saveVoteSession(null); // close out the remote session — the local flow takes over
    }
    window.addEventListener('start-local-from-remote', handler);
    return () => window.removeEventListener('start-local-from-remote', handler);
  }, []);


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

  const nightBadge = (!!session || !!voteSession) && tab!=='night';

  return (
    <>
      <style>{GLOBAL}</style>
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
          {tab==='night'  &&<NightTab    games={games} session={session} onUpdate={saveSession} onFinish={finishNight} onGoToLibrary={()=>setTab('library')} voteSession={voteSession} onVoteSessionChange={saveVoteSession}/>}
          {tab==='scores' &&<ScoresTab   session={session} history={history} onDeleteEntry={deleteHistoryEntry} games={games}/>}
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
    </>
  );
}
