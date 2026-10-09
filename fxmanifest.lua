fx_version 'cerulean'
game 'gta5'
name 'forge-npwd-appexemple'
author 'Framework Forge'
description 'Reusable Forge NPWD external app and home widget example'
version '1.0.0'

shared_script '@pr_bridge/init.lua'
client_script 'client/main.lua'
server_script 'server/main.lua'
ui_page 'web/dist/index.html'
files { 'web/dist/index.html', 'web/dist/**/*' }
dependency 'pr_bridge'
-- No forge-npwd manifest dependency: start the app BEFORE the phone so its
-- remoteEntry is available on the first phone load. Runtime calls are guarded.
