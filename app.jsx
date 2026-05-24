// Water tracker app — main UI.
// All state is local + persisted to localStorage.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Drawn cup icons (water drinks only) ────────────────────────────────────
function CupSmall() {
  return (
    <svg viewBox="0 0 64 72" className="cup-svg" aria-hidden="true">
      <defs>
        <linearGradient id="w-sm" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7FC8FF" />
          <stop offset="1" stopColor="#2C7CD6" />
        </linearGradient>
      </defs>
      <path d="M16 22 L48 22 L44 60 Q44 64 40 64 L24 64 Q20 64 20 60 Z" fill="url(#w-sm)" opacity=".95" />
      <ellipse cx="32" cy="22" rx="16" ry="3.2" fill="#BFE4FF" />
      <path d="M16 18 L48 18 L44 62 Q44 66 40 66 L24 66 Q20 66 20 62 Z"
            fill="none" stroke="#1B3A5C" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="32" cy="18" rx="16" ry="3.2" fill="none" stroke="#1B3A5C" strokeWidth="3" />
      <path d="M22 26 L21 56" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function CupBottle() {
  return (
    <svg viewBox="0 0 64 72" className="cup-svg" aria-hidden="true">
      <defs>
        <linearGradient id="w-bt" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7FC8FF" />
          <stop offset="1" stopColor="#2C7CD6" />
        </linearGradient>
      </defs>
      <rect x="25" y="3" width="14" height="7" rx="2" fill="#5A7896" stroke="#1B3A5C" strokeWidth="2.5" />
      <path d="M27 10 L37 10 L36 16 L28 16 Z" fill="#E8F6FF" stroke="#1B3A5C" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19 26 L45 26 L45 58 Q45 64 39 64 L25 64 Q19 64 19 58 Z" fill="url(#w-bt)" opacity=".95" />
      <path d="M20 16 L44 16 Q47 16 47 19 L47 60 Q47 66 41 66 L23 66 Q17 66 17 60 L17 19 Q17 16 20 16 Z"
            fill="none" stroke="#1B3A5C" strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 36 L47 36 M17 48 L47 48" stroke="#1B3A5C" strokeWidth="2" opacity=".5" />
      <path d="M22 22 L22 56" stroke="rgba(255,255,255,.75)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function CupJug() {
  return (
    <svg viewBox="0 0 64 72" className="cup-svg" aria-hidden="true">
      <defs>
        <linearGradient id="w-jg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7FC8FF" />
          <stop offset="1" stopColor="#2C7CD6" />
        </linearGradient>
      </defs>
      <rect x="22" y="4" width="16" height="8" rx="2" fill="#5A7896" stroke="#1B3A5C" strokeWidth="2.5" />
      <path d="M47 28 Q58 30 58 42 Q58 54 47 56"
            fill="none" stroke="#1B3A5C" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 24 L47 24 L47 60 Q47 66 41 66 L19 66 Q13 66 13 60 Z" fill="url(#w-jg)" opacity=".95" />
      <path d="M14 18 Q14 12 20 12 L40 12 Q46 12 46 18 L47 60 Q47 66 41 66 L19 66 Q13 66 13 60 Z"
            fill="none" stroke="#1B3A5C" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 38 L24 38 M18 48 L24 48 M18 58 L24 58"
            stroke="#1B3A5C" strokeWidth="2" opacity=".55" strokeLinecap="round" />
      <path d="M28 18 L28 60" stroke="rgba(255,255,255,.65)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const DRINK_SEGMENT_COLOR = {
  milk: "#D4B896",
  oj:   "#FFB45A",
  soda: "#C58BD9",
};

const DRINKS = [
  { id: "small",   label: "Small Cup",  oz: 8,  waterPct: 1.0,  color: "#7CC2FF", icon: <CupSmall /> },
  { id: "bottle",  label: "Big Bottle", oz: 24, waterPct: 1.0,  color: "#4FA8F5", icon: <CupBottle /> },
  { id: "jug",     label: "Giant Jug",  oz: 40, waterPct: 1.0,  color: "#2C7CD6", icon: <CupJug /> },
  { id: "milk",    label: "Milk",       oz: 8,  waterPct: 0.87, color: "#F2EDE4", icon: "🥛" },
  { id: "oj",      label: "OJ",         oz: 8,  waterPct: 0.88, color: "#FFB45A", icon: "🧃" },
  { id: "soda",    label: "Soda",       oz: 8,  waterPct: 0.89, color: "#C58BD9", icon: "🥤" },
];

// ── Sound effects (Web Audio API, synthesized — no asset files) ───────────
let _audioCtx = null;
function playSound(type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const now = ctx.currentTime;

    const tone = (freq, start, dur, vol, shape = "sine") => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = shape;
      osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start); osc.stop(now + start + dur + 0.01);
    };
    const sweep = (f1, f2, start, dur, vol, shape = "sine") => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = shape;
      osc.frequency.setValueAtTime(f1, now + start);
      osc.frequency.exponentialRampToValueAtTime(f2, now + start + dur);
      g.gain.setValueAtTime(vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start); osc.stop(now + start + dur + 0.01);
    };

    switch (type) {
      case "attack":
        tone(200, 0, 0.08, 0.28, "square");
        tone(100, 0, 0.14, 0.18, "sawtooth");
        break;
      case "dodge":
        sweep(500, 1100, 0, 0.14, 0.12, "sine");
        break;
      case "crit":
        tone(80,  0, 0.55, 0.5, "sawtooth");
        tone(180, 0, 0.30, 0.4, "square");
        tone(360, 0, 0.18, 0.3, "sine");
        break;
      case "ko":
        sweep(380, 55, 0, 0.75, 0.4, "sine");
        tone(110, 0.1, 0.5, 0.2, "sawtooth");
        break;
      case "champion":
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.28, 0.3, "sine"));
        break;
    }
  } catch {}
}

