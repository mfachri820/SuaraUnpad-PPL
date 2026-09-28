#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
set -a; source ./app.env; set +a
FILE="backups/suara_mipa-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f compose.yml exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$FILE"
find backups -name '*.sql.gz' -mtime +14 -delete
echo "Backup tersimpan: $FILE"
