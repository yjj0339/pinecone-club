const PAPER = '#FBF3E6';
const CARD = '#FFFDF8';
const INK = '#2A2623';
const CORAL = '#D9624C';
const FOREST = '#2F6B5B';
const MUSTARD = '#E8A93C';
const SKY = '#4F7FA8';
const PLUM = '#8A5A7A';
const OLIVE = '#7E8A4A';
const LINE = '#E4D7C3';

const tint = {
  coral: '#F7DDD5',
  forest: '#DCEAE3',
  mustard: '#F8E8C6',
  sky: '#DEE8F1',
  plum: '#EDE0E7',
  olive: '#E9EBD6',
};

const stroke = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

function frame(bg, inner, extra = '') {
  return `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="200" height="140" fill="${bg}"/>${extra}${inner}</svg>`;
}

function dots(x, y, step, cols, rows, color = INK, r = 1.6) {
  let out = '';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      out += `<circle cx="${x + i * step}" cy="${y + j * step}" r="${r}" fill="${color}"/>`;
    }
  }
  return out;
}

function spark(cx, cy, r, color = MUSTARD) {
  return `<g fill="${color}" ${stroke}><path d="M${cx} ${cy - r}l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>`;
}

const covers = {
  gomoku: frame(
    tint.coral,
    `<g ${stroke}>
      <rect x="26" y="14" width="148" height="112" rx="6" fill="${CARD}"/>
      <path d="M48 14v112M74 14v112M100 14v112M126 14v112M152 14v112M26 36h148M26 58h148M26 80h148M26 102h148" stroke="${LINE}" stroke-width="2"/>
      <circle cx="74" cy="58" r="9" fill="${INK}"/>
      <circle cx="100" cy="80" r="9" fill="${CORAL}"/>
      <circle cx="100" cy="58" r="9" fill="${INK}"/>
      <circle cx="126" cy="80" r="9" fill="${CORAL}"/>
      <circle cx="126" cy="58" r="9" fill="${INK}"/>
      <circle cx="152" cy="80" r="9" fill="${CORAL}"/>
      <path d="M74 58l52 22" stroke="${MUSTARD}" stroke-width="3" stroke-dasharray="4 5"/>
    </g>`,
  ),
  fleet: frame(
    tint.sky,
    `<g ${stroke}>
      <path d="M20 96c14-10 26-10 40 0s26 10 40 0 26-10 40 0 20 6 40-2" fill="none" stroke="${SKY}" stroke-width="3"/>
      <path d="M34 64h52l10 20H24z" fill="${INK}"/>
      <rect x="50" y="46" width="16" height="18" fill="${CARD}"/>
      <path d="M128 96V44M128 44l22 14-22 12z" fill="${CORAL}"/>
      <path d="M128 96h40" stroke="${SKY}" stroke-width="3"/>
      <circle cx="70" cy="40" r="4" fill="${CORAL}"/>
      <circle cx="92" cy="34" r="4" fill="${CORAL}"/>
      <circle cx="112" cy="52" r="4" fill="${INK}"/>
      <path d="M56 110c6-4 12-4 18 0s12 4 18 0" fill="none" stroke="${LINE}" stroke-width="3"/>
    </g>`,
  ),
  dots: frame(
    tint.forest,
    `<g ${stroke}>
      ${dots(46, 30, 36, 4, 4, INK, 3.2)}
      <path d="M46 30h72v72H46z" fill="${MUSTARD}" fill-opacity=".35" stroke="none"/>
      <path d="M46 30h36M82 30v36M82 66h36M118 66v36M82 102H46" fill="none" stroke="${CORAL}" stroke-width="3.4"/>
      <path d="M46 66h36M118 30v36" fill="none" stroke="${FOREST}" stroke-width="3.4"/>
      <circle cx="82" cy="66" r="4.4" fill="${CORAL}"/>
      <circle cx="118" cy="66" r="4.4" fill="${FOREST}"/>
    </g>`,
  ),
  reversi: frame(
    tint.plum,
    `<g ${stroke}>
      <rect x="38" y="8" width="124" height="124" rx="8" fill="${FOREST}"/>
      <path d="M69 8v124M100 8v124M131 8v124M38 39h124M38 70h124M38 101h124" stroke="#255949" stroke-width="1.6"/>
      <circle cx="84" cy="54" r="10" fill="${CARD}"/>
      <circle cx="116" cy="54" r="10" fill="${INK}"/>
      <circle cx="84" cy="86" r="10" fill="${INK}"/>
      <circle cx="116" cy="86" r="10" fill="${CARD}"/>
      <circle cx="100" cy="100" r="11" fill="url(#rev)"/>
      <defs><linearGradient id="rev"><stop offset="50%" stop-color="${INK}"/><stop offset="50%" stop-color="${CARD}"/></linearGradient></defs>
    </g>`,
  ),
  mines: frame(
    tint.olive,
    `<g ${stroke}>
      <rect x="22" y="20" width="156" height="100" rx="8" fill="${CARD}"/>
      ${dots(40, 38, 26, 6, 4, OLIVE, 2)}
      <path d="M64 44h48v48H64z" fill="${MUSTARD}" fill-opacity=".28" stroke="none"/>
      <path d="M74 96V54M74 54l26 8-26 8z" fill="${CORAL}"/>
      <path d="M74 96h-16" stroke="${INK}" stroke-width="3"/>
      <text x="120" y="70" font-family="Georgia,serif" font-size="26" font-weight="700" fill="${INK}" stroke="none">3</text>
      <circle cx="152" cy="92" r="9" fill="${INK}"/>
      <path d="M152 80v-8M164 92h8M142 80l-6-6M164 80l6-6" stroke="${INK}" stroke-width="2.4"/>
    </g>`,
  ),
  memory: frame(
    tint.mustard,
    `<g ${stroke}>
      <g transform="rotate(-8 60 70)"><rect x="32" y="38" width="52" height="64" rx="7" fill="${CARD}"/><circle cx="58" cy="66" r="12" fill="${MUSTARD}"/><path d="M48 86h20" stroke="${LINE}" stroke-width="3"/></g>
      <g transform="rotate(7 140 70)"><rect x="116" y="38" width="52" height="64" rx="7" fill="${CARD}"/><path d="M142 52a13 13 0 1 0 0 26 16 16 0 0 1 0-26z" fill="${INK}"/><path d="M130 96h24" stroke="${LINE}" stroke-width="3"/></g>
      <rect x="84" y="24" width="34" height="46" rx="6" fill="${FOREST}"/>
      <path d="M92 36l8 8 10-12" fill="none" stroke="${CARD}" stroke-width="3"/>
    </g>`,
  ),
  quiz: frame(
    tint.sky,
    `<g ${stroke}>
      <rect x="26" y="20" width="104" height="70" rx="18" fill="${CARD}"/>
      <path d="M60 90l-8 16 24-16" fill="${CARD}"/>
      <text x="62" y="70" font-family="Georgia,serif" font-size="40" font-weight="700" fill="${CORAL}" stroke="none">?</text>
      <rect x="120" y="34" width="58" height="20" rx="10" fill="${MUSTARD}"/>
      <rect x="120" y="62" width="58" height="20" rx="10" fill="${FOREST}"/>
      <rect x="120" y="90" width="58" height="20" rx="10" fill="${CARD}"/>
      ${spark(150, 118, 9, CORAL)}
    </g>`,
  ),
  g2048: frame(
    tint.mustard,
    `<g ${stroke}>
      <rect x="26" y="14" width="148" height="112" rx="8" fill="#E7D3AC"/>
      <rect x="36" y="24" width="34" height="30" rx="4" fill="${CARD}"/>
      <rect x="76" y="24" width="34" height="30" rx="4" fill="${MUSTARD}"/>
      <rect x="116" y="24" width="48" height="30" rx="4" fill="${CORAL}"/>
      <rect x="36" y="60" width="34" height="30" rx="4" fill="${MUSTARD}"/>
      <rect x="76" y="60" width="34" height="30" rx="4" fill="${CARD}"/>
      <rect x="116" y="60" width="48" height="30" rx="4" fill="${FOREST}"/>
      <rect x="36" y="96" width="74" height="20" rx="4" fill="${CARD}"/>
      <rect x="116" y="96" width="48" height="20" rx="4" fill="${PLUM}"/>
      <text x="140" y="45" font-family="Georgia,serif" font-size="15" font-weight="700" fill="${CARD}" stroke="none" text-anchor="middle">2048</text>
    </g>`,
  ),
  sudoku: frame(
    tint.forest,
    `<g ${stroke}>
      <rect x="40" y="6" width="120" height="128" rx="6" fill="${CARD}"/>
      ${dots(58, 24, 15, 7, 7, LINE, 1.2)}
      <path d="M80 6v128M120 6v128M40 48h120M40 90h120" stroke="${INK}" stroke-width="2.6"/>
      <path d="M40 26h120M40 68h120M40 110h120M60 6v128M100 6v128M140 6v128" stroke="${LINE}" stroke-width="1.4"/>
      <text x="50" y="40" font-family="Georgia,serif" font-size="15" fill="${INK}" stroke="none">5</text>
      <text x="70" y="82" font-family="Georgia,serif" font-size="15" fill="${INK}" stroke="none">3</text>
      <text x="130" y="104" font-family="Georgia,serif" font-size="15" fill="${CORAL}" stroke="none">9</text>
      <rect x="100" y="48" width="40" height="42" fill="${MUSTARD}" fill-opacity=".35" stroke="none"/>
      <text x="130" y="62" font-family="Georgia,serif" font-size="15" fill="${CORAL}" stroke="none">4</text>
    </g>`,
  ),
  simon: frame(
    tint.plum,
    `<g ${stroke}>
      <circle cx="100" cy="70" r="56" fill="${CARD}"/>
      <path d="M100 70V14A56 56 0 0 0 44 70z" fill="${CORAL}"/>
      <path d="M100 70V14a56 56 0 0 1 56 56z" fill="${MUSTARD}"/>
      <path d="M100 70h56a56 56 0 0 1-56 56z" fill="${FOREST}"/>
      <path d="M100 70H44a56 56 0 0 0 56 56z" fill="${SKY}"/>
      <circle cx="100" cy="70" r="14" fill="${PAPER}"/>
      <circle cx="100" cy="70" r="6" fill="${INK}"/>
      ${spark(158, 30, 10, MUSTARD)}
      ${spark(40, 112, 7, CORAL)}
    </g>`,
  ),
  hockey: frame(
    tint.sky,
    `<g ${stroke}>
      <rect x="20" y="18" width="160" height="104" rx="52" fill="${CARD}"/>
      <path d="M100 18v104" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 6"/>
      <circle cx="100" cy="70" r="20" fill="none" stroke="${LINE}" stroke-width="2"/>
      <circle cx="100" cy="70" r="8" fill="${INK}"/>
      <g fill="${CORAL}"><rect x="38" y="52" width="16" height="36" rx="8"/></g>
      <g fill="${FOREST}"><rect x="146" y="52" width="16" height="36" rx="8"/></g>
      <path d="M120 88c14 0 22-8 26-18" fill="none" stroke="${MUSTARD}" stroke-width="3" stroke-dasharray="4 5"/>
      <circle cx="146" cy="70" r="4" fill="${MUSTARD}"/>
    </g>`,
  ),
  tanks: frame(
    tint.olive,
    `<g ${stroke}>
      <rect x="22" y="96" width="156" height="20" rx="6" fill="#E3D3B2"/>
      <g><rect x="30" y="68" width="62" height="20" rx="6" fill="${FOREST}"/><rect x="52" y="54" width="22" height="18" rx="4" fill="${FOREST}"/><path d="M74 60h26" stroke="${INK}" stroke-width="4"/></g>
      <g><rect x="112" y="72" width="58" height="20" rx="6" fill="${CORAL}"/><rect x="126" y="60" width="20" height="16" rx="4" fill="${CORAL}"/><path d="M126 66h-22" stroke="${INK}" stroke-width="4"/></g>
      <circle cx="100" cy="52" r="5" fill="${MUSTARD}"/>
      <path d="M84 48c8-12 24-12 32 0" fill="none" stroke="${MUSTARD}" stroke-width="3" stroke-dasharray="3 5"/>
      <rect x="86" y="86" width="28" height="10" fill="${CARD}"/>
    </g>`,
  ),
  bomber: frame(
    tint.coral,
    `<g ${stroke}>
      <rect x="20" y="16" width="160" height="108" rx="8" fill="${CARD}"/>
      ${dots(44, 40, 26, 5, 4, LINE, 1.4)}
      <rect x="38" y="62" width="26" height="26" rx="3" fill="${MUSTARD}"/>
      <rect x="64" y="36" width="26" height="26" rx="3" fill="${MUSTARD}"/>
      <circle cx="120" cy="60" r="14" fill="${INK}"/>
      <path d="M132 50l10-12" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="146" cy="34" r="5" fill="${MUSTARD}"/>
      <path d="M96 96h44M118 74v44" stroke="${MUSTARD}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="118" cy="96" r="9" fill="${CORAL}"/>
    </g>`,
  ),
  snake: frame(
    tint.forest,
    `<g ${stroke}>
      <rect x="20" y="16" width="160" height="108" rx="8" fill="${CARD}"/>
      ${dots(44, 40, 26, 5, 4, LINE, 1.3)}
      <path d="M46 106V60h26v22h26V46h26v30" fill="none" stroke="${CORAL}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M46 106V60h26v22h26V46h26v30" fill="none" stroke="${CARD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 16"/>
      <circle cx="150" cy="82" r="6" fill="${INK}"/>
      <circle cx="132" cy="102" r="11" fill="${MUSTARD}"/>
      <path d="M132 92v-8" stroke="${FOREST}" stroke-width="3"/>
    </g>`,
  ),
  tetris: frame(
    tint.plum,
    `<g ${stroke}>
      <rect x="24" y="10" width="152" height="120" rx="6" fill="${CARD}"/>
      <g fill="${CORAL}"><rect x="44" y="22" width="20" height="20"/><rect x="64" y="22" width="20" height="20"/><rect x="64" y="42" width="20" height="20"/><rect x="84" y="42" width="20" height="20"/></g>
      <g fill="${FOREST}"><rect x="112" y="22" width="20" height="20"/><rect x="112" y="42" width="20" height="20"/><rect x="132" y="42" width="20" height="20"/><rect x="132" y="62" width="20" height="20"/></g>
      <g fill="${MUSTARD}"><rect x="44" y="62" width="20" height="20"/><rect x="64" y="62" width="20" height="20"/><rect x="64" y="82" width="20" height="20"/></g>
      <path d="M34 110h132" stroke="${CORAL}" stroke-width="6" stroke-dasharray="12 8"/>
      <path d="M100 52v-12M106 58l8-8" stroke="${INK}" stroke-width="2.4"/>
    </g>`,
  ),
  slingshot: frame(
    tint.mustard,
    `<g ${stroke}>
      <path d="M18 122c26 0 32-22 54-28" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="4 6"/>
      <path d="M52 112V70l-14-18M52 70l14-18" fill="none" stroke="${FOREST}" stroke-width="7" stroke-linecap="round"/>
      <path d="M38 52l14 22 14-22" fill="none" stroke="${INK}" stroke-width="3"/>
      <circle cx="52" cy="74" r="7" fill="${CORAL}"/>
      <rect x="132" y="52" width="34" height="64" rx="3" fill="${CARD}"/>
      <path d="M132 68h34M132 86h34M132 104h34" stroke="${LINE}" stroke-width="3"/>
      <path d="M132 52l17-16 17 16" fill="${CORAL}"/>
      ${spark(170, 34, 9, SKY)}
      <circle cx="166" cy="100" r="4" fill="${INK}"/>
    </g>`,
  ),
  maze: frame(
    tint.coral,
    `<g ${stroke}>
      <rect x="24" y="10" width="152" height="120" rx="6" fill="${CARD}"/>
      <path d="M24 38h58M24 66h30M24 94h58M82 10v28M54 38v28M110 10v84M138 38h38M110 66h28M138 94h38M166 38v28M82 94v36M54 94v36" fill="none" stroke="${INK}" stroke-width="4"/>
      <path d="M40 24l20 14-4 18" fill="none" stroke="${LINE}" stroke-width="2" stroke-dasharray="3 5"/>
      <circle cx="42" cy="76" r="8" fill="${CORAL}"/>
      <path d="M158 24v20M158 24l12 5-12 5" fill="${FOREST}"/>
      <path d="M158 104v20M158 104l-12 5 12 5" fill="${MUSTARD}"/>
    </g>`,
  ),
  rps: frame(
    tint.forest,
    `<g ${stroke}>
      <circle cx="100" cy="86" r="44" fill="${CARD}"/>
      <g fill="${CORAL}"><rect x="60" y="60" width="22" height="22" rx="5"/><rect x="82" y="60" width="18" height="22" rx="5"/></g>
      <g fill="${SKY}"><path d="M118 66h20l-10 18 12 18h-22l-10-18z"/></g>
      <g fill="${MUSTARD}"><path d="M70 96l12 12 12-12 6 6-18 18-18-18z"/></g>
      ${spark(56, 30, 9, MUSTARD)}
      ${spark(146, 34, 7, CORAL)}
      <path d="M44 118h112" stroke="${LINE}" stroke-width="3"/>
    </g>`,
  ),
  reaction: frame(
    tint.coral,
    `<g ${stroke}>
      <circle cx="100" cy="70" r="52" fill="${CARD}"/>
      <circle cx="100" cy="70" r="44" fill="${CORAL}"/>
      <circle cx="100" cy="70" r="30" fill="none" stroke="${CARD}" stroke-width="3" stroke-dasharray="5 7"/>
      <path d="M108 40l-18 30h14l-12 30 26-34h-14z" fill="${MUSTARD}"/>
      <path d="M28 48l10 6M28 92l10-6M172 48l-10 6M172 92l-10-6" stroke="${CORAL}" stroke-width="3"/>
      ${spark(158, 22, 8, FOREST)}
      ${spark(38, 116, 6, SKY)}
    </g>`,
  ),
  typing: frame(
    tint.sky,
    `<g ${stroke}>
      <rect x="24" y="58" width="152" height="62" rx="10" fill="${CARD}"/>
      <path d="M38 76h18M64 76h18M90 76h18M116 76h18M142 76h20M38 94h26M72 94h18M98 94h26M132 94h30" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <g font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="20" font-weight="700" fill="${CORAL}" stroke="none"><text x="60" y="42">打</text><text x="96" y="34">字</text><text x="132" y="42">竞</text></g>
      <path d="M32 26l14 4M40 40l10-2M168 30l-12 4" stroke="${MUSTARD}" stroke-width="3"/>
      <circle cx="150" cy="44" r="6" fill="${FOREST}"/>
    </g>`,
  ),
};

