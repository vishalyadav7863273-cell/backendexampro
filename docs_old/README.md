# 📝 ExamPro — Advanced Online Examination System
### BCA Final Year Project 2025 | VS Code Complete Guide

---

## 📁 PROJECT FOLDER STRUCTURE

Yeh files EXACTLY is sequence mein rakho — naam bilkul same hone chahiye:

```
ExamPro_VSCode/              ← Yeh main project folder hai
│
├── index.html               ← 🏠 MAIN FILE — isi ko browser mein kholo
├── README.md                ← 📖 Yeh guide file
│
├── css/                     ← 🎨 Style folder
│   └── styles.css           ← Poori CSS yahan hai
│
├── js/                      ← ⚙️ JavaScript folder
│   └── app.js               ← Poora JavaScript yahan hai
│
├── pages/                   ← 📄 Extra pages folder
│   └── generate_questions.html  ← AI Question Studio
│
└── data/                    ← 💾 Data folder
    └── questions.json       ← Sample questions file
```

> ⚠️ IMPORTANT: Folder ke naam aur file ke naam EXACTLY same rakho
> Capital/small letter ka fark bhi matter karta hai!

---

## 🖥️ VS CODE MEIN KAISE SETUP KAREIN

### STEP 1 — VS Code Install Karo
```
https://code.visualstudio.com/download
```
Download karo → Install karo → Open karo

---

### STEP 2 — Project Folder VS Code Mein Open Karo

**Method A — Drag & Drop:**
```
ExamPro_VSCode folder → VS Code window mein drag karo
```

**Method B — Menu se:**
```
VS Code → File → Open Folder → ExamPro_VSCode select karo → Open
```

**Method C — Terminal se:**
```bash
cd ExamPro_VSCode
code .
```

✅ Left side mein yeh dikhe:
```
EXPLORER
└── EXAMPRO_VSCODE
    ├── css/
    │   └── styles.css
    ├── data/
    │   └── questions.json
    ├── js/
    │   └── app.js
    ├── pages/
    │   └── generate_questions.html
    ├── index.html
    └── README.md
```

---

### STEP 3 — Live Server Extension Install Karo

```
1. VS Code mein left sidebar mein 4 squares ka icon click karo
   (Extensions — Ctrl+Shift+X)

2. Search box mein likho:  Live Server

3. "Live Server" by Ritwick Dey — Install click karo
   (5 crore+ downloads wala)

4. Install hone ke baad VS Code bottom mein
   "Go Live" button aayega
```

---

### STEP 4 — Project Run Karo

**Method 1 — Recommended (Live Server):**
```
1. index.html file click karke open karo
2. Right click karo file ke andar
3. "Open with Live Server" click karo
4. Browser automatically khulega: http://localhost:5500
```

**Method 2 — Bottom bar se:**
```
1. index.html open karo
2. VS Code bottom mein "Go Live" button click karo
3. Browser mein khul jaayega
```

**Method 3 — Direct browser mein:**
```
1. File Explorer mein ExamPro_VSCode folder kholo
2. index.html pe double click karo
3. Chrome/Edge mein khulega
   (Note: kuch features sirf Live Server mein kaam karte hain)
```

---

## ✅ RUN HONE KE BAAD KYA DIKHEGA

```
Browser mein:  http://localhost:5500

┌─────────────────────────────────────────┐
│  📝 ExamPro    Home  Courses  Login  .. │  ← Navbar
├─────────────────────────────────────────┤
│                                         │
│    [Student Illustration / Hero]        │  ← Hero Section
│    "The Smartest Way to Conduct Exams"  │
│    [Get Started] [Take an Exam]         │
│                                         │
├─────────────────────────────────────────┤
│  0 Students | 0 Exams | 0 Attempts     │  ← Stats
└─────────────────────────────────────────┘
```

---

## 🔐 LOGIN KARO AUR TEST KARO

### Admin Login:
```
Email    : admin@exam.com
Password : admin123
```

### Student Register:
```
Homepage → Register → Form bharo → Account bana lo
```

---

## 📋 FILES KA ROLE — SEQUENCE SAMJHO

```
BROWSER REQUEST FLOW:
─────────────────────────────────────────────────────

  index.html          ← Browser sabse pehle yahi load karta hai
      │
      ├── css/styles.css    ← CSS load hoti hai (design/colors)
      │       │
      │       └── Sab pages ka design yahan se aata hai
      │
      └── js/app.js         ← JavaScript load hoti hai
              │
              ├── 1. Database setup (IndexedDB)
              ├── 2. Global state + Navigation
              ├── 3. Login/Register functions
              ├── 4. Student dashboard functions
              ├── 5. Exam engine (timer, questions)
              ├── 6. Results + Profile functions
              ├── 7. Admin panel + AI Generator
              └── 8. Dark mode + Extra pages


  pages/generate_questions.html  ← Alag se khulta hai
      │                            (Admin panel se link hai)
      └── Apni CSS aur JS andar hi hai (standalone)


  data/questions.json  ← Import karte waqt use hoti hai
      │                  (Admin → Create Exam → Import JSON)
      └── Browser isko read karta hai when imported
```

