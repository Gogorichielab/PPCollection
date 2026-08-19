#!/usr/bin/env bash

# Exercises the zero-configuration first run: an instance started with no
# environment variables must funnel every page to /setup, refuse a wrong setup
# code, accept the code printed in the container logs, sign the new
# administrator in, and then close /setup permanently.

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
SETUP_CODE="${2:-}"
USERNAME="${3:-smoke-admin}"
PASSWORD="${4:-PpcollectionFirstRun!2026}"

if [[ -z "$SETUP_CODE" ]]; then
  echo "usage: $0 [base-url] <setup-code> [username] [password]" >&2
  exit 2
fi

WORK_DIR=$(mktemp -d)
COOKIE_JAR="$WORK_DIR/cookies.txt"
BODY_FILE="$WORK_DIR/body.html"
HEADER_FILE="$WORK_DIR/headers.txt"
trap 'rm -rf "$WORK_DIR"' EXIT

touch "$COOKIE_JAR"

request() {
  curl --silent --show-error \
    --cookie "$COOKIE_JAR" \
    --cookie-jar "$COOKIE_JAR" \
    --dump-header "$HEADER_FILE" \
    --output "$BODY_FILE" \
    --write-out '%{http_code}' \
    "$@"
}

expect_status() {
  local expected=$1
  local actual=$2
  local action=$3

  if [[ "$actual" != "$expected" ]]; then
    echo "$action returned HTTP $actual; expected $expected" >&2
    sed -n '1,30p' "$HEADER_FILE" >&2
    sed -n '1,80p' "$BODY_FILE" >&2
    exit 1
  fi
}

redirect_location() {
  awk '
    tolower($1) == "location:" {
      $1 = ""
      sub(/^[[:space:]]+/, "")
      sub(/\r$/, "")
      print
      exit
    }
  ' "$HEADER_FILE"
}

expect_location() {
  local expected=$1
  local actual

  actual=$(redirect_location)
  if [[ ! "$actual" =~ $expected ]]; then
    echo "redirect location '$actual' did not match '$expected'" >&2
    exit 1
  fi
}

csrf_token() {
  local token

  token=$(awk '
    /name="_csrf" value="/ {
      sub(/^.*name="_csrf" value="/, "")
      sub(/".*$/, "")
      print
      exit
    }
  ' "$BODY_FILE")
  if [[ -z "$token" ]]; then
    echo "response did not contain a CSRF token" >&2
    exit 1
  fi
  printf '%s' "$token"
}

status=$(request "$BASE_URL/health")
expect_status 200 "$status" "health check"

# Every page funnels to the wizard while no administrator exists.
for route in / /login /firearms; do
  status=$(request "$BASE_URL$route")
  expect_status 302 "$status" "pre-setup GET $route"
  expect_location '^/setup$'
done

status=$(request "$BASE_URL/setup")
expect_status 200 "$status" "setup page"
grep -q 'Create Administrator' "$BODY_FILE"
token=$(csrf_token)

# The code must actually be enforced, not merely present on the form.
status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "setup_code=ZZZZ-ZZZZ-ZZZZ" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "confirm_password=$PASSWORD" \
  "$BASE_URL/setup")
expect_status 400 "$status" "setup with a wrong code"

status=$(request "$BASE_URL/setup")
expect_status 200 "$status" "setup page after rejection"
token=$(csrf_token)

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "setup_code=$SETUP_CODE" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "confirm_password=$PASSWORD" \
  "$BASE_URL/setup")
expect_status 302 "$status" "setup submission"
expect_location '^/$'

# The wizard signs the new administrator in, so the dashboard is reachable
# without a separate login round-trip.
status=$(request "$BASE_URL/")
expect_status 200 "$status" "dashboard after setup"
grep -q "Logout ($USERNAME)" "$BODY_FILE"

status=$(request "$BASE_URL/setup")
expect_status 404 "$status" "setup page after completion"

echo "First-run smoke test passed: setup redirect, code enforcement, account creation, auto sign-in, and /setup closure"
