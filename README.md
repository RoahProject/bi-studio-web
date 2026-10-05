# BI Studio — private JSON workspace

Public website source for `RoahProject/bi-studio-web`. Project details and document content are saved only in `RoahProject/bi-studio`, a separate PRIVATE repository, at `data/workspace.json` on `main`.

## Publish
1. Upload this folder's contents to the public `bi-studio-web` repository. The `docs` folder contains the prebuilt website.
2. In the public repository, open Settings > Pages and choose Deploy from a branch, branch main, folder /docs, and Save.
3. Push to main. GitHub Pages publishes `https://roahproject.github.io/bi-studio-web/`.
4. Enter your fine-grained token in the website: resource owner RoahProject, selected repository bi-studio, Contents read and write. Do not commit or share the token.

The private data repository must already exist with a main branch and at least one commit. Your original BI Studio source repository satisfies this requirement. The first saved project creates `data/workspace.json`; no database setup is needed.

## Local run
Install Node.js 22 or newer. In this folder run `npm install`, then `npm run dev`. Build using `npm run build`, then commit the updated docs folder. No build dependencies are required to publish the included prebuilt version.

## Behavior
- Default tasks, subtasks, milestones, priorities, progress, project search, stages, and deadlines.
- Summary: Total Projects, Not Yet Started, In Progress, Completed, Overdue. A project is not yet started when no task/subtask or milestone is completed; Deployed projects count as completed. Overdue overlaps either unfinished status.
- JSON saves commit directly to the private data repository. No database, paid API, or Supabase dependency.
- Token is held only in page memory; a refresh or new device requires re-entry. No passwords or token are cached.
- Workspace is cached in IndexedDB, including documents. While signed in, interrupted network saves stay in the browser and retry on focus, reconnect, or the next check (every 60 seconds). Opening a new session requires an online token check.
- A stale GitHub SHA prevents silent overwrite from another device. Export your local backup before choosing Reload GitHub to discard a conflicting local copy.
- Export/Import Backup includes project details AND encoded documents. Import replaces the entire workspace after confirmation.
- Sign out clears the local browser copy. Unsynced edits require confirmation before removal. Do not clear browser storage before exporting unsynced data.
- PDF/DOCX/TXT/MD up to 5 MB each, 5 files per project, total JSON up to 20 MB. Git commits retain file history, so repeated document changes grow the repository. Avoid sensitive company data unless your company permits this storage location.
- Deletes remove data from the current JSON but do not erase Git history.
- Sync is polling, not simultaneous collaborative editing. Heavy use may hit GitHub API limits.
- Do not add project backups, requirements, or credentials to this public repository. The public site contains code and generic UI only.

## Verification
Production build and local mocked API tests can validate persistence/conflict handling; live private repository writes and deployment require your token and account, which are intentionally not provided to the assistant.

## Executive View
The website opens in Executive View. Five cards count individual projects: Total Projects, Not Yet Started, In Progress, Completed, Overdue. Project Workspace retains detailed cards, tasks, subtasks, requirements, milestones, and editing.

The Executive table has one row per department: Department | Scope | Start | Finish | Status (RAG). Scope displays up to two brief project scopes and a count of additional initiatives; it does not list all project details. Start is the earliest known project start, Finish the latest known planned finish. A department is Red if any unfinished project is overdue; Amber if unfinished work has not started, has no valid finish, or finishes within seven days; otherwise Green. Completed departments are Green. Overdue is also included in either Not Yet Started or In Progress.

New/edit project forms include Department (text), Start Date, Scope, and Finish Date (the existing due date). Existing JSON remains compatible; old projects show Unassigned and no start date until edited. No migration or replacement of private data is required.

Export Excel downloads a real XLSX file with Executive Summary and Department Portfolio worksheets, date formatting, RAG colors, frozen headers, and filters. It excludes tasks, subtasks, uploaded documents, tokens, and detailed project listings.

Executive View is a presentation view, not a separate permission role. For a read-only executive, provision their own GitHub token limited to Contents read for the private data repository. Never share your read/write token.