---

## ⚠️ COMMON PROBLEMS AUR SOLUTIONS

### Problem 1: Page khul raha hai par design nahi dikh raha
```
❌ Galat:  index.html ko alag folder se khola
✅ Sahi:   Poora ExamPro_VSCode folder VS Code mein open karo
           Phir index.html → Right click → Open with Live Server
```

### Problem 2: "Go Live" button nahi dikh raha
```
✅ Solution:
   1. Extensions (Ctrl+Shift+X) → "Live Server" search karo
   2. Install karo
   3. VS Code restart karo (Ctrl+Shift+P → "Reload Window")
   4. index.html open karo → bottom mein "Go Live" dikhega
```

### Problem 3: AI Question Generator kaam nahi kar raha
```
✅ Solution:
   Internet connection check karo — AI ke liye internet chahiye
   Admin → Create Exam → AI panel → Topic likho → Generate
```

### Problem 4: Data save nahi ho raha / reset ho raha hai
```
✅ Solution:
   Live Server use karo (direct file:// se khole toh IndexedDB 
   kuch browsers mein work nahi karta)
   Chrome ya Edge use karo
```

### Problem 5: generate_questions.html nahi khul raha
```
✅ Solution:
   Admin Login → Create Exam → "Open Question Studio" button
   Ya seedha: http://localhost:5500/pages/generate_questions.html
```

---

## 🗂️ VS CODE MEIN FILE EDIT KAISE KAREIN

```
┌──────────────────────────────────────────────────────────┐
│  Kya Change Karna Hai?   →   Konsi File Edit Karo?       │
├──────────────────────────────────────────────────────────┤
│  Colors / fonts / design    css/styles.css               │
│  Homepage content           index.html (home page div)   │
│  Login/Register form        index.html + js/app.js       │
│  Exam logic / timer         js/app.js (EXAM section)     │
│  Admin panel                js/app.js (ADMIN section)    │
│  Navbar / footer            index.html                   │
│  Dark mode colors           css/styles.css (body.dark)   │
│  New subject courses        js/app.js (EXTRAS section)   │
│  Notice board               js/app.js (EXTRAS section)   │
│  Sample questions           data/questions.json          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 app.js KE ANDAR NAVIGATE KAISE KAREIN

VS Code mein `app.js` kholo aur `Ctrl+F` se search karo:

```
Section dhundhna hai?   Search karo:
─────────────────────────────────────
Database               SECTION: DB
Navigation             SECTION: STATE
Login/Register         SECTION: AUTH
Student Dashboard      SECTION: STUDENT
Exam Engine            SECTION: EXAM
Results Page           SECTION: RESULTS
Admin Panel            SECTION: ADMIN
Dark Mode/Extra Pages  SECTION: EXTRAS
```

**Ya directly jump karo:**
```
Ctrl + G → line number type karo → Enter

Section      Line (approx)
─────────────────────────
DB           ~1
STATE        ~80
AUTH         ~290
STUDENT      ~375
EXAM         ~510
RESULTS      ~890
ADMIN        ~960
EXTRAS       ~1840
```

---

## 📦 RECOMMENDED VS CODE EXTENSIONS

```
1. Live Server         → Ritwick Dey
   (Project run karne ke liye — MUST HAVE)

2. Prettier            → Prettier
   (Code auto-format karne ke liye)

3. Auto Rename Tag     → Jun Han
   (HTML tags rename karne ke liye)

4. CSS Peek            → Pranay Prakash
   (CSS class click karke directly jump karo)

5. JavaScript (ES6)    → charalampos karypidis
   (JS snippets ke liye)

6. Color Highlight      → Naumovets
   (CSS colors visually dikhega)
```

**Install karo:**
```
VS Code → Ctrl+Shift+X → Name search karo → Install
```

---

## 🚀 QUICK START (30 seconds mein)

```
1. VS Code mein ExamPro_VSCode folder open karo
   File → Open Folder → ExamPro_VSCode → Open

2. index.html click karo (left sidebar mein)

3. Right click → "Open with Live Server"

4. Browser mein http://localhost:5500 khulega

5. Admin login:
   Email: admin@exam.com | Password: admin123

6. Done! ✅
```

---

## 📊 PROJECT STATS

```
Total Files    : 6 files
index.html     : 2737 lines (HTML structure)
css/styles.css : 1662 lines (All styles)
js/app.js      : 2066 lines (All JavaScript)
pages/         : 761  lines (AI Studio)
data/          : 80   lines (Sample JSON)
Total Size     : ~400 KB
```

---

*ExamPro v3.0 | BCA Final Year Project 2025*
*Built with: HTML5 + CSS3 + Vanilla JavaScript + IndexedDB*
