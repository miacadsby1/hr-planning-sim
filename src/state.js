// src/state.js
import { employees as BASIC_EMPLOYEES } from './data/employees_basic.js';
import { employees as ADVANCED_EMPLOYEES } from './data/employees_advanced.js';
import { LEVEL_BY_TITLE } from './constants.js';

const STORAGE_KEY = 'hr-sim-state-v1';

// Seed employees for a given version
function seedEmployees(version = 'basic') {
  const src = version === 'advanced' ? ADVANCED_EMPLOYEES : BASIC_EMPLOYEES;

  return src.map(e => ({
    ...e,
    status: e.status || 'active',
    level: e.level || LEVEL_BY_TITLE(e.position)
  }));
}

// Base state for a new simulation
export function defaultState(version = 'basic') {
  return {
    round: 1,
    version,                   // 'basic' | 'advanced'
    employees: seedEmployees(version),
    ninebox: {},               // employeeId -> { perfBucket, potBucket }
    trainings: {},             // employeeId -> 'performance' | 'potential' | null
    applicants: [],
    history: []                // { round, score, left, hired, promoted, ... }
  };
}

// Load state from localStorage (or start fresh)
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();     // nothing saved yet

    const parsed = JSON.parse(raw);

    // sanity checks / defaults
    if (!parsed || !Array.isArray(parsed.employees)) {
      return defaultState();
    }

    if (parsed.version !== 'basic' && parsed.version !== 'advanced') {
      parsed.version = 'basic';
    }

    parsed.employees = parsed.employees.map(e => ({
      ...e,
      status: e.status || 'active',
      level: e.level || LEVEL_BY_TITLE(e.position)
    }));

    parsed.ninebox    = parsed.ninebox    || {};
    parsed.trainings  = parsed.trainings  || {};
    parsed.applicants = parsed.applicants || [];
    parsed.history    = parsed.history    || [];

    return parsed;
  } catch (err) {
    console.error('Failed to load state, starting new sim', err);
    return defaultState();
  }
}

// Save to localStorage
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state', err);
  }
}

// Reset to a fresh game (optionally in a specific version)
export function resetState(version = 'basic') {
  const s = defaultState(version);
  saveState(s);
  return s;
}