// Anotador 10.000: lleva los puntajes de una partida de dados.
// La partida en curso y las partidas terminadas (para el ranking) se guardan en el teléfono.

const META = 10000;
const MAX_TURNO = 1000000;
const CLAVE = 'diezmil.partida';
const CLAVE_PARTIDAS = 'diezmil.partidas';
const RAPIDOS = [50, 100, 500, 1000];
const NOMBRE_GENERICO = /^Jugador \d+$/;

const app = document.getElementById('app');

// Juego abierto: null = pantalla para elegir juego, 'diezmil', 'truco' o 'generala'.
const CLAVE_JUEGO = 'anotadores.juego';
const JUEGOS = ['diezmil', 'truco', 'generala'];
// Color de la barra del celular según el juego (igual al fondo de cada tema en styles.css).
const COLOR_BARRA = { inicio: '#0b0f0d', diezmil: '#0b0f0d', truco: '#0a0d0c', generala: '#0d1220' };
let juego = (() => { try { const j = localStorage.getItem(CLAVE_JUEGO); return JUEGOS.includes(j) ? j : null; } catch { return null; } })();

function elegirJuego(j) {
  juego = JUEGOS.includes(j) ? j : null;
  try { localStorage.setItem(CLAVE_JUEGO, juego || ''); } catch { /* sin almacenamiento */ }
  scrollTo(0, 0);
  render();
}

let estado = cargar(CLAVE, e => e && Array.isArray(e.jugadores)) || nuevoEstado();
// Partidas terminadas: { fecha, ganador, jugadores: [{ nombre, total }] }
let partidas = cargar(CLAVE_PARTIDAS, Array.isArray) || [];
// confirmar: null | 'reiniciar' | 'borrarRanking' | 'salirGrupo'
let ui = {
  vista: 'partida', cantidad: 2, nombres: Array(7).fill(''), puntos: '', error: '', confirmar: null,
  // Ranking compartido
  grupoNombre: '', grupoCodigo: '', grupoError: '', grupoAviso: '', grupoOcupado: false,
  // Corrección de un puntaje: { j: jugador, r: ronda } o null
  corregir: null, corregirValor: '', corregirError: ''
};

function nuevoEstado() {
  // historial: índices de jugador en el orden en que se cargaron los puntos (para deshacer).
  return { jugadores: [], turno: 0, historial: [] };
}

function cargar(clave, valido) {
  try {
    const e = JSON.parse(localStorage.getItem(clave));
    return valido(e) ? e : null;
  } catch { return null; }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
    localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify(partidas));
  } catch { /* sin almacenamiento: sigue en memoria */ }
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const fmt = n => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('es-AR');
const total = j => j.puntos.reduce((a, b) => a + b, 0);
// Mismo jugador aunque se escriba con otras mayúsculas o espacios.
const claveNombre = n => n.trim().replace(/\s+/g, ' ').toLowerCase();

function ganadorActual() {
  const js = estado.jugadores;
  if (!js.length) return null;
  const totales = js.map(total);
  const maximo = Math.max(...totales);
  return maximo >= META ? { nombre: js[totales.indexOf(maximo)].nombre, total: maximo } : null;
}

// Partidas terminadas: las del grupo compartido si el celular está en uno, si no las de este celular.
function listaPartidas() {
  return Nube.grupo() ? Nube.partidas() : partidas;
}

// Ranking a partir de las partidas terminadas. Los "Jugador N" sin nombre no cuentan.
function ranking() {
  const tabla = new Map();
  for (const p of listaPartidas()) {
    for (const j of p.jugadores) {
      if (NOMBRE_GENERICO.test(j.nombre)) continue;
      const k = claveNombre(j.nombre);
      const r = tabla.get(k) || { nombre: j.nombre, jugadas: 0, ganadas: 0, mejor: 0 };
      r.nombre = j.nombre; // queda la forma escrita más reciente
      r.jugadas++;
      r.mejor = Math.max(r.mejor, j.total);
      if (claveNombre(p.ganador) === k) r.ganadas++;
      tabla.set(k, r);
    }
  }
  return [...tabla.values()].sort((a, b) =>
    b.ganadas - a.ganadas || b.ganadas / b.jugadas - a.ganadas / a.jugadas || b.jugadas - a.jugadas);
}

