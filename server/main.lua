local APP_ID = 'forge-npwd-appexemple'
local recent = {}

pr_lib.callback.register(APP_ID .. ':server:getSummary', function(source)
    local now = os.time()
    -- Safe, read-only public data. Rate limit is per player, not a client ID.
    if recent[source] and now - recent[source] < 1 then
        return { ok = false, error = 'RATE_LIMITED' }
    end
    if GetResourceState('forge-npwd') ~= 'started' then
        return { ok = false, error = 'PHONE_UNAVAILABLE' }
    end
    local ok, context = pcall(function()
        return exports['forge-npwd']:getActivePhoneContext(source)
    end)
    if not ok or type(context) ~= 'table' or not context.deviceId then
        return { ok = false, error = 'NO_ACTIVE_DEVICE' }
    end
    recent[source] = now
    return { ok = true, data = { online = #GetPlayers(), updatedAt = now, service = 'available' } }
end)

AddEventHandler('playerDropped', function() recent[source] = nil end)
-- This example deliberately exposes no private data or financial mutations.
-- A production app needs its own server-side authorization, persistence and
-- validation; an active phone context alone is NOT proof of an unlocked PIN.
