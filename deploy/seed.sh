#!/usr/bin/env bash
set -euo pipefail
export PATH="$PATH:/snap/bin:/usr/local/bin"
cd "$(dirname "$0")"
set -a
source ./deploy.env
set +a
export IMAGE_TAG="$(cat CURRENT_TAG)"
docker compose -f compose.yml run --rm seed
