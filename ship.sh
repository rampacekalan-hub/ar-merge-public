#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

MESSAGE="${1:-Auto update}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Nie si v git repozitári."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Chýba remote 'origin'. Najprv nastav:"
  echo "git remote add origin https://github.com/rampacekalan-hub/ar-merge-public.git"
  exit 1
fi

git add -A

if ! git diff --cached --quiet; then
  git commit -m "$MESSAGE"
else
  echo "Žiadne nové zmeny na commit."
fi

git fetch origin main
git rebase origin/main
git push origin HEAD:main

echo ""
echo "Hotovo: push na main prebehol. Render sa nasadí automaticky (autoDeploy=true)."
