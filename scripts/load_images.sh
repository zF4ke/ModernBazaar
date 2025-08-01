#!/usr/bin/env bash
set -euo pipefail

# 0) If your stack is up, tear it down first
if docker-compose -f ~/modern-bazaar/infra/docker-compose.yml ps | grep -q core; then
  echo "➤ Stopping existing stack…"
  docker-compose -f ~/modern-bazaar/infra/docker-compose.yml down
fi

IMAGE_DIR="$HOME/images"
declare -A TAG_MAP=(
  [core.tar]="modern-bazaar/core:local modernbazaar_core:latest"
  [prometheus.tar]="prom/prometheus:latest"
  [grafana.tar]="grafana/grafana:latest"
  [postgres-exporter.tar]="prometheuscommunity/postgres-exporter:latest"
)

for tarball in "${!TAG_MAP[@]}"; do
  TAR_PATH="${IMAGE_DIR}/${tarball}"
  if [[ -f "$TAR_PATH" ]]; then
    echo "➤ Removing old images for ${tarball}…"
    for img in ${TAG_MAP[$tarball]}; do
      if docker image inspect "$img" >/dev/null 2>&1; then
        sudo docker rmi -f "$img" || true
      fi
    done

    echo "➤ Loading ${tarball}…"
    sudo docker load -i "$TAR_PATH"

    if [[ "$tarball" == "core.tar" ]]; then
      echo "➤ Retagging core image → modern-bazaar/core:local"
      sudo docker tag modernbazaar_core:latest modern-bazaar/core:local
    fi
  else
    echo "⚠️  ${TAR_PATH} not found—skipping."
  fi
done

echo "✅ Images loaded and retagged. You can now run ./run.sh to bring the stack back up."
