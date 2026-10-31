# Team Git Workflow

This project is maintained by five developers using Claude Code and a shared GitHub repository. Everyone works directly on the `main` branch.

## 1. Repository Awareness
- At the beginning of every task, check:
  - `git status`
  - `git branch --show-current`
  - `git remote -v`
- Always work on `main`.
- If another branch is active, ask before switching.
- Never discard existing uncommitted changes.

## 2. Automatic GitHub Sync
After every meaningful completed development task:

1. Review changes using `git status` and `git diff`.
2. Run relevant tests.
3. Stage only relevant, safe files.
4. Commit with a descriptive message.
5. Push directly to `origin main`.
6. Verify that the push succeeded.

```bash
git add <relevant-files>
git commit -m "feat: describe changes"
git pull --rebase origin main
git push origin main
```

If conflicts occur, stop and resolve them carefully. Never overwrite teammates' work.

## 3. Full Project Push
If explicitly asked to "push everything":
- Review all tracked, modified, untracked and deleted files.
- Check `.gitignore`.
- Exclude secrets, `.env`, credentials and build artifacts.
- Stage all intended safe changes using `git add -A`.
- Review, commit and push to `origin main`.

## 4. Team Collaboration
- All five developers share `main`.
- Pull the latest changes before starting work and before pushing.
- Never overwrite or discard another developer's work.
- Avoid editing files outside your assigned task.
- Coordinate changes to shared files, APIs and database schemas.
- Preserve uncommitted changes.
- Resolve merge conflicts carefully; never blindly accept one side.
- Never force push, reset hard or rewrite shared Git history.

## 5. Git Safety
- Never commit API keys, passwords, tokens or `.env` files.
- Never force push.
- Never use destructive Git commands without explicit authorization.
- If a push fails, diagnose the issue and resolve it safely.
- If another developer's changes conflict with yours, stop and report the issue rather than overwriting their work.

## 6. Final Report
After each meaningful task, briefly report:
- Changes implemented.
- Tests performed and results.
- Current branch (`main`).
- Commit hash and message.
- GitHub push status.

**Core Principle:** Everyone works directly on `main`. Automatically commit and push meaningful completed work while protecting shared changes and maintaining repository stability.