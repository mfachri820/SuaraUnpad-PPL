#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PATH="$PATH:/snap/bin:/usr/local/bin"

TAG="${1:?pakai: deploy.sh <image-tag>}"
cd "$(dirname "$0")"

set -a
source ./deploy.env
set +a

if [[ -n "${ENV_SSM_PARAM:-}" ]]; then
  APP_ENV_CONTENT="$(aws ssm get-parameter --region "$AWS_REGION" --name "$ENV_SSM_PARAM" --with-decryption \
    --query Parameter.Value --output text)"
  if ! grep -q '^DATABASE_URL=' <<< "$APP_ENV_CONTENT"; then
    echo "Isi parameter $ENV_SSM_PARAM kosong atau tidak valid" >&2
    exit 1
  fi
  printf '%s\n' "$APP_ENV_CONTENT" > app.env.tmp
  mv app.env.tmp app.env
fi
[[ -s app.env ]] || { echo "app.env tidak ditemukan atau kosong" >&2; exit 1; }

if [[ "${REGISTRY:-}" == *".dkr.ecr."* ]]; then
  aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"
fi

export IMAGE_TAG="$TAG"
compose() { docker compose -f compose.yml "$@"; }

on_error() {
  echo "==> Deploy gagal. Status container & log terakhir:" >&2
  compose ps -a >&2 || true
  compose logs --no-color --tail 40 db migrate app >&2 || true
}
trap on_error ERR

if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  echo "==> Pull image $TAG"
  compose pull --quiet app migrate
fi

echo "==> Database"
compose up -d --quiet-pull db
compose run --rm --quiet-pull migrate

echo "==> Aplikasi"
compose up -d --wait --quiet-pull app
compose up -d --quiet-pull caddy

echo "$TAG" > CURRENT_TAG
docker image prune -f --filter "until=168h" >/dev/null
echo "==> Selesai: $(compose exec -T app wget -qO- http://127.0.0.1:3000/api/health)"
