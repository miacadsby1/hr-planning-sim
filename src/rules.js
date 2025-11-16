// src/rules.js
import { POSITION_WEIGHTS } from './constants.js';

const clamp = (v, lo = 1.0, hi = 5.0) => Math.max(lo, Math.min(hi, v));

/** Deterministic small delta based on employee id and round. No randomness. */
export function deterministicDelta(empId, round, kind) {
  const base = empId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  // Treat any 'perf*' as perf and any 'pot*' as pot
  const isPerf = String(kind).startsWith('perf');
  const kindFactor = isPerf ? 7 : 11;

  const raw = Math.sin((base + round * kindFactor) * 0.137) * 0.35; // ~[-0.35, +0.35]
  return Math.max(-0.5, Math.min(0.5, raw));
}

export function applyTrainingBoost(score, trainingType) {
  if (!trainingType) return score;
  // 0.5–1.0 boost with diminishing returns near 5.0
  const boost = 0.7;
  const scaled = score + boost * (1 - (score - 1) / 4);
  return clamp(scaled);
}

function levelOf(title = '') {
  if (title.includes('CEO')) return 'CEO';
  if (title.includes('VP')) return 'VP';
  if (title.includes('Director')) return 'Director';
  if (title.includes('Manager')) return 'Manager';
  return 'Specialist';
}

/* ============================================================
   Helpers for BASIC vs ADVANCED rating structures
   ============================================================ */

const ADV_PERF_KEYS = ['perf1', 'perf2', 'perf3'];
const ADV_POT_KEYS  = ['pot1', 'pot2', 'pot3'];

function hasAdvancedRatings(e) {
  // We only require performance dimensions; potentials are optional
  return ADV_PERF_KEYS.every(k => typeof e[k] === 'number');
}

function averageOf(keys, obj, fallback) {
  const vals = keys
    .map(k => obj[k])
    .filter(v => typeof v === 'number');
  if (!vals.length) return fallback;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}

/** Effective 1D performance score for scoring/turnover, given version + employee */
function effectivePerformance(e, version) {
  if (version === 'advanced' && hasAdvancedRatings(e)) {
    return averageOf(
      ADV_PERF_KEYS,
      e,
      typeof e.performance === 'number' ? e.performance : 0
    );
  }
  return typeof e.performance === 'number' ? e.performance : 0;
}

/* ============================================================
   Rating update logic (per employee, per year)
   ============================================================ */

/** Keep a rolling history array (max 3 entries) */
function pushHistory(arr, value) {
  const next = Array.isArray(arr) ? arr.slice() : [];
  next.push(value);
  while (next.length > 3) next.shift();
  return next;
}

/** Basic: single performance + potential fields, plus history */
function updateRatingsBasic(e, round, trainingChoice) {
  const perfDelta = deterministicDelta(e.id, round, 'perf');
  const potDelta  = deterministicDelta(e.id, round, 'pot');

  let perf = clamp(e.performance + perfDelta);
  let pot  = clamp(e.potential  + potDelta);

  if (trainingChoice === 'performance') perf = applyTrainingBoost(perf, 'performance');
  if (trainingChoice === 'potential')  pot  = applyTrainingBoost(pot,  'potential');

  const perfHistory = pushHistory(e._perfHistory, perf);
  const potHistory  = pushHistory(e._potHistory,  pot);

  return {
    ...e,
    performance:  perf,
    potential:    pot,
    _perfHistory: perfHistory,
    _potHistory:  potHistory
  };
}

/** Advanced: three performance + three potential dimensions.
 *  Also keeps e.performance / e.potential as the averages so existing UI keeps working,
 *  and updates history based on the aggregated values.
 */
function updateRatingsAdvanced(e, round, trainingChoice) {
  let next = { ...e };

  // If the data file doesn't actually have advanced fields yet,
  // fall back to basic behavior so Advanced mode still works.
  if (!hasAdvancedRatings(next)) {
    return updateRatingsBasic(next, round, trainingChoice);
  }

  // 1) Update each perf/pot dimension deterministically
  ADV_PERF_KEYS.forEach((key) => {
    const delta   = deterministicDelta(e.id, round, key);
    const current = typeof e[key] === 'number' ? e[key] : e.performance ?? 3.0;
    next[key] = clamp(current + delta);
  });

  ADV_POT_KEYS.forEach((key) => {
    const delta   = deterministicDelta(e.id, round, key);
    const current = typeof e[key] === 'number' ? e[key] : e.potential ?? 3.0;
    next[key] = clamp(current + delta);
  });

  // 2) Apply training boosts per dimension
  if (trainingChoice === 'performance') {
    ADV_PERF_KEYS.forEach((key) => {
      next[key] = applyTrainingBoost(next[key], 'performance');
    });
  }
  if (trainingChoice === 'potential') {
    ADV_POT_KEYS.forEach((key) => {
      next[key] = applyTrainingBoost(next[key], 'potential');
    });
  }

  // 3) Keep 1D aggregates in sync for the rest of the app
  const perfAvg = averageOf(ADV_PERF_KEYS, next, e.performance ?? 3.0);
  const potAvg  = averageOf(ADV_POT_KEYS,  next, e.potential  ?? 3.0);

  const perf = clamp(perfAvg);
  const pot  = clamp(potAvg);

  // 4) Update history from the aggregated values
  const perfHistory = pushHistory(e._perfHistory, perf);
  const potHistory  = pushHistory(e._potHistory,  pot);

  return {
    ...next,
    performance:  perf,
    potential:    pot,
    _perfHistory: perfHistory,
    _potHistory:  potHistory
  };
}

