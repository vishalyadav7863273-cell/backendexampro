# 🚀 ExamPro — VS Code Setup & Run Guide
### Step-by-step poori guide — beginner friendly

---

## 📋 Table of Contents
1. Requirements — Kya chahiye
2. VS Code Install
3. Extensions Install
4. Project Setup
5. File Structure samajhna
6. Run karna
7. Browser mein kaam karna
8. Common Errors & Fix
9. Code Edit kaise karein

---

## 1️⃣ Requirements — Pehle Yeh Install Karo

### ✅ Step 1 — Google Chrome Browser
- https://www.google.com/chrome download karo
- Install karo (default settings)
- **Kyun?** Live Server Chrome mein best kaam karta hai

### ✅ Step 2 — VS Code (Visual Studio Code)
- https://code.visualstudio.com download karo
- Windows: `.exe` file download karo → double click → Next Next Finish
- **Important:** Install ke time "Add to PATH" checkbox zaroor check karo

---

## 2️⃣ VS Code Extensions Install Karo

VS Code open karo. Left sidebar mein **Extensions icon** click karo
(ya `Ctrl + Shift + X` press karo)

### Extension 1 — Live Server (ZARURI)
```
Search: "Live Server"
Author: Ritwick Dey
Install button click karo
```
> Yeh extension tumhara HTML file browser mein automatically open karta hai
> aur jab bhi code save karo, page auto-refresh ho jaata hai

### Extension 2 — Prettier (Optional but recommended)
```
Search: "Prettier - Code formatter"
Author: Prettier
Install karo
```
> Code automatically format ho jaata hai

### Extension 3 — HTML CSS Support (Optional)
```
Search: "HTML CSS Support"
Author: ecmel
Install karo
```
> HTML mein CSS classes ka autocomplete milta hai

---

## 3️⃣ Project Folder Setup

### Step 1 — ExamPro_VSCode folder kisi jagah rakho
```
Example locations:
C:\Users\YourName\Desktop\ExamPro_VSCode\
C:\Users\YourName\Documents\BCA_Project\ExamPro_VSCode\
```

### Step 2 — VS Code mein folder open karo
```
VS Code open karo
→ File menu → Open Folder
→ ExamPro_VSCode folder select karo
→ "Select Folder" click karo
```

**Ya shortcut:**
```
Ctrl + K  phir  Ctrl + O
→ Folder select karo
```

### Step 3 — Verify karo ki sab files hain
Left sidebar mein EXPLORER panel mein yeh dikhna chahiye:
```
📁 EXAMPRO_VSCODE
  ├── 📁 .vscode
  │    └── settings.json
  ├── 📁 css
  │    └── styles.css
  ├── 📁 data
  │    └── questions.json
  ├── 📁 js
  │    └── app.js
  ├── 📁 pages
  │    └── generate_questions.html
  ├── 📄 index.html
  ├── 📄 README.md
  └── 📄 SETUP_GUIDE.md
```

---

## 4️⃣ File Structure — Har File Kya Karti Hai

```
ExamPro_VSCode/
│
├── index.html          ← MAIN FILE — Browser mein yahi khulta hai
│                          Sare pages ka HTML yahan hai
│                          (Home, Login, Register, Dashboard, Exam, etc.)
│
├── css/
│   └── styles.css      ← DESIGN FILE — Colors, fonts, layouts
│                          Yahan change karo: colors, sizes, animations
│
├── js/
│   └── app.js          ← LOGIC FILE — Sab kuch yahan hota hai
│                          Database, Login, Exam logic, AI Generator
│                          8 sections clearly divided hain andar
│
├── pages/
│   └── generate_questions.html  ← SEPARATE TOOL
│                                   AI se questions banane ka tool
│                                   index.html se alag khulta hai
│
├── data/
│   └── questions.json  ← SAMPLE DATA — Ready-made questions
│                          Import karke exam mein use karo
│
├── .vscode/
│   └── settings.json   ← VS CODE SETTINGS — Live Server config
│                          Automatically applies hoti hain
│
└── README.md           ← PROJECT INFO
    SETUP_GUIDE.md      ← YEH FILE — Setup guide
```

---

## 5️⃣ Project Run Karo — Step by Step

### Method 1 — Live Server (Best Way) ⭐

```
Step 1: VS Code mein index.html open karo
        (Left sidebar mein index.html pe click karo)

Step 2: Editor mein right-click karo
        → "Open with Live Server" click karo

Step 3: Chrome browser automatically khulega
        URL: http://127.0.0.1:5500/index.html

Step 4: ExamPro home page dikhega ✅
```

**Ya bottom-right corner mein:**
```
VS Code ke neeche right side mein "Go Live" button click karo
```

### Method 2 — Direct Browser Open (Backup)
```
Windows Explorer mein ExamPro_VSCode folder open karo
index.html pe double-click karo
Chrome mein khulega
```
> ⚠️ Note: Is method mein Live Reload nahi milta
> Code save karne ke baad manually F5 press karna padega

---

## 6️⃣ Browser mein Kaam Karna

### Default Admin Login
```
Email    : admin@exam.com
Password : admin123
```

