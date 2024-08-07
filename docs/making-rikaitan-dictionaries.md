# Making Rikaitan Dictionaries　<!-- omit in toc -->

This document provides an overview on how to create your own Rikaitan dictionary.

- [Read the Schemas](#read-the-schemas)
- [Packaging A Dictionary](#packaging-a-dictionary)
- [Examples](#examples)
- [Schema Validation](#schema-validation)
- [Conjugation](#conjugation)
- [Tag Categories](#tag-categories)

## Read the Schemas

Familiarity with the [Rikaitan schemas](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas) is essential. These schemas define the structure of Rikaitan dictionaries. Helpful resources for interpreting JSON schemas include [codebeautify](https://codebeautify.org/jsonviewer/), [json-schema-viewer](https://json-schema-viewer.vercel.app/), and [jsonhero](https://jsonhero.io/).

Below is a list of Rikaitan dictionary schemas, their expected filenames, and their usage:

| Schema                                                                                                                                                      | Expected Filename                | Usage                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| [`dictionary-index-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-index-schema.json)                           | `index.json`                     | Metadata about the dictionary. Please include as much detail as possible.              |
| [`dictionary-kanji-bank-v3-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-kanji-bank-v3-schema.json)           | `kanji_bank_${number}.json`      | Information used in the kanji viewer - meanings, readings, statistics, and codepoints. |
| [`dictionary-kanji-meta-bank-v3-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-kanji-meta-bank-v3-schema.json) | `kanji_meta-bank_${number}.json` | Stores kanji frequency data.                                                           |
| [`dictionary-tag-bank-v3-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-tag-bank-v3-schema.json)               | `tag_bank_${number}.json`        | Defines tags for kanji and term dictionaries, like parts of speech or kanken level.    |
| [`dictionary-term-bank-v3-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-term-bank-v3-schema.json)             | `term_bank_${number}.json`       | Stores dictionary readings, definitions, etc.                                          |
| [`dictionary-term-meta-bank-v3-schema.json`](https://github.com/Ajatt-Tools/rikaitan/tree/main/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json)   | `term_meta_bank_${number}.json`  | Stores meta information about terms, such as frequency data and pitch accent data.     |

## Adding Custom CSS

You can add custom CSS to a dictionary simply by adding a `styles.css` file to the root of the dictionary zip archive. This file will be loaded by Rikaitan and applied to the dictionary viewer with the styles scoped to the dictionary. For example, observe the `styles.css` file in the [official test dictionary](https://github.com/Ajatt-Tools/rikaitan/tree/main/test/data/dictionaries/valid-dictionary1).

## Packaging A Dictionary

A dictionary can contain various types of information within the zip file. After creating an `index.json` and the relevant data files, zip them with all data `.json` files in the root directory of the zip, not in subfolders. Use the highest compression level possible to reduce the size.

## Examples

- The [official test dictionary](https://github.com/Ajatt-Tools/rikaitan/tree/main/test/data/dictionaries/valid-dictionary1) showcases the full range of features available in Rikaitan dictionaries.

## Schema Validation

To validate schemas, configure [VSCode](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings) to validate schemas or use a website such as [jsonschemavalidator](https://www.jsonschemavalidator.net/).

For VSCode validation, use the following settings JSON:

```json
  "json.schemas": [
    {
      "fileMatch": ["kanji_bank_*.json"],
      "url": "https://github.com/Ajatt-Tools/rikaitan/raw/main/ext/data/schemas/dictionary-kanji-bank-v3-schema.json"
    },
    {
      "fileMatch": ["kanji_meta_bank_*.json"],
      "url": "https://github.com/Ajatt-Tools/rikaitan/raw/main/ext/data/schemas/dictionary-kanji-meta-bank-v3-schema.json"
    },
    {
      "fileMatch": ["tag_bank_*.json"],
      "url": "https://github.com/Ajatt-Tools/rikaitan/raw/main/ext/data/schemas/dictionary-tag-bank-v3-schema.json"
    },
    {
      "fileMatch": ["term_bank_*.json"],
      "url": "https://github.com/Ajatt-Tools/rikaitan/raw/main/ext/data/schemas/dictionary-term-bank-v3-schema.json"
    },
    {
      "fileMatch": ["term_meta_bank_*.json"],
      "url": "https://github.com/Ajatt-Tools/rikaitan/raw/main/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json"
    }
  ],
```

## Conjugation

For Rikaitan to conjugate Japanese terms, they need the appropriate part of speech tag. The part of speech labels are documented on the [official JMDict page](http://www.edrdg.org/jmdictdb/cgi-bin/edhelp.py?svc=jmdict&sid=#kw_pos). For other languages, find the part of speech tags in `ext/js/language/{language}/{language}-transforms.js` under the `conditions` label, for labels that aren't prefixed with "Intermediate".

## Tag Categories

The second item in the array of the tag bank schema determines the tag category, affecting the tag color in the user interface. The categories include:

- name
- expression
- popular
- frequent
- archaism
- dictionary
- frequency
- partOfSpeech
- search
- pronunciation-dictionary
- search

You can view the tag colors [here](https://github.com/Ajatt-Tools/rikaitan/blob/e60ec04b262301caaee0ecc9289ad5c3ddd15d7d/ext/css/display.css#L136-L149).

# Community Contributions

If you have any questions, need help, or want to share a new dictionary, feel free to pop in the [Rikaitan Matrix space](https://tatsumoto.neocities.org/blog/join-our-community). We're happy to help you get started!