/** Version-aware wrapper */
function updateRatings(e, round, trainingChoice, version) {
  if (version === 'advanced') {
    return updateRatingsAdvanced(e, round, trainingChoice);
  }
  return updateRatingsBasic(e, round, trainingChoice);
}

/* ============================================================
   Turnover & low-performance strikes
   (same rules for both versions, using effectivePerformance)
   ============================================================ */

/** Deterministic turnover rules */
function applyTurnover(e, round) {
  if (e.status !== 'active') return e;

  const info = (e.info || '').toLowerCase();

  // Retirements: leave at end of Round 1 if flagged
  if (info.includes('retiring') || info.includes('retire')) {
    if (round >= 1) return { ...e, status: 'retired' };
  }

  // Quits: external opportunities leave at end of Round 1
  if (info.includes('external opportunities')) {
    if (round >= 1) return { ...e, status: 'quit' };
  }

  // Firings: consistently very low performance (<= 2.5) for two consecutive rounds
  if (e._lowPerfStrikes && e._lowPerfStrikes >= 2) {
    return { ...e, status: 'fired' };
  }

  return e;
}

/** Track “strikes” for very low performance to enable deterministic firings */
function updateLowPerfStrikes(e, version) {
  const perf = effectivePerformance(e, version);
  const low = perf <= 2.5 ? 1 : 0;
  const strikes = (e._lowPerfStrikes || 0) + low;
  return { ...e, _lowPerfStrikes: strikes };
}

/* ============================================================
   Applicant generation
   (still Basic-style for now; can be extended for full advanced data)
   ============================================================ */

function generateApplicantsForOpenRoles(openTitles) {
  const pool = [
    {
      id: 'A01',
      name: 'Chris P. Jones',
      position: 'VP, Department B',
      performance: 3.5,
      potential: 4.2,
      notes: 'Strong leadership potential'
    },
    {
      id: 'A02',
      name: 'Dana M. Smith',
      position: 'Manager, Unit A2.1',
      performance: 4.5,
      potential: 3.0,
      notes: 'Experienced, but limited growth'
    },
    {
      id: 'A03',
      name: 'Evan R. White',
      position: 'VP, Department D',
      performance: 2.5,
      potential: 3.5,
      notes: 'Entry-level, high learning agility'
    },
    {
      id: 'A04',
      name: 'Grace T. Brown',
      position: 'Specialist C1.1.2',
      performance: 4.0,
      potential: 4.0,
      notes: 'Well-rounded, good fit for many roles'
    },
  ];

  const set = new Set(openTitles);
  return pool.filter(a => set.has(a.position));
}

/* ============================================================
   Scoring (Basic + Advanced)
   ============================================================ */

/** Compute weighted score across active employees.
 *  Basic: uses 1D performance.
 *  Advanced: uses the average of perf1/2/3 when available.
 */
export function score(state) {
  if (!state) return 0;
  const { employees = [], version = 'basic' } = state;

  let total = 0;
  let denom = 0;

  for (const e of employees) {
    if (e.status !== 'active') continue;

    const weight = POSITION_WEIGHTS[levelOf(e.position)] ?? 1.0;
    const perf   = effectivePerformance(e, version);

    total  += perf * weight;
    denom  += weight;
  }

  return denom ? +(total / denom).toFixed(3) : 0;
}

/* ============================================================
   Advance exactly one year (one round), deterministically
   ============================================================ */

export function advanceOneYear(state) {
  const round   = state.round;
  const version = state.version || 'basic';

  // 1) Update ratings deterministically + training boosts + history
  let employees = state.employees.map(e =>
    e.status === 'active'
      ? updateLowPerfStrikes(
          updateRatings(e, round, (state.trainings || {})[e.id], version),
          version
        )
      : e
  );

  // --- Optional DEBUG: show training effect before turnover ---
  if (
    typeof window !== 'undefined' &&
    window.console &&
    state.trainings &&
    Object.keys(state.trainings).length
  ) {
    console.group(`Training debug — end of updates, round ${round}`);
    for (const [id, choice] of Object.entries(state.trainings)) {
      const before = state.employees.find(x => x.id === id);
      const after  = employees.find(x => x.id === id);
      if (before && after) {
        console.log(
          `${before.name} (${id})`,
          `choice=${choice}`,
          `perf: ${before.performance.toFixed(2)} → ${after.performance.toFixed(2)}`,
          `pot: ${before.potential.toFixed(2)} → ${after.potential.toFixed(2)}`
        );
      } else {
        console.log(`${id} was not found among active employees when applying training.`);
      }
    }
    console.groupEnd();
  }
  // --- end DEBUG ---

  // 2) Apply turnover at end of the year (same rules for both versions)
  employees = employees.map(e => applyTurnover(e, round));

  // 3) Determine open roles (positions held by non-active employees)
  const openPositions = employees
    .filter(e => e.status !== 'active')
    .map(e => e.position);

  // 4) Build applicant pool ONLY for open roles
  const applicants = generateApplicantsForOpenRoles(openPositions);

  // 5) Append round summary (score will be filled after we compute it)
  const roundSummary = {
    round,
    openPositions,
    left: employees
      .filter(e => ['retired', 'quit', 'fired'].includes(e.status))
      .map(e => ({ id: e.id, name: e.name, reason: e.status })),
    score: null
  };

  // 6) Advance state; reset trainings for the new round
  const next = {
    ...state,
    round: round + 1,
    employees,
    applicants,
    trainings: {}, // reset per spec (new choices each round)
    history: [...state.history, roundSummary]
  };

  // 7) Compute score after turnover, store on the summary
  const s = score(next);
  next.history[next.history.length - 1].score = s;

  return next;
}