// Nombres ya usados, de los que más jugaron a los que menos.
function conocidos() {
  return ranking().slice().sort((a, b) => b.jugadas - a.jugadas).map(r => r.nombre);
}

// ---------- Pantallas ----------

function render() {
  const tema = juego || 'inicio';
  document.body.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
  if (!juego) { app.innerHTML = pantallaJuegos(); return; }
  if (juego === 'truco') { app.innerHTML = Truco.html(); return; }
  if (juego === 'generala') { app.innerHTML = Generala.html(); return; }

  const enJuego = estado.jugadores.length > 0;
  app.innerHTML = `
    <div class="screen">
      <button class="volver" data-juego="">‹ Juegos</button>
      <p class="kicker">DADOS · ANOTADOR</p>
      <h1>10.000</h1>
      <p class="tagline">Lleven la cuenta. Disfruten la partida.</p>
      <div class="tabs">
        <button class="${ui.vista === 'partida' ? 'on' : ''}" data-vista="partida">${enJuego ? 'Partida' : 'Nueva partida'}</button>
        <button class="${ui.vista === 'ranking' ? 'on' : ''}" data-vista="ranking">Ranking</button>
      </div>
      ${ui.vista === 'ranking' ? pantallaRanking() : enJuego ? pantallaPartida() : pantallaInicio()}
      ${ui.vista === 'partida' ? '<p class="hint">Anotá el puntaje obtenido en cada turno. Si no sumó, tocá Sumar sin escribir nada y se anota 0.</p>' : ''}
    </div>
    ${ui.confirmar ? dialogo() : ''}
    ${ui.corregir ? dialogoCorregir() : ''}`;
}

// Pantalla de entrada: elegir a qué se juega. Marca los juegos que tienen una partida a medias.
function pantallaJuegos() {
  const tarjeta = (id, icono, nombre, detalle, enCurso) => `
    <button class="juego-card juego-${id}" data-juego="${id}">
      <span class="juego-icono" aria-hidden="true">${icono}</span>
      <span class="juego-texto"><b>${nombre}</b><small>${detalle}</small></span>
      ${enCurso ? '<span class="pill">En curso</span>' : '<span class="juego-flecha" aria-hidden="true">›</span>'}
    </button>`;
  return `
    <div class="screen">
      <p class="kicker">ANOTADORES</p>
      <h1>¿Qué jugamos?</h1>
      <p class="tagline">Elegí el juego y anotá sin papel ni birome.</p>
      ${tarjeta('diezmil', '🎲', '10.000', 'Dados · 2 a 7 jugadores', estado.jugadores.length > 0)}
      ${tarjeta('truco', '⚔️', 'Truco', 'Cartas · 2 equipos, con fósforos', Truco.enCurso())}
      ${tarjeta('generala', '📋', 'Generala', 'Dados · planilla de 2 a 7 jugadores', Generala.enCurso())}
    </div>`;
}

function pantallaInicio() {
  const chips = [2, 3, 4, 5, 6, 7].map(n =>
    `<button class="chip ${ui.cantidad === n ? 'on' : ''}" data-cantidad="${n}">${n}</button>`).join('');
  const usados = new Set(ui.nombres.slice(0, ui.cantidad).map(claveNombre));
  const sugeridos = conocidos();
  const frecuentes = sugeridos.length ? `
    <p class="label" style="margin-top:16px">Jugadores conocidos</p>
    <div class="chips">${sugeridos.map(n =>
      `<button class="chip ${usados.has(claveNombre(n)) ? 'on' : ''}" data-conocido="${esc(n)}">${esc(n)}</button>`).join('')}
    </div>` : '';
  const campos = Array.from({ length: ui.cantidad }, (_, i) => `
    <label class="field"><span>Jugador ${i + 1}</span>
      <input data-nombre="${i}" maxlength="20" value="${esc(ui.nombres[i])}" placeholder="Jugador ${i + 1}" autocomplete="off" list="lista-conocidos">
    </label>`).join('');
  return `
    <div class="card">
      <h2>Nueva partida</h2>
      <p class="label">Cantidad de jugadores</p>
      <div class="chips">${chips}</div>
      ${frecuentes}
      ${campos}
      <datalist id="lista-conocidos">${sugeridos.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <p class="note">Poné los nombres para que la partida cuente en el ranking.</p>
      <button class="btn block" style="margin-top:12px" data-accion="empezar">Empezar partida</button>
    </div>`;
}

