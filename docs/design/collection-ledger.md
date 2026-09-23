# Collection ledger design exercise

## Example request

“Make the dashboard feel like a well-kept collection ledger. Help me see what I own, what needs cleaning, and where to go next. Keep it private, offline, easy to use on my phone, and compatible with light and dark mode.”

## Design direction

Archival utility: a calm, organized personal catalog with warm paper, deep green, serif headings, and ruled rows. The large collection count is the main visual cue. Existing navigation and routes stay familiar.

The dashboard uses four overview columns, then a wide activity ledger beside cleaning reminders. Collection types use labeled rows with exact counts. Small screens use two columns for totals and one for the main content.

## Visual system

- Display: Palatino, with Book Antiqua, Liberation Serif, and Georgia fallbacks.
- Text: Trebuchet MS, with Verdana and sans-serif fallbacks.
- Metadata: Cascadia Code, with Liberation Mono and monospace fallbacks.
- Light: paper `#f3f0e7`, ink `#1c1c24`, green `#28513e`.
- Dark: field `#171e1b`, ink `#e8e6e0`, green `#a9ccb4`.
- Spacing: mainly 8, 16, 24, 32, and 40 pixels.
- Shape: ruled surfaces and small radii; no decorative gradients or background images.
- Motion: retain brief existing control feedback and the reduced-motion rule; no new entrance animation.
- Fonts load from the device. There are no runtime font requests or new dependencies.

## Application-wide extension

The inventory, ammo, stats, firearm detail, forms, setup, and account screens now use the ledger's display type, ruled sections, restrained borders, and local palette. Inventory and ammo keep their existing search, filters, tables, and actions; stats labels explicitly describe purchase value. The new layout rules apply to these screens through the shared layout, while the print report keeps its print styling.

The inventory table remains a table on desktop and changes to labeled rows on phones. Stat summaries use a ruled grid. Forms and account settings keep their existing controls and error handling. These changes need a visual check in both themes at desktop and phone widths before the PR is ready.

Shared theme colors, fonts, radii, and navigation wrapping also apply to other pages. Dashboard layout rules are scoped to `.page-home` so the ammo summary keeps its own layout.

## Working behavior

- Open inventory from the collection total.
- Add a firearm from the main action.
- Open the exact firearm from an activity or cleaning entry.
- Open ammo, stats, or reminder settings from the dashboard.
- Read type counts without JavaScript or color perception.
- Expand a table of exact cumulative purchase costs below the canvas chart.
- See guidance for an empty collection, missing purchase data, and no cleaning reminders.
- When more than five cleaning reminders exist, see the full count and an explanation of the abbreviated list.

The dashboard still uses existing services and repositories. Counts include all recorded firearms, including disposition records, as before. Purchase values remain cumulative costs, not appraisals. There is no new asynchronous loading state; Express renders the page. Existing error and flash handling remain in place.

## Genericness audit and revision

The first implementation retained the old type doughnut chart. It felt less like a catalog and required matching colors to labels. It was replaced with server-rendered type rows, exact counts, and native meters. The design also replaces equal floating statistic cards with one ruled summary and an emphasized collection total.

## Verification status

ESLint and `git diff --check` pass. The selected dashboard text tokens meet at least 4.84:1 contrast in light mode and 5.78:1 in dark mode against the dashboard surfaces. These are calculated token checks, not a browser accessibility audit. Rendering tests cover empty states, record links, capped reminders, exact values, and escaping untrusted record text. Full test results are recorded in the pull request.

Browser verification is pending. This environment blocked both local HTTP preview access and local file navigation. No screenshots of the new design have been captured. Existing gallery images show the previous interface.

Before merging, inspect 1440px, 768px, 390px, and 320px widths in both themes. Check long usernames and model names, keyboard focus, chart resize, theme switching, reduced motion, empty states, and form error feedback. Check the shared header, inventory, ammo, profile, and setup/login pages too. Replace `docs/screenshots/dashboard.png` and `dashboard-light.png` after visual approval.
