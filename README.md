# 📝 ExamPro — Node.js + Express + MongoDB

Pehle ExamPro browser ke **local database (IndexedDB)** mein data rakhta tha. Ab sab kuch **apne MongoDB database** mein save hota hai, aur beech mein **Node.js + Express API** hai.

## ✅ Kya badla

| Pehle | Ab |
|---|---|
| IndexedDB (browser mein) | MongoDB (Atlas ya local) |
| Sab kuch `app.js` ke andar | Backend: `server.js`, `routes/`, `models/` |
| Password plain text | Password **bcrypt hash** |
| Login = localStorage mein user object | Login = **JWT token** |
| Score browser mein calculate hota tha | Score **server** par calculate hota hai (cheating nahi) |
| Exam dete waqt sahi jawab browser ko mil jaate the | Sahi jawab **submit ke baad** hi bheje jaate hain |
| Notices / contact messages localStorage mein | MongoDB mein |
| AI key browser se | AI key sirf server (`.env`) mein |
| Forgot-password OTP browser mein banta tha | OTP server banata hai (hash karke store), 10 min expiry |

## 📁 Folder structure

```
ExamPro_MERN/
├── server.js              ← Yahin se server start hota hai
├── package.json
├── .env.example           ← isko copy karke .env banao
├── config/db.js           ← MongoDB connection
├── models/                ← User, Exam, Attempt, Notice, Message, Counter, PasswordReset
├── routes/                ← auth, exams, attempts, users, notices, messages, public, ai
├── middleware/auth.js     ← JWT login check (student/admin)
├── seed/                  ← Admin account + sample exams + default notices (pehli baar auto-seed)
├── utils/                 ← mailer (OTP email), wrap helper
├── public/                ← Poora frontend (index.html, css/, js/, pages/, data/)
│   └── js/api.js          ← NAYA: frontend se backend ko call karne wala code
└── docs_old/              ← Purani README / SETUP_GUIDE (IndexedDB wale)
```

## 🚀 Setup (Step by step)

**1. Node.js install karo** (LTS, version 18 ya usse upar) → https://nodejs.org
```bash
node -v
```

**2. MongoDB ready karo** (dono me se ek):
- **Option A — MongoDB Atlas (free, easy):** https://www.mongodb.com/atlas → free cluster banao → *Database Access* mein user banao → *Network Access* mein apna IP allow karo → *Connect → Drivers* se connection string copy karo.
- **Option B — Local:** MongoDB Community Server + Compass install karo. Connection string: `mongodb://127.0.0.1:27017/exampro`

**3. Dependencies install karo** (project folder ke andar terminal kholo):
```bash
npm install
```

**4. `.env` file banao:**
```bash
# Windows
copy .env.example .env
# Mac / Linux
cp .env.example .env
```
Phir `.env` kholo aur `MONGO_URI` (Atlas string ya local) aur `JWT_SECRET` (koi lambi random string) daalo.

**5. Server chalao:**
```bash
npm start
```
Terminal mein dikhna chahiye:
```
✅ MongoDB connected → ...
🚀 ExamPro chal raha hai → http://localhost:5000
```
Browser mein **http://localhost:5000** kholo. (Ab Live Server ki zarurat nahi.)

> Development ke liye `npm run dev` use karo — code save karte hi server restart ho jaata hai.

## 🔐 Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@exam.com` | `admin123` |
| Student | Register page se naya account banao | — |

Admin ka email/password `.env` mein `ADMIN_EMAIL` / `ADMIN_PASSWORD` se badal sakte ho (pehli baar server start hone se pehle). **Submit / deploy karne se pehle admin password zaroor badlo.**

## 🗄️ MongoDB collections

`users`, `exams`, `attempts`, `notices`, `messages`, `counters`, `passwordresets`
(Har record ka numeric `id` hai — frontend ke purane `id` jaise hi — isliye baaki UI code same chalta hai.)

## 🔌 API endpoints

| Method | URL | Kaun use kare |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | sab |
| GET | `/api/auth/me` | logged-in |
| PUT | `/api/auth/profile` | logged-in |
| POST | `/api/auth/forgot/send-otp` · `verify-otp` · `reset` | sab |
| GET | `/api/exams` | sab (sahi jawab ke bina) |
| GET | `/api/exams/:id` | logged-in |
| POST / DELETE / PATCH | `/api/exams`, `/api/exams/:id`, `/api/exams/:id/status` | admin |
| POST | `/api/attempts` (exam submit + server grading) | logged-in |
| GET | `/api/attempts/mine`, `/api/attempts/:id` | logged-in (apne) |
| GET | `/api/attempts`, `/api/users`, `/api/messages` | admin |
| GET / POST | `/api/notices` | GET sab · POST admin |
| POST | `/api/messages` (contact form) | sab |
| GET | `/api/public/stats`, `/api/public/leaderboard` | sab |
| POST | `/api/ai/generate` | admin |

## ⚙️ Optional features

- **AI Question Generator:** `.env` mein `ANTHROPIC_API_KEY` daalo (https://console.anthropic.com). Admin login ke baad hi kaam karega. Bina key ke baaki app normal chalta hai.
- **Forgot-password email:** `.env` mein `SMTP_*` values daalo. Agar SMTP nahi diya, to OTP server ke terminal mein print hota hai aur (sirf development mein) screen par toast mein dikhta hai.

## ⚠️ Dhyan rakho

- Purane browser (IndexedDB) ka data automatically MongoDB mein **nahi** aata — naya database khali se shuru hota hai (admin + 3 sample exams + 5 notices auto ban jaate hain).
- `.env` file kabhi GitHub par upload mat karo (`.gitignore` mein already hai).
- Deploy karte waqt `NODE_ENV=production` set karo aur `JWT_SECRET` zaroor strong rakho.

## 🛠️ Common problems

| Problem | Solution |
|---|---|
| `Server start nahi ho paaya` / MongoDB error | MongoDB chal raha hai? `MONGO_URI` sahi hai? Atlas mein IP allow kiya? |
| Page khulta hai par login/data nahi aata | Terminal mein `npm start` chal raha hai? URL `http://localhost:5000` hi use karo |
| `EADDRINUSE` | Port 5000 busy hai — `.env` mein `PORT=5001` karo |
| AI Generate fail | `.env` mein `ANTHROPIC_API_KEY` hai? Admin se login ho? |
