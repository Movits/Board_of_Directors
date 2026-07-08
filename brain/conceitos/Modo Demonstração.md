---
tipo: conceito
tags: [conceito]
---
# Modo Demonstração
Reunião completa **sem chamar nenhuma API** — custo zero. Usa o MESMO
[[Orquestrador]] do modo real; só troca a camada de [[Transporte]] por
respostas pré-escritas com votos sorteados (pool ponderado: ~1/3 aprovar, ~1/2
com ressalvas, ~1/6 rejeitar).

- É o padrão quando nenhuma API está conectada (a home mostra só o botão
  "🔌 Conectar uma API de IA").
- No [[Debate]], os votos convergem gradualmente para **Aprovar** (chances
  0.25 → 0.7 → 0.95 por rodada), simulando ressalvas sendo resolvidas — assim o
  [[Consenso Pleno]] também é demonstrável.
- [[Feedback Local]] fica desativado (respostas simuladas não treinam agente).
- Para testes automatizados: a chave `bod.seedDemo` no localStorage torna o
  sorteio determinístico (PRNG mulberry32).

O conselho vê o demo como o melhor ativo comercial do produto — e o
[[Backlog]] guarda a ideia de transformá-lo em "trailer" com ideias-exemplo
escritas à mão ([[Marina Duarte|CMO]]).

## Relacionado
[[Reunião]] · [[Provedores]]
