#!/usr/bin/env bash
set -euo pipefail
umask 077
export PATH="$PATH:/snap/bin:/usr/local/bin"

TAG="${1:?pakai: deploy.sh <image-tag>}"
cd "$(dirname "$0")"

set -a
source ./deploy.env
set +a

if [[ -n "${ENV_SSM_PARAM:-}" ]]; then
  aws ssm get-parameter --region "$AWS_REGION" --name "$ENV_SSM_PARAM" --with-decryption \
    --query Parameter.Value --output text > app.env.tmp
  mv app.env.tmp app.env
fi
[[ -f app.env ]] || { echo "app.env tidak ditemukan" >&2; exit 1; }

if [[ "${REGISTRY:-}" == *".dkr.ecr."* ]]; then
  aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"
fi

export IMAGE_TAG="$TAG"
compose() { docker compose -f compose.yml "$@"; }

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  echo "==> Pull image $TAG"
  compose pull app migrate
fi

echo "==> Database"
compose up -d db
compose run --rm migrate

echo "==> Aplikasi"
compose up -d --wait app
compose up -d caddy

echo "$TAG" > CURRENT_TAG
docker image prune -f --filter "until=168h" >/dev/null
echo "==> Selesai: $(compose exec -T app wget -qO- http://127.0.0.1:3000/api/health)"
