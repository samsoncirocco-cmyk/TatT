#!/bin/bash
set -e

echo "🔄 Updating TatT Skills..."

update_dir() {
  local base_dir="$1"
  local label="$2"

  if [ -d "$base_dir" ]; then
    echo "Updating $label skills..."
    find "$base_dir" -type d -maxdepth 1 -mindepth 1 | while read -r skill_dir; do
      if [ -d "$skill_dir/.git" ]; then
        echo "  Updating $(basename "$skill_dir")..."
        (cd "$skill_dir" && git pull --ff-only --quiet) || echo "  ⚠️  Update failed"
      else
        echo "  Skipping $(basename "$skill_dir") (local skill)"
      fi
    done
  fi
}

update_dir ".claude/skills" "project"
update_dir "$HOME/.claude/skills" "global"

echo "✅ Skills updated!"
