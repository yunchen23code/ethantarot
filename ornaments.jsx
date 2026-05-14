/* global React */
// Ornaments — moon phases, pentagrams, alchemy, flourishes, card-back

const Phase = ({ frac }) => {
  // frac 0..1, 0 new moon, 0.5 full
  const r = 9;
  const cx = 10, cy = 10;
  // Create a clip path of moon waxing using two arcs
  // Strategy: full disc filled with --silver-deep (dark side), then overlay lit side as path
  const lit = frac;
  // x of right side of ellipse mask
  const k = (1 - 2 * lit); // -1 full ... 0 half ... 1 new (lit on right when waxing)
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.55"/>
      <path
        d={`M ${cx} ${cy - r}
            A ${r} ${r} 0 0 1 ${cx} ${cy + r}
            A ${Math.abs(k) * r} ${r} 0 0 ${k > 0 ? 1 : 0} ${cx} ${cy - r} Z`}
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
};

const MoonStrip = () => (
  <div className="moon-strip" aria-hidden="true">
    <div className="moon-rule" />
    <span style={{ color: 'var(--silver-deep)' }}><Phase frac={0.0} /></span>
    <span style={{ color: 'var(--silver)' }}><Phase frac={0.25} /></span>
    <span style={{ color: 'var(--silver-soft)' }}><Phase frac={0.5} /></span>
    <span style={{ color: 'var(--silver)' }}><Phase frac={0.75} /></span>
    <span style={{ color: 'var(--silver-deep)' }}><Phase frac={1.0} /></span>
    <div className="moon-rule" />
  </div>
);

const CornerFlourish = () => (
  <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="0.6">
    <path d="M 4 4 L 4 50" opacity="0.85"/>
    <path d="M 4 4 L 50 4" opacity="0.85"/>
    <path d="M 8 8 L 8 30" opacity="0.5"/>
    <path d="M 8 8 L 30 8" opacity="0.5"/>
    {/* arabesque curl */}
    <path d="M 4 50 Q 14 50 18 46 Q 22 42 22 32 Q 22 22 32 22 Q 42 22 46 18 Q 50 14 50 4"
          opacity="0.7"/>
    <circle cx="14" cy="14" r="1.4" fill="currentColor" opacity="0.7"/>
    <path d="M 14 14 L 24 24 M 14 14 L 24 14 M 14 14 L 14 24"
          strokeWidth="0.3" opacity="0.45"/>
    <path d="M 30 8 Q 32 12 36 12 M 8 30 Q 12 32 12 36" opacity="0.6"/>
  </svg>
);

const FooterOrnament = () => (
  <svg viewBox="0 0 60 12" fill="none" stroke="currentColor" strokeWidth="0.7" aria-hidden="true">
    <path d="M 2 6 L 22 6" opacity="0.6"/>
    <path d="M 38 6 L 58 6" opacity="0.6"/>
    <path d="M 26 6 Q 30 2 30 6 Q 30 10 26 6 Z" fill="currentColor" opacity="0.55"/>
    <path d="M 34 6 Q 30 2 30 6 Q 30 10 34 6 Z" fill="currentColor" opacity="0.55"/>
    <circle cx="30" cy="6" r="1" fill="currentColor" opacity="0.9"/>
  </svg>
);

