# AI Usage

## The short version

Large parts of ClyTrade are written with AI assistance. The code is reviewed,
tested and verified like any other work — but if AI-assisted software is a
dealbreaker for you, this project is probably not for you, and that is fine.

## What that means in practice

- **The math is protected.** Every calculation lives in its own pure module with
  a documented formula and a table-driven test suite of known values.
- **Every change is verified.** Type checking, linting and the full test suite
  run before a change is considered done.
- **Decisions are human.** Product direction, opinionated defaults and the
  reasoning behind them are made by the maintainer, not generated.

## Why be upfront about it

Trust requires transparency. You are trusting this app with your trading records
and your numbers, so you deserve to know how it is built.

If you find a calculation that is wrong, a test that is missing, or a claim in
this documentation that does not match the code, please open an issue — that is
exactly the kind of report that matters most here.
