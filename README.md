# HR Planning Exercise
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
