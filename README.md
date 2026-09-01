# AI Insight

AI Insight is an internal survey and executive dashboard application for understanding how AI affects employee productivity, quality, and workflow friction.

The product collects individual survey responses and rolls them up into leadership metrics across:

- the full organization,
- a selected manager plus all descendants,
- a selected employee level.

The dashboard must aggregate from individual employee responses.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to:

```text
http://localhost:8000
```

Useful frontend commands:

```bash
npm run lint
npm run build
npm run preview
```
