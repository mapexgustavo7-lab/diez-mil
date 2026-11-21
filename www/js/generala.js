// Anotador de generala: planilla con una columna por jugador. Cada casillero se completa eligiendo
// entre los puntajes posibles de esa jugada (no se escribe nada). La doble generala servida gana el partido.
// La partida se guarda en el teléfono. Usa esc(), render() y conocidos() de app.js.

const Generala = (() => {
  const CLAVE = 'anotadores.generala';

  const JUGADAS = [
    ['1', 'Uno'], ['2', 'Dos'], ['3', 'Tres'], ['4', 'Cuatro'], ['5', 'Cinco'], ['6', 'Seis'],
    ['E', 'Escalera'], ['F', 'Full'], ['P', 'Póker'], ['G', 'Generala'], ['D', 'Doble generala']
  ];
  const DETALLE = { E: '20 · servida 25', F: '30 · servida 35', P: '40 · servida 45', G: '50 · servida 55', D: '100 · servida gana' };
  const SERVIDA_GANA = 'S'; // valor guardado para la doble generala servida

  // Puntajes posibles de cada jugada: [valor, texto del botón].
  function opciones(k) {
    if (/\d/.test(k)) return [1, 2, 3, 4, 5].map(n => [n * Number(k), String(n * Number(k))]);
    return {
      E: [[20, '20'], [25, 'Servida 25']],
      F: [[30, '30'], [35, 'Servida 35']],
      P: [[40, '40'], [45, 'Servida 45']],
      G: [[50, '50'], [55, 'Servida 55']],
      D: [[100, '100'], [SERVIDA_GANA, 'Servida: gana']]
    }[k];
  }

  const nuevo = () => ({ jugadores: [], turno: 0, historial: [] });
  let st = (() => {
    try {
      const e = JSON.parse(localStorage.getItem(CLAVE));
      return e && Array.isArray(e.jugadores) ? e : nuevo();
    } catch { return nuevo(); }
  })();
  // sel: casillero abierto { p, k } o null
  let ui = { cantidad: 2, nombres: Array(7).fill(''), sel: null, confirmar: false };

  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch { /* sin almacenamiento */ } };
  const total = j => Object.values(j.v).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const completa = j => JUGADAS.every(([k]) => j.v[k] !== undefined);

  // Ganador: quien hizo la doble servida, o el de más puntos cuando se llenó toda la planilla.
  function ganadores() {
    const js = st.jugadores;
    const servida = js.findIndex(j => j.v.D === SERVIDA_GANA);
    if (servida >= 0) return { idx: [servida], servida: true };
    if (!js.length || !js.every(completa)) return null;
    const max = Math.max(...js.map(total));
    return { idx: js.map((j, i) => i).filter(i => total(js[i]) === max), servida: false };
  }

  const mostrar = x => x === undefined ? '·' : x === 0 ? '✕' : x === SERVIDA_GANA ? 'Gana' : x;

  // ---------- Pantallas ----------

  function inicio() {
    const sugeridos = typeof conocidos === 'function' ? conocidos() : [];
    return `
      <div class="card">
        <h2>Nueva partida</h2>
        <p class="label">Cantidad de jugadores</p>
        <div class="chips">
          ${[2, 3, 4, 5, 6, 7].map(n => `<button class="chip ${ui.cantidad === n ? 'on' : ''}" data-g="cantidad" data-v="${n}">${n}</button>`).join('')}
        </div>
        ${Array.from({ length: ui.cantidad }, (_, i) => `
          <label class="field"><span>Jugador ${i + 1}</span>
            <input data-g-nombre="${i}" maxlength="20" value="${esc(ui.nombres[i])}" placeholder="Jugador ${i + 1}" autocomplete="off" list="g-conocidos">
          </label>`).join('')}
        <datalist id="g-conocidos">${sugeridos.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <button class="btn block" style="margin-top:16px" data-g="empezar">Empezar partida</button>
      </div>`;
  }

  function planilla() {
    const js = st.jugadores;
    const fin = ganadores();
    const ronda = Math.min(11, 1 + Math.min(...js.map(j => Object.keys(j.v).length)));
    const filas = JUGADAS.map(([k, nombre]) => `
      <tr>
        <th scope="row">${nombre}${DETALLE[k] ? `<small>${DETALLE[k]}</small>` : ''}</th>
        ${js.map((j, p) => {
          const x = j.v[k];
          const clases = ['celda', x === undefined ? 'vacia' : '', x === 0 ? 'tachada' : '', x === SERVIDA_GANA ? 'gana' : '',
            p === st.turno && x === undefined && !fin ? 'turno' : ''].join(' ');
          return `<td><button class="${clases}" data-g="abrir" data-v="${p}:${k}">${mostrar(x)}</button></td>`;
        }).join('')}
      </tr>`).join('');
    let titulo;
    if (fin && fin.servida) titulo = `¡${esc(js[fin.idx[0]].nombre)} ganó con doble servida!`;
    else if (fin) titulo = fin.idx.length > 1 ? `Empate: ${fin.idx.map(i => esc(js[i].nombre)).join(' y ')}` : `Ganó ${esc(js[fin.idx[0]].nombre)}`;
    else titulo = `Le toca a <span class="acento">${esc(js[st.turno].nombre)}</span>`;
    return `
      <div class="truco-cabecera">
        <span class="kicker">GENERALA</span>
        <span class="pill">${fin ? 'Terminada' : `Ronda ${ronda} de 11`}</span>
      </div>
      <p class="titulo-serif generala-titulo">${titulo}</p>
      ${fin ? `
        <div class="winner">
          🏆 ${fin.idx.map(i => esc(js[i].nombre)).join(' y ')} ${fin.servida ? 'hizo la doble generala servida' : `con ${total(js[fin.idx[0]])} puntos`}
          <div class="actions" style="margin-top:8px">
            <button class="btn" data-g="revancha">Revancha</button>
            <button class="btn text" data-g="cambiar">Otros jugadores</button>
          </div>
        </div>` : ''}
      <div class="card planilla-card">
        <div class="planilla-wrap">
          <table class="planilla">
            <thead><tr><th scope="col">Jugada</th>${js.map((j, p) => `<th scope="col" class="${p === st.turno && !fin ? 'acento' : ''}">${esc(j.nombre)}</th>`).join('')}</tr></thead>
            <tbody>${filas}</tbody>
            <tfoot><tr><th scope="row">Total</th>${js.map((j, p) => `<td class="total">${fin && fin.servida && fin.idx[0] === p ? 'Ganó' : total(j)}</td>`).join('')}</tr></tfoot>
          </table>
        </div>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="btn text" data-g="deshacer" ${st.historial.length ? '' : 'disabled'}>Deshacer</button>
        <button class="btn text danger" data-g="nueva">Nueva partida</button>
      </div>
      <p class="hint" style="text-align:center">Tocá un casillero para anotar. Si te equivocaste, tocalo de nuevo para cambiarlo.</p>`;
  }

  // Hoja de abajo con los puntajes posibles del casillero elegido.
  function hoja() {
    const { p, k } = ui.sel;
    const j = st.jugadores[p];
    const actual = j.v[k];
    const nombre = JUGADAS.find(x => x[0] === k)[1];
    return `
      <div class="overlay abajo" data-g="cerrar">
        <div class="hoja" role="dialog" aria-modal="true">
          <p class="titulo-serif" style="font-size:19px;margin:0 0 4px">${esc(j.nombre)} · ${nombre}</p>
          ${actual !== undefined ? `<p class="note" style="margin:0 0 8px">Anotado: ${mostrar(actual)}</p>` : '<div style="height:8px"></div>'}
          <div class="opciones">
            ${opciones(k).map(([val, txt]) => `<button class="opcion ${val === SERVIDA_GANA ? 'fuerte' : ''}" data-g="elegir" data-v="${val}">${txt}</button>`).join('')}
            <button class="opcion tachar" data-g="elegir" data-v="0">Tachar ✕</button>
          </div>
          <div class="actions" style="margin-top:12px">
            ${actual !== undefined ? '<button class="btn text danger" data-g="borrar">Borrar casillero</button>' : '<span></span>'}
            <button class="btn text" data-g="cerrar">Cancelar</button>
          </div>
        </div>
      </div>`;
  }

  function dialogo() {
    return `
      <div class="overlay" data-g="cancelar">
        <div class="dialog" role="dialog" aria-modal="true">
          <h2>¿Empezar otra partida?</h2>
          <p>Se borra la planilla de esta partida.</p>
          <div class="actions">
            <button class="btn text" data-g="cancelar">Cancelar</button>
            <button class="btn text danger" data-g="confirmar">Empezar de nuevo</button>
          </div>
        </div>
      </div>`;
  }

  // ---------- Acciones ----------

  // Anota (o borra, con valor undefined) un casillero. Si estaba vacío, pasa el turno al siguiente de quien anotó.
  function anotar(valor) {
    const { p, k } = ui.sel;
    const j = st.jugadores[p];
    const antes = j.v[k];
    st.historial.push({ p, k, antes, turno: st.turno });
    if (valor === undefined) delete j.v[k]; else j.v[k] = valor;
    if (antes === undefined && valor !== undefined) st.turno = (p + 1) % st.jugadores.length;
    ui.sel = null;
    guardar(); render();
  }

  function deshacer() {
    const h = st.historial.pop();
    if (!h) return;
    const j = st.jugadores[h.p];
    if (h.antes === undefined) delete j.v[h.k]; else j.v[h.k] = h.antes;
    st.turno = h.turno;
    guardar(); render();
  }

  function empezar(nombres) {
    st = { jugadores: nombres.map(nombre => ({ nombre, v: {} })), turno: 0, historial: [] };
    ui.confirmar = false; ui.sel = null;
    guardar(); render();
  }

  function volverAlInicio() {
    ui.cantidad = Math.max(2, st.jugadores.length);
    st.jugadores.forEach((j, i) => { ui.nombres[i] = /^Jugador \d+$/.test(j.nombre) ? '' : j.nombre; });
    st = nuevo(); ui.confirmar = false; ui.sel = null;
    guardar(); render();
  }

  return {
    enCurso: () => st.jugadores.length > 0,

    html() {
      return `
        <div class="screen juego-generala">
          <button class="volver" data-juego="">‹ Juegos</button>
          ${st.jugadores.length ? planilla() : `<p class="kicker">DADOS · ANOTADOR</p><h1 class="titulo-serif">Generala</h1>
            <p class="tagline">Tocá el casillero y elegí el puntaje.</p>${inicio()}`}
        </div>
        ${ui.sel ? hoja() : ''}
        ${ui.confirmar ? dialogo() : ''}`;
    },

    click(e) {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      if (b.classList.contains('overlay') && e.target !== b) return;
      const v = b.dataset.v;
      switch (b.dataset.g) {
        case 'cantidad': ui.cantidad = Number(v); render(); break;
        case 'empezar':
          empezar(Array.from({ length: ui.cantidad }, (_, i) => ui.nombres[i].trim().replace(/\s+/g, ' ') || `Jugador ${i + 1}`));
          break;
        case 'abrir': {
          if (ganadores()?.servida) return; // partido terminado por doble servida
          const [p, k] = v.split(':');
          ui.sel = { p: Number(p), k }; render();
          break;
        }
        case 'elegir': anotar(v === SERVIDA_GANA ? SERVIDA_GANA : Number(v)); break;
        case 'borrar': anotar(undefined); break;
        case 'cerrar': ui.sel = null; render(); break;
        case 'deshacer': deshacer(); break;
        case 'nueva':
          if (st.historial.length && !ganadores()) { ui.confirmar = true; render(); } else volverAlInicio();
          break;
        case 'revancha': empezar(st.jugadores.map(j => j.nombre)); break;
        case 'cambiar': volverAlInicio(); break;
        case 'cancelar': ui.confirmar = false; render(); break;
        case 'confirmar': volverAlInicio(); break;
      }
    },

    input(e) {
      const t = e.target;
      if (t.dataset.gNombre !== undefined) ui.nombres[Number(t.dataset.gNombre)] = t.value;
    }
  };
})();
