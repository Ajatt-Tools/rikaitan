# Rikaitan <!-- omit from toc -->

[![Firefox release](https://img.shields.io/badge/Firefox-Release-orange.svg)](https://addons.mozilla.org/en-US/firefox/addon/rikaitan/)
[![Chromium release](https://img.shields.io/badge/Chromium-Release-blue.svg)](https://chromewebstore.google.com/detail/rikaitan/pnjdahdadbkhcfamabafkjbjblbgkodk)
[![Chat](https://img.shields.io/badge/chat-join-green.svg)](https://tatsumoto-ren.github.io/blog/join-our-community.html)

## Project Introduction

:wave: This project is a community-driven fork of Yomichan.
The original developer quit and deleted Yomichan from extension stores.
Our primary objective is to maintain the project,
ensuring it remains functional on the most recent browser versions
and that any bugs are fixed.

As requested by the original creator, the project has been given a new name:
Rikaitan, in the style of the previous name.

## Contributing

Given this is a distributed effort, we wholeheartedly welcome any new
contributors. Please feel free to look through the issue tracker,
or join us on the [DJT Matrix](https://tatsumoto.neocities.org/blog/join-our-community).

## What's Rikaitan?<!-- omit from toc -->

Rikaitan turns your web browser into a tool for building Japanese language literacy
by helping you to decipher texts
which would be otherwise too difficult tackle.
This extension is similar to
[10ten Japanese Reader](https://addons.mozilla.org/en-US/firefox/addon/10ten-ja-reader/) for Firefox and
[Rikaikun](https://chrome.google.com/webstore/detail/rikaikun/jipdnfibhldikgcjhfnomkfpcebammhp?hl=en) for Chrome, but it
stands apart in its goal of being an all-encompassing learning tool
as opposed to a mere browser-based dictionary.

Rikaitan provides advanced features not available in other browser-based dictionaries:

- Interactive popup definition window for displaying search results.
- On-demand audio playback for select dictionary definitions.
- Kanji stroke order diagrams are just a click away for most characters.
- Custom search page for easily executing custom search queries.
- Support for multiple dictionary formats including [EPWING](https://ja.wikipedia.org/wiki/EPWING) via the [Rikaitan Import](https://github.com/Ajatt-Tools/rikaitan-import) tool.
- Automatic note creation for the [Anki](https://apps.ankiweb.net/) flashcard program via the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
- Clean, modern code makes it easy for developers to [contribute](https://github.com/Ajatt-Tools/rikaitan/blob/master/CONTRIBUTING.md) new features.

[![Term definitions](img/ss-terms-thumb.png)](img/ss-terms.png)
[![Kanji information](img/ss-kanji-thumb.png)](img/ss-kanji.png)
[![Dictionary options](img/ss-dictionaries-thumb.png)](img/ss-dictionaries.png)
[![Anki options](img/ss-anki-thumb.png)](img/ss-anki.png)

## Helpful information<!-- omit from toc -->

- [Migrating from Yomichan (legacy)](./docs/yomichan-migration.md#migrating-from-yomichan)
- [Importing standardised and custom dictionaries](./docs/dictionaries.md#dictionaries)
- [Anki integration and flashcards creation](./docs/anki-integration.md#anki-integration)
- [Advanced options, including MeCab](./docs/advanced-options.md#advanced-options)
- [Frequently asked questions](./docs/faq.md#frequently-asked-questions)
- [Keyboard shortcuts](./docs/keyboard-shortcuts.md)

## Installation

Rikaitan is available for
[Firefox](https://wiki.archlinux.org/title/Firefox)-based web browsers
and
[Chromium](https://wiki.archlinux.org/title/Chromium)-based web browsers.
We recommend [LibreWolf](https://librewolf.net/) as your everyday web browser.
[Ungoogled-chromium](https://aur.archlinux.org/packages/ungoogled-chromium) is a good alternative.

**Download from Firefox Browser add-ons:**

[![image](img/firefox-marketplace.png)](https://addons.mozilla.org/en-US/firefox/addon/rikaitan/)

**Download from Chrome Web Store:**

[![image](img/chrome-web-store.png)](https://chromewebstore.google.com/detail/rikaitan/pnjdahdadbkhcfamabafkjbjblbgkodk)

## Basic Usage

1.  Click the <img src="ext/images/rikaitan-icon.svg" width="16" height="16" alt="rikaitan icon"> _Rikaitan_ button in the browser bar to open the quick-actions popup.

    <img src="resources/images/browser-action-popup1.png" alt="rikaitan main popup">

    - The <img src="ext/images/cog.svg" width="16" height="16" alt="cog"> _cog_ button will open the Settings page.
    - The <img src="ext/images/magnifying-glass.svg" width="16" height="16" alt="magnifying glass"> _magnifying glass_ button will open the Search page.
    - The <img src="ext/images/question-mark-circle.svg" width="16" height="16" alt="question mark symbol"> _question mark_ button will open the Information page.
    - The <img src="ext/images/profile.svg" width="16" height="16" alt="profile icon"> _profile_ button will appear when multiple profiles exist, allowing the current profile to be quickly changed.

2.  Import the dictionaries you wish to use for term and kanji searches, head over to the [the dictionary docs](./docs/dictionaries.md) to get set up! If you do not have any dictionaries installed or enabled, Rikaitan will warn you that it is not ready for use by displaying an orange exclamation mark over its icon. This exclamation mark will disappear once you have installed and enabled at least one dictionary.

    <img src="resources/images/settings-dictionaries-popup.png" width="300" alt="custom dictionaries list">

3.  Webpage text can be scanned by moving the cursor while holding a modifier key, which is <kbd>Shift</kbd> by default. If definitions are found for the text at the cursor position, a popup window containing term definitions will open. This window can be dismissed by clicking anywhere outside of it.

    <img src="resources/images/search-popup-terms.png" width="300" alt="popup with search terms">

4.  Click on the <img src="ext/images/play-audio.svg" width="16" height="16" alt="loudspeaker icon"> _speaker_ button to hear the term pronounced by a native speaker. If an audio sample is not available, you will hear a short click instead. You can configure the sources used to retrieve audio samples in the options page.

5.  Click on individual kanji in the term definition results to view additional information about those characters, including stroke order diagrams, readings, meanings, as well as other useful data.

    <img src="resources/images/search-popup-kanji.png" width="300" alt="popup with kanji details">

To further enhance your Rikaitan experience,
it's worth [integrating with Anki](./docs/anki-integration.md),
a spaced-repetition flashcard program to help solidify the words you encounter.

## Licenses

Required licensing notices for this project follow below:

- **EDRDG License** \
  This package uses the [EDICT](https://www.edrdg.org/jmdict/edict.html) and
  [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) dictionary files. These files are the property of
  the [Electronic Dictionary Research and Development Group](https://www.edrdg.org/), and are used in conformance with
  the Group's [license](https://www.edrdg.org/edrdg/licence.html).

- **Kanjium License** \
  The pitch accent notation, verb particle data, phonetics, homonyms and other additions or modifications to EDICT,
  KANJIDIC or KRADFILE were provided by Uros Ozvatic through his free database.

## Third-Party Libraries

Rikaitan uses several third-party libraries to function.
Below are links to homepages, snapshots,
and licenses of the exact versions packaged.

| Name                | Installed version | License type | Link                                                     |
| :------------------ | :---------------- | :----------- | :------------------------------------------------------- |
| @zip.js/zip.js      | 2.7.31            | BSD-3-Clause | git+https://github.com/gildas-lormeau/zip.js.git         |
| dexie               | 3.2.4             | Apache-2.0   | git+https://github.com/dfahlander/Dexie.js.git           |
| dexie-export-import | 4.0.7             | Apache-2.0   | git+https://github.com/dexie/Dexie.js.git                |
| handlebars          | 4.7.8             | MIT          | git+https://github.com/handlebars-lang/handlebars.js.git |
| parse5              | 7.1.2             | MIT          | git://github.com/inikulin/parse5.git                     |
| wanakana            | 5.3.1             | MIT          | git+ssh://git@github.com/WaniKani/WanaKana.git           |
