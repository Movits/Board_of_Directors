---
tipo: arquitetura
tags: [arquitetura]
---
# Orquestrador
`src/board/orchestrator.ts` — `conduzirReuniao()` dirige a [[Reunião]] inteira
emitindo eventos para a UI (`onFase`, `onRodada1`, `onDebate`, `onConsenso`,
`onDebateFalhou`, `onEntregavelErro`, `onConcluida`…).

- **Concorrência**: `emFila()` limita a 4 chamadas paralelas (rate limits).
- **Consenso**: `consensoPleno()` retorna `'aprovar' | 'rejeitar' | null` —
  unanimidade de ressalvas NÃO conta ([[Consenso Pleno]]). Avaliado antes de
  cada rodada e após a última; grava `consensoNaRodada` + `consensoVoto`.
  `votoDoConsenso()` deriva o voto em registros antigos (legado).
- **Falha isolada**: erro na análise marca só aquele membro; erro no
  [[Debate]] mantém a posição anterior e fica visível (`falhasDebate`).
- **[[Entregáveis]] não-fatais**: `gerarPlano()` e `gerarPromptExecucao()` são
  funções extraídas — a UI as reusa no "↻ Gerar novamente"; falha vira
  `onEntregavelErro`, nunca derruba a reunião.
- Teto do modo consenso: `MAX_RODADAS_CONSENSO = 5`.

## Relacionado
[[Visão Geral]] · [[Transporte]] · [[Reunião]]
