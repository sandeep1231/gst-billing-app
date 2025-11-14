GST Billing + WhatsApp Invoicing — Scaffold

This workspace contains a scaffold for a multi-tenant GST billing app.

Structure overview:
- backend/   — Express API (Node.js, JWT auth, Mongoose)
- frontend/  — Angular app (TypeScript)

Run instructions (backend):
- cd backend
- npm install
- copy .env.example to .env and set MONGO_URI, JWT_SECRET, ORIGIN
- npm run dev

Run instructions (frontend):
- cd frontend
- npm install
- copy environment files and set API base URL
- npm start

Notes:
- PDF generation uses pdfmake; Noto fonts should be added to assets for Hindi/Odia support.
- Seed script included for demo data.

Environment:
- Node.js: Use LTS Node 18 (recommended). The repo includes an engines field and .nvmrc (18.20.4). On Windows, nvm-windows can switch versions: install Node 18 and run with it for Angular 16 compatibility.

## Deployment (GitHub + Render)

### 1. Initial Git Setup
```bash
git init
git add .
git commit -m "Initial commit"
git branch -m main
```
Create a new GitHub repository (e.g. `your-org/gst-billing-app`) and add the remote:
```bash
git remote add origin https://github.com/your-org/gst-billing-app.git
git push -u origin main
```

### 2. Render Infrastructure (render.yaml)
At repo root create `render.yaml` describing two services:
```yaml
services:
	- type: web
		name: gst-billing-backend
		env: node
		rootDir: backend
		buildCommand: npm install && npm run build
		startCommand: npm start
		autoDeploy: true
		envVars:
			- key: MONGO_URI
				sync: false   # set in dashboard
			- key: JWT_SECRET
				generateValue: true
			- key: ORIGIN
				value: https://gst-billing-frontend.onrender.com
	- type: static
		name: gst-billing-frontend
		rootDir: frontend
		buildCommand: npm install && npm run build
		publishPath: dist/gst-billing-frontend
```

### 3. Environment Variables (Backend Service)
- `MONGO_URI`: Your MongoDB connection string (Atlas or Render Mongo).  
- `JWT_SECRET`: Random long secret (Render can auto-generate).  
- `ORIGIN`: Comma-separated allowed origins (production frontend URL + any admin domain).  

### 4. CORS & Frontend API Base URL
Set Angular environment to point to the deployed backend (e.g. `https://gst-billing-backend.onrender.com`). Ensure `ORIGIN` on the backend includes that exact URL.

### 5. Deployment Steps Recap
1. Push code to GitHub.
2. In Render dashboard choose "New +" → "Blueprint" and point to repo (or create services manually).
3. Add required env vars before first deploy.
4. Trigger deploy; watch build logs for backend and frontend.
5. Visit backend root (`/`) to confirm `{ ok: true }` health, then load frontend site.

### 6. Post-Deployment Checklist
- PDF endpoints return generated documents (currency labels render without ₹ glyph issues).  
- Reports endpoints return expected IST date-bound data.  
- CORS requests succeed (no blocked origin errors in browser console).  
- JWT auth flows (login, protected routes) function with production domain.  
- Balance sheet range comparison and CSV export work.  

### 7. Ongoing Operations
- Use Render automatic deploys on `main` or pin to a specific commit.  
- Rotate `JWT_SECRET` only with a planned session invalidation.  
- Monitor memory usage (Mongo queries & PDF generation).  

### 8. Optional Improvements
- Add health check route with dependency status (Mongo connected flag).  
- Add staging environment with separate Mongo database.  
- Integrate CI (GitHub Actions) to run build/test before Render deploy.  

## License
Internal project (add license if making public).