function pantallaPartida() {
  const js = estado.jugadores;
  const totales = js.map(total);
  const maximo = Math.max(...totales);
  const rondas = Math.max(...js.map(j => j.puntos.length));
  const ganador = ganadorActual();

  const filas = js.map((j, i) => {
    const u = j.puntos[j.puntos.length - 1];
    const ult = u === undefined ? '—' : (u < 0 ? '' : '+') + fmt(u);
    const clases = ['row', i === estado.turno ? 'turn' : '', maximo > 0 && totales[i] === maximo ? 'leader' : ''].join(' ');
    return `
      <button class="${clases}" data-turno="${i}">
        <div class="name">${esc(j.nombre)}<span class="sub">${j.puntos.length} ${j.puntos.length === 1 ? 'turno' : 'turnos'}${i === estado.turno ? ' · le toca' : ''}</span></div>
        <span class="last ${u < 0 ? 'neg' : ''}">${ult}</span>
        <span class="tot">${fmt(totales[i])}</span>
      </button>`;
  }).join('');

  const opciones = js.map((j, i) =>
    `<option value="${i}" ${i === estado.turno ? 'selected' : ''}>${esc(j.nombre)}</option>`).join('');
  const rapidos = RAPIDOS.map(n => `<button class="chip" data-sumar="${n}">+${fmt(n)}</button>`).join('');

  return `
    ${ganador ? `
      <div class="winner">
        🏆 ${esc(ganador.nombre)} llegó a ${fmt(ganador.total)} puntos
        <button class="btn block" data-accion="terminar">Terminar y guardar en el ranking</button>
      </div>` : ''}
    <div class="card">
      <div class="title-row"><h2>Puntajes</h2><small>${rondas} ${rondas === 1 ? 'ronda' : 'rondas'}</small></div>
      <div class="table-head"><span>JUGADOR</span><span>RONDA</span><span class="total">TOTAL</span></div>
      ${filas}
    </div>
    <div class="card section">
      <h3>Cargar puntos del turno</h3>
      <label class="field"><span>Le toca a</span><select id="turno">${opciones}</select></label>
      <div class="add-row">
        <label class="field"><span>Puntos (vacío = 0, perdió el turno)</span>
          <input id="puntos" inputmode="numeric" pattern="[0-9]*" maxlength="7" value="${esc(ui.puntos)}" placeholder="0" autocomplete="off">
        </label>
        <button class="btn" data-accion="sumar">Sumar</button>
      </div>
      <div class="chips quick">${rapidos}<button class="chip" data-accion="limpiar">Borrar</button></div>
      <button class="penalty" data-accion="menos50">
        <strong>−50</strong><span>Todos los dados distintos, sin 1 ni 5</span>
      </button>
      <p class="error" id="error">${esc(ui.error)}</p>
      <div class="actions">
        <button class="btn text" data-accion="deshacer" ${estado.historial.length ? '' : 'disabled'}>Deshacer último</button>
        <button class="btn text danger" data-accion="reiniciar">Nueva partida</button>
      </div>
    </div>
    ${rondas ? tablaHistorial(js, rondas) : ''}`;
}

