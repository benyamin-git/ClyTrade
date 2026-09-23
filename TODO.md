# TODO

Open ideas, known bugs and planned work for ClyTrade. This is a living list:
items are deleted as soon as they are implemented or fixed, so anything still
here is still open.

Maintained by the project owner. To report a bug or suggest a feature, please
use GitHub Issues or Discussions instead — see [CONTRIBUTING.md](./CONTRIBUTING.md).

- Add accent color customisation to themes.
- Add a toggle setting to include or not include fees in calculations for
  margin/risk/etc. For example: if a trade risks 1 USD and pays 0.5 USD in fees,
  is the risk 1 USD or 1.5 USD? The user should have the final say. Default
  should be 1.5 USD; the current version uses 1 USD.
- Every input field that can accept multiple units should let the user choose
  between them (currency or percentage for risk, fees and similar). Add a dozen
  or so currency options that are purely cosmetic. To save space, show units as
  `%` or the currency symbol, not long names.
- Add a dummy data collection for dev testing.
