// Ranking compartido: las partidas terminadas de un grupo se guardan en Firebase (Realtime Database)
// y todos los celulares que usan el mismo código de grupo ven el mismo ranking.
// Sin conexión sigue andando: lo último recibido queda guardado y las partidas nuevas esperan en una cola
// hasta que vuelva internet.
// Sin Firebase configurado (config.js vacío) no hace nada. Para probar sin Firebase, abrir la app con
// ?nube=local (simula la base dentro del navegador) y, para simular otro celular, agregar &uid=otro.

const Nube = (() => {
  const K_GRUPO = 'diezmil.grupo';
  const K_REMOTAS = 'diezmil.grupoPartidas';
  const K_PENDIENTES = 'diezmil.pendientes';
  const ESPERA = 8000; // sin conexión Firebase no responde nunca: cortar a los 8 segundos
  const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para que no se confundan al dictarlo

  const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  let grupo = leer(K_GRUPO, null);          // { codigo, nombre, creador }
  let remotas = leer(K_REMOTAS, {});        // id -> partida, lo último que llegó de la base
  let pendientes = leer(K_PENDIENTES, {});  // id -> partida, todavía sin confirmar por la base
  let uid = null, conectado = false, subiendo = false, dejarDeEscuchar = null;
  let alCambiar = () => {};

  const conTiempo = p => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('sin conexión')), ESPERA))]);

  // ---------- Motores: Firebase real o simulado en el navegador ----------

  function motorFirebase(cfg) {
    firebase.initializeApp(cfg);
    const db = firebase.database(), auth = firebase.auth();
    const ref = c => db.ref('grupos/' + c);
    return {
      iniciar(alUid, alConectar) {
        // Cuenta anónima: nadie tiene que registrarse, pero la base sabe qué celular escribe cada cosa.
        const entrar = () => auth.signInAnonymously().catch(() => setTimeout(entrar, 15000));
        auth.onAuthStateChanged(u => u ? alUid(u.uid) : entrar());
        db.ref('.info/connected').on('value', s => alConectar(!!s.val()));
      },
      nuevoId: () => db.ref().push().key,
      leerGrupo: c => conTiempo(ref(c).once('value')).then(s => s.val()),
      crearGrupo: (c, datos) => conTiempo(ref(c).update({ ...datos, creado: firebase.database.ServerValue.TIMESTAMP })),
      escuchar(c, cb) {
        const r = ref(c).child('partidas');
        const f = s => cb(s.val() || {});
        r.on('value', f, () => {});
        return () => r.off('value', f);
      },
      guardar: (c, id, p) => ref(c).child('partidas/' + id).set(p),
      existe: (c, id) => conTiempo(ref(c).child('partidas/' + id).once('value')).then(s => s.exists()),
      borrar: (c, ids) => conTiempo(ref(c).child('partidas').update(Object.fromEntries(ids.map(id => [id, null]))))
    };
  }

  // Misma interfaz guardando en localStorage, con las mismas restricciones que las reglas de la base.
  function motorSimulado(uidSimulado) {
    const K = 'diezmil.nubeSimulada';
    const base = () => leer(K, { grupos: {} });
    const oyentes = [];
    const avisar = () => setTimeout(() => oyentes.forEach(o => o.cb(base().grupos[o.c]?.partidas || {})), 50);
    const demora = f => new Promise((si, no) => setTimeout(() => { try { si(f()); } catch (e) { no(e); } }, 150));
    window.addEventListener('storage', e => { if (e.key === K) avisar(); });
    return {
      iniciar(alUid, alConectar) { setTimeout(() => { alUid(uidSimulado); alConectar(true); }, 100); },
      nuevoId: () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      leerGrupo: c => demora(() => base().grupos[c] || null),
      crearGrupo: (c, datos) => demora(() => {
        const b = base();
        if (b.grupos[c]) throw new Error('PERMISSION_DENIED');
        b.grupos[c] = { ...datos, creado: Date.now(), partidas: {} };
        escribir(K, b);
      }),
      escuchar(c, cb) {
        const o = { c, cb };
        oyentes.push(o); avisar();
        return () => oyentes.splice(oyentes.indexOf(o), 1);
      },
      guardar: (c, id, p) => demora(() => {
        const b = base();
        if (!b.grupos[c] || b.grupos[c].partidas[id]) throw new Error('PERMISSION_DENIED');
        b.grupos[c].partidas[id] = p;
        escribir(K, b); avisar();
      }),
      existe: (c, id) => demora(() => !!base().grupos[c]?.partidas[id]),
      borrar: (c, ids) => demora(() => {
        const b = base();
        if (b.grupos[c]?.creador !== uidSimulado) throw new Error('PERMISSION_DENIED');
        ids.forEach(id => delete b.grupos[c].partidas[id]);
        escribir(K, b); avisar();
      })
    };
  }

  const params = new URLSearchParams(location.search);
  const motor = CONFIG.firebase.apiKey && window.firebase ? motorFirebase(CONFIG.firebase)
    : params.get('nube') === 'local' ? motorSimulado(params.get('uid') || 'uid-local')
    : null;

  // ---------- Sincronización ----------

  function guardarLocal() {
    escribir(K_GRUPO, grupo);
    escribir(K_REMOTAS, remotas);
    escribir(K_PENDIENTES, pendientes);
  }

  function escuchar() {
    if (dejarDeEscuchar) dejarDeEscuchar();
    dejarDeEscuchar = null;
    if (!motor || !uid || !grupo) return;
    const codigo = grupo.codigo;
    dejarDeEscuchar = motor.escuchar(codigo, datos => {
      if (!grupo || grupo.codigo !== codigo) return;
      remotas = datos;
      for (const id of Object.keys(pendientes)) if (remotas[id]) delete pendientes[id];
      guardarLocal(); alCambiar();
      subir();
    });
  }

  // Manda las partidas pendientes. Si una ya había llegado (respuesta perdida), la base la rechaza
  // por existir: se confirma leyéndola y se saca de la cola, así nunca se duplica.
  async function subir() {
    if (subiendo || !motor || !uid || !grupo || !conectado) return;
    subiendo = true;
    try {
      for (const [id, p] of Object.entries(pendientes)) {
        if (!grupo) break;
        try {
          await conTiempo(motor.guardar(grupo.codigo, id, { ...p, por: uid }));
          delete pendientes[id];
        } catch {
          try { if (await motor.existe(grupo.codigo, id)) delete pendientes[id]; } catch { break; }
        }
        guardarLocal(); alCambiar();
      }
    } finally { subiendo = false; }
  }

  function encolar(lista) {
    for (const p of lista) pendientes[motor.nuevoId()] = { fecha: p.fecha, ganador: p.ganador, jugadores: p.jugadores };
  }

  function normalizarCodigo(c) {
    return String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function codigoNuevo() {
    const r = crypto.getRandomValues(new Uint32Array(6));
    return Array.from(r, n => LETRAS[n % LETRAS.length]).join('');
  }

  function necesitaConexion() {
    if (!uid || !conectado) throw new Error('Necesitás internet para esto. Probá de nuevo en un rato.');
  }

  // ---------- Interfaz para la app ----------

  return {
    disponible: !!motor,

    iniciar(cb) {
      alCambiar = cb;
      if (!motor) return;
      motor.iniciar(
        u => { uid = u; escuchar(); subir(); alCambiar(); },
        c => { conectado = c; if (c) subir(); alCambiar(); }
      );
    },

    grupo: () => grupo,
    esCreador: () => !!grupo && !!uid && grupo.creador === uid,
    conectado: () => conectado && !!uid,
    pendientes: () => Object.keys(pendientes).length,

    // Partidas del grupo: las confirmadas más las que esperan subir, de la más vieja a la más nueva.
    partidas() {
      return Object.values({ ...remotas, ...pendientes }).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    },

    // Crea un grupo nuevo; las partidas que ya había en el celular pasan al ranking del grupo.
    async crearGrupo(nombre, partidasLocales) {
      necesitaConexion();
      nombre = nombre.trim().replace(/\s+/g, ' ').slice(0, 40) || 'Mi grupo';
      for (let intento = 0; intento < 4; intento++) {
        const codigo = codigoNuevo();
        try {
          await motor.crearGrupo(codigo, { nombre, creador: uid });
        } catch (e) {
          if (/sin conexión/.test(e.message)) throw new Error('Necesitás internet para esto. Probá de nuevo en un rato.');
          continue; // el código ya existía: probar con otro
        }
        grupo = { codigo, nombre, creador: uid };
        remotas = {}; pendientes = {};
        encolar(partidasLocales);
        guardarLocal(); escuchar(); subir();
        return grupo;
      }
      throw new Error('No se pudo crear el grupo. Probá de nuevo.');
    },

    async unirse(codigoEscrito, partidasLocales) {
      const codigo = normalizarCodigo(codigoEscrito);
      if (codigo.length !== 6) throw new Error('El código tiene 6 letras o números.');
      necesitaConexion();
      let datos;
      try { datos = await motor.leerGrupo(codigo); } catch { throw new Error('Necesitás internet para esto. Probá de nuevo en un rato.'); }
      if (!datos || !datos.nombre) throw new Error('No existe ningún grupo con ese código.');
      grupo = { codigo, nombre: datos.nombre, creador: datos.creador };
      remotas = datos.partidas || {}; pendientes = {};
      encolar(partidasLocales);
      guardarLocal(); escuchar(); subir();
      return grupo;
    },

    // Deja el grupo en este celular. Las partidas del grupo siguen en la base para los demás.
    salir() {
      if (dejarDeEscuchar) dejarDeEscuchar();
      dejarDeEscuchar = null;
      grupo = null; remotas = {}; pendientes = {};
      guardarLocal();
    },

    agregar(p) {
      pendientes[motor.nuevoId()] = p;
      guardarLocal(); subir();
    },

    // Solo quien creó el grupo puede borrar el ranking (las reglas de la base lo exigen).
    async borrarTodo() {
      necesitaConexion();
      await motor.borrar(grupo.codigo, Object.keys(remotas));
      pendientes = {};
      guardarLocal();
    }
  };
})();
