#!/usr/bin/env bash

# Exercises the zero-configuration first run: an instance started with no
# environment variables must funnel every page to /setup, refuse a wrong setup
# code, accept the code printed in the container logs, sign the new
# administrator in, and then close /setup permanently.
#
# Set SMOKE_COOKIE_JAR to a path outside the work directory to keep the session
# cookie for a later script — that is how the restart checks reuse it.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/lib/smoke-common.sh
source "$HERE/lib/smoke-common.sh"

BASE_URL="${1:-http://127.0.0.1:3000}"
SETUP_CODE="${2:-}"
USERNAME="${3:-smoke-admin}"
PASSWORD="${4:-PpcollectionFirstRun!2026}"

if [[ -z "$SETUP_CODE" ]]; then
  echo "usage: $0 [base-url] <setup-code> [username] [password]" >&2
  exit 2
fi

smoke_init_workspace
smoke_redact_value "$SETUP_CODE"
smoke_redact_value "$PASSWORD"

status=$(smoke_request "$BASE_URL/health")
smoke_expect_status 200 "$status" "health check"

# Every page funnels to the wizard while no administrator exists.
for route in / /login /firearms; do
  status=$(smoke_request "$BASE_URL$route")
  smoke_expect_status 302 "$status" "pre-setup GET $route"
  smoke_expect_location '^/setup$'
done

status=$(smoke_request "$BASE_URL/setup")
smoke_expect_status 200 "$status" "setup page"
grep -q 'Create Administrator' "$BODY_FILE" || smoke_fail "setup page did not render the form"
token=$(smoke_csrf_token)

# The code must actually be enforced, not merely present on the form.
status=$(smoke_request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "setup_code=ZZZZ-ZZZZ-ZZZZ" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "confirm_password=$PASSWORD" \
  "$BASE_URL/setup")
smoke_expect_status 400 "$status" "setup with a wrong code"
grep -q 'setup code is not valid' "$BODY_FILE" || smoke_fail "wrong code did not produce the expected message"

status=$(smoke_request "$BASE_URL/setup")
smoke_expect_status 200 "$status" "setup page after rejection"
token=$(smoke_csrf_token)

status=$(smoke_request \
  --request POST \
  --data-urlencode "_csrf=$token" \
  --data-urlencode "setup_code=$SETUP_CODE" \
  --data-urlencode "username=$USERNAME" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "confirm_password=$PASSWORD" \
  "$BASE_URL/setup")
smoke_expect_status 302 "$status" "setup submission"
smoke_expect_location '^/$'

# The wizard signs the new administrator in, so the dashboard is reachable
# without a separate login round-trip.
status=$(smoke_request "$BASE_URL/")
smoke_expect_status 200 "$status" "dashboard after setup"
grep -q "Logout ($USERNAME)" "$BODY_FILE" || smoke_fail "dashboard did not show the signed-in administrator"

status=$(smoke_request "$BASE_URL/setup")
smoke_expect_status 404 "$status" "setup page after completion"

echo "First-run smoke passed: setup redirect, code enforcement, account creation, auto sign-in, and /setup closure"
