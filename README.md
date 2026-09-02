# Reposteria Zalatambor

Tienda y panel de obrador construidos con React, Vite y Firebase.

## Inicio

```bash
npm install
npm run dev
```

## Firebase

1. Crea un proyecto en Firebase y activa Authentication, Firestore y Storage.
2. Copia `.env.example` como `.env.local` y rellena los valores `VITE_FIREBASE_*` de la configuración web de Firebase.
3. Configura reglas de Firestore para que solo el usuario administrador pueda escribir productos, pedidos y tarifas. El archivo `src/firebase.js` exporta `auth`, `db` y `storage` para conectar estas colecciones.

Mientras no haya credenciales, la interfaz arranca en modo demo para probar el catálogo, carrito, checkout y gestión de productos sin servicios externos.