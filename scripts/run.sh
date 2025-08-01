set -euo pipefail

# give Compose extra time on slow hosts
export COMPOSE_HTTP_TIMEOUT=300
export DOCKER_CLIENT_TIMEOUT=300

# 1) Load your prebuilt core image (if it's sitting in ~/core.tar)
CORE_TAR="$HOME/images/core.tar"
if [[ -f "$CORE_TAR" ]]; then
  echo "➤ Loading core image from $CORE_TAR"
  sudo docker load -i "$CORE_TAR"
else
  echo "⚠️  core.tar not found—will attempt to build instead"
fi

# 2) Go into the infra folder
cd "$HOME/modern-bazaar/infra"

# 3) Pull all public images
echo "➤ Pulling public images…"
docker-compose pull

# 4) If the core image didn’t load, build it locally
if ! docker image inspect modern-bazaar/core:local >/dev/null 2>&1; then
  echo "➤ Building core image locally…"
  docker-compose build core
fi

# 5) Start everything without rebuilding any already-present images
echo "➤ Starting containers (no rebuild)…"
docker-compose up --no-build -d

echo "✅ All services are up."