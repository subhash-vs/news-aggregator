#!/usr/bin/env bash
#
# Oracle Cloud Always Free VM provisioning script for news-aggregator
# Tested on: Ubuntu 22.04 LTS (Ampere A1 ARM)
#
# Usage:
#   sudo bash deploy/oracle/provision.sh
#
# What this script does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose plugin
#   3. Configures UFW firewall (22, 80, 443)
#   4. Sets up the application in /opt/news-aggregator
#   5. Creates .env from example if missing
#   6. Builds and starts the Docker containers
#   7. Enables Docker to start on boot
#
# The script is idempotent — safe to re-run after pulling updates.
#

set -euo pipefail

APP_DIR="/opt/news-aggregator"
REPO_URL="${REPO_URL:-}"
GUARDIAN_KEY="${GUARDIAN_API_KEY:-}"

# ---------- helpers ----------

log()  { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root (use sudo)." >&2
    exit 1
  fi
}

# ---------- 1. system packages ----------

setup_system() {
  log "Updating system packages..."
  apt-get update -y
  apt-get upgrade -y
  apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    git \
    rsync
}

# ---------- 2. Docker ----------

install_docker() {
  if command -v docker &>/dev/null; then
    info "Docker already installed: $(docker --version)"
  else
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
  fi

  # Ensure Docker Compose plugin is present
  if ! docker compose version &>/dev/null; then
    log "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
  fi

  info "Docker version: $(docker --version)"
  info "Compose version: $(docker compose version --short)"

  systemctl enable docker
  systemctl start docker
}

# ---------- 3. firewall ----------

setup_firewall() {
  log "Configuring UFW firewall..."
  ufw allow 22/tcp comment 'SSH'
  ufw allow 80/tcp comment 'HTTP'
  ufw allow 443/tcp comment 'HTTPS'
  ufw --force enable
  info "UFW rules:"
  ufw status numbered | sed 's/^/    /'
}

# ---------- 4. application directory ----------

setup_app_dir() {
  log "Setting up application directory: ${APP_DIR}"

  if [ -d "${APP_DIR}/.git" ]; then
    info "Git repo already present — pulling latest..."
    cd "${APP_DIR}"
    git pull --ff-only
  elif [ -n "${REPO_URL}" ]; then
    info "Cloning from ${REPO_URL}..."
    git clone "${REPO_URL}" "${APP_DIR}"
    cd "${APP_DIR}"
  elif [ -d "$(pwd)/Dockerfile" ] && [ "$(pwd)" != "${APP_DIR}" ]; then
    # Running from inside a local copy — rsync it to APP_DIR
    info "Copying current directory to ${APP_DIR}..."
    mkdir -p "${APP_DIR}"
    rsync -a --exclude node_modules --exclude .git --exclude .next \
      "$(pwd)/" "${APP_DIR}/"
    cd "${APP_DIR}"
  elif [ -f "${APP_DIR}/Dockerfile" ]; then
    info "Application already present at ${APP_DIR}."
    cd "${APP_DIR}"
  else
    echo "ERROR: No source found." >&2
    echo "Options:" >&2
    echo "  1. Push your repo to GitHub and run:" >&2
    echo "     REPO_URL=https://github.com/you/news-aggregator sudo bash $0" >&2
    echo "  2. scp the project to this VM first, then re-run from inside it." >&2
    exit 1
  fi
}

# ---------- 5. environment ----------

setup_env() {
  log "Configuring environment variables..."

  local env_file="${APP_DIR}/.env"
  local env_example="${APP_DIR}/deploy/oracle/.env.example"

  if [ -f "${env_file}" ]; then
    info ".env already exists — leaving it untouched."
  elif [ -f "${env_example}" ]; then
    cp "${env_example}" "${env_file}"
    info ".env created from .env.example"
  else
    cat > "${env_file}" <<EOF
GUARDIAN_API_KEY=
EOF
    info ".env created with empty GUARDIAN_API_KEY"
  fi

  if [ -n "${GUARDIAN_KEY}" ]; then
    sed -i "s|^GUARDIAN_API_KEY=.*|GUARDIAN_API_KEY=${GUARDIAN_KEY}|" "${env_file}"
    info "GUARDIAN_API_KEY set from argument."
  fi

  if ! grep -q '^GUARDIAN_API_KEY=.\+' "${env_file}"; then
    echo ""
    echo "    ⚠  GUARDIAN_API_KEY is empty."
    echo "       Guardian source will be skipped without it."
    echo "       Get a free key: https://open.theguardian.com/access/"
    echo "       Then edit: nano ${env_file}"
  fi
}

# ---------- 6. build & start ----------

build_and_start() {
  log "Building and starting containers..."
  cd "${APP_DIR}"
  docker compose up -d --build
}

wait_for_healthy() {
  log "Waiting for application to become healthy..."
  local max_wait=120
  local waited=0
  while [ "${waited}" -lt "${max_wait}" ]; do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' news-aggregator 2>/dev/null || echo "unknown")
    if [ "${status}" = "healthy" ]; then
      info "Application is healthy."
      return 0
    fi
    info "Status: ${status} (${waited}s / ${max_wait}s)"
    sleep 5
    waited=$((waited + 5))
  done
  info "Timed out waiting for health check — check logs:"
  info "  docker compose -f ${APP_DIR}/docker-compose.yml logs app"
  return 1
}

# ---------- 7. summary ----------

print_summary() {
  local ip
  ip=$(curl -s --max-time 5 ifconfig.me || echo "<VM_IP>")

  log "Deployment complete!"
  echo ""
  echo "  App URL:          http://${ip}"
  echo "  App directory:    ${APP_DIR}"
  echo "  Data volume:      news-aggregator_news-data (Docker named volume)"
  echo ""
  echo "  Useful commands:"
  echo "    cd ${APP_DIR}"
  echo "    sudo docker compose ps          # container status"
  echo "    sudo docker compose logs -f     # follow logs"
  echo "    sudo docker compose up -d --build  # rebuild after updates"
  echo "    sudo docker compose down        # stop"
  echo ""
}

# ---------- main ----------

main() {
  require_root
  setup_system
  install_docker
  setup_firewall
  setup_app_dir
  setup_env
  build_and_start
  wait_for_healthy || true
  print_summary
}

main "$@"
