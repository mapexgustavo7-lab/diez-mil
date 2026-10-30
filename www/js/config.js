// Configuración de Firebase (Consola de Firebase → Configuración del proyecto → Tus apps → Web).
// Vacía = sin ranking compartido: cada celular guarda su propio ranking.
// Estos valores no son secretos: identifican el proyecto. La seguridad está en las reglas de la base (database.rules.json).
const CONFIG = {
  firebase: {
    apiKey: 'AIzaSyArdo1YC7_GGskf7XxZOmAxG7QbpXAWgks',
    authDomain: 'diezmilapp.firebaseapp.com',
    databaseURL: 'https://diezmilapp-default-rtdb.firebaseio.com',
    projectId: 'diezmilapp',
    storageBucket: 'diezmilapp.firebasestorage.app',
    messagingSenderId: '324216081628',
    appId: '1:324216081628:web:0a41dd3d592ccbaa047819'
  }
};
