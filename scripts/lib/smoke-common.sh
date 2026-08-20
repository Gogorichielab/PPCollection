#!/usr/bin/env bash

# Shared helpers for the smoke scripts. Sourced, never executed directly.
#
# Diagnostics printed on failure are redacted: a failing smoke test dumps
# response headers and bodies, and those carry Set-Cookie. A CI log is not a
# place to leak a live session cookie or the one-time setup code.

SMOKE_REDACT_VALUES=()

# Register a literal value (a setup code, a password) to scrub from diagnostics.
smoke_redact_value() {
  [[ -n "${1:-}" ]] && SMOKE_REDACT_VALUES+=("$1")
  return 0
}

smoke_redact() {
  # Whole header value, not just the first pair — a Cookie header carries several.
  local sed_args=(-e 's/^(([Ss]et-)?[Cc]ookie:).*$/\1 [REDACTED]/')
  local value escaped
  for value in ${SMOKE_REDACT_VALUES+"${SMOKE_REDACT_VALUES[@]}"}; do
    escaped=$(printf '%s' "$value" | sed -e 's/[][\.*^$/&|+?(){}]/\\&/g')
    sed_args+=(-e "s/$escaped/[REDACTED]/g")
  done
  sed -E "${sed_args[@]}"
}

smoke_init_workspace() {
  WORK_DIR=$(mktemp -d)
  BODY_FILE="$WORK_DIR/body.html"
  HEADER_FILE="$WORK_DIR/headers.txt"
  # A caller may pin the cookie jar so it survives between script invocations
  # and across a container restart; otherwise it is per-run and disposable.
  COOKIE_JAR="${SMOKE_COOKIE_JAR:-$WORK_DIR/cookies.txt}"
  mkdir -p "$(dirname "$COOKIE_JAR")"
  touch "$COOKIE_JAR"
  trap 'rm -rf "$WORK_DIR"' EXIT
}

smoke_request() {
  curl --silent --show-error \
    --cookie "$COOKIE_JAR" --cookie-jar "$COOKIE_JAR" \
    --dump-header "$HEADER_FILE" --output "$BODY_FILE" \
    --write-out '%{http_code}' "$@"
}

# Leaves the jar untouched, for checking whether a cookie is still accepted
# without letting the response rewrite it.
smoke_request_readonly() {
  curl --silent --show-error \
    --cookie "$COOKIE_JAR" \
    --dump-header "$HEADER_FILE" --output "$BODY_FILE" \
    --write-out '%{http_code}' "$@"
}

smoke_fail() {
  echo "$1" >&2
  echo "--- response headers (redacted) ---" >&2
  sed -n '1,30p' "$HEADER_FILE" | smoke_redact >&2
  echo "--- response body (redacted) ---" >&2
  sed -n '1,60p' "$BODY_FILE" | smoke_redact >&2
  exit 1
}

smoke_expect_status() {
  local expected=$1 actual=$2 action=$3
  [[ "$actual" == "$expected" ]] || smoke_fail "$action returned HTTP $actual; expected $expected"
}

smoke_redirect_location() {
  awk 'tolower($1) == "location:" { $1 = ""; sub(/^[[:space:]]+/, ""); sub(/\r$/, ""); print; exit }' "$HEADER_FILE"
}

smoke_expect_location() {
  local expected=$1 actual
  actual=$(smoke_redirect_location)
  [[ "$actual" =~ $expected ]] || smoke_fail "redirect location '$actual' did not match '$expected'"
}

smoke_csrf_token() {
  local token
  token=$(awk '/name="_csrf" value="/ { sub(/^.*name="_csrf" value="/, ""); sub(/".*$/, ""); print; exit }' "$BODY_FILE")
  [[ -n "$token" ]] || smoke_fail "response did not contain a CSRF token"
  printf '%s' "$token"
}
