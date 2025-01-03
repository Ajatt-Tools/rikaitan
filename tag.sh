#!/bin/bash
# bash script which tags the current commit with a calver version
# and pushes the tag to the remote repository

# Define color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

case $(git branch --show-current) in
	master|main)
		true
		;;
	*)
		echo -e "${RED}Please only tag commits on master branch.${NC}"
		exit 1
		;;
esac

echo -e "${YELLOW}Checking if branch is up to date...${NC}"

is_changed() {
	git remote update origin
	LANG=C git status -uno | grep -q 'Your branch is behind'
}

if is_changed; then
	echo -e "${RED}Please git pull before tagging.${NC}"
	exit 1
fi

# Ask user to confirm the commit and the tag name
echo -e "${YELLOW}Current HEAD of master branch:${NC}"
git log -1 --decorate
echo

# get the current date in the format YY.MM.DD
DATE=$(date +%y.%-m.%-d)

# Check if the tag already exists and increment if necessary
COUNTER=0
TAG=$DATE.$COUNTER
while git rev-parse "$TAG" >/dev/null 2>&1; do
	# Increment the counter and recreate TAG with DATE
	echo -e "${YELLOW}Tag $TAG already exists, incrementing.${NC}"
	COUNTER=$((COUNTER + 1))
	TAG="$DATE.$COUNTER"
done

echo
echo -e -n "${YELLOW}Tagging current HEAD of master with tag ${TAG}. Are you sure? (y/n): ${NC}"
read -p "" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
	echo -e "${RED}Tagging aborted.${NC}"
	exit 1
fi

git tag -s "$TAG"

echo -e -n "${YELLOW}Do you want to push the tag ${TAG} to the remote repository (which will cause a pre-release to get created)? (y/n): ${NC}"
read -p "" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
	echo -e "${RED}Push aborted.${NC}"
	exit 1
fi

git push origin "$TAG"
