# Peepo Orders

Aplicacion web en Vite + React + TypeScript para consultar el estado de pedidos y administrarlos desde un panel privado.

## Requisitos

- Node.js 20+
- Un proyecto de Firebase con Authentication por email/password activado
- Firestore habilitado para guardar pedidos

## Variables de entorno

Duplica `.env.example` como `.env` y completa:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Desarrollo

```bash
npm install
npm run dev
```

## Link directo por pedido

El admin puede compartir cada pedido con un link como:

```bash
/seguimiento?order=2401
```

Al abrir ese link, la pagina publica carga automaticamente solo ese pedido.

## Reglas base de Firestore

Este proyecto incluye un ejemplo en `firestore.rules` donde:

- Cualquier visitante puede leer pedidos para consultar su estado
- Solo usuarios autenticados pueden crear o editar pedidos

Si necesitas privacidad estricta por pedido, esta app cliente no es suficiente por si sola; conviene mover la consulta publica a una API o Cloud Function.

## Demo sin Firebase

Si no configuras Firebase, la app entra en modo demo:

- Login demo: `admin@peepo.local`
- Password demo: `peepo123`
- Los pedidos se guardan en `localStorage`
