#!/bin/bash

set -euo pipefail

readonly tab=$'\t'
readonly filename=CONTRIBUTORS.tsv

sort_output() {
	sort --stable --unique --field-separator="$tab" --key=2
}

strip() {
	sed \
		-e '/\[bot\]/Id' \
		-e '/github *actions/Id' \
		-e '/^ *$/d' \
		-e 's/@/ at /g' \
		-e 's/\./ dot /g'
}

main() {
	local -r old_data=$(cat -- "$filename" 2>/dev/null | sed '1d')
	local -r new_data=$(git log --pretty="%an${tab}<%ae>%n%cn${tab}<%ce>")
	{
		echo "Author${tab}Email"
		{
			echo "$old_data"
			echo "$new_data"
		} | strip | sort_output
	} > "$filename"
}

main
