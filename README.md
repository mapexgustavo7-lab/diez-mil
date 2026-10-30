# Anotador 10.000

App para celular que lleva los puntajes de una partida de dados 10.000.
Hecha con HTML/JS (carpeta `www`) y empaquetada como APK de Android con Capacitor, que se compila en GitHub Actions.

## Funciones
- Partidas de 2 a 7 jugadores, con nombres opcionales.
- Carga del puntaje de cada turno (0 si no sumó), con botones rápidos +50 / +100 / +500 / +1.000.
- Botón −50 para cuando salen todos los dados distintos sin 1 ni 5 (se resta del total y pasa el turno).
- Tabla con el último puntaje y el total de cada jugador; marca quién va ganando y a quién le toca.
- Avance automático al siguiente jugador; también se puede elegir tocando la fila o con el selector.
- "Deshacer último" borra el último puntaje cargado y le devuelve el turno a ese jugador.
- Aviso cuando alguien llega a 10.000, con botón para terminar la partida y guardarla en el ranking.
- Pestaña Ranking: partidas ganadas, jugadas, porcentaje y mejor puntaje de cada jugador, más las últimas 10 partidas.
  Los nombres se comparan sin importar mayúsculas; los "Jugador N" sin nombre no cuentan.
- Al armar una partida aparecen los jugadores conocidos para elegirlos con un toque.
- La partida en curso y el ranking quedan guardados en el teléfono aunque se cierre la app.

## Estructura
- `www/`: la app (index.html, css, js, íconos).
- `assets/logo.png`: ícono del APK.
- `.github/workflows/build-apk.yml`: compila el APK y lo publica en Releases.
- `netlify.toml`: publicación web (iPhone).
- `original-kotlin/`: el proyecto Android nativo original, guardado como referencia (no se usa).
