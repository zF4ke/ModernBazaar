#!/usr/bin/env bash
set -euo pipefail

# 1) Navigate to your infra folder (adjust path if needed)
WORKDIR="$HOME/modern-bazaar/infra"
echo "→ Changing to $WORKDIR"
cd "$WORKDIR"

# 2) Tear down all Compose services and networks
echo "→ Bringing down Docker-Compose stack…"
docker-compose down

# 3) Restart the Docker daemon
echo "→ Restarting Docker daemon…"
sudo systemctl restart docker

# 4) (Optional) Prune unused data to free space
# echo "→ Pruning unused Docker data…"
# sudo docker system prune -af

echo "✅ Docker daemon restarted and stack stopped."