#!/bin/bash
set -e

echo "🚀 Installing TatT Skills..."

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed."
    exit 1
fi

# Check if skills.json exists
if [ ! -f "skills.json" ]; then
    echo "❌ skills.json not found"
    exit 1
fi

create_local_skill() {
  local target_dir="$1"
  local skill_name="$2"
  local skill_description="$3"

  mkdir -p "$target_dir/$skill_name"
  cat > "$target_dir/$skill_name/SKILL.md" << SKILL_EOF
---
name: $skill_name
description: $skill_description
metadata:
  short-description: $skill_description
---

# $skill_name

## Description
$skill_description

## Capabilities
- TODO: Define capabilities

## Usage Examples
~~~
TODO: Add usage examples
~~~

## Context
For use with the TatT project.
SKILL_EOF
}

# Parse and install each skill
jq -r '.skills[] | "\(.scope)|\(.repo)|\(.name)|\(.description)"' skills.json | while IFS='|' read -r scope repo name description; do
  
  # Determine installation directory
  if [ "$scope" = "global" ]; then
    DIR="$HOME/.claude/skills"
  else
    DIR=".claude/skills"
  fi
  
  mkdir -p "$DIR"
  
  echo ""
  echo "📦 Installing: $name"
  echo "   Description: $description"
  echo "   Location: $DIR/$name"
  
  # Handle local vs GitHub repos
  if [ "$repo" = "local" ]; then
    if [ ! -d "$DIR/$name" ]; then
      create_local_skill "$DIR" "$name" "$description"
      echo "   ✅ Created local skill"
    else
      echo "   ✅ Already exists"
    fi
  else
    if [ -d "$DIR/$name" ]; then
      echo "   ⚠️  Already exists - updating..."
      (cd "$DIR/$name" && git pull --ff-only --quiet) || echo "   ⚠️  Update failed"
    else
      git clone --quiet "https://github.com/$repo" "$DIR/$name" 2>/dev/null && \
      echo "   ✅ Installed from GitHub" || \
      (echo "   ❌ Failed to clone (creating local version instead)" && create_local_skill "$DIR" "$name" "$description")
    fi
  fi
  
done

echo ""
echo "✅ Skill installation complete!"
echo ""
echo "📍 Skills installed to:"
echo "   Project: .claude/skills/"
echo "   Global: ~/.claude/skills/"
