# Pandora Box Game

Game escape room dengan 6 gembok riddle. Built dengan Node.js + Neon PostgreSQL.

## Deploy ke Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login Vercel
```bash
vercel login
```

### 3. Setup Environment Variables
Di Vercel dashboard atau via CLI:
```bash
vercel env add DATABASE_URL
# Paste: postgresql://neondb_owner:npg_aZHlX5m3yuJQ@ep-wispy-dawn-b8fu062q-pooler.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 4. Deploy
```bash
vercel --prod
```

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup .env
```bash
cp .env.example .env
# Edit .env dengan DATABASE_URL dari Neon
```

### 3. Run Server
```bash
npm run dev  # development dengan auto-restart
npm start    # production mode
```

Server berjalan di http://localhost:6161/

## Stack

- **Frontend**: Vanilla JS (ES modules)
- **Backend**: Node.js 18+
- **Database**: Neon PostgreSQL (serverless)
- **Deploy**: Vercel
- **Auth**: Bearer token (scrypt hashing)

## Security

- Rate limiting (10 login/min per IP)
- CSP headers
- scrypt password hashing
- Path traversal protection
- Body size limit (100KB)

## Game Features

- 6 lock riddle system
- Motion sensor support (Lock 6)
- Panic hold anti-cheat
- Leaderboard dengan durasi + panic count
- Screen persistence (localStorage + server sync)

## License

UNLICENSED (private project)
