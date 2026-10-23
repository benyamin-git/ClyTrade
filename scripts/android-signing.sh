#!/usr/bin/env bash
#
# Create or verify the ClyTrade Android release keystore and set the four
# GitHub Actions secrets. The password is read without echo and is never
# printed or passed on a command line.
#
# Usage:
#   ./scripts/android-signing.sh --setup
#   ./scripts/android-signing.sh --verify
#   ./scripts/android-signing.sh --help
#
# The keystore defaults to ~/clytrade-signing/clytrade-release.keystore.
# Override with CLYTRADE_KEYSTORE, CLYTRADE_KEY_ALIAS or
# CLYTRADE_KEYSTORE_PASSWORD. Back up the keystore and password offline:
# losing them prevents future APKs from updating installed apps.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  echo "Run this script from inside the ClyTrade repository." >&2
  exit 2
fi
cd "$ROOT"

SIGNING_DIR="${CLYTRADE_SIGNING_DIR:-$HOME/clytrade-signing}"
KEYSTORE="${CLYTRADE_KEYSTORE:-$SIGNING_DIR/clytrade-release.keystore}"
ALIAS="${CLYTRADE_KEY_ALIAS:-clytrade}"
STORE_PASS="${CLYTRADE_KEYSTORE_PASSWORD:-}"

say() { printf '%s\n' "$*"; }
die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Create or verify the ClyTrade Android release keystore and set the four
GitHub Actions secrets.

Usage:
  ./scripts/android-signing.sh --setup
      Create the keystore if it is missing, verify it, and set
      ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS
      and ANDROID_KEY_PASSWORD on the current GitHub repository.

  ./scripts/android-signing.sh --verify
      Verify an existing keystore and print its certificate SHA-256.

  ./scripts/android-signing.sh --help
      Show this help.

The keystore defaults to ~/clytrade-signing/clytrade-release.keystore.
The alias defaults to "clytrade". For a PKCS#12 keystore, the store and key
password are the same; the script uses one password for both.

Environment overrides:
  CLYTRADE_SIGNING_DIR       directory for the default keystore
  CLYTRADE_KEYSTORE          keystore path
  CLYTRADE_KEY_ALIAS         key alias
  CLYTRADE_KEYSTORE_PASSWORD password (skips the prompt; use only for testing)

Back up the keystore and password offline. Losing them means future APKs
cannot update installed apps; Android will require an uninstall, which wipes
local data.
EOF
}

