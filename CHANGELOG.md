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