// ── Tournament simulation ──────────────────────────────────────────────────
function simulateFight(left, right, leftStartHp) {
  let leftHp  = leftStartHp;
  let rightHp = right.stats.health;
  const log   = [];

  for (let round = 0; round < 200; round++) {
    const pairs = left.stats.speed > right.stats.speed ||
      (left.stats.speed === right.stats.speed && left.stats.sneaky >= right.stats.sneaky)
      ? [[left, right], [right, left]]
      : [[right, left], [left, right]];

    for (const [atk, def] of pairs) {
      const defHpRef = atk.id === left.id ? { get: () => rightHp, set: v => rightHp = v }
                                           : { get: () => leftHp,  set: v => leftHp  = v };
      const atkHpRef = atk.id === left.id ? { get: () => leftHp }
                                           : { get: () => rightHp };

      if (defHpRef.get() <= 0) continue;

      const dodgeChance = Math.min(def.stats.sneaky * 0.04, 0.35);
      if (Math.random() < dodgeChance) {
        log.push({ type: "dodge", attackerId: atk.id, defenderId: def.id,
          text: `${def.emoji} ${def.name} dodges!` });
        continue;
      }

      let dmg = Math.max(1, Math.round(atk.stats.damage * (0.8 + Math.random() * 0.4)));
      const isCrit = atk.stats.sneaky >= 8 && Math.random() < 0.15;
      if (isCrit) dmg *= 2;

      defHpRef.set(Math.max(0, defHpRef.get() - dmg));
      log.push({
        type: isCrit ? "crit" : "attack",
        attackerId: atk.id, defenderId: def.id,
        damage: dmg, defenderHpAfter: defHpRef.get(),
        text: isCrit
          ? `💥 CRIT! ${atk.emoji} ${atk.name} hits ${def.emoji} ${def.name} for ${dmg}!`
          : `${atk.emoji} ${atk.name} hits ${def.emoji} ${def.name} for ${dmg}.`,
      });

      if (defHpRef.get() <= 0) {
        log.push({ type: "ko", attackerId: atk.id, defenderId: def.id,
          text: `⭐ ${def.emoji} ${def.name} is defeated!` });
        const winnerId  = atk.id;
        const winnerEndHp = atkHpRef.get();
        return { winnerId, winnerEndHp, log };
      }
    }
  }

  // Fallback: whoever has more HP wins
  const winnerId  = leftHp >= rightHp ? left.id : right.id;
  const winnerEndHp = leftHp >= rightHp ? leftHp : rightHp;
  log.push({ type: "ko", attackerId: winnerId, defenderId: winnerId === left.id ? right.id : left.id,
    text: "⏱️ Time's up — most HP wins!" });
  return { winnerId, winnerEndHp, log };
}

