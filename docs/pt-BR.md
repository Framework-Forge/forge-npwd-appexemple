<!-- generated-by: gsd-doc-writer -->
# Forge NPWD — Guia completo

Uma plataforma de telefone open source: aparelhos físicos, segurança, recuperação, áreas de trabalho personalizáveis, loja de aplicativos e um contrato expansível para apps e widgets.

[Forge Site](https://framework-forge.github.io/site/#forge-npwd/overview) · [Example App](https://github.com/Framework-Forge/forge-npwd-appexemple) · [README](../README.md)

## Documentação

- [Visão geral e melhorias](#overview)
- [Instalação](#installation)
- [Configuração](#configuration)
- [Uso diário do jogador](#players)
- [PIN e segurança](#security)
- [Perda, bloqueio e recuperação](#recovery)
- [Loja de celulares e atendimento](#shop)
- [Áreas de trabalho e Forge Store](#desktop)
- [Criar um aplicativo externo](#applications)
- [NUI, servidor e notificações](#communication)
- [Desenvolver widgets](#widgets)
- [Referência da API pública](#api)
- [Apps Forge e melhorias](#ecosystem)
- [Compatibilidade com NPWD clássico](#compatibility)
- [Compilar, testar e publicar](#testing)
- [Solução de problemas](#troubleshooting)
- [Créditos e escopo do projeto](#credits)

<a id=overview></a>

## Visão geral e melhorias

O Forge NPWD evolui o NPWD preservando sua proposta expansível.

### Um telefone, diferentes camadas

forge-npwd fornece o telefone, a identidade dos aparelhos e a API. forge-npwd-bridge conecta o ciclo do jogador e o uso no inventário pelo PR Bridge. forge-npwd-shop implementa compra, bloqueio e segunda via de aparelhos. Os apps externos continuam como resources independentes. O projeto atende qualquer instalação FiveM com os adaptadores necessários; não é exclusivo da distribuição de servidor Forge.

### O que a Forge acrescenta

O aparelho físico tem serial, perfil e linha próprios. Quem segura o item pode ser diferente do proprietário registrado. PIN numérico, bloqueio do aparelho e segunda via validada pelo proprietário protegem essa identidade. O launcher acrescenta ícones arrastáveis, múltiplas páginas e widgets. A Forge Store gerencia os apps instalados por perfil. APIs forge-npwd e adaptadores legados isolados mantêm integrações públicas antigas sem criar outra instância do telefone.

### Leia conforme seu objetivo

Jogadores devem ler uso diário, segurança, recuperação e o guia da área de trabalho/loja. Administradores devem começar por instalação e configuração e validar metadata do inventário e adaptadores legados. Desenvolvedores devem usar o tutorial de app externo, os arquivos completos do exemplo, o contrato de widgets, o catálogo da API e o checklist de testes. O caminho de fonte em cada seção técnica indica a implementação conferida; o comportamento ainda deve ser testado na cidade.

<a id=installation></a>

## Instalação

Mantenha o nome do telefone estável e prepare os adaptadores antes da primeira sessão.

### Release ou código-fonte

Use a distribuição Forge do resource, não o pacote do NPWD original como substituto. Uma release compilada precisa conter dist/game e dist/html. Um checkout de fontes precisa das dependências pnpm e do comando build da raiz; não publique um arquivo sem compilar. Nomeie a pasta do telefone exatamente forge-npwd. Faça backup do config.json e dos dados persistentes antes de atualizar. O app de exemplo usa npm e lockfile próprios; sua compilação não é a compilação do workspace do telefone.

**forge-npwd · source build**

~~~text
pnpm install --frozen-lockfile
pnpm build
# Run in the PHONE repository, not the example app.
# For a release package, use its supplied dist/ files.
~~~

Implementação: package.json; fxmanifest.lua

### Dependências e inicialização

O manifesto atual exige pr_bridge, screenshot-basic e pma-voice. Configure os adaptadores do PR Bridge para os serviços da sua base. O telefone usa mysql_connection_string e pool mysql2 próprio: apenas o bridge de banco não substitui essa conexão. Inicie os apps externos antes de abrir o telefone para remoteEntry.js estar disponível. O exemplo não tem dependência rígida de forge-npwd para evitar ciclo na inicialização; verifica a disponibilidade em execução. Inicie bridge de sessões, loja e aliases legados depois do telefone.

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

Implementação: fxmanifest.lua; packages/database/src/db/pool.ts

### Banco e checklist da primeira execução

Importe o import.sql distribuído para o esquema básico NPWD em um banco novo. Extensões de aparelhos, segurança e perfis são tratadas pelos respectivos repositórios; o usuário do banco precisa poder aplicar as alterações previstas. Não apague tabelas npwd_* ou forge_phone_* durante a migração. Confira se o item phone existe, não empilha, preserva metadata nas transferências e chama a integração de uso. Teste aparelho novo, transferido, PIN, chamada, upload da câmera e cada app configurado. Nunca inicie o telefone NPWD original junto do Forge NPWD.

Implementação: import.sql; apps/game/server/devices/device.database.ts

### Dependências dos apps distribuídos e inicialização

O loader precisa alcançar o remoto compilado ao importar o app. O exemplo novo inicia independente antes do telefone. Porém, os manifestos conferidos de banco, garagem, imóveis, clima, gestão e mail declaram dependência de forge-npwd e importam seu helper de compatibilidade. FiveM resolve a dependência apesar da ordem textual de ensure; listar esses apps primeiro não garante telefone por último. Confira manifestos e logs reais. Se um remoto falhar no início, termine de iniciar os apps e reinicialize o telefone em manutenção/teste controlado; o loader pode guardar a falha nessa sessão da UI. Não remova dependências cegamente nem duplique telefones. O trecho de ordem exemplifica o template independente, não é receita universal para todos os apps.

Implementação: apps/phone/src/common/hooks/useExternalApps.tsx; ../forge-npwd-banking/fxmanifest.lua; ../forge-npwd-mail/fxmanifest.lua

<a id=configuration></a>

## Configuração

Configuração do telefone, catálogo de apps e credenciais de serviços têm responsabilidades separadas.

### Configurações do aparelho físico

device.enabled ativa aparelhos físicos. itemName define o item; defaultModel e defaultColor preenchem novos aparelhos, e metadataSchemaVersion informa a versão do metadata. mirrorLegacyPhoneNumber mantém o campo legado de telefone do proprietário quando configurado. PhoneAsItem.enabled e exportResource/exportFunction controlam disponibilidade. Os valores precisam corresponder ao item e aos exports instalados; renomear um campo não é migrar os dados. Preserve o container atual forgeForgeNpwd, mesmo com sua grafia histórica.

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

Implementação: config.json; apps/game/server/devices/device.service.ts

### Geral, banco e aplicativos

general.useResourceIntegration habilita newPlayer/unloadPlayer para o ciclo explícito da sessão. toggleCommand, toggleKey e defaultLanguage configuram o acesso diário. database.playerTable, identifierColumn, identifierType, phoneNumberColumn e profileQueries devem corresponder ao seu modelo de jogadores. apps é um array de NOMES DE PASTAS dos resources externos, não de rotas nem necessariamente IDs. disabledApps controla disponibilidade de apps. Instale o resource no servidor primeiro; a Forge Store só altera quais apps do catálogo estão instalados no perfil ativo.

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

Implementação: config.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Mídia, integrações e segredos

images configura URL de upload, formato, cabeçalhos e returnedDataIndexes. imageSafety define hosts permitidos e incorporação. voiceMessage configura upload opcional de áudio; contacts.frameworkPay e seus exports selecionam a integração de pagamento. customPhoneNumber pode delegar a geração do número. twitter, match, marketplace, defaultContacts, browser e debug mantêm opções próprias. Tokens devem ficar em convars de servidor não replicadas, nunca em JSON enviado à NUI, código cliente ou exemplos versionados. Convars legadas são fallback: o nome Forge configurado tem prioridade.

Implementação: config.json; compat/convars.ts; packages/config/server/index.ts

<a id=players></a>

## Uso diário do jogador

O item seleciona o aparelho usado; posse e propriedade não são a mesma coisa.

### Primeiro uso e troca de aparelho

Adquira o telefone pelo inventário ou atendimento configurado e use esse item. No primeiro uso a identidade é criada quando necessário. Se carregar vários celulares, use o slot do aparelho desejado para ativá-lo; o comando genérico de abrir não é um seletor de aparelho do inventário. Trocar o aparelho invalida a sessão de desbloqueio de quem o segura e abre o fluxo de segurança. Não edite metadata manualmente nem empilhe celulares: deviceId, serial, perfil e linha devem acompanhar cada item individual.

Implementação: apps/game/server/device_bridge.lua; apps/game/server/devices/device.service.ts

### Entregar o aparelho a outro jogador

Transfira ou solte o telefone por uma integração que preserve metadata. O próximo jogador ativa o aparelho existente, não uma cópia vazia em nome dele. Após desbloqueio legítimo, dados do perfil e apps instalados podem acompanhar o aparelho. Isso não transfere automaticamente a propriedade registrada nem concede toda permissão de trabalho, imóvel ou finanças. Apps sensíveis precisam distinguir proprietário físico e usuário atual e impor suas regras no servidor.

### Configurações e ferramentas diárias

Use Configurações para idioma, aparência, moldura, papel de parede, áudio e notificações suportados. Chamadas, mensagens, contatos, câmera, galeria e demais apps habilitados mantêm interfaces próprias. PIN do telefone e PIN bancário são controles separados. A prévia no navegador usa dados ilustrativos e não demonstra inventário, voz, upload ou propriedade. A administração define integrações e catálogo; instalar um app na tela inicial não instala um resource no servidor.

<a id=security></a>

## PIN e segurança

Proteja o acesso sem confundir trava visual com autorização de aplicativos.

### Cadastrar, desbloquear e trocar o PIN

O telefone aceita PIN numérico de 4 a 6 dígitos. Um aparelho sem senha abre o cadastro; um já configurado pede verificação. A troca valida primeiro o PIN atual. O servidor deriva o hash com scrypt e salt aleatório e compara com timingSafeEqual. O PIN não fica salvo no metadata do item. Mantenha a senha privada: entregar o aparelho a alguém que conhece o PIN pode expor dados do telefone, respeitadas autorizações adicionais de cada app.

Implementação: typings/security.ts; apps/game/server/security/security.service.ts

### Tentativas e sessões desbloqueadas

A implementação atual permite cinco tentativas incorretas antes de uma trava temporária de cinco minutos. A verificação válida cria sessão específica de jogador/aparelho com TTL máximo de 12 horas. Ativar um aparelho reseta a sessão do usuário; bloqueá-lo invalida suas sessões. Hoje esses valores são constantes de código, não opções expostas em config.json. A resposta de segurança informa configured, unlocked, attemptsRemaining, lockedUntil e pinLength; erros como INVALID_PIN_FORMAT ou INVALID_CURRENT_PIN identificam a operação que falhou.

Implementação: apps/game/server/security/security.service.ts; typings/security.ts

### Autorização do app é separada

O app bancário acrescenta PIN próprio de 4 a 8 dígitos e sessões no servidor. Seu widget oculta dados sensíveis quando a sessão bancária está bloqueada. Outros apps aplicam checagens de proprietário, trabalho ou serviço. getActivePhoneContext retorna identidade, não prova de PIN desbloqueado nem autorização financeira. Não libere dados privados em um callback só porque a interface está escondida. O exemplo retorna somente informações públicas do servidor e não implementa operações privadas ou financeiras.

Implementação: ../forge-npwd-banking/server/main.lua; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

<a id=recovery></a>

## Perda, bloqueio e recuperação

Substitua o aparelho preservando o perfil e a linha do proprietário registrado.

### Bloqueio validado pelo proprietário

O atendimento lista aparelhos registrados ao jogador solicitante. Informe a perda pela loja configurada ou integração autorizada no servidor. cancelLostPhone valida a propriedade registrada e muda o status para blocked; invalida sessões e avisa um usuário ativo. O item antigo ainda pode existir no inventário de alguém, mas deixa de ser um aparelho ativo. Bloquear é diferente de fechar a NUI ou desabilitar temporariamente a interface.

Implementação: apps/game/server/recovery/recovery.service.ts; apps/game/server/devices/device.service.ts

### O que a segunda via preserva

issueReplacementPhone exige aparelho bloqueado pertencente ao solicitante. Cria deviceId e serial novos, preserva profileId, lineId e phoneNumber e copia hash/salt do PIN em vez de remover a senha. O aparelho antigo vira replaced e registra replacedByDeviceId. O processo usa transação no banco e compensa a inserção no inventário se o commit falhar. Não teleporta o item perdido, não concede celular de outro jogador e não recupera PIN esquecido apagando a senha.

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

Implementação: apps/game/server/recovery/recovery.exports.ts; apps/game/server/recovery/recovery.service.ts

### Integre taxas e proteja a emissão

Use configuração e callbacks validados da loja para preços, locais e atendimento. Exports de emissão não substituem a validação de pagamento do seu script. Integrações precisam derivar source da requisição, validar propriedade e capacidade, impedir compras repetidas e tratar success/error. Exports de recuperação oferecem callback opcional para Lua; consumidores JavaScript podem aguardar promises. Erros comuns incluem DEVICE_MUST_BE_BLOCKED, DEVICE_ALREADY_REPLACED, DEVICE_NOT_FOUND_OR_NOT_OWNED e INVENTORY_ADD_FAILED.

Implementação: apps/game/server/recovery/recovery.exports.ts; ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua

<a id=shop></a>

## Loja de celulares e atendimento

forge-npwd-shop conecta o catálogo de aparelhos físicos à compra, consulta do proprietário, bloqueio e segunda via pelo PR Bridge.

### Resource separado, não a loja de aplicativos

Forge NPWD Shop é o atendimento de venda e recuperação no mundo. A Forge Store dentro do telefone gerencia apps instalados; são lojas com responsabilidades diferentes. Instale a pasta como forge-npwd-shop e mantenha forge-npwd e pr_bridge disponíveis. A loja carrega @pr_bridge/init.lua e @forge-npwd/compat/app.lua e usa menus, alertas, notificações, callbacks e adaptadores financeiros do PR Bridge. Não distribui outro telefone nem exige importação SQL própria da loja: aparelho/perfil/linha ficam no serviço do telefone. Configuração e arquivos client/server publicados foram comparados com a implementação usada neste guia.

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

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/fxmanifest.lua

[Repositório Forge NPWD Shop](https://github.com/Framework-Forge/forge-npwd-shop)

### Configure locais, catálogo e taxas

Edite config.lua da loja, não appCatalog do telefone. Config.Models contém id do modelo, label, descrição, preço, ícone do menu e pares id/label das cores. O catálogo distribuído traz Forge One (2500), Forge Pro (4500) e Forge Ultra (7000); a taxa padrão de segunda via é 750. IDs de modelo/cor viram metadata do aparelho, não nomes de itens separados nem modelos 3D criados automaticamente. Use IDs simples com letras, números, sublinhado ou hífen; o telefone aceita modelo com até 32 caracteres e cor com até 24. Config.Locations aceita vários locais com coordenadas vector3, marcador e blip. O exemplo abaixo é uma configuração completa com catálogo reduzido e um local; substitua as coordenadas pelo atendimento da cidade. Esta versão não tem editor de loja in-game. Após editar, reinicie apenas forge-npwd-shop em manutenção controlada para recarregar preços no servidor e menus/blips no cliente juntos.

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

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/config.lua; apps/game/server/recovery/recovery.service.ts

### Acesso pelo marcador e integração opcional com NPC

A loja atual cria marcadores e blips, não um ped. Próximo ao ponto configurado, o loop desenha o marcador dentro de DrawDistance (15 m por padrão) e mostra E dentro de InteractionDistance (2 m). Aperte E para abrir. Config.Locations não tem modelo de ped, heading, seletor target/interact nem posicionador de NPC. Para atendimento com NPC, seu resource de NPC/interação cria e posiciona o ped e chama o export client openShop na ação escolhida. O exemplo somente abre o menu existente; não cria NPC nem registra target. Mantenha o gerenciamento do NPC nessa integração, evite marcadores duplicados quando necessário e não considere NPC uma função pronta desta release. /forgephoneshop também abre o menu e é um comando de teste sem restrição de local.

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

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua

### Fluxo do jogador: compra e primeiro uso

Abra o atendimento, escolha Comprar aparelho, selecione modelo e cor e confirme o preço exibido. O servidor obtém o jogador pelo source do callback, confere modelo/cor no catálogo próprio e calcula a cobrança. issueNewPhone cria device ID, serial, perfil, linha e número únicos e entrega o item de telefone configurado com metadata forgeForgeNpwd. Use esse item para selecionar/abrir o aparelho físico. Comprar outro aparelho não substitui o perfil antigo. Modelos são opções do catálogo para o mesmo item configurado; confirme que ele existe, não empilha e preserva metadata na transferência. Personagem não carregado, saldo insuficiente ou entrega recusada pelo inventário não significam compra concluída.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Prioridade de pagamento, sem dividir a cobrança

Config.PaymentAccounts é uma lista ordenada de contas reconhecidas pelo adaptador financeiro do PR Bridge. Com { cash, bank }, o servidor tenta dinheiro primeiro e depois banco; uma conta precisa cobrir o valor inteiro. Não soma os saldos nem mostra seletor de forma de pagamento. Se dinheiro não basta e banco cobre, a cobrança inteira sai do banco. Reordene para mudar prioridade ou deixe uma única conta permitida. Preços e RecoveryPrice são arredondados para baixo para inteiros e limitados ao mínimo zero; zero é gratuito. Bloquear não tem taxa separada nesta loja. Revise os valores do servidor antes de publicar o atendimento.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Meus aparelhos: consulta do proprietário e bloqueio

Meus aparelhos lista os aparelhos do proprietário registrado por getOwnedPhoneDevices, inclusive os que não estão mais no inventário dele. O menu mostra número, modelo, status e serial; detalhes também mostram ID e cor. Aparelhos ativos oferecem bloqueio por perda e recuperação; bloqueados oferecem recuperação. Registros substituídos ficam no histórico e não oferecem outra segunda via no menu. Confirmar a perda chama cancelLostPhone com o source autenticado; o telefone valida a propriedade registrada e revoga o acesso ao aparelho físico. Segurar o celular de outra pessoa não dá direito ao atendimento do proprietário. Bloquear desativa o item antigo; não apaga nem teleporta esse item de volta.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Segunda via: o que permanece e o que muda

Escolha Recuperar em novo aparelho e confirme a taxa. A loja cobra, bloqueia o aparelho selecionado e chama issueReplacementPhone. Assim, permite recuperar direto pelo menu de um aparelho ativo: não precisa bloquear manualmente antes na loja. O export de segunda via do telefone, isoladamente, ainda exige aparelho bloqueado e valida o proprietário. A segunda via tem novo deviceId e serial, mas mantém profileId, lineId, número, modelo, cor e hash/salt do PIN existente. Dados vinculados ao perfil, como configurações do launcher, continuam associados ao mesmo perfil. O aparelho antigo fica substituído e inutilizável. É outro item físico para a mesma identidade, não troca de número nem cópia livre de inventário.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua; apps/game/server/recovery/recovery.service.ts

### Reset não é uma operação da loja

A loja conferida não tem ação de restaurar fábrica, redefinir PIN esquecido, apagar dados ou reiniciar resource para jogadores. O ícone de setas de recuperação significa segunda via, não reset do telefone. A segunda via mantém o PIN existente e não contorna senha desconhecida. Comprar aparelho novo cria outro perfil; não apaga o perfil anterior. Reiniciar forge-npwd-shop é uma etapa administrativa para recarregar configuração, não atendimento vendido ao player. Um serviço futuro de reset precisa de regras próprias de autorização, retenção de dados e propriedade antes de ser anunciado como disponível.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; apps/game/server/recovery/recovery.service.ts

### Falhas e limites do controle de acesso

O servidor serializa compra/bloqueio/recuperação do jogador enquanto a operação está em andamento e rejeita seleção fora do catálogo. Falhas de emissão retornadas disparam reembolso à conta cobrada. Se a recuperação bloqueia o antigo e depois a entrega falha, a taxa é reembolsada, mas o antigo continua bloqueado; liberar inventário e tentar novamente não equivale a reativar o item antigo. PhoneExportTimeout é 15000 ms e CallbackTimeout é 25000 ms por padrão. Timeout encerra a espera; não cancela operação de banco/export já em execução. Confira lista de aparelhos, inventário e logs antes de repetir uma compra com timeout: resultado tardio precisa de conciliação. Os callbacks atuais validam jogador/catálogo/pagamento e delegam propriedade ao telefone, mas não validam proximidade no servidor, horário, trabalho ou permissão do NPC. Distância do marcador, comando ou target de NPC no client não é barreira de acesso do servidor. Adicione validação no servidor em tarefa de implementação separada antes de exigir comércio restrito ao local; o guia não apresenta essa restrição como pronta.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

### Interfaces da loja e checklist de validação

A entrada pública client da loja é exports['forge-npwd-shop']:openShop(); abre o menu raiz e não retorna resultado de compra. Callbacks internos de servidor do PR Bridge são forge-npwd-shop:server:getDevices (sem argumentos), :buyPhone (modelId, colorId), :cancelPhone (deviceId) e :recoverPhone (deviceId), todos com prefixo forge-npwd-shop:server. Retornam envelopes success/error; getDevices acrescenta devices. Não são exports do telefone; serviços próprios de servidor devem usar as APIs canônicas do telefone com cobrança/permissões próprias, sem tratar callbacks de menu como autorização confiável. Teste acesso por E/comando; modelos/cores; prioridade dinheiro e fallback banco; saldo combinado insuficiente em uma única conta; inventário cheio/reembolso; perda com item na mão de outro jogador; proprietário versus portador; segunda via mantendo número/PIN; aparelho já substituído; telefone indisponível; e conciliação após timeout. Confira menus, alertas e pagamentos com os providers PR Bridge em multiplayer real.

Implementação: ../../[forge]/[forge-scripts]/forge-npwd-shop/client/main.lua; ../../[forge]/[forge-scripts]/forge-npwd-shop/server/main.lua

<a id=desktop></a>

## Áreas de trabalho e Forge Store

Personalize o perfil ativo do telefone, não a instalação de apps do servidor inteiro.

### Editar ícones, páginas e widgets

Segure uma área vazia da tela inicial para entrar na edição. Arraste ícones ou widgets para células livres, alterne páginas e use os controles para adicionar ou remover áreas de trabalho. A grade atual tem 4 colunas × 5 linhas, 20 células por página e até 5 páginas. Widgets reservam retângulos; ícones não podem sobrepor esses espaços. No seletor, escolha um widget registrado e um tamanho oferecido. Esses limites são constantes de código, não configurações do painel admin.

Implementação: typings/home.ts; apps/phone/src/apps/home/components/Home.tsx

### Instalar e desinstalar apps

Abra Forge Store, pesquise no catálogo fornecido pelo servidor e escolha Instalar ou Remover. A instalação altera installedApps do perfil ativo, com progresso visual e reversão se salvar falhar. Os apps de sistema DIALER, MESSAGES, CONTACTS, CAMERA, SETTINGS e FORGE_STORE são preservados. Remover atualiza presença no launcher e widgets associados; não exclui o resource do servidor nem apaga automaticamente registros do banco do app. O progresso de download é feedback visual, não uma loja remota que baixa código.

Implementação: apps/phone/src/apps/store/ForgeStoreApp.tsx; apps/phone/src/apps/home/state/home.state.ts

### Persistência e validação

HomeLayout salva pageCount, pages, widgets e installedApps pelo perfil ativo. Cada posição de widget registra instanceId, widgetId, page, x, y, width e height. O servidor rejeita quantidade inválida de páginas, IDs duplicados, posições fora da grade e sobreposições. Limita a 20 widgets e entrada installedApps com 64 IDs. Essas checagens protegem a integridade do layout, não autorizam transações de apps. Layouts legados sem installedApps migram preservando os apps existentes.

Implementação: apps/game/server/home/home.controller.ts; apps/game/server/home/home.database.ts

<a id=applications></a>

## Criar um aplicativo externo

Comece pelo exemplo completo e altere os identificadores como um contrato único.

### Clonar, instalar e visualizar

O template público é forge-npwd-appexemple; mantenha essa grafia ao seguir os comandos. Use Node 20 ou superior no template. npm ci instala dependências travadas, npm run dev abre a prévia independente e npm run build verifica tipos e gera web/dist. A prévia usa estatísticas simuladas e MemoryRouter; no jogo o telefone fornece o roteador. Não monte uma segunda raiz React no iframe do resource do app.

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

### Nome do resource, ID e rota

RESOURCE_NAME é a pasta usada pelo FiveM, config.json e URLs de callbacks NUI. APP_ID é a identidade usada no launcher, mensagens e widgets. APP_PATH é a rota. Podem diferir: o resource bancário é forge-npwd-banking, o ID é BANKING_APP e a rota /bankingapp. O template usa um prefixo consistente por clareza. Ao renomear, atualize contracts.ts, fxmanifest.lua, os dois Lua, o nome da federação, a inicialização e o array apps. IDs estáveis preservam instalações e referências de widgets salvas.

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

Implementação: apps/phone/src/common/hooks/useExternalApps.tsx

### Publicar o descritor do app

forge-npwd.config.ts exporta uma factory default que retorna id, nameLocale, path, color, backgroundColor, icon, notificationIcon e app, além de homeWidgets opcional. Ícones e app são funções de componente React, não JSX já renderizado. O loader atual chama a factory sem argumento settings; não presuma settings.language. O exemplo implementa seletor próprio de idioma. Seus estilos usam forge-example-* para não alterar telefone e outros apps. Use o roteador do host; não inclua BrowserRouter dentro do app.

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

Implementação: apps/phone/src/common/hooks/useExternalApps.tsx

### Federação, arquivos e instalação

O telefone carrega https://cfx-nui-RESOURCE_NAME/web/dist/remoteEntry.js e importa ./config como remoto ESM/Vite. forge-npwd.config.ts é convenção de fonte; o módulo exposto ./config é o contrato em execução. Compile com assetsDir vazio para remoteEntry.js ficar na raiz esperada. Compartilhe React, React DOM e React Router compatível com o host; não atualize para Router 6 sem adaptar o telefone. Após compilar, distribua fxmanifest, Lua e web/dist, registre o resource em apps, reinicie-o e reabra/reinicie o telefone em teste planejado.

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

Implementação: apps/phone/src/common/hooks/useExternalApps.tsx

### O layout completo do app

O exemplo separa cabeçalho fixo, navegação, conteúdo rolável e prévias de widgets. Visão geral consulta dados públicos do servidor; Guia explica o fluxo do jogador. Há estados explícitos de carregamento, erro e nova tentativa. O widget se adapta a células, não a pixels fixos do celular. Copie como ponto de partida e substitua dados simulados e callbacks públicos por serviços autorizados do seu domínio. O template não oferece transferência de dinheiro, alteração de proprietário nem acesso a dados privados.

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

### Manifesto do resource e versões compartilhadas

O manifesto carrega PR Bridge nos dois contextos e serve todos os arquivos compilados. Não há dependência obrigatória de forge-npwd no manifesto, para o app iniciar antes do telefone; callbacks conferem sua disponibilidade. O template trava React 17.0.2 e Router 5.3.0 conforme o host conferido. A federação precisa resolver uma instância React compatível; divergências podem causar erro de hooks mesmo compilando. Preserve o lockfile e inclua web/dist na release. Outros apps podem ter dependências de fonte diferentes; copiar código não dispensa testar o runtime resolvido.

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

## NUI, servidor e notificações

Use destinos explícitos nos callbacks e identidade derivada pelo servidor.

### Requisição: React → Lua → servidor

fetchNui envia JSON a https://RESOURCE_NAME/getSummary. Como o código federado executa no documento do telefone, GetParentResourceName identifica o telefone, não o app: use sempre o nome do resource externo nos callbacks dele. RegisterNUICallback recebe e chama pr_lib.callback.await com timeout de 5 segundos. O servidor registra o mesmo callback e deriva source do solicitante. O exemplo acrescenta timeout de 7 segundos no navegador e retorna uma única resposta ok/data ou ok/error.

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

### Validar no servidor

Nunca confie em identificador, proprietário, saldo ou profileId enviado pela NUI. O exemplo deriva getActivePhoneContext(source), exige aparelho ativo e limita a frequência de consulta pública. Retorna somente população do servidor e horário. Para operações privadas ou de escrita, acrescente sessão do app, checagens de proprietário/trabalho, limites de entrada, transação e auditoria. Telefone ausente ou reiniciando deve gerar erro controlado. Contexto ativo não prova verificação do PIN; preserve essa distinção ao expandir o template.

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

### Eventos e notificações

SendNUIMessage no app externo alcança o iframe dele, não a interface do telefone. Use exports["forge-npwd"]:sendForgeNPWDMessage(APP_ID, method, data); o listener confere event.data.app e event.data.method. createNotification usa ID, rota e notisId estável; duration é em milissegundos. O exemplo inclui callback de notificação protegido e evento local de atualização. Remova listeners e timers ao desmontar. Não envie PIN, token de upload ou registros privados desnecessários em notificações.

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

Implementação: apps/game/client/cl_exports.ts

<a id=widgets></a>

## Desenvolver widgets

O mesmo contrato de registro usado por banco, clima e outros apps Forge.

### Registrar homeWidgets

Adicione homeWidgets ao descritor. Cada entrada tem id local estável, name, description opcional, sizes, Component e path opcional. Um tamanho é {width, height, label}; width/height são inteiros positivos em células, não pixels. Component é função que recebe {width, height}. O telefone monta widgetId como APP_ID:id_local, por exemplo forge-npwd-appexemple:summary. Não altere esses IDs depois de existirem posições salvas. O widget só é oferecido enquanto o app estiver instalado.

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

Implementação: apps/phone/src/os/apps/config/apps.tsx; apps/phone/src/apps/home/components/Home.tsx

### Renderizar independente e adaptar tamanho

Widgets montam na tela inicial, fora do componente principal e dos providers privados do app. Não dependa de um provider existente só em App. Use hook independente, store compartilhada ou provider específico do widget. O resumo funciona em 2×1, 4×1 e 4×2, mostrando horário em layouts altos. O relógio funciona em 2×1 e 2×2 sem consultar servidor; intencionalmente mostra hora real local, não relógio da cidade. Use raiz 100%, border-box e evite overflow ou CSS global.

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

### Atualização e limpeza

O widget bancário consulta a cada 30 segundos e reage a eventos de transferência/cobrança; o de clima consulta a cada 60 segundos e reage a weatherUpdated. Ambos buscam dados sem depender de app aberto. O exemplo consulta a cada 60 segundos com documento visível e escuta summaryUpdated conferindo app/method. Agrupa requisições simultâneas e mantém cache público curto. Limpe intervalos e listeners no retorno de useEffect; trate carregamento, falta de permissão e provider ausente sem reter dados privados antigos.

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

Implementação: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Instalação pelo jogador e diagnóstico

Compile/inicie o app, registre a pasta em apps e instale pela Forge Store. Segure área vazia, abra seletor, escolha resumo ou relógio e tamanho, e posicione em células livres. Um clique normalmente abre widget.path ou rota do app; a edição permite movê-lo. Se não aparecer, confira installedApps, Component como função, sizes como array, medidas inteiras positivas, app habilitado e remoteEntry válido. Remover widget não desinstala o app. Teste cada tamanho, duas cópias, troca de idioma e reinício.

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

## Referência da API pública

Exports de cliente e servidor são superfícies distintas; respeite assinaturas e limites de confiança.

### Convenções de chamada

Lua usa exports["forge-npwd"]:metodo(...). JavaScript/TypeScript usa exports["forge-npwd"].metodo(...) e await para operações assíncronas. Confira GetResourceState em integrações opcionais e trate reinícios. Exports de recuperação oferecem overload de callback para Lua; não presuma retorno de tabela Lua imediatamente disponível em todo export assíncrono. O catálogo lista chamadas públicas, não compatGetNuiCallbacks/compatInvokeNui ou setters de inventário de baixo nível. Use a API atual em código novo e adaptadores nos consumidores antigos.

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

Implementação: apps/game/client/cl_exports.ts; apps/game/server/bridge/sv_exports.ts; compat/exports.json

### Contexto do aparelho ativo

getActivePhoneContext(source) é síncrono e retorna deviceId, profileId, phoneNumber, ownerIdentifier e holderIdentifier, ou null. ownerIdentifier é o proprietário registrado; holderIdentifier é o jogador atual. Use a distinção conscientemente: registros do perfil podem seguir profileId, enquanto permissões de emprego exigem o ator correto. Nunca aceite esses campos da NUI como autoridade. ID do app, nome do resource e rota não substituem identidade do jogador.

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

Implementação: apps/game/server/devices/device.service.ts

### Dados da recuperação e das notificações

A listagem de aparelhos retorna um array. Ações de recuperação retornam success e campos opcionais de erro/identidade; não confunda com o envelope {ok, data, error} do app de exemplo. Em TypeScript, CreateNotificationDTO também declara onClick; chamadas Lua comuns podem omiti-lo porque o runtime valida objeto e notisId, não todos os campos do tipo. Notificações de sistema usam uniqId, não notisId. Não envie funções de callback por JSON/NUI. Modelo/cor são normalizados no servidor; slot é posição real do inventário. Os exemplos não dispensam cobrança nem autorização do atendimento.

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

Implementação: typings/recovery.ts; typings/notifications.ts

### Cliente

#### isPhoneVisible

~~~ts
isPhoneVisible(): boolean
~~~

Informa se o telefone está aberto. Não verifica autorização do PIN.

Implementação: apps/game/client/cl_exports.ts

#### setPhoneVisible

~~~ts
setPhoneVisible(visible: boolean | number): Promise<void>
~~~

Abre ou fecha pelo fluxo normal. A disponibilidade do aparelho continua exigida.

Implementação: apps/game/client/cl_exports.ts

#### isPhoneDisabled

~~~ts
isPhoneDisabled(): boolean
~~~

Consulta a flag desabilitado do cliente, não o status persistente do aparelho.

Implementação: apps/game/client/cl_exports.ts

#### setPhoneDisabled

~~~ts
setPhoneDisabled(disabled: boolean | number): void
~~~

Define disponibilidade no cliente. Não é declaração de perda validada pelo proprietário.

Implementação: apps/game/client/cl_exports.ts

#### hasActivePhone

~~~ts
hasActivePhone(): Promise<boolean>
~~~

Confere item e disponibilidade do aparelho ativo no servidor.

Implementação: apps/game/client/cl_exports.ts

#### hasForgeNPWDItem

~~~ts
hasForgeNPWDItem(): boolean
~~~

Checagem do item pelo bridge de inventário. Não verifica sessão desbloqueada.

Implementação: apps/game/client/device_bridge.lua

#### openApp

~~~ts
openApp(appId: string): void
~~~

Solicita app pelo ID, não pela pasta ou URL. Abra o telefone separadamente quando necessário.

Implementação: apps/game/client/cl_exports.ts

#### sendForgeNPWDMessage

~~~ts
sendForgeNPWDMessage(app: string, method: string, data: unknown): void
~~~

Envia {app, method, data} ao documento do telefone; nomes antigos conhecidos são normalizados.

Implementação: apps/game/client/cl_exports.ts

#### createNotification

~~~ts
createNotification(dto: CreateNotificationDTO): void
~~~

Use appId, content, secondaryTitle, path, notisId, duration e keepOpen. Duração em milissegundos.

Implementação: apps/game/client/cl_exports.ts

#### createSystemNotification

~~~ts
createSystemNotification(dto: SystemNotificationDTO): void
~~~

Notificação de sistema usa uniqId. Ações exigem controls=true e keepOpen=true.

Implementação: apps/game/client/cl_exports.ts

#### removeSystemNotification

~~~ts
removeSystemNotification(uniqId: string): void
~~~

Remove a notificação de sistema pelo identificador único.

Implementação: apps/game/client/cl_exports.ts

#### startPhoneCall

~~~ts
startPhoneCall(number: string, isAnonymous?: boolean): void
~~~

Inicia chamada para número string; anônimo é false por padrão.

Implementação: apps/game/client/cl_exports.ts

#### isInCall

~~~ts
isInCall(): boolean
~~~

Consulta estado da chamada no cliente.

Implementação: apps/game/client/cl_exports.ts

#### endCall

~~~ts
endCall(): Promise<void>
~~~

Encerra chamada ativa e animação associada.

Implementação: apps/game/client/cl_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(): Promise<string>
~~~

Lê a linha atual; busca no servidor se não estiver em cache.

Implementação: apps/game/client/cl_exports.ts

#### fillNewContact

~~~ts
fillNewContact({number, name?, avatar?}): void
~~~

Preenche formulário de contato. O jogador ainda confirma o salvamento.

Implementação: apps/game/client/cl_exports.ts

#### fillNewNote

~~~ts
fillNewNote({title?, content?}): void
~~~

Preenche formulário pelo aplicativo de notas.

Implementação: apps/game/client/cl_exports.ts

#### sendUIMessage

~~~ts
sendUIMessage({type: string, payload: unknown}): void
~~~

Forma obsoleta de compatibilidade. Prefira sendForgeNPWDMessage em código novo.

Implementação: apps/game/client/cl_exports.ts

### Servidor

#### newPlayer

~~~ts
newPlayer({source, identifier, phoneNumber?, firstname?, lastname?}): Promise<void>
~~~

Carrega sessão com general.useResourceIntegration habilitado. Não duplique o bridge de ciclo.

Implementação: apps/game/server/bridge/sv_exports.ts

#### unloadPlayer

~~~ts
unloadPlayer(source: number): Promise<void>
~~~

Descarrega o jogador pelo serviço de ciclo; requer integração habilitada.

Implementação: apps/game/server/bridge/sv_exports.ts

#### getPlayerData

~~~ts
getPlayerData({source? | identifier? | phoneNumber?}): Promise<PlayerData | null>
~~~

Localiza jogador carregado. Use um localizador; retorna phoneNumber, firstName, lastName, name, identifier e source.

Implementação: apps/game/server/bridge/sv_exports.ts

#### getPhoneNumber

~~~ts
getPhoneNumber(source: number): string
~~~

Consulta obsoleta no servidor; prefira getPlayerData. Requer jogador carregado.

Implementação: apps/game/server/bridge/sv_exports.ts

#### generatePhoneNumber

~~~ts
generatePhoneNumber(): Promise<string>
~~~

Gera número único. Não emite aparelho nem item no inventário.

Implementação: apps/game/server/bridge/sv_exports.ts

#### isPlayerBusy

~~~ts
isPlayerBusy(source: number): boolean
~~~

Confere estado ocupado no serviço do telefone.

Implementação: apps/game/server/bridge/sv_exports.ts

#### isPhoneNumberBusy

~~~ts
isPhoneNumberBusy(number: string): boolean
~~~

Informa se a linha está em chamada no serviço.

Implementação: apps/game/server/bridge/sv_exports.ts

#### getActivePhoneContext

~~~ts
getActivePhoneContext(source: number): PhoneContext | null
~~~

Retorna deviceId, profileId, phoneNumber, ownerIdentifier e holderIdentifier. Não autoriza PIN.

Implementação: apps/game/server/devices/device.service.ts

#### getDevice

~~~ts
getDevice(deviceId: string): Promise<DeviceIdentity | null>
~~~

Consulta confiável de identidade, usuários registrado/atual e status no servidor.

Implementação: apps/game/server/devices/device.service.ts

#### usePhoneSlot

~~~ts
usePhoneSlot(source: number, slot: number): boolean
~~~

Valida slot real e encaminha o uso. Não passe metadata arbitrário do cliente.

Implementação: apps/game/server/device_bridge.lua

#### blockDevice

~~~ts
blockDevice(deviceId: string, ownerIdentifier: string): Promise<boolean>
~~~

Bloqueio validado por proprietário. Derive proprietário no servidor, nunca da NUI.

Implementação: apps/game/server/devices/device.service.ts

#### getOwnedPhoneDevices

~~~ts
getOwnedPhoneDevices(source: number, callback?): Promise<OwnedPhoneDevice[]> | void
~~~

Lista aparelhos registrados ao solicitante. Lua pode usar callback opcional.

Implementação: apps/game/server/recovery/recovery.exports.ts

#### cancelLostPhone

~~~ts
cancelLostPhone(source: number, deviceId: string, callback?): Promise<RecoveryResult> | void
~~~

Valida proprietário e bloqueia por perda. Retorna success/error, não devolução do item.

Implementação: apps/game/server/recovery/recovery.exports.ts

#### issueNewPhone

~~~ts
issueNewPhone(source, model?, color?, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Emite perfil/linha/aparelho/item novos. Chamadores devem validar pagamento e atendimento.

Implementação: apps/game/server/recovery/recovery.exports.ts

#### issueReplacementPhone

~~~ts
issueReplacementPhone(source, oldDeviceId, slotOrCallback?, callback?): Promise<RecoveryResult> | void
~~~

Substitui aparelho próprio bloqueado, mantendo linha/perfil e PIN. Trata transação inventário/banco.

Implementação: apps/game/server/recovery/recovery.exports.ts

#### emitMessage

~~~ts
emitMessage({senderNumber, targetNumber, message, embed?}): Promise<void>
~~~

Servidor envia mensagem e aciona middleware do destino. Valide antes de expor a clientes.

Implementação: apps/game/server/messages/middleware/emitMessage.ts

#### onMessage

~~~ts
onMessage(number: string, callback: (context) => void): void
~~~

Registra handler por número; registrar novamente substitui a entrada.

Implementação: apps/game/server/messages/middleware/onMessage.ts

#### onCall

~~~ts
onCall(number: string, callback: (context) => void): void
~~~

Middleware pode consultar incomingCaller e chamar next, exit, reply ou forward. Defina término explícito.

Implementação: apps/game/server/calls/middleware/index.ts

#### emitRconMessage

~~~ts
emitRconMessage(source: number, message: Message): void
~~~

Emite evento de sucesso ao cliente. Não persiste por si; use emitMessage para envio normal.

Implementação: apps/game/server/rcon/exports.ts

<a id=ecosystem></a>

## Apps Forge e melhorias

Resources instaláveis separados com contexto do aparelho e integração de widgets.

### Banco

forge-npwd-banking oferece saldos, histórico, transferências, PIX/cobranças, localização de caixas e PIN próprio. O resumo oferece 2×1, 4×1 e 4×2, com ocultação de valores e checagem de segurança antes da leitura. O resource difere do ID BANKING_APP e rota /bankingapp. Ações financeiras continuam validadas pelo serviço bancário e callbacks do servidor; widgets não concedem permissão nem ignoram o PIN.

Implementação: ../forge-npwd-banking/forge-npwd.config.ts; ../forge-npwd-banking/server/main.lua

### Clima e garagens

forge-npwd-weather fornece condição atual e previsão regional pelo PR Bridge. O clima atual oferece 2×1, 4×1 e 2×2; previsão usa 4×2. forge-npwd-garage oferece frota, localização/rota, apreensão e dívida de estacionamento quando o provider permite. Seu widget oferece 2×1, 4×1 e 4×2. Clima depende do provider configurado; ações da garagem dependem de propriedade e serviços reais, não do launcher.

Implementação: ../forge-npwd-weather/forge-npwd.config.ts; ../forge-npwd-garage/forge-npwd.config.ts

### Gestão, imóveis e e-mail

forge-npwd-management reúne equipe, finanças e candidaturas com painel 2×1, 4×1 ou 4×2; permissões de trabalho/gestão continuam exigidas. forge-npwd-housing oferece imóveis, contas e segurança residencial nesses tamanhos; usa ID housing e rota /housing. forge-npwd-mail integra correio por cidadão e resumo no launcher quando disponível. A interface distribuída do mail é compilada; não prometa recompilar sem obter sua fonte. Cada provider precisa estar instalado para o serviço funcionar.

Implementação: ../forge-npwd-management/forge-npwd.config.ts; ../forge-npwd-housing/forge-npwd.config.ts; ../forge-npwd-mail/server/server.lua

### Banco: uso diário e privacidade

Abra o banco e cadastre ou valide o PIN próprio antes de ler informações protegidas. A visão geral combina saldo e movimentação recente; telas específicas oferecem histórico e caixas próximos. Transferências/cobranças dependem do serviço bancário, que valida valor, destinatário e permissões. Use o controle de ocultar saldo ao mostrar o celular a outra pessoa; também há preferências locais de tema. O widget resume o mesmo serviço, não cria um banco paralelo. Teste sessão bloqueada, conta congelada, provider ausente e uma transferência seguida da atualização do widget.

Implementação: ../forge-npwd-banking/src/App.tsx; ../forge-npwd-banking/src/widgets/BankingWidget.tsx

### Garagem: frota, condição e cobranças

Pesquise a frota e filtre por tipo/situação: carros, motos, barcos e aeronaves, guardados, fora, seguro, apreendidos e perda total. Detalhes mostram placa/modelo, combustível, motor/lataria e se a leitura é atual ou último registro. Dados ausentes aparecem como não informados, não são inventados. A rota usa destino enviado pelo servidor; rastreamento pode estar indisponível com motivo. Expanda uma cobrança para ver parquímetro, multa policial ou apreensão e status da fatura. Marcar rota não paga multa, não libera apreensão e não dispensa propriedade. Contagens/alertas do widget resumem os estados do provider.

Implementação: ../forge-npwd-garage/src/App.tsx; ../forge-npwd-garage/src/types.ts

### Imóveis: acesso, contas e segurança monitorada

O app separa imóveis próprios daqueles com acesso compartilhado. Detalhes têm contas, segurança, acessos e venda/transferência. Contas podem incluir luz, água, IPTU e segurança monitorada quando esses serviços existem. A segurança mostra alarme/monitoramento, incidentes e disponibilidade de câmeras; controles continuam sujeitos à capacidade e à revisão validadas pelo servidor. Acesso compartilhado não equivale a propriedade completa. A venda envia proposta ao comprador escolhido pelo serviço de imóveis, não altera dono pelo navegador. O widget oferece resumo e acesso ao app. Teste proprietário/visitante, câmera offline, revisão desatualizada e pagamento negado.

Implementação: ../forge-npwd-housing/src/App.tsx; ../forge-npwd-housing/src/views/PropertyDetailsPage.tsx

### Gestão: equipe, candidaturas e permissões

A gestão resolve a organização autorizada ao jogador, mostra membros/finanças e oferece contratação, demissão, mudança de cargo e análise de candidaturas por callbacks. Permissões suportam regras por cargo e sobrescritas por membro, com operação de restaurar. Selecionar jogador próximo facilita contratar, não autoriza administrar outra organização. Depósitos/saques são validados no servidor. O widget é resumo sob as mesmas permissões de trabalho/gestão. Confira funcionário/gestor, organizações distintas, alteração negada e atualização após mudança de equipe/finanças. Dados ilustrativos da prévia não devem virar registros reais.

Implementação: ../forge-npwd-management/src/App.tsx; ../forge-npwd-management/server/main.lua

### Clima e e-mail: informações dos providers

O clima reúne condição atual e previsão regional. Widgets independentes atualizam sem abrir o app e reagem ao provider. Diferencie clima da cidade de dados ilustrativos e do relógio de hora real local do exemplo. O correio integra entrega por cidadão; scripts devem usar a interface de servidor do resource, não inserir mensagens falsas não confiáveis no frontend. Serviço ausente deve indicar indisponibilidade, não informação inventada plausível. Inicie somente resources presentes na sua distribuição e confira manifesto, callbacks e ID antes de registrar o catálogo. O frontend compilado do mail não é template de desenvolvimento de fonte.

Implementação: ../forge-npwd-weather/src/widgets/WeatherWidgets.tsx; ../forge-npwd-mail/server/server.lua

<a id=compatibility></a>

## Compatibilidade com NPWD clássico

Uma camada isolada encaminha chamadas públicas antigas sem executar outro telefone.

### Instalar os adaptadores legados

compat/ contém aliases, catálogos e adaptação de eventos/callbacks recebidos. compat/resources contém modelos versionáveis; misc/install-compat.cjs instala no grupo irmão [forge-npwd-compat] sem sobrescrever adaptadores diferentes. Inicie o grupo depois dos providers Forge. O resource npwd desse grupo é proxy vazio, não o telefone original. Encaminha exports para forge-npwd com mesmos argumentos, retornos e handlers. Consumidores públicos antigos não precisam de segundo banco, NUI de telefone ou sessão.

**forge-npwd · install thin legacy aliases**

~~~text
node misc/install-compat.cjs
# Creates sibling [forge-npwd-compat], preserving existing differing files.
# Start canonical providers first, then the necessary alias resources.
# Do NOT start another original NPWD phone alongside Forge NPWD.
~~~

Implementação: compat/aliases.json; compat/proxy_client.lua; compat/proxy_server.lua

### Exemplos clássico e atual

exports.npwd:isPhoneVisible() e exports.npwd:sendNPWDMessage(...) passam pelo adaptador npwd. Código novo usa exports["forge-npwd"] e sendForgeNPWDMessage. O padrão clássico de app externo continua sendo resource que expõe ./config, app React e callbacks próprios. A fonte pode continuar chamada npwd.config.ts se a federação expõe corretamente. O loader Forge espera remoteEntry.js ESM/Vite: uma build Webpack/global-container legada não tem garantia de carregar sem adaptação e pode exigir recompilar com o template Forge.

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

Implementação: compat/aliases.json; apps/phone/src/common/hooks/useExternalApps.tsx

### Limites suportados e dados preservados

São cobertos aliases conhecidos, exports públicos, eventos registrados de entrada, callbacks NUI/URLs antigas, fallback de convars e IDs conhecidos salvos. Apps de terceiros não são renomeados cegamente. Observadores de eventos internos de saída não recebem espelhamento indiscriminado: migre listeners para os nomes atuais e evite efeitos duplicados. Nomes SQL npwd_* e forge_phone_* e chaves antigas de storage são intencionais. Não prometa compatibilidade automática de todo evento interno ou bundle histórico; teste os consumidores antigos reais.

Implementação: compat/names.ts; compat/client.ts; compat/server.ts; FORGE_NPWD_COMPAT.md

<a id=testing></a>

## Compilar, testar e publicar

Confira artefatos e casos multiplayer reais antes de distribuir uma release.

### Comandos de desenvolvimento

No exemplo: npm ci, npm run dev, npm run typecheck, npm test, npm run build e npm run preview. Preview serve o remoto compilado na porta 4173, correspondente ao loader de desenvolvimento; Vite dev sozinho não produz o entry de release da federação. No telefone, use workspace pnpm travado e scripts da raiz. Um app externo normalmente precisa de build própria e registro, não de editar e recompilar todo telefone. Inclua web/dist no pacote de release, mesmo ignorado no Git do exemplo.

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

### Matriz de testes na cidade

Teste itens novos/antigos, dois aparelhos no mesmo jogador, transferência, PIN correto/incorreto, trava após cinco falhas, bloqueio pelo proprietário com outro player usando, segunda via e inventário cheio. Teste instalar/remover app, páginas, arrastar/sobrepor, todos os tamanhos, duas instâncias e reabrir após restart. Em cada app sensível teste autorizado e não autorizado. Confira consumidor real de exports.npwd, voz, mídia e restart dos providers. Mocks e builds locais não certificam esses cenários multiplayer.

### Segurança da release e contribuições

Distribua frontend compilado, Lua/game code, manifestos, assets, exemplos de configuração, dependências e avisos originais. Não envie credenciais, tokens, registros pessoais, node_modules ou planejamento local. Mantenha IDs públicos estáveis e documente quebra intencional. Trave dependências compatíveis com o host e revise transitivas antigas antes de publicar; compatibilidade não significa que todas estejam atuais. Preserve dados e release anterior para rollback. Compilar localmente não exige commit nem publicação automática.

<a id=troubleshooting></a>

## Solução de problemas

Investigue disponibilidade, federação, callbacks e contexto do aparelho separadamente.

### Export ou app ausente

No such export isPhoneVisible in resource npwd costuma indicar consumidor antigo chamando resource ausente ou que não é o adaptador instalado. Confira forge-npwd iniciado, [forge-npwd-compat] instalado quando necessário e lado cliente/servidor correto. Se faltar app, confira pasta em apps, remoteEntry.js na raiz web/dist, módulo ./config e ícones como componentes. Se o catálogo mostra o app mas faltam ícone/widget, instale pela Forge Store e confira espaço no layout.

### Timeout, tela vazia ou widget desatualizado

Requisição NUI enviada para forge-npwd em vez do app não encontra o callback dele. Confira resource explícito na URL, nome do callback, registro no servidor e resposta única. Tela federada vazia pode indicar React/Router incompatíveis, chunks ausentes ou factory esperando settings não enviado. Em widget parado, confira timers/listeners, ocultação por permissão e provider. Não resolva travamento ignorando permissões do servidor. Use F8 e logs do servidor e reproduza a menor requisição que falha.

### Recuperação recusada ou dados alterados

DEVICE_MUST_BE_BLOCKED exige informar a perda antes. DEVICE_NOT_FOUND_OR_NOT_OWNED indica proprietário diferente ou ID inválido. Erro de inventário exige verificar capacidade, item e metadata; não repita emissão cegamente. A segunda via preserva PIN; senha esquecida não é apagada. Se transferir cria perfil vazio, confira metadata na transferência. Informe versão, resource, operação, esperado e logs sanitizados; não publique PIN ou conexão real.

<a id=credits></a>

## Créditos e escopo do projeto

Uma evolução Forge baseada no NPWD, preservando autoria original.

### Project Error / NPWD

NPWD foi criado pelo Project Error e seus colaboradores. Forge NPWD é um fork comunitário que amplia o telefone com aparelhos, segurança, recuperação, launcher, widgets e compatibilidade descritos aqui. Permanecem os créditos pelo telefone original, arte e contribuições. Este guia foi escrito para a implementação Forge, não copiado do site original. Consulte a documentação de origem como contexto histórico e compare com a fonte Forge atual antes de reutilizar uma receita antiga.

[Project Error documentation](https://projecterror.dev/docs/)

[Project Error / NPWD source](https://github.com/project-error/npwd)

### Distribuição e avisos de licença

Preserve LICENSE, autoria e licenças relevantes dos assets ao redistribuir o fork. A licença própria do exemplo está no repositório dele. O checkout conferido do telefone contém aviso GPL-3.0-or-later em LICENSE enquanto package.json da raiz carrega outro rótulo histórico; esta documentação não resolve a divergência. Os mantenedores devem harmonizar os avisos antes da release pública. Forge NPWD não é apresentado como release oficial do Project Error nem garantia de que todo provider funcione sem configuração.

Implementação: LICENSE; package.json

