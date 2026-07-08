---
tipo: arquitetura
tags: [arquitetura]
---
# Armazenamento Local
Tudo vive no `localStorage` do navegador (`src/lib/storage.ts`) — nada sai da
máquina do usuário. Para apagar: limpar os dados do site.

| Chave | Conteúdo |
|---|---|
| `bod.provedor` | Provedor ativo ([[Provedores]]) |
| `bod.chavesApi` | Chaves de API, uma por provedor |
| `bod.modelos` / `bod.baseUrls` / `bod.modelosDescobertos` | Config por provedor |
| `bod.personas` | Overrides de persona por conselheiro |
| `bod.feedback` | [[Feedback Local]] (máx. 10 por membro) |
| `bod.historico` | Últimas 20 reuniões (upsert por id — "Gerar novamente" não duplica) |
| `bod.rascunhoIdeia` | Rascunho da ideia (sobrevive à navegação) |
| `bod.seedDemo` | Semente do [[Modo Demonstração]] (só para testes) |

Pontos conhecidos (ver [[Backlog]]): sem versionamento de schema, e `grava()`
engole `QuotaExceededError` — a perda silenciosa apontada pela
[[Larissa Fontes|Head de Dados]]. Migrações de chaves legadas já existem
(chave/modelo/baseUrl únicos → mapas por provedor).

## Relacionado
[[Visão Geral]] · [[Feedback Local]]
