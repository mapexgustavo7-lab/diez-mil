// Anotador de truco: dos equipos, puntos anotados a mano (tocando el equipo o con + y −),
// dibujados como fósforos de a 5. A 30 (15 malas + 15 buenas) o a 15.
// La partida se guarda en el teléfono. Usa esc() y render() de app.js.

const Truco = (() => {
  const CLAVE = 'anotadores.truco';

  const nuevo = () => ({ enCurso: false, equipos: ['Nosotros', 'Ellos'], meta: 30, puntos: [0, 0], historial: [] });
  let st = (() => {
    try {
      const e = JSON.parse(localStorage.getItem(CLAVE));
      return e && Array.isArray(e.puntos) ? e : nuevo();
    } catch { return nuevo(); }
  })();
  let ui = { nombres: ['', ''], meta: 30, confirmar: false };

  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch { /* sin almacenamiento */ } };
  const ganador = () => st.puntos.findIndex(p => p >= st.meta);

  // ---------- Fósforos ----------

  // Cada fósforo: palito de madera con la cabeza roja. 4 forman el cuadrado y el 5.º lo cruza.
  const PALITOS = [[6, 8, 6, 38], [8, 6, 38, 6], [40, 8, 40, 38], [38, 40, 8, 40], [9, 37, 37, 9]];
  function palito([x1, y1, x2, y2]) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d9b26f" stroke-width="3.2" stroke-linecap="round"/>`
      + `<circle cx="${x2 + Math.cos(a) * 1.5}" cy="${y2 + Math.sin(a) * 1.5}" r="3.6" fill="#c0392b"/>`;
  }
  function fosforos(n) {
    let html = '';
    for (let g = 0, resto = n; resto > 0; g++, resto -= 5) {
      if (g === 3 && st.meta === 30) html += '<div class="buenas"><span>buenas</span></div>';
      html += `<svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">${PALITOS.slice(0, Math.min(5, resto)).map(palito).join('')}</svg>`;
    }
    return html;
  }

  // 1 de espadas dibujado (no es la imagen de un mazo real), suave de fondo.
  const ESPADA = `
    <svg class="fondo-carta" viewBox="0 0 340 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="70" y="70" width="200" height="500" rx="18" fill="none" stroke="#e9c46a" stroke-width="2"/>
      <rect x="80" y="80" width="180" height="480" rx="12" fill="none" stroke="#e9c46a" stroke-width="1"/>
      <text x="92" y="112" fill="#e9c46a" font-size="26" font-family="serif">1</text>
      <text x="248" y="548" fill="#e9c46a" font-size="26" font-family="serif" text-anchor="end">1</text>
      <path d="M170 110 L184 150 L182 420 L170 450 L158 420 L156 150 Z" fill="#9fb4c7"/>
      <path d="M170 118 L170 440" stroke="#dfe8ef" stroke-width="2"/>
      <path d="M112 448 C130 430 150 440 170 448 C190 440 210 430 228 448 C214 456 196 452 170 462 C144 452 126 456 112 448 Z" fill="#e9c46a"/>
      <circle cx="112" cy="448" r="7" fill="#c0392b"/><circle cx="228" cy="448" r="7" fill="#c0392b"/>
      <rect x="161" y="462" width="18" height="58" rx="5" fill="#8b5a2b"/>
      <path d="M161 474 L179 482 M161 488 L179 496 M161 502 L179 510" stroke="#5c3a1a" stroke-width="2"/>
      <circle cx="170" cy="530" r="13" fill="#e9c46a"/><circle cx="170" cy="530" r="5" fill="#c0392b"/>
      <path d="M120 200 C100 230 105 270 125 290 M220 200 C240 230 235 270 215 290" stroke="#5f9e6e" stroke-width="3" fill="none"/>
    </svg>`;

  // ---------- Pantallas ----------

  function inicio() {
    return `
      <div class="card">
        <h2>Nueva partida</h2>
        <p class="label">¿A cuántos?</p>
        <div class="chips">
          ${[30, 15].map(m => `<button class="chip ${ui.meta === m ? 'on' : ''}" data-t="meta" data-v="${m}">A ${m}</button>`).join('')}
        </div>
        ${[0, 1].map(i => `
          <label class="field"><span>Equipo ${i + 1}</span>
            <input data-t-nombre="${i}" maxlength="24" value="${esc(ui.nombres[i])}" placeholder="${i ? 'Ellos' : 'Nosotros'}" autocomplete="off">
          </label>`).join('')}
        <p class="note">Podés poner los nombres de la pareja, por ejemplo "Gustavo y Ana".</p>
        <button class="btn block" style="margin-top:12px" data-t="empezar">Empezar partida</button>
      </div>`;
  }

  function tablero() {
    const g = ganador();
    const max = Math.max(...st.puntos);
    const estado = st.meta === 15 ? 'A 15' : max >= 15 ? 'Buenas' : 'Malas';
    const lado = i => `
      <div class="truco-lado ${g === i ? 'gano' : ''}" data-t="sumar" data-v="${i}" role="button" aria-label="Sumar 1 a ${esc(st.equipos[i])}">
        <p class="truco-nombre">${esc(st.equipos[i])}</p>
        <div class="truco-num">${st.puntos[i]}</div>
        <div class="truco-fosforos">${fosforos(st.puntos[i])}</div>
      </div>`;
    const botones = i => `
      <div class="truco-pm">
        <button data-t="restar" data-v="${i}" aria-label="Restar 1 a ${esc(st.equipos[i])}">−</button>
        <button class="mas" data-t="sumar" data-v="${i}">+1</button>
      </div>`;
    return `
      <div class="truco-cabecera">
        <span class="kicker">TRUCO · A ${st.meta}</span>
        <span class="pill">${estado}</span>
      </div>
      ${g >= 0 ? `
        <div class="winner">
          🏆 Ganó ${esc(st.equipos[g])}, ${st.puntos[g]} a ${st.puntos[1 - g]}
          <div class="actions" style="margin-top:8px">
            <button class="btn" data-t="revancha">Revancha</button>
            <button class="btn text" data-t="cambiar">Otros equipos</button>
          </div>
        </div>` : ''}
      <div class="truco-campo">${lado(0)}${lado(1)}</div>
      <div class="truco-campo">${botones(0)}${botones(1)}</div>
      <div class="actions" style="margin-top:14px">
        <button class="btn text" data-t="deshacer" ${st.historial.length ? '' : 'disabled'}>Deshacer</button>
        <button class="btn text danger" data-t="nueva">Nueva partida</button>
      </div>
      <p class="hint" style="text-align:center">Tocá la mitad de un equipo para sumarle 1.</p>`;
  }

  function dialogo() {
    return `
      <div class="overlay" data-t="cancelar">
        <div class="dialog" role="dialog" aria-modal="true">
          <h2>¿Empezar otra partida?</h2>
          <p>Se borran los puntos de esta partida.</p>
          <div class="actions">
            <button class="btn text" data-t="cancelar">Cancelar</button>
            <button class="btn text danger" data-t="confirmar">Empezar de nuevo</button>
          </div>
        </div>
      </div>`;
  }

  // ---------- Acciones ----------

  function cambiar(i, d) {
    if (d > 0 && ganador() >= 0) return;
    const valor = Math.max(0, Math.min(st.meta, st.puntos[i] + d));
    if (valor === st.puntos[i]) return;
    st.historial.push([i, st.puntos[i]]);
    st.puntos[i] = valor;
    guardar(); render();
  }

  function empezar(equipos, meta) {
    st = { enCurso: true, equipos, meta, puntos: [0, 0], historial: [] };
    ui.confirmar = false;
    guardar(); render();
  }

  // Vuelve a la pantalla inicial con los mismos equipos ya cargados.
  function volverAlInicio() {
    ui.nombres = st.equipos.map((n, i) => n === (i ? 'Ellos' : 'Nosotros') ? '' : n);
    ui.meta = st.meta;
    st = nuevo(); ui.confirmar = false;
    guardar(); render();
  }

  return {
    enCurso: () => st.enCurso,

    html() {
      return `
        ${ESPADA}
        <div class="screen juego-truco">
          <button class="volver" data-juego="">‹ Juegos</button>
          ${st.enCurso ? tablero() : `<p class="kicker">CARTAS · ANOTADOR</p><h1 class="titulo-serif">Truco</h1>
            <p class="tagline">Anotá con fósforos, como en la servilleta.</p>${inicio()}`}
        </div>
        ${ui.confirmar ? dialogo() : ''}`;
    },

    click(e) {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      if (b.classList.contains('overlay') && e.target !== b) return;
      const v = b.dataset.v;
      switch (b.dataset.t) {
        case 'meta': ui.meta = Number(v); render(); break;
        case 'empezar':
          empezar(ui.nombres.map((n, i) => n.trim().replace(/\s+/g, ' ') || (i ? 'Ellos' : 'Nosotros')), ui.meta);
          break;
        case 'sumar': cambiar(Number(v), 1); break;
        case 'restar': cambiar(Number(v), -1); break;
        case 'deshacer': {
          const h = st.historial.pop();
          if (h) { st.puntos[h[0]] = h[1]; guardar(); render(); }
          break;
        }
        case 'nueva':
          // Sin puntos anotados no hay nada que perder: no pregunta.
          if (st.puntos.some(p => p > 0) && ganador() < 0) { ui.confirmar = true; render(); } else volverAlInicio();
          break;
        case 'revancha': empezar(st.equipos, st.meta); break;
        case 'cambiar': volverAlInicio(); break;
        case 'cancelar': ui.confirmar = false; render(); break;
        case 'confirmar': volverAlInicio(); break;
      }
    },

    input(e) {
      const t = e.target;
      if (t.dataset.tNombre !== undefined) ui.nombres[Number(t.dataset.tNombre)] = t.value;
    }
  };
})();
