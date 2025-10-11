# PROGESTOR – Blue Home (Railway)

## 1) Variables de entorno
- PORT=3000
- JWT_SECRET=BlueHomeStrongSecret2025
- SPREADSHEET_ID=1ViZQyX8-vDENf3_FkQ2fYAdpC993cpRSnmlcSUg2J6w
- USERS_SHEET=Usuarios
- ORDERS_SHEET=ordenes
- GOOGLE_SERVICE_ACCOUNT_EMAIL=bluehome-procesos@midyear-pattern-443303-d7.iam.gserviceaccount.com
- GOOGLE_PRIVATE_KEY="(tu private key con \n)"
- Comparte tu hoja con la cuenta de servicio

## 2) Deploy
- npm i
- npm run dev (local) o Railway (npm start)
- / → login

## 3) Endpoints
- POST /api/auth/login → {usuario, clave}
- GET/POST/PUT/DELETE /api/users (SuperAdmin)
- GET/POST/PUT /api/orders ; GET /api/orders/summary
