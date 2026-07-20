#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
git -C "$ROOT" config core.hooksPath .githooks
echo "Git hooks enabled from $ROOT/.githooks"