find_keytool() {
  local candidate
  if command -v keytool >/dev/null 2>&1; then
    command -v keytool
    return 0
  fi
  for candidate in \
    "${JAVA_HOME:-}/bin/keytool" \
    "$HOME/Android/jdk-17/bin/keytool" \
    "$HOME"/Android/jdk-*/bin/keytool \
    /usr/lib/jvm/*/bin/keytool; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 not found"
}

ensure_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    chmod 700 "$dir"
  fi
}

prompt_password() {
  if [ -n "$STORE_PASS" ]; then
    return 0
  fi
  [ -t 0 ] || die "No terminal for the password prompt; set CLYTRADE_KEYSTORE_PASSWORD."
  IFS= read -rsp "Keystore password: " STORE_PASS
  echo
  [ -n "$STORE_PASS" ] || die "The keystore password is empty."
}

confirm_new_password() {
  local confirm
  if [ -n "${CLYTRADE_KEYSTORE_PASSWORD:-}" ]; then
    return 0
  fi
  [ -t 0 ] || die "No terminal for the password confirmation."
  IFS= read -rsp "Repeat keystore password: " confirm
  echo
  [ "$confirm" = "$STORE_PASS" ] || die "The passwords do not match."
}

verify_keystore() {
  [ -f "$KEYSTORE" ] || die "Keystore not found: $KEYSTORE"
  CLYTRADE_STORE_PASS="$STORE_PASS" "$KEYTOOL" -list \
    -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -storepass:env CLYTRADE_STORE_PASS >/dev/null 2>&1 ||
    die "Could not open $KEYSTORE with that password and alias '$ALIAS'."
}

cert_fingerprint() {
  local fingerprint
  fingerprint="$(
    CLYTRADE_STORE_PASS="$STORE_PASS" "$KEYTOOL" -list -v \
      -keystore "$KEYSTORE" \
      -alias "$ALIAS" \
      -storepass:env CLYTRADE_STORE_PASS 2>/dev/null |
      awk '/SHA256:/ { print $2; exit }' |
      tr -d ':' |
      tr '[:upper:]' '[:lower:]'
  )"
  [ -n "$fingerprint" ] || die "Could not read the certificate SHA-256 from $KEYSTORE."
  printf '%s\n' "$fingerprint"
}

create_keystore() {
  ensure_dir "$(dirname "$KEYSTORE")"

  if [ -f "$KEYSTORE" ]; then
    say "Using existing keystore: $KEYSTORE"
    prompt_password
    verify_keystore
    return 0
  fi

  prompt_password
  [ "${#STORE_PASS}" -ge 12 ] || die "Use a keystore password of at least 12 characters."
  confirm_new_password

  umask 077
  CLYTRADE_STORE_PASS="$STORE_PASS" CLYTRADE_KEY_PASS="$STORE_PASS" \
    "$KEYTOOL" -genkeypair \
      -keystore "$KEYSTORE" \
      -storetype PKCS12 \
      -alias "$ALIAS" \
      -keyalg RSA \
      -keysize 4096 \
      -validity 10000 \
      -dname "CN=ClyTrade" \
      -storepass:env CLYTRADE_STORE_PASS \
      -keypass:env CLYTRADE_KEY_PASS \
      -noprompt
  chmod 600 "$KEYSTORE"
  say "Created $KEYSTORE"
}

base64_encode() {
  if base64 --help 2>&1 | grep -q -- '-w'; then
    base64 -w0 "$1"
  else
    base64 "$1" | tr -d '\n'
  fi
}

set_secrets() {
  need gh
  need base64

  gh auth status >/dev/null 2>&1 || die "gh is not authenticated; run 'gh auth login'."
  local repo
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" ||
    die "Could not determine the GitHub repository."

  say "Setting four repository secrets on $repo (values are read from stdin)."
  printf '%s' "$STORE_PASS" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$repo"
  printf '%s' "$STORE_PASS" | gh secret set ANDROID_KEY_PASSWORD --repo "$repo"
  printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS --repo "$repo"
  base64_encode "$KEYSTORE" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$repo"

  say "Secrets now present:"
  gh secret list --repo "$repo" |
    grep -E '^ANDROID_(KEYSTORE_BASE64|KEYSTORE_PASSWORD|KEY_ALIAS|KEY_PASSWORD)[[:space:]]' ||
    true
}

setup() {
  KEYTOOL="$(find_keytool || true)"
  [ -n "$KEYTOOL" ] || die "keytool not found. Install a JDK 17 or set JAVA_HOME."
  create_keystore
  local fingerprint
  fingerprint="$(cert_fingerprint)"
  say "Certificate SHA-256: $fingerprint"
  set_secrets
  say
  say "The Android release workflow will now sign with this key."
  say "For a local signed build, set ANDROID_KEYSTORE_PATH=$KEYSTORE,"
  say "ANDROID_KEY_ALIAS=$ALIAS, and the two password variables in your shell,"
  say "then run: npm run android:apk"
  say
  say "BACK UP $KEYSTORE AND THE PASSWORD OFFLINE NOW."
  say "Losing them means future APKs cannot update installed apps."
}

verify() {
  KEYTOOL="$(find_keytool || true)"
  [ -n "$KEYTOOL" ] || die "keytool not found. Install a JDK 17 or set JAVA_HOME."
  prompt_password
  verify_keystore
  say "Keystore: $KEYSTORE"
  say "Alias:    $ALIAS"
  say "SHA-256:  $(cert_fingerprint)"
}

action="${1:---setup}"
case "$action" in
--setup)
  setup
  ;;
--verify)
  verify
  ;;
-h | --help)
  usage
  ;;
*)
  usage >&2
  exit 2
  ;;
esac
