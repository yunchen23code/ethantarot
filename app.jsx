/* global React, ReactDOM, CardBackArt, CardBackSimple, MoonStrip, CornerFlourish, FooterOrnament, Pentagram, StaggeredMoonBig */
const { useState, useEffect, useRef, useCallback } = React;

// ---------- Tweak defaults ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "ornament": 0.65,
  "soundOn": true
}/*EDITMODE-END*/;

// ---------- Card name → English/Latin mapping ----------
const SUIT_EN = { '寶劍': 'Swords', '聖杯': 'Cups', '錢幣': 'Pentacles', '權杖': 'Wands' };
const NUM_EN = {
  '一': 'Ace', '二': 'Two', '三': 'Three', '四': 'Four', '五': 'Five',
  '六': 'Six', '七': 'Seven', '八': 'Eight', '九': 'Nine', '十': 'Ten',
  '侍者': 'Page', '侍衛': 'Page', '侍從': 'Page', '騎士': 'Knight',
  '皇后': 'Queen', '王后': 'Queen', '國王': 'King',
};
const MAJOR_EN = {
  '愚者': 'The Fool',
  '愚人': 'The Fool',
  '魔術師': 'The Magician',
  '魔法師': 'The Magician',
  '女祭司': 'The High Priestess',
  '女教皇': 'The High Priestess',
  '皇后': 'The Empress',
  '皇帝': 'The Emperor',
  '教皇': 'The Hierophant',
  '教宗': 'The Hierophant',
  '戀人': 'The Lovers',
  '戰車': 'The Chariot',
  '力量': 'Strength',
  '隱士': 'The Hermit',
  '命運之輪': 'Wheel of Fortune',
  '正義': 'Justice',
  '倒吊人': 'The Hanged Man',
  '吊人': 'The Hanged Man',
  '死神': 'Death',
  '節制': 'Temperance',
  '惡魔': 'The Devil',
  '高塔': 'The Tower',
  '塔': 'The Tower',
  '星星': 'The Star',
  '星': 'The Star',
  '月亮': 'The Moon',
  '太陽': 'The Sun',
  '審判': 'Judgement',
  '世界': 'The World',
};

function toEnglishName(zh) {
  if (MAJOR_EN[zh]) return MAJOR_EN[zh];
  // Suit cards: leading 2-char suit, trailing number/court
  for (const suit of Object.keys(SUIT_EN)) {
    if (zh.startsWith(suit)) {
      const rest = zh.slice(suit.length);
      const num = NUM_EN[rest];
      if (num) return `${num} of ${SUIT_EN[suit]}`;
      return `${SUIT_EN[suit]}`;
    }
  }
  return zh;
}

// ---------- Sound (Web Audio) ----------
const audioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext))
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  if (type === 'shuffle') {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.45, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * 0.15;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;
    src.connect(filter).connect(audioCtx.destination);
    src.start();
  } else if (type === 'flip') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    o.frequency.exponentialRampToValueAtTime(330, now + 0.4);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    o.connect(g).connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.6);
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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function todayEN() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Astrological day-of-week (Latin / classical planetary names)
const DAY_PLANET = ['SOL','LUNA','MARS','MERCURIUS','IUPITER','VENUS','SATURNUS'];
function todayPlanet() {
  return DAY_PLANET[new Date().getDay()];
}

