# Privacy Policy for Rikaitan

Rikaitan data is stored locally on your device. Rikaitan does not sell or externally collect any user data.

Some features require sending data to third party services. These features and what data is sent are detailed below.

## Audio Sources (enabled by default)

Required to play pronunciation audio for terms.

Audio playback may send the **term, reading, and/or language** for any dictionary entry term where the `Play Audio` speaker button is pressed. Personally identifying information is never sent.

The following audio sources are provided by default (availability may vary based on the selected language):

- JPod101: Audio sourced specifically from the Japanese variant of LanguagePod101 https://www.japanesepod101.com/.

- LanguagePod101: Audio sourced from any language available on https://languagepod101.com/.

- Jisho: Audio sourced from https://jisho.org.

- Lingua Libre: Audio from https://lingualibre.org content sourced through the [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php).

- Wiktionary: Audio from https://www.wiktionary.org/ content sourced through the [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php).

Custom audio sources may be configured manually by users to access any URL. A dictionary entry's **term, reading, and/or language** may be configured to be sent to the chosen source.

## Anki (disabled by default)

[Anki](https://wiki.archlinux.org/title/Anki) connectivity is provided through [AnkiConnect](https://ankiweb.net/shared/info/2055492159).

Anki actions may be triggered when a user performs a Rikaitan search or interacts with an Anki feature within Rikaitan.

Rikaitan may send **limited information about the current webpage, information contained in Rikaitan dictionary entries, and/or relevant user settings**.

**Enabling Anki connectivity does not enable sending any webpage information unless explicitly configured to do so.** Only the minimum amount of data is sent and only what is specifically configured by the user.

Webpage information that may be sent is limited to: the term being scanned, the sentence containing the scanned term, the webpage URL, the webpage title, and/or a screenshot of the page.

## Rikaitan API (disabled by default)

Rikaitan provides an option to expose data to other applications through an API.

Local applications may request data from Rikaitan through the Rikaitan API for external use. The Rikaitan API is not accessible by other devices.

## Mecab (disabled by default)

[Mecab](https://taku910.github.io/mecab/) connectivity is available for text parsing. Rikaitan may send **search query text** to Mecab for parsing. Personally identifying information is never sent.

Mecab does not distribute any data; all data stays on your device.
