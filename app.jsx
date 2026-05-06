/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Tweak defaults ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3d4a3a",
  "bgWarmth": 0.5,
  "soundOn": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  { value: '#3d4a3a', label: '森' },
  { value: '#8b3a2a', label: '朱' },
  { value: '#1a1a1a', label: '墨' },
  { value: '#a08560', label: '砂' },
];

// ---------- Sound (Web Audio, short procedural blips) ----------
const audioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext))
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  if (type === 'shuffle') {
    // soft paper rustle
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * 0.15;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.7;
    src.connect(filter).connect(audioCtx.destination);
    src.start();
  } else if (type === 'flip') {
    // soft chime
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    o.frequency.exponentialRampToValueAtTime(440, now + 0.3);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o.connect(g).connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.5);
  } else if (type === 'tap') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    o.connect(g).connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.1);
  }
}

// ---------- Helpers ----------
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function dayOfWeekJP() {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date().getDay()] + '曜日';
}

// ---------- Card Back SVG (paper/ink stamp pattern) ----------
function CardBack({ accent }) {
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <pattern id="paperGrain" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#ebe2d3" />
          <circle cx="1" cy="1" r="0.3" fill="#d4c8b0" opacity="0.5" />
          <circle cx="3" cy="3" r="0.2" fill="#c9bca3" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100" height="150" fill="url(#paperGrain)" />
      <rect x="4" y="4" width="92" height="142" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.6" />
      <rect x="7" y="7" width="86" height="136" fill="none" stroke={accent} strokeWidth="0.2" opacity="0.4" />
      {/* center motif - simple sun/moon */}
      <circle cx="50" cy="75" r="18" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.7" />
      <circle cx="50" cy="75" r="12" fill="none" stroke={accent} strokeWidth="0.3" opacity="0.5" />
      <circle cx="50" cy="75" r="4" fill={accent} opacity="0.85" />
      {/* tiny rays */}
      {Array.from({length: 12}).map((_, i) => {
        const a = (i * 30) * Math.PI / 180;
        const x1 = 50 + Math.cos(a) * 22;
        const y1 = 75 + Math.sin(a) * 22;
        const x2 = 50 + Math.cos(a) * 26;
        const y2 = 75 + Math.sin(a) * 26;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="0.4" opacity="0.6" />;
      })}
      {/* corner marks */}
      <text x="10" y="16" fontSize="6" fill={accent} opacity="0.7" fontFamily="serif">占</text>
      <text x="90" y="142" fontSize="6" fill={accent} opacity="0.7" fontFamily="serif" textAnchor="end">卜</text>
    </svg>
  );
}

