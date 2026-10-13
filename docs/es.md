<!-- generated-by: gsd-doc-writer -->
# Forge NPWD — Guía completa

Una plataforma de teléfono open source: dispositivos físicos, seguridad, recuperación, escritorios personalizables, tienda de aplicaciones y un contrato extensible para apps y widgets.

[Forge Site](https://framework-forge.github.io/site/#forge-npwd/overview) · [Example App](https://github.com/Framework-Forge/forge-npwd-appexemple) · [README](../README.md)

## Documentación

- [Resumen y mejoras](#overview)
- [Instalación](#installation)
- [Configuración](#configuration)
- [Uso diario del jugador](#players)
- [PIN y seguridad](#security)
- [Pérdida, bloqueo y recuperación](#recovery)
- [Tienda de teléfonos y atención](#shop)
- [Escritorios y Forge Store](#desktop)
- [Crear una app externa](#applications)
- [NUI, servidor y notificaciones](#communication)
- [Desarrollar widgets](#widgets)
- [Referencia de la API pública](#api)
- [Apps Forge y mejoras](#ecosystem)
- [Compatibilidad con NPWD clásico](#compatibility)
- [Compilar, probar y publicar](#testing)
- [Solución de problemas](#troubleshooting)
- [Créditos y alcance](#credits)

<a id=overview></a>

## Resumen y mejoras

Forge NPWD evoluciona NPWD manteniendo su filosofía extensible.

### Un teléfono, integración incluida

forge-npwd reúne teléfono, identidad, API, compatibilidad antigua e integración de jugador/inventario. PR Bridge gestiona los adaptadores; no necesita bridge de teléfono ni recurso de compatibilidad separado. forge-npwd-shop sigue como servicio opcional de venta/recuperación y las apps son independientes. Cualquier servidor FiveM con los adaptadores necesarios puede usar el proyecto.

Implementación: fxmanifest.lua; apps/game/server/player_bridge.lua; apps/game/client/player_bridge.lua

### Lo que añade Forge

Cada dispositivo tiene su propio número de serie, perfil y línea. El portador puede diferir del propietario registrado. El PIN numérico, el bloqueo y la sustitución validada por propietario protegen esa identidad. El inicio añade iconos arrastrables, varias páginas y widgets. Forge Store gestiona las apps instaladas por perfil. Las API forge-npwd y la compatibilidad integrada conservan integraciones públicas antiguas sin crear otro teléfono.

### Lee según tu objetivo

Los jugadores deben leer uso diario, seguridad, recuperación y escritorios/tienda. Los administradores deben empezar por instalación y configuración y comprobar metadata y adaptadores. Los desarrolladores deben consultar el tutorial de apps externas, los archivos completos del ejemplo, el contrato de widgets, la API y las pruebas. Cada sección técnica indica el archivo comprobado; el comportamiento debe probarse también en la ciudad.

<a id=installation></a>

## Instalación

Mantén estable el nombre del teléfono y prepara los adaptadores antes de la primera sesión.

### Release o código fuente

Usa la distribución Forge, no el paquete original de NPWD como sustituto. Una release compilada debe contener dist/game y dist/html. El código fuente requiere las dependencias pnpm y el build de la raíz; no despliegues un archivo sin compilar. La carpeta debe llamarse forge-npwd. Conserva copias de config.json y los datos persistentes. El ejemplo usa npm y su propio lockfile; su compilación es independiente del workspace del teléfono.

**forge-npwd · source build**

~~~text
pnpm install --frozen-lockfile
pnpm build
# Run in the PHONE repository, not the example app.
# For a release package, use its supplied dist/ files.
~~~

Implementación: package.json; fxmanifest.lua

### Dependencias e inicio

Inicia framework, inventario y SQL, después PR Bridge, screenshot-basic y pma-voice antes de forge-npwd. Configura mysql_connection_string para su pool mysql2. Compila/inicia apps antes de abrir el teléfono; las dependencias controlan el inicio. El ejemplo evita dependencia rígida del teléfono. Inicia la tienda opcional después. No necesita proxies ni bridge separado.

**server.cfg · order example**

~~~text
ensure pr_bridge
ensure pma-voice
ensure screenshot-basic

# Start the selected framework, inventory and SQL driver first.
# Build/start apps before players open the phone; respect dependencies.
ensure forge-npwd-appexemple
ensure forge-npwd
# Integration and compatibility are INSIDE forge-npwd.
# Optional purchase / replacement service:
ensure forge-npwd-shop
~~~

Implementación: fxmanifest.lua; packages/database/src/db/pool.ts

### Base de datos y primera ejecución

Importa el import.sql incluido para el esquema básico NPWD en una base nueva. Los repositorios gestionan las extensiones de dispositivos, seguridad y perfiles; el usuario de base debe poder aplicar esos cambios. No borres tablas npwd_* ni forge_phone_* durante la migración. Comprueba que el item phone existe, no se apila, conserva metadata al transferirlo y llama a la integración de uso. Prueba un dispositivo nuevo, uno transferido, PIN, llamada, cámara y todas las apps. Nunca inicies el NPWD original junto a Forge NPWD.

Implementación: import.sql; apps/game/server/devices/device.database.ts

### Dependencias de las apps y orden de inicio

El loader necesita alcanzar el remoto compilado al importar. El ejemplo nuevo puede iniciarse antes del teléfono. Pero los manifiestos comprobados de banco, garaje, viviendas, clima, gestión y correo dependen de forge-npwd e importan su helper. FiveM resuelve esa dependencia sin obedecer necesariamente el orden textual de ensure; listar las apps primero no garantiza teléfono al final. Comprueba manifiestos y logs. Si falla un remoto, termina de iniciar las apps y reinicializa el teléfono durante una prueba/mantenimiento controlado; el loader puede conservar el fallo en esa sesión UI. No elimines dependencias a ciegas ni dupliques teléfonos. El ejemplo de orden corresponde al template independiente, no a todas las apps.

Implementación: apps/phone/src/common/hooks/useExternalApps.tsx; ../forge-npwd-banking/fxmanifest.lua; ../forge-npwd-mail/fxmanifest.lua

<a id=configuration></a>

## Configuración

Configuración del teléfono, catálogo de apps y credenciales tienen responsabilidades separadas.

### Configuración del dispositivo

device.enabled activa los dispositivos físicos. itemName elige el item; defaultModel y defaultColor definen los nuevos dispositivos y metadataSchemaVersion su versión de metadata. mirrorLegacyPhoneNumber mantiene el campo antiguo del propietario cuando está configurado. PhoneAsItem.enabled y exportResource/exportFunction controlan la disponibilidad. Deben coincidir con items y exports reales; renombrar un campo no migra los datos. Conserva el contenedor actual forgeForgeNpwd pese a su nombre histórico.

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

Implementación: config.json; apps/game/server/devices/device.service.ts

### General, base de datos y apps

Forge NPWD activa useResourceIntegration internamente porque PR Bridge carga los personajes. No dupliques newPlayer/unloadPlayer. Las convars antiguas no activan loaders directos. Configura playerTable, identifierColumn, identifierType, phoneNumberColumn y profileQueries para tu esquema: cambiar adaptador no migra SQL. toggleCommand, toggleKey y defaultLanguage controlan acceso. apps contiene carpetas; Forge Store instala apps por perfil, no recursos.

Implementación: packages/config/server/index.ts; apps/game/server/player_bridge.lua; apps/phone/src/common/hooks/useExternalApps.tsx

### Jugador e item mediante PR Bridge interno

La integración usa GetPhoneProfile, GetAllPlayers, eventos normalizados e inventory.RegisterUsableItem. Identificador y nombres vienen de PR Bridge; el número previo es opcional. device.itemName define el item y no se consume. El servidor vuelve a leer slot/metadata reales y no acepta un ID de jugador del cliente. Si el inventario no despacha el adaptador, configura la acción cliente forge-npwd.usePhoneItem o evento forge-npwd:client:usePhoneItem con slot. Los items ox dinámicos Forge se vinculan automáticamente. Prueba cada combinación real.

Implementación: apps/game/server/player_bridge.lua; apps/game/client/player_bridge.lua; apps/game/server/device_bridge.lua

### Medios, integraciones y secretos

images configura URL de subida, formato, cabeceras y returnedDataIndexes. imageSafety define hosts permitidos. voiceMessage configura audio opcional; contacts.frameworkPay y sus exports seleccionan pagos. customPhoneNumber puede delegar la generación de números. twitter, match, marketplace, defaultContacts, browser y debug mantienen opciones propias. Guarda tokens en convars de servidor no replicadas, nunca en JSON para NUI, scripts cliente ni ejemplos versionados. Las convars antiguas son fallback: prevalece el nombre Forge configurado.

Implementación: config.json; compat/convars.ts; packages/config/server/index.ts

<a id=players></a>

## Uso diario del jugador

Tu item selecciona el dispositivo; posesión y propiedad no son lo mismo.

### Primer uso y cambio de dispositivo

Adquiere un teléfono en el inventario o servicio configurado y usa ese item. El primer uso crea la identidad cuando hace falta. Si llevas varios teléfonos, usa el slot deseado para activar ese dispositivo; el comando genérico no selecciona items. El cambio invalida la sesión de desbloqueo del portador y abre el flujo de seguridad. No edites metadata ni apiles teléfonos: deviceId, número de serie, perfil y línea deben acompañar cada item.

Implementación: apps/game/server/device_bridge.lua; apps/game/server/devices/device.service.ts

### Entregar el teléfono a otro jugador

Transfiere o suelta el teléfono mediante una integración que conserve metadata. El siguiente portador activa el dispositivo existente, no una copia vacía a su nombre. Tras desbloquearlo, los datos del perfil y apps pueden seguir al dispositivo. Esto no transfiere la propiedad registrada ni concede todos los permisos laborales, inmobiliarios o financieros. Las apps sensibles deben distinguir propietario y portador y aplicar reglas de servidor.

### Ajustes y herramientas diarias

Usa Ajustes para idioma, apariencia, marco, fondo, audio y notificaciones compatibles. Llamadas, mensajes, contactos, cámara, galería y otras apps habilitadas conservan sus interfaces. El PIN del teléfono y el bancario son distintos. La vista del navegador usa datos ilustrativos y no demuestra inventario, voz, subida ni propiedad. El administrador define integraciones y catálogo; instalar una app en el inicio no instala un recurso de servidor.

<a id=security></a>

## PIN y seguridad

Protege el acceso sin confundir un bloqueo visual con autorización.

### Crear, desbloquear y cambiar el PIN

El teléfono acepta PIN numérico de 4–6 dígitos. Un dispositivo sin clave abre el registro y uno configurado solicita verificación. El cambio valida primero el código actual. El servidor deriva un hash con scrypt y salt aleatorio y compara mediante timingSafeEqual. El PIN no se guarda en metadata. Mantén la clave privada: entregar el dispositivo a alguien que la conoce puede exponer sus datos, con las autorizaciones adicionales de cada app.

Implementación: typings/security.ts; apps/game/server/security/security.service.ts

### Intentos y sesiones desbloqueadas

La implementación permite cinco intentos fallidos antes de un bloqueo temporal de cinco minutos. Una verificación válida crea una sesión de portador/dispositivo con TTL máximo de 12 horas. Activar el dispositivo reinicia la sesión; bloquearlo invalida sus sesiones. Son constantes de código, no opciones de config.json. La respuesta incluye configured, unlocked, attemptsRemaining, lockedUntil y pinLength; INVALID_PIN_FORMAT o INVALID_CURRENT_PIN identifican el fallo.

Implementación: apps/game/server/security/security.service.ts; typings/security.ts

### La autorización de la app es distinta

La app bancaria añade su PIN de 4–8 dígitos y sesiones de servidor. Su widget oculta datos sensibles cuando la sesión bancaria está bloqueada. Otras apps comprueban propiedad, trabajo o servicio. getActivePhoneContext devuelve identidad, no prueba de PIN desbloqueado ni autorización financiera. No expongas datos privados porque la interfaz esté oculta. El ejemplo devuelve solo información pública y no implementa operaciones privadas ni financieras.

Implementación: ../forge-npwd-banking/server/main.lua; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

<a id=recovery></a>

## Pérdida, bloqueo y recuperación

Sustituye el dispositivo conservando perfil y línea del propietario.

### Bloqueo validado por propietario

El servicio lista dispositivos registrados al jugador solicitante. Declara la pérdida en la tienda configurada o mediante integración autorizada. cancelLostPhone valida propiedad y cambia el estado a blocked, invalida sesiones y avisa al portador activo. El item viejo puede existir en otro inventario, pero ya no es un dispositivo activo. Bloquear no equivale a cerrar la NUI ni deshabilitar temporalmente la interfaz.

Implementación: apps/game/server/recovery/recovery.service.ts; apps/game/server/devices/device.service.ts

### Qué conserva la sustitución

issueReplacementPhone exige un dispositivo bloqueado del solicitante. Crea deviceId y serie nuevos, conserva profileId, lineId y phoneNumber y copia hash/salt del PIN sin eliminarlo. El anterior pasa a replaced y registra replacedByDeviceId. Usa una transacción y compensa la inserción de inventario si falla el commit. No devuelve físicamente el item, no concede teléfonos ajenos ni recupera un PIN olvidado borrándolo.

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

Implementación: apps/game/server/recovery/recovery.exports.ts; apps/game/server/recovery/recovery.service.ts

### Integra tarifas y protege la emisión

Usa la configuración y callbacks de la tienda para precios, ubicaciones y acceso. Los exports de emisión no sustituyen la validación de pagos de tu script. Deriva source de la petición, valida propiedad y capacidad, impide compras repetidas y trata success/error. Los exports ofrecen callbacks opcionales para Lua; JavaScript puede esperar promises. Errores comunes: DEVICE_MUST_BE_BLOCKED, DEVICE_ALREADY_REPLACED, DEVICE_NOT_FOUND_OR_NOT_OWNED e INVENTORY_ADD_FAILED.

Implementación: apps/game/server/recovery/recovery.exports.ts; ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua

<a id=shop></a>

## Tienda de teléfonos y atención

forge-npwd-shop conecta el catálogo de dispositivos físicos con compra, consulta del propietario, bloqueo y sustitución mediante PR Bridge.

### Recurso separado, no la tienda de apps

Forge NPWD Shop ofrece venta y recuperación en el mundo. Forge Store dentro del teléfono gestiona apps instaladas; son tiendas con funciones distintas. Instala la carpeta como forge-npwd-shop y mantén forge-npwd y pr_bridge disponibles. La tienda carga @pr_bridge/init.lua y @forge-npwd/compat/app.lua y usa menús, alertas, notificaciones, callbacks y adaptadores de dinero de PR Bridge. No incluye otro teléfono ni requiere un SQL propio: el servicio del teléfono gestiona dispositivos, perfiles y líneas. Se compararon configuración y archivos client/server publicados con la implementación de esta guía.

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

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/fxmanifest.lua

[Repositorio Forge NPWD Shop](https://github.com/Framework-Forge/forge-npwd-shop)

### Configura ubicaciones, catálogo y tarifas

Edita config.lua de la tienda, no appCatalog del teléfono. Config.Models contiene id, label, descripción, precio, icono del menú y pares id/label de colores. El catálogo incluye Forge One (2500), Forge Pro (4500) y Forge Ultra (7000); la tarifa de sustitución es 750. Los IDs de modelo/color pasan al metadata, no son items distintos ni modelos 3D creados automáticamente. Usa letras, números, guiones bajos o guiones; el teléfono admite modelo de hasta 32 caracteres y color de hasta 24. Config.Locations admite varios puntos vector3 con marcador y blip. El ejemplo es una configuración completa reducida con un punto; sustituye sus coordenadas. Esta versión no tiene editor in-game. Después de editar, reinicia solo forge-npwd-shop durante mantenimiento controlado para recargar precios y menús/blips juntos.

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

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua; apps/game/server/recovery/recovery.service.ts

### Acceso por marcador e integración opcional con NPC

La tienda actual crea marcadores y blips, no un ped. Dibuja el marcador dentro de DrawDistance (15 m por defecto) y muestra E dentro de InteractionDistance (2 m). Pulsa E para abrir. Config.Locations no tiene modelo de ped, heading, selector target/interact ni herramienta de colocación. Para un NPC, tu recurso de NPC/interacción debe crearlo y colocarlo y llamar al export client openShop desde la acción seleccionada. El ejemplo solo abre el menú; no crea NPC ni registra target. Gestiona el NPC en esa integración y evita marcadores duplicados cuando corresponda. No presentes el NPC como función incluida. /forgephoneshop también abre el menú: es un comando de prueba sin restricción de ubicación.

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

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua

### Flujo del jugador: compra y primer uso

Abre el servicio, elige Comprar dispositivo, selecciona modelo y color y confirma el precio. El servidor obtiene al jugador del source del callback, verifica modelo/color en su catálogo y calcula el cobro. issueNewPhone crea ID, serial, perfil, línea y número únicos y entrega el item configurado con metadata forgeForgeNpwd. Usa el item para seleccionar/abrir el dispositivo físico. Comprar otro teléfono no sustituye el perfil anterior. Los modelos son opciones del mismo item configurado; comprueba que exista, no se apile y conserve metadata. Personaje no cargado, saldo insuficiente o entrega rechazada no equivalen a compra exitosa.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Prioridad de pago, sin dividir el cobro

Config.PaymentAccounts es una lista ordenada de cuentas del adaptador de dinero PR Bridge. Con { cash, bank }, prueba efectivo y después banco; una cuenta debe cubrir todo el precio. No suma saldos ni muestra selector de método. Si efectivo no basta y banco cubre, todo se cobra del banco. Cambia el orden o permite una sola cuenta. Precios y RecoveryPrice se redondean hacia abajo a enteros con mínimo cero; cero es gratis. El bloqueo no tiene tarifa propia. Revisa la configuración del servidor antes de publicar.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Mis dispositivos: propietario y bloqueo por pérdida

Mis dispositivos lista los del propietario registrado mediante getOwnedPhoneDevices, incluso fuera de su inventario. Muestra número, modelo, estado y serial; los detalles incluyen ID y color. Los activos permiten bloqueo por pérdida y sustitución; los bloqueados permiten sustitución. Los sustituidos quedan como historial sin otra sustitución en el menú. Confirmar pérdida llama cancelLostPhone con el source autenticado; el teléfono verifica propiedad y revoca acceso al dispositivo. Llevar el teléfono ajeno no concede derechos de recuperación. Bloquear desactiva el item antiguo; no lo elimina ni lo devuelve físicamente.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Sustitución: qué se conserva y qué cambia

Elige Recuperar en un nuevo dispositivo y confirma la tarifa. La tienda cobra, bloquea el seleccionado y llama issueReplacementPhone. Permite recuperar directamente uno activo sin bloqueo manual previo en la tienda. El export del teléfono por sí solo exige un dispositivo bloqueado y verifica propietario. El reemplazo tiene nuevo deviceId y serial, pero mantiene profileId, lineId, número, modelo, color y hash/salt del PIN. Los datos vinculados al perfil, como ajustes de inicio, siguen asociados a ese perfil. El anterior queda sustituido e inutilizable. Es otro item físico para la misma identidad, no cambio de número ni copia libre.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Reset no es una operación de la tienda

La tienda comprobada no ofrece restauración de fábrica, reset de PIN olvidado, borrado ni reinicio de recursos para jugadores. La opción con flechas significa sustitución/recuperación, no reset. Conserva el PIN y no evita un código desconocido. Comprar otro teléfono crea otro perfil sin borrar el anterior. Reiniciar forge-npwd-shop es mantenimiento administrativo para recargar configuración, no un servicio vendido. Un futuro reset necesita reglas propias de autorización, conservación de datos y propiedad antes de anunciarse.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Fallos y límites del control de acceso

El servidor serializa compra/bloqueo/recuperación del jugador mientras una operación está en curso y rechaza opciones fuera del catálogo. Los errores de emisión devueltos provocan reembolso a la cuenta cobrada. Si bloquea el anterior y falla la entrega, devuelve la tarifa pero el anterior sigue bloqueado; liberar inventario y reintentar no reactiva el item antiguo. PhoneExportTimeout vale 15000 ms y CallbackTimeout 25000 ms. Un timeout deja de esperar, no cancela una operación de base/export en curso. Comprueba dispositivos, inventario y logs antes de repetir: un resultado tardío requiere conciliación. Los callbacks validan jugador/catálogo/pago y delegan propiedad al teléfono, pero no proximidad en servidor, horarios, trabajo o permisos del NPC. El marcador, comando o target cliente no es una barrera de autorización del servidor. Añade validación servidor en una tarea separada antes de exigir comercio restringido por ubicación; esta guía no afirma que exista.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Interfaces de tienda y pruebas de aceptación

La entrada pública client es exports['forge-npwd-shop']:openShop(); abre el menú raíz sin devolver una compra. Los callbacks internos PR Bridge de servidor son forge-npwd-shop:server:getDevices (sin argumentos), :buyPhone (modelId, colorId), :cancelPhone (deviceId) y :recoverPhone (deviceId), todos con prefijo forge-npwd-shop:server. Devuelven success/error; getDevices añade devices. No son exports del teléfono; los servicios propios deben usar APIs canónicas con sus pagos/permisos, sin tomar un callback de menú como autorización. Prueba E/comando, modelos/colores, prioridad efectivo/fallback banco, saldos que no cubren en una sola cuenta, inventario lleno/reembolso, pérdida con otro portador, propietario frente a portador, sustitución manteniendo número/PIN, dispositivo ya sustituido, teléfono ausente y conciliación por timeout. Verifica menús, alertas y pagos con los proveedores PR Bridge en multiplayer real.

Implementación: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

<a id=desktop></a>

## Escritorios y Forge Store

Personaliza el perfil activo, no la instalación de apps de todo el servidor.

### Editar iconos, páginas y widgets

Mantén pulsada una zona vacía para editar. Arrastra iconos o widgets a celdas libres, cambia páginas y usa los controles para añadir o quitar escritorios. La cuadrícula tiene 4 columnas × 5 filas, 20 celdas por página y hasta 5 páginas. Los widgets reservan rectángulos y no admiten iconos superpuestos. Elige un widget registrado y un tamaño ofrecido en el selector. Los límites son constantes, no ajustes de un panel admin.

Implementación: typings/home.ts; apps/phone/src/apps/home/components/Home.tsx

### Instalar y desinstalar apps

Abre Forge Store, busca en el catálogo del servidor y elige Instalar o Quitar. Cambia installedApps del perfil activo con progreso y reversión si falla el guardado. DIALER, MESSAGES, CONTACTS, CAMERA, SETTINGS y FORGE_STORE siempre se conservan. Quitar una app actualiza el inicio y sus widgets; no borra el recurso ni elimina automáticamente registros de base. El progreso es feedback visual, no una tienda remota que descarga código.

Implementación: apps/phone/src/apps/store/ForgeStoreApp.tsx; apps/phone/src/apps/home/state/home.state.ts

### Persistencia y validación

HomeLayout guarda pageCount, pages, widgets e installedApps por perfil activo. Cada widget registra instanceId, widgetId, page, x, y, width y height. El servidor rechaza páginas inválidas, IDs duplicados, posiciones fuera de la cuadrícula y solapamientos. Limita a 20 widgets y 64 IDs de entrada en installedApps. Son controles de integridad, no autorización de transacciones. Los diseños antiguos sin installedApps migran conservando las apps existentes.

Implementación: apps/game/server/home/home.controller.ts; apps/game/server/home/home.database.ts

<a id=applications></a>

## Crear una app externa

Empieza con el ejemplo completo y cambia los identificadores como un contrato coherente.

### Clonar, instalar y visualizar

El template público es forge-npwd-appexemple; conserva esa grafía en los comandos. Usa Node 20 o posterior. npm ci instala dependencias fijadas, npm run dev abre la vista independiente y npm run build comprueba tipos y genera web/dist. La vista usa datos simulados y MemoryRouter; en juego el teléfono proporciona el router. No montes otra raíz React en el iframe del recurso.

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

### Nombre del recurso, ID y ruta

RESOURCE_NAME es la carpeta para FiveM, config.json y URLs NUI. APP_ID identifica la app en inicio, mensajes y widgets. APP_PATH es la ruta. Pueden diferir: forge-npwd-banking usa BANKING_APP y /bankingapp. El template usa un prefijo coherente. Al renombrarlo, cambia contracts.ts, fxmanifest.lua, ambos Lua, el nombre de federación, el inicio y el array apps. Los IDs estables conservan instalaciones y referencias guardadas.

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

Implementación: apps/phone/src/common/hooks/useExternalApps.tsx

### Publicar el descriptor

forge-npwd.config.ts exporta una factory default con id, nameLocale, path, color, backgroundColor, icon, notificationIcon y app, más homeWidgets opcional. Los iconos y app son funciones React, no JSX renderizado. El loader llama sin settings; no supongas settings.language. El ejemplo tiene selector de idioma propio. Los estilos forge-example-* evitan alterar teléfono y apps. Usa el router del host, sin BrowserRouter interno.

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

Implementación: apps/phone/src/common/hooks/useExternalApps.tsx

### Federación, archivos y despliegue

El teléfono carga https://cfx-nui-RESOURCE_NAME/web/dist/remoteEntry.js e importa ./config como remoto ESM/Vite. forge-npwd.config.ts es una convención; ./config es el contrato de ejecución. Usa assetsDir vacío para ubicar remoteEntry.js en la raíz. Comparte React, React DOM y React Router compatible; no migres a Router 6 sin adaptar el teléfono. Distribuye fxmanifest, Lua y web/dist, registra apps, reinicia el recurso y reabre/reinicia el teléfono en una prueba planificada.

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

Implementación: apps/phone/src/common/hooks/useExternalApps.tsx

### El diseño completo

El ejemplo separa cabecera, navegación, contenido desplazable y vistas de widgets. Resumen consulta datos públicos; Guía explica el flujo. Muestra carga, error y reintento. El widget se adapta a celdas, no a píxeles fijos. Cópialo como base y sustituye los datos simulados y callbacks públicos por servicios autorizados. No incluye transferencias, cambios de propietario ni acceso privado.

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

### Manifiesto del recurso y versiones compartidas

El manifiesto carga PR Bridge en ambos contextos y sirve todos los archivos compilados. No depende obligatoriamente de forge-npwd para iniciarse antes; los callbacks verifican su disponibilidad. El template fija React 17.0.2 y Router 5.3.0 según el host comprobado. La federación necesita una instancia React compatible; divergencias pueden causar errores de hooks incluso compilando. Conserva el lockfile e incluye web/dist. Otras apps pueden tener dependencias distintas; copiar código no sustituye probar el runtime.

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

## NUI, servidor y notificaciones

Usa destinos explícitos e identidad derivada del servidor.

### Petición: React → Lua → servidor

fetchNui envía JSON a https://RESOURCE_NAME/getSummary. El código federado vive en el documento del teléfono, por eso GetParentResourceName identifica el teléfono, no la app: usa el nombre externo. RegisterNUICallback llama a pr_lib.callback.await con 5 segundos de timeout. El servidor registra el mismo callback y deriva source. El ejemplo añade 7 segundos de timeout en navegador y responde una vez con ok/data u ok/error.

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

### Validar en el servidor

No confíes en identificador, propietario, saldo ni profileId de NUI. El ejemplo deriva getActivePhoneContext(source), exige dispositivo activo y limita las lecturas públicas. Solo devuelve población y hora. Para operaciones privadas o mutaciones añade sesión, comprobaciones de propietario/trabajo, límites, transacciones y auditoría. Un teléfono ausente o reiniciando debe dar error controlado. Un contexto activo no prueba verificación de PIN.

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

### Eventos y notificaciones

SendNUIMessage del recurso externo llega a su iframe, no al teléfono. Usa exports["forge-npwd"]:sendForgeNPWDMessage(APP_ID, method, data) y comprueba event.data.app y event.data.method. createNotification usa ID, ruta y notisId estable; duration son milisegundos. El ejemplo incluye notificación protegida y evento local de actualización. Limpia listeners y timers al desmontar. No envíes PIN, tokens ni registros privados innecesarios.

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

Implementación: apps/game/client/cl_exports.ts

<a id=widgets></a>

## Desarrollar widgets

El mismo contrato usado por banca, clima y otras apps Forge.

### Registrar homeWidgets

Añade homeWidgets al descriptor. Cada entrada contiene id local estable, name, description opcional, sizes, Component y path opcional. Un tamaño es {width, height, label}; width/height son enteros positivos en celdas, no píxeles. Component recibe {width, height}. El teléfono crea widgetId como APP_ID:id_local, por ejemplo forge-npwd-appexemple:summary. No cambies los IDs tras guardar posiciones. El widget solo se ofrece con la app instalada.

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

Implementación: apps/phone/src/os/apps/config/apps.tsx; apps/phone/src/apps/home/components/Home.tsx

### Renderizar independiente y adaptar tamaño

Los widgets se montan fuera del componente principal y sus providers privados. No dependas de un provider exclusivo de App. Usa hook independiente, store compartida o provider propio. El resumen ofrece 2×1, 4×1 y 4×2, mostrando hora en formatos altos. El reloj ofrece 2×1 y 2×2 sin servidor; muestra hora local real, no de la ciudad. Usa raíz al 100%, border-box y evita overflow y CSS global.

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

### Actualización y limpieza

El widget bancario consulta cada 30 segundos y reacciona a transferencias/facturas; el clima cada 60 segundos y a weatherUpdated. No dependen de la app abierta. El ejemplo consulta cada 60 segundos con documento visible y escucha summaryUpdated comprobando app/method. Agrupa solicitudes simultáneas y cachea brevemente el resultado público. Limpia intervalos y listeners en useEffect; trata carga, permiso denegado y proveedor ausente sin conservar datos privados antiguos.

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

Implementación: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Instalación del jugador y diagnóstico

Compila e inicia la app, registra la carpeta en apps e instálala en Forge Store. Mantén una zona vacía, abre el selector, elige resumen o reloj y tamaño y colócalo en celdas libres. Un clic abre widget.path o la ruta; editar permite moverlo. Si falta, comprueba installedApps, Component como función, sizes como array, medidas enteras, app habilitada y remoteEntry válido. Quitar un widget no desinstala la app. Prueba tamaños, dos copias, idiomas y reinicio.

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

## Referencia de la API pública

Los exports cliente y servidor son superficies distintas; respeta firmas y límites de confianza.

### Convenciones de llamada

Lua usa exports["forge-npwd"]:metodo(...). JavaScript/TypeScript usa exports["forge-npwd"].metodo(...) y await en operaciones asíncronas. Comprueba GetResourceState y maneja reinicios. La recuperación ofrece overloads de callback para Lua; no supongas tablas inmediatas en todos los exports asíncronos. El catálogo cubre llamadas públicas, no compatGetNuiCallbacks/compatInvokeNui ni setters internos. Usa la API actual en código nuevo y adaptadores para consumidores antiguos.

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

Implementación: apps/game/client/cl_exports.ts; apps/game/server/bridge/sv_exports.ts; compat/exports.json

### Contexto del dispositivo activo

getActivePhoneContext(source) es síncrono y devuelve deviceId, profileId, phoneNumber, ownerIdentifier y holderIdentifier o null. ownerIdentifier es propietario registrado y holderIdentifier jugador actual. Distingue los registros ligados a profileId de permisos laborales del actor correcto. Nunca aceptes esos campos de NUI como autoridad. ID de app, recurso y ruta no sustituyen la identidad del jugador.

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

Implementación: apps/game/server/devices/device.service.ts

### Datos de recuperación y notificaciones

La lista de dispositivos devuelve un array. Las acciones de recuperación devuelven success y campos opcionales de error/identidad; no lo confundas con {ok, data, error} del ejemplo. En TypeScript, CreateNotificationDTO también declara onClick; Lua puede omitirlo porque el runtime valida objeto y notisId. Las notificaciones del sistema usan uniqId. No envíes funciones por JSON/NUI. Modelo/color se normalizan en servidor; slot es una posición real. Los ejemplos no evitan pagos ni permisos de servicio.

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

Implementación: typings/recovery.ts; typings/notifications.ts

### Cliente

#### HasPhone

~~~ts
HasPhone(): boolean
~~~

Disponibilidad del item en caché; no valida PIN ni autorización servidor.

Implementación: apps/game/client/player_bridge.lua

#### usePhoneItem

~~~ts
usePhoneItem(data: {slot: number}, item?: {slot: number}): boolean
~~~

Entrada cliente del inventario; solicita slot validado sin consumir el teléfono.

Implementación: apps/game/client/player_bridge.lua

#### isPhoneVisible

~~~ts
isPhoneVisible(): boolean
~~~

Indica si está abierto. No verifica autorización PIN.

Implementación: apps/game/client/cl_exports.ts

#### setPhoneVisible

~~~ts
setPhoneVisible(visible: boolean | number): Promise<void>
~~~

Abre o cierra mediante el flujo normal. Exige disponibilidad.

Implementación: apps/game/client/cl_exports.ts

#### isPhoneDisabled

~~~ts
isPhoneDisabled(): boolean
~~~

Consulta la flag cliente, no el bloqueo persistente.

Implementación: apps/game/client/cl_exports.ts

#### setPhoneDisabled

~~~ts
setPhoneDisabled(disabled: boolean | number): void
~~~

Define disponibilidad cliente. No declara pérdida validada.

Implementación: apps/game/client/cl_exports.ts

#### hasActivePhone

~~~ts
hasActivePhone(): Promise<boolean>
~~~

Comprueba item y dispositivo activo en servidor.

Implementación: apps/game/client/cl_exports.ts

#### hasForgeNPWDItem

~~~ts
hasForgeNPWDItem(): boolean
~~~

Comprueba item mediante inventario, no desbloqueo.

Implementación: apps/game/client/device_bridge.lua

#### openApp

~~~ts
openApp(appId: string): void
~~~

Solicita app por ID, no carpeta ni URL. Abre el teléfono aparte si hace falta.

Implementación: apps/game/client/cl_exports.ts

#### sendForgeNPWDMessage

~~~ts
sendForgeNPWDMessage(app: string, method: string, data: unknown): void
~~~

Envía {app, method, data}; normaliza nombres antiguos conocidos.

Implementación: apps/game/client/cl_exports.ts

#### createNotification

~~~ts
createNotification(dto: CreateNotificationDTO): void
~~~

Usa appId, content, secondaryTitle, path, notisId, duration y keepOpen. Milisegundos.

Implementación: apps/game/client/cl_exports.ts

#### createSystemNotification

~~~ts
createSystemNotification(dto: SystemNotificationDTO): void
~~~

Usa uniqId. Acciones exigen controls=true y keepOpen=true.

Implementación: apps/game/client/cl_exports.ts

#### removeSystemNotification

~~~ts
removeSystemNotification(uniqId: string): void
~~~

Quita notificación de sistema por ID único.

Implementación: apps/game/client/cl_exports.ts

#### startPhoneCall

~~~ts
startPhoneCall(number: string, isAnonymous?: boolean): void
~~~

Inicia llamada a número string; anónimo false por defecto.

Implementación: apps/game/client/cl_exports.ts

#### isInCall

~~~ts
isInCall(): boolean
~~~

Consulta estado de llamada cliente.

Implementación: apps/game/client/cl_exports.ts

#### endCall

~~~ts
endCall(): Promise<void>
~~~

Termina llamada activa y animación.

Implementación: apps/game/client/cl_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(): Promise<string>
~~~

Lee línea actual; consulta servidor sin caché.

Implementación: apps/game/client/cl_exports.ts

#### fillNewContact

~~~ts
fillNewContact({number, name?, avatar?}): void
~~~

Rellena formulario. El jugador confirma guardar.

Implementación: apps/game/client/cl_exports.ts

#### fillNewNote

~~~ts
fillNewNote({title?, content?}): void
~~~

Rellena formulario de notas.

Implementación: apps/game/client/cl_exports.ts

#### sendUIMessage

~~~ts
sendUIMessage({type: string, payload: unknown}): void
~~~

Forma obsoleta. Usa sendForgeNPWDMessage en código nuevo.

Implementación: apps/game/client/cl_exports.ts

### Servidor

#### newPlayer

~~~ts
newPlayer({source, identifier, phoneNumber?, firstname?, lastname?}, complete?: (success: boolean) => void): Promise<boolean>
~~~

Lo llama la integración interna PR Bridge. Lua admite callback de resultado; no dupliques el ciclo.

Implementación: apps/game/server/bridge/sv_exports.ts

#### unloadPlayer

~~~ts
unloadPlayer(source: number): Promise<void>
~~~

Descarga el jugador; requiere integración.

Implementación: apps/game/server/bridge/sv_exports.ts

#### getPlayerData

~~~ts
getPlayerData({source? | identifier? | phoneNumber?}): Promise<PlayerData | null>
~~~

Localiza jugador cargado. Usa un localizador; devuelve datos de identidad y línea.

Implementación: apps/game/server/bridge/sv_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(source: number): string
~~~

Consulta obsoleta; prefiere getPlayerData. Requiere jugador cargado.

Implementación: apps/game/server/bridge/sv_exports.ts

#### generatePhoneNumber

~~~ts
generatePhoneNumber(): Promise<string>
~~~

Genera número único. No entrega dispositivo ni item.

Implementación: apps/game/server/bridge/sv_exports.ts

#### isPlayerBusy

~~~ts
isPlayerBusy(source: number): boolean
~~~

Comprueba estado ocupado del jugador.

Implementación: apps/game/server/bridge/sv_exports.ts

#### isPhoneNumberBusy

~~~ts
isPhoneNumberBusy(number: string): boolean
~~~

Indica si la línea está en llamada.

Implementación: apps/game/server/bridge/sv_exports.ts

#### getActivePhoneContext

~~~ts
getActivePhoneContext(source: number): PhoneContext | null
~~~

Devuelve contexto activo. No autoriza PIN.

Implementación: apps/game/server/devices/device.service.ts

#### getDevice

~~~ts
getDevice(deviceId: string): Promise<DeviceIdentity | null>
~~~

Consulta servidor de identidad, usuarios y estado.

Implementación: apps/game/server/devices/device.service.ts

#### usePhoneSlot

~~~ts
usePhoneSlot(source: number, slot: number): boolean
~~~

Valida slot real y uso. No aceptes metadata arbitrario.

Implementación: apps/game/server/device_bridge.lua

#### blockDevice

~~~ts
blockDevice(deviceId: string, ownerIdentifier: string): Promise<boolean>
~~~

Bloqueo por propietario validado. Derívalo en servidor.

Implementación: apps/game/server/devices/device.service.ts

#### getOwnedPhoneDevices

~~~ts
getOwnedPhoneDevices(source: number, callback?): Promise<OwnedPhoneDevice[]> | void
~~~

Lista dispositivos del solicitante. Callback opcional Lua.

Implementación: apps/game/server/recovery/recovery.exports.ts

#### cancelLostPhone

~~~ts
cancelLostPhone(source: number, deviceId: string, callback?): Promise<RecoveryResult> | void
~~~

Valida propietario y bloquea pérdida. No devuelve item.

Implementación: apps/game/server/recovery/recovery.exports.ts

#### issueNewPhone

~~~ts
issueNewPhone(source, model?, color?, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Emite perfil/línea/dispositivo/item. Valida pagos y acceso aparte.

Implementación: apps/game/server/recovery/recovery.exports.ts

#### issueReplacementPhone

~~~ts
issueReplacementPhone(source, oldDeviceId, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Sustituye dispositivo propio bloqueado; conserva línea/perfil/PIN.

Implementación: apps/game/server/recovery/recovery.exports.ts

#### emitMessage

~~~ts
emitMessage({senderNumber, targetNumber, message, embed?}): Promise<void>
~~~

Envía mensaje e invoca middleware. Valida antes de exponer.

Implementación: apps/game/server/messages/middleware/emitMessage.ts

#### onMessage

~~~ts
onMessage(number: string, callback: (context) => void): void
~~~

Registra handler por número; nuevo registro sustituye entrada.

Implementación: apps/game/server/messages/middleware/onMessage.ts

#### onCall

~~~ts
onCall(number: string, callback: (context) => void): void
~~~

Middleware consulta incomingCaller y next, exit, reply o forward. Define finalización.

Implementación: apps/game/server/calls/middleware/index.ts

#### emitRconMessage

~~~ts
emitRconMessage(source: number, message: Message): void
~~~

Emite evento de éxito, no persiste por sí mismo. Usa emitMessage.

Implementación: apps/game/server/rcon/exports.ts

<a id=ecosystem></a>

## Apps Forge y mejoras

Recursos instalables independientes con contexto de dispositivo y widgets.

### Banca

forge-npwd-banking ofrece saldos, historial, transferencias, PIX/facturas, cajeros y PIN propio. El resumen ofrece 2×1, 4×1 y 4×2, ocultando valores y comprobando seguridad. El recurso difiere del ID BANKING_APP y /bankingapp. Las acciones financieras se validan en servicio y callbacks; el widget no concede permisos ni evita el PIN.

Implementación: ../forge-npwd-banking/forge-npwd.config.ts; ../forge-npwd-banking/server/main.lua

### Clima y garajes

forge-npwd-weather ofrece condiciones y previsiones regionales mediante PR Bridge. El clima actual admite 2×1, 4×1 y 2×2; la previsión 4×2. forge-npwd-garage ofrece flota, ubicación/ruta, incautación y deuda cuando el proveedor lo permite. Su widget admite 2×1, 4×1 y 4×2. Clima depende del proveedor configurado; garajes dependen de propiedad y servicios reales.

Implementación: ../forge-npwd-weather/forge-npwd.config.ts; ../forge-npwd-garage/forge-npwd.config.ts

### Gestión, propiedades y correo

forge-npwd-management reúne equipo, finanzas y candidaturas con widget 2×1, 4×1 o 4×2, manteniendo permisos laborales. forge-npwd-housing ofrece propiedades, facturas y seguridad en esos tamaños; ID housing y /housing. forge-npwd-mail integra correo por ciudadano y resumen cuando disponible. Su frontend se distribuye compilado; no prometas recompilar sin fuente. Cada servicio necesita su proveedor.

Implementación: ../forge-npwd-management/forge-npwd.config.ts; ../forge-npwd-housing/forge-npwd.config.ts; ../forge-npwd-mail/server/server.lua

### Banco: uso diario y privacidad

Abre el banco y configura o verifica su PIN antes de consultar datos protegidos. El resumen combina saldo y actividad reciente; otras vistas ofrecen historial y cajeros próximos. Transferencias/facturas dependen del servicio bancario, que valida importe, destinatario y permisos. Oculta el saldo al mostrar el teléfono; hay preferencias locales de tema. El widget resume el mismo servicio, no crea otro banco. Prueba sesión bloqueada, cuenta congelada, proveedor ausente y actualización tras una transferencia.

Implementación: ../forge-npwd-banking/src/App.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Garaje: flota, condición y cargos

Busca la flota y filtra por tipo/situación: coches, motos, barcos, aeronaves, guardados, fuera, seguro, incautados y pérdida total. Los detalles muestran matrícula/modelo, combustible, motor/carrocería y lectura actual o último registro. Los datos ausentes no se inventan. La ruta usa el destino del servidor; el rastreo puede estar deshabilitado con motivo. Expande un cargo para consultar estacionamiento, multa policial o incautación y estado de factura. Marcar ruta no paga multas, libera vehículos ni evita propiedad. Los indicadores del widget resumen estados del proveedor.

Implementación: ../forge-npwd-garage/src/App.tsx; ../forge-npwd-garage/src/types.ts

### Viviendas: acceso, cuentas y seguridad

La app distingue propiedades propias de accesos compartidos. Los detalles tienen cuentas, seguridad, accesos y venta/transferencia. Las cuentas pueden incluir luz, agua, impuesto residencial y vigilancia cuando existen. La seguridad muestra alarma/vigilancia, incidentes y cámaras; las acciones dependen de capacidad y revisión validadas por servidor. Acceso compartido no equivale a propiedad total. Una venta envía propuesta al comprador mediante el servicio, no cambia dueño desde el navegador. El widget resume y abre la app. Prueba propietario/invitado, cámaras offline, revisiones antiguas y pagos rechazados.

Implementación: ../forge-npwd-housing/src/App.tsx; ../forge-npwd-housing/src/views/PropertyDetailsPage.tsx

### Gestión: equipo, candidaturas y permisos

La gestión resuelve la organización autorizada al jugador, muestra miembros/finanzas y ofrece contratación, despido, rango y revisión de candidatos mediante callbacks. Los permisos incluyen reglas por rango y excepciones por miembro, con restauración explícita. Seleccionar a alguien próximo facilita contratar, no autoriza gestionar otra organización. Depósitos/retiros se validan en servidor. El widget resume con los mismos permisos. Comprueba empleado/gestor, organizaciones distintas, cambios denegados y actualización tras cambios de equipo/finanzas. No conviertas datos ilustrativos de vista previa en registros reales.

Implementación: ../forge-npwd-management/src/App.tsx; ../forge-npwd-management/server/main.lua

### Clima y correo: información de proveedores

El clima combina condiciones actuales y previsión regional. Los widgets independientes se actualizan sin abrir la app y reaccionan al proveedor. Distingue clima de ciudad, datos ilustrativos y reloj local del ejemplo. El correo entrega por ciudadano; usa la interfaz del servidor, no mensajes falsos no confiables en el frontend. Un servicio ausente debe indicar indisponibilidad, no inventar información plausible. Inicia solo recursos incluidos en tu distribución y comprueba manifiesto, callbacks e ID antes de registrar el catálogo. El frontend compilado del correo no es un template de desarrollo.

Implementación: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-mail/server/server.lua

<a id=compatibility></a>

## Compatibilidad con NPWD clásico

Una capa aislada conserva llamadas públicas antiguas sin ejecutar otro teléfono.

### Compatibilidad dentro del teléfono

Iniciar forge-npwd activa compat/exports.lua: intercepta eventos locales de resolución de exports antiguos conocidos y reenvía a proveedores actuales, conservando argumentos, retornos y lado cliente/servidor. No requiere npwd vacío, instalador ni bridge duplicado. Los helpers internos reutilizan handlers entrantes/NUI. Los manifests declaran aliases con provide; provide solo no reenvía exports.

**forge-npwd - built-in compatibility**

~~~text
ensure forge-npwd
# No compatibility group or separate phone bridge to install/start.
# Start the canonical apps you use.
# Never run original NPWD alongside Forge NPWD.
# Maintainers only, after changing aliases/exports:
# node misc/generate-compat.cjs
~~~

Implementación: compat/aliases.json; compat/exports.lua; compat/app.lua

### Ejemplos clásico y actual

exports.npwd:isPhoneVisible() y exports.npwd:sendNPWDMessage(...) pasan por la capa interna del teléfono. El código nuevo usa exports["forge-npwd"] y sendForgeNPWDMessage. El patrón clásico sigue siendo un recurso que expone ./config, React y callbacks propios. El archivo puede seguir siendo npwd.config.ts si se expone correctamente. El loader espera remoteEntry.js ESM/Vite: una build Webpack/global-container antigua puede necesitar recompilación con el template Forge.

**client.lua · legacy caller versus new caller**

~~~text
-- Unchanged legacy caller; routed INSIDE Forge NPWD:
exports['npwd']:isPhoneVisible()
exports['npwd']:sendNPWDMessage('forge-npwd-appexemple', 'summaryUpdated', {})

-- New integrations use the canonical resource:
exports['forge-npwd']:isPhoneVisible()
exports['forge-npwd']:sendForgeNPWDMessage('forge-npwd-appexemple', 'summaryUpdated', {})

-- No duplicate resource or compatibility installer.
-- ESM/Vite apps expose './config'; older Webpack remotes may need rebuilding.
~~~

Implementación: compat/aliases.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Límites y datos conservados

Se cubren exports conocidos, eventos/callbacks entrantes, convars e IDs guardados. Dentro del teléfono, compat/nui.ts reescribe hosts antiguos conocidos de fetch/XHR conservando opciones. No reescribe otras NUIs, iframes ni todas las URLs de scripts compilados: usa nombres actuales allí. No duplica nombres desconocidos ni observadores salientes. SQL y claves no cambian; prueba consumidores reales.

Implementación: compat/nui.ts; compat/names.ts; compat/client.ts; compat/server.ts; FORGE_NPWD_COMPAT.md

### Migración y reinicio

Retira líneas y carpetas de forge-npwd-bridge y [forge-npwd-compat]; inicia solo teléfono y apps actuales. Conserva configuración y SQL. Nunca ejecutes NPWD original en paralelo. Migra en un reinicio planificado. FiveM guarda referencias por nombre solicitado: tras reiniciar solo el teléfono, reinicia consumidores antiguos afectados. No usa hooks globales ni eventos artificiales de parada.

Implementación: FORGE_NPWD_COMPAT.md; fxmanifest.lua

<a id=testing></a>

## Compilar, probar y publicar

Comprueba artefactos y casos multijugador antes de distribuir una release.

### Comandos de desarrollo

En el ejemplo: npm ci, npm run dev, npm run typecheck, npm test, npm run build y npm run preview. Preview sirve el remoto compilado en 4173, igual al loader de desarrollo; Vite dev no produce el entry de release. Para el teléfono usa su workspace pnpm fijado. Una app externa necesita su build y registro, no recompilar todo el teléfono. Incluye web/dist en la release aunque el Git del ejemplo lo ignore.

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

### Matriz de pruebas en la ciudad

Prueba items nuevos/antiguos, dos teléfonos, transferencia, PIN válido/inválido, cinco fallos, bloqueo del propietario con otro portador, sustitución e inventario lleno. Prueba instalar/quitar, páginas, arrastre/solapamiento, tamaños, dos widgets y reinicio. En apps sensibles prueba actores autorizados y no autorizados. Comprueba un consumidor real de exports.npwd, voz, medios y reinicios. Mocks y builds no certifican multijugador.

### Seguridad de release y contribuciones

Distribuye frontend compilado, código, manifiestos, assets, ejemplos, dependencias y avisos originales. No publiques credenciales, tokens, datos personales, node_modules ni planificación. Mantén IDs estables y documenta cambios incompatibles. Fija dependencias compatibles y revisa las transitivas antiguas; compatibilidad no significa actualidad. Conserva datos y release anterior para rollback. Compilar no exige commit ni publicación automática.

<a id=troubleshooting></a>

## Solución de problemas

Investiga disponibilidad, federación, callbacks y contexto por separado.

### Export o app ausente

Si falla un export npwd antiguo, verifica forge-npwd con compat/exports.lua y catálogo actuales, el proveedor real y lado correcto. No instales proxies. Reinicia consumidores con caché tras actualizar. Para apps revisa apps, remoteEntry.js, ./config e iconos. Instala mediante Forge Store y verifica espacio.

Implementación: compat/exports.lua; compat/exports.json

### Timeout, pantalla vacía o widget desactualizado

Una petición al teléfono en vez de la app no encuentra su callback. Verifica recurso explícito, nombre, registro de servidor y respuesta única. Una pantalla vacía puede indicar React/Router incompatible, chunks ausentes o factory esperando settings no enviado. En widgets revisa timers, listeners, permisos y proveedor. No evites permisos para arreglar la interfaz. Usa F8 y logs y reproduce la petición mínima.

### Recuperación rechazada o datos cambiados

DEVICE_MUST_BE_BLOCKED exige declarar pérdida. DEVICE_NOT_FOUND_OR_NOT_OWNED indica propietario distinto o ID inválido. Revisa capacidad, item y metadata ante errores de inventario; no repitas emisiones a ciegas. La sustitución conserva el PIN. Si una transferencia crea perfil vacío, revisa metadata. Informa versión, recurso, operación, resultado esperado y logs saneados; nunca PIN ni conexión real.

<a id=credits></a>

## Créditos y alcance

Una evolución Forge basada en NPWD conservando la autoría original.

### Project Error / NPWD

NPWD fue creado por Project Error y colaboradores. Forge NPWD es un fork comunitario con dispositivos, seguridad, recuperación, inicio, widgets y compatibilidad descritos aquí. Se mantienen créditos por teléfono original, arte y contribuciones. Esta guía está escrita para Forge, no copiada. Consulta la documentación original como contexto y compara la fuente actual antes de reutilizar ejemplos antiguos.

[Project Error documentation](https://projecterror.dev/docs/)

[Project Error / NPWD source](https://github.com/project-error/npwd)

### Distribución y avisos de licencia

Conserva LICENSE, autoría y licencias de assets al redistribuir. La licencia del ejemplo está en su repositorio. El checkout del teléfono incluye GPL-3.0-or-later en LICENSE, mientras package.json lleva otra etiqueta histórica; esta guía no resuelve la discrepancia. Los mantenedores deben armonizarla antes de publicar. Forge NPWD no es una release oficial de Project Error ni garantiza proveedores sin configuración.

Implementación: LICENSE; package.json

