#!/bin/sh
set -e

# Ensure /data directory exists and has correct permissions for node user
# This is necessary when /data is mounted as a volume from the host
if [ -d /data ]; then
  # Check if we're running as root (to fix permissions)
  if [ "$(id -u)" = "0" ]; then
    chown -R node:node /data
    # Get node user's UID and GID
    NODE_UID=$(id -u node)
    NODE_GID=$(id -g node)
    # Switch to node user and execute the command
    exec setpriv --reuid=$NODE_UID --regid=$NODE_GID --init-groups "$@"
  fi
fi

# If not root or /data doesn't exist, just run the command
exec "$@"
