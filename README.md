# Process Blocks

Step-by-step process blocks for WordPress, in the style of Apple's developer tutorials and iFixit guides. Useful for runbooks, checklists, and how-to guides you work through repeatedly.

[![Try it in WordPress Playground](https://img.shields.io/badge/Try%20it-WordPress%20Playground-3858e9?logo=wordpress)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/humanmade/process-blocks/main/blueprint.json)

## Blocks

| Block | Name | Contains |
| --- | --- | --- |
| Process | `process-blocks/process` | Steps, **or** sections |
| Process Section | `process-blocks/section` | Steps |
| Process Step | `process-blocks/step` | Any blocks |

A process is either `process → [ step, step, … ]` or `process → [ section → [ step, … ], section → [ step, … ] ]`. The editor enforces one or the other; the **Group steps into a section** button in the process's sidebar converts a flat process to a sectioned one.

## Frontend

- **Summary checklist** at the top of the process, showing progress and a **Reset** button. It can be turned off per block.
- **Sticky bar**, linked to scroll position: it shows the step you're reading, which is also highlighted. **Mark as complete** checks that step off and scrolls to the next incomplete step. Once a step is complete, the bar shows **Completed** with an **Undo** link.
- **Current step link** in the bar's second row. When you've scrolled away from the current (first incomplete) step, **Back to step N** / **Jump to step N** takes you back to it. **Start again** appears there once every step is done.
- **Check buttons** on each step, for completing steps out of order.

The bar keeps a constant height as its contents change, so the page doesn't shift while scrolling.

Progress is saved to `localStorage`, keyed by post, process, and a hash of the step titles, so any edit to the steps discards stale progress.

The frontend uses the [Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/). Derived state is mirrored in PHP (`register_state()` in `inc/namespace.php`), so the server render matches the client before saved progress loads.

### Theming

Styles are minimal and inherit from the theme. Buttons use the theme's `.wp-element-button` styles; colours derive from `currentColor` and presets. Override these custom properties on `.wp-block-process-blocks-process` to customise:

| Property | Default |
| --- | --- |
| `--process-blocks--accent` | `var(--wp--preset--color--primary, currentcolor)` |
| `--process-blocks--surface` (sticky bar background) | `var(--wp--preset--color--base, canvas)` |
| `--process-blocks--border` | `currentcolor` at 15% |
| `--process-blocks--muted` (summary background) | `currentcolor` at 4% |
| `--process-blocks--radius` | `0.5rem` |
| `--process-blocks--gap` | `var(--wp--style--block-gap, 1.5rem)` |

## Development

Requires Node 22 (see `.nvmrc`), Composer, and Docker (for wp-env).

```sh
npm install
composer install
npm run dev
```

`npm run dev` builds the plugin and starts [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) at http://localhost:8888 (log in with `admin` / `password`). Demo pages are created on start:

- http://localhost:8888/process-demo/ (sections)
- http://localhost:8888/process-demo-simple/ (flat steps)

Use `npm start` to rebuild on changes, and `npm run env:stop` to stop.

### Without Docker

```sh
npm run playground
```

This builds the plugin and runs it in [WordPress Playground](https://wordpress.github.io/wordpress-playground/) locally, with the same demo content, at http://127.0.0.1:9400.

### Linting

Follows the [Human Made coding standards](https://engineering.hmn.md/standards/).

```sh
npm run lint      # All
npm run lint:js   # ESLint (@humanmade/eslint-config)
npm run lint:css  # Stylelint (@humanmade/stylelint-config)
npm run lint:php  # PHPCS (humanmade/coding-standards)
```

### Playground link

The Playground link above installs the plugin from the `release` branch, which CI builds and publishes on every push to `main` (see `.github/workflows/ci.yml`). If the repository lives somewhere other than `humanmade/process-blocks`, update the URL in `blueprint.json` and in the link above.

## Structure

```
plugin.php            Plugin header, bootstrap
inc/namespace.php     Block registration, step tracking, Interactivity API state
src/process/          Process block (editor, render, styles, view module)
src/section/          Section block
src/step/             Step block
demo/                 Demo content, used by wp-env and Playground
```
