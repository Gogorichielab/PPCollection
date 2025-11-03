#!/bin/sh
set -e

# Ensure /data directory exists and has correct permissions for node user
# This is necessary when /data is mounted as a volume from the host
if [ -d /data ] && [ "$(id -u)" = "0" ]; then
  chown -R node:node /data
fi

# If running as root, switch to node user
if [ "$(id -u)" = "0" ]; then
  # Use su to execute the command as node user
  # The trick is to use sh -c to properly handle the arguments
  exec su node -s /bin/sh -c 'exec "$0" "$@"' -- "$@"
fi

# If not root, just run the command
exec "$@"
