# AI Usage

## The short version

ClyTrade is written almost entirely by AI. The maintainer directs the work,
makes the product decisions, reviews every change and runs the tests — but the
code, styles, tests and documentation you see here are AI-generated.

If AI-written software is a dealbreaker for you, this project is probably not
for you, and that is completely fine.

## What that means in practice

- **The math is protected.** Every calculation lives in its own pure module with
  a documented formula and a table-driven test suite of known values, so the
  numbers can be checked independently of how they were written.
- **Every change is verified.** Type checking, linting and the full test suite
  run before a change is considered done.
- **Decisions are human.** Product direction, opinionated defaults and the
  reasoning behind them are made by the maintainer, not generated.
- **AI makes mistakes.** Generated code can be confidently wrong. That is
  exactly why the calculation layer is small, pure and heavily tested.

## Why be upfront about it

Trust requires transparency. You are trusting this app with your trading records
and your numbers, so you deserve to know how it is built.

If you find a calculation that is wrong, a test that is missing, or a claim in
this documentation that does not match the code, please open an issue — that is
exactly the kind of report that matters most here.
