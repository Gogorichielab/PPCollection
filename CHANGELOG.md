## [2.2.0](https://github.com/Gogorichielab/PPCollection/compare/v2.1.2...v2.2.0) (2026-05-23)

### Features

* **accessibility,ux:** WCAG AA baseline and app shell polish (closes [#437](https://github.com/Gogorichielab/PPCollection/issues/437), [#406](https://github.com/Gogorichielab/PPCollection/issues/406), [#457](https://github.com/Gogorichielab/PPCollection/issues/457), [#439](https://github.com/Gogorichielab/PPCollection/issues/439), [#440](https://github.com/Gogorichielab/PPCollection/issues/440), [#436](https://github.com/Gogorichielab/PPCollection/issues/436)) ([1903d69](https://github.com/Gogorichielab/PPCollection/commit/1903d69481dea7d148590c429c82394d32783b03)), closes [#462](https://github.com/Gogorichielab/PPCollection/issues/462) [#463](https://github.com/Gogorichielab/PPCollection/issues/463)
* **firearms:** add printable insurance report ([#147](https://github.com/Gogorichielab/PPCollection/issues/147)) ([cff22df](https://github.com/Gogorichielab/PPCollection/commit/cff22dfd3183e5798142f9f8beb61043fd220526))
* **firearms:** group form fields into sections, fix notes markup ([dd479c4](https://github.com/Gogorichielab/PPCollection/commit/dd479c4781f4d44516ed8732e3dfb6e73e468dd1)), closes [#434](https://github.com/Gogorichielab/PPCollection/issues/434) [#438](https://github.com/Gogorichielab/PPCollection/issues/438)
* **reports:** add reporting & analytics dashboard ([67a59b7](https://github.com/Gogorichielab/PPCollection/commit/67a59b77c4f3679a3cb1c70ccd87c19d22a01dd7)), closes [#458](https://github.com/Gogorichielab/PPCollection/issues/458)
* **security:** scope firearms by user_id, enforce serial uniqueness, add indexes ([c53c893](https://github.com/Gogorichielab/PPCollection/commit/c53c893f8049c0eb42117a6a6fa3dbe1847cabeb)), closes [#374](https://github.com/Gogorichielab/PPCollection/issues/374) [#398](https://github.com/Gogorichielab/PPCollection/issues/398) [#399](https://github.com/Gogorichielab/PPCollection/issues/399) [#374](https://github.com/Gogorichielab/PPCollection/issues/374) [#399](https://github.com/Gogorichielab/PPCollection/issues/399) [#398](https://github.com/Gogorichielab/PPCollection/issues/398) [#407](https://github.com/Gogorichielab/PPCollection/issues/407)
* **ux:** preserve sort on filter, debounce search, persist state in URL, collapsible filter groups ([3d1b483](https://github.com/Gogorichielab/PPCollection/commit/3d1b48315d36af0e8023fdaf6fc0415418a20276)), closes [#400](https://github.com/Gogorichielab/PPCollection/issues/400) [#402](https://github.com/Gogorichielab/PPCollection/issues/402) [#435](https://github.com/Gogorichielab/PPCollection/issues/435) [#441](https://github.com/Gogorichielab/PPCollection/issues/441)

### Bug Fixes

* **reports:** scope all report queries by user_id ([5a3abd0](https://github.com/Gogorichielab/PPCollection/commit/5a3abd08989737da1368d0bddb65a9b8629daff6))
* **reports:** scope reports and serial queries to authenticated user ([6b6f706](https://github.com/Gogorichielab/PPCollection/commit/6b6f7063549aad3927c90d86c94822dd1bb539a4))

### Documentation

* add reports feature, serial uniqueness, and user_id scoping to documentation ([439975f](https://github.com/Gogorichielab/PPCollection/commit/439975fe7bbe35027a142e679c14ef2ad342838e))

### Continuous Integration

* **deps:** bump softprops/action-gh-release ([74131cf](https://github.com/Gogorichielab/PPCollection/commit/74131cf2a9b27a9f23b0f2f7665a43bf5e0cb214))

## [2.1.2](https://github.com/Gogorichielab/PPCollection/compare/v2.1.1...v2.1.2) (2026-05-09)

### Continuous Integration

* **codeowners:** add owner review policy ([9f486d9](https://github.com/Gogorichielab/PPCollection/commit/9f486d94c4e63be4c0ad281f0145928bb164d2f8))
* **release:** lowercase image ref before SBOM scan ([2515e22](https://github.com/Gogorichielab/PPCollection/commit/2515e22268abd034e9be7f23b408230d2b5c247a))

## [2.1.1](https://github.com/Gogorichielab/PPCollection/compare/v2.1.0...v2.1.1) (2026-05-08)

### Bug Fixes

* **docker:** set DATA_DIR=/data so bundled DATABASE_PATH passes guard ([8ea8768](https://github.com/Gogorichielab/PPCollection/commit/8ea87689e2889d5359852270022cf463c3974be5)), closes [#380](https://github.com/Gogorichielab/PPCollection/issues/380)

### Documentation

* **agents:** document DATABASE_PATH / DATA_DIR guard coupling ([c8417ce](https://github.com/Gogorichielab/PPCollection/commit/c8417ced8c5fe93f9ce5d77785654f9ff0c86550))

## [2.1.0](https://github.com/Gogorichielab/PPCollection/compare/v2.0.4...v2.1.0) (2026-05-07)

### Features

* **a11y:** add skip-to-main link and theme toggle aria-label ([0a443e1](https://github.com/Gogorichielab/PPCollection/commit/0a443e1fba2f2b2f0a8b76d78f8021c8dca799a1)), closes [#422](https://github.com/Gogorichielab/PPCollection/issues/422) [#424](https://github.com/Gogorichielab/PPCollection/issues/424)
* **ui:** mobile card layout for inventory table ([e481dfc](https://github.com/Gogorichielab/PPCollection/commit/e481dfc50babcb4b3a0df8ac6e97c5134bb62c39)), closes [#417](https://github.com/Gogorichielab/PPCollection/issues/417)

### Bug Fixes

* **release-1:** resolve open Release 1 issues across security, bugs, devops, and tests ([#446](https://github.com/Gogorichielab/PPCollection/issues/446)) ([1bb9ba1](https://github.com/Gogorichielab/PPCollection/commit/1bb9ba14c4ac763d6b54e6af0e900a211ecbc980)), closes [#371](https://github.com/Gogorichielab/PPCollection/issues/371) [#370](https://github.com/Gogorichielab/PPCollection/issues/370) [#378](https://github.com/Gogorichielab/PPCollection/issues/378) [#375](https://github.com/Gogorichielab/PPCollection/issues/375) [#372](https://github.com/Gogorichielab/PPCollection/issues/372) [#376](https://github.com/Gogorichielab/PPCollection/issues/376) [#379](https://github.com/Gogorichielab/PPCollection/issues/379) [#380](https://github.com/Gogorichielab/PPCollection/issues/380) [#382](https://github.com/Gogorichielab/PPCollection/issues/382) [#383](https://github.com/Gogorichielab/PPCollection/issues/383) [#384](https://github.com/Gogorichielab/PPCollection/issues/384) [#404](https://github.com/Gogorichielab/PPCollection/issues/404) [#401](https://github.com/Gogorichielab/PPCollection/issues/401) [#408](https://github.com/Gogorichielab/PPCollection/issues/408) [#409](https://github.com/Gogorichielab/PPCollection/issues/409) [#410](https://github.com/Gogorichielab/PPCollection/issues/410) [#387](https://github.com/Gogorichielab/PPCollection/issues/387) [#388](https://github.com/Gogorichielab/PPCollection/issues/388)
* **release-2:** close out remaining open Release 2 backlog ([0b74870](https://github.com/Gogorichielab/PPCollection/commit/0b74870a13b3666114024d2c4f78a029c1fc8f04)), closes [#389](https://github.com/Gogorichielab/PPCollection/issues/389) [#390](https://github.com/Gogorichielab/PPCollection/issues/390) [#391](https://github.com/Gogorichielab/PPCollection/issues/391) [#392](https://github.com/Gogorichielab/PPCollection/issues/392) [#427](https://github.com/Gogorichielab/PPCollection/issues/427) [#430](https://github.com/Gogorichielab/PPCollection/issues/430) [#393](https://github.com/Gogorichielab/PPCollection/issues/393) [#394](https://github.com/Gogorichielab/PPCollection/issues/394) [#428](https://github.com/Gogorichielab/PPCollection/issues/428) [#431](https://github.com/Gogorichielab/PPCollection/issues/431) [#433](https://github.com/Gogorichielab/PPCollection/issues/433) [#395](https://github.com/Gogorichielab/PPCollection/issues/395) [#373](https://github.com/Gogorichielab/PPCollection/issues/373) [#377](https://github.com/Gogorichielab/PPCollection/issues/377) [#381](https://github.com/Gogorichielab/PPCollection/issues/381) [#396](https://github.com/Gogorichielab/PPCollection/issues/396) [#397](https://github.com/Gogorichielab/PPCollection/issues/397) [#411](https://github.com/Gogorichielab/PPCollection/issues/411) [#412](https://github.com/Gogorichielab/PPCollection/issues/412) [#413](https://github.com/Gogorichielab/PPCollection/issues/413) [#414](https://github.com/Gogorichielab/PPCollection/issues/414) [#415](https://github.com/Gogorichielab/PPCollection/issues/415)
* **security:** bump bundled picomatch to 4.0.4 via npm override ([bccdbfc](https://github.com/Gogorichielab/PPCollection/commit/bccdbfc419d53aa0af04f8cb9212392958243f50))
* **security:** bump bundled picomatch to 4.0.4 via npm override ([67dbbc0](https://github.com/Gogorichielab/PPCollection/commit/67dbbc0fee7703291b00ad233861c02009f859dc))
* **security:** bump ip-address to 10.2.0 via override ([b67e6ef](https://github.com/Gogorichielab/PPCollection/commit/b67e6eff1f0008aa64cace6553931e542f525402))
* **ui:** address inventory list review feedback ([44bb99f](https://github.com/Gogorichielab/PPCollection/commit/44bb99f73e24350cef4b1888cf842804f742e04d))
* **ui:** update inventory All items count badge with active filters ([eec2e2a](https://github.com/Gogorichielab/PPCollection/commit/eec2e2a3d9bb3e495d41a24ca68e6b9f3fd01c65)), closes [#421](https://github.com/Gogorichielab/PPCollection/issues/421)

### Documentation

* **claude:** refresh CLAUDE.md to reflect shipped security and tooling ([#445](https://github.com/Gogorichielab/PPCollection/issues/445)) ([5123704](https://github.com/Gogorichielab/PPCollection/commit/51237045d01d35db2c58396a2d44330ebc60d956))
* update README and static site for a11y and mobile improvements ([0d0d594](https://github.com/Gogorichielab/PPCollection/commit/0d0d594e7394f0debf6a75737437d290113c3bf9))

### Styles

* **ui:** add skip-link visuals and filter-chip selected state ([94e309d](https://github.com/Gogorichielab/PPCollection/commit/94e309d765483090ab9a4f8cb685c289cdc78be0)), closes [#418](https://github.com/Gogorichielab/PPCollection/issues/418) [#422](https://github.com/Gogorichielab/PPCollection/issues/422)

### Tests

* **auth:** regression coverage for last open Release 1 bugs ([#385](https://github.com/Gogorichielab/PPCollection/issues/385), [#386](https://github.com/Gogorichielab/PPCollection/issues/386)) ([#447](https://github.com/Gogorichielab/PPCollection/issues/447)) ([491812f](https://github.com/Gogorichielab/PPCollection/commit/491812f880ac94e0776addbca4a2475860a52696)), closes [auth.controller.js#L78](https://github.com/Gogorichielab/auth.controller.js/issues/L78)

### Continuous Integration

* **security:** scope picomatch trivy exception ([064a63d](https://github.com/Gogorichielab/PPCollection/commit/064a63d5bf8ed15915ceabffc6f073ffe0f58d2f))

## [2.1.0](https://github.com/Gogorichielab/PPCollection/compare/v2.0.4...v2.1.0) (2026-05-06)

### Features

* **a11y:** add skip-to-main link and theme toggle aria-label ([0a443e1](https://github.com/Gogorichielab/PPCollection/commit/0a443e1fba2f2b2f0a8b76d78f8021c8dca799a1)), closes [#422](https://github.com/Gogorichielab/PPCollection/issues/422) [#424](https://github.com/Gogorichielab/PPCollection/issues/424)
* **ui:** mobile card layout for inventory table ([e481dfc](https://github.com/Gogorichielab/PPCollection/commit/e481dfc50babcb4b3a0df8ac6e97c5134bb62c39)), closes [#417](https://github.com/Gogorichielab/PPCollection/issues/417)

### Bug Fixes

* **security:** bump bundled picomatch to 4.0.4 via npm override ([bccdbfc](https://github.com/Gogorichielab/PPCollection/commit/bccdbfc419d53aa0af04f8cb9212392958243f50))
* **security:** bump bundled picomatch to 4.0.4 via npm override ([67dbbc0](https://github.com/Gogorichielab/PPCollection/commit/67dbbc0fee7703291b00ad233861c02009f859dc))
* **security:** bump ip-address to 10.2.0 via override ([b67e6ef](https://github.com/Gogorichielab/PPCollection/commit/b67e6eff1f0008aa64cace6553931e542f525402))
* **ui:** address inventory list review feedback ([44bb99f](https://github.com/Gogorichielab/PPCollection/commit/44bb99f73e24350cef4b1888cf842804f742e04d))
* **ui:** update inventory All items count badge with active filters ([eec2e2a](https://github.com/Gogorichielab/PPCollection/commit/eec2e2a3d9bb3e495d41a24ca68e6b9f3fd01c65)), closes [#421](https://github.com/Gogorichielab/PPCollection/issues/421)

### Documentation

* update README and static site for a11y and mobile improvements ([0d0d594](https://github.com/Gogorichielab/PPCollection/commit/0d0d594e7394f0debf6a75737437d290113c3bf9))

### Styles

* **ui:** add skip-link visuals and filter-chip selected state ([94e309d](https://github.com/Gogorichielab/PPCollection/commit/94e309d765483090ab9a4f8cb685c289cdc78be0)), closes [#418](https://github.com/Gogorichielab/PPCollection/issues/418) [#422](https://github.com/Gogorichielab/PPCollection/issues/422)

### Continuous Integration

* **security:** scope picomatch trivy exception ([064a63d](https://github.com/Gogorichielab/PPCollection/commit/064a63d5bf8ed15915ceabffc6f073ffe0f58d2f))

## [2.0.4](https://github.com/Gogorichielab/PPCollection/compare/v2.0.3...v2.0.4) (2026-05-03)

### Documentation

* capture fresh screenshots reflecting v2.x UI changes ([86f1d93](https://github.com/Gogorichielab/PPCollection/commit/86f1d936dc58383f63c3a0f63c14a9a6445504fc))
* remove redundant dashboard screenshot from gallery section ([4ba178e](https://github.com/Gogorichielab/PPCollection/commit/4ba178edea7102b35cf3f2e9b6ed3e9495fd8b8a))
* update README and website for v2.x changes ([6ecc679](https://github.com/Gogorichielab/PPCollection/commit/6ecc679ac0a9907c097712575115f07a789f67e8))

## [2.0.3](https://github.com/Gogorichielab/PPCollection/compare/v2.0.2...v2.0.3) (2026-05-03)

### Bug Fixes

* **chart:** auto-size bar chart left padding for currency labels ([64f64ee](https://github.com/Gogorichielab/PPCollection/commit/64f64ee31ab120ba6d125cb51d66aa7ee9a1ef93))
* **theme:** make light/dark theme transitions consistent ([52c6162](https://github.com/Gogorichielab/PPCollection/commit/52c6162316d217565a36adaf3f0a10235ca8688b))

### Code Refactoring

* **home:** drop Quick Actions and reorganize dashboard ([beb3665](https://github.com/Gogorichielab/PPCollection/commit/beb3665c6b792e8f7536a7e6b3de1f91e8a02468))

### Tests

* consolidate redundant tests, reduce suite from 115 to 108 ([38a1e3b](https://github.com/Gogorichielab/PPCollection/commit/38a1e3be36d65778796801917ccd01d9bede94fa))

## [2.0.2](https://github.com/Gogorichielab/PPCollection/compare/v2.0.1...v2.0.2) (2026-05-02)

### Bug Fixes

* **csrf:** render friendly 403 page and log proxy hint on CSRF rejection ([8b69cde](https://github.com/Gogorichielab/PPCollection/commit/8b69cded2d0248703d6ac7213daee7ea99a4318f))

## [2.0.1](https://github.com/Gogorichielab/PPCollection/compare/v2.0.0...v2.0.1) (2026-05-02)

### Bug Fixes

* **config:** refuse to start in production with default SESSION_SECRET ([182d7cf](https://github.com/Gogorichielab/PPCollection/commit/182d7cfdc01b079078efc85772793145428f56e4))

## [2.0.0](https://github.com/Gogorichielab/PPCollection/compare/v1.19.0...v2.0.0) (2026-05-02)

### ⚠ BREAKING CHANGES

* **security:** The `Secure` cookie flag is now on by default when
NODE_ENV=production (the published Docker image always sets this).
Operators running on plain HTTP in production must add
`SECURE_COOKIES=false` to their environment, otherwise the browser
will refuse to send the session cookie and login will not persist.
Operators behind an HTTPS reverse proxy must continue to set
TRUST_PROXY=true so Express recognises the proxied request as HTTPS.

https://claude.ai/code/session_016wAgkh3Z8mcM1ZjGVKTKCn
* **security:** refuse to start with default ADMIN_PASSWORD in production (#356)
* **security:** Production deployments started with no
ADMIN_PASSWORD, or with ADMIN_PASSWORD=changeme, will now refuse to
start on first run. Existing seeded deployments are unaffected. To
remediate a fresh install, set ADMIN_PASSWORD to a strong value
(`openssl rand -base64 24`) before starting.

### Features

* **auth:** rate-limit login and password change endpoints ([348b164](https://github.com/Gogorichielab/PPCollection/commit/348b1641b6559b67f6d21cfbf4bdb664f64043d7)), closes [#340](https://github.com/Gogorichielab/PPCollection/issues/340)
* **security:** default Secure cookie flag to on in production ([f6db7de](https://github.com/Gogorichielab/PPCollection/commit/f6db7dede4f2a222aace9c660b20189b529fe437))
* **security:** refuse to start with default ADMIN_PASSWORD in production ([114bf46](https://github.com/Gogorichielab/PPCollection/commit/114bf467bb75c9dbc4fbcc9588285b2e10e5994b)), closes [#337](https://github.com/Gogorichielab/PPCollection/issues/337)
* **security:** refuse to start with default ADMIN_PASSWORD in production ([#356](https://github.com/Gogorichielab/PPCollection/issues/356)) ([72b4ca9](https://github.com/Gogorichielab/PPCollection/commit/72b4ca9e39d049c19bf5f630877a331234016b92)), closes [#337](https://github.com/Gogorichielab/PPCollection/issues/337)

### Bug Fixes

* **ci:** make release version bump idempotent ([b6e3efd](https://github.com/Gogorichielab/PPCollection/commit/b6e3efd48c98db34fda35306eaa77cd6c282e6fb))
* **firearms:** enforce length and value limits in firearm validator ([a7aefef](https://github.com/Gogorichielab/PPCollection/commit/a7aefefab1912f88e2e193ecd09d94d6de6aa76d)), closes [#343](https://github.com/Gogorichielab/PPCollection/issues/343)
* **security:** externalize inline scripts to comply with default CSP ([ff6b498](https://github.com/Gogorichielab/PPCollection/commit/ff6b4987534a7fc79838d1269ba6a6988168c476)), closes [#338](https://github.com/Gogorichielab/PPCollection/issues/338) [#338](https://github.com/Gogorichielab/PPCollection/issues/338)
* **security:** set explicit 50KB limit on JSON and urlencoded bodies ([928e399](https://github.com/Gogorichielab/PPCollection/commit/928e3990b5b58188c31bd0beea9e3700d8e4d147)), closes [#342](https://github.com/Gogorichielab/PPCollection/issues/342)
* **version-service:** add 5s timeout to GitHub release-check request ([3b28c5e](https://github.com/Gogorichielab/PPCollection/commit/3b28c5ed9eeba09436df8ef6c2b5edf272def33a)), closes [#341](https://github.com/Gogorichielab/PPCollection/issues/341)

### Documentation

* refresh QA + workflow sections in CLAUDE.md ([b92ea8d](https://github.com/Gogorichielab/PPCollection/commit/b92ea8dcd37453dcc148ff30a18cf197e7e7c042))

### Continuous Integration

* add CodeQL, npm audit, and Trivy gates; lowercase workflow filenames ([1c9dd5e](https://github.com/Gogorichielab/PPCollection/commit/1c9dd5e5987a752f3c0aba9966662c75e9903f73))
* bump aquasecurity/trivy-action to v0.36.0 ([e72bfc2](https://github.com/Gogorichielab/PPCollection/commit/e72bfc27e0d59184214448398ca20b926e092c57))
* **dependabot:** group updates so each ecosystem opens a single PR ([bbfa740](https://github.com/Gogorichielab/PPCollection/commit/bbfa7402ecfba05ec7cb8fbaf0787a91990bae85))
* **deps:** bump actions/upload-pages-artifact from 3 to 5 ([08a740d](https://github.com/Gogorichielab/PPCollection/commit/08a740d6874a85561f758c669fdf231683b3129f))
* **deps:** bump the all-actions-updates group with 6 updates ([1db1bcc](https://github.com/Gogorichielab/PPCollection/commit/1db1bccc65131f507ad5aec7a8266461ef6dfa4b))
* drop conflicting codeql.yml + ignore hadolint DL3018 ([1e4bf2b](https://github.com/Gogorichielab/PPCollection/commit/1e4bf2bdbff4e046fd2fe8af3c8188f7104c24a1))
* **hadolint:** point action at .hadolint.yaml explicitly ([2e5ba2e](https://github.com/Gogorichielab/PPCollection/commit/2e5ba2e6166af1ca85ec7fbfd973b3d855a30fd5))
* **hadolint:** set failure-threshold to error ([117e59f](https://github.com/Gogorichielab/PPCollection/commit/117e59f539dc8ebc0cd7ea8e48bb794b9c3113d5))
* **hadolint:** switch to inline DL3018 ignore in Dockerfile ([5b26474](https://github.com/Gogorichielab/PPCollection/commit/5b26474a46364c9372915588d4b44d21ec59b282))

## [1.20.0](https://github.com/Gogorichielab/PPCollection/compare/v1.19.0...v1.20.0) (2026-04-28)

### Features

* **auth:** rate-limit login and password change endpoints ([348b164](https://github.com/Gogorichielab/PPCollection/commit/348b1641b6559b67f6d21cfbf4bdb664f64043d7)), closes [#340](https://github.com/Gogorichielab/PPCollection/issues/340)

### Bug Fixes

* **ci:** make release version bump idempotent ([b6e3efd](https://github.com/Gogorichielab/PPCollection/commit/b6e3efd48c98db34fda35306eaa77cd6c282e6fb))
* **firearms:** enforce length and value limits in firearm validator ([a7aefef](https://github.com/Gogorichielab/PPCollection/commit/a7aefefab1912f88e2e193ecd09d94d6de6aa76d)), closes [#343](https://github.com/Gogorichielab/PPCollection/issues/343)
* **security:** set explicit 50KB limit on JSON and urlencoded bodies ([928e399](https://github.com/Gogorichielab/PPCollection/commit/928e3990b5b58188c31bd0beea9e3700d8e4d147)), closes [#342](https://github.com/Gogorichielab/PPCollection/issues/342)
* **version-service:** add 5s timeout to GitHub release-check request ([3b28c5e](https://github.com/Gogorichielab/PPCollection/commit/3b28c5ed9eeba09436df8ef6c2b5edf272def33a)), closes [#341](https://github.com/Gogorichielab/PPCollection/issues/341)

### Documentation

* refresh QA + workflow sections in CLAUDE.md ([b92ea8d](https://github.com/Gogorichielab/PPCollection/commit/b92ea8dcd37453dcc148ff30a18cf197e7e7c042))

### Continuous Integration

* add CodeQL, npm audit, and Trivy gates; lowercase workflow filenames ([1c9dd5e](https://github.com/Gogorichielab/PPCollection/commit/1c9dd5e5987a752f3c0aba9966662c75e9903f73))
* bump aquasecurity/trivy-action to v0.36.0 ([e72bfc2](https://github.com/Gogorichielab/PPCollection/commit/e72bfc27e0d59184214448398ca20b926e092c57))
* **dependabot:** group updates so each ecosystem opens a single PR ([bbfa740](https://github.com/Gogorichielab/PPCollection/commit/bbfa7402ecfba05ec7cb8fbaf0787a91990bae85))
* **deps:** bump actions/upload-pages-artifact from 3 to 5 ([08a740d](https://github.com/Gogorichielab/PPCollection/commit/08a740d6874a85561f758c669fdf231683b3129f))
* **deps:** bump the all-actions-updates group with 6 updates ([1db1bcc](https://github.com/Gogorichielab/PPCollection/commit/1db1bccc65131f507ad5aec7a8266461ef6dfa4b))
* drop conflicting codeql.yml + ignore hadolint DL3018 ([1e4bf2b](https://github.com/Gogorichielab/PPCollection/commit/1e4bf2bdbff4e046fd2fe8af3c8188f7104c24a1))
* **hadolint:** point action at .hadolint.yaml explicitly ([2e5ba2e](https://github.com/Gogorichielab/PPCollection/commit/2e5ba2e6166af1ca85ec7fbfd973b3d855a30fd5))
* **hadolint:** set failure-threshold to error ([117e59f](https://github.com/Gogorichielab/PPCollection/commit/117e59f539dc8ebc0cd7ea8e48bb794b9c3113d5))
* **hadolint:** switch to inline DL3018 ignore in Dockerfile ([5b26474](https://github.com/Gogorichielab/PPCollection/commit/5b26474a46364c9372915588d4b44d21ec59b282))

## [1.20.0](https://github.com/Gogorichielab/PPCollection/compare/v1.19.0...v1.20.0) (2026-04-28)

### Features

* **auth:** rate-limit login and password change endpoints ([348b164](https://github.com/Gogorichielab/PPCollection/commit/348b1641b6559b67f6d21cfbf4bdb664f64043d7)), closes [#340](https://github.com/Gogorichielab/PPCollection/issues/340)

### Bug Fixes

* **firearms:** enforce length and value limits in firearm validator ([a7aefef](https://github.com/Gogorichielab/PPCollection/commit/a7aefefab1912f88e2e193ecd09d94d6de6aa76d)), closes [#343](https://github.com/Gogorichielab/PPCollection/issues/343)
* **security:** set explicit 50KB limit on JSON and urlencoded bodies ([928e399](https://github.com/Gogorichielab/PPCollection/commit/928e3990b5b58188c31bd0beea9e3700d8e4d147)), closes [#342](https://github.com/Gogorichielab/PPCollection/issues/342)
* **version-service:** add 5s timeout to GitHub release-check request ([3b28c5e](https://github.com/Gogorichielab/PPCollection/commit/3b28c5ed9eeba09436df8ef6c2b5edf272def33a)), closes [#341](https://github.com/Gogorichielab/PPCollection/issues/341)

### Documentation

* refresh QA + workflow sections in CLAUDE.md ([b92ea8d](https://github.com/Gogorichielab/PPCollection/commit/b92ea8dcd37453dcc148ff30a18cf197e7e7c042))

### Continuous Integration

* add CodeQL, npm audit, and Trivy gates; lowercase workflow filenames ([1c9dd5e](https://github.com/Gogorichielab/PPCollection/commit/1c9dd5e5987a752f3c0aba9966662c75e9903f73))
* bump aquasecurity/trivy-action to v0.36.0 ([e72bfc2](https://github.com/Gogorichielab/PPCollection/commit/e72bfc27e0d59184214448398ca20b926e092c57))
* **dependabot:** group updates so each ecosystem opens a single PR ([bbfa740](https://github.com/Gogorichielab/PPCollection/commit/bbfa7402ecfba05ec7cb8fbaf0787a91990bae85))
* **deps:** bump actions/upload-pages-artifact from 3 to 5 ([08a740d](https://github.com/Gogorichielab/PPCollection/commit/08a740d6874a85561f758c669fdf231683b3129f))
* drop conflicting codeql.yml + ignore hadolint DL3018 ([1e4bf2b](https://github.com/Gogorichielab/PPCollection/commit/1e4bf2bdbff4e046fd2fe8af3c8188f7104c24a1))
* **hadolint:** point action at .hadolint.yaml explicitly ([2e5ba2e](https://github.com/Gogorichielab/PPCollection/commit/2e5ba2e6166af1ca85ec7fbfd973b3d855a30fd5))
* **hadolint:** set failure-threshold to error ([117e59f](https://github.com/Gogorichielab/PPCollection/commit/117e59f539dc8ebc0cd7ea8e48bb794b9c3113d5))
* **hadolint:** switch to inline DL3018 ignore in Dockerfile ([5b26474](https://github.com/Gogorichielab/PPCollection/commit/5b26474a46364c9372915588d4b44d21ec59b282))

## [1.19.1](https://github.com/Gogorichielab/PPCollection/compare/v1.19.0...v1.19.1) (2026-04-28)

### Documentation

* refresh QA + workflow sections in CLAUDE.md ([b92ea8d](https://github.com/Gogorichielab/PPCollection/commit/b92ea8dcd37453dcc148ff30a18cf197e7e7c042))

### Continuous Integration

* add CodeQL, npm audit, and Trivy gates; lowercase workflow filenames ([1c9dd5e](https://github.com/Gogorichielab/PPCollection/commit/1c9dd5e5987a752f3c0aba9966662c75e9903f73))
* bump aquasecurity/trivy-action to v0.36.0 ([e72bfc2](https://github.com/Gogorichielab/PPCollection/commit/e72bfc27e0d59184214448398ca20b926e092c57))
* drop conflicting codeql.yml + ignore hadolint DL3018 ([1e4bf2b](https://github.com/Gogorichielab/PPCollection/commit/1e4bf2bdbff4e046fd2fe8af3c8188f7104c24a1))
* **hadolint:** point action at .hadolint.yaml explicitly ([2e5ba2e](https://github.com/Gogorichielab/PPCollection/commit/2e5ba2e6166af1ca85ec7fbfd973b3d855a30fd5))
* **hadolint:** set failure-threshold to error ([117e59f](https://github.com/Gogorichielab/PPCollection/commit/117e59f539dc8ebc0cd7ea8e48bb794b9c3113d5))
* **hadolint:** switch to inline DL3018 ignore in Dockerfile ([5b26474](https://github.com/Gogorichielab/PPCollection/commit/5b26474a46364c9372915588d4b44d21ec59b282))

## [1.19.0](https://github.com/Gogorichielab/PPCollection/compare/v1.18.0...v1.19.0) (2026-04-26)

### Features

* **firearms:** add bulk CSV import with downloadable template ([cdf1914](https://github.com/Gogorichielab/PPCollection/commit/cdf191406eb69ae2bdb31d329c2b518db5084592)), closes [#148](https://github.com/Gogorichielab/PPCollection/issues/148)
* **firearms:** add In Transit status ([f1be7cf](https://github.com/Gogorichielab/PPCollection/commit/f1be7cf01c712dcf8cc119713aff04ceff36368f))
* **version:** add opt-in update check indicator with profile toggle ([99384ed](https://github.com/Gogorichielab/PPCollection/commit/99384ed8f8111c9e73e2528ac0615678a3a2c647)), closes [#173](https://github.com/Gogorichielab/PPCollection/issues/173)

### Bug Fixes

* **dashboard:** show cumulative collection value by year ([414261f](https://github.com/Gogorichielab/PPCollection/commit/414261ff1751156f0c0a15d40d52586a9910e3cf))
* **version-service:** drain response body on non-200 and handle stream errors ([411e59e](https://github.com/Gogorichielab/PPCollection/commit/411e59e29ae3e94d50fb764622501f84746caf4d))
* **version:** prevent concurrent duplicate GitHub API calls using in-flight promise tracking ([c759881](https://github.com/Gogorichielab/PPCollection/commit/c759881c8d8436cb943f7b6875fde13a2974194f))
* **version:** set lastChecked at fetch start and rename concurrent test ([a16c751](https://github.com/Gogorichielab/PPCollection/commit/a16c7516e8351c66456497c19827942e6caecedf))

### Performance Improvements

* **firearms:** wrap CSV import inserts in a single DB transaction via bulkCreate ([2119029](https://github.com/Gogorichielab/PPCollection/commit/2119029e8c4c005a5e4ea7d7fe9894735aa91a38))

### Documentation

* document disposition tracking, CSV import, update check, and profile features ([4731d07](https://github.com/Gogorichielab/PPCollection/commit/4731d071a21121d0f37cad4010f93f32ce1262cc))

### Code Refactoring

* **firearms:** prepare bulk insert stmt once at factory level and use jest.spyOn in test ([0743e12](https://github.com/Gogorichielab/PPCollection/commit/0743e1255f0d0f08ba94e897ac82a33e7d32a212))

### Tests

* **version-service:** assert res.resume() is called on non-200 responses ([e947eda](https://github.com/Gogorichielab/PPCollection/commit/e947eda23f8e4eb2da260a0c48adcf77ee11472b))
* **version:** fix eslint unused args in https mock ([06908e7](https://github.com/Gogorichielab/PPCollection/commit/06908e74458b972049d6d8781e5629aa7d0aca2c))

### Continuous Integration

* **deps:** bump docker/build-push-action from 6 to 7 ([f807916](https://github.com/Gogorichielab/PPCollection/commit/f807916c55b72b92702455d4d172d1099083f8b3))

## [1.18.0](https://github.com/Gogorichielab/PPCollection/compare/v1.17.0...v1.18.0) (2026-04-12)

### Features

* implement semantic release configuration for publishing ([3c01933](https://github.com/Gogorichielab/PPCollection/commit/3c01933815f1ef501f3ccb2f8ce63fc2ee358d8d))

### Bug Fixes

* remediate Dependabot security alerts via npm audit fix ([c9ff88c](https://github.com/Gogorichielab/PPCollection/commit/c9ff88c6c1662433525556a2717fde6fe1685295))

## [1.17.0](https://github.com/Gogorichielab/PPCollection/compare/v1.16.0...v1.17.0) (2026-03-22)

### Features

* **firearms:** add disposition fields for transfer and sale tracking ([8bf1e90](https://github.com/Gogorichielab/PPCollection/commit/8bf1e9004bb3f652434acc4472af3c81bd5a8a24))

### Bug Fixes

* **firearms:** enforce server-side disposition clearing, disable hidden inputs, normalize status checks ([fc6b705](https://github.com/Gogorichielab/PPCollection/commit/fc6b705e0a8dd656fa92ceaa434386ce17660c8c))

## [1.16.0](https://github.com/Gogorichielab/PPCollection/compare/v1.15.11...v1.16.0) (2026-03-22)

### Features

* **security:** enhance cookie security and proxy trust configuration ([bf22247](https://github.com/Gogorichielab/PPCollection/commit/bf22247a1e7eac739f30a9035d6551e8d981df86))

### Bug Fixes

* **auth:** address review feedback on proxy trust and cookie security ([7f85a49](https://github.com/Gogorichielab/PPCollection/commit/7f85a49b2fd51bdaabadd2aae827555c88827b15))
* **toml:** add missing closing quotes in reviewer configuration ([0011dd2](https://github.com/Gogorichielab/PPCollection/commit/0011dd24e605cf83c360efaba2f716141eda9f44))

## [1.15.11](https://github.com/Gogorichielab/PPCollection/compare/v1.15.10...v1.15.11) (2026-03-21)

### Bug Fixes

* **theme:** remove light mode btn color override causing invisible button text ([f5a41f8](https://github.com/Gogorichielab/PPCollection/commit/f5a41f8dbd3b5015578426a14842d4bc230ab528))

## [1.15.10](https://github.com/Gogorichielab/PPCollection/compare/v1.15.9...v1.15.10) (2026-03-21)

### Documentation

* update screenshots and documentation to reflect redesigned UI ([c00919e](https://github.com/Gogorichielab/PPCollection/commit/c00919ea31332e0c7ca1d878e28710b47dbf68d7))

## [1.15.9](https://github.com/Gogorichielab/PPCollection/compare/v1.15.8...v1.15.9) (2026-03-21)

### Bug Fixes

* **ci:** resolve Docker build platform mismatch (exec format error) ([6368345](https://github.com/Gogorichielab/PPCollection/commit/63683450cae36b4ac7a018e43f7b40eaf36eda0e))

## [1.15.8](https://github.com/Gogorichielab/PPCollection/compare/v1.15.7...v1.15.8) (2026-03-21)

### Bug Fixes

* **ci:** fix Docker images never being published in release pipeline ([09235ea](https://github.com/Gogorichielab/PPCollection/commit/09235ea97f615d9dab8396f936c94101d86f2bb7))

## [1.15.7](https://github.com/Gogorichielab/PPCollection/compare/v1.15.6...v1.15.7) (2026-03-21)

### Bug Fixes

* comprehensive project review — bugs, accessibility, and UX improvements ([b20bf2c](https://github.com/Gogorichielab/PPCollection/commit/b20bf2c5eeeb47f1f5bebe7918c01e5d6a7a33b9))

## [1.15.6](https://github.com/Gogorichielab/PPCollection/compare/v1.15.5...v1.15.6) (2026-03-21)

### Bug Fixes

* update dependencies to resolve security vulnerabilities ([cb72d95](https://github.com/Gogorichielab/PPCollection/commit/cb72d957abddf2a635bc7fc2acb88fabaece1000))

## [1.15.5](https://github.com/Gogorichielab/PPCollection/compare/v1.15.4...v1.15.5) (2026-03-21)

### Bug Fixes

* add Trivy PR scan job to CI workflow for enhanced security scanning ([da45d7b](https://github.com/Gogorichielab/PPCollection/commit/da45d7b320b4818b637c65ba89d84b24b2272f2c))
* enhance CI workflow with Trivy scans and update Node.js version ([5f95e08](https://github.com/Gogorichielab/PPCollection/commit/5f95e08e6e546de22a65e97f2f8a7063c5f161cb))
* remove outdated CI and maintenance workflows, consolidate into new CI and Maintenance workflows ([e9cbecb](https://github.com/Gogorichielab/PPCollection/commit/e9cbecbb0b30c3dab359bdb30890e2df2fdab629))
* switch base image from bookworm-slim to alpine for smaller footprint ([b49d387](https://github.com/Gogorichielab/PPCollection/commit/b49d387d66526796015f6c98171687895a687fe1))

## [1.15.4](https://github.com/Gogorichielab/PPCollection/compare/v1.15.3...v1.15.4) (2026-03-21)

### Bug Fixes

* update package version to 1.15.2 and remove unused dependencies ([e0d90a9](https://github.com/Gogorichielab/PPCollection/commit/e0d90a94bbcca8a0fcf9bfb136d94b347b4c4c7b))

## [1.15.3](https://github.com/Gogorichielab/PPCollection/compare/v1.15.2...v1.15.3) (2026-03-21)

### Bug Fixes

* add tar dependency and override in package.json ([7a601a6](https://github.com/Gogorichielab/PPCollection/commit/7a601a6907589b7ad331efc8ccc58c8747181710))
* add undici dependency and update overrides in package.json ([eb5bacd](https://github.com/Gogorichielab/PPCollection/commit/eb5bacd4bcd3ed9750338ffb3b5c4eea08da279c))
* update Dockerfile to use bookworm-slim and improve dependency installation ([57dbbd2](https://github.com/Gogorichielab/PPCollection/commit/57dbbd27b6444d1cc8ee0aee9b03cf293852ab8c))

## [1.15.2](https://github.com/Gogorichielab/PPCollection/compare/v1.15.1...v1.15.2) (2026-03-21)

### Documentation

* initial plan for screenshot updates ([1c62fba](https://github.com/Gogorichielab/PPCollection/commit/1c62fba09c791304432562e2746fbab78ceea01d))
* update screenshots to reflect new design ([7c9ae76](https://github.com/Gogorichielab/PPCollection/commit/7c9ae76f321448c9bd352010f629e3511a826a47))

## [1.15.1](https://github.com/Gogorichielab/PPCollection/compare/v1.15.0...v1.15.1) (2026-03-13)

### Continuous Integration

* **deps:** bump docker/build-push-action from 6 to 7 ([ea2b86f](https://github.com/Gogorichielab/PPCollection/commit/ea2b86fa0bcc4f35e31f73e46748005b88d2f492))
* **deps:** bump docker/login-action from 3 to 4 ([f04bd8c](https://github.com/Gogorichielab/PPCollection/commit/f04bd8c6957bb7e7108ddc94459190ce57fe235c))
* **deps:** bump docker/metadata-action from 5 to 6 ([794492d](https://github.com/Gogorichielab/PPCollection/commit/794492d909e79ba5c8eab372e35475184b8908d3))
* **deps:** bump docker/setup-buildx-action from 3 to 4 ([fb593c8](https://github.com/Gogorichielab/PPCollection/commit/fb593c871c1e8ad670e30b3f1a4692ebe76ac491))

## [1.15.0](https://github.com/Gogorichielab/PPCollection/compare/v1.14.4...v1.15.0) (2026-03-09)

### Features

* add static file serving and enhance SEO metadata in layout ([607f4fb](https://github.com/Gogorichielab/PPCollection/commit/607f4fbf1baf5ac936ed597076d5a3bceec43a00))
* **docs:** enhance installation section with environment variable configuration table ([e2956c5](https://github.com/Gogorichielab/PPCollection/commit/e2956c5c2d8bee4d1ec0836ae1d04fbb6927c577))

### Bug Fixes

* **docs:** update README for clarity and consistency in application description ([c089980](https://github.com/Gogorichielab/PPCollection/commit/c0899808aacc356dac8a2a114578bdc75c61c18e))

## [1.14.4](https://github.com/Gogorichielab/PPCollection/compare/v1.14.3...v1.14.4) (2026-03-08)

### Bug Fixes

* **ci:** lowercase Docker image name to resolve invalid reference format error ([97ba748](https://github.com/Gogorichielab/PPCollection/commit/97ba748711dc63e0ad4a705bf69833df8d15ced9))

## [1.14.3](https://github.com/Gogorichielab/PPCollection/compare/v1.14.2...v1.14.3) (2026-03-08)

### Bug Fixes

* **docker:** upgrade Alpine OS packages to resolve CVE-2026-22184 (zlib CRITICAL) ([59ac764](https://github.com/Gogorichielab/PPCollection/commit/59ac764af55d4c1691334213f8f3486b14476cf7))

## [1.14.2](https://github.com/Gogorichielab/PPCollection/compare/v1.14.1...v1.14.2) (2026-03-08)

### Continuous Integration

* **release:** fail Trivy gate on critical vulnerabilities only ([5f05b24](https://github.com/Gogorichielab/PPCollection/commit/5f05b24b309d2d45a9e7e55ad5f5e5ad78b773a6))

## [1.14.1](https://github.com/Gogorichielab/PPCollection/compare/v1.14.0...v1.14.1) (2026-03-08)

### Bug Fixes

* **docker:** update base image and dependencies to resolve security vulnerabilities ([a9905e8](https://github.com/Gogorichielab/PPCollection/commit/a9905e8ac03a954e6351e93adc2b30f6521ff7e7))

## [1.14.0](https://github.com/Gogorichielab/PPCollection/compare/v1.13.0...v1.14.0) (2026-03-08)

### Features

* **ci:** enhance Docker workflow with Trivy image scanning and reporting ([58784c3](https://github.com/Gogorichielab/PPCollection/commit/58784c3028010a6ac3213952d356c5841480960c))

### Bug Fixes

* **ci:** add cache configuration for Node.js setup ([7c1e56a](https://github.com/Gogorichielab/PPCollection/commit/7c1e56aa54dc921eb28aa980bd6a490b7e82039b))
* **ci:** adjust permissions for Docker job in release workflow ([95e4d01](https://github.com/Gogorichielab/PPCollection/commit/95e4d0121baf1a34b98e2bf200cfebc99c1ca03b))
* **ci:** ensure correct checkout of main branch in Docker job ([8c631dc](https://github.com/Gogorichielab/PPCollection/commit/8c631dc450582545a4daa136df33de37f176a60b))
* **docs:** update index.html for improved clarity and privacy emphasis ([5cf7bcb](https://github.com/Gogorichielab/PPCollection/commit/5cf7bcb3f417af36e82ff06ec1910529cfc8a681))

## [1.13.0](https://github.com/Gogorichielab/PPCollection/compare/v1.12.0...v1.13.0) (2026-03-08)

### Features

* **home:** add collection type and value charts to dashboard ([52be353](https://github.com/Gogorichielab/PPCollection/commit/52be3538e206fa0c9aa26468d75a24612bd84023))

### Bug Fixes

* **views:** guard pageScripts with typeof check in layout.ejs ([3aa8e6d](https://github.com/Gogorichielab/PPCollection/commit/3aa8e6d153f6178ede00c5b60bb46b4a91ead735))

### Tests

* **load:** add 100-firearm load integration test suite ([573b95a](https://github.com/Gogorichielab/PPCollection/commit/573b95a8bdb4a7485f492d401da5e5fb4743661d))
* **load:** address code review feedback on load test ([e7423d3](https://github.com/Gogorichielab/PPCollection/commit/e7423d3a707eff1b3014ee090dea78d7ea6e2e7e))

## [1.12.0](https://github.com/Gogorichielab/PPCollection/compare/v1.11.5...v1.12.0) (2026-03-07)

### Features

* enhance UI and UX across various pages, add delete confirmation modal behavior ([4eff7c8](https://github.com/Gogorichielab/PPCollection/commit/4eff7c80e26e43dbe04767805831242f431c0c13))
* migrate from csurf to csrf-csrf package ([e37ea9d](https://github.com/Gogorichielab/PPCollection/commit/e37ea9d2ee9e1454272b211f66d099e2a8413d7c))

### Bug Fixes

* resolve GET /login 500 error and authentication cascade failures ([74c992d](https://github.com/Gogorichielab/PPCollection/commit/74c992d5b0dd6c2d46d9b4307707fcc295795bc9))
* update vulnerable dev dependencies via npm audit fix ([bbcfdfd](https://github.com/Gogorichielab/PPCollection/commit/bbcfdfd79e0f2ea75cc79e6dde8cd65ea55872ce))

### Documentation

* add Claude project instructions for context and guidance ([3198adf](https://github.com/Gogorichielab/PPCollection/commit/3198adff6e33aa468debb6200c6d59a6ccee99ce))
* add comprehensive TOIL reduction analysis and recommendations ([46204a9](https://github.com/Gogorichielab/PPCollection/commit/46204a96f129344e36e8f448b0b3d362fa7355ed))
* add Principal Advisor role and interaction model guidelines to AGENTS.md ([8bd3b6e](https://github.com/Gogorichielab/PPCollection/commit/8bd3b6e7d8006b9ce3d93cab138ea4f897ef05c4))
* **ui:** expand UI engineer guidance for audit deliverables ([639529d](https://github.com/Gogorichielab/PPCollection/commit/639529d0e7f6b0b64a9d7ded19c597e8173c4701))
* update architecture and coding practices in AGENTS.md ([15a5e5b](https://github.com/Gogorichielab/PPCollection/commit/15a5e5b4a3638f134533ae191958744e1dcc5c43))
* update documentation guidelines for user-facing features ([b0e9bdb](https://github.com/Gogorichielab/PPCollection/commit/b0e9bdb7e09c0fdbbff0216975275fbacb7efec8))
* update documentation to reflect current codebase structure ([0b496d8](https://github.com/Gogorichielab/PPCollection/commit/0b496d8c929e1be5c9e083e569e6a9e69324b242))
* update marketing site with current screenshots and new features ([12e34b8](https://github.com/Gogorichielab/PPCollection/commit/12e34b8ab73fb398ad25cb2caf6751e171f102d3))

### Styles

* remove all inline styles from EJS templates ([c4a38cd](https://github.com/Gogorichielab/PPCollection/commit/c4a38cd2a2ee2e016195293609a3e8cf2eac0244))

### Build System

* **deps:** bump node from 22-alpine to 25-alpine ([aecb7ef](https://github.com/Gogorichielab/PPCollection/commit/aecb7efea4176487904f320e34bc9d66867cc2b6))

### Continuous Integration

* add claude/* branch cleanup to Auto-cleanup-feature-branches workflow ([7e4dade](https://github.com/Gogorichielab/PPCollection/commit/7e4dade47b5062c04fc057eee557f1e7197b5bda))
* **deps:** bump actions/upload-artifact from 4 to 7 ([8d8423a](https://github.com/Gogorichielab/PPCollection/commit/8d8423a492f4c61b87e2c44538b3ca3137760c05))
* **deps:** bump actions/upload-pages-artifact from 3 to 4 ([3e2b411](https://github.com/Gogorichielab/PPCollection/commit/3e2b411bbf8527326c91833e0211fdeaba6ba144))

## [1.11.5](https://github.com/Gogorichielab/PPCollection/compare/v1.11.4...v1.11.5) (2026-02-21)

### Bug Fixes

* update footer to include USA attribution ([2a0ea45](https://github.com/Gogorichielab/PPCollection/commit/2a0ea45880f4bc4adf554cef4a5942dd69349dee))

## [1.11.4](https://github.com/Gogorichielab/PPCollection/compare/v1.11.3...v1.11.4) (2026-02-21)

### Bug Fixes

* update footer text to reflect USA attribution ([8fd5915](https://github.com/Gogorichielab/PPCollection/commit/8fd5915e2327300d9c73e5f7a62b34bd33bf846c))

## [1.11.3](https://github.com/Gogorichielab/PPCollection/compare/v1.11.2...v1.11.3) (2026-02-21)

### Bug Fixes

* add footer with attribution to Gogorichie Lab ([9d262a7](https://github.com/Gogorichielab/PPCollection/commit/9d262a784db6f6778122304c1dac63364096f643))

## [1.11.2](https://github.com/Gogorichielab/PPCollection/compare/v1.11.1...v1.11.2) (2026-02-21)

### Bug Fixes

* add workflow_dispatch trigger to deploy workflow ([8cae1a7](https://github.com/Gogorichielab/PPCollection/commit/8cae1a73be9da463a26158b6ee5b45cfe939ba23))

## [1.11.1](https://github.com/Gogorichielab/PPCollection/compare/v1.11.0...v1.11.1) (2026-02-21)

### Bug Fixes

* remove unnecessary fetch depth in deploy workflow ([19cbb55](https://github.com/Gogorichielab/PPCollection/commit/19cbb5517e145351307442402cb1b51cd9e012c8))

## [1.11.0](https://github.com/Gogorichielab/PPCollection/compare/v1.10.2...v1.11.0) (2026-02-21)

### Features

* add documentation for technical writer, UI engineer, and code review guidelines copilot agents ([298c116](https://github.com/Gogorichielab/PPCollection/commit/298c116765500bcf44ecfdd489ccd7e57cc5e191))
* add initial HTML structure for Pew Pew Collection github page ([5a13d7d](https://github.com/Gogorichielab/PPCollection/commit/5a13d7d7610a6adc8e71e49a8b154988b64052fa))
* **auth:** add profile management page ([530c28c](https://github.com/Gogorichielab/PPCollection/commit/530c28cd276b8ac6762f3c397a953ea481cd15cb))
* update hero image and add GitHub Pages deployment workflow ([a8e2512](https://github.com/Gogorichielab/PPCollection/commit/a8e25123248ac0e15c4d24a7078de5a93d4c2c12))

### Bug Fixes

* **home:** refine hero layout and repair dashboard styles ([9955f5b](https://github.com/Gogorichielab/PPCollection/commit/9955f5ba84208be07c54c6448bb6d746afb0e75a))
* **license:** update license information to GNU GPL v3 in documentation ([b6c7ae3](https://github.com/Gogorichielab/PPCollection/commit/b6c7ae31191532b6ee949b54e7e6907c78ee4c0b))

### Documentation

* add comprehensive modal verification report ([67955ce](https://github.com/Gogorichielab/PPCollection/commit/67955ce05d82944ccc582733da672b6c588af103))
* add investigation report for delete modal positioning ([2b2c047](https://github.com/Gogorichielab/PPCollection/commit/2b2c04738b334350fd6c04fe43a3d2674f4ec562))
* refresh screenshots ([f357ac6](https://github.com/Gogorichielab/PPCollection/commit/f357ac6e9238a19e2fe792e64533899674c8400f))
* update README to document recent frontend features ([509b994](https://github.com/Gogorichielab/PPCollection/commit/509b99460b06ee077a6ff6b3b1c0c5d5c0c99200))

### Styles

* **auth:** redesign profile settings into two-column card grid ([78a96b6](https://github.com/Gogorichielab/PPCollection/commit/78a96b6b0a1c55e037827138d50d8366078e0f41))

### Code Refactoring

* **home:** extract magic number into named constant ([ecd8845](https://github.com/Gogorichielab/PPCollection/commit/ecd8845d727b2132536fbbbdf9fd6c6ba97900da))
* **migrate:** remove ensureLegacyColumns tech debt ([a881ac7](https://github.com/Gogorichielab/PPCollection/commit/a881ac77c2f478e813a09dfae8d3cd39264829a1))

## [1.10.2](https://github.com/Gogorichielab/PPCollection/compare/v1.10.1...v1.10.2) (2026-02-20)

### Bug Fixes

* **firearms:** fix detail page layout overflow and notes placement ([77467b1](https://github.com/Gogorichielab/PPCollection/commit/77467b1b2b5d4688a40e30ce843f0aa27a62e2fe))
* **firearms:** fix detail page layout overflow and notes placement ([30d73e4](https://github.com/Gogorichielab/PPCollection/commit/30d73e492f3063ffa294664a25024ac645c705ba))

## [1.10.1](https://github.com/Gogorichielab/PPCollection/compare/v1.10.0...v1.10.1) (2026-02-18)

### Bug Fixes

* add CSRF token to logout form to prevent forbidden error ([eded73f](https://github.com/Gogorichielab/PPCollection/commit/eded73f8f61e678925993cfcda8f191fec488ae0))

## [1.10.0](https://github.com/Gogorichielab/PPCollection/compare/v1.9.1...v1.10.0) (2026-02-18)

### Features

* **auth:** add server-side theme persistence ([8c3f0b5](https://github.com/Gogorichielab/PPCollection/commit/8c3f0b53e880ea51f4da7cfea2a1a131d14376b1))
* **firearms:** add pagination to firearms list with 25 items per page ([5ce49b4](https://github.com/Gogorichielab/PPCollection/commit/5ce49b4c6a457b050f8527311a220e845e34b300))
* **firearms:** add status and type columns to inventory table ([533dc3c](https://github.com/Gogorichielab/PPCollection/commit/533dc3cfbebfc30ffa7137b17bb8a8512b8443f4))
* **firearms:** add validation to update action and display errors in edit form ([85b5eb6](https://github.com/Gogorichielab/PPCollection/commit/85b5eb6e2b732ec1f0f867a422cdbbbfb4cdc04c))
* **firearms:** replace window.confirm with modal for delete confirmation ([2628b05](https://github.com/Gogorichielab/PPCollection/commit/2628b0524b272df6be27985b9ec419fc4e1856aa))
* **ui:** make inventory table rows fully clickable ([229cbb4](https://github.com/Gogorichielab/PPCollection/commit/229cbb4dd0a33be262c760fba2be9099acac38c0))
* **views:** add dynamic page titles for all pages ([c55a9c8](https://github.com/Gogorichielab/PPCollection/commit/c55a9c876c79da09ee1f6c09ac93e654e01e110b))

### Bug Fixes

* **auth:** add CSRF token to layout for theme toggle ([a847c58](https://github.com/Gogorichielab/PPCollection/commit/a847c581ed4e46bfae5162e086083206e04e5e9d))
* **firearms:** render friendly 404 page for show, showEdit, and update actions ([6f9f3eb](https://github.com/Gogorichielab/PPCollection/commit/6f9f3eb18c364d23f179eebe053db9c1e4becbde))
* **firearms:** validate required fields on create form ([9d400d1](https://github.com/Gogorichielab/PPCollection/commit/9d400d1dc7d82334849f26339670104d10eeadbb))
* **styles:** resolve mobile media-query conflict and test syntax ([2a4e9e7](https://github.com/Gogorichielab/PPCollection/commit/2a4e9e790941c65b0f5d558cbd4a0a6ebf142677))
* **tests:** close firearms integration test block ([2503dd4](https://github.com/Gogorichielab/PPCollection/commit/2503dd4af4fb7b9493dbde088c489e9ab6cf46b2))
* **tests:** close status/type integration test block ([48361d1](https://github.com/Gogorichielab/PPCollection/commit/48361d1a6f479f3f2dc859a86507dea6fd70d7c9))

### Documentation

* update README to mention theme persistence ([a57a06d](https://github.com/Gogorichielab/PPCollection/commit/a57a06d23a2fb154d83bc9b9f6fc3733c9977499))

### Styles

* add mobile grid overrides for single-column form layout ([ae3d469](https://github.com/Gogorichielab/PPCollection/commit/ae3d469fa46086fa24e4296bf01394c568750334))
* **mobile:** add min-height 44px to buttons for touch accessibility ([5adb2ad](https://github.com/Gogorichielab/PPCollection/commit/5adb2adfebbe685e98df26115b922f958ad8d7ad))
* **mobile:** fix inventory table overflow on mobile viewports ([5c20e0b](https://github.com/Gogorichielab/PPCollection/commit/5c20e0beb3f87b393db851054fc7ad79c416c912))
* **mobile:** reduce container padding to 16px on small screens ([9f1e98f](https://github.com/Gogorichielab/PPCollection/commit/9f1e98f29f633ef0bb454e2e7d4b8d9e99e81709))
* **mobile:** stack action bar buttons on small screens ([10d21ee](https://github.com/Gogorichielab/PPCollection/commit/10d21ee9fc99e37125ebda0c58e16c92737f118e))

### Tests

* **auth:** add tests for theme persistence ([c53bf6e](https://github.com/Gogorichielab/PPCollection/commit/c53bf6e32719f8008adbf3143467dcfe4488c12f))
* **auth:** close integration test block for theme toggle ([9315fee](https://github.com/Gogorichielab/PPCollection/commit/9315feed2aad6fbad32bfc1df247854b969a396b))
* **firearms:** add integration tests for pagination functionality ([462dec9](https://github.com/Gogorichielab/PPCollection/commit/462dec9ae4fe9df2005ee130ccfd02e0f20435c7))
* **firearms:** deduplicate 404 page assertions in integration tests ([3fb1cac](https://github.com/Gogorichielab/PPCollection/commit/3fb1cacdf6cc04e7ee65d5bde241332d60ffdabd))

## [1.9.1](https://github.com/Gogorichielab/PPCollection/compare/v1.9.0...v1.9.1) (2026-02-18)

### Bug Fixes

* add CSRF tokens to all forms and update tests ([eabd6e0](https://github.com/Gogorichielab/PPCollection/commit/eabd6e086abdb14a63ff7da127ff2d942394bb21))
* **deps:** sync lockfile for csurf dependency ([c0f2328](https://github.com/Gogorichielab/PPCollection/commit/c0f232885d0df355e50265fc57a4c9e7230f75d8))

## [1.9.0](https://github.com/Gogorichielab/PPCollection/compare/v1.8.3...v1.9.0) (2026-02-18)

### Features

* implement password change infrastructure with bcrypt ([0ddbf26](https://github.com/Gogorichielab/PPCollection/commit/0ddbf263acf5c4cc75f72e50488af93d9b97965e))
* initial plan for forced password change on first login ([7b8e7e4](https://github.com/Gogorichielab/PPCollection/commit/7b8e7e4b125a894bf28b3cbf5e8ed457ccbd7165))

### Documentation

* update README to reflect bcrypt password hashing and forced password change ([34fbcec](https://github.com/Gogorichielab/PPCollection/commit/34fbcec6dd755b3900194326b5c250a138144d59))

### Styles

* remove unnecessary eslint-disable comment ([8190219](https://github.com/Gogorichielab/PPCollection/commit/8190219a9ad34aaa46093d59d057f0cbb5fe2923))

### Tests

* add comprehensive tests for password change functionality ([1e327b0](https://github.com/Gogorichielab/PPCollection/commit/1e327b0eb35684508b1991c7bfe699da51a057f9))

## [1.8.3](https://github.com/Gogorichielab/PPCollection/compare/v1.8.2...v1.8.3) (2026-02-18)

### Bug Fixes

* **ci:** add category to Hadolint SARIF upload to prevent conflicts with default CodeQL ([7203e16](https://github.com/Gogorichielab/PPCollection/commit/7203e161feb8686938c8ba6641a393e2b0d5c5b0))

## [1.8.2](https://github.com/Gogorichielab/PPCollection/compare/v1.8.1...v1.8.2) (2026-02-17)

### Build System

* **deps:** bump node from 20-alpine to 25-alpine ([686308c](https://github.com/Gogorichielab/PPCollection/commit/686308ca634d2f5b49351eda42abbfbb492031b1))

### Continuous Integration

* **deps:** bump actions/checkout from 4 to 6 ([2b7b962](https://github.com/Gogorichielab/PPCollection/commit/2b7b9627aba08a5d21fc7007e25e8b7e839ff0b6))
* **deps:** bump github/codeql-action from 3 to 4 ([e890c3e](https://github.com/Gogorichielab/PPCollection/commit/e890c3ec27a85febc34fe0df89fd20cc9fc585ef))

## [1.8.1](https://github.com/Gogorichielab/PPCollection/compare/v1.8.0...v1.8.1) (2025-11-26)


### Bug Fixes

* update delete-merged-branch action to v2 with error handling ([8e72982](https://github.com/Gogorichielab/PPCollection/commit/8e72982e1bd7f8dea5237a8e5e7e3e5652e3a020))


### Code Refactoring

* remove hero section from login page ([b218efa](https://github.com/Gogorichielab/PPCollection/commit/b218efa4ee26d086546fb9fbae7cb9792d54e42c))

## [1.8.0](https://github.com/Gogorichielab/PPCollection/compare/v1.7.1...v1.8.0) (2025-11-26)


### Features

* Add helper text and accessibility improvements to firearm form fields ([3625f2f](https://github.com/Gogorichielab/PPCollection/commit/3625f2fcec72205f8c986b30e43675aa8df7b937))
* add multi-select firearm filters ([e9cb9f1](https://github.com/Gogorichielab/PPCollection/commit/e9cb9f152c829c7e1c09f0c33fb7e9350095618a))
* improve firearm detail layout ([1af16ab](https://github.com/Gogorichielab/PPCollection/commit/1af16ab95a00dee800e07dd98a2bef2c1be58681))

## [1.7.1](https://github.com/Gogorichielab/PPCollection/compare/v1.7.0...v1.7.1) (2025-11-26)


### Documentation

* initial plan for README update ([2cf135c](https://github.com/Gogorichielab/PPCollection/commit/2cf135c6bc2c10302fa5cccb7903d35caa602451))
* update Overview section with current feature set ([862e184](https://github.com/Gogorichielab/PPCollection/commit/862e1844f3a886f8e5a7920149b559af1e790876))
* update README with current features and accurate screenshots ([3440280](https://github.com/Gogorichielab/PPCollection/commit/344028018e596ac795dba665f91d5217cb1885c8))

## [1.7.0](https://github.com/Gogorichielab/PPCollection/compare/v1.6.1...v1.7.0) (2025-11-26)


### Features

* add "Report Issue" link to navigation ([1a7aac4](https://github.com/Gogorichielab/PPCollection/commit/1a7aac48f22e370d4179d3bba50363b94c78a243))


### Bug Fixes

* update title and header to use full name "Pew Pew Collection" ([5972c84](https://github.com/Gogorichielab/PPCollection/commit/5972c846c2fd701f5ab952bdd0aa13f6718c65a3))

## [1.6.1](https://github.com/Gogorichielab/PPCollection/compare/v1.6.0...v1.6.1) (2025-11-26)


### Code Refactoring

* update section titles for consistency in inventory view ([fc77de2](https://github.com/Gogorichielab/PPCollection/commit/fc77de29656e5b0d0a523b9ed572ea59d82b4031))

## [1.6.0](https://github.com/Gogorichielab/PPCollection/compare/v1.5.4...v1.6.0) (2025-11-26)


### Features

* update firearm page with new fields and dropdowns ([5a39864](https://github.com/Gogorichielab/PPCollection/commit/5a39864dba10345b920f0a0a224ee3067f8cd5bb))


### Bug Fixes

* improve null handling and error handling based on code review ([6cfd359](https://github.com/Gogorichielab/PPCollection/commit/6cfd359797804f39ffca8fd43288d210a1498250))

## [1.5.4](https://github.com/Gogorichielab/PPCollection/compare/v1.5.3...v1.5.4) (2025-11-26)


### Documentation

* fix command substitution in README examples ([f85fb64](https://github.com/Gogorichielab/PPCollection/commit/f85fb64a507460ff40798ec54deea4b045a57018))
* update README to reflect current application functionality ([f0f46a6](https://github.com/Gogorichielab/PPCollection/commit/f0f46a6354e157fec6d0eda48bb7546832c0fe23))

## [1.5.1](https://github.com/Gogorichielab/PPCollection/compare/v1.5.0...v1.5.1) (2025-11-24)


### Documentation

* Address code review feedback on README ([1f8676a](https://github.com/Gogorichielab/PPCollection/commit/1f8676a7cc982d67da625e4d175a378cbae0739d))
* Comprehensively update README with detailed documentation ([1cc88cf](https://github.com/Gogorichielab/PPCollection/commit/1cc88cf74ff06923d2947cf1f26d75089ab83fe0))
* Fix minor formatting issues in README ([5589e06](https://github.com/Gogorichielab/PPCollection/commit/5589e060be22df47dee3e3492d40029c252a207f))


### Continuous Integration

* **deps:** bump actions/ai-inference from 1 to 2 ([6401398](https://github.com/Gogorichielab/PPCollection/commit/6401398fc49a5a9a2c406645253f769d5ef055b8))
* **deps:** bump actions/checkout from 4 to 5 ([003c1bc](https://github.com/Gogorichielab/PPCollection/commit/003c1bc527465590fb05d9cace6604619f976b36))
* **deps:** bump actions/checkout from 5 to 6 ([54a0410](https://github.com/Gogorichielab/PPCollection/commit/54a0410deef43ecf4627360cfb1f80ee4976dd3b))

# [1.5.0](https://github.com/Gogorichielab/PPCollection/compare/v1.4.0...v1.5.0) (2025-11-17)


### Features

* add Bootstrap Icons to key actions (add, edit, delete, export) ([1216e6b](https://github.com/Gogorichielab/PPCollection/commit/1216e6bfd4adde53d350e16156a17f4e5250ff6f))

# [1.4.0](https://github.com/Gogorichielab/PPCollection/compare/v1.3.1...v1.4.0) (2025-11-17)


### Features

* add first-time login credential change requirement ([bd3fecd](https://github.com/Gogorichielab/PPCollection/commit/bd3fecd755e731226fef928c88ec57ec3550f385))

## [1.3.1](https://github.com/Gogorichielab/PPCollection/compare/v1.3.0...v1.3.1) (2025-11-16)


### Bug Fixes

* restore default admin password ([3dd2e7d](https://github.com/Gogorichielab/PPCollection/commit/3dd2e7dd96eb83e7ae405de1cc4ab290f946867b))

# [1.3.0](https://github.com/Gogorichielab/PPCollection/compare/v1.2.0...v1.3.0) (2025-11-15)

No notable changes documented for this release.

# [1.2.0](https://github.com/Gogorichielab/PPCollection/compare/v1.1.0...v1.2.0) (2025-11-03)


### Bug Fixes

* add missing loginLimiter import in auth route ([0f4572a](https://github.com/Gogorichielab/PPCollection/commit/0f4572ab035232b36b3a9cd29b732f65e16339c9))


### Features

* add spreadsheet export functionality for firearms library ([1fe9f1b](https://github.com/Gogorichielab/PPCollection/commit/1fe9f1b551f4677976d5b5feeb7cc9251b5bef81))

# [1.1.0](https://github.com/Gogorichielab/PPCollection/compare/v1.0.0...v1.1.0) (2025-11-02)


### Bug Fixes

* Improve empty string and zero value handling in price validation ([3b85018](https://github.com/Gogorichielab/PPCollection/commit/3b850187b2783c4e9b27f717a3c27c6c86f7be17))
* make Docker job depend on release job for proper semver tagging ([bf9e71e](https://github.com/Gogorichielab/PPCollection/commit/bf9e71e2730345cb90460c1cab6e5fe12d9013a8))
* preserve zero price on firearm form ([9dd6218](https://github.com/Gogorichielab/PPCollection/commit/9dd621856ce02d9137a62a0ff52eecf25bf22bee))
* simplify semantic-release configuration ([d523ec6](https://github.com/Gogorichielab/PPCollection/commit/d523ec69a913654ea703b6a6cb3c9df4d09d26b0))


### Features

* add firearm details view template ([98d6261](https://github.com/Gogorichielab/PPCollection/commit/98d62618e07a230250656d13ea9c8c4b765b7d6e))
* Add Joi validation schema to strengthen input sanitization ([0c54cdf](https://github.com/Gogorichielab/PPCollection/commit/0c54cdf490a317b04d2a2b3c88e82d9459dc7a45))
* implement local web app for firearm cataloging with Docker support ([73ad9a7](https://github.com/Gogorichielab/PPCollection/commit/73ad9a7502c86dfce3bc593d45782b9d38aea214))

## 1.0.0 (2025-10-30)


### Features

* add CI/CD pipeline with semantic versioning and automated releases ([1897866](https://github.com/Gogorichielab/PPCollection/commit/189786631f30de347898a5597012da458808f6b3))


### Bug Fixes

* disable npm publishing to resolve invalid npm token error ([9b31138](https://github.com/Gogorichielab/PPCollection/commit/9b3113815d8859626f91d89aed22af7d5c58796a))


### Documentation

* add comprehensive pipeline examples and improve README ([f66ec27](https://github.com/Gogorichielab/PPCollection/commit/f66ec27dfe276d37467cd07b1114fcbecbb78925))
* fix shell escaping in commit examples and add PR template ([ebac9de](https://github.com/Gogorichielab/PPCollection/commit/ebac9de7c6cd15f4ba8f94794fa92f616259fb63))