function simulateTourney(allTreasures) {
  const fighters = allTreasures.map(t => ({ ...t, stats: getTreasureStats(t) }));
  for (let i = fighters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fighters[i], fighters[j]] = [fighters[j], fighters[i]];
  }

  const matchups = [];
  let current = { ...fighters[0], currentHp: fighters[0].stats.health };

  for (let i = 1; i < fighters.length; i++) {
    const challenger = fighters[i];
    const result = simulateFight(current, challenger, current.currentHp);
    matchups.push({
      left:     { ...current,    startHp: current.currentHp },
      right:    { ...challenger, startHp: challenger.stats.health },
      log:      result.log,
      winnerId: result.winnerId,
    });
    if (result.winnerId === current.id) {
      current = { ...current, currentHp: result.winnerEndHp };
    } else {
      current = { ...challenger, currentHp: result.winnerEndHp };
    }
  }

  return { matchups, winnerId: current.id };
}

function computeHpFromLog(matchup, side, events) {
  const fighter  = side === "left" ? matchup.left : matchup.right;
  const startHp  = fighter.startHp;
  let hp = startHp;
  for (const ev of events) {
    if (ev.defenderId === fighter.id && ev.defenderHpAfter !== undefined) {
      hp = ev.defenderHpAfter;
    }
  }
  return Math.max(0, hp);
}