// Puntos de cada turno: una fila por ronda, una columna por jugador, con el acumulado debajo.
function tablaHistorial(js, rondas) {
  const acumulado = js.map(() => 0);
  const filas = Array.from({ length: rondas }, (_, r) => `
    <tr><th>${r + 1}</th>${js.map((j, i) => {
      const p = j.puntos[r];
      if (p === undefined) return '<td></td>';
      acumulado[i] += p;
      const clase = p < 0 ? 'neg' : p === 0 ? 'zero' : '';
      return `<td><button class="cell" data-corregir="${i}:${r}"><span class="${clase}">${(p > 0 ? '+' : '') + fmt(p)}</span><small>${fmt(acumulado[i])}</small></button></td>`;
    }).join('')}</tr>`).reverse().join('');
  return `
    <div class="card section">
      <h3>Historial de la partida</h3>
      <p class="note" style="margin:0 0 10px">Puntos de cada turno y, debajo, el total acumulado. Lo más reciente arriba.
        <b>¿Anotaste mal? Tocá el puntaje para corregirlo o borrarlo.</b></p>
      <div class="hist-wrap">
        <table class="hist">
          <thead><tr><th>#</th>${js.map(j => `<th>${esc(j.nombre)}</th>`).join('')}</tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
}

// Tarjeta del ranking compartido: crear o unirse a un grupo, o ver el código y el estado de sincronización.
function tarjetaGrupo() {
  if (!Nube.disponible) return '';
  const g = Nube.grupo();
  const error = ui.grupoError ? `<p class="error">${esc(ui.grupoError)}</p>` : '';
  if (!g) {
    return `
      <div class="card group">
        <h3>Ranking compartido</h3>
        <p class="note" style="margin:0 0 4px">Armá un grupo y pasales el código a tus amigos: todos van a ver el mismo ranking en su celular.</p>
        <div class="add-row">
          <label class="field"><span>Nombre del grupo</span>
            <input id="grupoNombre" maxlength="40" value="${esc(ui.grupoNombre)}" placeholder="Ej: Los del viernes" autocomplete="off">
          </label>
          <button class="btn" data-accion="crearGrupo" ${ui.grupoOcupado ? 'disabled' : ''}>Crear</button>
        </div>
        <div class="add-row">
          <label class="field"><span>¿Ya tenés un código?</span>
            <input id="grupoCodigo" class="code-input" maxlength="7" value="${esc(ui.grupoCodigo)}" placeholder="ABC123" autocomplete="off" autocapitalize="characters">
          </label>
          <button class="btn" data-accion="unirse" ${ui.grupoOcupado ? 'disabled' : ''}>Unirme</button>
        </div>
        ${ui.grupoOcupado ? '<p class="note">Conectando…</p>' : ''}
        ${error}
      </div>`;
  }
  const pend = Nube.pendientes();
  const estadoSync = Nube.conectado()
    ? (pend ? `Subiendo ${pend} ${pend === 1 ? 'partida' : 'partidas'}…` : '✓ Sincronizado')
    : `Sin conexión${pend ? ` · ${pend} ${pend === 1 ? 'partida espera' : 'partidas esperan'} internet` : ''}`;
  return `
    <div class="card group">
      <div class="title-row"><h3>👥 ${esc(g.nombre)}</h3><small class="${Nube.conectado() ? 'ok' : ''}">${estadoSync}</small></div>
      <div class="code-row">
        <div><span class="note">Código del grupo</span><b class="code">${esc(g.codigo)}</b></div>
        <button class="btn" data-accion="compartirCodigo">Compartir</button>
      </div>
      ${ui.grupoAviso ? `<p class="note">${esc(ui.grupoAviso)}</p>` : ''}
      ${error}
      <div class="actions"><span></span><button class="btn text danger" data-accion="salirGrupo">Salir del grupo</button></div>
    </div>`;
}

function pantallaRanking() {
  const filas = ranking();
  const lista = listaPartidas();
  if (!filas.length) {
    return `
      ${tarjetaGrupo()}
      <div class="card empty">
        <h2>Todavía no hay partidas</h2>
        <p>Cuando alguien llegue a 10.000, tocá <b>Terminar y guardar en el ranking</b> y acá vas a ver quién ganó más partidas.</p>
      </div>`;
  }
  const medallas = ['🥇', '🥈', '🥉'];
  const tabla = filas.map((r, i) => `
    <div class="rank-row">
      <span class="pos">${medallas[i] || i + 1}</span>
      <div class="name">${esc(r.nombre)}<span class="sub">${r.jugadas} ${r.jugadas === 1 ? 'partida' : 'partidas'} · ${Math.round(100 * r.ganadas / r.jugadas)}% · mejor ${fmt(r.mejor)}</span></div>
      <span class="wins">${r.ganadas}<small>${r.ganadas === 1 ? 'ganada' : 'ganadas'}</small></span>
    </div>`).join('');

  const recientes = lista.slice(-10).reverse().map(p => {
    const fecha = new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const otros = p.jugadores.filter(j => claveNombre(j.nombre) !== claveNombre(p.ganador))
      .map(j => `${esc(j.nombre)} ${fmt(j.total)}`).join(' · ');
    const totalGanador = p.jugadores.find(j => claveNombre(j.nombre) === claveNombre(p.ganador))?.total ?? 0;
    return `
      <div class="game">
        <span class="date">${fecha}</span>
        <div><b>🏆 ${esc(p.ganador)}</b> ${fmt(totalGanador)}<span class="sub">${otros}</span></div>
      </div>`;
  }).join('');

  // En un grupo, solo quien lo creó puede borrar el ranking.
  const puedeBorrar = !Nube.grupo() || Nube.esCreador();
  return `
    ${tarjetaGrupo()}
    <div class="card">
      <div class="title-row"><h2>Ranking</h2><small>${lista.length} ${lista.length === 1 ? 'partida' : 'partidas'}</small></div>
      ${tabla}
    </div>
    <div class="card section">
      <h3>Últimas partidas</h3>
      ${recientes}
      ${puedeBorrar ? '<div class="actions"><span></span><button class="btn text danger" data-accion="borrarRanking">Borrar ranking</button></div>' : ''}
    </div>`;
}

function dialogo() {
  let titulo, texto, boton;
  if (ui.confirmar === 'borrarRanking') {
    titulo = '¿Borrar el ranking?';
    texto = Nube.grupo()
      ? 'Se borrarán todas las partidas del grupo, también en los celulares de los demás. No se puede deshacer.'
      : 'Se borrarán todas las partidas guardadas. No se puede deshacer.';
    boton = 'Borrar todo';
  } else if (ui.confirmar === 'salirGrupo') {
    const pend = Nube.pendientes();
    titulo = '¿Salir del grupo?';
    texto = `Este celular deja de ver el ranking de ${esc(Nube.grupo().nombre)}. Las partidas siguen guardadas para el resto y podés volver a entrar con el código.`
      + (pend ? ` <b>Ojo: ${pend} ${pend === 1 ? 'partida todavía no se subió y se va' : 'partidas todavía no se subieron y se van'} a perder.</b>` : '');
    boton = 'Salir';
  } else {
    const g = ganadorActual();
    titulo = '¿Empezar otra partida?';
    texto = g
      ? `Se guardará la victoria de ${esc(g.nombre)} en el ranking.`
      : 'Nadie llegó a 10.000, así que esta partida no cuenta para el ranking. Se borrarán los puntajes.';
    boton = 'Empezar de nuevo';
  }
  return `
    <div class="overlay" data-accion="cancelar">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${titulo}</h2>
        <p>${texto}</p>
        <div class="actions">
          <button class="btn text" data-accion="cancelar">Cancelar</button>
          <button class="btn text danger" data-accion="confirmar">${boton}</button>
        </div>
      </div>
    </div>`;
}

// Corregir un puntaje ya anotado: cambiarlo o borrar ese turno.
function dialogoCorregir() {
  const { j, r } = ui.corregir;
  const jugador = estado.jugadores[j];
  return `
    <div class="overlay" data-accion="cancelar">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Corregir puntaje</h2>
        <p>${esc(jugador.nombre)} · ronda ${r + 1} · anotado: <b>${fmt(jugador.puntos[r])}</b></p>
        <label class="field" style="margin-top:0"><span>Puntaje correcto (vacío = 0)</span>
          <input id="corregirValor" inputmode="numeric" pattern="[0-9]*" maxlength="7" value="${esc(ui.corregirValor)}" placeholder="0" autocomplete="off">
        </label>
        ${ui.corregirError ? `<p class="error">${esc(ui.corregirError)}</p>` : ''}
        <button class="penalty" data-accion="corregirMenos50"><strong>−50</strong><span>Cambiar a −50 (dados distintos, sin 1 ni 5)</span></button>
        <button class="btn block" style="margin-top:14px" data-accion="guardarCorreccion">Guardar</button>
        <div class="actions">
          <button class="btn text danger" data-accion="borrarTurno">Borrar turno</button>
          <button class="btn text" data-accion="cancelar">Cancelar</button>
        </div>
      </div>
    </div>`;
}

// ---------- Acciones ----------

function abrirCorreccion(j, r) {
  ui.corregir = { j, r };
  const p = estado.jugadores[j].puntos[r];
  ui.corregirValor = p > 0 ? String(p) : '';
  ui.corregirError = '';
  render();
  const campo = document.getElementById('corregirValor');
  if (campo) { campo.focus(); campo.select(); }
}

function guardarCorreccion(valor) {
  const { j, r } = ui.corregir;
  let pts = valor;
  if (pts === undefined) {
    const texto = ui.corregirValor.trim() || '0';
    pts = /^\d+$/.test(texto) ? Number(texto) : NaN;
    if (!Number.isFinite(pts) || pts > MAX_TURNO) {
      ui.corregirError = `Ingresá un puntaje válido (0 a ${fmt(MAX_TURNO)}).`;
      render(); return;
    }
  }
  estado.jugadores[j].puntos[r] = pts;
  ui.corregir = null;
  guardar(); render();
}

// Saca ese turno del jugador; los turnos siguientes de ese jugador suben una ronda.
function borrarTurno() {
  const { j, r } = ui.corregir;
  estado.jugadores[j].puntos.splice(r, 1);
  // El turno r del jugador es su aparición número r en el historial de "deshacer".
  let vista = -1;
  const pos = estado.historial.findIndex(i => i === j && ++vista === r);
  if (pos >= 0) estado.historial.splice(pos, 1);
  ui.corregir = null;
  guardar(); render();
}

function empezar() {
  estado = {
    jugadores: Array.from({ length: ui.cantidad }, (_, i) => ({
      nombre: ui.nombres[i].trim().replace(/\s+/g, ' ') || `Jugador ${i + 1}`, puntos: []
    })),
    turno: 0,
    historial: []
  };
  ui.puntos = ''; ui.error = '';
  guardar(); render();
}

function sumar() {
  // Sin puntos escritos, "Sumar" anota 0 (perdió el turno).
  const texto = ui.puntos.trim() || '0';
  const pts = /^\d+$/.test(texto) ? Number(texto) : NaN;
  if (!Number.isFinite(pts) || pts > MAX_TURNO) {
    ui.error = `Ingresá un puntaje válido (0 a ${fmt(MAX_TURNO)}).`;
    render(); return;
  }
  anotar(pts);
}

// Carga un puntaje (puede ser negativo, como el −50) al jugador de turno y pasa al siguiente.
function anotar(pts) {
  const i = estado.turno;
  estado.jugadores[i].puntos.push(pts);
  estado.historial.push(i);
  estado.turno = (i + 1) % estado.jugadores.length;
  ui.puntos = ''; ui.error = '';
  guardar(); render();
}

// Deshace el último puntaje cargado (de quien sea) y le devuelve el turno a ese jugador.
function deshacer() {
  const i = estado.historial.pop();
  if (i === undefined) return;
  estado.jugadores[i].puntos.pop();
  estado.turno = i;
  ui.error = '';
  guardar(); render();
}

// Cierra la partida: si hubo ganador la guarda para el ranking, y vuelve a la pantalla inicial
// con los mismos nombres cargados.
function terminar() {
  const g = ganadorActual();
  if (g) {
    const p = {
      fecha: new Date().toISOString(),
      ganador: g.nombre,
      jugadores: estado.jugadores.map(j => ({ nombre: j.nombre, total: total(j) }))
    };
    if (Nube.grupo()) Nube.agregar(p); else partidas.push(p);
  }
  ui.cantidad = estado.jugadores.length;
  estado.jugadores.forEach((j, i) => { ui.nombres[i] = NOMBRE_GENERICO.test(j.nombre) ? '' : j.nombre; });
  estado = nuevoEstado();
  ui.confirmar = null; ui.puntos = ''; ui.error = '';
  ui.vista = g ? 'ranking' : 'partida';
  guardar(); render();
}

// Agrega un jugador conocido en el primer lugar libre (o lo saca si ya estaba).
function elegirConocido(nombre) {
  const k = claveNombre(nombre);
  const i = ui.nombres.slice(0, ui.cantidad).findIndex(n => claveNombre(n) === k);
  if (i >= 0) { ui.nombres[i] = ''; render(); return; }
  let libre = ui.nombres.slice(0, ui.cantidad).findIndex(n => !n.trim());
  if (libre < 0 && ui.cantidad < 7) { libre = ui.cantidad; ui.cantidad++; }
  if (libre >= 0) ui.nombres[libre] = nombre;
  render();
}

app.addEventListener('click', e => {
  // Cambiar de juego (pantalla de inicio o botón "‹ Juegos").
  const nav = e.target.closest('[data-juego]');
  if (nav) { elegirJuego(nav.dataset.juego); return; }
  if (juego === 'truco') { Truco.click(e); return; }
  if (juego === 'generala') { Generala.click(e); return; }

  const b = e.target.closest('[data-accion], [data-cantidad], [data-turno], [data-sumar], [data-vista], [data-conocido], [data-corregir]');
  if (!b) return;
  // Un clic dentro del diálogo no debe cerrarlo por el fondo.
  if (b.classList.contains('overlay') && e.target !== b) return;

  if (b.dataset.corregir) { const [j, r] = b.dataset.corregir.split(':').map(Number); abrirCorreccion(j, r); return; }
  if (b.dataset.vista) { ui.vista = b.dataset.vista; render(); return; }
  if (b.dataset.conocido) { elegirConocido(b.dataset.conocido); return; }
  if (b.dataset.cantidad) { ui.cantidad = Number(b.dataset.cantidad); render(); return; }
  if (b.dataset.turno) { estado.turno = Number(b.dataset.turno); guardar(); render(); return; }
  if (b.dataset.sumar) {
    const actual = Number(ui.puntos) || 0;
    ui.puntos = String(Math.min(actual + Number(b.dataset.sumar), MAX_TURNO));
    ui.error = ''; render(); return;
  }
  switch (b.dataset.accion) {
    case 'empezar': empezar(); break;
    case 'sumar': sumar(); break;
    case 'menos50': anotar(-50); break;
    case 'limpiar': ui.puntos = ''; ui.error = ''; render(); break;
    case 'deshacer': deshacer(); break;
    case 'terminar': terminar(); break;
    case 'reiniciar': ui.confirmar = 'reiniciar'; render(); break;
    case 'borrarRanking': ui.confirmar = 'borrarRanking'; render(); break;
    case 'cancelar': ui.confirmar = null; ui.corregir = null; render(); break;
    case 'guardarCorreccion': guardarCorreccion(); break;
    case 'corregirMenos50': guardarCorreccion(-50); break;
    case 'borrarTurno': borrarTurno(); break;
    case 'crearGrupo': entrarAGrupo(() => Nube.crearGrupo(ui.grupoNombre, partidas)); break;
    case 'unirse': entrarAGrupo(() => Nube.unirse(ui.grupoCodigo, partidas)); break;
    case 'compartirCodigo': compartirCodigo(); break;
    case 'salirGrupo': ui.confirmar = 'salirGrupo'; render(); break;
    case 'confirmar':
      if (ui.confirmar === 'borrarRanking') borrarRanking();
      else if (ui.confirmar === 'salirGrupo') { Nube.salir(); ui.confirmar = null; ui.grupoAviso = ''; render(); }
      else terminar();
      break;
  }
});

// Crear o unirse a un grupo. Las partidas que había en este celular pasan al ranking del grupo.
async function entrarAGrupo(accion) {
  ui.grupoOcupado = true; ui.grupoError = ''; render();
  try {
    const g = await accion();
    partidas = [];
    ui.grupoNombre = ''; ui.grupoCodigo = '';
    ui.grupoAviso = Nube.esCreador() && Nube.partidas().length === 0
      ? 'Pasales este código a los demás para que se unan desde la pestaña Ranking.'
      : '';
    guardar();
    if (!g) throw new Error('No se pudo entrar al grupo.');
  } catch (e) {
    ui.grupoError = e.message;
  }
  ui.grupoOcupado = false; render();
}

async function compartirCodigo() {
  const g = Nube.grupo();
  const texto = `Sumate al ranking de 10.000 "${g.nombre}": abrí la app, andá a Ranking y poné el código ${g.codigo}`;
  try {
    if (navigator.share) await navigator.share({ text: texto });
    else { await navigator.clipboard.writeText(texto); ui.grupoAviso = 'Código copiado. Pegalo en WhatsApp o donde quieras.'; render(); }
  } catch { /* el usuario cerró el menú de compartir */ }
}

async function borrarRanking() {
  ui.confirmar = null;
  if (!Nube.grupo()) { partidas = []; guardar(); render(); return; }
  try { await Nube.borrarTodo(); ui.grupoError = ''; } catch (e) { ui.grupoError = e.message.includes('internet') ? e.message : 'No se pudo borrar el ranking.'; }
  render();
}

app.addEventListener('input', e => {
  if (juego === 'truco') { Truco.input(e); return; }
  if (juego === 'generala') { Generala.input(e); return; }
  const t = e.target;
  if (t.dataset.nombre !== undefined) ui.nombres[Number(t.dataset.nombre)] = t.value;
  if (t.id === 'grupoNombre') ui.grupoNombre = t.value;
  if (t.id === 'grupoCodigo') { t.value = t.value.toUpperCase(); ui.grupoCodigo = t.value; }
  if (t.id === 'puntos') {
    t.value = t.value.replace(/\D/g, '').slice(0, 7);
    ui.puntos = t.value;
    if (ui.error) { ui.error = ''; document.getElementById('error').textContent = ''; }
  }
  if (t.id === 'corregirValor') {
    t.value = t.value.replace(/\D/g, '').slice(0, 7);
    ui.corregirValor = t.value;
  }
});

app.addEventListener('change', e => {
  if (juego !== 'diezmil') return;
  if (e.target.id === 'turno') { estado.turno = Number(e.target.value); guardar(); render(); }
  // Al terminar de escribir un nombre, actualiza qué jugadores conocidos están marcados.
  if (e.target.dataset.nombre !== undefined && conocidos().length) render();
});

app.addEventListener('keydown', e => {
  if (juego !== 'diezmil') return;
  if (e.key === 'Enter' && e.target.id === 'puntos') { e.preventDefault(); sumar(); }
  if (e.key === 'Enter' && e.target.id === 'corregirValor') { e.preventDefault(); guardarCorreccion(); }
});

// Cambios que llegan de la base (otro celular terminó una partida, volvió internet...).
// No redibuja mientras se escribe en un campo, para no sacarle el cursor al usuario.
Nube.iniciar(() => {
  const foco = document.activeElement;
  if (foco && app.contains(foco) && /INPUT|SELECT/.test(foco.tagName)) return;
  render();
});

render();
