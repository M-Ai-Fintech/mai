#!/bin/sh
set -eu

# Rebuild the project's intentional three-part graph:
# src + gui + tests -> root graphify-out/.

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

if [ "${GRAPHIFY_SKIP_HOOK:-0}" = "1" ]; then
    exit 0
fi

GRAPHIFY_BIN=$(command -v graphify 2>/dev/null || true)
if [ -z "$GRAPHIFY_BIN" ]; then
    echo "[graphify merged hook] graphify not found in PATH; skipping" >&2
    exit 0
fi

# Do not allow two commits/checkouts to overwrite the merged graph concurrently.
LOCK_DIR="$ROOT/graphify-out/.merged-hook.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "[graphify merged hook] rebuild already running; skipping" >&2
    exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT HUP INT TERM

mkdir -p "$ROOT/graphify-out"
echo "[graphify merged hook] updating src, gui and tests"

for PART in src gui tests; do
    if [ -f "$ROOT/$PART/graphify-out/graph.json" ]; then
        "$GRAPHIFY_BIN" update "$ROOT/$PART" --no-cluster --force
    else
        "$GRAPHIFY_BIN" extract "$ROOT/$PART" --code-only --no-cluster
    fi
done

"$GRAPHIFY_BIN" merge-graphs \
    "$ROOT/src/graphify-out/graph.json" \
    "$ROOT/gui/graphify-out/graph.json" \
    "$ROOT/tests/graphify-out/graph.json" \
    --out "$ROOT/graphify-out/graph.json"

# Community labels remain deterministic/placeholders unless explicitly labeled.
"$GRAPHIFY_BIN" cluster-only "$ROOT" --no-label
echo "[graphify merged hook] merged graph updated"
