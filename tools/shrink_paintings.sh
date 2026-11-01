#!/bin/sh
# Re-encode the painted backgrounds for the single-file build.
# Rooms are shown at 1472 px wide (2x the 736 px reference), map quadrants are
# assembled at up to 4096 px wide, so larger originals only add download size.
# usage: tools/shrink_paintings.sh art/painted dist/painted_web
set -e
src=${1:-art/painted}; dst=${2:-dist/painted_web}
mkdir -p "$dst"
for f in "$src"/*; do
  case "$f" in *.png|*.jpg|*.jpeg|*.webp) ;; *) continue;; esac
  b=$(basename "$f"); b=${b%.*}
  case "$b" in
    map_*) convert "$f" -resize '4096x>' -quality 85 "$dst/$b.webp" ;;
    *)     convert "$f" -resize '1472x>' -quality 88 "$dst/$b.webp" ;;
  esac
done
du -sh "$dst"
