<!-- generated-by: gsd-doc-writer -->
# Forge NPWD — Complete Guide

An open-source phone platform: physical devices, security, recovery, customizable desktops, an app store and an extensible app/widget contract.

[Forge Site](https://framework-forge.github.io/site/#forge-npwd/overview) · [Example App](https://github.com/Framework-Forge/forge-npwd-appexemple) · [README](../README.md)

## Documentation

- [Overview & improvements](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Daily player use](#players)
- [PIN & security](#security)
- [Lost phones & recovery](#recovery)
- [Phone shop & service desk](#shop)
- [Desktops & Forge Store](#desktop)
- [Create an external app](#applications)
- [NUI, server & notifications](#communication)
- [Build home widgets](#widgets)
- [Public API reference](#api)
- [Forge apps & improvements](#ecosystem)
- [Classic NPWD compatibility](#compatibility)
- [Build, test & publish](#testing)
- [Troubleshooting](#troubleshooting)
- [Credits & project scope](#credits)

<a id=overview></a>

## Overview & improvements

Forge NPWD evolves NPWD without replacing its extensible philosophy.

### One phone, several layers

forge-npwd provides the phone, device identity and API. forge-npwd-bridge connects player lifecycle and inventory use through PR Bridge. forge-npwd-shop implements purchase, blocking and replacement services. External apps remain independent resources. This project can serve any FiveM installation with the required adapters; it is not restricted to the Forge server distribution.

### What Forge adds

A physical device has its own serial, profile and line. The holder can differ from the registered owner. Numeric PINs, device blocking and owner-validated replacement protect this identity. The launcher adds drag-and-drop icons, multiple pages and home widgets. Forge Store manages installed apps per profile. Canonical forge-npwd APIs and isolated legacy adapters retain older public integrations without creating another phone instance.

### Read this documentation by role

Players should read daily use, security, recovery and desktop/store guides. Server administrators should begin with installation and configuration, then validate inventory metadata and legacy adapters. App developers should use the external app tutorial, complete example files, widget contract, API catalog and testing checklist. A source path at each technical section identifies the implementation used for verification; runtime behavior must still be tested on the city.

<a id=installation></a>

## Installation

Keep the phone name stable and prepare its adapters before the first player session.

### Release versus source

Use the Forge distribution of the resource, not the original NPWD package as a substitute. A compiled release must contain dist/game and dist/html. A source checkout needs pnpm dependencies and the root build script; do not deploy an unbuilt archive. Name the phone folder exactly forge-npwd. Keep config.json and persistent data backed up before an update. The example app uses npm and has its own lockfile; do not confuse its build with the phone workspace build.

**forge-npwd · source build**

~~~text
pnpm install --frozen-lockfile
pnpm build
# Run in the PHONE repository, not the example app.
# For a release package, use its supplied dist/ files.
~~~

Implementation: package.json; fxmanifest.lua

### Dependencies and startup

The current phone manifest requires pr_bridge, screenshot-basic and pma-voice. Configure PR Bridge adapters for the services in your server. The phone uses mysql_connection_string and its own mysql2 pool: a database bridge alone does not replace this connection. Start external app resources before opening the phone so remoteEntry.js is already available. The example deliberately has no hard forge-npwd dependency to avoid a startup cycle; it checks phone availability at runtime. Start the lifecycle bridge, shop and legacy aliases after the phone.

**server.cfg · order example**

~~~text
ensure pr_bridge
ensure pma-voice
ensure screenshot-basic

# Independent template: build/start before the phone.
ensure forge-npwd-appexemple
# Bundled apps may depend on forge-npwd: read the startup caveat.
# The dependency graph, not only textual ensure order, controls boot.
ensure forge-npwd
ensure forge-npwd-bridge
# Optional service resource (purchase / replacement):
ensure forge-npwd-shop
# Legacy proxies only AFTER all corresponding canonical providers:
# ensure [forge-npwd-compat]
~~~

Implementation: fxmanifest.lua; packages/database/src/db/pool.ts

### Database and first-run checklist

Import the bundled import.sql for the base NPWD schema on a new database. Device/security/profile schema extensions are handled by their repositories; use a database user permitted to apply the bundled schema changes. Do not drop npwd_* or forge_phone_* tables during migration. Verify that the phone item exists, does not stack, preserves metadata during transfers and invokes the inventory use integration. Test a new phone, a transferred phone, the PIN, a call, camera upload and every configured external app. Never start the original NPWD phone beside Forge NPWD.

Implementation: import.sql; apps/game/server/devices/device.database.ts

### Bundled app dependencies and startup timing

The loader needs a reachable compiled remote when it imports an app. The new example intentionally starts independently before the phone. However, the inspected banking, garage, housing, weather, management and mail manifests currently declare a forge-npwd dependency and import its compatibility helper. FiveM resolves that dependency regardless of the textual ensure order, so listing these apps first does not guarantee the phone starts last. Check their actual manifests and startup logs. If a remote fails during startup, finish starting the apps and reinitialize the phone in a controlled maintenance/test window; the loader can retain a failed remote result for that UI session. Do not blindly remove dependencies or duplicate phones. The order snippet illustrates the independent template, not a universal boot recipe for every bundled app.

Implementation: apps/phone/src/common/hooks/useExternalApps.tsx; ../forge-npwd-banking/fxmanifest.lua; ../forge-npwd-mail/fxmanifest.lua

<a id=configuration></a>

## Configuration

Phone configuration, app catalog and service credentials have separate responsibilities.

### Physical device settings

device.enabled enables physical-device mode. itemName selects the inventory item; defaultModel and defaultColor seed new devices, and metadataSchemaVersion describes the metadata version. mirrorLegacyPhoneNumber maintains the legacy owner phone field where configured. PhoneAsItem.enabled and its exportResource/exportFunction gate availability. These values must match the actual item and exports installed; renaming a field is not a data migration. Keep the current metadata container forgeForgeNpwd intact, even though its spelling is historical.

**config.json · merge with your existing config**

~~~json
{
  "PhoneAsItem": {
    "enabled": true,
    "exportResource": "forge-npwd",
    "exportFunction": "hasActivePhone"
  },
  "device": {
    "enabled": true,
    "itemName": "phone",
    "defaultModel": "forge_one",
    "defaultColor": "black",
    "metadataSchemaVersion": 1,
    "mirrorLegacyPhoneNumber": true
  },
  "general": {
    "useResourceIntegration": true,
    "toggleKey": "f1",
    "toggleCommand": "phone",
    "defaultLanguage": "en"
  },
  "database": {
    "playerTable": "players",
    "identifierColumn": "citizenid",
    "identifierType": "license",
    "phoneNumberColumn": "phone_number"
  }
}
~~~

Implementation: config.json; apps/game/server/devices/device.service.ts

### General, database and apps

general.useResourceIntegration enables explicit newPlayer/unloadPlayer lifecycle exports. toggleCommand, toggleKey and defaultLanguage configure daily access. database.playerTable, identifierColumn, identifierType, phoneNumberColumn and profileQueries must match your player data model. apps is an array of external RESOURCE FOLDER names, not routes or necessarily app IDs. disabledApps is used for app availability. Install resources on the server first; Forge Store only changes which catalog apps are installed on the active profile.

**config.json · preserve your other apps**

~~~json
{
  "apps": [
    "forge-npwd-garage",
    "forge-npwd-mail",
    "forge-npwd-banking",
    "forge-npwd-weather",
    "forge-npwd-management",
    "forge-npwd-housing",
    "forge-npwd-appexemple"
  ]
}
~~~

Implementation: config.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Media, integrations and secrets

images configures upload URL, encoding, authorization headers and returnedDataIndexes. imageSafety defines allowed hosts and embedding behavior. voiceMessage configures optional audio uploads; contacts.frameworkPay and its export fields select payment integration. customPhoneNumber can delegate number generation. twitter, match, marketplace, defaultContacts, browser and debug retain their dedicated settings. Store upload tokens in non-replicated server convars, never in JSON sent to NUI, client scripts or source-control examples. Legacy convars are fallback only: a configured Forge name takes precedence.

Implementation: config.json; compat/convars.ts; packages/config/server/index.ts

<a id=players></a>

## Daily player use

Your item selects the device you use; possession and ownership are not the same.

### First use and device switching

Acquire a phone through the configured inventory or phone service and use that item. First use provisions its identity if needed. When you carry several phones, use the desired inventory slot to activate that particular device; a generic open command is not an inventory device selector. Switching devices invalidates the holder’s unlock session, then opens the device security flow. Avoid editing metadata manually or stacking phones: deviceId, serial, profile and line must remain attached to the individual item.

Implementation: apps/game/server/device_bridge.lua; apps/game/server/devices/device.service.ts

### Passing a phone to another player

Transfer or drop the phone through an inventory integration that preserves its metadata. The next holder activates the existing device, not a blank copy owned by that holder. After legitimate unlocking, phone-profile data and installed apps can follow the device. This does not automatically transfer the registered ownership or grant every job, property or finance permission. Sensitive apps must distinguish the physical owner from the current holder and enforce their own server-side rules.

### Settings and routine tools

Use Settings for supported language, appearance, frame, wallpaper, audio and notification preferences. Calls, messages, contacts, camera, gallery and other enabled catalog apps retain their dedicated interfaces. Phone PIN and banking-app PIN are separate controls. Browser preview uses illustrative data and cannot demonstrate inventory, voice, uploads or ownership. A server administrator decides available integrations and catalog apps; installing an app on the home screen does not install a server resource.

<a id=security></a>

## PIN & security

Protect access without confusing visual locks with application authorization.

### Configure, unlock and change the PIN

The phone accepts a numeric PIN of 4–6 digits. An unconfigured device opens the setup flow; a configured device requires verification. Changing the PIN verifies the current code first. The server derives a hash with scrypt and a random salt and uses timingSafeEqual for comparison. PIN values are not stored in the item metadata. Keep the PIN private: sharing a device with someone who knows the PIN can expose phone data, subject to each app’s additional authorization.

Implementation: typings/security.ts; apps/game/server/security/security.service.ts

### Attempts and unlock sessions

The current implementation allows five failed attempts before a five-minute temporary lock. A successful verification creates a holder/device-specific session with a 12-hour maximum TTL. Activating a device resets the holder’s session; blocking a device invalidates its sessions. These values are currently code constants, not exposed config.json options. The security response includes configured, unlocked, attemptsRemaining, lockedUntil and pinLength; errors such as INVALID_PIN_FORMAT or INVALID_CURRENT_PIN identify the operation that failed.

Implementation: apps/game/server/security/security.service.ts; typings/security.ts

### App authorization is separate

The banking app adds its own 4–8 digit PIN and server sessions. Its widget masks sensitive values while the bank session is locked. Other apps apply ownership, job or service checks. getActivePhoneContext returns identity information, not proof that a PIN is unlocked or that a financial action is authorized. Do not expose private data through a callback simply because the UI is hidden. The example only returns public server information and deliberately does not implement private or financial operations.

Implementation: ../forge-npwd-banking/server/main.lua; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

<a id=recovery></a>

## Lost phones & recovery

Replace hardware while retaining the registered owner’s profile and line.

### Owner-validated blocking

The service lists devices registered to the requesting player. Report the lost device through the configured phone shop or an authorized server integration. cancelLostPhone validates registered ownership and sets the device to blocked; unlocking sessions are invalidated and an active holder is notified. The old physical item may still exist in someone’s inventory, but it is no longer an active device. Blocking is different from merely closing the NUI or temporarily disabling the phone UI.

Implementation: apps/game/server/recovery/recovery.service.ts; apps/game/server/devices/device.service.ts

### What replacement preserves

issueReplacementPhone requires a blocked, owned device. It creates a new deviceId and serial, retains profileId, lineId and phoneNumber, and copies the existing PIN hash/salt rather than removing the PIN. The old device becomes replaced and records replacedByDeviceId. The process uses a database transaction and compensates for an inventory insertion if committing fails. It does not teleport the lost item back, grant ownership of another player’s phone or recover forgotten PINs by clearing them.

**server.lua · trusted recovery service integration**

~~~text
-- Execute inside an authenticated, authorized server-side service.
-- Obtain playerSource from the actual callback/event source, never client input.
local function listOwned(playerSource, reply)
    exports['forge-npwd']:getOwnedPhoneDevices(playerSource, function(result)
        reply(result)
    end)
end

local function reportLost(playerSource, selectedDeviceId, reply)
    -- Require an explicit player confirmation in your UI.
    exports['forge-npwd']:cancelLostPhone(playerSource, selectedDeviceId, function(result)
        reply(result)
    end)
end

local function replaceBlocked(playerSource, selectedDeviceId, reply)
    -- Validate fees, proximity and service permissions here first.
    -- Recovery verifies ownership and requires the device to be blocked.
    exports['forge-npwd']:issueReplacementPhone(playerSource, selectedDeviceId, function(result)
        reply(result)
    end)
end
-- These are integration helpers, NOT public unrestricted net events.
-- Do not remove/reset the PIN or mark the old physical item usable yourself.
~~~

Implementation: apps/game/server/recovery/recovery.exports.ts; apps/game/server/recovery/recovery.service.ts

### Integrate fees and protect issuance

Use the shop’s own configuration and validated callbacks for pricing, locations and service access. Raw issuance exports do not replace payment validation in your custom script. Server integrations must derive source from the request, validate ownership and capacity, prevent repeated purchases and handle success/error results. Recovery exports offer optional callbacks for Lua consumers, while JavaScript consumers can await promises. Common errors include DEVICE_MUST_BE_BLOCKED, DEVICE_ALREADY_REPLACED, DEVICE_NOT_FOUND_OR_NOT_OWNED and INVENTORY_ADD_FAILED.

Implementation: apps/game/server/recovery/recovery.exports.ts; ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua

<a id=shop></a>

## Phone shop & service desk

forge-npwd-shop connects the physical phone catalog to purchase, owner lookup, blocking and replacement through PR Bridge.

### A separate resource, not the app store

Forge NPWD Shop is the in-world sales and recovery service. Forge Store inside the phone manages installed apps; the two stores have different responsibilities. Install the folder as forge-npwd-shop and keep forge-npwd and pr_bridge available. The shop loads @pr_bridge/init.lua and @forge-npwd/compat/app.lua, then uses PR Bridge menus, alerts, notifications, callbacks and money adapters. It does not bundle another phone or require a separate shop SQL import: device/profile/line records are managed by the phone service. The published shop configuration and client/server files were compared with the implementation used for this guide.

**server.cfg · phone shop startup**

~~~text
# Configure the phone database, inventory and PR Bridge adapters first.
# Keep the existing startup order for the rest of your server.
ensure forge-npwd
ensure forge-npwd-shop

# After editing the shop config, in a controlled maintenance window:
# restart forge-npwd-shop
# This reloads the shop. It is NOT a phone/PIN factory reset.
~~~

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/fxmanifest.lua

[Forge NPWD Shop repository](https://github.com/Framework-Forge/forge-npwd-shop)

### Configure locations, catalog and service fees

Edit the shop’s config.lua, not the phone’s appCatalog. Config.Models contains model id, label, description, price, menu icon and available color id/label pairs. The shipped catalog has Forge One (2500), Forge Pro (4500) and Forge Ultra (7000); the default replacement fee is 750. Model/color IDs become device metadata, not separate inventory item names or automatically generated 3D models. Use simple IDs containing letters, digits, underscores or hyphens; the phone accepts model values up to 32 characters and colors up to 24. Config.Locations accepts several locations with vector3 coordinates, marker settings and map blips. The example below is a complete smaller catalog with one location; replace coordinates with the service point in your city. There is no in-game shop editor in this version. After editing, restart only forge-npwd-shop during controlled maintenance so the server prices and client menus/blips reload together.

**forge-npwd-shop/config.lua · minimal complete configuration**

~~~text
Config = {}
Config.Command = 'forgephoneshop'
Config.PaymentAccounts = { 'cash', 'bank' } -- priority, not a split payment
Config.RecoveryPrice = 750
Config.InteractionDistance = 2.0
Config.DrawDistance = 15.0
Config.PhoneExportTimeout = 15000 -- milliseconds
Config.CallbackTimeout = 25000 -- milliseconds

Config.Models = {
    {
        id = 'forge_one',
        label = 'Forge One',
        description = 'Everyday phone',
        price = 2500,
        icon = 'phone',
        colors = {
            { id = 'black', label = 'Black' },
            { id = 'white', label = 'White' },
            { id = 'blue', label = 'Blue' },
        },
    },
}

Config.Locations = {
    {
        label = 'Forge NPWD Store',
        coords = vector3(-656.83, -858.67, 24.49), -- replace with your location
        marker = {
            enabled = true, type = 2,
            color = { r = 255, g = 122, b = 26, a = 180 },
        },
        blip = { enabled = true, sprite = 521, color = 47, scale = 0.75 },
    },
}
-- This config creates markers/blips, not a ped.
-- The test command and existing callbacks are NOT location-restricted server-side.
~~~

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua; apps/game/server/recovery/recovery.service.ts

### Marker access and an optional NPC integration

The current shop creates markers and blips, not a ped. Near a configured point, its loop draws the marker within DrawDistance (15 m by default) and shows the E prompt within InteractionDistance (2 m). Press E to open the service. Config.Locations has no ped model, heading, target/interact selector or NPC positioning tool. For an NPC-based desk, let your own NPC/interaction resource create and position the ped, then call the client export openShop from its selected action. The example only opens the existing menu; it does not create the NPC or register a target. Keep NPC management in that integration, avoid duplicate shop markers where appropriate, and do not claim the NPC is supplied by this release. /forgephoneshop also opens the menu and is a test command without a location restriction.

**client.lua · existing NPC interaction action**

~~~text
-- Add this function to YOUR NPC/interaction resource.
-- Call it from that resource's existing target/interact selection handler.
-- Ped creation, heading, placement, permissions and removal stay there.
local function openPhoneShopAtNpc()
    if GetResourceState('forge-npwd-shop') ~= 'started' then return end
    exports['forge-npwd-shop']:openShop()
end

-- Example wiring inside your already registered interaction option:
-- onSelect = openPhoneShopAtNpc
-- The shop does not create/register this NPC for you.
-- Client-side proximity does not replace server-side commerce validation.
~~~

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua

### Player flow: purchase and first use

Open the desk, choose Buy device, select a model, choose a color and confirm the displayed price. The server obtains the player from the callback source, rechecks the selected model/color against its own catalog and calculates the charge itself. issueNewPhone creates a fresh device ID, serial, profile, line and unique phone number, then delivers the configured phone item with forgeForgeNpwd metadata. Use that item to select/open the physical phone. Purchasing another device is not a replacement of the old profile. Models are catalog choices for the same configured phone item; make sure it exists, does not stack and preserves metadata on transfer. An unloaded player, insufficient funds or inventory delivery failure must not be treated as a successful purchase.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Payment priority, not a split payment

Config.PaymentAccounts is an ordered list of account names understood by the PR Bridge money adapter. With { cash, bank }, the server tries cash first and then bank; one account must cover the whole price. It does not combine cash and bank balances or show a payment-method selector. If cash is insufficient and bank covers the price, the entire charge comes from bank. Reorder the list to change priority or use a single allowed account. Catalog prices and RecoveryPrice are floored to integers and clamped to zero; zero means free. Blocking has no separate fee in the current shop. Review these values server-side before publishing the service.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### My devices: owner lookup and loss blocking

My devices lists the registered owner’s devices through getOwnedPhoneDevices, including phones no longer held in their inventory. The menu displays number, model, status and serial; device details also show ID and color. Active devices offer loss blocking and replacement; blocked devices offer replacement. Replaced entries remain historical and do not offer another replacement in the menu. Confirming loss calls cancelLostPhone with the authenticated player source; the phone checks registered ownership and revokes access to that physical device. Holding someone else’s phone does not grant ownership of their recovery service. Blocking disables use of the old item; it does not delete or teleport that physical item back to the owner.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Replacement: what stays and what changes

Choose Recover in a new device and confirm the fee. The shop takes payment, blocks the selected device and then calls issueReplacementPhone. This also allows recovery directly from an active-device menu: you do not need a separate manual blocking step in the shop. The phone replacement export itself still requires a blocked device and validates registered ownership. The replacement has a new deviceId and serial, but keeps profileId, lineId, phone number, model, color and the existing PIN hash/salt. Profile-backed data such as launcher settings remains associated with that same profile. The old device is marked replaced and unusable. This is a second physical item for the same identity, not migration to a new phone number or an inventory copy.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Reset is not a shop operation

The inspected shop has no factory-reset, forgotten-PIN reset, wipe or resource-restart action for players. Its arrow-repeat menu entry means replacement/recovery, not resetting the phone. A replacement preserves the existing PIN; it does not bypass an unknown code. Buying a new phone creates a new profile, which is different from erasing the existing profile. Restarting forge-npwd-shop is an administrator deployment step to reload configuration, not a device service sold to a player. Any future reset service needs its own authorization, data-retention and ownership rules before it can be documented as available.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Failure handling and access-control boundaries

The server serializes a player’s purchase/block/recovery while an operation is in flight and rejects invalid catalog choices. Returned issuance failures trigger a refund to the account charged. If recovery blocks the old device and then inventory delivery fails, the fee is refunded but the old device remains blocked; freeing inventory space and retrying is different from restoring the old item. PhoneExportTimeout defaults to 15000 ms and CallbackTimeout to 25000 ms. A timeout stops waiting; it does not cancel a database/export operation already running. Check the device list, inventory and logs before repeating a timed-out purchase, because a late result needs reconciliation. The current callbacks validate player/catalog/payment and delegate ownership to the phone, but do not validate server-side proximity, opening hours, jobs or NPC permissions. Client marker distance, the command or an NPC target alone is not a server access boundary. Add server validation in a separate implementation task before requiring location-restricted commerce; this guide does not claim that restriction already exists.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Shop integration surface and acceptance checklist

The shop’s public client entry is exports['forge-npwd-shop']:openShop(); it opens the root menu and does not return a purchase result. Internal PR Bridge server callbacks are forge-npwd-shop:server:getDevices (no arguments), :buyPhone (modelId, colorId), :cancelPhone (deviceId) and :recoverPhone (deviceId), all under the same forge-npwd-shop:server prefix. They return success/error envelopes, and getDevices adds devices. They are not phone exports; custom server services should use the canonical phone APIs with their own fee/access checks rather than treating menu callbacks as trusted authorization. Test E access and command; each model/color; cash priority and bank fallback; insufficient combined funds; inventory full and refund; loss while another player holds the item; owner versus holder; replacement keeping number/PIN; an already replaced device; unavailable phone; and timeout reconciliation. Verify menu, alert and currency behavior with the configured PR Bridge providers in a live multiplayer session.

Implementation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

<a id=desktop></a>

## Desktops & Forge Store

Customize the active phone profile, not the entire server’s app installation.

### Edit icons, pages and widgets

Hold an empty area of the home screen to enter edit mode. Drag icons or widgets into free cells, switch pages and use the page controls to add or remove desktops. The current grid is 4 columns × 5 rows, with 20 cells per page and up to 5 pages. Widgets reserve rectangular cells, so icons cannot overlap them. Use the widget picker to select a registered widget and one of its offered sizes. These limits are source constants rather than admin panel settings.

Implementation: typings/home.ts; apps/phone/src/apps/home/components/Home.tsx

### Install and uninstall apps

Open Forge Store, search the server-provided catalog and choose Install or Remove. Installation changes installedApps for the active profile, with progress feedback and rollback if saving fails. System apps DIALER, MESSAGES, CONTACTS, CAMERA, SETTINGS and FORGE_STORE are always retained. Removing an app updates its launcher presence and associated widgets; it does not delete the resource from the server or automatically erase that app’s database records. Download-like progress is UI feedback, not a remote code marketplace.

Implementation: apps/phone/src/apps/store/ForgeStoreApp.tsx; apps/phone/src/apps/home/state/home.state.ts

### Persistence and validation

HomeLayout stores pageCount, pages, widgets and installedApps through the active profile. Each widget placement records instanceId, widgetId, page, x, y, width and height. The server rejects invalid page counts, duplicate IDs, out-of-bounds placements and overlaps. It limits placements to 20 widgets and the installedApps input to 64 IDs. These checks protect layout integrity, not authorization for app transactions. Legacy layouts without installedApps migrate while preserving their existing apps.

Implementation: apps/game/server/home/home.controller.ts; apps/game/server/home/home.database.ts

<a id=applications></a>

## Create an external app

Start with the complete example, then change the identifiers as one coherent contract.

### Clone, install and preview

The public template is forge-npwd-appexemple; keep this repository spelling when following the commands. Use Node 20 or later for the template. npm ci installs its locked dependencies, npm run dev opens the independent browser preview, and npm run build typechecks and emits web/dist. The preview uses mock server statistics and a MemoryRouter; the phone supplies its own router in game. Do not mount a second React root inside the app resource’s game iframe.

**example app · terminal**

~~~text
git clone https://github.com/Framework-Forge/forge-npwd-appexemple.git
cd forge-npwd-appexemple
npm ci
npm run dev
# Build before deploying to FiveM or testing as a remote:
npm run build
npm run preview
~~~

### Resource name, app ID and route

RESOURCE_NAME is the folder used by FiveM, config.json and NUI callback URLs. APP_ID is the app identity used for launcher, messages and widgets. APP_PATH is the router path. They can differ: the banking resource is forge-npwd-banking, its ID is BANKING_APP and its route is /bankingapp. The template uses one consistent prefix for clarity. If you rename it, update contracts.ts, fxmanifest.lua, both Lua files, federation name, startup and the phone apps array. Stable IDs preserve saved installations and widget references.

**src/contracts.ts**

~~~ts
export const RESOURCE_NAME = 'forge-npwd-appexemple';
export const APP_ID = RESOURCE_NAME;
export const APP_PATH = `/${APP_ID}`;
export const SUMMARY_CALLBACK = 'getSummary';
export const UPDATED_EVENT = 'summaryUpdated';

export interface Summary {
  online: number;
  updatedAt: number;
  service: 'available';
}
export type NuiResult<T> = { ok: true; data: T } | { ok: false; error: string };
export interface WidgetProps { width: number; height: number }
~~~

Implementation: apps/phone/src/common/hooks/useExternalApps.tsx

### Publish the app descriptor

forge-npwd.config.ts exports a default factory returning id, nameLocale, path, color, backgroundColor, icon, notificationIcon and app, plus optional homeWidgets. Icons and app are React component functions, not rendered JSX elements. The current loader calls the factory with no settings argument; do not assume settings.language is supplied. The example implements its own locale selector. Its styles are scoped under forge-example-* to avoid overriding the phone or other apps. Use the host’s router rather than embedding BrowserRouter in the app.

**forge-npwd.config.ts**

~~~ts
import App from './src/App';
import { AppIcon, NotificationIcon } from './src/Icon';
import { APP_ID, APP_PATH } from './src/contracts';
import { SummaryWidget } from './src/widgets/SummaryWidget';
import { ClockWidget } from './src/widgets/ClockWidget';

// The current phone loader calls this factory WITHOUT settings.
// Keep the factory zero-argument; language is handled by the app itself.
export default () => ({
  id: APP_ID, path: APP_PATH, nameLocale: 'Forge Example',
  color: '#ffffff', backgroundColor: '#131b29',
  icon: AppIcon, notificationIcon: NotificationIcon, app: App,
  homeWidgets: [
    {
      id: 'summary', name: 'Forge · Server', description: 'Live server summary',
      sizes: [
        { width: 2, height: 1, label: '2×1' },
        { width: 4, height: 1, label: '4×1' },
        { width: 4, height: 2, label: '4×2' },
      ],
      Component: SummaryWidget, path: APP_PATH,
    },
    {
      id: 'clock', name: 'Forge · Clock', description: 'Local time, no network request',
      sizes: [{ width: 2, height: 1, label: '2×1' }, { width: 2, height: 2, label: '2×2' }],
      Component: ClockWidget, path: APP_PATH,
    },
  ],
});
~~~

Implementation: apps/phone/src/common/hooks/useExternalApps.tsx

### Federation, assets and deployment

The phone loads https://cfx-nui-RESOURCE_NAME/web/dist/remoteEntry.js and imports ./config as an ESM/Vite remote. The filename forge-npwd.config.ts is a source convention; the exposed module ./config is the runtime contract. Build with assetsDir set to an empty string so remoteEntry.js sits at the expected root. Share React, React DOM and the compatible React Router version with the host; do not upgrade to Router 6 without adapting the phone. After building, deploy fxmanifest, Lua and web/dist, register the resource in apps, restart it and reopen/restart the phone in a planned test.

**vite.config.ts**

~~~ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import topLevelAwait from 'vite-plugin-top-level-await';
import { RESOURCE_NAME } from './src/contracts';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    federation({
      name: RESOURCE_NAME,
      filename: 'remoteEntry.js',
      exposes: { './config': './forge-npwd.config.ts' },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
    topLevelAwait(),
  ],
  build: {
    outDir: 'web/dist', emptyOutDir: true,
    modulePreload: false, assetsDir: '', assetsInlineLimit: 1000000,
  },
});
~~~

Implementation: apps/phone/src/common/hooks/useExternalApps.tsx

### The full screen layout

The example separates a fixed header, navigation, scrollable content and widget previews. Overview reads public server data; Guide explains the player flow. Loading, error and retry states are rendered explicitly. A responsive widget adapts to grid cells rather than using fixed phone pixel sizes. Copy the example as a starting point, then replace mock data and public read-only callbacks with your domain’s authorized service. The template does not ship money transfers, device ownership changes or private data access.

**src/App.tsx**

~~~tsx
import { useEffect, useState } from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import { APP_PATH } from './contracts';
import { fetchNui, isBrowserPreview } from './api';
import type { NuiResult } from './contracts';
import { useSummary } from './hooks/useSummary';
import { locales, useLocale } from './i18n';
import { SummaryWidget } from './widgets/SummaryWidget';
import { ClockWidget } from './widgets/ClockWidget';
import './styles.css';

export default function App() {
  const { locale, text, setLocale } = useLocale();
  const { data, error, loading, refresh } = useSummary();
  const [notice, setNotice] = useState('');
  useEffect(() => { setNotice(''); }, [locale]);
  const notify = async () => {
    if (isBrowserPreview()) { setNotice(text.notificationPreview); return; }
    try {
      const result = await fetchNui<NuiResult<boolean>>('sendDemoNotification', { content: text.notificationText, title: text.title });
      setNotice(result.ok ? text.notificationSent : `${text.unavailable} (${result.error})`);
    } catch { setNotice(text.unavailable); }
  };
  return <div className="forge-example-app">
    <header><span className="forge-example-kicker">FORGE NPWD</span><h1>{text.title}</h1><p>{text.subtitle}</p>
      <label><span className="forge-example-sr">{text.language}</span><select aria-label={text.language} value={locale} onChange={e => setLocale(e.target.value as typeof locale)}>{locales.map(code => <option key={code}>{code}</option>)}</select></label>
    </header>
    <nav><NavLink exact to={APP_PATH}>{text.overview}</NavLink><NavLink to={`${APP_PATH}/guide`}>{text.guide}</NavLink></nav>
    <main><Switch>
      <Route path={`${APP_PATH}/guide`}><h2>{text.widgets}</h2><p>{text.instructions}</p><p>{text.developer}</p><code>forge-npwd.config.ts → homeWidgets</code></Route>
      <Route path={APP_PATH}>
        <span className="forge-example-preview">{isBrowserPreview() ? text.browser : text.live}</span>
        <section className="forge-example-card" aria-live="polite"><h2>{text.online}</h2><strong>{loading ? '…' : error ? '—' : data?.online}</strong>
          {error && <p role="alert">{text.unavailable} ({error})</p>}
          {data && <p>{text.updated}: {new Date(data.updatedAt * 1000).toLocaleTimeString(locale)}</p>}
          <div className="forge-example-actions"><button type="button" onClick={() => void refresh()}>{error ? text.retry : text.refresh}</button>
          <button type="button" onClick={() => void notify()}>{text.notify}</button></div><p role="status">{notice}</p>
        </section>
        <h2>{text.widgets}</h2><div className="forge-example-widget-preview"><SummaryWidget width={4} height={2}/><ClockWidget width={2} height={2}/></div>
      </Route>
    </Switch></main>
  </div>;
}
~~~

### Resource manifest and shared versions

The manifest loads PR Bridge in both game contexts and serves every compiled file. The app deliberately does not depend on forge-npwd in the manifest, so it can start before the phone; callbacks guard phone availability. This template locks React 17.0.2 and Router 5.3.0 to the inspected phone host. Federation sharing must resolve a compatible React instance; mismatches can produce invalid-hook errors even when compilation succeeds. Keep the package lock and include web/dist in a release. Other apps in the city may use different source dependencies; copying their code does not remove the need to test the resolved runtime.

**fxmanifest.lua**

~~~lua
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
~~~

<a id=communication></a>

## NUI, server & notifications

Use explicit callback destinations and a server-derived identity.

### Request: React → Lua → server

fetchNui posts JSON to https://RESOURCE_NAME/getSummary. Because federated app code runs inside the phone’s document, GetParentResourceName would identify the phone, not the app: always use the external resource name for its callbacks. RegisterNUICallback receives the request and calls pr_lib.callback.await with a 5-second timeout. The server registers the matching PR Bridge callback and derives the requester source. The example adds a 7-second browser request timeout and always returns one ok/data or ok/error response.

**src/api.ts**

~~~ts
import { RESOURCE_NAME, SUMMARY_CALLBACK, type NuiResult, type Summary } from './contracts';

export const isBrowserPreview = () => !('invokeNative' in window);

// The app executes inside the PHONE's document. GetParentResourceName would
// identify forge-npwd here, not this external app. Use the explicit app name.
export async function fetchNui<T>(event: string, data: unknown = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://${RESOURCE_NAME}/${event}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json() as T;
  } finally { window.clearTimeout(timeout); }
}

let pending: Promise<Summary> | null = null;
let cached: Summary | null = null;
let cachedUntil = 0;
export async function getSummary(): Promise<Summary> {
  if (isBrowserPreview()) return { online: 42, updatedAt: Math.floor(Date.now() / 1000), service: 'available' };
  // App + several widget instances can mount together. Share one read rather
  // than multiplying requests and triggering the server's rate limit.
  if (cached && cachedUntil > Date.now()) return cached;
  if (pending) return pending;
  pending = (async () => {
    const result = await fetchNui<NuiResult<Summary>>(SUMMARY_CALLBACK);
    if (!result.ok) throw new Error(result.error);
    cached = result.data; cachedUntil = Date.now() + 1500;
    return result.data;
  })().finally(() => { pending = null; });
  return pending;
}
~~~

### Validate on the server

Never trust a player identifier, owner, balance or profileId supplied by NUI. The example derives getActivePhoneContext(source), verifies an active device and rate-limits public reads. It exposes only server population and a timestamp. For private or mutating operations add the relevant app session, ownership/job checks, input bounds, transaction handling and audit logs. Handle a missing/restarting phone resource with a controlled error. An active context is not proof of PIN verification; keep this distinction when extending the template.

**server/main.lua**

~~~lua
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
~~~

### Push events and notifications

SendNUIMessage in the external app reaches its own iframe, not the phone UI. Use exports["forge-npwd"]:sendForgeNPWDMessage(APP_ID, method, data); listeners match both event.data.app and event.data.method. createNotification uses the app ID, route and a stable notisId; duration is in milliseconds. The example includes a guarded demo notification callback and a local refresh event. Always clean up message listeners and timers on unmount. Do not send PINs, upload tokens or unnecessary private records in a notification payload.

**client/main.lua**

~~~lua
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
~~~

Implementation: apps/game/client/cl_exports.ts

<a id=widgets></a>

## Build home widgets

The same registration contract used by the Forge banking, weather and other apps.

### Register homeWidgets

Add homeWidgets to the app descriptor. Each entry has a stable local id, name, optional description, sizes, Component and optional path. A size is {width, height, label}; width and height are positive integer grid-cell counts, not pixels. Component is a function accepting {width, height}. The phone constructs widgetId as APP_ID:local_id, such as forge-npwd-appexemple:summary. Do not change either ID after users save placements. The widget is offered only while the owning app is installed.

**forge-npwd.config.ts**

~~~ts
import App from './src/App';
import { AppIcon, NotificationIcon } from './src/Icon';
import { APP_ID, APP_PATH } from './src/contracts';
import { SummaryWidget } from './src/widgets/SummaryWidget';
import { ClockWidget } from './src/widgets/ClockWidget';

// The current phone loader calls this factory WITHOUT settings.
// Keep the factory zero-argument; language is handled by the app itself.
export default () => ({
  id: APP_ID, path: APP_PATH, nameLocale: 'Forge Example',
  color: '#ffffff', backgroundColor: '#131b29',
  icon: AppIcon, notificationIcon: NotificationIcon, app: App,
  homeWidgets: [
    {
      id: 'summary', name: 'Forge · Server', description: 'Live server summary',
      sizes: [
        { width: 2, height: 1, label: '2×1' },
        { width: 4, height: 1, label: '4×1' },
        { width: 4, height: 2, label: '4×2' },
      ],
      Component: SummaryWidget, path: APP_PATH,
    },
    {
      id: 'clock', name: 'Forge · Clock', description: 'Local time, no network request',
      sizes: [{ width: 2, height: 1, label: '2×1' }, { width: 2, height: 2, label: '2×2' }],
      Component: ClockWidget, path: APP_PATH,
    },
  ],
});
~~~

Implementation: apps/phone/src/os/apps/config/apps.tsx; apps/phone/src/apps/home/components/Home.tsx

### Render independently and adapt size

Widgets mount on the home screen, outside the app’s main component and its private providers. Do not require a context provider that exists only in App. Use a standalone hook, shared store or a widget-specific provider. The summary example works at 2×1, 4×1 and 4×2, revealing update time in taller layouts. The clock works at 2×1 and 2×2 with no server request; it intentionally displays local real time, not the city clock. Keep the root width/height at 100%, use border-box and avoid overflow or global CSS.

**src/widgets/SummaryWidget.tsx**

~~~tsx
import type { WidgetProps } from '../contracts';
import { useSummary } from '../hooks/useSummary';
import { useLocale } from '../i18n';
import '../styles.css';

export function SummaryWidget({ width, height }: WidgetProps) {
  const { data, loading, error } = useSummary();
  const { text, locale } = useLocale();
  return <div className={`forge-example-widget ${height > 1 ? 'forge-example-widget-tall' : ''}`}>
    <div className="forge-example-kicker">FORGE · {text.summary}</div>
    <strong>{loading ? '…' : error ? '—' : data?.online}</strong>
    <span>{error ? text.unavailable : text.online}</span>
    {height > 1 && data && <small>{text.updated}: {new Date(data.updatedAt * 1000).toLocaleTimeString(locale)}</small>}
    {width >= 4 && <span className="forge-example-widget-dot" aria-hidden="true" />}
  </div>;
}
~~~

### Data refresh and cleanup

The banking widget polls every 30 seconds and reacts to transfer/invoice events; weather polls every 60 seconds and reacts to weatherUpdated. Both fetch data independently of the open app. The example polls every 60 seconds while the document is visible and listens for summaryUpdated, checking app and method. It coalesces simultaneous app/widget requests and briefly caches the public result. Clear the interval and remove the listener in useEffect cleanup; handle loading, permission-denied and missing-provider states instead of retaining stale private data.

**src/hooks/useSummary.ts**

~~~ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSummary } from '../api';
import { APP_ID, UPDATED_EVENT, type Summary } from '../contracts';

// Widgets mount independently of App: do not rely on an App-only context.
export function useSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = await getSummary();
      if (alive.current) { setData(result); setError(null); }
    } catch (cause) {
      if (alive.current) { setData(null); setError(cause instanceof Error ? cause.message : 'REQUEST_FAILED'); }
    } finally { pending.current = false; if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true; void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    const listener = (event: MessageEvent) => {
      if (event.data?.app === APP_ID && event.data?.method === UPDATED_EVENT) void refresh();
    };
    window.addEventListener('message', listener);
    return () => { alive.current = false; window.clearInterval(timer); window.removeEventListener('message', listener); };
  }, [refresh]);
  return { data, error, loading, refresh };
}
~~~

Implementation: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Player installation and troubleshooting

Build and start the app, register its folder in config.json apps, and install it through Forge Store. Hold a blank home area, open the widget picker, choose the summary or clock and a size, then place it in free cells. A click normally opens widget.path or the app route; edit mode is for moving it. If missing, verify installedApps, a function Component, an array sizes, positive integer dimensions, a non-disabled app and a valid remoteEntry. Removing the widget is not uninstalling the app. Test every declared size, two copies, language changes and restart.

**src/widgets/ClockWidget.tsx**

~~~tsx
import { useEffect, useState } from 'react';
import type { WidgetProps } from '../contracts';
import { useLocale } from '../i18n';
import '../styles.css';
export function ClockWidget({ height }: WidgetProps) {
  const [now, setNow] = useState(() => new Date());
  const { locale, text } = useLocale();
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return <div className="forge-example-widget"><div className="forge-example-kicker">{text.clock}</div>
    <strong>{now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</strong>
    {height > 1 && <span>{now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}</span>}
  </div>;
}
~~~

<a id=api></a>

## Public API reference

Client and server exports are different surfaces; respect their signatures and trust boundaries.

### Calling conventions

Lua calls use exports["forge-npwd"]:method(...). JavaScript/TypeScript uses exports["forge-npwd"].method(...) and awaits asynchronous operations. Check GetResourceState before optional integrations and handle errors during restart. Recovery exports explicitly offer Lua callback overloads; do not assume every asynchronous export returns an immediately usable Lua table. The catalog below documents public calls, not compatGetNuiCallbacks/compatInvokeNui or low-level inventory setters. Use the current API for new code and the legacy adapters for unchanged old consumers.

**client.lua · canonical public calls**

~~~text
if GetResourceState('forge-npwd') ~= 'started' then return end

local visible = exports['forge-npwd']:isPhoneVisible()
exports['forge-npwd']:setPhoneVisible(true)
-- openApp uses the app ID (not necessarily its resource folder).
exports['forge-npwd']:openApp('forge-npwd-appexemple')
exports['forge-npwd']:sendForgeNPWDMessage('forge-npwd-appexemple', 'summaryUpdated', {})
exports['forge-npwd']:createNotification({
    appId = 'forge-npwd-appexemple',
    content = 'Example notification',
    secondaryTitle = 'Forge Example',
    path = '/forge-npwd-appexemple',
    notisId = 'forge-npwd-appexemple:demo',
    duration = 4000,
    keepOpen = false,
})
~~~

Implementation: apps/game/client/cl_exports.ts; apps/game/server/bridge/sv_exports.ts; compat/exports.json

### Active device context

getActivePhoneContext(source) is synchronous and returns deviceId, profileId, phoneNumber, ownerIdentifier and holderIdentifier, or null. ownerIdentifier identifies the registered device owner; holderIdentifier identifies the current player. Use this distinction deliberately: phone-profile records can follow profileId, while employment permissions should be validated for the correct actor. Never accept these fields from NUI as authority. The descriptor ID, resource name and router path are not substitutes for any player identity.

**server.lua · active device context**

~~~text
local function resolveDevice(playerSource)
    local context = exports['forge-npwd']:getActivePhoneContext(playerSource)
    if not context then return nil, 'NO_ACTIVE_DEVICE' end
    -- context.deviceId: physical device
    -- context.profileId: phone data profile
    -- context.phoneNumber: active line
    -- context.ownerIdentifier: registered owner
    -- context.holderIdentifier: current holder
    return context
end

-- Never authorize a private/financial operation from this context alone.
-- Enforce your app's own server-side session, ownership and permissions.
-- Opening the phone or having its item is NOT proof of PIN authorization.
~~~

Implementation: apps/game/server/devices/device.service.ts

### Recovery and notification payloads

Owned-device listing returns an array. Recovery actions return a success boolean and optional error/identity fields; do not confuse this with the example app’s {ok, data, error} envelope. In TypeScript, CreateNotificationDTO currently also declares an onClick callback; ordinary Lua calls can omit it because the runtime validates the object and notisId rather than enforcing every type field. System notifications use uniqId, not notisId. Never transport callback functions through JSON/NUI. Device models/colors are server-normalized strings; slot is an actual inventory slot. The examples do not bypass payment or service authorization.

**typings · recovery and notifications**

~~~text
interface OwnedPhoneDevice {
  deviceId: string;
  serialNumber: string;
  phoneNumber: string;
  model: string;
  color: string;
  status: 'active' | 'blocked' | 'replaced';
  currentUserCitizenId: string | null;
  replacedByDeviceId: string | null;
}
interface RecoveryResult {
  success: boolean;
  error?: string;
  oldDeviceId?: string;
  newDeviceId?: string;
  serialNumber?: string;
  phoneNumber?: string;
  profileId?: string;
  lineId?: string;
}
type CreateNotificationDTO = {
  appId: string;
  content: string;
  secondaryTitle: string;
  duration: number; // milliseconds
  keepOpen: boolean;
  path: string;
  notisId: string;
  onClick: () => void | null;
};
type SystemNotificationDTO = {
  uniqId: string;
  content: string;
  secondaryTitle: string;
  keepOpen: boolean;
  duration: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  controls?: boolean;
};
~~~

Implementation: typings/recovery.ts; typings/notifications.ts

### Client

#### isPhoneVisible

~~~ts
isPhoneVisible(): boolean
~~~

Whether the phone is open. Does not test PIN authorization.

Implementation: apps/game/client/cl_exports.ts

#### setPhoneVisible

~~~ts
setPhoneVisible(visible: boolean | number): Promise<void>
~~~

Open or close using the normal phone flow. Device availability still applies.

Implementation: apps/game/client/cl_exports.ts

#### isPhoneDisabled

~~~ts
isPhoneDisabled(): boolean
~~~

Read the client disabled flag, not the persistent blocked-device status.

Implementation: apps/game/client/cl_exports.ts

#### setPhoneDisabled

~~~ts
setPhoneDisabled(disabled: boolean | number): void
~~~

Set client availability. This is not an owner-validated lost-phone report.

Implementation: apps/game/client/cl_exports.ts

#### hasActivePhone

~~~ts
hasActivePhone(): Promise<boolean>
~~~

Check the phone item and server active-device availability.

Implementation: apps/game/client/cl_exports.ts

#### hasForgeNPWDItem

~~~ts
hasForgeNPWDItem(): boolean
~~~

Inventory bridge item check. Not an unlocked-session check.

Implementation: apps/game/client/device_bridge.lua

#### openApp

~~~ts
openApp(appId: string): void
~~~

Request an app by ID, not its resource folder or URL. Open the phone separately if needed.

Implementation: apps/game/client/cl_exports.ts

#### sendForgeNPWDMessage

~~~ts
sendForgeNPWDMessage(app: string, method: string, data: unknown): void
~~~

Push {app, method, data} to the phone document; known old app/event names are canonicalized.

Implementation: apps/game/client/cl_exports.ts

#### createNotification

~~~ts
createNotification(dto: CreateNotificationDTO): void
~~~

Use appId, content, secondaryTitle, path, notisId, duration and keepOpen. Duration is milliseconds.

Implementation: apps/game/client/cl_exports.ts

#### createSystemNotification

~~~ts
createSystemNotification(dto: SystemNotificationDTO): void
~~~

System notification uses uniqId. Action callbacks require controls=true and keepOpen=true.

Implementation: apps/game/client/cl_exports.ts

#### removeSystemNotification

~~~ts
removeSystemNotification(uniqId: string): void
~~~

Remove the system notification with this unique ID.

Implementation: apps/game/client/cl_exports.ts

#### startPhoneCall

~~~ts
startPhoneCall(number: string, isAnonymous?: boolean): void
~~~

Begin a call to a string number; anonymous defaults to false.

Implementation: apps/game/client/cl_exports.ts

#### isInCall

~~~ts
isInCall(): boolean
~~~

Read the client call-service state.

Implementation: apps/game/client/cl_exports.ts

#### endCall

~~~ts
endCall(): Promise<void>
~~~

End an active call and its phone animation.

Implementation: apps/game/client/cl_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(): Promise<string>
~~~

Read the current device line; fetches from the server if not cached.

Implementation: apps/game/client/cl_exports.ts

#### fillNewContact

~~~ts
fillNewContact({number, name?, avatar?}): void
~~~

Prefill the contacts form. The player still confirms saving.

Implementation: apps/game/client/cl_exports.ts

#### fillNewNote

~~~ts
fillNewNote({title?, content?}): void
~~~

Prefill the note form through the notes app.

Implementation: apps/game/client/cl_exports.ts

#### sendUIMessage

~~~ts
sendUIMessage({type: string, payload: unknown}): void
~~~

Deprecated compatibility form. New integrations should use sendForgeNPWDMessage.

Implementation: apps/game/client/cl_exports.ts

### Server

#### newPlayer

~~~ts
newPlayer({source, identifier, phoneNumber?, firstname?, lastname?}): Promise<void>
~~~

Load one player session when general.useResourceIntegration is enabled. Do not duplicate the lifecycle bridge.

Implementation: apps/game/server/bridge/sv_exports.ts

#### unloadPlayer

~~~ts
unloadPlayer(source: number): Promise<void>
~~~

Unload the player through the lifecycle service; integration must be enabled.

Implementation: apps/game/server/bridge/sv_exports.ts

#### getPlayerData

~~~ts
getPlayerData({source? | identifier? | phoneNumber?}): Promise<PlayerData | null>
~~~

Locate a loaded player. Choose one locator; returns phoneNumber, firstName, lastName, name, identifier and source.

Implementation: apps/game/server/bridge/sv_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(source: number): string
~~~

Deprecated server lookup; prefer getPlayerData. Requires a loaded player.

Implementation: apps/game/server/bridge/sv_exports.ts

#### generatePhoneNumber

~~~ts
generatePhoneNumber(): Promise<string>
~~~

Generate a unique number. Does not issue a device or inventory item.

Implementation: apps/game/server/bridge/sv_exports.ts

#### isPlayerBusy

~~~ts
isPlayerBusy(source: number): boolean
~~~

Check player busy state in the phone service.

Implementation: apps/game/server/bridge/sv_exports.ts

#### isPhoneNumberBusy

~~~ts
isPhoneNumberBusy(number: string): boolean
~~~

Whether the call service currently has this line in a call.

Implementation: apps/game/server/bridge/sv_exports.ts

#### getActivePhoneContext

~~~ts
getActivePhoneContext(source: number): PhoneContext | null
~~~

Return deviceId, profileId, phoneNumber, ownerIdentifier and holderIdentifier. Not PIN authorization.

Implementation: apps/game/server/devices/device.service.ts

#### getDevice

~~~ts
getDevice(deviceId: string): Promise<DeviceIdentity | null>
~~~

Trusted-server lookup of device identity, registered/current users and status.

Implementation: apps/game/server/devices/device.service.ts

#### usePhoneSlot

~~~ts
usePhoneSlot(source: number, slot: number): boolean
~~~

Validate the real inventory slot and dispatch device use. Do not pass arbitrary metadata from the client.

Implementation: apps/game/server/device_bridge.lua

#### blockDevice

~~~ts
blockDevice(deviceId: string, ownerIdentifier: string): Promise<boolean>
~~~

Owner-validated blocking. Derive the owner on the trusted server, never from a NUI claim.

Implementation: apps/game/server/devices/device.service.ts

#### getOwnedPhoneDevices

~~~ts
getOwnedPhoneDevices(source: number, callback?): Promise<OwnedPhoneDevice[]> | void
~~~

List the requester’s registered devices. Lua can use the optional callback.

Implementation: apps/game/server/recovery/recovery.exports.ts

#### cancelLostPhone

~~~ts
cancelLostPhone(source: number, deviceId: string, callback?): Promise<RecoveryResult> | void
~~~

Validate owner and report/block a lost device. Returns success/error, not an inventory refund.

Implementation: apps/game/server/recovery/recovery.exports.ts

#### issueNewPhone

~~~ts
issueNewPhone(source, model?, color?, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Issue a new profile/line/device/item. Custom callers must implement payment and service authorization.

Implementation: apps/game/server/recovery/recovery.exports.ts

#### issueReplacementPhone

~~~ts
issueReplacementPhone(source, oldDeviceId, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Replace an owned blocked device, retaining line/profile and phone PIN. Handles inventory/DB transaction.

Implementation: apps/game/server/recovery/recovery.exports.ts

#### emitMessage

~~~ts
emitMessage({senderNumber, targetNumber, message, embed?}): Promise<void>
~~~

Trusted server sends a message and invokes registered target middleware. Validate callers before exposing to clients.

Implementation: apps/game/server/messages/middleware/emitMessage.ts

#### onMessage

~~~ts
onMessage(number: string, callback: (context) => void): void
~~~

Register one target-number handler; registering again replaces the map entry.

Implementation: apps/game/server/messages/middleware/onMessage.ts

#### onCall

~~~ts
onCall(number: string, callback: (context) => void): void
~~~

Call middleware can inspect incomingCaller and invoke next, exit, reply or forward. Use a deliberate termination path.

Implementation: apps/game/server/calls/middleware/index.ts

#### emitRconMessage

~~~ts
emitRconMessage(source: number, message: Message): void
~~~

Push the message-success client event. Does not itself persist a message; use emitMessage for normal sends.

Implementation: apps/game/server/rcon/exports.ts

<a id=ecosystem></a>

## Forge apps & improvements

Separate installable resources with shared device context and home-widget integration.

### Banking

forge-npwd-banking adds balances, transactions, transfers, PIX/invoices, ATM discovery and a dedicated app PIN. The summary widget offers 2×1, 4×1 and 4×2, with privacy masking and the app-security check before reading balances. Its resource name differs from its BANKING_APP ID and /bankingapp route. Financial actions remain validated by the banking service and server callbacks; widgets do not grant permissions or bypass the PIN.

Implementation: ../forge-npwd-banking/forge-npwd.config.ts; ../forge-npwd-banking/server/main.lua

### Weather and garages

forge-npwd-weather provides current conditions and regional forecasts through PR Bridge. Current weather supports 2×1, 4×1 and 2×2; forecast uses 4×2. forge-npwd-garage provides fleet lookup, location/routing, impound status and parking debt where the garage provider supports them. Its fleet widget supports 2×1, 4×1 and 4×2. Weather depends on the configured weather provider; garage actions depend on actual vehicle ownership and garage services, not the launcher.

Implementation: ../forge-npwd-weather/forge-npwd.config.ts; ../forge-npwd-garage/forge-npwd.config.ts

### Management, housing and mail

forge-npwd-management groups team, business finance and application workflows with a dashboard widget at 2×1, 4×1 or 4×2; job/management permissions remain enforced. forge-npwd-housing adds property, bills and residential-security summaries with the same sizes; its app ID is housing and route /housing. forge-npwd-mail integrates citizen-addressed mail and the launcher’s mail summary where available. Mail’s shipped frontend is compiled; do not promise a source rebuild without obtaining that frontend source. Each provider must be installed for its service to work.

Implementation: ../forge-npwd-management/forge-npwd.config.ts; ../forge-npwd-housing/forge-npwd.config.ts; ../forge-npwd-mail/server/server.lua

### Banking: everyday workflow and privacy

Open the banking app and complete its own PIN setup or verification before reading protected information. The overview combines balance and recent activity; dedicated views provide history and nearby ATMs. Transfer/invoice tools depend on the configured banking service, which validates amounts, recipient and account permissions. Use the balance-visibility control when presenting the phone to someone else; the app also offers local theme preferences. The home widget is a compact entry into the same service, not a second banking implementation. Test a locked session, a frozen account, a missing provider and a transfer followed by widget refresh.

Implementation: ../forge-npwd-banking/src/App.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Garage: fleet, condition and charges

Search the fleet and filter by vehicle type or situation: cars, bikes, boats and aircraft can be distinguished, as can stored, out, insured, impounded and total-loss conditions. Vehicle details show plate/model, fuel, engine/body values and whether a reading is live or the last recorded snapshot. Unknown values are shown as unknown, not fabricated. Routes use the destination supplied by the server; tracking can be disabled with a reason. Expand a charge to inspect parking, police-fine or impound information and its invoice status. A waypoint does not pay a fine, release an impounded vehicle or bypass ownership. Widget counts and alerts summarize these provider-backed states.

Implementation: ../forge-npwd-garage/src/App.tsx; ../forge-npwd-garage/src/types.ts

### Housing: access, bills and monitored security

The housing app separates owned properties from properties with shared access. A property detail has bills, security, access and sale/transfer views. Bills can include electricity, water, residential tax and monitored security when those services exist. Security screens expose alarm/monitoring state, incidents and camera availability; action controls remain subject to server capability and revision checks. Shared access is not full ownership. A sale sends a proposal to a selected buyer through the property service, rather than changing ownership from the browser. The properties widget offers quick context and a route into the app. Test owner versus guest, offline cameras, outdated revisions and failed payments.

Implementation: ../forge-npwd-housing/src/App.tsx; ../forge-npwd-housing/src/views/PropertyDetailsPage.tsx

### Management: team, applications and permissions

Management resolves the organization from the authorized player, displays members and financial context, and exposes hiring, dismissal, grade changes and candidate review through server callbacks. Permission configuration supports grade-based permissions and member overrides, with an explicit reset operation. Nearby-player selection is a convenience for hiring, not proof that the user may administer another organization. Deposits and withdrawals use server validation. The dashboard widget is a compact summary under the same job/management permissions. Verify employee versus manager, different organizations, denied overrides and refresh after staffing or financial changes. Do not copy browser-preview member data into production.

Implementation: ../forge-npwd-management/src/App.tsx; ../forge-npwd-management/server/main.lua

### Weather and mail: provider-backed information

Weather combines current conditions and regional forecast cards. Its independently mounted widgets refresh without opening the full app and react to provider updates. Distinguish city weather from browser illustrations or the example widget’s local real-time clock. Mail integrates citizen-addressed delivery; scripts can use the mail resource’s server interface rather than pushing untrusted fake messages into the phone frontend. A missing service must produce an unavailable state, not plausible invented information. Start only resources included in your actual distribution and verify their own manifest, callbacks and app ID before registering the catalog. The compiled mail frontend is not a source-development starter.

Implementation: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-mail/server/server.lua

<a id=compatibility></a>

## Classic NPWD compatibility

An isolated forwarding layer preserves old public calls without running a second phone.

### Install the legacy adapters

compat/ contains aliases, export catalogs and incoming-event/callback adaptation. compat/resources contains versionable resource templates; misc/install-compat.cjs installs them in the sibling [forge-npwd-compat] group without overwriting different existing adapters. Start this group after Forge providers. The npwd resource inside this group is an empty proxy, not the original phone. Its exports forward to forge-npwd with the same arguments, results and handlers. Older public consumers do not need a second database, NUI phone or player session.

**forge-npwd · install thin legacy aliases**

~~~text
node misc/install-compat.cjs
# Creates sibling [forge-npwd-compat], preserving existing differing files.
# Start canonical providers first, then the necessary alias resources.
# Do NOT start another original NPWD phone alongside Forge NPWD.
~~~

Implementation: compat/aliases.json; compat/proxy_client.lua; compat/proxy_server.lua

### Classic versus current examples

Old exports.npwd:isPhoneVisible() and exports.npwd:sendNPWDMessage(...) continue through the npwd adapter. New code calls exports["forge-npwd"] and sendForgeNPWDMessage. The classic external-app pattern is still a resource exporting ./config, with a React app and its own NUI callbacks. The source descriptor filename can remain npwd.config.ts if federation exposes it correctly. The current Forge loader expects ESM/Vite remoteEntry.js: a legacy Webpack/global-container build is not guaranteed to load unchanged and may need rebuilding with the Forge template.

**client.lua · legacy caller versus new caller**

~~~text
-- Existing legacy caller (requires the installed npwd proxy):
exports['npwd']:isPhoneVisible()
exports['npwd']:sendNPWDMessage('forge-npwd-appexemple', 'summaryUpdated', {})

-- New integrations use ONLY the canonical resource:
exports['forge-npwd']:isPhoneVisible()
exports['forge-npwd']:sendForgeNPWDMessage('forge-npwd-appexemple', 'summaryUpdated', {})

-- The proxy is a compatibility boundary, not another phone.
-- ESM/Vite external apps expose './config'; older Webpack remotes may
-- need rebuilding before use with the current external-app loader.
~~~

Implementation: compat/aliases.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Supported boundaries and unchanged data

Known resource aliases, public exports, registered incoming events, NUI callbacks/old resource URLs, convar fallback and known saved app IDs are covered. Third-party app names are not blindly renamed. Outgoing internal event observers are not indiscriminately mirrored: migrate such listeners to current names to avoid duplicate effects. Existing npwd_* and forge_phone_* SQL names and old storage keys remain intentional. Do not promise every internal event or every historical frontend bundle works automatically; test your actual old consumers before release.

Implementation: compat/names.ts; compat/client.ts; compat/server.ts; FORGE_NPWD_COMPAT.md

<a id=testing></a>

## Build, test & publish

Verify artifacts and realistic multiplayer cases before distributing a release.

### Development commands

For the example: npm ci, npm run dev, npm run typecheck, npm test, npm run build and npm run preview. Preview serves the compiled remote at port 4173, matching the phone’s development remote URL; Vite dev alone does not produce the federation release entry. For the phone, use its locked pnpm workspace and root build scripts. A new external app normally requires its own build and config registration, not editing and rebuilding the whole phone. Keep generated web/dist files in a release package even though the example Git repository ignores them.

**example app · validation**

~~~text
npm ci
npm run typecheck
npm test
npm run build
npm run preview
# Optional Lua 5.4 mock tests:
lua tests/game.lua
~~~

### Required city test matrix

Test new and existing phone items, two phones on one player, transfer to another player, correct/incorrect PIN, five-attempt lock, owner blocking while another player holds it, replacement and rollback on full inventory. Test app install/remove, page changes, drag/drop overlaps, all widget sizes, two widget instances and reopening after restart. For each sensitive app test both authorized and unauthorized actors. Confirm a real older exports.npwd consumer, voice, media and provider restarts. Local mocks and builds cannot certify these multiplayer scenarios.

### Release safety and contributions

Distribute compiled frontend, Lua/game code, manifests, required assets, config examples, dependency information and original notices. Do not ship database credentials, upload tokens, personal records, node_modules or local planning folders. Maintain stable public IDs and document intentional breaking changes. Pin dependencies compatible with the host and review old transitive packages before release; compatibility does not mean every historical dependency is current. Preserve existing data and keep a previous working release for rollback. No commit or automatic publication is required to build locally.

<a id=troubleshooting></a>

## Troubleshooting

Trace resource availability, federation, callbacks and device context independently.

### Missing export or app

No such export isPhoneVisible in resource npwd usually means an old consumer is calling a resource that is absent or not the installed adapter. Verify forge-npwd is started, [forge-npwd-compat] is installed if needed and the consumer is on the correct client/server side. For a missing app, check its folder name in config.json apps, remoteEntry.js at web/dist root, the ./config expose and React component icons. For a visible catalog entry but absent home icon/widget, install the app through Forge Store and check saved layout space.

### NUI timeout, blank screen or stale widget

A NUI request sent to forge-npwd instead of the external app will not find that app’s callback. Verify the explicit URL resource, callback name, server registration and one-response rule. A blank federated screen can indicate an incompatible React/Router runtime, missing chunks or a factory expecting settings that the loader does not pass. For stale widgets verify timers/listeners, permission masking and provider availability. Never resolve a stalled UI by bypassing server permissions. Use F8 plus server logs and reproduce the smallest failing request.

### Recovery rejected or data changed

DEVICE_MUST_BE_BLOCKED requires reporting the loss first. DEVICE_NOT_FOUND_OR_NOT_OWNED means the requesting player is not the registered owner or the ID is invalid. An inventory error requires capacity/item/metadata checks; do not repeat issuance blindly. A replacement preserves the PIN, so a forgotten code is not cleared. If transferring a phone creates a blank profile, inspect whether inventory metadata survived. Report the exact source version, resource name, operation, expected result and sanitized logs; never publish a real PIN or connection string.

<a id=credits></a>

## Credits & project scope

A Forge evolution built on NPWD, with upstream authorship preserved.

### Project Error / NPWD

NPWD was created by Project Error and its contributors. Forge NPWD is a community fork that extends the phone with the device, security, recovery, launcher, widget and compatibility work documented here. Credit remains due for the original phone, artwork and contributions. This guide is written for the Forge implementation rather than copied from the upstream website. Consult the original documentation for historical context and compare against the current Forge source before reusing an old recipe.

[Project Error documentation](https://projecterror.dev/docs/)

[Project Error / NPWD source](https://github.com/project-error/npwd)

### Distribution and license notices

Preserve upstream LICENSE, author notices and relevant asset licenses when redistributing the fork. The example’s own LICENSE is included in its repository. The inspected phone checkout contains a GPL-3.0-or-later notice in LICENSE while root package.json carries a different historical license label; this documentation does not resolve that discrepancy. Maintainers should reconcile notices before publishing a public release. Forge NPWD is not presented as an official Project Error release or as a guarantee that every external provider works without configuration.

Implementation: LICENSE; package.json

