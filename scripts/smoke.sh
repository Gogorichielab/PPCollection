#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
USERNAME="${2:-admin}"
CURRENT_PASSWORD="${3:-}"
NEW_PASSWORD="${SMOKE_NEW_PASSWORD:-PpcollectionSmoke!2026}"

if [[ -z "$CURRENT_PASSWORD" ]]; then
  echo "usage: $0 [base-url] [username] <initial-password>" >&2
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

expect_location() {
  local expected=$1
  local actual

  actual=$(redirect_location)
  if [[ ! "$actual" =~ $expected ]]; then
    echo "redirect location '$actual' did not match '$expected'" >&2
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
grep -q '"status":"ok"' "$BODY_FILE"

status=$(request "$BASE_URL/login")
expect_status 200 "$status" "login page"
token=$(csrf_token)

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$CURRENT_PASSWORD" \
  "$BASE_URL/login")
expect_status 302 "$status" "login"
expect_location '^/change-password$'

status=$(request "$BASE_URL/change-password")
expect_status 200 "$status" "change-password page"
token=$(csrf_token)

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "current_password=$CURRENT_PASSWORD" \
  --data-urlencode "new_password=$NEW_PASSWORD" \
  --data-urlencode "confirm_password=$NEW_PASSWORD" \
  "$BASE_URL/change-password")
expect_status 302 "$status" "password change"
expect_location '^/$'

status=$(request "$BASE_URL/firearms/new")
expect_status 200 "$status" "new firearm page"
token=$(csrf_token)
serial="SMOKE-$(date +%s)-$$"

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode 'make=Smoke Test' \
  --data-urlencode 'model=Release Candidate' \
  --data-urlencode "serial=$serial" \
  --data-urlencode 'caliber=9mm' \
  --data-urlencode 'status=Active' \
  --data-urlencode 'firearm_type=Pistol' \
  "$BASE_URL/firearms")
expect_status 302 "$status" "firearm creation"
expect_location '^/firearms/[0-9]+$'
firearm_path=$(redirect_location)

status=$(request "$BASE_URL$firearm_path")
expect_status 200 "$status" "firearm detail"
grep -q 'Release Candidate' "$BODY_FILE"

status=$(request "$BASE_URL$firearm_path/edit")
expect_status 200 "$status" "edit firearm page"
token=$(csrf_token)

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode 'make=Smoke Test' \
  --data-urlencode 'model=Verified Candidate' \
  --data-urlencode "serial=$serial" \
  --data-urlencode 'caliber=9mm' \
  --data-urlencode 'status=Active' \
  --data-urlencode 'firearm_type=Pistol' \
  "$BASE_URL$firearm_path?_method=PUT")
expect_status 302 "$status" "firearm update"
expect_location "^${firearm_path}$"

status=$(request "$BASE_URL$firearm_path")
expect_status 200 "$status" "updated firearm detail"
grep -q 'Verified Candidate' "$BODY_FILE"
token=$(csrf_token)

status=$(request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  "$BASE_URL$firearm_path/delete")
expect_status 302 "$status" "firearm deletion"
expect_location '^/firearms$'

status=$(request "$BASE_URL$firearm_path")
expect_status 404 "$status" "deleted firearm lookup"

echo "Smoke test passed: health, login, password change, and firearm CRUD"