// Pentagram with circle
const Pentagram = ({ size = 80, stroke = 'currentColor', strokeWidth = 0.6, opacity = 1 }) => {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
    pts.push([50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42]);
  }
  // Star = points 0->2->4->1->3->0
  const order = [0, 2, 4, 1, 3, 0];
  const d = order.map((idx, i) => `${i ? 'L' : 'M'} ${pts[idx][0].toFixed(2)} ${pts[idx][1].toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ opacity }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth={strokeWidth} opacity="0.7"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke={stroke} strokeWidth={strokeWidth * 0.6} opacity="0.4"/>
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  );
};

// Sun-and-moon medallion used as a card-back centerpiece
const CardBackArt = () => (
  <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice"
       style={{ width: '100%', height: '100%', display: 'block' }}>
    <defs>
      <linearGradient id="cbBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a1a4a"/>
        <stop offset="50%" stopColor="#1a1130"/>
        <stop offset="100%" stopColor="#0f0820"/>
      </linearGradient>
      <radialGradient id="cbHalo" cx="50%" cy="48%" r="40%">
        <stop offset="0%" stopColor="#d8b15c" stopOpacity="0.22"/>
        <stop offset="60%" stopColor="#d8b15c" stopOpacity="0.04"/>
        <stop offset="100%" stopColor="#d8b15c" stopOpacity="0"/>
      </radialGradient>
      <pattern id="cbDots" patternUnits="userSpaceOnUse" width="5" height="5">
        <circle cx="0.5" cy="0.5" r="0.18" fill="#c8d0e4" opacity="0.18"/>
      </pattern>
    </defs>
    <rect width="100" height="150" fill="url(#cbBg)"/>
    <rect width="100" height="150" fill="url(#cbDots)"/>
    <rect width="100" height="150" fill="url(#cbHalo)"/>

    {/* double border, gold outer + silver inner */}
    <rect x="3" y="3" width="94" height="144" fill="none" stroke="#d8b15c" strokeWidth="0.5" opacity="0.85"/>
    <rect x="6" y="6" width="88" height="138" fill="none" stroke="#c8d0e4" strokeWidth="0.25" opacity="0.5"/>
    <rect x="9" y="9" width="82" height="132" fill="none" stroke="#d8b15c" strokeWidth="0.18" opacity="0.4"/>

    {/* corner fleurons */}
    {[[6,6,0],[94,6,90],[94,144,180],[6,144,270]].map(([x,y,r],i)=>(
      <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
        <path d="M 0 4 L 0 0 L 4 0" stroke="#d8b15c" strokeWidth="0.4" fill="none" opacity="0.9"/>
        <path d="M 2 6 Q 4 6 6 4 Q 6 2 8 2" stroke="#d8b15c" strokeWidth="0.3" fill="none" opacity="0.7"/>
        <circle cx="3" cy="3" r="0.5" fill="#d8b15c" opacity="0.85"/>
      </g>
    ))}

    {/* central celestial medallion */}
    <g transform="translate(50 75)">
      {/* concentric rings */}
      <circle r="26" fill="none" stroke="#d8b15c" strokeWidth="0.35" opacity="0.85"/>
      <circle r="22" fill="none" stroke="#c8d0e4" strokeWidth="0.2" opacity="0.5"/>
      <circle r="18" fill="none" stroke="#d8b15c" strokeWidth="0.2" opacity="0.4"/>

      {/* zodiac tick marks on outer ring */}
      {Array.from({length: 24}).map((_, i) => {
        const a = (i * 15) * Math.PI / 180;
        const r1 = 26, r2 = i % 2 === 0 ? 28 : 27;
        return (
          <line key={i}
            x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
            x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
            stroke="#c8d0e4" strokeWidth="0.2" opacity="0.6"/>
        );
      })}

      {/* pentagram */}
      <g>
        {(() => {
          const pts = [];
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
            pts.push([Math.cos(a) * 16, Math.sin(a) * 16]);
          }
          const order = [0, 2, 4, 1, 3, 0];
          const d = order.map((idx, i) => `${i ? 'L' : 'M'} ${pts[idx][0].toFixed(2)} ${pts[idx][1].toFixed(2)}`).join(' ');
          return <path d={d} fill="none" stroke="#d8b15c" strokeWidth="0.4" opacity="0.95"/>;
        })()}
      </g>

      {/* tiny center sun */}
      <circle r="2" fill="#d8b15c" opacity="0.95"/>
      <circle r="4" fill="none" stroke="#d8b15c" strokeWidth="0.2" opacity="0.6"/>
    </g>

    {/* moon-phase row near top */}
    <g transform="translate(50 22)" opacity="0.85">
      {[-16,-8,0,8,16].map((x, i) => {
        const lit = i / 4;
        const k = (1 - 2 * lit);
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            <circle r="2.4" fill="none" stroke="#c8d0e4" strokeWidth="0.25" opacity="0.7"/>
            <path d={`M 0 -2.4 A 2.4 2.4 0 0 1 0 2.4 A ${Math.abs(k)*2.4} 2.4 0 0 ${k>0?1:0} 0 -2.4 Z`}
                  fill="#c8d0e4" opacity="0.85"/>
          </g>
        );
      })}
    </g>

    {/* alchemical glyph row near bottom — sun, moon, mercury, venus, mars */}
    <g transform="translate(50 128)" fill="none" stroke="#d8b15c" strokeWidth="0.35" opacity="0.9">
      <g transform="translate(-22 0)">
        <circle r="2"/>
        <circle r="0.6" fill="#d8b15c"/>
      </g>
      <g transform="translate(-11 0)">
        <path d="M -2 -1 A 2.4 2.4 0 1 0 -2 1.6"/>
      </g>
      <g transform="translate(0 0)">
        <circle cy="-0.5" r="1.6"/>
        <path d="M 0 1.1 L 0 3.6 M -1.2 2.4 L 1.2 2.4"/>
        <path d="M -1.6 -3 A 1.6 1.6 0 0 0 1.6 -3"/>
      </g>
      <g transform="translate(11 0)">
        <circle cy="-0.5" r="1.6"/>
        <path d="M 0 1.1 L 0 3.6 M -1.2 2.4 L 1.2 2.4"/>
      </g>
      <g transform="translate(22 0)">
        <circle cy="0.5" r="1.6"/>
        <path d="M 1.2 -0.7 L 3 -2.5 M 3 -2.5 L 3 -1.2 M 3 -2.5 L 1.7 -2.5"/>
      </g>
    </g>
  </svg>
);

const StaggeredMoonBig = () => (
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="0.5" aria-hidden="true">
    <circle cx="20" cy="20" r="14" opacity="0.5"/>
    <path d="M 22 7 A 13 13 0 1 0 22 33 A 10 13 0 1 1 22 7 Z" fill="currentColor" opacity="0.85"/>
  </svg>
);

Object.assign(window, { Phase, MoonStrip, CornerFlourish, FooterOrnament, Pentagram, CardBackArt, StaggeredMoonBig });
