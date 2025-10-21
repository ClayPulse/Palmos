# Pulse Editor Remote Instance

This repo contains source code of a remote instance.

## Self-host a remote instance

Production:

```bash
npm run build
npm run start
```

Development:

```bash
npm run dev
```

## Configure SSL

Create `.env` file in current folder, and set `SSL_CERT_PATH` and `SSL_KEY_PATH` (check example file `.env.example`)

## Optional: create self-signed SSL for HTTPS connection

Generate self-signed SSL certificates:

```bash
bash ./utils/generate-self-signed.sh
```
