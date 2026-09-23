# Calculations

Pure calculation modules for ClyTrade.

## Protection rule

**These files must not be modified by any AI agent without explicit permission
from the project owner.** See `masterplan.md` §5.

## Rules

1. Pure functions only: no React, no DOM, no database, no network, no side effects.
2. Never throw on invalid input — return `null` and let the UI show a placeholder.
3. Every module documents its formulas and assumptions in a JSDoc block.
4. Every module ships with a colocated `*.test.ts` covering known values and
   invalid inputs.
5. Keep functions independent of each other; compose in the UI or in feature
   logic, not here.
