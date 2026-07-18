# Project-AWS-Deployment

Simple Express + TypeScript backend serving a static frontend, containerized with Docker for AWS deployment.

## Project structure

```
aws-deploy/
├── backend/
│   ├── app.ts          # Express server (routes, static serving)
│   ├── .env            # local environment variables (gitignored)
│   └── .env.example    # template for .env
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 22+
- npm
- Docker (for containerized run)

## Local setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy the env template and adjust if needed:

   ```
   cp backend/.env.example backend/.env
   ```

3. Run in dev mode (auto-restarts on file changes):

   ```
   npm run dev
   ```

4. Open `http://localhost:3000` in a browser. The `/api/status` endpoint is served from the same origin.

## Environment variables

Defined in `backend/.env`:

| Variable   | Description                | Default       |
|------------|-----------------------------|---------------|
| `PORT`     | Port the server listens on  | `3000`        |
| `NODE_ENV` | Environment name            | `development` |

## Docker

1. Build the image:

   ```
   docker build -t aws-app .
   ```

2. Run the container. `-p` syntax is `<host-port>:<container-port>` — the container always listens on whatever `PORT` is set to in `backend/.env` (which gets baked into the image).

   - If `.env` has `PORT=3000`, and you want to browse via `localhost:3000`:

     ```
     docker run -p 3000:3000 aws-app
     ```

   - If `.env` has `PORT=5500`, but you still want `localhost:3000` in the browser, put the container's real port (5500) on the right, and the host port you want (3000) on the left:

     ```
     docker run -p 3000:5500 aws-app
     ```

3. Open `http://localhost:<host-port>` (the left-hand number you picked above).

> Note: the right-hand number in `-p` must always match `PORT` in `backend/.env`. The left-hand number is just whatever you want to browse to on your machine.