### Student Register
```
Register page → Fill form → Account ban jaata hai
```

### Important Browser Settings
```
Chrome mein press karo: F12 → Console tab
Yahan errors dikhenge agar kuch galat ho
```

---

## 7️⃣ Code Edit Kaise Karein

### CSS Change Karna (Colors, Design)
```
css/styles.css open karo

Colors change karne ke liye — top mein :root section dekho:
  --primary: #5b21b6;       ← Main purple color
  --accent:  #06b6d4;       ← Cyan accent color
  --bg:      #f5f3ff;       ← Background color
  --card:    #ffffff;       ← Card background

Koi bhi color hex value change karo → Ctrl+S → Browser auto-refresh ✅
```

### HTML Change Karna (Pages, Content)
```
index.html open karo

Har page ka HTML ek div mein hai:
  <div id="page-home">        ← Home page
  <div id="page-login">       ← Login page
  <div id="page-register">    ← Register page
  <div id="page-studentDash"> ← Student dashboard
  <div id="page-adminPanel">  ← Admin panel
  <div id="page-about">       ← About page
  <div id="page-courses">     ← BCA Courses page
  ... etc.

Kisi bhi section mein text/HTML change karo → Ctrl+S → Done ✅
```

### JavaScript Change Karna (Logic)
```
js/app.js open karo

Sections clearly marked hain:
  /* SECTION: DB      */ → Line ~1   — Database
  /* SECTION: STATE   */ → Line ~90  — Navigation
  /* SECTION: AUTH    */ → Line ~300 — Login/Register
  /* SECTION: STUDENT */ → Line ~380 — Dashboard
  /* SECTION: EXAM    */ → Line ~510 — Exam engine
  /* SECTION: RESULTS */ → Line ~890 — Results
  /* SECTION: ADMIN   */ → Line ~960 — Admin panel
  /* SECTION: EXTRAS  */ → Line ~1840 — Extra features

Ctrl+F → Section name search karo → Edit karo → Ctrl+S ✅
```

### Questions JSON Edit Karna
```
data/questions.json open karo

Format:
{
  "exams": [
    {
      "title": "Exam Name",
      "subject": "Subject",
      "duration": 30,
      "passingScore": 60,
      "questions": [
        {
          "text": "Question yahan?",
          "options": ["A", "B", "C", "D"],
          "correct": 0        ← 0=A, 1=B, 2=C, 3=D
        }
      ]
    }
  ]
}

Edit karo → Save → Admin Panel mein import karo ✅
```

---

## 8️⃣ Useful VS Code Shortcuts

| Shortcut | Kaam |
|----------|------|
| `Ctrl + S` | File save (Live Server auto-refresh) |
| `Ctrl + F` | File mein search |
| `Ctrl + H` | Find and Replace |
| `Ctrl + /` | Line comment/uncomment |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + F` | Puri project mein search |
| `Alt + Z` | Word wrap toggle |
| `Ctrl + G` | Line number pe jaao |
| `F12` | Browser DevTools |
| `Ctrl + Shift + I` | Browser DevTools (alternate) |

---

## 9️⃣ Common Errors & Fix

### ❌ Error: "Page not found" ya blank screen
```
Fix: index.html ki jagah directly file open mat karo
     Live Server se open karo (Method 1 use karo)
```

### ❌ Error: "Cannot read properties of undefined"
```
Fix: Browser Console (F12) mein error dekho
     Most likely: IndexedDB clear karo
     Chrome → F12 → Application → IndexedDB → ExamProDB → Delete
     Page refresh karo
```

### ❌ Error: AI Generator kaam nahi kar raha
```
Fix: Anthropic API key ki zarurat hai
     Ya network connection check karo
     Console mein error message dekho (F12)
```

### ❌ Error: CSS design nahi dikh raha
```
Fix: css/styles.css file check karo — exist karti hai?
     index.html mein yeh line honi chahiye:
     <link rel="stylesheet" href="css/styles.css">
     Browser cache clear karo: Ctrl + Shift + R
```

### ❌ Error: Login kaam nahi kar raha
```
Fix: Browser Console (F12) mein dekho
     Ya IndexedDB reset karo:
     Chrome → F12 → Application tab → Storage → Clear site data
```

### ❌ Live Server nahi dikh raha VS Code mein
```
Fix: Extensions mein "Live Server" install check karo
     VS Code restart karo
     Bottom-right mein "Go Live" button dhundho
```

---

## 🔟 Project Submit Karne Ke Liye

```
1. Poora ExamPro_VSCode folder zip karo
   Windows: Folder pe right-click → Send to → Compressed (zipped) folder
   
2. ZIP file submit karo

3. Demo ke liye:
   index.html → Live Server → Chrome → Show karo
   
4. README.md mein project info already hai
```

---

## 📱 Screenshot Lene Ka Tarika

```
Full page screenshot:
Chrome → F12 → Ctrl + Shift + P → "screenshot" type karo
→ "Capture full size screenshot" click karo
```

---

*ExamPro v3.0 | BCA Final Year Project 2025*
