#!/usr/bin/env bash

# Asserts what a saved cookie jar is worth right now. Used either side of a
# container restart to prove that sessions are server-side and persistent, and
# that a logged-out cookie stays dead.
#
#   session-smoke.sh <base-url> authenticated <username>
#   session-smoke.sh <base-url> unauthenticated
#   session-smoke.sh <base-url> logout
#
# The jar comes from SMOKE_COOKIE_JAR and is required.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/lib/smoke-common.sh
source "$HERE/lib/smoke-common.sh"

BASE_URL="${1:-http://127.0.0.1:3000}"
MODE="${2:-authenticated}"
USERNAME="${3:-smoke-admin}"

if [[ -z "${SMOKE_COOKIE_JAR:-}" ]]; then
  echo "SMOKE_COOKIE_JAR must point at the cookie jar to check" >&2
  exit 2
fi
if [[ ! -s "$SMOKE_COOKIE_JAR" ]]; then
  echo "cookie jar $SMOKE_COOKIE_JAR is missing or empty" >&2
  exit 1
fi

smoke_init_workspace

case "$MODE" in
  authenticated)
    # Read-only so the check cannot paper over a dead cookie by accepting a new one.
    status=$(smoke_request_readonly "$BASE_URL/")
    smoke_expect_status 200 "$status" "authenticated dashboard with the saved cookie"
    grep -q "Logout ($USERNAME)" "$BODY_FILE" \
      || smoke_fail "dashboard did not show $USERNAME as signed in"
    echo "Session check passed: the saved cookie is still authenticated as $USERNAME"
    ;;

  unauthenticated)
    status=$(smoke_request_readonly "$BASE_URL/")
    smoke_expect_status 302 "$status" "request with the saved cookie"
    smoke_expect_location '^/login$'
    echo "Session check passed: the saved cookie no longer authenticates"
    ;;

  logout)
    status=$(smoke_request "$BASE_URL/")
    smoke_expect_status 200 "$status" "dashboard before logout"
    token=$(smoke_csrf_token)

    status=$(smoke_request --request POST --data-urlencode "_csrf=$token" "$BASE_URL/logout")
    smoke_expect_status 302 "$status" "logout"
    smoke_expect_location '^/login$'
    echo "Session check passed: logged out"
    ;;

  *)
    echo "unknown mode '$MODE' (expected authenticated, unauthenticated, or logout)" >&2
    exit 2
    ;;
esac
