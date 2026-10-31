Team Git Workflow

This project is maintained by five developers using Claude Code and a shared GitHub repository.

1. Branch Awareness

- At the beginning of every task, check "git status", "git branch --show-current", "git branch -vv" and "git remote -v".
- Always detect and work on the currently active branch.
- Never assume a branch name or hardcode a developer's branch.
- Each developer works on their own feature branch.
- Never work directly on "main". Ask the developer to switch to a feature branch if necessary.

2. Automatic GitHub Sync

After completing every meaningful development task:

1. Review changes using "git status" and "git diff".
2. Run relevant tests.
3. Stage only relevant, safe files.
4. Create a descriptive commit.
5. Push to the current branch.
6. Verify that the push succeeded.

Use:

git add <relevant-files>
git commit -m "feat: describe changes"
git push

If the branch has no upstream:

git push -u origin HEAD

Do not claim changes are synced unless the push succeeds.

3. Full Project Push

If the developer explicitly requests a full project push or says "push everything":

- Review all tracked, modified, untracked and deleted files.
- Check ".gitignore".
- Exclude secrets, ".env" files, credentials, build artifacts and unnecessary files.
- Stage all safe, intended project changes using "git add -A".
- Review staged changes, commit and push to the current branch.

4. Team Collaboration

- Never overwrite or discard another developer's work.
- Avoid modifying files outside your assigned task.
- Coordinate changes to shared files, APIs, database schemas and configurations.
- Fetch remote updates before major synchronization.
- Preserve uncommitted changes.
- Resolve merge conflicts carefully; never blindly accept one side.
- Never force push, reset hard or rewrite shared Git history.

5. Main Branch & Pull Requests

- "main" is the stable integration branch.
- Never push directly to "main".
- Push completed features to their respective branches.
- Create Pull Requests targeting "main".
- Do not merge without the required review and checks.
- Incorporate "origin/main" into feature branches when necessary, after checking for conflicts.

6. Git Safety

- Never commit API keys, passwords, tokens or ".env" files.
- Never delete branches or overwrite remote history without explicit authorization.
- Do not commit unrelated changes belonging to other developers.
- If a push fails, diagnose and resolve safely. Never force it.

7. Final Report

After each task, briefly report:

- Changes implemented.
- Tests performed and results.
- Current branch.
- Commit hash and message.
- GitHub push status.

Core principle: Automatically commit and push meaningful completed work to the currently active feature branch, while protecting teammates' changes and keeping "main" stable.