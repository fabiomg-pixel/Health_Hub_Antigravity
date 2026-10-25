// A cena em pixel art do desfecho da semana (Campanha dos 85). Tudo desenhado por código num canvas de 192×108,
// ampliado com image-rendering: pixelated. Sem imagens externas. A cena vem de historia.json (capítulo resolvido):
//   cena = { tier, etapa_antes, etapa_depois, arco, clima, lua, companhia (estados antes), afetado, retorna, itens, talisma }
// Cada desfecho tem a sua animação: triunfo, avanco, sustenta, reves, crise, sem_dado. O tempo e a lua da semana
// aparecem no céu; os membros capturados ou perdidos não aparecem na fila.
const PIXEL = (() => {
  const W = 192, H = 108, CHAO = 84, LOOP = 9;
  const COR = { tinta: '#0B1B26', pedra1: '#8C8F94', pedra2: '#6E7177', pedra3: '#4F5258', terra: '#3A2C22', terra2: '#2A1F18', agua1: '#3F86B8', agua2: '#8CC7E8', madeira: '#8B5E3C', madeira2: '#5E3D26', telha: '#8E3B35', luz: '#FFD34E', fogo1: '#FF8A1E', fogo2: '#FFD34E', fogo3: '#FF4B2B', folha1: '#2F7A4A', folha2: '#1F5A36', neve: '#F4F0E6' };
  const PAL = {
    fabio: { h: '#4A2F1B', s: '#F1C7A0', c: '#1FA39A', d: '#0E5C58', b: '#3B2A1E', x: '#F4F0E6', k: '#1B1B1B' },
    silvester: { h: '#D9D2C3', s: '#F1C7A0', c: '#E8D8A8', d: '#B89A58', b: '#4A3A2A', x: '#FFD34E', k: '#1B1B1B' },
    brisa: { h: '#B5482B', s: '#E8B88F', c: '#3FA34D', d: '#1F6A2E', b: '#4A3322', x: '#8A5A2B', k: '#1B1B1B' },
    dorn: { h: '#7A4B22', s: '#E0AE86', c: '#C2622D', d: '#7C3A17', b: '#2E2A2A', x: '#9AA3AB', k: '#1B1B1B' },
    ysa: { h: '#2B2140', s: '#EBC09C', c: '#7B4FB5', d: '#4A2C77', b: '#3B2A3F', x: '#F4F0E6', k: '#1B1B1B' },
  };
  // corpo de 8 colunas; cabeça (4 linhas), tronco (6) e duas posições de pernas
  const CABECA = ['..hhhh..', '.hhhhhh.', '.hskskh.', '..ssss..'];
  const VARIA = { brisa: { 1: '.hhhhhhh' }, silvester: { 0: '.dddddd.', 1: 'dddddddd' }, dorn: { 3: '..hhhh..' }, ysa: { 3: '.hssssh.' }, fabio: {} };
  const TRONCO = ['..cccc..', '.ccccccx', '.ccccccx', '.cdddcc.', '..cccc..', '..dddd..'];
  const PERNAS = [['..d..d..', '..d..d..', '.bb..bb.'], ['...dd...', '...dd...', '..bbbb..']];

  function ret(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function ruido(i) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  const liso = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

  function sprite(c, id, x, y, o = {}) {   // x,y = pés (centro, chão)
    const p = PAL[id] || PAL.fabio, flip = !!o.flip, sentado = !!o.sentado, f = o.frame || 0;
    const linhas = CABECA.map((r, i) => (VARIA[id] || {})[i] || r).concat(TRONCO);
    const pernas = sentado ? [] : PERNAS[f % 2];
    const todas = linhas.concat(pernas);
    const topo = Math.round(y) - todas.length + (sentado ? 3 : 0), esq = Math.round(x) - 4;
    if (o.alfa != null) c.globalAlpha = o.alfa;
    todas.forEach((r, j) => { for (let i = 0; i < 8; i++) { const ch = r[flip ? 7 - i : i]; if (ch !== '.') ret(c, esq + i, topo + j, 1, 1, p[ch] || '#fff'); } });
    if (o.ferido) { ret(c, esq + (flip ? 5 : 2), topo + 8, 1, 2, '#E0453A'); ret(c, esq + (flip ? 5 : 2), topo + 3, 2, 1, '#F4F0E6'); }
    // acessórios
    const ax = esq + (flip ? -2 : 8);
    if (id === 'silvester') { ret(c, ax, topo + 5, 2, 3, COR.luz); ret(c, ax, topo + 4, 2, 1, '#B89A58'); if (o.brilho !== false) { c.globalAlpha = 0.18; ret(c, ax - 3, topo + 2, 8, 8, COR.luz); c.globalAlpha = 1; } }
    if (id === 'dorn') { ret(c, ax + (flip ? 1 : 0), topo + 2, 1, 7, '#6B4A2A'); ret(c, ax - (flip ? 1 : 0), topo + 1, 3, 3, '#9AA3AB'); }
    if (id === 'ysa') { ret(c, ax, topo + 5, 2, 3, '#F4F0E6'); ret(c, ax, topo + 5, 2, 1, '#C9B98A'); }
    if (id === 'brisa') { ret(c, ax, topo + 3, 1, 6, '#6B4A2A'); ret(c, ax + (flip ? -1 : 1), topo + 4, 1, 4, '#C9B98A'); }
    if (id === 'fabio') { ret(c, ax, topo + 5, 2, 2, '#F4F0E6'); }
    c.globalAlpha = 1;
  }

  // ── céu, astros e tempo
  function paleta(p, noite) {
    if (noite) return ['#0B1530', '#14234A', '#1D2F5C', '#2A3F72'];
    if (p.clima === 'tempestade') return ['#2F3745', '#3D4656', '#4F5B6B', '#5E6B7A'];
    if (p.clima === 'chuvosa') return ['#66798A', '#7F94A3', '#98AAB7', '#AEBCC6'];
    if (p.clima === 'quente') return ['#6FC3EE', '#9AD6F3', '#E7E2B8', '#F6E8B8'];
    return ['#5DB7E6', '#79C7E8', '#A8DCEE', '#CDEBF2'];
  }
  function ceu(c, p, t, noite) {
    const pal = paleta(p, noite);
    pal.forEach((cor, i) => ret(c, 0, i * 21, W, 22, cor));
    if (noite || p.lua === 'cheia') {
      for (let i = 0; i < (p.lua === 'nova' ? 46 : 26); i++) if (noite) { const tw = (Math.sin(t * 2 + i) > 0.6) ? 0 : 1; if (tw) ret(c, ruido(i) * W, ruido(i + 50) * 56, 1, 1, '#F4F0E6'); }
    }
    if (p.lua === 'cheia') { ret(c, 150, 12, 12, 12, noite ? '#F4F0E6' : 'rgba(244,240,230,0.55)'); ret(c, 153, 15, 3, 3, noite ? '#D9D2C3' : 'rgba(217,210,195,0.5)'); }
    else if (noite && p.lua !== 'nova') { ret(c, 156, 14, 7, 7, '#E8E4D4'); ret(c, 158, 14, 5, 7, pal[1]); }
    if (!noite && (p.clima === 'seca' || p.clima === 'quente')) { ret(c, 20, 14, 14, 14, '#FFE27A'); c.globalAlpha = 0.25; ret(c, 17, 11, 20, 20, '#FFE27A'); c.globalAlpha = 1; }
    const nuvens = p.clima === 'tempestade' ? 7 : (p.clima === 'chuvosa' ? 5 : 2);
    for (let i = 0; i < nuvens; i++) { const x = ((ruido(i + 9) * (W + 60) - t * (4 + i)) % (W + 60) + W + 60) % (W + 60) - 30, y = 8 + ruido(i + 3) * 30; ret(c, x, y, 28, 5, noite ? '#2A3F72' : (p.clima === 'tempestade' ? '#2B323E' : '#F4F6F8')); ret(c, x + 6, y - 3, 16, 4, noite ? '#2A3F72' : (p.clima === 'tempestade' ? '#2B323E' : '#F4F6F8')); }
  }
  function montanhas(c, esc, cor, base, amp, sx) {
    for (let x = 0; x < W; x++) { const k = x + esc * sx; const h = base - Math.round(amp * (0.55 + 0.45 * Math.sin(k * 0.045) * Math.sin(k * 0.013 + 1.2))); ret(c, x, h, 1, CHAO - h, cor); }
  }
  function chuva(c, p, t, forte) {
    const n = forte ? 90 : 46;
    c.globalAlpha = 0.7;
    for (let i = 0; i < n; i++) { const x = (ruido(i) * (W + 40) + t * 60) % (W + 40) - 20, y = (ruido(i + 20) * H + t * 120) % H; ret(c, x - y * 0.2, y, 1, 3, '#CFE5F3'); }
    c.globalAlpha = 1;
  }
  function relampago(c, t, instantes) { for (const a of instantes) { const d = t - a; if (d >= 0 && d < 0.18) { c.globalAlpha = 0.65 * (1 - d / 0.18); ret(c, 0, 0, W, H, '#FFFFFF'); c.globalAlpha = 1; } } }

  // ── cenário
  const KIND = ['farois', 'farol', 'vau', 'bosque', 'ruinas', 'degraus'];
  const GENERICO = ['farois', 'estrada', 'bosque', 'ruinas', 'vau', 'estrada'];
  const kindDe = (p, i) => (p.arco === 'I' || !p.arco ? KIND : GENERICO)[Math.max(0, Math.min(5, i))] || 'estrada';

  function chao(c, esc, noite) {
    ret(c, 0, CHAO, W, H - CHAO, COR.terra);
    for (let y = 0; y < 8; y++) ret(c, 0, CHAO + y, W, 1, y % 2 ? COR.pedra2 : COR.pedra1);
    for (let i = -2; i < W / 9 + 2; i++) { const x = i * 9 - (((esc % 9) + 9) % 9); ret(c, x, CHAO + 1, 1, 3, COR.pedra3); ret(c, x + 4, CHAO + 4, 1, 3, COR.pedra3); }
    ret(c, 0, CHAO + 8, W, H - CHAO - 8, COR.terra); ret(c, 0, CHAO + 14, W, H, COR.terra2);
    if (noite) { c.globalAlpha = 0.35; ret(c, 0, CHAO, W, H - CHAO, '#0B1530'); c.globalAlpha = 1; }
  }
  function marco(c, kind, x, t, noite) {
    x = Math.round(x);
    if (x < -70 || x > W + 70) return;
    if (kind === 'farois') {   // torres de farol apagadas, uma perto e outra ao longe
      [[x - 26, 1], [x + 34, 0.6]].forEach(([tx, e]) => { const w = Math.round(10 * e), h = Math.round(34 * e);
        ret(c, tx - w / 2, CHAO - h, w, h, '#3E3A40'); ret(c, tx - w / 2 - 1, CHAO - h - 3, w + 2, 3, '#2A272C'); ret(c, tx - 2, CHAO - h - 6, 4, 3, '#1E1C20');
        ret(c, tx - 1, CHAO - h + 6, 2, 3, '#1E1C20'); c.globalAlpha = 0.5; ret(c, tx - w / 2, CHAO - h, w, 2, '#B9B4AE'); c.globalAlpha = 1; });
      return;
    }
    if (kind === 'farol') {   // Ost: torre branca com a brasa no alto
      ret(c, x - 8, CHAO - 50, 16, 50, '#E8E4D8'); ret(c, x - 10, CHAO - 54, 20, 4, '#B9B4AE'); ret(c, x - 5, CHAO - 62, 10, 8, '#8C8F94'); ret(c, x - 2, CHAO - 20, 4, 8, '#5E3D26');
      const f = 0.55 + 0.45 * Math.sin(t * 5); ret(c, x - 2, CHAO - 61, 4, 5, '#7CFFB0'); c.globalAlpha = 0.18 * f; ret(c, x - 26, CHAO - 80, 52, 40, '#7CFFB0'); c.globalAlpha = 1;
      return;
    }
    if (kind === 'ruinas') {
      for (let i = 0; i < 5; i++) { const h = [26, 14, 30, 9, 18][i]; ret(c, x - 34 + i * 16, CHAO - h, 7, h, '#CFC8BC'); ret(c, x - 35 + i * 16, CHAO - h - 2, 9, 2, '#B9B4AE'); }
      ret(c, x - 20, CHAO - 4, 30, 4, '#B9B4AE');
      return;
    }
    if (kind === 'estalagem') {
      ret(c, x - 20, CHAO - 26, 40, 26, COR.madeira); ret(c, x - 22, CHAO - 34, 44, 8, COR.telha); ret(c, x - 16, CHAO - 40, 32, 6, COR.telha);
      ret(c, x - 14, CHAO - 20, 8, 8, COR.luz); ret(c, x - 14, CHAO - 16, 8, 1, COR.madeira2); ret(c, x + 6, CHAO - 18, 10, 18, COR.madeira2); ret(c, x + 9, CHAO - 9, 1, 1, COR.luz);
      ret(c, x + 14, CHAO - 44, 3, 8, COR.pedra2); c.globalAlpha = 0.5; ret(c, x + 14 + Math.round(Math.sin(t * 2) * 2), CHAO - 49, 4, 4, '#E8E4D4'); c.globalAlpha = 1;
    } else if (kind === 'estrada') {
      ret(c, x - 1, CHAO - 14, 3, 14, COR.madeira2); ret(c, x - 8, CHAO - 18, 16, 6, COR.madeira); ret(c, x - 6, CHAO - 16, 12, 1, COR.madeira2);
      ret(c, x + 18, CHAO - 7, 8, 7, COR.pedra2); ret(c, x + 19, CHAO - 8, 6, 2, COR.pedra1); ret(c, x - 26, CHAO - 5, 6, 5, COR.pedra2);
    } else if (kind === 'ponte') {
      ret(c, x - 44, CHAO - 12, 36, 20, COR.pedra2); ret(c, x - 44, CHAO - 12, 36, 3, COR.pedra1); ret(c, x + 8, CHAO - 12, 36, 20, COR.pedra2); ret(c, x + 8, CHAO - 12, 36, 3, COR.pedra1);
      ret(c, x - 8, CHAO + 8, 16, 14, COR.agua1); for (let i = 0; i < 3; i++) ret(c, x - 7 + ((t * 8 + i * 5) % 14), CHAO + 12 + i * 3, 3, 1, COR.agua2);
      ret(c, x - 14, CHAO - 12, 6, 2, COR.madeira); ret(c, x - 16, CHAO - 10, 4, 1, COR.madeira2); ret(c, x + 8, CHAO - 12, 7, 2, COR.madeira); ret(c, x + 10, CHAO - 10, 3, 1, COR.madeira2);
      for (let i = 0; i < 2; i++) { ret(c, x - 38 + i * 70, CHAO - 28, 2, 16, COR.madeira2); ret(c, x - 40 + i * 70, CHAO - 30, 6, 2, COR.madeira); }
    } else if (kind === 'bosque') {
      for (let i = 0; i < 6; i++) { const tx = x - 40 + i * 16 + ((i * 7) % 5), alt = 30 + ((i * 11) % 14);
        ret(c, tx, CHAO - 10, 3, 10, COR.madeira2); for (let k = 0; k < 4; k++) ret(c, tx - 7 + k * 2, CHAO - alt + k * 7 + 6, 17 - k * 4, 7, k % 2 ? COR.folha1 : COR.folha2); }
      c.globalAlpha = 0.5; for (let i = 0; i < 4; i++) ret(c, x - 50 + ((t * 6 + i * 30) % 110), CHAO - 16 + i * 4, 40, 6, '#DDE7EA'); c.globalAlpha = 1;
    } else if (kind === 'vau') {
      ret(c, x - 30, CHAO, 60, 9, COR.agua1); for (let i = 0; i < 6; i++) ret(c, x - 28 + ((t * 10 + i * 11) % 56), CHAO + 2 + (i % 3) * 2, 4, 1, COR.agua2);
      for (let i = 0; i < 4; i++) { ret(c, x - 22 + i * 14, CHAO - 1, 7, 3, COR.pedra1); ret(c, x - 22 + i * 14, CHAO + 2, 7, 1, COR.pedra3); }
    } else if (kind === 'degraus') {
      for (let i = 0; i < 9; i++) ret(c, x - 34 + i * 7, CHAO - 4 - i * 3, 40 - i * 4 + 14, 3 + i * 3 + 4, i % 2 ? COR.pedra2 : COR.pedra1);
      ret(c, x + 24, CHAO - 58, 13, 28, '#7A2E25'); ret(c, x + 27, CHAO - 65, 7, 8, '#7A2E25'); ret(c, x + 28, CHAO - 60, 1, 1, '#FF4B2B'); ret(c, x + 31, CHAO - 60, 1, 1, '#FF4B2B');
    }
  }

  // ── partida: quem aparece e onde
  const ORDEM = ['ysa', 'dorn', 'fabio', 'brisa', 'silvester'];
  function presentes(p) { return ORDEM.filter(id => id === 'fabio' || id === 'silvester' || ['ativa', 'ferida'].includes((p.companhia || {})[id] || 'ativa')); }

  function brilhos(c, t, itens, ini) {
    (itens || []).forEach((it, i) => {
      const u = (t - ini - i * 0.5) / 1.6; if (u < 0 || u > 1) return;
      const cor = { forcas: '#C8CDD3', ativos: '#8B5E3C', pesagens: '#7FE0F2', almocos: '#B5482B', lanches: '#FFD34E' }[it] || '#FFD34E';
      const x = 84 + i * 16, y = 54 - u * 12; ret(c, x, y, 5, 5, cor); ret(c, x + 1, y + 1, 1, 1, '#FFFFFF');
      c.globalAlpha = 1 - u; ret(c, x - 2, y - 2, 9, 1, '#FFF'); ret(c, x + 2, y - 4, 1, 9, '#FFF'); c.globalAlpha = 1;
    });
  }
  function confete(c, t, ini) {
    for (let i = 0; i < 46; i++) { const u = t - ini - ruido(i) * 1.2; if (u < 0) continue; const y = (u * 26 + ruido(i + 5) * 6) % 100, x = ruido(i + 9) * W + Math.sin(u * 3 + i) * 5;
      ret(c, x, y, 2, 2, ['#FF6B5E', '#FFD166', '#5FD3C4', '#FFFFFF', '#7B4FB5'][i % 5]); }
  }
  function fogueira(c, x, t) {
    ret(c, x - 6, CHAO - 2, 12, 2, COR.madeira2); ret(c, x - 4, CHAO - 4, 8, 2, COR.madeira);
    const f = Math.floor(t * 8) % 3, h = [9, 12, 10][f];
    ret(c, x - 3, CHAO - 4 - h, 6, h, COR.fogo3); ret(c, x - 2, CHAO - 4 - h + 2, 4, h - 2, COR.fogo1); ret(c, x - 1, CHAO - 4 - h + 4, 2, h - 5, COR.fogo2);
    c.globalAlpha = 0.16; ret(c, x - 34, CHAO - 34, 68, 36, '#FFB347'); c.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { const u = (t * 0.6 + i * 0.25) % 1; c.globalAlpha = 1 - u; ret(c, x - 2 + Math.sin(t * 2 + i) * 3, CHAO - 18 - u * 22, 2, 2, '#9AA0A6'); }
    c.globalAlpha = 1;
  }

  // ── as cenas
  function cena(c, p, t) {
    const tier = p.tier, antes = p.etapa_antes || 0, depois = p.etapa_depois == null ? antes : p.etapa_depois;
    const noite = tier === 'sustenta' || tier === 'sem_dado';
    ceu(c, p, t, noite);
    const quem = presentes(p), n = quem.length, S = 130;
    const afetado = p.afetado, flipVolta = tier === 'crise' && t > 5.2;
    let esc = 0;
    if (tier === 'avanco') esc = S * Math.abs(depois - antes || 1) * liso((t - 0.6) / 6.6);
    else if (tier === 'triunfo') esc = S * Math.max(1, Math.abs(depois - antes)) * liso((t - 0.5) / 6.2);
    else if (tier === 'crise') esc = t < 3 ? S * 0.3 * liso(t / 3) : S * 0.3 - S * 1.0 * liso((t - 5.2) / 3.3) - (S * 0.3 * (t > 3 ? 0 : 1)) * 0;
    else if (tier === 'reves') esc = t < 5 ? S * 0.45 * liso(t / 5) : S * 0.45;
    montanhas(c, esc, noite ? '#1B2A55' : '#7C93A6', 66, 22, 0.15);
    montanhas(c, esc, noite ? '#142245' : '#5F7B6A', 74, 14, 0.4);
    chao(c, esc, noite);
    // marcos (do mundo): o ponto de partida e o de chegada
    const dir = depois >= antes ? 1 : -1;
    if (['avanco', 'triunfo'].includes(tier)) {
      const passos = Math.max(1, Math.abs(depois - antes) || 1);
      for (let k = 0; k <= passos; k++) marco(c, kindDe(p, antes + k * dir), 100 + k * S - esc, t, noite);
    } else if (tier === 'crise') {
      marco(c, kindDe(p, antes), 120 - esc * (esc < 0 ? 1 : 1), t, noite); marco(c, kindDe(p, Math.max(0, antes - 1)), 120 - S - esc, t, noite);
    } else marco(c, kindDe(p, antes), noite ? 160 : 140, t, noite);
    if (tier === 'sustenta' || tier === 'sem_dado') fogueira(c, 100, t);

    // personagens
    const frame = Math.floor(t * 6) % 2;
    const x0 = tier === 'sustenta' || tier === 'sem_dado' ? 0 : 36;
    quem.forEach((id, i) => {
      let x = x0 + i * 16 + 14, y = CHAO + 2, o = { frame, flip: flipVolta };
      if (tier === 'sustenta' || tier === 'sem_dado') { o.sentado = true; const lado = i < 3 ? -1 : 1; x = 100 + lado * (14 + (lado < 0 ? (2 - i) : (i - 3)) * 15); y = CHAO + 2; o.flip = lado > 0; o.brilho = false; if (id === 'silvester') o.brilho = true; }
      if (tier === 'triunfo') { y -= Math.max(0, Math.sin(t * 7 + i * 1.3)) * 4; o.frame = Math.floor(t * 9) % 2; }
      if (tier === 'avanco') { y -= (Math.sin(t * 6 + i) > 0.9 ? 1 : 0); }
      if (tier === 'reves') {
        if (id === afetado) { o.ferido = true; o.frame = Math.floor(t * 2.5) % 2; x -= t < 5 ? 6 + Math.sin(t * 2) * 2 : 0; if (t > 5.2) { o.sentado = true; o.frame = 0; y = CHAO + 2; } }
        else if (t > 5.2) o.frame = 0;
      }
      if (tier === 'crise') {
        if (flipVolta) x = x0 + (n - 1 - i) * 16 + 14 + 6;
        if (id === afetado) {
          const u = liso((t - 2.6) / 1.6);
          if (t > 4.4) return;
          y += u * 14; o.alfa = 1 - u; x -= 4 * u; o.ferido = t > 2.4;
        }
      }
      if (tier === 'sem_dado') o.alfa = 0.8;
      sprite(c, id, x, y - 0, o);
    });
    if (tier === 'crise' && afetado) {   // a sombra que leva
      const u = liso((t - 2.2) / 1.2), v = liso((t - 3.6) / 0.9);
      if (t > 2.2 && t < 4.6) { const idx = quem.indexOf(afetado), bx = x0 + idx * 16 + 10 - 4 * liso((t - 2.6) / 1.6); c.globalAlpha = 0.95 * (1 - v); for (let k = 0; k < 4; k++) ret(c, bx + k * 2 - 3 + Math.sin(t * 9 + k) * 1, CHAO + 4 - Math.round(u * (16 + k * 2)), 2, Math.round(u * (16 + k * 2)), '#0B0710'); ret(c, bx - 3, CHAO + 4 - Math.round(u * 24), 8, 3, '#0B0710'); ret(c, bx - 1, CHAO + 4 - Math.round(u * 24) + 1, 1, 1, '#FF4B2B'); ret(c, bx + 3, CHAO + 4 - Math.round(u * 24) + 1, 1, 1, '#FF4B2B'); c.globalAlpha = 1; }
    }
    if (p.retorna && (tier === 'avanco' || tier === 'triunfo') && t > 6.2) {   // quem foi resgatado ou voltou
      const u = (t - 6.2) / 1.2, a = Math.min(1, u); sprite(c, p.retorna, x0 - 6, CHAO + 2, { alfa: a, frame }); c.globalAlpha = Math.max(0, 1 - u); ret(c, x0 - 10, CHAO - 18, 9, 1, '#FFF'); ret(c, x0 - 6, CHAO - 22, 1, 9, '#FFF'); c.globalAlpha = 1;
    }
    if (p.talisma && (tier === 'sustenta' || tier === 'reves') && t > 1.2 && t < 3) {   // o talismã que quebra
      const u = (t - 1.2) / 1.8; for (let k = 0; k < 6; k++) { c.globalAlpha = 1 - u; ret(c, 96 + Math.cos(k) * u * 22, 46 + Math.sin(k * 2) * u * 14 + u * 8, 2, 2, ['#7FE0F2', '#FFD34E', '#FFFFFF'][k % 3]); } c.globalAlpha = 1;
    }
    if (tier === 'triunfo') { confete(c, t, 1.5); brilhos(c, t, p.itens, 4.2); ret(c, 100 + Math.round(S * 0) + 0, CHAO - 34, 1, 34, '#F4F0E6'); }
    if (tier === 'avanco') brilhos(c, t, p.itens, 4.5);
    if (['reves', 'crise', 'sustenta'].includes(tier) && (p.clima === 'chuvosa' || p.clima === 'tempestade' || tier === 'crise')) chuva(c, p, t, p.clima === 'tempestade' || tier === 'crise');
    if (tier === 'crise') relampago(c, t, [0.9, 2.1, 2.5, 5.0]);
    if (p.clima === 'tempestade' && tier !== 'crise') relampago(c, t, [2.7, 6.1]);
    if (tier === 'crise') { c.globalAlpha = 0.28 * Math.min(1, t / 2); ret(c, 0, 0, W, H, '#0B0710'); c.globalAlpha = 1; }
    if (tier === 'reves') { c.globalAlpha = 0.16; for (let i = 0; i < 3; i++) ret(c, ((t * 8 + i * 70) % (W + 60)) - 40, CHAO - 12 + i * 6, 60, 8, '#E8EEF0'); c.globalAlpha = 1; }
    if (tier === 'sem_dado') { c.globalAlpha = 0.55; for (let i = 0; i < 6; i++) ret(c, ((t * 6 + i * 50) % (W + 80)) - 60, 24 + i * 11, 90, 10, '#DDE7EA'); c.globalAlpha = 0.5; ret(c, 0, 0, W, H, '#CFD8DC'); c.globalAlpha = 1; }
  }

  // ── execução: um canvas por cena, laço de 9 s a 12 quadros por segundo; movimento reduzido mostra o quadro final
  const ativos = new Map();
  function iniciar(canvas, p) {
    parar(canvas); canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    const reduzido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const est = { p, t0: performance.now(), pausado: reduzido, ultimo: 0, raf: 0, fixo: reduzido ? LOOP - 0.8 : null };
    const passo = (agora) => {
      est.raf = requestAnimationFrame(passo);
      if (!canvas.isConnected) { parar(canvas); return; }
      if (agora - est.ultimo < 1000 / 12) return; est.ultimo = agora;
      const t = est.fixo != null ? est.fixo : ((agora - est.t0) / 1000) % (LOOP + 1.2);
      cena(c, est.p, Math.min(t, LOOP));
    };
    ativos.set(canvas, est); est.raf = requestAnimationFrame(passo);
    if (reduzido) cena(c, p, est.fixo);
    return est;
  }
  function parar(canvas) { const e = ativos.get(canvas); if (e) { cancelAnimationFrame(e.raf); ativos.delete(canvas); } }
  function quadro(canvas, p, t) { parar(canvas); canvas.width = W; canvas.height = H; const c = canvas.getContext('2d'); cena(c, p, t); }
  function miniatura(canvas, id, estado) {   // personagem parado, para os cartões da companhia
    canvas.width = 16; canvas.height = 18; const c = canvas.getContext('2d'); c.clearRect(0, 0, 16, 18);
    sprite(c, id, 8, 17, { frame: 0, alfa: ['capturada', 'perdida'].includes(estado) ? 0.35 : 1, ferido: estado === 'ferida', brilho: false });
  }
  return { iniciar, parar, quadro, miniatura, W, H, LOOP };
})();
