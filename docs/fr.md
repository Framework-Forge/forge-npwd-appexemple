<!-- generated-by: gsd-doc-writer -->
# Forge NPWD — Guide complet

Une plateforme téléphonique open source : appareils physiques, sécurité, récupération, bureaux personnalisables, boutique et contrat extensible pour les apps et widgets.

[Forge Site](https://framework-forge.github.io/site/#forge-npwd/overview) · [Example App](https://github.com/Framework-Forge/forge-npwd-appexemple) · [README](../README.md)

## Documentation

- [Présentation et améliorations](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage quotidien](#players)
- [PIN et sécurité](#security)
- [Perte, blocage et récupération](#recovery)
- [Boutique de téléphones et accueil](#shop)
- [Bureaux et Forge Store](#desktop)
- [Créer une app externe](#applications)
- [NUI, serveur et notifications](#communication)
- [Développer des widgets](#widgets)
- [Référence de l’API publique](#api)
- [Apps Forge et améliorations](#ecosystem)
- [Compatibilité NPWD classique](#compatibility)
- [Compiler, tester et publier](#testing)
- [Dépannage](#troubleshooting)
- [Crédits et périmètre](#credits)

<a id=overview></a>

## Présentation et améliorations

Forge NPWD fait évoluer NPWD en conservant sa philosophie extensible.

### Un téléphone, intégration intégrée

forge-npwd réunit téléphone, identité, API, compatibilité ancienne et intégration joueur/inventaire. PR Bridge gère les adaptateurs ; aucun bridge téléphonique ni resource de compatibilité séparé. forge-npwd-shop reste optionnel pour vente/récupération et les apps restent indépendantes. Tout serveur FiveM avec les adaptateurs requis peut utiliser le projet.

Implémentation: fxmanifest.lua; apps/game/server/player_bridge.lua; apps/game/client/player_bridge.lua

### Les ajouts Forge

Chaque appareil possède son numéro de série, son profil et sa ligne. Le détenteur peut différer du propriétaire enregistré. Le PIN, le blocage et le remplacement validé par le propriétaire protègent cette identité. L’accueil ajoute des icônes déplaçables, plusieurs pages et des widgets. Forge Store gère les apps installées par profil. Les API forge-npwd et la compatibilité intégrée préservent les anciennes intégrations publiques sans créer un autre téléphone.

### Lire selon votre objectif

Les joueurs peuvent lire l’usage quotidien, la sécurité, la récupération et les bureaux/boutique. Les administrateurs doivent commencer par l’installation et la configuration puis vérifier les métadonnées et adaptateurs. Les développeurs peuvent suivre le tutoriel, les fichiers complets de l’exemple, le contrat des widgets, l’API et les tests. Chaque section technique indique le fichier vérifié ; le comportement doit aussi être testé dans la ville.

<a id=installation></a>

## Installation

Conservez le nom du téléphone et préparez les adaptateurs avant la première session.

### Release ou code source

Utilisez la distribution Forge, pas le paquet NPWD original en remplacement. Une release compilée doit contenir dist/game et dist/html. Les sources nécessitent les dépendances pnpm et le build racine ; ne déployez pas une archive non compilée. Nommez le dossier forge-npwd. Sauvegardez config.json et les données persistantes. L’exemple utilise npm et son propre lockfile ; son build est indépendant du workspace du téléphone.

**forge-npwd · source build**

~~~text
pnpm install --frozen-lockfile
pnpm build
# Run in the PHONE repository, not the example app.
# For a release package, use its supplied dist/ files.
~~~

Implémentation: package.json; fxmanifest.lua

### Dépendances et démarrage

Démarrez framework, inventaire et SQL, puis PR Bridge, screenshot-basic et pma-voice avant forge-npwd. Configurez mysql_connection_string pour son pool mysql2. Compilez/démarrez les apps avant l’ouverture ; les dépendances contrôlent le démarrage. L’exemple évite une dépendance dure au téléphone. La boutique optionnelle démarre ensuite. Pas de proxies ni bridge séparé.

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

Implémentation: fxmanifest.lua; packages/database/src/db/pool.ts

### Base de données et première exécution

Importez import.sql pour le schéma NPWD de base sur une nouvelle base. Les repositories gèrent les extensions des appareils, sécurité et profils ; l’utilisateur SQL doit pouvoir appliquer ces changements. Ne supprimez pas les tables npwd_* ou forge_phone_* pendant la migration. Vérifiez que l’item phone existe, ne s’empile pas, conserve ses métadonnées au transfert et appelle l’intégration d’usage. Testez un nouvel appareil, un transfert, le PIN, un appel, la caméra et chaque app. Ne démarrez jamais le téléphone NPWD original avec Forge NPWD.

Implémentation: import.sql; apps/game/server/devices/device.database.ts

### Dépendances des apps et ordre de démarrage

Le loader doit atteindre le remote compilé lors de l’import. Le nouvel exemple démarre indépendamment avant le téléphone. Mais les manifestes vérifiés des apps banque, garage, logements, météo, gestion et courrier dépendent de forge-npwd et importent son helper. FiveM résout cette dépendance indépendamment de l’ordre textuel des ensure ; placer les apps avant ne garantit pas le téléphone en dernier. Vérifiez manifestes et logs. Si un remote échoue, terminez le démarrage des apps puis réinitialisez le téléphone en test/maintenance contrôlé ; le loader peut conserver cet échec pour la session UI. Ne supprimez pas aveuglément les dépendances et ne dupliquez pas les téléphones. L’ordre fourni illustre le template indépendant, pas toutes les apps.

Implémentation: apps/phone/src/common/hooks/useExternalApps.tsx; ../forge-npwd-banking/fxmanifest.lua; ../forge-npwd-mail/fxmanifest.lua

<a id=configuration></a>

## Configuration

Configuration du téléphone, catalogue d’apps et identifiants de services ont des rôles distincts.

### Configuration de l’appareil

device.enabled active les appareils physiques. itemName choisit l’item ; defaultModel et defaultColor initialisent les nouveaux appareils et metadataSchemaVersion indique la version. mirrorLegacyPhoneNumber maintient le champ historique du propriétaire si configuré. PhoneAsItem.enabled et exportResource/exportFunction contrôlent la disponibilité. Ils doivent correspondre aux items et exports réels ; renommer un champ ne migre pas les données. Conservez le conteneur actuel forgeForgeNpwd malgré son orthographe historique.

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

Implémentation: config.json; apps/game/server/devices/device.service.ts

### Général, base de données et apps

Forge NPWD active useResourceIntegration en interne car PR Bridge charge les personnages. Ne dupliquez pas newPlayer/unloadPlayer. Les anciennes convars n’activent plus de loaders directs. Configurez playerTable, identifierColumn, identifierType, phoneNumberColumn et profileQueries selon votre schéma : changer d’adaptateur ne migre pas SQL. toggleCommand, toggleKey et defaultLanguage règlent l’accès. apps contient les dossiers ; Forge Store installe les apps par profil, pas les resources.

Implémentation: packages/config/server/index.ts; apps/game/server/player_bridge.lua; apps/phone/src/common/hooks/useExternalApps.tsx

### Joueur et item via PR Bridge interne

L’intégration utilise GetPhoneProfile, GetAllPlayers, événements normalisés et inventory.RegisterUsableItem. Identité et noms viennent de PR Bridge ; numéro préalable optionnel. device.itemName définit l’item non consommé. Le serveur relit slot/métadonnées réels et ne fait pas confiance à un ID joueur du client. Si l’inventaire ne déclenche pas l’adaptateur, configurez forge-npwd.usePhoneItem ou l’événement forge-npwd:client:usePhoneItem avec le slot. Les items ox dynamiques Forge sont liés automatiquement. Testez chaque combinaison réelle.

Implémentation: apps/game/server/player_bridge.lua; apps/game/client/player_bridge.lua; apps/game/server/device_bridge.lua

### Médias, intégrations et secrets

images configure l’URL d’envoi, le format, les en-têtes et returnedDataIndexes. imageSafety définit les hôtes autorisés. voiceMessage configure l’audio optionnel ; contacts.frameworkPay et ses exports sélectionnent les paiements. customPhoneNumber peut déléguer la génération des numéros. twitter, match, marketplace, defaultContacts, browser et debug conservent leurs options. Stockez les tokens dans des convars serveur non répliquées, jamais dans le JSON NUI, le client ou les exemples versionnés. Les anciennes convars servent de repli : un nom Forge configuré est prioritaire.

Implémentation: config.json; compat/convars.ts; packages/config/server/index.ts

<a id=players></a>

## Usage quotidien

Votre item sélectionne l’appareil ; possession et propriété sont différentes.

### Premier usage et changement d’appareil

Acquérez un téléphone via l’inventaire ou le service configuré et utilisez cet item. Le premier usage crée l’identité si nécessaire. Avec plusieurs téléphones, utilisez le slot souhaité pour activer cet appareil ; la commande générique ne sélectionne pas les items. Le changement invalide la session de déverrouillage du détenteur et ouvre le contrôle de sécurité. Ne modifiez pas les métadonnées et n’empilez pas les téléphones : deviceId, série, profil et ligne suivent chaque item.

Implémentation: apps/game/server/device_bridge.lua; apps/game/server/devices/device.service.ts

### Donner le téléphone à un autre joueur

Transférez ou déposez le téléphone via une intégration qui conserve les métadonnées. Le nouveau détenteur active l’appareil existant, pas une copie vide à son nom. Après déverrouillage légitime, les données du profil et apps suivent l’appareil. Cela ne transfère pas la propriété enregistrée et ne donne pas tous les droits professionnels, immobiliers ou financiers. Les apps sensibles doivent distinguer propriétaire et détenteur et vérifier les règles côté serveur.

### Réglages et outils quotidiens

Utilisez Réglages pour la langue, l’apparence, le cadre, le fond, l’audio et les notifications disponibles. Appels, messages, contacts, caméra, galerie et autres apps conservent leurs interfaces. Le PIN du téléphone et celui de la banque sont distincts. L’aperçu navigateur utilise des données fictives, sans inventaire, voix, envoi ni propriété. L’administration choisit les intégrations et le catalogue ; installer une app à l’accueil n’installe pas une ressource serveur.

<a id=security></a>

## PIN et sécurité

Protégez l’accès sans confondre verrouillage visuel et autorisation.

### Créer, déverrouiller et changer le PIN

Le téléphone accepte un PIN numérique de 4 à 6 chiffres. Un appareil non configuré ouvre la création ; un appareil configuré demande une vérification. Le changement vérifie d’abord le code actuel. Le serveur dérive un hash avec scrypt et un sel aléatoire puis compare avec timingSafeEqual. Le PIN n’est pas stocké dans les métadonnées. Gardez-le privé : une personne qui connaît le code peut accéder aux données, sous réserve des autorisations de chaque app.

Implémentation: typings/security.ts; apps/game/server/security/security.service.ts

### Tentatives et sessions déverrouillées

L’implémentation autorise cinq échecs avant un blocage temporaire de cinq minutes. Une vérification réussie crée une session détenteur/appareil avec un TTL maximal de 12 heures. Activer l’appareil réinitialise la session ; le bloquer invalide ses sessions. Ces valeurs sont des constantes, pas des options config.json. La réponse inclut configured, unlocked, attemptsRemaining, lockedUntil et pinLength ; INVALID_PIN_FORMAT ou INVALID_CURRENT_PIN identifient l’échec.

Implémentation: apps/game/server/security/security.service.ts; typings/security.ts

### L’autorisation de l’app est distincte

L’app bancaire ajoute son PIN de 4 à 8 chiffres et ses sessions serveur. Son widget masque les données sensibles lorsque la session bancaire est verrouillée. Les autres apps vérifient propriété, métier ou service. getActivePhoneContext fournit l’identité, pas la preuve du déverrouillage ni l’autorisation financière. Ne divulguez pas des données privées simplement parce que l’interface est cachée. L’exemple retourne uniquement des informations publiques, sans opérations privées ou financières.

Implémentation: ../forge-npwd-banking/server/main.lua; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

<a id=recovery></a>

## Perte, blocage et récupération

Remplacez l’appareil en conservant le profil et la ligne du propriétaire.

### Blocage validé par le propriétaire

Le service liste les appareils enregistrés au joueur demandeur. Déclarez la perte à la boutique configurée ou via une intégration autorisée. cancelLostPhone valide la propriété, passe à blocked, invalide les sessions et informe le détenteur actif. L’ancien item peut rester dans un autre inventaire mais n’est plus actif. Bloquer n’équivaut pas à fermer la NUI ou désactiver temporairement l’interface.

Implémentation: apps/game/server/recovery/recovery.service.ts; apps/game/server/devices/device.service.ts

### Ce que conserve le remplacement

issueReplacementPhone exige un appareil bloqué appartenant au demandeur. Il crée un deviceId et une série, conserve profileId, lineId et phoneNumber et copie le hash/sel du PIN sans l’effacer. L’ancien passe à replaced avec replacedByDeviceId. La transaction compense l’insertion dans l’inventaire si le commit échoue. Elle ne rapporte pas l’item perdu, n’accorde pas un appareil tiers et ne récupère pas un PIN oublié en l’effaçant.

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

Implémentation: apps/game/server/recovery/recovery.exports.ts; apps/game/server/recovery/recovery.service.ts

### Intégrer les frais et protéger l’émission

Utilisez la configuration et les callbacks validés de la boutique pour les prix, lieux et accès. Les exports d’émission ne remplacent pas la validation de paiement de votre script. Déduisez source de la requête, vérifiez propriété et capacité, empêchez les achats répétés et traitez success/error. Les exports proposent un callback optionnel pour Lua ; JavaScript peut attendre les promises. Erreurs courantes : DEVICE_MUST_BE_BLOCKED, DEVICE_ALREADY_REPLACED, DEVICE_NOT_FOUND_OR_NOT_OWNED et INVENTORY_ADD_FAILED.

Implémentation: apps/game/server/recovery/recovery.exports.ts; ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua

<a id=shop></a>

## Boutique de téléphones et accueil

forge-npwd-shop relie le catalogue d’appareils physiques à l’achat, la consultation du propriétaire, le blocage et le remplacement via PR Bridge.

### Ressource distincte de la boutique d’apps

Forge NPWD Shop assure la vente et la récupération dans le monde. Forge Store dans le téléphone gère les apps installées ; leurs rôles sont distincts. Installez le dossier forge-npwd-shop et gardez forge-npwd et pr_bridge disponibles. La boutique charge @pr_bridge/init.lua et @forge-npwd/compat/app.lua puis utilise menus, alertes, notifications, callbacks et adaptateurs financiers PR Bridge. Elle ne contient pas un autre téléphone et ne demande pas de SQL propre : appareils, profils et lignes sont gérés par le téléphone. La configuration et les fichiers client/server publiés ont été comparés à l’implémentation de ce guide.

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

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/fxmanifest.lua

[Dépôt Forge NPWD Shop](https://github.com/Framework-Forge/forge-npwd-shop)

### Configurer emplacements, catalogue et frais

Modifiez config.lua de la boutique, pas appCatalog du téléphone. Config.Models contient id, label, description, prix, icône du menu et paires id/label des couleurs. Le catalogue fourni comprend Forge One (2500), Forge Pro (4500) et Forge Ultra (7000) ; le remplacement coûte 750 par défaut. Les IDs modèle/couleur deviennent des métadonnées, pas des items distincts ni des modèles 3D générés. Utilisez lettres, chiffres, tirets bas ou tirets ; le téléphone accepte un modèle de 32 caractères maximum et une couleur de 24. Config.Locations accepte plusieurs points vector3 avec marqueur et blip. L’exemple est une configuration complète réduite avec un point ; adaptez ses coordonnées. Cette version n’a pas d’éditeur in-game. Redémarrez seulement forge-npwd-shop en maintenance contrôlée pour recharger ensemble les prix serveur et menus/blips client.

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

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua; apps/game/server/recovery/recovery.service.ts

### Accès par marqueur et intégration NPC optionnelle

La boutique actuelle crée marqueurs et blips, pas un ped. Le marqueur apparaît dans DrawDistance (15 m par défaut), l’invite E dans InteractionDistance (2 m). Appuyez sur E. Config.Locations n’a ni modèle de ped, heading, choix target/interact ni outil de placement. Pour un NPC, votre ressource NPC/interactions le crée et le place puis appelle l’export client openShop depuis l’action sélectionnée. L’exemple ouvre uniquement le menu ; il ne crée pas de NPC ni de target. Gérez le NPC dans cette intégration et évitez les marqueurs en double si nécessaire. Ne présentez pas le NPC comme une fonction livrée. /forgephoneshop ouvre aussi le menu : c’est une commande de test sans restriction de lieu.

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

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua

### Parcours joueur : achat et premier usage

Ouvrez l’accueil, choisissez Acheter un appareil, puis modèle, couleur et confirmez le prix. Le serveur identifie le joueur par la source du callback, vérifie modèle/couleur dans son catalogue et calcule le débit. issueNewPhone crée ID, série, profil, ligne et numéro uniques puis livre l’item configuré avec forgeForgeNpwd. Utilisez cet item pour sélectionner/ouvrir l’appareil physique. Un nouvel achat ne remplace pas l’ancien profil. Les modèles sont des choix pour le même item ; vérifiez existence, absence d’empilement et conservation des métadonnées. Joueur non chargé, fonds insuffisants ou livraison refusée ne constituent pas un achat réussi.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Priorité de paiement, sans débit partagé

Config.PaymentAccounts est une liste ordonnée de comptes reconnus par PR Bridge. Avec { cash, bank }, le serveur essaie espèces puis banque ; un seul compte doit couvrir tout le prix. Il ne combine pas les soldes et n’affiche pas de sélecteur. Si les espèces sont insuffisantes et la banque couvre le prix, tout est débité en banque. Modifiez l’ordre ou n’autorisez qu’un compte. Prix et RecoveryPrice sont arrondis à l’entier inférieur, minimum zéro ; zéro est gratuit. Le blocage n’a pas de frais distincts. Vérifiez la configuration serveur avant publication.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Mes appareils : propriétaire et blocage après perte

Mes appareils liste ceux du propriétaire enregistré via getOwnedPhoneDevices, même hors de son inventaire. Le menu affiche numéro, modèle, statut et série ; les détails ajoutent ID et couleur. Les actifs permettent blocage après perte et remplacement ; les bloqués permettent remplacement. Les remplacés restent dans l’historique sans nouveau remplacement au menu. Confirmer la perte appelle cancelLostPhone avec la source authentifiée ; le téléphone vérifie la propriété et révoque l’accès à cet appareil. Détenir le téléphone d’autrui ne donne aucun droit de récupération. Le blocage désactive l’ancien item sans le supprimer ni le restituer physiquement.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Remplacement : éléments conservés et renouvelés

Choisissez Récupérer dans un nouvel appareil et confirmez les frais. La boutique débite, bloque l’appareil sélectionné puis appelle issueReplacementPhone. Elle permet ainsi de remplacer directement un appareil actif sans blocage manuel préalable. L’export du téléphone seul exige toujours un appareil bloqué et vérifie la propriété. Le remplacement a un nouveau deviceId et numéro de série mais conserve profileId, lineId, numéro de téléphone, modèle, couleur et hash/salt du PIN. Les données liées au profil, comme l’accueil, restent liées au même profil. L’ancien appareil devient remplacé et inutilisable. Il s’agit d’un autre item physique pour la même identité, pas d’un changement de numéro ni d’une copie libre.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### La réinitialisation n’est pas une opération de boutique

La boutique vérifiée ne propose ni réinitialisation usine, PIN oublié, effacement ni redémarrage de ressource aux joueurs. L’option avec flèches signifie remplacement/récupération, pas réinitialisation. Le PIN est conservé, sans contourner un code inconnu. Un nouvel achat crée un autre profil sans effacer l’ancien. Redémarrer forge-npwd-shop relève de la maintenance administrative, pas d’un service vendu. Une future réinitialisation exige ses propres règles d’autorisation, conservation et propriété avant d’être annoncée.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Échecs et limites du contrôle d’accès

Le serveur sérialise achat/blocage/récupération du joueur durant une opération et refuse les choix hors catalogue. Les erreurs d’émission retournées entraînent un remboursement du compte débité. Si l’ancien est bloqué puis la livraison échoue, les frais sont remboursés mais l’ancien reste bloqué ; libérer l’inventaire et réessayer ne réactive pas l’ancien item. PhoneExportTimeout vaut 15000 ms et CallbackTimeout 25000 ms par défaut. Un timeout arrête l’attente, sans annuler une opération SQL/export en cours. Vérifiez appareils, inventaire et logs avant de répéter : un résultat tardif exige une conciliation. Les callbacks valident joueur/catalogue/paiement et délèguent la propriété au téléphone, mais pas proximité serveur, horaires, métier ou droits NPC. Marqueur, commande ou target client ne constituent pas une autorisation serveur. Ajoutez cette validation dans une tâche distincte avant d’exiger un commerce limité au lieu ; le guide ne prétend pas qu’elle existe déjà.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Interfaces de boutique et contrôles de validation

L’entrée publique client est exports['forge-npwd-shop']:openShop(); elle ouvre le menu racine sans résultat d’achat. Les callbacks internes PR Bridge serveur sont forge-npwd-shop:server:getDevices (sans argument), :buyPhone (modelId, colorId), :cancelPhone (deviceId) et :recoverPhone (deviceId), tous préfixés forge-npwd-shop:server. Ils retournent success/error ; getDevices ajoute devices. Ce ne sont pas des exports du téléphone ; vos services utilisent les API canoniques avec leurs frais/droits, sans considérer un callback de menu comme autorisation. Testez E/commande, modèles/couleurs, priorité espèces/repli banque, soldes insuffisants sur un seul compte, inventaire plein/remboursement, perte avec un autre détenteur, propriétaire contre détenteur, remplacement conservant numéro/PIN, appareil déjà remplacé, téléphone indisponible et conciliation des timeouts. Vérifiez menus, alertes et paiements avec les providers PR Bridge en multiplayer réel.

Implémentation: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

<a id=desktop></a>

## Bureaux et Forge Store

Personnalisez le profil actif, pas l’installation des apps du serveur.

### Modifier icônes, pages et widgets

Maintenez une zone vide pour éditer. Déplacez les icônes ou widgets vers des cellules libres, changez de page et ajoutez ou retirez des bureaux avec les contrôles. La grille comporte 4 colonnes × 5 lignes, 20 cellules par page et jusqu’à 5 pages. Les widgets réservent des rectangles sans chevauchement d’icônes. Choisissez un widget enregistré et une taille proposée. Ces limites sont des constantes, pas des réglages administratifs.

Implémentation: typings/home.ts; apps/phone/src/apps/home/components/Home.tsx

### Installer et désinstaller les apps

Ouvrez Forge Store, cherchez dans le catalogue du serveur et choisissez Installer ou Retirer. installedApps est modifié pour le profil actif avec progression et restauration en cas d’échec. DIALER, MESSAGES, CONTACTS, CAMERA, SETTINGS et FORGE_STORE sont conservées. Retirer une app modifie l’accueil et ses widgets, sans supprimer la ressource ni automatiquement ses données SQL. La progression est un retour visuel, pas une boutique distante téléchargeant du code.

Implémentation: apps/phone/src/apps/store/ForgeStoreApp.tsx; apps/phone/src/apps/home/state/home.state.ts

### Persistance et validation

HomeLayout stocke pageCount, pages, widgets et installedApps par profil actif. Chaque placement contient instanceId, widgetId, page, x, y, width et height. Le serveur rejette pages invalides, doublons, positions hors grille et chevauchements. Il limite à 20 widgets et 64 ID en entrée installedApps. Ce sont des contrôles d’intégrité, pas une autorisation de transaction. Les anciens layouts sans installedApps migrent en conservant les apps existantes.

Implémentation: apps/game/server/home/home.controller.ts; apps/game/server/home/home.database.ts

<a id=applications></a>

## Créer une app externe

Partez de l’exemple complet et changez les identifiants de façon cohérente.

### Cloner, installer et prévisualiser

Le template public est forge-npwd-appexemple ; conservez cette orthographe dans les commandes. Utilisez Node 20 ou supérieur. npm ci installe les dépendances verrouillées, npm run dev ouvre l’aperçu et npm run build vérifie les types et génère web/dist. L’aperçu utilise des données simulées et MemoryRouter ; en jeu le téléphone fournit le routeur. Ne montez pas une deuxième racine React dans l’iframe de la ressource.

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

### Nom de ressource, ID et route

RESOURCE_NAME est le dossier utilisé par FiveM, config.json et les URL NUI. APP_ID identifie l’app dans l’accueil, les messages et widgets. APP_PATH est la route. Ils peuvent différer : forge-npwd-banking utilise BANKING_APP et /bankingapp. Le template reste cohérent. Pour le renommer, modifiez contracts.ts, fxmanifest.lua, les deux Lua, la fédération, le démarrage et apps. Des ID stables préservent installations et références enregistrées.

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

Implémentation: apps/phone/src/common/hooks/useExternalApps.tsx

### Publier le descripteur

forge-npwd.config.ts exporte une factory default avec id, nameLocale, path, color, backgroundColor, icon, notificationIcon et app, plus homeWidgets optionnel. Icônes et app sont des fonctions React, pas du JSX rendu. Le loader appelle sans settings ; ne supposez pas settings.language. L’exemple possède son sélecteur de langue. Les styles forge-example-* n’altèrent pas le téléphone ni les apps. Utilisez le routeur hôte, sans BrowserRouter imbriqué.

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

Implémentation: apps/phone/src/common/hooks/useExternalApps.tsx

### Fédération, fichiers et déploiement

Le téléphone charge https://cfx-nui-RESOURCE_NAME/web/dist/remoteEntry.js et importe ./config comme remote ESM/Vite. forge-npwd.config.ts est une convention ; ./config est le contrat d’exécution. Utilisez assetsDir vide pour placer remoteEntry.js à la racine. Partagez React, React DOM et React Router compatible ; ne passez pas à Router 6 sans adapter le téléphone. Déployez fxmanifest, Lua et web/dist, enregistrez apps, redémarrez la ressource et rouvrez/redémarrez le téléphone lors d’un test planifié.

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

Implémentation: apps/phone/src/common/hooks/useExternalApps.tsx

### L’interface complète

L’exemple sépare en-tête, navigation, contenu défilant et aperçus de widgets. La vue principale lit des données publiques ; le Guide explique le parcours. Chargement, erreur et nouvelle tentative sont explicites. Le widget s’adapte aux cellules, pas à des pixels fixes. Copiez-le comme base puis remplacez les mocks et callbacks publics par vos services autorisés. Il n’inclut ni transferts d’argent, ni changements de propriétaire, ni accès privé.

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

### Manifeste et versions partagées

Le manifeste charge PR Bridge dans les deux contextes et sert tous les fichiers compilés. Il ne dépend pas obligatoirement de forge-npwd afin de démarrer avant ; les callbacks vérifient sa disponibilité. Le template verrouille React 17.0.2 et Router 5.3.0 comme le host vérifié. La fédération nécessite une instance React compatible ; des écarts peuvent causer des erreurs de hooks malgré la compilation. Conservez le lockfile et web/dist. Les autres apps peuvent avoir des dépendances différentes ; copier leur code ne remplace pas le test du runtime.

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

## NUI, serveur et notifications

Utilisez des destinations explicites et une identité dérivée du serveur.

### Requête : React → Lua → serveur

fetchNui envoie du JSON à https://RESOURCE_NAME/getSummary. Le code fédéré vit dans le document du téléphone : GetParentResourceName identifie donc le téléphone, pas l’app. Utilisez le nom externe. RegisterNUICallback appelle pr_lib.callback.await avec 5 secondes de délai. Le serveur enregistre le callback et déduit source. L’exemple ajoute un délai navigateur de 7 secondes et répond une fois avec ok/data ou ok/error.

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

### Valider sur le serveur

Ne faites pas confiance aux identifiants, propriétaire, solde ou profileId envoyés par NUI. L’exemple déduit getActivePhoneContext(source), exige un appareil actif et limite les lectures publiques. Il retourne seulement population et heure. Pour les opérations privées ou mutations, ajoutez session, propriété/métier, bornes, transactions et audit. Un téléphone absent ou en redémarrage doit produire une erreur contrôlée. Un contexte actif ne prouve pas la vérification du PIN.

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

### Événements et notifications

SendNUIMessage de la ressource externe atteint son iframe, pas le téléphone. Utilisez exports["forge-npwd"]:sendForgeNPWDMessage(APP_ID, method, data) et vérifiez event.data.app et event.data.method. createNotification utilise ID, route et notisId stable ; duration est en millisecondes. L’exemple inclut une notification protégée et un événement local. Nettoyez listeners et timers au démontage. N’envoyez ni PIN, ni tokens, ni données privées inutiles.

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

Implémentation: apps/game/client/cl_exports.ts

<a id=widgets></a>

## Développer des widgets

Le même contrat que les apps bancaires, météo et autres apps Forge.

### Enregistrer homeWidgets

Ajoutez homeWidgets au descripteur. Chaque entrée possède id local stable, name, description optionnelle, sizes, Component et path optionnel. Une taille est {width, height, label} ; width/height sont des cellules entières positives, pas des pixels. Component reçoit {width, height}. Le téléphone construit widgetId comme APP_ID:id_local, par exemple forge-npwd-appexemple:summary. Ne changez pas ces ID après des placements enregistrés. Le widget est proposé uniquement si l’app est installée.

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

Implémentation: apps/phone/src/os/apps/config/apps.tsx; apps/phone/src/apps/home/components/Home.tsx

### Rendu indépendant et tailles

Les widgets sont montés hors de l’app principale et de ses providers privés. Ne dépendez pas d’un provider limité à App. Utilisez un hook indépendant, un store partagé ou un provider dédié. Le résumé propose 2×1, 4×1 et 4×2 avec l’heure sur les formats hauts. L’horloge propose 2×1 et 2×2 sans serveur ; elle affiche l’heure réelle locale, pas celle de la ville. Utilisez une racine à 100%, border-box et évitez débordement et CSS global.

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

### Actualisation et nettoyage

Le widget bancaire consulte toutes les 30 secondes et réagit aux transferts/factures ; la météo toutes les 60 secondes et à weatherUpdated. Ils ne dépendent pas de l’app ouverte. L’exemple consulte toutes les 60 secondes si le document est visible et écoute summaryUpdated en vérifiant app/method. Il regroupe les requêtes simultanées et cache brièvement les données publiques. Nettoyez intervalles et listeners ; traitez chargement, refus et provider absent sans garder de données privées périmées.

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

Implémentation: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Installation du joueur et diagnostic

Compilez/démarrez l’app, enregistrez son dossier dans apps et installez-la via Forge Store. Maintenez une zone vide, ouvrez le sélecteur, choisissez résumé ou horloge et taille puis placez-le dans des cellules libres. Un clic ouvre widget.path ou la route ; l’édition permet le déplacement. Si absent, vérifiez installedApps, Component fonction, sizes tableau, dimensions entières, app active et remoteEntry. Retirer un widget ne désinstalle pas l’app. Testez tailles, deux copies, langues et redémarrage.

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

## Référence de l’API publique

Les exports client et serveur sont distincts ; respectez signatures et limites de confiance.

### Conventions d’appel

Lua utilise exports["forge-npwd"]:methode(...). JavaScript/TypeScript utilise exports["forge-npwd"].methode(...) et await pour l’asynchrone. Vérifiez GetResourceState et traitez les redémarrages. La récupération propose des callbacks pour Lua ; ne supposez pas un tableau Lua immédiat pour tout export asynchrone. Le catalogue couvre les appels publics, pas compatGetNuiCallbacks/compatInvokeNui ni les setters internes. Utilisez l’API actuelle pour le nouveau code et les adaptateurs pour l’ancien.

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

Implémentation: apps/game/client/cl_exports.ts; apps/game/server/bridge/sv_exports.ts; compat/exports.json

### Contexte de l’appareil actif

getActivePhoneContext(source) est synchrone et retourne deviceId, profileId, phoneNumber, ownerIdentifier et holderIdentifier ou null. ownerIdentifier est le propriétaire enregistré ; holderIdentifier le joueur actuel. Distinguez les données liées à profileId des droits professionnels de l’acteur concerné. Ne faites jamais autorité des champs NUI. ID d’app, nom de ressource et route ne remplacent pas l’identité du joueur.

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

Implémentation: apps/game/server/devices/device.service.ts

### Données de récupération et notifications

La liste d’appareils retourne un tableau. Les actions de récupération retournent success et des champs optionnels d’erreur/identité ; ne confondez pas avec {ok, data, error} de l’exemple. CreateNotificationDTO déclare aussi onClick en TypeScript ; Lua peut l’omettre car le runtime valide objet et notisId. Les notifications système utilisent uniqId. N’envoyez pas de fonctions via JSON/NUI. Modèle/couleur sont normalisés côté serveur ; slot est une position réelle. Les exemples ne contournent ni paiement ni autorisation de service.

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

Implémentation: typings/recovery.ts; typings/notifications.ts

### Client

#### HasPhone

~~~ts
HasPhone(): boolean
~~~

Disponibilité de l’item en cache ; pas une vérification PIN ou serveur.

Implémentation: apps/game/client/player_bridge.lua

#### usePhoneItem

~~~ts
usePhoneItem(data: {slot: number}, item?: {slot: number}): boolean
~~~

Entrée client de l’inventaire ; demande un slot validé sans consommer le téléphone.

Implémentation: apps/game/client/player_bridge.lua

#### isPhoneVisible

~~~ts
isPhoneVisible(): boolean
~~~

Indique si ouvert. Ne vérifie pas l’autorisation PIN.

Implémentation: apps/game/client/cl_exports.ts

#### setPhoneVisible

~~~ts
setPhoneVisible(visible: boolean | number): Promise<void>
~~~

Ouvre ou ferme via le parcours normal. Disponibilité requise.

Implémentation: apps/game/client/cl_exports.ts

#### isPhoneDisabled

~~~ts
isPhoneDisabled(): boolean
~~~

Lit la flag client, pas le blocage persistant.

Implémentation: apps/game/client/cl_exports.ts

#### setPhoneDisabled

~~~ts
setPhoneDisabled(disabled: boolean | number): void
~~~

Définit la disponibilité client. Ne déclare pas une perte validée.

Implémentation: apps/game/client/cl_exports.ts

#### hasActivePhone

~~~ts
hasActivePhone(): Promise<boolean>
~~~

Vérifie l’item et l’appareil actif côté serveur.

Implémentation: apps/game/client/cl_exports.ts

#### hasForgeNPWDItem

~~~ts
hasForgeNPWDItem(): boolean
~~~

Vérifie l’item via l’inventaire, pas le déverrouillage.

Implémentation: apps/game/client/device_bridge.lua

#### openApp

~~~ts
openApp(appId: string): void
~~~

Demande une app par ID, pas dossier ni URL. Ouvrez le téléphone séparément si nécessaire.

Implémentation: apps/game/client/cl_exports.ts

#### sendForgeNPWDMessage

~~~ts
sendForgeNPWDMessage(app: string, method: string, data: unknown): void
~~~

Envoie {app, method, data} ; normalise les noms anciens connus.

Implémentation: apps/game/client/cl_exports.ts

#### createNotification

~~~ts
createNotification(dto: CreateNotificationDTO): void
~~~

Utilisez appId, content, secondaryTitle, path, notisId, duration et keepOpen. Millisecondes.

Implémentation: apps/game/client/cl_exports.ts

#### createSystemNotification

~~~ts
createSystemNotification(dto: SystemNotificationDTO): void
~~~

Utilise uniqId. Actions avec controls=true et keepOpen=true.

Implémentation: apps/game/client/cl_exports.ts

#### removeSystemNotification

~~~ts
removeSystemNotification(uniqId: string): void
~~~

Retire la notification système par ID unique.

Implémentation: apps/game/client/cl_exports.ts

#### startPhoneCall

~~~ts
startPhoneCall(number: string, isAnonymous?: boolean): void
~~~

Lance un appel au numéro string ; anonyme false par défaut.

Implémentation: apps/game/client/cl_exports.ts

#### isInCall

~~~ts
isInCall(): boolean
~~~

Lit l’état d’appel client.

Implémentation: apps/game/client/cl_exports.ts

#### endCall

~~~ts
endCall(): Promise<void>
~~~

Termine l’appel actif et son animation.

Implémentation: apps/game/client/cl_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(): Promise<string>
~~~

Lit la ligne actuelle ; consulte le serveur si non cachée.

Implémentation: apps/game/client/cl_exports.ts

#### fillNewContact

~~~ts
fillNewContact({number, name?, avatar?}): void
~~~

Préremplit le formulaire. Le joueur confirme l’enregistrement.

Implémentation: apps/game/client/cl_exports.ts

#### fillNewNote

~~~ts
fillNewNote({title?, content?}): void
~~~

Préremplit le formulaire de notes.

Implémentation: apps/game/client/cl_exports.ts

#### sendUIMessage

~~~ts
sendUIMessage({type: string, payload: unknown}): void
~~~

Forme obsolète. Préférez sendForgeNPWDMessage pour le nouveau code.

Implémentation: apps/game/client/cl_exports.ts

### Serveur

#### newPlayer

~~~ts
newPlayer({source, identifier, phoneNumber?, firstname?, lastname?}, complete?: (success: boolean) => void): Promise<boolean>
~~~

Appelé par PR Bridge en interne. Lua peut fournir un callback de résultat ; pas de deuxième cycle.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### unloadPlayer

~~~ts
unloadPlayer(source: number): Promise<void>
~~~

Décharge le joueur ; intégration requise.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### getPlayerData

~~~ts
getPlayerData({source? | identifier? | phoneNumber?}): Promise<PlayerData | null>
~~~

Localise un joueur chargé. Utilisez un localisateur ; retourne identité et ligne.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(source: number): string
~~~

Recherche obsolète ; préférez getPlayerData. Joueur chargé requis.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### generatePhoneNumber

~~~ts
generatePhoneNumber(): Promise<string>
~~~

Génère un numéro unique. Ne crée pas d’appareil ni d’item.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### isPlayerBusy

~~~ts
isPlayerBusy(source: number): boolean
~~~

Vérifie l’état occupé du joueur.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### isPhoneNumberBusy

~~~ts
isPhoneNumberBusy(number: string): boolean
~~~

Indique si la ligne est en appel.

Implémentation: apps/game/server/bridge/sv_exports.ts

#### getActivePhoneContext

~~~ts
getActivePhoneContext(source: number): PhoneContext | null
~~~

Retourne le contexte actif. Pas une autorisation PIN.

Implémentation: apps/game/server/devices/device.service.ts

#### getDevice

~~~ts
getDevice(deviceId: string): Promise<DeviceIdentity | null>
~~~

Recherche serveur de l’identité, utilisateurs et statut.

Implémentation: apps/game/server/devices/device.service.ts

#### usePhoneSlot

~~~ts
usePhoneSlot(source: number, slot: number): boolean
~~~

Valide le slot réel et déclenche l’usage. Pas de métadonnées arbitraires.

Implémentation: apps/game/server/device_bridge.lua

#### blockDevice

~~~ts
blockDevice(deviceId: string, ownerIdentifier: string): Promise<boolean>
~~~

Blocage avec propriétaire validé. Déduisez-le côté serveur.

Implémentation: apps/game/server/devices/device.service.ts

#### getOwnedPhoneDevices

~~~ts
getOwnedPhoneDevices(source: number, callback?): Promise<OwnedPhoneDevice[]> | void
~~~

Liste les appareils du demandeur. Callback Lua optionnel.

Implémentation: apps/game/server/recovery/recovery.exports.ts

#### cancelLostPhone

~~~ts
cancelLostPhone(source: number, deviceId: string, callback?): Promise<RecoveryResult> | void
~~~

Valide le propriétaire et bloque la perte. Ne rend pas l’item.

Implémentation: apps/game/server/recovery/recovery.exports.ts

#### issueNewPhone

~~~ts
issueNewPhone(source, model?, color?, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Crée profil/ligne/appareil/item. Validez paiement et accès séparément.

Implémentation: apps/game/server/recovery/recovery.exports.ts

#### issueReplacementPhone

~~~ts
issueReplacementPhone(source, oldDeviceId, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Remplace l’appareil possédé bloqué ; conserve ligne/profil/PIN.

Implémentation: apps/game/server/recovery/recovery.exports.ts

#### emitMessage

~~~ts
emitMessage({senderNumber, targetNumber, message, embed?}): Promise<void>
~~~

Envoie un message et invoque le middleware. Validez avant exposition.

Implémentation: apps/game/server/messages/middleware/emitMessage.ts

#### onMessage

~~~ts
onMessage(number: string, callback: (context) => void): void
~~~

Enregistre un handler par numéro ; un nouvel enregistrement le remplace.

Implémentation: apps/game/server/messages/middleware/onMessage.ts

#### onCall

~~~ts
onCall(number: string, callback: (context) => void): void
~~~

Middleware consulte incomingCaller et next, exit, reply ou forward. Définissez la terminaison.

Implémentation: apps/game/server/calls/middleware/index.ts

#### emitRconMessage

~~~ts
emitRconMessage(source: number, message: Message): void
~~~

Émet un succès client, sans persistance propre. Utilisez emitMessage.

Implémentation: apps/game/server/rcon/exports.ts

<a id=ecosystem></a>

## Apps Forge et améliorations

Ressources installables séparées avec contexte de l’appareil et widgets.

### Banque

forge-npwd-banking propose soldes, historique, transferts, PIX/factures, distributeurs et PIN dédié. Le résumé propose 2×1, 4×1 et 4×2, masque les valeurs et vérifie la sécurité. La ressource diffère de BANKING_APP et /bankingapp. Les actions sont validées par service et callbacks ; le widget n’accorde aucun droit et ne contourne pas le PIN.

Implémentation: ../forge-npwd-banking/forge-npwd.config.ts; ../forge-npwd-banking/server/main.lua

### Météo et garages

forge-npwd-weather fournit conditions et prévisions régionales via PR Bridge. La météo actuelle propose 2×1, 4×1 et 2×2 ; les prévisions 4×2. forge-npwd-garage propose flotte, localisation/itinéraire, saisies et dettes si le provider les prend en charge. Son widget propose 2×1, 4×1 et 4×2. Météo et garage dépendent des providers, propriétés et services réels.

Implémentation: ../forge-npwd-weather/forge-npwd.config.ts; ../forge-npwd-garage/forge-npwd.config.ts

### Gestion, logements et courrier

forge-npwd-management regroupe équipe, finances et candidatures avec widget 2×1, 4×1 ou 4×2, sous les permissions professionnelles. forge-npwd-housing propose logements, factures et sécurité aux mêmes tailles ; ID housing et /housing. forge-npwd-mail intègre le courrier citoyen et un résumé si disponible. Son frontend est distribué compilé ; ne promettez pas un rebuild sans ses sources. Chaque service nécessite son provider.

Implémentation: ../forge-npwd-management/forge-npwd.config.ts; ../forge-npwd-housing/forge-npwd.config.ts; ../forge-npwd-mail/server/server.lua

### Banque : usage quotidien et confidentialité

Ouvrez la banque et configurez ou vérifiez son PIN avant de consulter des données protégées. Le résumé associe solde et activité récente ; les autres vues proposent historique et distributeurs proches. Transferts/factures dépendent du service bancaire qui valide montant, destinataire et droits. Masquez le solde avant de montrer le téléphone ; des thèmes locaux sont aussi disponibles. Le widget résume le même service, sans créer une autre banque. Testez session verrouillée, compte gelé, provider absent et actualisation après transfert.

Implémentation: ../forge-npwd-banking/src/App.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Garage : flotte, état et frais

Recherchez la flotte et filtrez type/situation : voitures, motos, bateaux, avions, garés, sortis, assurance, fourrière ou perte totale. Les détails montrent plaque/modèle, carburant, moteur/carrosserie et lecture actuelle ou dernier relevé. Les données absentes ne sont pas inventées. Le trajet utilise la destination serveur ; le suivi peut être désactivé avec une raison. Dépliez les frais pour stationnement, amende ou fourrière et statut de facture. Un itinéraire ne paie pas une amende, ne libère pas un véhicule et ne contourne pas la propriété. Les indicateurs du widget résument les états du provider.

Implémentation: ../forge-npwd-garage/src/App.tsx; ../forge-npwd-garage/src/types.ts

### Logements : accès, factures et sécurité

L’app distingue propriétés possédées et accès partagés. Les détails comprennent factures, sécurité, accès et vente/transfert. Les factures peuvent inclure électricité, eau, taxe résidentielle et surveillance lorsque disponibles. La sécurité montre alarme/surveillance, incidents et caméras ; les actions dépendent des capacités et révisions validées serveur. Un accès partagé ne vaut pas pleine propriété. Une vente envoie une proposition à l’acheteur via le service, sans changer le propriétaire depuis le navigateur. Le widget résume et ouvre l’app. Testez propriétaire/invité, caméras hors ligne, anciennes révisions et paiements refusés.

Implémentation: ../forge-npwd-housing/src/App.tsx; ../forge-npwd-housing/src/views/PropertyDetailsPage.tsx

### Gestion : équipe, candidatures et permissions

La gestion résout l’organisation autorisée du joueur, affiche membres/finances et propose recrutement, licenciement, grade et examen des candidats via callbacks. Les droits incluent règles par grade et exceptions par membre, avec réinitialisation explicite. Sélectionner un joueur proche facilite le recrutement, sans autoriser une autre organisation. Dépôts/retraits sont validés serveur. Le widget résume sous les mêmes droits. Vérifiez employé/gestionnaire, organisations différentes, changements refusés et actualisation après modifications. Ne transformez pas les données d’aperçu en registres réels.

Implémentation: ../forge-npwd-management/src/App.tsx; ../forge-npwd-management/server/main.lua

### Météo et courrier : données des providers

La météo associe conditions actuelles et prévisions régionales. Les widgets indépendants s’actualisent sans ouvrir l’app et réagissent au provider. Distinguez météo de la ville, données illustratives et horloge locale de l’exemple. Le courrier livre par citoyen ; utilisez l’interface serveur, pas des messages fictifs non fiables injectés dans le frontend. Un service absent doit afficher son indisponibilité, pas inventer des données plausibles. Démarrez uniquement les ressources présentes et vérifiez manifeste, callbacks et ID avant le catalogue. Le frontend compilé du courrier n’est pas un template de développement.

Implémentation: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-mail/server/server.lua

<a id=compatibility></a>

## Compatibilité NPWD classique

Une couche isolée conserve les appels publics anciens sans autre téléphone.

### Compatibilité dans le téléphone

Démarrer forge-npwd active compat/exports.lua : interception des événements locaux de résolution des exports anciens connus, transmission aux providers actuels, arguments/retours/côté préservés. Aucun npwd vide, installateur ou bridge dupliqué. Les helpers réutilisent les handlers entrants/NUI. Les manifests déclarent les alias avec provide ; provide seul ne transmet pas les exports.

**forge-npwd - built-in compatibility**

~~~text
ensure forge-npwd
# No compatibility group or separate phone bridge to install/start.
# Start the canonical apps you use.
# Never run original NPWD alongside Forge NPWD.
# Maintainers only, after changing aliases/exports:
# node misc/generate-compat.cjs
~~~

Implémentation: compat/aliases.json; compat/exports.lua; compat/app.lua

### Exemples classique et actuel

exports.npwd:isPhoneVisible() et exports.npwd:sendNPWDMessage(...) passent par la couche interne du téléphone. Le nouveau code utilise exports["forge-npwd"] et sendForgeNPWDMessage. Le modèle classique reste une ressource exposant ./config, React et ses callbacks. Le fichier peut rester npwd.config.ts si correctement exposé. Le loader attend remoteEntry.js ESM/Vite : un ancien build Webpack/global-container peut nécessiter un rebuild avec le template Forge.

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

Implémentation: compat/aliases.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Limites et données préservées

Exports connus, événements/callbacks entrants, convars et ID sont couverts. Dans le téléphone, compat/nui.ts réécrit les hôtes anciens connus de fetch/XHR en préservant les options. Pas les autres NUI, iframes ni toutes les URL compilées : utilisez les noms actuels dans ces cas. Pas de duplication aveugle des noms inconnus ou listeners sortants. SQL et clés restent intacts ; testez les consommateurs réels.

Implémentation: compat/nui.ts; compat/names.ts; compat/client.ts; compat/server.ts; FORGE_NPWD_COMPAT.md

### Migration et redémarrage

Retirez lignes et dossiers forge-npwd-bridge et [forge-npwd-compat] ; démarrez uniquement téléphone et apps actuels. Gardez configuration et SQL. Pas de NPWD original en parallèle. Migrez lors d’un redémarrage planifié. FiveM met les exports en cache par nom demandé : après un redémarrage du téléphone seul, redémarrez les anciens consommateurs concernés. Aucun hook global ni faux événement d’arrêt.

Implémentation: FORGE_NPWD_COMPAT.md; fxmanifest.lua

<a id=testing></a>

## Compiler, tester et publier

Vérifiez les artefacts et scénarios multijoueurs avant la distribution.

### Commandes de développement

Pour l’exemple : npm ci, npm run dev, npm run typecheck, npm test, npm run build et npm run preview. Preview sert le remote compilé sur 4173, comme le loader de développement ; Vite dev ne produit pas l’entry de release. Pour le téléphone, utilisez le workspace pnpm verrouillé. Une app externe nécessite son build et son enregistrement, pas celui du téléphone entier. Incluez web/dist dans la release même si Git l’ignore.

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

### Matrice de tests en ville

Testez items nouveaux/anciens, deux appareils, transfert, PIN valide/invalide, cinq échecs, blocage propriétaire avec autre détenteur, remplacement et inventaire plein. Testez installation/retrait, pages, déplacement/chevauchement, tailles, deux widgets et redémarrage. Testez acteurs autorisés et non autorisés des apps sensibles. Vérifiez un vrai consommateur exports.npwd, voix, médias et redémarrages. Mocks et builds ne certifient pas le multijoueur.

### Sécurité de release et contributions

Distribuez frontend compilé, code, manifestes, assets, exemples, dépendances et notices originales. N’incluez ni identifiants, tokens, données personnelles, node_modules ni planification locale. Conservez les ID stables et documentez les ruptures. Verrouillez les dépendances compatibles et examinez les transitives anciennes ; compatible ne signifie pas récent. Préservez les données et une release de repli. Compiler n’exige ni commit ni publication automatique.

<a id=troubleshooting></a>

## Dépannage

Diagnostiquez disponibilité, fédération, callbacks et contexte séparément.

### Export ou app absent

Si un export npwd ancien échoue, vérifiez forge-npwd avec compat/exports.lua et catalogue actuels, le provider réel et le bon côté. Pas de proxies. Redémarrez les consommateurs avec cache après mise à jour. Pour les apps vérifiez apps, remoteEntry.js, ./config et icônes. Installez via Forge Store et vérifiez l’espace.

Implémentation: compat/exports.lua; compat/exports.json

### Délai dépassé, écran vide ou widget périmé

Une requête au téléphone au lieu de l’app ne trouve pas son callback. Vérifiez ressource explicite, nom, enregistrement serveur et réponse unique. Un écran vide peut venir de React/Router incompatible, chunks absents ou factory attendant settings non fourni. Vérifiez timers, listeners, masquage et provider des widgets. Ne contournez pas les permissions pour réparer l’UI. Utilisez F8 et logs puis reproduisez la requête minimale.

### Récupération refusée ou données modifiées

DEVICE_MUST_BE_BLOCKED exige la déclaration de perte. DEVICE_NOT_FOUND_OR_NOT_OWNED indique un autre propriétaire ou ID invalide. Vérifiez capacité, item et métadonnées en cas d’erreur d’inventaire ; ne répétez pas aveuglément l’émission. Le remplacement conserve le PIN. Un profil vide après transfert impose de vérifier les métadonnées. Indiquez version, ressource, opération, résultat attendu et logs nettoyés ; jamais de PIN ni connexion réelle.

<a id=credits></a>

## Crédits et périmètre

Une évolution Forge basée sur NPWD, avec l’attribution d’origine.

### Project Error / NPWD

NPWD a été créé par Project Error et ses contributeurs. Forge NPWD est un fork communautaire ajoutant appareils, sécurité, récupération, accueil, widgets et compatibilité. Les crédits du téléphone original, des visuels et contributions sont conservés. Ce guide est écrit pour Forge, pas copié. Consultez l’original comme contexte historique et comparez aux sources actuelles avant de reprendre un ancien exemple.

[Project Error documentation](https://projecterror.dev/docs/)

[Project Error / NPWD source](https://github.com/project-error/npwd)

### Distribution et notices de licence

Conservez LICENSE, attributions et licences des assets lors de la redistribution. La licence de l’exemple figure dans son dépôt. Le checkout du téléphone contient GPL-3.0-or-later dans LICENSE mais une autre étiquette historique dans package.json ; ce guide ne résout pas l’écart. Les mainteneurs doivent harmoniser les notices avant publication. Forge NPWD n’est pas une release officielle Project Error ni une garantie de providers sans configuration.

Implémentation: LICENSE; package.json

