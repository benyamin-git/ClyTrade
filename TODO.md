# TODO

Open ideas, known bugs and planned work for ClyTrade. This is a living list:
items are deleted as soon as they are implemented or fixed, so anything still
here is still open.

Maintained by the project owner. To report a bug or suggest a feature, please
use GitHub Issues or Discussions instead — see [CONTRIBUTING.md](./CONTRIBUTING.md).

- Include the theme and accent choice in backups. They live in localStorage, so
  they are not part of the backup file and do not follow a restore to another
  device.
- Remember the per-field unit choice (percent or currency) between visits. The
  toggles currently reset to percent whenever a calculator is reopened.
