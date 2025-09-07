# HR Planning Exercise — Starter Kit

A minimal, **deterministic** browser app scaffold for the talent management simulation.
No build tools — just open in any static host (e.g., StackBlitz, GitHub Pages, Netlify) and extend.

## Quick start (no installs)

1. Go to https://stackblitz.com/.
2. Click **"Create New" → "Static HTML"**.
3. Drag the entire contents of this ZIP into the StackBlitz file tree (or use **Upload**).
4. The app should run instantly on the right pane.

Alternatively, upload the folder to **Replit** (HTML/CSS/JS) or host the files on GitHub and enable **GitHub Pages**.

## Project structure

```
/index.html           # App layout
/styles.css           # Simple styles
/src/constants.js     # Nine-box labels, position weights
/src/data/employees_basic.js  # Round-1 employee data (Basic version)
/src/state.js         # App state + localStorage persistence
/src/rules.js         # Deterministic updates, turnover, scoring
/src/ui/*.js          # Tiny "views": table, nine-box, org chart, applicants
/src/main.js          # Wire everything together
```

## What works now

- Round progression with **deterministic** performance/potential changes.
- Non-dismissible warning shown before your **first decision** each round.
- Employee table with per-employee **training selection**.
- Nine-box **bucket assignment** via selects (swap for drag-and-drop later).
- Turnover rules for **retire**/**quit**/**fire** (simple, deterministic).
- Vacancies auto-populate a small **applicant pool**.
- **Score** computed per weighted positions (CEO=5, VP=4, Director=3, Manager=2, Specialist=1).

## What to add next

- Drag-and-drop nine-box UX.
- Real org chart visualization.
- Advanced version: 3× performance & potential dimensions.
- Replacement chart and promotion flows (fill vacancies internally).
- Better applicant generation limited to **current vacancies** only.
- Instructor view & export of final scores.

## Saving your work

All changes save to **localStorage** in the browser. In StackBlitz/Replit, sign in to save across devices and push to GitHub.
You can also **Download** your project as a ZIP any time.

## License

Do whatever you want. This is a teaching scaffold.
