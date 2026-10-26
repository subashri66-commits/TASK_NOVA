# TaskNova — Todo & Productivity App

A responsive college mini-project built with **HTML, CSS and vanilla JavaScript**. It runs entirely in the browser and stores data in LocalStorage; no backend or API key is required.

## Features

- Create, edit, complete and delete tasks
- Task priority, category, description, due date and due time
- Dashboard metrics and today's progress
- Search, category filtering, priority filtering and sorting
- Today, Upcoming and All Tasks views
- Calendar with task indicators and selected-day task list
- Habit tracker with daily check-ins and streaks
- Pomodoro-style focus timer with 25-minute, 5-minute and 15-minute modes
- Dark/light theme
- Export and import JSON backups
- Responsive layout for desktop, tablet and mobile
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` to focus search

## Project structure

```text
TaskNova/
├── index.html      # App screens and accessible form markup
├── styles.css      # Theme, layout, responsive styles and animations
├── app.js          # State, LocalStorage, CRUD, calendar, habits, timer
└── README.md       # Setup, testing and deployment instructions
```

## Run locally

1. Download and extract `TaskNova.zip`.
2. Open the `TaskNova` folder.
3. Double-click `index.html` to run in a modern browser.

Recommended for development: open the folder in VS Code and use the **Live Server** extension, then click **Go Live**. No package installation is needed.

## Data and storage

- Data key: `tasknova.v1`
- Data remains in the browser profile that created it.
- Clearing browser storage removes the saved app data. Use Settings → Export JSON to make a backup.
- This is a frontend-only mini project: it does not provide accounts, multi-device sync, or server-side backups.

## Deploy with GitHub Pages

1. Create a public GitHub repository, e.g. `tasknova-todo`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. Open the displayed URL and test it in a private/incognito window.

Alternative: drag the project folder into a new Netlify manual deploy.

## Testing checklist

- [ ] Create a task with title, priority, category and due date
- [ ] Edit the task and verify changes persist after refresh
- [ ] Complete and un-complete a task
- [ ] Delete a task and confirm the confirmation dialog
- [ ] Search for a task by title and description
- [ ] Try category, status and priority filters together
- [ ] Navigate calendar months and select a date
- [ ] Add a habit, mark it done, then unmark it
- [ ] Start, pause, reset and switch timer modes
- [ ] Export a JSON backup, reset data, then import the backup
- [ ] Switch theme and refresh
- [ ] Test at mobile width and keyboard navigation
- [ ] Open DevTools Console and verify no errors

## Security and limitations

- Task text is rendered with HTML escaping; user content is not intentionally inserted as raw markup.
- Browser storage is not encrypted. Do not store passwords, secrets, or highly sensitive data in tasks.
- Imported JSON is validated at a basic structural level and normalized before use; only import backups you trust.
- Browser notifications are not required for core functionality. The app does not send remote notifications.
- LocalStorage is browser/device-specific and has limited capacity.
- The focus timer runs while the page is open; browsers may throttle timers in background tabs.
- A production multi-user app should use authentication, server-side authorization, a database, input validation on the server, and a clear privacy policy.

## Suggested viva explanation

**Problem:** People can forget tasks and struggle to see their progress.

**Solution:** TaskNova organizes tasks by priority, category and date, and combines a dashboard, calendar, habits and focus timer.

**Technical concepts demonstrated:** DOM manipulation, event delegation, form validation, arrays and objects, JSON serialization, LocalStorage persistence, date handling, CSS Grid/Flexbox, responsive design, and client-side import/export.

**Future enhancements:** User login and cloud sync, recurring tasks, drag-and-drop ordering, service-worker offline support, notifications with user consent, and optional AI task breakdown.
