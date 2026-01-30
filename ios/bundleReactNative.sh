#!/bin/sh

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

# Ensure node is in PATH (fallback to common locations)
if ! command -v node &> /dev/null; then
  export PATH="$HOME/.nvm/versions/node/v22.17.0/bin:$PATH"
fi

export NODE_OPTIONS=--max_old_space_size=12000
export BUNDLE_COMMAND="bundle"
export ENTRY_FILE="index.ts"

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	echo "Sentry native integration is enabled"

	export SENTRY_PROPERTIES=sentry.properties
	../node_modules/@sentry/cli/bin/sentry-cli react-native xcode \
    ../node_modules/react-native/scripts/react-native-xcode.sh
else
	echo "Sentry native integration is not enabled"
	../node_modules/react-native/scripts/react-native-xcode.sh
fi
