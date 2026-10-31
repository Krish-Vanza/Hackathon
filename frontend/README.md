# Frontend

React (JavaScript), Vite, Tailwind, Recharts and `react-force-graph-2d`.

```powershell
npm install
npm run dev        # real API, proxied to http://localhost:8000
npm run dev:mock   # no backend needed, uses dummy responses
npm run build
npm run lint
```

- `src/api.js` is the only place that calls the backend. It sends `X-Demo-Role` on every request.
- `src/mocks/mockApi.js` holds one dummy response per endpoint, mirroring the FastAPI shapes. The backend is the source of truth, so update the mock when an API changes.
- `components/shared/` and `pages/governance/` hold the explanation and status components, plus the risk, HR review, audit and report pages.
