# New Media Team Hermes

This fork keeps the upstream Hermes Agent core intact and adds a thin product layer for new media teams. The first milestone is a working WSL2-based Web dashboard. Team-specific workflows should be added as skills or plugins before changing the agent core.

## Positioning

- Keep the upstream `hermes` command, package name, config layout, and update path.
- Use WSL2 as the primary Windows runtime for the Web dashboard, especially the chat terminal pane that depends on POSIX PTY behavior.
- Add new media workflows incrementally through `skills/` and `plugins/`.
- Treat desktop packaging as a later productization phase after the Web baseline and workflows are stable.

## WSL2 Web Baseline

From Windows, the project lives at:

```powershell
F:\hermes-claw
```

From WSL2, use the mounted path:

```bash
cd /mnt/f/hermes-claw
export PATH="$HOME/.local/bin:$PATH"
uv venv --python 3.12 .venv
uv pip install -e ".[web,dev,pty]"
```

The Web frontend currently needs Node 20+. If WSL2 provides Node 18, install a user-local Node 22 or use `nvm` before building the frontend. This workspace was verified with Node 22.22.2 installed under `~/.local/node`:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd /mnt/f/hermes-claw/web
npm ci --include=optional
npm run build
```

Start the dashboard backend:

```bash
cd /mnt/f/hermes-claw
source .venv/bin/activate
python -m hermes_cli.main dashboard --no-open
```

For frontend development with hot reload, start a second WSL2 shell:

```bash
cd /mnt/f/hermes-claw/web
npm run dev
```

The Vite dev server proxies API calls to the Hermes backend on `127.0.0.1:9119`.

## Upstream Sync

This workspace tracks NousResearch as `upstream`:

```bash
git remote -v
git fetch upstream
git merge upstream/main
```

Add your own fork as `origin` when it exists:

```bash
git remote add origin <your-fork-url>
git push -u origin main
```

The `upstream` push URL should remain disabled to avoid accidental pushes to the source project.

## First New Media Workflows

Use `skills/social-media/new-media-team/SKILL.md` as the first team-facing workflow entrypoint. Initial workflows:

- topic discovery and editorial angle selection
- short video script and storyboard drafting
- multi-platform copy adaptation
- publish checklist generation
- daily or weekly content performance review

Only add a dedicated Web page after these workflows are stable enough to justify a visual workspace.
