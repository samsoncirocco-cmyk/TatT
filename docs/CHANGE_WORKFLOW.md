# Complete Change Workflow Guide

This guide shows exactly how to ensure changes make it to all environments.

## The Three Environments

1. **Local (Your Mac)** - Where you edit code
2. **Docker (Container)** - Where you test code locally
3. **Vercel (Production)** - Where users see the app

## Daily Development Workflow

### Morning - Starting Work

```bash
# On any computer
cd manama-next

# Get latest changes (in case you worked from another computer)
git pull origin manama/next

# Start Docker
docker-compose up dev

# Open browser
# http://localhost:3000
```

### During Work - Making Changes

```bash
# 1. Edit files normally (VS Code, Cursor, etc.)
#    Docker sees changes INSTANTLY (no action needed)

# 2. Test in browser
#    localhost:3000 auto-refreshes within 1-2 seconds

# 3. Repeat: Edit → Save → Check browser
```

**Key Point:** As long as Docker is running, you see changes immediately!

### End of Session - Saving Changes

```bash
# 1. Check what you changed
git status

# 2. Add all changes (or specific files)
git add .

# 3. Commit with descriptive message
git commit -m "feat: add artist profile page"
#              ↑
#              Use: feat/fix/docs/refactor/test

# 4. Push to GitHub
git push origin manama/next

# 5. Stop Docker (optional - can leave running)
docker-compose down
```

**Result After Push:**
- ✅ Changes saved to GitHub
- ✅ Vercel automatically builds & deploys (1-2 min)
- ✅ Other computers can pull changes
- ✅ https://manama-next.vercel.app/ updates

### Next Day - Different Computer

```bash
# On your laptop/different computer
cd manama-next

# Get yesterday's changes
git pull origin manama/next

# Start Docker (picks up new code automatically)
docker-compose up dev

# Continue working...
```

## Verification Checklist

After making a change, verify it reached all environments:

### ✅ Local (Your Mac)
```bash
# Check file was saved
cat src/app/page.tsx | grep "your new code"

# Should see your changes
```

### ✅ Docker (Container)
```bash
# Check Docker sees it
docker-compose exec dev cat /app/src/app/page.tsx | grep "your new code"

# Should match your local file

# OR just check browser
# localhost:3000 should show your changes
```

### ✅ Git (Source Control)
```bash
# Check commit history
git log --oneline -5

# Should see your commit at the top

# Check remote (GitHub)
git log origin/manama/next --oneline -5

# Should match after git push
```

### ✅ Vercel (Production)
```bash
# Check deployment status
# Visit: https://vercel.com/your-account/manama-next

# OR just test the live app
# https://manama-next.vercel.app/

# Should show your changes within 2-3 minutes after git push
```

## Common Scenarios

### Scenario 1: Change Not Showing in Browser

**Symptom:** You edited code but localhost:3000 doesn't update

**Check:**
```bash
# 1. Is Docker running?
docker-compose ps

# 2. Are you editing the right file?
# Make sure you're in manama-next/ not manama/

# 3. Force refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 4. Restart Docker
docker-compose restart dev
```

### Scenario 2: Change Not on Second Computer

**Symptom:** You pushed changes but other computer doesn't have them

**Fix:**
```bash
# On second computer

# 1. Make sure you're on right branch
git branch --show-current
# Should show: manama/next

# 2. Pull changes
git pull origin manama/next

# 3. Restart Docker to pick up changes
docker-compose restart dev
```

### Scenario 3: Change Not on Vercel

**Symptom:** You pushed but Vercel doesn't show changes

**Check:**
```bash
# 1. Did push succeed?
git log origin/manama/next --oneline -1
# Should show your latest commit

# 2. Check Vercel dashboard
# https://vercel.com/

# 3. Check build logs for errors

# 4. Wait 2-3 minutes (build takes time)
```

## Emergency: "I Lost My Changes!"

**Don't panic - Git saves everything**

```bash
# See all commits (even if you think they're lost)
git reflog

# See uncommitted changes
git status

# Recover uncommitted changes
git stash list

# If you committed but didn't push
git log --all

# Restore from any point
git checkout <commit-hash>
```

## Quick Reference Commands

```bash
# Daily workflow
git pull origin manama/next          # Get latest
docker-compose up dev                 # Start Docker
# ... make changes ...
git add .                             # Stage changes
git commit -m "feat: description"     # Save locally
git push origin manama/next           # Send to GitHub
docker-compose down                   # Stop Docker

# Verification
git status                            # What changed?
git diff                              # Show changes
git log --oneline -5                  # Recent commits
docker-compose ps                     # Is Docker running?
docker-compose logs -f dev            # Watch Docker logs

# Troubleshooting
docker-compose restart dev            # Restart container
docker-compose down -v                # Nuclear restart
git pull --rebase origin manama/next  # Sync if conflicts
```

## File Change Flow Diagram

```
Edit File (VS Code)
      ↓ [Save]
File on Mac Disk
      ↓ [Volume Mount - INSTANT]
File in Docker Container
      ↓ [Hot Reload - 1-2s]
Browser Update (localhost:3000)
      ↓ [git commit]
Local Git Repository
      ↓ [git push]
GitHub Remote Repository
      ↓ [Vercel Auto-Deploy - 1-2min]
Production (manama-next.vercel.app)
      ↓ [git pull on Computer B]
Second Computer
      ↓ [docker-compose up dev]
Browser Update (localhost:3000 on Computer B)
```

## Pro Tips

### Tip 1: Commit Often
```bash
# Good: Small, focused commits
git commit -m "feat: add header component"
git commit -m "fix: layout spacing"
git commit -m "docs: update README"

# Bad: One giant commit
git commit -m "worked on stuff"
```

### Tip 2: Push Before Switching Computers
```bash
# Always push before leaving one computer
git push origin manama/next

# Prevents "I forgot to push" issues
```

### Tip 3: Pull Before Starting Work
```bash
# Always pull when starting on a computer
git pull origin manama/next

# Prevents conflicts and ensures you have latest
```

### Tip 4: Use Git Status
```bash
# Check before committing
git status

# Shows exactly what will be committed
```

### Tip 5: Test Locally Before Pushing
```bash
# Make sure it works in Docker before pushing
# localhost:3000 should work perfectly

# Then push to deploy to Vercel
git push origin manama/next
```

## Still Confused?

Run this test to see the entire flow:

```bash
# 1. Create test file
echo "Test at $(date)" > TEST_$(date +%s).txt

# 2. Check Docker sees it
docker-compose exec dev ls -la /app/TEST_*.txt

# 3. Commit and push
git add TEST_*.txt
git commit -m "test: verification file"
git push origin manama/next

# 4. Check on second computer (if available)
# On Computer B:
# git pull origin manama/next
# ls TEST_*.txt

# 5. Check Vercel deployed
# Visit: https://manama-next.vercel.app/
# Check deployment time matches your push
```

If all 5 steps work, your workflow is perfect! ✅

---

**Last Updated:** January 25, 2026
**Questions?** Check the troubleshooting section above or ask the team.
