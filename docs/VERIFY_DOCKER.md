# How to Verify Docker Setup

## Understanding: Your Code is NOT "In" Docker

**Important Concept:**
- ❌ **Incorrect thinking**: "Move code into Docker"
- ✅ **Correct thinking**: "Docker runs your code that lives on your computer"

Docker doesn't store your code - it just provides the environment to run it.

## How Docker Works with Your Code

```
Your Computer (macOS)
├── /Users/ciroccofam/.../manama-next/
│   ├── src/              ← Your actual code (you edit here)
│   ├── package.json
│   └── node_modules/
│
└── Docker Container (Linux environment)
    └── /app/             ← Mounted view of your code
        ├── src/          → Points to your computer's src/
        ├── package.json  → Points to your computer's package.json
        └── node_modules/ → Stored in Docker volume
```

When you edit `src/app/page.tsx` on your Mac, Docker instantly sees the change!

## Step-by-Step Verification

### Step 1: Check Docker is Installed and Running

```bash
# Check Docker version
docker --version

# Should show something like:
# Docker version 29.0.1, build eedd969

# Check Docker is running
docker ps

# If running, you'll see a list (might be empty)
# If not running, you'll see an error
```

**If Docker isn't running:**
- Open Docker Desktop app
- Wait for whale icon to stop animating
- Try `docker ps` again

### Step 2: Verify Docker Files Exist

```bash
cd manama-next

# Check these files exist
ls -la | grep -E "Dockerfile|docker-compose"

# You should see:
# Dockerfile
# docker-compose.yml
# .dockerignore
```

### Step 3: Verify Your Code is Ready

```bash
# Check your source code exists
ls src/app/

# You should see:
# page.tsx
# layout.tsx
# generate/
# api/
# etc.

# Check package.json exists
cat package.json | head -5

# You should see:
# {
#   "name": "manama-next",
#   ...
```

### Step 4: Build and Start Docker (ACTUAL TEST)

```bash
# This builds the container and starts it
docker-compose up dev

# You should see:
# - "Building..." (first time only)
# - "Starting..."
# - "✓ Ready in X seconds"
# - "Local: http://localhost:3000"
```

**Watch the output carefully!** You'll see:
1. Docker building the image (first time ~6 minutes)
2. Installing dependencies
3. Starting Next.js dev server
4. "Ready" message

### Step 5: Test It Works

**While `docker-compose up dev` is running:**

Open a **new terminal** and test:

```bash
# Test homepage loads
curl -I http://localhost:3000

# Should see:
# HTTP/1.1 200 OK

# Or just open in browser:
# http://localhost:3000
```

### Step 6: Test Hot Reload (THE KEY TEST)

**This proves your code is connected:**

1. **Keep Docker running** (`docker-compose up dev`)

2. **Open in browser**: http://localhost:3000

3. **Edit a file on your computer**:
   ```bash
   # In a new terminal
   cd manama-next/src/app

   # Edit the homepage
   nano page.tsx  # or use VS Code

   # Change the title text, save the file
   ```

4. **Check browser** - Page should auto-refresh with your change!

**If hot-reload works = Your code is properly connected to Docker! ✅**

### Step 7: Check Files Inside Container

Want to see what Docker sees?

```bash
# While container is running, open a shell inside it
docker-compose exec dev sh

# You're now "inside" the container!
# Check what files Docker sees:
ls -la /app/

# You should see your exact same files:
# src/
# package.json
# next.config.ts
# etc.

# Edit a file from outside Docker (on your Mac)
# Then check inside Docker:
cat /app/src/app/page.tsx

# You'll see the same changes! They're the same files!

# Exit the container
exit
```

## What This Proves

✅ **Your code lives on your Mac** - You edit it with VS Code, Cursor, etc.

✅ **Docker mounts your code** - Docker can see and run your files

✅ **Changes are instant** - Edit → Save → Docker sees it immediately

✅ **node_modules in Docker** - Dependencies stay in Docker volume (faster)

## Common Confusion Clarified

### ❌ Wrong Mental Model:
"I need to copy my code into Docker and then work inside Docker"

### ✅ Correct Mental Model:
"Docker provides a Linux environment that runs my code. I edit files normally on my Mac, Docker sees the changes automatically."

## Visual Diagram

```
┌─────────────────────────────────────┐
│  Your Mac (Host)                    │
│                                     │
│  You edit code here:                │
│  /Users/.../manama-next/src/        │
│          ↓                          │
│          │ (mounted as volume)     │
│          ↓                          │
│  ┌──────────────────────────┐      │
│  │  Docker Container        │      │
│  │  ┌────────────────────┐  │      │
│  │  │ Linux Environment  │  │      │
│  │  │                    │  │      │
│  │  │ /app/src/          │  │      │
│  │  │   ↑                │  │      │
│  │  │   └─ Same files!   │  │      │
│  │  │                    │  │      │
│  │  │ Next.js running... │  │      │
│  │  │ Port 3000          │  │      │
│  │  └────────────────────┘  │      │
│  └──────────────────────────┘      │
│          ↓                          │
│  Browser: localhost:3000            │
└─────────────────────────────────────┘
```

## Ultimate Verification Test

**Run all these commands and check each result:**

```bash
# 1. Your code exists
cd manama-next
ls src/app/page.tsx
# ✅ Should show the file

# 2. Docker can start
docker-compose up -d dev
# ✅ Should start container

# 3. App is accessible
curl http://localhost:3000
# ✅ Should show HTML

# 4. Files are same
echo "// TEST" >> src/test.js
docker-compose exec dev cat /app/src/test.js
# ✅ Should show "// TEST"

# 5. Hot reload works
# Edit src/app/page.tsx
# Check browser refreshes

# 6. Stop Docker
docker-compose down
# ✅ Your files still exist on your Mac!
```

**If all 6 tests pass = Everything is working correctly!**

## What Happens When You Switch Computers

**Computer A (Mac):**
```bash
# Work on code
docker-compose up dev
# Make changes
git add .
git commit -m "Added feature"
git push
docker-compose down
```

**Computer B (Windows laptop):**
```bash
git pull
# All your code is now on this computer!

docker-compose up dev
# Docker builds same environment
# Sees your code from git pull
# Works exactly the same!
```

Your code travels via **git**, not Docker!

## Key Takeaways

1. **Code storage**: Your Mac (via git)
2. **Code editing**: Your Mac (VS Code, Cursor, etc.)
3. **Code execution**: Docker container (Linux environment)
4. **Code synchronization**: git (between computers)
5. **Docker role**: Just the runtime environment

Docker is the "kitchen" where your code "cooks" - but the ingredients (code) live in your "pantry" (Mac filesystem).

## Still Confused?

Try this experiment:

```bash
# Start Docker
docker-compose up -d dev

# Delete a file on your Mac
rm src/test-file.js

# Check inside Docker
docker-compose exec dev ls /app/src/
# File is gone from Docker too!

# Why? Because they're the SAME files!
```

This proves Docker doesn't have a separate copy - it's looking at your Mac's files!
