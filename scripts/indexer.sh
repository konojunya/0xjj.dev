#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"
ADMIN_INDEX_KEY="${ADMIN_INDEX_KEY:-}"

if [[ -z "$ADMIN_INDEX_KEY" ]]; then
  echo "❌ ADMIN_INDEX_KEY is not set"
  echo "   export ADMIN_INDEX_KEY=xxxx"
  exit 1
fi

CMD="${1:-}"
SLUG="${2:-}"

usage() {
  cat <<EOF
Usage:
  ./scripts/index-blog.sh one <slug>
  ./scripts/index-blog.sh all

Env:
  BASE_URL=http://localhost:5173        (default)
  ADMIN_INDEX_KEY=<admin key>           (required)

Examples:
  ADMIN_INDEX_KEY=xxx ./scripts/index-blog.sh one technology-behind-iroiro
  ADMIN_INDEX_KEY=xxx ./scripts/index-blog.sh all
EOF
}

if [[ -z "$CMD" ]]; then
  usage
  exit 1
fi

case "$CMD" in
  one)
    if [[ -z "$SLUG" ]]; then
      echo "❌ slug is required"
      usage
      exit 1
    fi

    echo "🚀 indexing blog: $SLUG"
    curl -sS -X POST \
      "$BASE_URL/internal/index/blog/$SLUG" \
      -H "X-Admin-Key: $ADMIN_INDEX_KEY" \
      -H "content-type: application/json" \
      -H "Accept-Encoding: identity"
    echo
    ;;

  all)
    echo "🚀 reindexing all blogs"
    curl -sS -X POST \
      "$BASE_URL/internal/index/blog" \
      -H "X-Admin-Key: $ADMIN_INDEX_KEY" \
      -H "content-type: application/json" \
      -H "Accept-Encoding: identity"
    echo
    ;;

  *)
    echo "❌ unknown command: $CMD"
    usage
    exit 1
    ;;
esac