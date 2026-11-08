#!/bin/sh
set -eu

# Docker sets HOSTNAME to the container name. The Next.js standalone server
# binds to HOSTNAME, so override it or Coolify cannot reach the process.
export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"

data_dir="${LEXILEARN_DATA_DIR:-/data}"
mkdir -p "$data_dir"
chown -R nextjs:nodejs "$data_dir"

exec su-exec nextjs:nodejs "$@"