// ---------- Fan-spread Deck ----------
function FanDeck({ cards, onPick, picked, shuffleKey, accent }) {
  const N = cards.length;
  const ref = useRef(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const update = () => {
      if (ref.current) setWidth(ref.current.offsetWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Geometry: lay cards on a wide shallow arc that fits the viewport.
  // The arc spans almost the full width; sagitta (depth) ~ 1/4 width.
  const arcWidth = width;
  const sagitta = Math.max(60, width * 0.18);
  // chord = arcWidth, sagitta = s -> radius r = (s^2 + (chord/2)^2) / (2s)
  const r = (sagitta * sagitta + (arcWidth / 2) ** 2) / (2 * sagitta);
  // half-angle subtended
  const halfAngleRad = Math.asin((arcWidth / 2) / r);
  const halfAngleDeg = halfAngleRad * 180 / Math.PI;

  return (
    <div className="fan-deck" style={{ '--accent': accent }} ref={ref}>
      {cards.map((card, i) => {
        // angle goes from -halfAngle to +halfAngle
        const t = N > 1 ? i / (N - 1) : 0.5;
        const angleDeg = -halfAngleDeg + t * (2 * halfAngleDeg);
        const isPicked = picked === i;
        // Anchor point: center-top of fan-deck. Cards rotate around (centerX, centerY+r)
        // Place pivot below the deck by r, so rotated cards sit on the arc.
        return (
          <button
            key={`${shuffleKey}-${i}`}
            className={`fan-card${isPicked ? ' is-picked' : ''}`}
            style={{
              transform: `translate(-50%, 0) rotate(${angleDeg}deg)`,
              transformOrigin: `center ${r}px`,
              animationDelay: `${i * 6}ms`,
              zIndex: isPicked ? 200 : i,
            }}
            onClick={() => onPick(i)}
            disabled={picked !== null}
            aria-label={`第 ${i + 1} 張牌 ${card.name}`}
          >
            <div className="fan-card-inner">
              <CardBack accent={accent} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Reveal: 3D flip card ----------
function RevealCard({ card, accent, onClose, onShare }) {
  const [flipped, setFlipped] = useState(false);
  const [textShown, setTextShown] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 200);
    const t2 = setTimeout(() => setTextShown(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="reveal-overlay" onClick={onClose}>
      <div className="reveal-stage" onClick={e => e.stopPropagation()}>
        <div className={`flip-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face flip-back">
            <CardBack accent={accent} />
          </div>
          <div className="flip-face flip-front">
            {imgError ? (
              <div className="card-fallback">
                <div className="card-fallback-name">{card.name}</div>
              </div>
            ) : (
              <img
                src={card.img}
                alt={card.name}
                onError={() => setImgError(true)}
                draggable={false}
              />
            )}
            <div className="flip-front-frame" style={{ borderColor: accent }} />
          </div>
        </div>

        <div className={`reveal-text ${textShown ? 'is-shown' : ''}`}>
          <div className="reveal-meta">
            <span className="reveal-date">{todayStr()}　{dayOfWeekJP()}</span>
            <span className="reveal-divider" style={{ background: accent }} />
            <span className="reveal-tag">今日のひとこと</span>
          </div>
          <h2 className="reveal-name">{card.name}</h2>
          <p className="reveal-desc">{card.description}</p>

          <div className="reveal-actions">
            <button className="btn-ghost" onClick={onShare}>分享卡片</button>
            <button className="btn-primary" style={{ background: accent }} onClick={onClose}>再抽一張</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Share Card Modal ----------
function ShareCard({ card, accent, onClose }) {
  const ref = useRef(null);

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-wrap" onClick={e => e.stopPropagation()}>
        <div className="share-card" ref={ref} style={{ '--accent': accent }}>
          <div className="share-header">
            <span className="share-jp">今日の占い</span>
            <span className="share-date">{todayStr()}</span>
          </div>
          <div className="share-mini-card">
            <img src={card.img} alt={card.name} draggable={false}
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="share-name">{card.name}</div>
          <div className="share-desc">{card.description}</div>
          <div className="share-footer">
            <span className="share-stamp" style={{ borderColor: accent, color: accent }}>占</span>
            <span className="share-foot-text">日々の小さな指針</span>
          </div>
        </div>
        <div className="share-tip">截圖此卡片即可分享 ✿</div>
        <button className="btn-ghost share-close" onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

// ---------- History Drawer ----------
function HistoryDrawer({ open, onClose, history, onClear }) {
  return (
    <div className={`history-drawer ${open ? 'is-open' : ''}`}>
      <div className="history-head">
        <h3>抽牌紀錄</h3>
        <button className="icon-btn" onClick={onClose} aria-label="close">×</button>
      </div>
      {history.length === 0 ? (
        <p className="history-empty">尚無紀錄。<br/>抽一張牌，留下今日的指引吧。</p>
      ) : (
        <ul className="history-list">
          {history.map((h, i) => (
            <li key={i} className="history-item">
              <div className="history-row1">
                <span className="history-date">{h.date}</span>
                <span className="history-name">{h.name}</span>
              </div>
              <div className="history-desc">{h.description}</div>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <button className="history-clear" onClick={onClear}>清除全部紀錄</button>
      )}
    </div>
  );
}

// ---------- Main App ----------
function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [phase, setPhase] = useState('idle'); // idle | shuffling | spread | revealed
  const [deck, setDeck] = useState(() => shuffle(window.TAROT_CARDS));
  const [shuffleKey, setShuffleKey] = useState(0);
  const [picked, setPicked] = useState(null);
  const [showReveal, setShowReveal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tarot-history') || '[]'); }
    catch { return []; }
  });

  const setTweak = (k, v) => setTweaks(p => ({ ...p, [k]: v }));

  // Tweaks panel mount/unmount via toolbar (custom protocol)
  useEffect(() => {
    function onMsg(e) {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setShowTweaks(true);
      if (d.type === '__deactivate_edit_mode') setShowTweaks(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    // bg warmth: blend between cool-cream and warm-cream
    const w = tweaks.bgWarmth;
    const bg = `oklch(${0.96 - w * 0.02} 0.018 ${70 + w * 20})`;
    const bg2 = `oklch(${0.92 - w * 0.02} 0.025 ${70 + w * 20})`;
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--bg-deep', bg2);
  }, [tweaks.accent, tweaks.bgWarmth]);

  const handleShuffle = useCallback(() => {
    if (tweaks.soundOn) playSound('shuffle');
    setPicked(null);
    setShowReveal(false);
    setPhase('shuffling');
    setTimeout(() => {
      setDeck(shuffle(window.TAROT_CARDS));
      setShuffleKey(k => k + 1);
      setPhase('spread');
    }, 900);
  }, [tweaks.soundOn]);

  const handlePick = useCallback((i) => {
    if (tweaks.soundOn) playSound('flip');
    setPicked(i);
    setTimeout(() => {
      setShowReveal(true);
      setPhase('revealed');
      // record history
      const card = deck[i];
      const entry = { name: card.name, description: card.description, date: todayStr(), ts: Date.now() };
      setHistory(h => {
        const next = [entry, ...h].slice(0, 50);
        localStorage.setItem('tarot-history', JSON.stringify(next));
        return next;
      });
    }, 600);
  }, [deck, tweaks.soundOn]);

  const closeReveal = () => {
    setShowReveal(false);
    setPicked(null);
    setPhase('idle');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('tarot-history');
  };

  const pickedCard = picked !== null ? deck[picked] : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-jp">日々の占い</div>
          <h1 className="brand-zh">今日のタロット</h1>
          <div className="brand-sub">　　 一日一枚、心に灯を 　　</div>
        </div>
        <div className="header-tools">
          <button className="icon-btn" onClick={() => setTweak('soundOn', !tweaks.soundOn)} aria-label="sound">
            {tweaks.soundOn ? '♪' : '♪̸'}
          </button>
          <button className="icon-btn" onClick={() => setShowHistory(true)} aria-label="history">
            ❀ 紀錄
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="instructions">
          <div className="step"><span className="step-num">一</span><span>用五秒，靜靜地默念自己的名字</span></div>
          <div className="step"><span className="step-num">二</span><span>輕輕點擊「洗牌」，把雜念交給時間</span></div>
          <div className="step"><span className="step-num">三</span><span>從扇形的紙牌中，選一張呼喚你的</span></div>
        </div>

        <div className={`stage stage-${phase}`}>
          <FanDeck
            cards={deck}
            onPick={handlePick}
            picked={picked}
            shuffleKey={shuffleKey}
            accent={tweaks.accent}
          />
          {phase === 'idle' && (
            <div className="idle-hint">
              <div className="idle-deck-stack" aria-hidden="true">
                <div className="stack-card" style={{ transform: 'rotate(-4deg) translate(-12px, 4px)' }}><CardBack accent={tweaks.accent} /></div>
                <div className="stack-card" style={{ transform: 'rotate(2deg) translate(0, 0)' }}><CardBack accent={tweaks.accent} /></div>
                <div className="stack-card" style={{ transform: 'rotate(6deg) translate(12px, -2px)' }}><CardBack accent={tweaks.accent} /></div>
              </div>
              <p className="idle-text">準備好了嗎？</p>
            </div>
          )}
        </div>

        <div className="controls">
          <button
            className="shuffle-btn"
            onClick={handleShuffle}
            disabled={phase === 'shuffling'}
            style={{ '--accent': tweaks.accent }}
          >
            <span className="shuffle-btn-jp">シャッフル</span>
            <span className="shuffle-btn-zh">{phase === 'idle' ? '開始洗牌' : '重新洗牌'}</span>
          </button>
        </div>

        <footer className="app-footer">
          <div className="footer-line" />
          <p className="footer-text">願今日的一張牌，是你心上的一盞小燈。</p>
        </footer>
      </main>

      {showReveal && pickedCard && (
        <RevealCard
          card={pickedCard}
          accent={tweaks.accent}
          onClose={closeReveal}
          onShare={() => setShowShare(true)}
        />
      )}

      {showShare && pickedCard && (
        <ShareCard card={pickedCard} accent={tweaks.accent} onClose={() => setShowShare(false)} />
      )}

      <HistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onClear={clearHistory}
      />

      {showTweaks && <TweaksUI tweaks={tweaks} setTweak={setTweak} onClose={() => {
        setShowTweaks(false);
        window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
      }} />}
    </div>
  );
}

// ---------- Tweaks UI ----------
function TweaksUI({ tweaks, setTweak, onClose }) {
  // persist via host
  const persist = (k, v) => {
    setTweak(k, v);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      <div className="tweaks-section">
        <label className="tweaks-label">點綴色</label>
        <div className="swatch-row">
          {ACCENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`swatch ${tweaks.accent === opt.value ? 'is-active' : ''}`}
              style={{ background: opt.value }}
              onClick={() => persist('accent', opt.value)}
              aria-label={opt.label}
            >
              <span className="swatch-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tweaks-section">
        <label className="tweaks-label">背景溫度 <span className="muted">{tweaks.bgWarmth.toFixed(2)}</span></label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={tweaks.bgWarmth}
          onChange={e => persist('bgWarmth', parseFloat(e.target.value))}
          className="slider"
        />
        <div className="slider-ends"><span>冷</span><span>暖</span></div>
      </div>
      <div className="tweaks-section">
        <label className="tweaks-label">音效</label>
        <button className="toggle" onClick={() => persist('soundOn', !tweaks.soundOn)}>
          <span className={`toggle-dot ${tweaks.soundOn ? 'on' : 'off'}`} />
          <span>{tweaks.soundOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