// ---------- Fan-spread Deck ----------
function FanDeck({ cards, onPick, picked, shuffleKey }) {
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

  const arcWidth = width;
  const sagitta = Math.max(60, width * 0.18);
  const r = (sagitta * sagitta + (arcWidth / 2) ** 2) / (2 * sagitta);
  const halfAngleRad = Math.asin((arcWidth / 2) / r);
  const halfAngleDeg = halfAngleRad * 180 / Math.PI;

  return (
    <div className="fan-deck" ref={ref}>
      {cards.map((card, i) => {
        const t = N > 1 ? i / (N - 1) : 0.5;
        const angleDeg = -halfAngleDeg + t * (2 * halfAngleDeg);
        const isPicked = picked === i;
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
            aria-label={`Card ${i + 1}: ${card.name}`}
          >
            <div className="fan-card-inner">
              <CardBackSimple />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Reveal: 3D flip card ----------
function RevealCard({ card, onClose, onShare }) {
  const [flipped, setFlipped] = useState(false);
  const [textShown, setTextShown] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 250);
    const t2 = setTimeout(() => setTextShown(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const en = toEnglishName(card.name);

  return (
    <div className="reveal-overlay" onClick={onClose}>
      <div className="reveal-stage" onClick={e => e.stopPropagation()}>
        <div className={`flip-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face flip-back">
            <CardBackArt />
          </div>
          <div className="flip-face flip-front">
            {imgError ? (
              <div className="card-fallback">
                <div className="card-fallback-name">{en}</div>
              </div>
            ) : (
              <img
                src={card.img}
                alt={card.name}
                onError={() => setImgError(true)}
                draggable={false}
              />
            )}
            <div className="flip-front-frame" />
          </div>
        </div>

        <div className={`reveal-text ${textShown ? 'is-shown' : ''}`}>
          <div className="reveal-meta">
            <span className="reveal-date">{todayEN()}</span>
            <span className="reveal-divider" />
            <span className="reveal-tag">DIES {todayPlanet()}</span>
          </div>
          <h2 className="reveal-name">{en}</h2>
          <div className="reveal-name-zh">{card.name}</div>
          <p className="reveal-desc">{card.description}</p>

          <div className="reveal-actions">
            <button className="btn-ghost" onClick={onShare}>SHARE · 分享</button>
            <button className="btn-primary" onClick={onClose}>DRAW AGAIN · 再抽一張</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Share Card Modal ----------
function ShareCard({ card, onClose }) {
  const en = toEnglishName(card.name);
  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-wrap" onClick={e => e.stopPropagation()}>
        <div className="share-card">
          <div className="share-header">
            <span className="share-en">ARCANUM</span>
            <span className="share-date">{todayEN()}</span>
          </div>
          <div className="share-mini-card">
            <img src={card.img} alt={card.name} draggable={false}
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="share-name">{en}</div>
          <div className="share-name-zh">{card.name}</div>
          <div className="share-desc">{card.description}</div>
          <div className="share-footer">
            <span className="share-stamp">✶</span>
            <span className="share-foot-text">Lumen viae cotidianae</span>
          </div>
        </div>
        <div className="share-tip">SCREENSHOT TO SHARE</div>
        <button className="btn-ghost share-close" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

// ---------- History Drawer ----------
function HistoryDrawer({ open, onClose, history, onClear }) {
  return (
    <div className={`history-drawer ${open ? 'is-open' : ''}`}>
      <div className="history-head">
        <h3>CHRONICLE · 紀錄</h3>
        <button className="icon-btn" onClick={onClose} aria-label="close">CLOSE</button>
      </div>
      {history.length === 0 ? (
        <p className="history-empty">
          “尚無紀錄。”<br/>
          Draw a card, and let the stars remember.
        </p>
      ) : (
        <ul className="history-list">
          {history.map((h, i) => (
            <li key={i} className="history-item">
              <div className="history-row1">
                <span className="history-date">{h.dateEN || h.date}</span>
                <span className="history-name">{h.nameEN || toEnglishName(h.name)}</span>
              </div>
              <div className="history-name-zh">{h.name}</div>
              <div className="history-desc">{h.description}</div>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <button className="history-clear" onClick={onClear}>CLEAR ALL · 清除全部紀錄</button>
      )}
    </div>
  );
}

// ---------- Main App ----------
function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [phase, setPhase] = useState('idle');
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

  // Tweaks panel mount/unmount via toolbar
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

  // Apply ornament density to CSS var
  useEffect(() => {
    document.documentElement.style.setProperty('--ornament', tweaks.ornament);
  }, [tweaks.ornament]);

  const handleShuffle = useCallback(() => {
    if (tweaks.soundOn) playSound('shuffle');
    setPicked(null);
    setShowReveal(false);
    setPhase('shuffling');
    setTimeout(() => {
      setDeck(shuffle(window.TAROT_CARDS));
      setShuffleKey(k => k + 1);
      setPhase('spread');
    }, 950);
  }, [tweaks.soundOn]);

  const handlePick = useCallback((i) => {
    if (tweaks.soundOn) playSound('flip');
    setPicked(i);
    setTimeout(() => {
      setShowReveal(true);
      setPhase('revealed');
      const card = deck[i];
      const entry = {
        name: card.name,
        nameEN: toEnglishName(card.name),
        description: card.description,
        date: todayISO(),
        dateEN: todayEN(),
        ts: Date.now(),
      };
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
  const showOrnaments = tweaks.ornament > 0.15;

  return (
    <div className="app">
      {showOrnaments && (
        <>
          <div className="app-corner tl"><CornerFlourish /></div>
          <div className="app-corner tr"><CornerFlourish /></div>
          <div className="app-corner bl"><CornerFlourish /></div>
          <div className="app-corner br"><CornerFlourish /></div>
        </>
      )}

      <MoonStrip />

      <header className="app-header">
        <div className="brand">
          <div className="brand-eyebrow">Arcanum Cotidianum · MMXXVI</div>
          <h1 className="brand-title">TAROT</h1>
          <div className="brand-zh">每 日 一 牌</div>
          {tweaks.ornament > 0.4 && (
            <div className="brand-gothic">Lumen ex Stellis</div>
          )}
        </div>
        <div className="header-tools">
          <button className="icon-btn" onClick={() => setTweak('soundOn', !tweaks.soundOn)} aria-label="sound">
            {tweaks.soundOn ? '♪ SOUND' : '♪̸ MUTED'}
          </button>
          <button className="icon-btn" onClick={() => setShowHistory(true)} aria-label="history">
            ✶ CHRONICLE
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="instructions">
          <div className="step">
            <span className="step-num">I</span>
            <span>靜默五秒，輕念你的名字</span>
          </div>
          <div className="step">
            <span className="step-num">II</span>
            <span>輕觸「洗牌」，將雜念交付星辰</span>
          </div>
          <div className="step">
            <span className="step-num">III</span>
            <span>從扇形紙牌中，揀選呼喚你的那張</span>
          </div>
        </div>

        <div className={`stage stage-${phase}`}>
          <FanDeck
            cards={deck}
            onPick={handlePick}
            picked={picked}
            shuffleKey={shuffleKey}
          />
          {phase === 'idle' && (
            <div className="idle-hint">
              <div className="idle-deck-stack" aria-hidden="true">
                <div className="stack-card" style={{ transform: 'rotate(-5deg) translate(-14px, 6px)' }}><CardBackArt /></div>
                <div className="stack-card" style={{ transform: 'rotate(2deg) translate(0, 0)' }}><CardBackArt /></div>
                <div className="stack-card" style={{ transform: 'rotate(7deg) translate(14px, -2px)' }}><CardBackArt /></div>
              </div>
              <p className="idle-text">Ready?</p>
              <div className="idle-sub">準 備 好 了 嗎</div>
            </div>
          )}
        </div>

        <div className="controls">
          <button
            className="shuffle-btn"
            onClick={handleShuffle}
            disabled={phase === 'shuffling'}
          >
            <span className="shuffle-btn-en">SHUFFLE</span>
            <span className="shuffle-btn-zh">{phase === 'idle' ? '開始洗牌' : '重新洗牌'}</span>
          </button>
        </div>

        <footer className="app-footer">
          <div className="footer-ornament">
            <span className="footer-line" />
            <FooterOrnament />
            <span className="footer-line" />
          </div>
          <p className="footer-text">願今日的一張牌，是你心上的一盞小燈</p>
          {tweaks.ornament > 0.3 && (
            <p className="footer-gothic">Stella tua lucet in tenebris.</p>
          )}
        </footer>
      </main>

      {showReveal && pickedCard && (
        <RevealCard
          card={pickedCard}
          onClose={closeReveal}
          onShare={() => setShowShare(true)}
        />
      )}

      {showShare && pickedCard && (
        <ShareCard card={pickedCard} onClose={() => setShowShare(false)} />
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
  const persist = (k, v) => {
    setTweak(k, v);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };
  const label = (() => {
    const v = tweaks.ornament;
    if (v < 0.2) return 'MINIMAL';
    if (v < 0.5) return 'SUBTLE';
    if (v < 0.8) return 'ORNATE';
    return 'BAROQUE';
  })();
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      <div className="tweaks-section">
        <label className="tweaks-label">
          <span>Ornament <span className="tweaks-label-zh">裝飾密度</span></span>
          <span className="muted">{label}</span>
        </label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={tweaks.ornament}
          onChange={e => persist('ornament', parseFloat(e.target.value))}
          className="slider"
        />
        <div className="slider-ends"><span>Minimal</span><span>Baroque</span></div>
      </div>
      <div className="tweaks-section">
        <label className="tweaks-label">
          <span>Sound <span className="tweaks-label-zh">音效</span></span>
        </label>
        <button className="toggle" onClick={() => persist('soundOn', !tweaks.soundOn)}>
          <span className={`toggle-dot ${tweaks.soundOn ? 'on' : 'off'}`} />
          <span>{tweaks.soundOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
