#!/bin/bash

set -euo pipefail

readonly tab=$'\t'
readonly filename=CONTRIBUTORS
readonly old_data=$(cat -- "$filename" 2>/dev/null | sed '1d')
readonly new_data=$(git log --pretty="%an${tab}<%ae>%n%cn${tab}<%ce>")

sort_output() {
	sort -u -t "$tab" -k2
}

strip() {
	sed \
		-e '/^ *$/d' \
		-e 's/@/ at /g' \
		-e 's/\./ dot /g'
}

{
	echo "Author${tab}Email"
	{
		echo "$old_data"
		echo "$new_data"
	} | strip | sort_output
} > "$filename"
