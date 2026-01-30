#!/bin/bash
source ~/.rvm/scripts/rvm
rvm use 3.2.0
export PATH="$HOME/.rvm/gems/ruby-3.2.0/bin:$HOME/.rvm/gems/ruby-3.2.0@global/bin:$HOME/.rvm/rubies/ruby-3.2.0/bin:$PATH"
cd ios
RCT_NEW_ARCH_ENABLED=0 pod install
