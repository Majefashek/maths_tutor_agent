# Contributing to Maths Tutor Agent (Beginner's Guide)

Welcome to the team! This guide will walk you through setting up the project and using Git to contribute, even if you've never used them before.

## 🚀 Setting Up Your Computer

### 1. Download the Project (Clone)
"Cloning" means making a copy of the project on your computer.
Open your terminal (Command Prompt or PowerShell) and type:
```bash
git clone https://github.com/Majefashek/maths_tutor_agent.git
cd maths_tutor_agent
```

### 2. Set Up the Backend (Django)
The "backend" is where the logic lives. We use a "virtual environment" (venv) to keep things clean.
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Add Your Secrets (Environment Variables)
Create a new file named `.env` inside the `backend` folder. Copy and paste this into it:
```env
GEMINI_API_KEY=your_api_key_here
DJANGO_SECRET_KEY=django-insecure-dev-key
DEBUG=True
```
> [!IMPORTANT]
> **Never** share this `.env` file. It's like your password.

### 4. Start the Servers
You need to run two things at the same time:

**Backend:**
Run this in your current terminal:
```bash
python manage.py runserver
```

**Frontend:**
Open a **new** terminal window, go to the project folder, and run:
```bash
cd frontend
npm install
npm run dev
```

---

## 🌿 How to Safely Make Changes (Git)

Git keeps track of your work. Follow these exact steps to avoid mistakes.

### Step 1: Create a "Branch" (Your Workspace)
Think of a branch as a separate copy where you can play around without breaking the main code.
```bash
git checkout -b feature/my-new-task
```

### Step 2: Save Your Work (Stage and Commit)
When you're happy with your changes, "save" them to Git:
1. **Stage** (Prepare to save): `git add .`
2. **Commit** (Actually save): `git commit -m "Fixed a bug in the tutor logic"`

### Step 3: Send to GitHub (Push)
This sends your "branch" to the internet so others can see it. **Never push to `main`.**
```bash
git push origin feature/my-new-task
```

---

## 📂 Where is Everything? (File Structure)

- **`backend/tutor/`**: This is where you'll spend most of your time.
  - `consumers.py`: Handles the real-time talking between the user and AI.
  - `gemini_client.py`: The code that talks to the Gemini AI.
  - `prompts.py`: The instructions we give to the AI to make it act like a tutor.
- **`backend/config/`**: Settings for the whole project.

---

## 💡 Quick Tips for Success
1. **Errors are Okay**: If the terminal turns red, read the last few lines. It usually tells you what's wrong.
2. **Pull Before You Work**: Every morning, run `git pull origin main` on your `main` branch to get the latest updates.
3. **Ask Early**: If you're stuck for more than 30 minutes, ask a teammate!