export function coverFor(id) {
  return covers[id] || frame(tint.coral, `<circle cx="100" cy="70" r="34" fill="${CARD}" ${stroke}/>`);
}

export function logoMark() {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="64" height="64" rx="18" fill="${CARD}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="26" cy="34" r="13" fill="${CORAL}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="40" cy="34" r="13" fill="${FOREST}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="26" cy="34" r="5" fill="${CARD}"/>
    <circle cx="40" cy="34" r="5" fill="${CARD}"/>
    <path d="M20 16l6 8 6-8M34 16l6 8 6-8" fill="${MUSTARD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

export function heroArt() {
  return `<svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <circle cx="210" cy="152" r="118" fill="${tint.mustard}"/>
      <circle cx="210" cy="152" r="118" fill="none" stroke-dasharray="4 12" stroke="${MUSTARD}"/>
      <rect x="86" y="196" width="248" height="26" rx="13" fill="${CARD}"/>
      <rect x="96" y="104" width="106" height="92" rx="22" fill="${CORAL}" transform="rotate(-6 149 150)"/>
      <path d="M120 104l10-24 16 14 14-22 10 22 16-12 4 22z" fill="${MUSTARD}" stroke="${INK}" stroke-width="3"/>
      <circle cx="130" cy="140" r="4" fill="${CARD}"/>
      <circle cx="166" cy="138" r="4" fill="${CARD}"/>
      <path d="M136 158c8 8 22 8 30 0" fill="none" stroke="${CARD}" stroke-width="3"/>
      <rect x="222" y="112" width="106" height="88" rx="22" fill="${FOREST}" transform="rotate(5 275 156)"/>
      <path d="M246 112l12-22 12 18 14-20 10 20 14-10 6 14z" fill="${PLUM}" stroke="${INK}" stroke-width="3"/>
      <circle cx="254" cy="146" r="4" fill="${CARD}"/>
      <circle cx="290" cy="142" r="4" fill="${CARD}"/>
      <path d="M258 164c8 8 22 8 30 0" fill="none" stroke="${CARD}" stroke-width="3"/>
      <rect x="150" y="188" width="120" height="62" rx="10" fill="${CARD}" transform="rotate(-3 210 219)"/>
      <circle cx="182" cy="212" r="8" fill="${INK}"/>
      <circle cx="240" cy="230" r="8" fill="${CORAL}"/>
      <circle cx="210" cy="230" r="8" fill="${FOREST}"/>
      <path d="M180 240h60" stroke="${LINE}" stroke-width="3"/>
      ${spark(60, 64, 14, MUSTARD)}
      ${spark(356, 84, 11, CORAL)}
      ${spark(336, 246, 9, FOREST)}
      ${spark(74, 232, 8, SKY)}
      <path d="M44 152c14-8 24-8 38 0M338 152c14-8 24-8 38 0" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="3 6"/>
    </g>
  </svg>`;
}

export function pausedStamp() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="18" height="18"><rect x="5" y="4" width="4" height="16" rx="2" fill="${INK}"/><rect x="15" y="4" width="4" height="16" rx="2" fill="${INK}"/></svg>`;
}