# Screenshots

All images live in the main repo under `docs/screenshots/` and are referenced
here via `raw.githubusercontent.com` so they render in the wiki.

## Dashboard

![Dashboard](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/dashboard.png)

Recent activity feed, type breakdown chart, and purchase-value-by-year chart.

## Inventory

![Inventory](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/inventory.png)

Search, sort, filter by status / condition / type, and click any row to open
the detail view. Rows collapse into cards on mobile.

## Firearm detail

![Firearm Detail](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/firearm-detail.png)

Grouped fields, edit / duplicate / delete actions, and disposition data when
applicable. Below the core record, the detail view shows the Maintenance Log,
Range Sessions, and Photo Attachments sections.

## Maintenance Log

![Maintenance Log](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/maintenance-log.png)

The **Maintenance Log** section on the firearm detail page lets you record
cleaning, repair, and part-replacement entries. Each entry captures a type,
date, and optional notes. A firearm is flagged as due for cleaning when its
most recent cleaning entry is older than the configurable threshold (default:
90 days), or when a range session is newer than the last cleaning. Overdue
firearms appear in the cleaning-due list on the dashboard, and the section
shows a **Cleaning due** badge with the reason.

## Range Sessions

![Range Sessions](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/range-sessions.png)

The **Range Sessions** section lets you log every trip to the range per
firearm — date, location, rounds fired, and notes. A running total of lifetime
rounds fired (and the session count) is displayed alongside the log.

## Photo Attachments

![Photo Attachments](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/photos.png)

The **Photo Attachments** section lets you attach up to 12 photos per firearm
(JPEG, PNG, WebP, or GIF, up to 10 MB each). Images are stored on disk in the
data volume at `/data/photos` and served only to authenticated users through
an ownership-checked route. Deleting a firearm also removes its photos from
disk.

## Add firearm

![Add Firearm](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/add-firearm.png)

The same form is used for edit; status changes drive which disposition fields
are required.

## Stats

![Stats](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/stats.png)

Collection summary, breakdown charts by type / caliber / make / condition,
acquisition trends by month, average price by year, and disposition stats.

## Insurance report

![Insurance Report](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/insurance-report.png)

Print-friendly inventory with total purchase value, suitable for policy
documentation.

## Profile

![Profile](https://raw.githubusercontent.com/Gogorichielab/PPCollection/main/docs/screenshots/profile.png)

Username, password change, theme toggle, and update-check preference.
