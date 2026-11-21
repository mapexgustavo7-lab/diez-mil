# Anotadores (10.000, Truco y Generala)

App para celular que lleva los puntajes de una partida de dados 10.000.
Hecha con HTML/JS (carpeta `www`) y empaquetada como APK de Android con Capacitor, que se compila en GitHub Actions.

## Funciones
- Partidas de 2 a 7 jugadores, con nombres opcionales.
- Historial de la partida: los puntos de cada turno de cada jugador con su acumulado.
  Tocando un puntaje se puede corregir, cambiar a −50 o borrar ese turno.
- Tema oscuro.
- Carga del puntaje de cada turno (tocar Sumar sin escribir nada anota 0), con botones rápidos +50 / +100 / +500 / +1.000.
- Botón −50 para cuando salen todos los dados distintos sin 1 ni 5 (se resta del total y pasa el turno).
- Tabla con el último puntaje y el total de cada jugador; marca quién va ganando y a quién le toca.
- Avance automático al siguiente jugador; también se puede elegir tocando la fila o con el selector.
- "Deshacer último" borra el último puntaje cargado y le devuelve el turno a ese jugador.
- Aviso cuando alguien llega a 10.000, con botón para terminar la partida y guardarla en el ranking.
- Pestaña Ranking: partidas ganadas, jugadas, porcentaje y mejor puntaje de cada jugador, más las últimas 10 partidas.
  Los nombres se comparan sin importar mayúsculas; los "Jugador N" sin nombre no cuentan.
- Al armar una partida aparecen los jugadores conocidos para elegirlos con un toque.
- La partida en curso y el ranking quedan guardados en el teléfono aunque se cierre la app.
- Ranking compartido (Firebase): en la pestaña Ranking se crea un grupo con un código de 6 letras; los demás se unen
  con ese código y todos ven el mismo ranking. Sin internet sigue andando y las partidas se suben al volver la conexión.
  Solo quien creó el grupo puede borrar el ranking.

## Ranking compartido (Firebase)
- `www/js/config.js`: datos del proyecto Firebase. Vacío = cada celular tiene su propio ranking.
- `www/js/nube.js`: conexión con Firebase (cuenta anónima + Realtime Database) y cola de partidas sin conexión.
- `database.rules.json`: reglas de seguridad para pegar en Firebase → Realtime Database → Reglas.
- Para probar sin Firebase: abrir la app con `?nube=local` (y `&uid=otro` para simular otro celular).

## Truco y Generala
- Al abrir la app se elige el juego. Cada juego tiene sus colores y guarda su partida aparte.
- Truco (`www/js/truco.js`): dos equipos, a 30 (malas y buenas) o a 15. Se anota tocando la mitad del
  equipo o con + y −, y los puntos se dibujan como fósforos. Deshacer, revancha y el 1 de espadas de fondo.
- Generala (`www/js/generala.js`): planilla de 2 a 7 jugadores. Cada casillero se completa eligiendo entre
  los puntajes posibles o tachando; tocándolo de nuevo se corrige. Servidas: escalera 25, full 35, póker 45,
  generala 55; la doble generala servida gana el partido.
- El ranking compartido por ahora es solo del 10.000.

## Estructura
- `www/`: la app (index.html, css, js, íconos).
- `assets/logo.png`: ícono del APK.
- `.github/workflows/build-apk.yml`: compila el APK y lo publica en Releases.
- `netlify.toml`: publicación web (iPhone).
- `original-kotlin/`: el proyecto Android nativo original, guardado como referencia (no se usa).
