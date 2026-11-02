# Pandora Box Game — Production Checklist

## Pre-Launch (3 November 2026)

### 1. Konfigurasi (js/config.js)
- [ ] **PANIC_ENABLED = true** — Enable anti-cheat panic hold
- [ ] **MOTION_THRESHOLD** — Test di HP yang akan dipakai, sesuaikan nilai
- [ ] **MOTION_COUNT_LIMIT** — Verify sesuai gerakan yang diinginkan

### 2. Server Setup
- [ ] Node.js 22.5+ installed
- [ ] Port 6161 terbuka di firewall
- [ ] Database folder `data/` writable
- [ ] Akses lokal network sudah dicoba dari HP/tablet

### 3. Pre-Game Test
- [ ] Test semua 6 locks bisa dibuka
- [ ] Test sensor gerak Lock 6 di HP target
- [ ] Test login/register berfungsi
- [ ] Test leaderboard tampil setelah selesai
- [ ] Test panic hold (jika enabled)
- [ ] Test screen persistence setelah refresh

### 4. Database
- [ ] Backup `data/pandora.db` sebelum mulai
- [ ] Hapus data test jika ada:
  ```bash
  rm -rf data/pandora.db*
  npm start  # regenerate fresh DB
  ```

### 5. Security ✓ (Already implemented)
- ✓ Rate limiting 10 req/min per IP
- ✓ CSP headers
- ✓ Password hashing (scrypt)
- ✓ Path traversal protection
- ✓ Body size limit
- ✓ Session token validation

## Launch Day

### Start Server
```bash
npm start
```

Server akan print URLs:
- **Komputer**: http://localhost:6161/
- **HP/tablet**: http://[IP-lokal]:6161/

### Monitor
```bash
# Watch logs untuk debugging
npm run dev  # auto-restart on file change

# atau
npm start    # production mode
```

### Troubleshooting

**Port sudah dipakai:**
```bash
# Windows: cek proses di port 6161
netstat -ano | findstr :6161
taskkill /PID [PID] /F
```

**HP tidak bisa akses:**
- Cek firewall Windows allow port 6161
- Cek HP dan komputer di network yang sama
- Coba akses http://[IP]:6161/ langsung

**Sensor gerak tidak responsif:**
- Buka js/config.js
- Turunkan MOTION_THRESHOLD (coba 1.5 atau 2.0)
- Restart server

**Database corrupt:**
```bash
rm data/pandora.db
rm data/pandora.db-shm
rm data/pandora.db-wal
npm start  # fresh DB
```

## Post-Game

### Backup Results
```bash
# Backup database dengan leaderboard
cp data/pandora.db backups/pandora-[tanggal].db
```

### View Leaderboard
GET http://localhost:6161/api/leaderboard

Returns:
```json
[
  {"name": "Team A", "duration": 1234567, "panicCount": 2},
  {"name": "Team B", "duration": 1456789, "panicCount": 0}
]
```

Duration dalam milidetik. Convert ke menit:
```js
Math.floor(duration / 60000) // menit
```

## Technical Notes

**PIN Answers:**
- Lock 1: 17106 (5 digit)
- Lock 2: 472913 (6 digit)
- Lock 3: 839147026581493 (15 digit)
- Lock 4: riddle-based (server validates)
- Lock 5: riddle table (server validates)
- Lock 6: 971 (3 digit, sensor gerak required)

**Architecture:**
- Frontend: Vanilla JS (ES modules)
- Backend: Node.js 22.5+ (built-in SQLite)
- Database: SQLite with WAL mode
- Auth: Bearer token (random 64-char hex)
- Storage: localStorage + server sync

**Security Model:**
- Client-side PIN check (convenience)
- Server-side save validates progress
- Panic hold mencegah cheat di riddle panjang
- Fasilitator pantau langsung (primary anti-cheat)

**Browser Support:**
- Chrome/Edge 90+
- Safari 15+ (iOS sensor gerak perlu allow permission)
- Firefox 88+

Requires: DeviceMotion API untuk Lock 6
