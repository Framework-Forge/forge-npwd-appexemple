local APP_ID = 'forge-npwd-appexemple'
local PHONE_RESOURCE = 'forge-npwd'

RegisterNUICallback('getSummary', function(_, cb)
    -- Every branch responds exactly once. No client-provided player/profile ID.
    local ok, response = pcall(function()
        return pr_lib.callback.await(APP_ID .. ':server:getSummary', 5000)
    end)
    if not ok or type(response) ~= 'table' then
        cb({ ok = false, error = 'SERVER_UNAVAILABLE' })
        return
    end
    cb(response)
end)

RegisterNUICallback('sendDemoNotification', function(data, cb)
    if GetResourceState(PHONE_RESOURCE) ~= 'started' then
        cb({ ok = false, error = 'PHONE_UNAVAILABLE' })
        return
    end
    if type(data) ~= 'table' or type(data.content) ~= 'string' or #data.content > 240
        or type(data.title) ~= 'string' or #data.title > 80 then
        cb({ ok = false, error = 'INVALID_NOTIFICATION' })
        return
    end
    local ok = pcall(function()
        exports[PHONE_RESOURCE]:createNotification({
            appId = APP_ID, content = data.content,
            secondaryTitle = data.title, path = '/' .. APP_ID,
            notisId = APP_ID .. ':demo', duration = 4000, keepOpen = false,
        })
    end)
    cb(ok and { ok = true, data = true } or { ok = false, error = 'PHONE_UNAVAILABLE' })
end)

-- Other local game code can notify both the app and its mounted home widget.
-- SendNUIMessage here would reach THIS resource's iframe, not the phone.
AddEventHandler(APP_ID .. ':client:refresh', function()
    if GetResourceState(PHONE_RESOURCE) ~= 'started' then return end
    pcall(function()
        exports[PHONE_RESOURCE]:sendForgeNPWDMessage(APP_ID, 'summaryUpdated', {})
    end)
end)
