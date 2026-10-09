-- Run from the example resource root: lua tests/game.lua (Lua 5.4).
-- These are mock contract tests, NOT a live FiveM multiplayer test.
local checks = 0
local function eq(actual, expected)
    checks = checks + 1
    assert(actual == expected, tostring(actual) .. ' ~= ' .. tostring(expected))
end
local function sandbox(file, env)
    return assert(loadfile(file, 't', setmetatable(env, { __index = _G })))()
end

local callbacks, events = {}, {}
local started, fails, context, clock = true, false, { deviceId = 'device-1' }, 100
local seenSource
local server = {
    os = { time = function() return clock end },
    pr_lib = { callback = { register = function(name, cb) callbacks[name] = cb end } },
    GetResourceState = function() return started and 'started' or 'stopped' end,
    GetPlayers = function() return { '1', '2' } end,
    exports = { ['forge-npwd'] = { getActivePhoneContext = function(_, playerSource)
        seenSource = playerSource
        if fails then error('export missing') end
        return context
    end } },
    AddEventHandler = function(name, cb) events[name] = cb end,
}
sandbox('server/main.lua', server)
local summary = callbacks['forge-npwd-appexemple:server:getSummary']
eq(summary(12, { source = 99 }).data.online, 2); eq(seenSource, 12)
eq(summary(12).error, 'RATE_LIMITED'); clock = 101; eq(summary(12).ok, true)
server.source = 12; events.playerDropped(); eq(summary(12).ok, true)
started = false; eq(summary(13).error, 'PHONE_UNAVAILABLE'); started = true
context = nil; eq(summary(14).error, 'NO_ACTIVE_DEVICE')
fails = true; eq(summary(15).error, 'NO_ACTIVE_DEVICE'); fails = false

local nui, clientEvents = {}, {}
local response, throws = { ok = true, data = { online = 2 } }, false
local notified, forwarded
local client = {
    RegisterNUICallback = function(name, cb) nui[name] = cb end,
    AddEventHandler = function(name, cb) clientEvents[name] = cb end,
    GetResourceState = server.GetResourceState,
    pr_lib = { callback = { await = function(_, timeout)
        eq(timeout, 5000); if throws then error('timeout') end; return response
    end } },
    exports = { ['forge-npwd'] = {
        createNotification = function(_, data) notified = data end,
        sendForgeNPWDMessage = function(_, app, method) forwarded = app .. ':' .. method end,
    } },
}
sandbox('client/main.lua', client)
local function call(name, payload)
    local count, value = 0, nil
    nui[name](payload, function(data) count = count + 1; value = data end)
    eq(count, 1); return value
end
eq(call('getSummary', {}).ok, true)
response = nil; eq(call('getSummary', {}).error, 'SERVER_UNAVAILABLE')
throws = true; eq(call('getSummary', {}).error, 'SERVER_UNAVAILABLE'); throws = false
started = false; eq(call('sendDemoNotification', {}).error, 'PHONE_UNAVAILABLE'); started = true
eq(call('sendDemoNotification', {}).error, 'INVALID_NOTIFICATION')
eq(call('sendDemoNotification', { content = 'Hello', title = 'Example' }).ok, true)
eq(notified.notisId, 'forge-npwd-appexemple:demo')
clientEvents['forge-npwd-appexemple:client:refresh']()
eq(forwarded, 'forge-npwd-appexemple:summaryUpdated')
print('OK: ' .. checks .. ' Lua mock assertions')
