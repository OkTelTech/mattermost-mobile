#!/bin/bash
# Wrapper script to run npm install with proper environment

# Set up RVM and proper PATH
source ~/.rvm/scripts/rvm 2>/dev/null || true
rvm use 3.2.0 2>/dev/null || true

# Set up PATH with all required tools
export PATH="$HOME/.rvm/gems/ruby-3.2.0/bin:$HOME/.rvm/rubies/ruby-3.2.0/bin:/opt/homebrew/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Run npm install
npm install "$@"
