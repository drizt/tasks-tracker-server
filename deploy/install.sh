#!/usr/bin/env bash

set -euo pipefail

service_name="tasks-tracker-server"
service_user="tasks-tracker"
service_group="tasks-tracker"
state_dir="${STATE_DIR:-/var/lib/tasks-tracker-server}"
config_file="${CONFIG_FILE:-/etc/tasks-tracker-server/server.env}"
systemd_dir="${SYSTEMD_DIR:-/etc/systemd/system}"
run_db=auto
install_deps=1

usage() {
  cat <<EOF
Usage: deploy/install.sh [options]

Build, install, and start the Tasks Tracker server systemd service.

Options:
  --no-deps          Do not run npm ci before packing
  --skip-db          Do not run database setup or migrations
  --create-db        Run create-db even if an existing .env is present
  --state-dir DIR    Server working directory [$state_dir]
  --config-file FILE Server environment file [$config_file]
  --systemd-dir DIR  systemd unit directory [$systemd_dir]
  -h, --help         Show this help
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null || die "$1 command is required"
}

as_root() {
  if [[ $EUID -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

as_service_user() {
  if [[ $EUID -eq 0 ]]; then
    runuser -u "$service_user" -- "$@"
  else
    sudo -u "$service_user" "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-deps)
      install_deps=0
      shift
      ;;
    --skip-db)
      run_db=skip
      shift
      ;;
    --create-db)
      run_db=create
      shift
      ;;
    --state-dir)
      state_dir="${2:-}"
      [[ -n "$state_dir" ]] || die '--state-dir requires a value'
      shift 2
      ;;
    --config-file)
      config_file="${2:-}"
      [[ -n "$config_file" ]] || die '--config-file requires a value'
      shift 2
      ;;
    --systemd-dir)
      systemd_dir="${2:-}"
      [[ -n "$systemd_dir" ]] || die '--systemd-dir requires a value'
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

need_cmd npm
need_cmd systemctl
need_cmd getent
if [[ $EUID -eq 0 ]]; then
  need_cmd runuser
else
  need_cmd sudo
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
service_source="$project_dir/deploy/$service_name.service"
tmp_dir="$(mktemp -d)"
service_tmp="$tmp_dir/$service_name.service"
config_dir="$(dirname -- "$config_file")"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

[[ -f "$project_dir/package.json" ]] || die 'Run this script from the server checkout'
[[ -f "$service_source" ]] || die "Missing systemd unit: $service_source"

if [[ $install_deps -eq 1 ]]; then
  (
    cd "$project_dir"
    npm ci
  )
fi

(
  cd "$project_dir"
  npm pack --pack-destination "$tmp_dir"
)
shopt -s nullglob
package_files=("$tmp_dir"/*.tgz)
shopt -u nullglob
[[ ${#package_files[@]} -eq 1 ]] || die 'npm pack did not create exactly one package file'
package_path="${package_files[0]}"

if ! getent group "$service_group" >/dev/null; then
  as_root groupadd --system "$service_group"
fi

if ! id -u "$service_user" >/dev/null 2>&1; then
  as_root useradd \
    --system \
    --gid "$service_group" \
    --home-dir "$state_dir" \
    --shell /usr/sbin/nologin \
    "$service_user"
fi

as_root install -d -m 0750 -o "$service_user" -g "$service_group" "$state_dir"
as_root install -d -m 0750 -o root -g "$service_group" "$config_dir"
as_root npm install -g "$package_path"
npm_prefix="$(as_root npm prefix -g)"
create_db_cmd="$npm_prefix/bin/tasks-tracker-server-create-db"
migrate_cmd="$npm_prefix/bin/tasks-tracker-server-migrate"
generated_env="$state_dir/.env"

config_file_exists() {
  as_root test -f "$config_file"
}

generated_env_exists() {
  as_service_user test -f "$generated_env"
}

remove_generated_env() {
  if generated_env_exists; then
    as_service_user rm -f "$generated_env"
  fi
}

install_generated_config() {
  generated_env_exists || die "create-db did not write $generated_env"

  generated_config_tmp="$tmp_dir/server.env"
  as_service_user cat "$generated_env" >"$generated_config_tmp"
  as_root install -m 0640 -o root -g "$service_group" \
    "$generated_config_tmp" "$config_file"
  remove_generated_env
}

run_create_db() {
  remove_generated_env
  as_service_user bash -c \
    'cd "$1" && exec "$2"' \
    bash "$state_dir" "$create_db_cmd"
  install_generated_config
}

sed \
  -e "s|^User=.*|User=$service_user|" \
  -e "s|^Group=.*|Group=$service_group|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=$state_dir|" \
  -e "s|^EnvironmentFile=.*|EnvironmentFile=$config_file|" \
  -e "s|^ReadWritePaths=.*|ReadWritePaths=$state_dir|" \
  "$service_source" >"$service_tmp"

as_root install -D -m 0644 "$service_tmp" "$systemd_dir/$service_name.service"

if ! config_file_exists; then
  if generated_env_exists; then
    install_generated_config
  fi
fi

case "$run_db" in
  skip)
    ;;
  create)
    run_create_db
    ;;
  auto)
    if config_file_exists; then
      as_service_user bash -c \
        'set -a; . "$1"; set +a; cd "$2" && exec "$3"' \
        bash "$config_file" "$state_dir" "$migrate_cmd"
    else
      run_create_db
    fi
    ;;
esac

as_root systemctl daemon-reload
as_root systemctl enable "$service_name"
as_root systemctl restart "$service_name"

printf 'Installed %s\n' "$service_name"
printf 'Working directory: %s\n' "$state_dir"
printf 'Environment file: %s\n' "$config_file"
printf 'Service: %s/%s.service\n' "$systemd_dir" "$service_name"