// ── Storage helpers ────────────────────────────────────────────────────────
const dateToKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayKey = () => dateToKey(new Date());
const keyToDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (k, n) => {
  const d = keyToDate(k);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
};
const formatDay = (k) => {
  const d = keyToDate(k);
  const today = todayKey();
  const yest = addDays(today, -1);
  if (k === today) return `Today · ${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`;
  if (k === yest)  return `Yesterday · ${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

const STORAGE_KEY = "splashy.v2";

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const saveState = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

// ── Splash particle ─────────────────────────────────────────────────────────
function Splash({ x, y, color, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  const drops = useMemo(() => Array.from({length: 9}, (_, i) => ({
    angle: (i / 9) * Math.PI * 2 + Math.random() * 0.4,
    dist: 40 + Math.random() * 50,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 60,
  })), []);
  return (
    <div className="splash-burst" style={{ left: x, top: y }}>
      {drops.map((d, i) => (
        <span
          key={i}
          className="splash-drop"
          style={{
            background: color,
            width: d.size, height: d.size,
            "--dx": `${Math.cos(d.angle) * d.dist}px`,
            "--dy": `${Math.sin(d.angle) * d.dist}px`,
            animationDelay: `${d.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Big water bottle viz ────────────────────────────────────────────────────
function Bottle({ pct, goal, ozCounted, theme, log, drinks }) {
  const fillPct = Math.max(0, Math.min(1, pct));
  const tickMarks = [0.25, 0.5, 0.75, 1.0];
  const reachedGoal = fillPct >= 1;

  const drinkMap = useMemo(() => Object.fromEntries((drinks || []).map(d => [d.id, d])), [drinks]);
  const segments = useMemo(() => (log || []).map(entry => {
    const drink = drinkMap[entry.drinkId];
    const isWater = drink?.waterPct === 1.0;
    return {
      heightPct: (entry.water / goal) * 100,
      color: isWater ? theme.water : (DRINK_SEGMENT_COLOR[entry.drinkId] || theme.water),
    };
  }), [log, drinkMap, goal, theme]);

  return (
    <div className={`bottle-wrap ${reachedGoal ? "goal" : ""}`}>
      <div className="bottle">
        <div className="bottle-cap" />
        <div className="bottle-neck" />
        <div className="bottle-body">
          <div className="bottle-shine" />
          <div className="bottle-fill" style={{ height: `${fillPct * 100}%` }}>
            <div className="bottle-segments">
              {segments.map((seg, i) => (
                <div key={i} className="bottle-segment" style={{ height: `${seg.heightPct}%`, background: seg.color }} />
              ))}
            </div>
            <svg className="wave" viewBox="0 0 200 20" preserveAspectRatio="none">
              <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" />
            </svg>
            <svg className="wave wave2" viewBox="0 0 200 20" preserveAspectRatio="none">
              <path d="M0 10 Q 25 20 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" />
            </svg>
            {Array.from({length: 6}).map((_, i) => (
              <span key={i} className="bubble" style={{
                left: `${10 + i * 14}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }} />
            ))}
          </div>
          <div className="bottle-ticks">
            {tickMarks.map((t, i) => (
              <div key={i} className="tick" style={{ bottom: `${t * 100}%` }}>
                <span>{Math.round(t * goal)}</span>
              </div>
            ))}
          </div>
          <div className="bottle-readout">
            <div className="readout-oz">{Math.round(ozCounted)}</div>
            <div className="readout-of">of {goal} oz</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Drink button ───────────────────────────────────────────────────────────
function DrinkButton({ drink, onTap }) {
  const ref = useRef(null);
  const handle = () => {
    const r = ref.current.getBoundingClientRect();
    onTap(drink, r.left + r.width / 2, r.top + r.height / 2);
  };
  return (
    <button
      ref={ref}
      className={`drink-btn drink-${drink.id}`}
      onClick={handle}
      style={{ "--accent": drink.color }}
    >
      <span className={`drink-icon ${typeof drink.icon === "string" ? "is-emoji" : "is-svg"}`}>{drink.icon}</span>
      <span className="drink-label">{drink.label}</span>
      <span className="drink-meta">
        {drink.oz} oz{drink.waterPct < 1 && <em> · {Math.round(drink.waterPct * 100)}% water</em>}
      </span>
    </button>
  );
}

// ── Treasure reveal modal ──────────────────────────────────────────────────
function RevealModal({ treasure, onClose }) {
  const [stage, setStage] = useState("chest");
  useEffect(() => {
    const t1 = setTimeout(() => setStage("opening"), 900);
    const t2 = setTimeout(() => setStage("reveal"),  1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const tint = TREASURE_TINTS[treasure.rarity];
  return (
    <div className="reveal-backdrop" onClick={onClose}>
      <div className="reveal-card" onClick={(e) => e.stopPropagation()}>
        {stage !== "reveal" && (
          <div className={`chest ${stage === "opening" ? "open" : ""}`}>
            <div className="chest-lid" />
            <div className="chest-base" />
            <div className="chest-band" />
            <div className="chest-lock" />
            <div className="chest-glow" />
          </div>
        )}
        {stage === "reveal" && (
          <div className="prize" style={{ "--prize-bg": tint.bg, "--prize-ring": tint.ring }}>
            <div className="prize-rays" />
            <div className="prize-disc">
              <span className="prize-emoji">{treasure.emoji}</span>
            </div>
            <div className="prize-rarity" style={{ color: tint.ring }}>★ {tint.label}</div>
            <div className="prize-name">{treasure.name}</div>
            <div className="prize-sub">Added to your collection</div>
            <button className="prize-close" onClick={onClose}>Awesome!</button>
          </div>
        )}
        {stage !== "reveal" && (
          <div className="chest-caption">Opening today's treasure…</div>
        )}
      </div>
    </div>
  );
}

// ── Name prompt modal (first visit) ────────────────────────────────────────
function NamePrompt({ onSave }) {
  const [name, setName] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onSave(name.trim() || "Friend");
  };
  return (
    <div className="reveal-backdrop">
      <div className="reveal-card name-prompt-card">
        <div className="name-prompt-emoji">💧</div>
        <h2 className="name-prompt-title">Welcome to Splashy!</h2>
        <p className="name-prompt-sub">What's your name?</p>
        <form onSubmit={submit}>
          <input
            className="name-prompt-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <button type="submit" className="prize-close">Let's go! 🚀</button>
        </form>
      </div>
    </div>
  );
}

// ── Tournament components ──────────────────────────────────────────────────
function TourneyIntro({ fighters, onStart }) {
  useEffect(() => {
    const t = setTimeout(onStart, 2800);
    return () => clearTimeout(t);
  }, [onStart]);
  return (
    <div className="tourney-intro">
      <div className="tourney-intro__title">⚔️ Tournament!</div>
      <div className="tourney-intro__subtitle">{fighters.length} fighters enter…</div>
      <div className="tourney-intro__roster">
        {fighters.map((c, i) => (
          <span key={c.t.id} className="tourney-intro__fighter"
                style={{ animationDelay: `${i * 80}ms` }}>
            {c.t.emoji}
          </span>
        ))}
      </div>
      <button className="prize-close" onClick={onStart}>Battle! ⚔️</button>
    </div>
  );
}

function FighterCard({ fighter, side, hpMax, hpNow, winnerId, animState }) {
  const isWinner = fighter.id === winnerId;
  const tint     = TREASURE_TINTS[fighter.rarity];
  const hpPct    = Math.max(0, Math.min(1, hpNow / hpMax));
  const hpColor  = hpPct > 0.5 ? "#4CAF50" : hpPct > 0.25 ? "#FF9800" : "#F44336";

  let extra = "";
  if (animState === "smashing" || animState === "loser-out" || animState === "done") {
    extra = isWinner ? " fighter-card--smash" : " fighter-card--loser-shake";
  }
  if (animState === "loser-out" && !isWinner) extra += " fighter-card--loser-exit";

  return (
    <div className={`fighter-card fighter-card--${side}${extra}`}
         style={{ "--cell-bg": tint.bg, "--cell-ring": tint.ring }}>
      <div className="fighter-card__emoji">{fighter.emoji}</div>
      <div className="fighter-card__name">{fighter.name}</div>
      <div className="fighter-card__hp-bar">
        <div className="fighter-card__hp-fill"
             style={{ width: `${hpPct * 100}%`, background: hpColor }} />
      </div>
      <div className="fighter-card__hp-label">
        {Math.max(0, Math.round(hpNow))} / {hpMax}
      </div>
      <div className="fighter-card__stats">
        <span>❤️ {fighter.stats.health}</span>
        <span>⚡ {fighter.stats.speed}</span>
        <span>👁️ {fighter.stats.sneaky}</span>
        <span>⚔️ {fighter.stats.damage}</span>
      </div>
    </div>
  );
}

function BattleLog({ events }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);
  return (
    <div className="battle-log" ref={ref}>
      {events.map((ev, i) => (
        <div key={i} className={`battle-log__event battle-log__event--${ev.type}`}>
          {ev.text}
        </div>
      ))}
    </div>
  );
}

function TourneyBattle({ matchup, matchupIndex, totalMatchups, onMatchupDone }) {
  const [logVisible, setLogVisible] = useState([]);
  const [animState, setAnimState]   = useState("idle");

  useEffect(() => {
    setLogVisible([]);
    setAnimState("idle");
    const delay = matchup.log.length > 25 ? Math.max(180, 14000 / matchup.log.length) : 500;
    let i = 0;
    const id = setInterval(() => {
      if (i < matchup.log.length) {
        const ev = matchup.log[i++];
        playSound(ev.type === "crit" ? "crit" : ev.type === "dodge" ? "dodge" : ev.type === "ko" ? "ko" : "attack");
        setLogVisible(prev => [...prev, ev]);
      } else {
        clearInterval(id);
        setAnimState("smashing");
        setTimeout(() => setAnimState("loser-out"), 900);
        setTimeout(() => setAnimState("done"), 1600);
        setTimeout(onMatchupDone, 3200);
      }
    }, delay);
    return () => clearInterval(id);
  }, [matchup]);

  const leftHp  = computeHpFromLog(matchup, "left",  logVisible);
  const rightHp = computeHpFromLog(matchup, "right", logVisible);

  return (
    <div className="tourney-battle">
      <div className="tourney-battle__header">
        Match {matchupIndex + 1} / {totalMatchups}
      </div>
      <div className="tourney-arena">
        <FighterCard fighter={matchup.left}  side="left"
          hpMax={matchup.left.stats.health}    hpNow={leftHp}
          winnerId={matchup.winnerId} animState={animState} />
        <div className="tourney-vs">VS</div>
        <FighterCard fighter={matchup.right} side="right"
          hpMax={matchup.right.stats.health}   hpNow={rightHp}
          winnerId={matchup.winnerId} animState={animState} />
      </div>
      <BattleLog events={logVisible} />
    </div>
  );
}

function TourneyChampion({ champion, tourney, onClose }) {
  useEffect(() => { playSound("champion"); }, []);
  const tint      = TREASURE_TINTS[champion.rarity];
  const totalWins = (tourney.wins[champion.id] || 0);
  return (
    <div className="tourney-champion">
      <div className="tourney-champion__rays" style={{ "--prize-ring": tint.ring }} />
      <div className="tourney-champion__crown">👑</div>
      <div className="prize-disc tourney-champion__disc"
           style={{ "--prize-bg": tint.bg, "--prize-ring": tint.ring }}>
        <span className="tourney-champion__emoji">{champion.emoji}</span>
      </div>
      <div className="prize-rarity tourney-champion__label" style={{ color: tint.ring }}>
        Champion!
      </div>
      <div className="tourney-champion__name">{champion.name}</div>
      <div className="tourney-champion__wins">
        ⚔️ {totalWins} tournament win{totalWins !== 1 ? "s" : ""}
      </div>
      <button className="prize-close" onClick={onClose}>Amazing! 🎉</button>
    </div>
  );
}

function TournamentModal({ collectedAwards, tourney, onClose, onWin }) {
  const [phase, setPhase]             = useState("intro");
  const [matchupIndex, setMatchupIndex] = useState(0);
  const hasRecordedWin                = useRef(false);

  const [result] = useState(() => simulateTourney(collectedAwards.map(c => c.t)));

  useEffect(() => {
    if (phase === "champion" && !hasRecordedWin.current) {
      hasRecordedWin.current = true;
      onWin(result.winnerId);
    }
  }, [phase]);

  const champion = collectedAwards.find(c => c.t.id === result.winnerId)?.t;

  return (
    <div className="reveal-backdrop" onClick={() => {}}>
      <div className="tourney-modal" onClick={e => e.stopPropagation()}>
        {phase === "intro" && (
          <TourneyIntro fighters={collectedAwards} onStart={() => setPhase("battle")} />
        )}
        {phase === "battle" && (
          <TourneyBattle
            matchup={result.matchups[matchupIndex]}
            matchupIndex={matchupIndex}
            totalMatchups={result.matchups.length}
            onMatchupDone={() => {
              if (matchupIndex + 1 < result.matchups.length) {
                setMatchupIndex(i => i + 1);
              } else {
                setPhase("champion");
              }
            }}
          />
        )}
        {phase === "champion" && champion && (
          <TourneyChampion champion={champion} tourney={tourney} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = {
  kidName: "",
  dailyGoal: 40,
  theme: "ocean",
  showCollection: true,
};

const THEMES = {
  ocean: {
    bg1: "#BFE6FF", bg2: "#E8F6FF", accent: "#FF8A65",
    water: "linear-gradient(180deg,#7FC8FF 0%,#3A8BD9 100%)",
    chip: "#2C7CD6",
  },
  meadow: {
    bg1: "#D5F0C8", bg2: "#F4FBEC", accent: "#F49AC1",
    water: "linear-gradient(180deg,#88D78A 0%,#3A9B5C 100%)",
    chip: "#3A9B5C",
  },
  galaxy: {
    bg1: "#C9C0FF", bg2: "#EDE9FF", accent: "#FFD166",
    water: "linear-gradient(180deg,#A48BFF 0%,#5536C6 100%)",
    chip: "#5536C6",
  },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = THEMES[t.theme] || THEMES.ocean;

  const today = todayKey();
  const [viewedDay, setViewedDay] = useState(today);
  const [days, setDays] = useState({});
  const [tourney, setTourney] = useState({ lastDate: null, wins: {} });
  const [splashes, setSplashes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hydrate
  useEffect(() => {
    const s = loadState();
    if (s?.days)   setDays(s.days);
    if (s?.tourney) setTourney(s.tourney);
  }, []);
  // Persist
  useEffect(() => { saveState({ days, tourney }); }, [days, tourney]);

  const isToday = viewedDay === today;
  const dayData = days[viewedDay] || { log: [], revealed: false, prize: null };
  const { log, revealed, prize } = dayData;

  const totalWater = log.reduce((s, e) => s + e.water, 0);
  const pct = totalWater / t.dailyGoal;
  const reachedGoal = totalWater >= t.dailyGoal;

  const patchDay = (k, patch) => {
    setDays((cur) => {
      const old = cur[k] || { log: [], revealed: false, prize: null };
      return { ...cur, [k]: { ...old, ...patch } };
    });
  };

  const addDrink = useCallback((drink, x, y) => {
    if (viewedDay !== today) return;
    const entry = {
      id: Date.now() + Math.random(), drinkId: drink.id, oz: drink.oz,
      water: drink.oz * drink.waterPct, ts: Date.now(),
    };
    setDays((cur) => {
      const old = cur[today] || { log: [], revealed: false, prize: null };
      return { ...cur, [today]: { ...old, log: [...old.log, entry] } };
    });
    setSplashes((cur) => [...cur, { id: Date.now() + Math.random(), x, y, color: drink.color }]);
  }, [viewedDay, today]);

  const undoLast = () => {
    if (!isToday) return;
    setDays((cur) => {
      const old = cur[today] || { log: [], revealed: false, prize: null };
      return { ...cur, [today]: { ...old, log: old.log.slice(0, -1) } };
    });
  };

  const openTreasure = () => {
    if (!reachedGoal) return;
    const p = prize || drawTreasureForDay(viewedDay);
    patchDay(viewedDay, { revealed: true, prize: p });
    setShowModal(true);
  };

  const resetToday = () => patchDay(today, { log: [], revealed: false, prize: null });
  const resetEverything = () => { setDays({}); setTourney({ lastDate: null, wins: {} }); };

  const recordTourneyWin = useCallback((treasureId) => {
    setTourney(cur => ({
      lastDate: todayKey(),
      wins: { ...cur.wins, [treasureId]: (cur.wins[treasureId] || 0) + 1 },
    }));
  }, []);

  const collectionDetail = Object.entries(days)
    .filter(([, d]) => d.prize)
    .map(([k, d]) => ({ day: k, t: d.prize, rarity: d.prize.rarity }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  const canRunTourney = collectionDetail.length >= 2 && tourney.lastDate !== todayKey();

  // Day navigation
  const goPrev  = () => setViewedDay((k) => addDays(k, -1));
  const goNext  = () => { if (viewedDay < today) setViewedDay((k) => addDays(k, +1)); };
  const goToday = () => setViewedDay(today);
  const canGoNext = viewedDay < today;

  // Settings panel open/close sync
  const openSettings = () => {
    setSettingsOpen(true);
    window.postMessage({ type: "__activate_edit_mode" }, "*");
  };

  return (
    <div className="app" style={{
      "--bg-1": theme.bg1, "--bg-2": theme.bg2,
      "--accent": theme.accent, "--chip": theme.chip,
    }}>
      {/* First-time name prompt */}
      {!t.kidName && (
        <NamePrompt onSave={(name) => setTweak("kidName", name)} />
      )}

      <div className="bg-blobs" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
      </div>

      <header className="hdr">
        <div className="hdr-greet">
          <div className="hdr-hi">Hi, {t.kidName || "there"}!</div>
          <div className="hdr-daynav">
            <button className="day-arrow" onClick={goPrev} aria-label="Previous day">‹</button>
            <div className="hdr-date">{formatDay(viewedDay)}</div>
            <button className="day-arrow" onClick={goNext} aria-label="Next day" disabled={!canGoNext}>›</button>
            {!isToday && <button className="day-today" onClick={goToday}>Jump to today</button>}
          </div>
        </div>
        <div className="hdr-right">
          <div className="hdr-top-row">
            <div className="theme-picker" role="group" aria-label="Pick a theme">
              <button className={`th-opt ${t.theme === "ocean" ? "active" : ""}`}
                      onClick={() => setTweak("theme", "ocean")}>
                <span className="th-dot th-ocean" />Ocean
              </button>
              <button className={`th-opt ${t.theme === "galaxy" ? "active" : ""}`}
                      onClick={() => setTweak("theme", "galaxy")}>
                <span className="th-dot th-galaxy" />Galaxy
              </button>
            </div>
            <button className="settings-btn" onClick={openSettings} aria-label="Open settings" title="Settings">
              ⚙️
            </button>
          </div>
          <div className="hdr-streak">
            <span className="streak-flame">🔥</span>
            <div>
              <b>{collectionDetail.length}</b>
              <em>day{collectionDetail.length === 1 ? "" : "s"} collected</em>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="left-col">
          <Bottle pct={pct} goal={t.dailyGoal} ozCounted={totalWater} theme={theme} log={log} drinks={DRINKS} />

          {reachedGoal && !revealed && (
            <button className="treasure-cta" onClick={openTreasure}>
              <span className="cta-spark">✨</span>
              <span className="cta-main">
                <b>{isToday ? "You did it!" : "Goal reached that day!"}</b>
                <em>Tap to open {isToday ? "today" : "this day"}'s treasure</em>
              </span>
              <span className="cta-spark">✨</span>
            </button>
          )}
          {reachedGoal && revealed && prize && (
            <button className="treasure-cta done" onClick={() => setShowModal(true)}>
              <span className="cta-main">
                <b>{isToday ? "Today" : "That day"}'s treasure: {prize.name} {prize.emoji}</b>
                <em>Tap to see it again</em>
              </span>
            </button>
          )}
          {!reachedGoal && isToday && (
            <div className="encourage">
              <b>{Math.max(0, Math.ceil(t.dailyGoal - totalWater))} oz</b> to go until today's treasure!
            </div>
          )}
          {!reachedGoal && !isToday && (
            <div className="encourage past">
              No treasure that day — only made it to <b>{Math.round(totalWater)} of {t.dailyGoal} oz</b>.
            </div>
          )}
        </section>

        <section className="right-col">
          <h3 className="col-h">{isToday ? "What did you drink?" : "What was drunk that day"}</h3>
          {isToday ? (
            <div className="drink-grid">
              {DRINKS.map((d) => <DrinkButton key={d.id} drink={d} onTap={addDrink} />)}
            </div>
          ) : (
            <div className="past-banner">
              <span className="past-emoji">📅</span>
              <div className="past-text">
                <b>Looking back</b>
                <em>Drinks can only be added to today.</em>
              </div>
              <button className="past-btn" onClick={goToday}>Today ›</button>
            </div>
          )}

          <div className="log-card">
            <div className="log-h">
              <h4>{isToday ? "Today's sips" : "Sips that day"}</h4>
              {isToday && log.length > 0 && <button className="undo" onClick={undoLast}>↺ Undo</button>}
            </div>
            {log.length === 0 ? (
              <div className="log-empty">
                {isToday ? "Tap a drink above when you take a sip 💧" : "Nothing was logged that day."}
              </div>
            ) : (
              <ul className="log-list">
                {[...log].reverse().slice(0, 6).map((e) => {
                  const drink = DRINKS.find((d) => d.id === e.drinkId);
                  return (
                    <li key={e.id} className="log-row">
                      <span className={`log-emoji ${typeof drink.icon === "string" ? "is-emoji" : "is-svg"}`}>{drink.icon}</span>
                      <span className="log-name">{drink.label}</span>
                      <span className="log-oz">+{Math.round(e.water)} oz</span>
                      <span className="log-ts">{new Date(e.ts).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</span>
                    </li>
                  );
                })}
                {log.length > 6 && <li className="log-more">+{log.length - 6} more earlier that day</li>}
              </ul>
            )}
          </div>
        </section>
      </main>

      {t.showCollection && (
        <section className="collection">
          <div className="coll-h">
            <h3>My Treasures</h3>
            <span className="coll-count">{collectionDetail.length} / ∞</span>
          </div>
          <button
            className={`tourney-btn${!canRunTourney ? " tourney-btn--disabled" : ""}`}
            onClick={() => canRunTourney && setShowTournament(true)}
            disabled={!canRunTourney}
            title={
              collectionDetail.length < 2 ? "Collect 2+ treasures to unlock" :
              tourney.lastDate === todayKey() ? "Already battled today — come back tomorrow!" :
              "Start the tournament!"
            }
          >
            ⚔️ Tournament
            {tourney.lastDate === todayKey() && <span className="tourney-btn__done">✓ Done today</span>}
          </button>
          <div className="coll-grid">
            {collectionDetail.length === 0 && (
              Array.from({length: 8}).map((_, i) => (
                <div key={i} className="coll-cell empty">?</div>
              ))
            )}
            {collectionDetail.map((c) => {
              const tint = TREASURE_TINTS[c.rarity];
              return (
                <button key={c.day} className={`coll-cell ${viewedDay === c.day ? "viewing" : ""}`}
                     onClick={() => setViewedDay(c.day)}
                     style={{ "--cell-bg": tint.bg, "--cell-ring": tint.ring }}
                     title={`${c.t.name} · ${tint.label} · ${c.day}`}>
                  <span className="coll-emoji">{c.t.emoji}</span>
                  <span className="coll-name">{c.t.name}</span>
                  {(tourney.wins[c.t.id] > 0) && (
                    <span className="coll-win-badge">⚔️ {tourney.wins[c.t.id]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Splash overlay */}
      <div className="splash-layer">
        {splashes.map((s) => (
          <Splash key={s.id} x={s.x} y={s.y} color={s.color}
                  onDone={() => setSplashes((cur) => cur.filter((p) => p.id !== s.id))} />
        ))}
      </div>

      {showModal && prize && <RevealModal treasure={prize} onClose={() => setShowModal(false)} />}
      {showTournament && (
        <TournamentModal
          collectedAwards={collectionDetail}
          tourney={tourney}
          onClose={() => setShowTournament(false)}
          onWin={recordTourneyWin}
        />
      )}}

      <TweaksPanel title="Settings" onOpen={() => setSettingsOpen(true)} onClose={() => setSettingsOpen(false)}>
        <TweakSection label="Profile" />
        <TweakText  label="Name" value={t.kidName} placeholder="Your name" onChange={(v) => setTweak("kidName", v)} />
        <TweakSlider label="Daily goal" value={t.dailyGoal} min={16} max={64} step={4} unit=" oz"
                     onChange={(v) => setTweak("dailyGoal", v)} />
        <TweakSection label="Look" />
        <TweakRadio label="Theme" value={t.theme} options={["ocean","galaxy","meadow"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakToggle label="Show collection" value={t.showCollection}
                     onChange={(v) => setTweak("showCollection", v)} />
        <TweakSection label="Reset" />
        <TweakButton label="Reset today" onClick={resetToday} secondary />
        <TweakButton label="Reset everything" onClick={resetEverything} secondary />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
