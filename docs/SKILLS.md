# TatT Skills Configuration

This project uses a hybrid skill management approach:
- Local project skills live in `.claude/skills/`.
- Global skills live in `~/.claude/skills/`.

## Manual Commands

- **Install skills**: `npm run skills:install`
- **Update skills**: `npm run skills:update`
- **List skills**: `npm run skills:list`

## Skill Locations

- **Project skills**: `.claude/skills/` (specific to this project)
- **Global skills**: `~/.claude/skills/` (available to all projects)

## Adding New Skills

1. Edit `skills.json`
2. Add skill entry with name, repo, scope, and description
3. Run `npm run skills:install`

## Local Skills

If a skill repo does not exist on GitHub yet, the installer creates a local skill with a `SKILL.md` file. You can edit these files to add:
- Capabilities
- Usage examples
- Workflow notes specific to TatT

## Configured Skills

See `skills.json` for the complete list of skills used in the TatT project.

## Troubleshooting

If a GitHub skill fails to install:
- Verify the repository exists on GitHub
- Check your internet connection
- Ensure you have git installed
- Re-run `npm run skills:install`
