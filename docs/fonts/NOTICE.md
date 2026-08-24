# Bundled web fonts

These fonts are served from this site rather than a third-party CDN, so viewing
the marketing pages makes no request to Google Fonts or any other external host.

| File | Family | Weight | Subset | Source | License |
|------|--------|--------|--------|--------|---------|
| `bebas-neue-400-latin.woff2` | Bebas Neue | 400 | latin | [Google Fonts](https://fonts.google.com/specimen/Bebas+Neue) | [SIL Open Font License 1.1](https://openfontlicense.org/) |
| `ibm-plex-mono-400-latin.woff2` | IBM Plex Mono | 400 | latin | [Google Fonts](https://fonts.google.com/specimen/IBM+Plex+Mono) | [SIL Open Font License 1.1](https://openfontlicense.org/) |
| `ibm-plex-mono-500-latin.woff2` | IBM Plex Mono | 500 | latin | [Google Fonts](https://fonts.google.com/specimen/IBM+Plex+Mono) | [SIL Open Font License 1.1](https://openfontlicense.org/) |

Only the `latin` subset is bundled; the pages are English-only. To refresh a
file, download the `latin` `woff2` referenced by the Google Fonts CSS API for
the family and weight above and replace it in place — the `@font-face` rules in
`../index.html` and `../articles/article.css` point at these filenames.

The SIL Open Font License permits this redistribution. The fonts are not part of
the Pew Pew Collection application and are not covered by its BUSL-1.1 license.
