---
name: board-of-directors
description: >-
  Convoca o Conselho de Administração de IA (13 conselheiros) para analisar,
  debater e votar uma ideia ou projeto — e entregar veredito, plano e próximos
  passos. Roda no seu plano do Claude Code, sem gastar créditos de API. Use
  quando o usuário pedir "reunião do conselho", "board of directors", analisar
  uma ideia de negócio por múltiplas óticas, ou aperfeiçoar um projeto com
  feedback de um conselho.
---

# Reunião do Conselho de Administração

Você vai **convocar e conduzir** uma reunião de um conselho de administração de
IA sobre a ideia/projeto que o usuário trouxer (em `$ARGUMENTS`, ou peça a ele).

## Personas

Os 13 conselheiros (nome, cargo e system prompt de cada um) estão em
[`src/board/members.ts`](../../../src/board/members.ts) deste repositório —
**leia esse arquivo** e assuma fielmente a persona de cada conselheiro. A
Presidente Helena Vasquez conduz a síntese; os outros 12 votam.

## Como conduzir

1. **Análises independentes (em paralelo).** Despache **subagentes em paralelo**,
   um por conselheiro votante, cada um com a persona correspondente. Cada análise
   tem: análise (2–4 parágrafos), 3–5 estratégias, 2–4 riscos, 1–3 perguntas
   críticas e um voto (✅ Aprovar / ⚠️ Aprovar com ressalvas / ❌ Rejeitar) com
   justificativa.
2. **Debate.** Pergunte ao usuário: rodadas fixas (1–3) ou **até consenso pleno**.
   No consenso, o debate só encerra quando todos votam Aprovar ou todos Rejeitar
   — "com ressalvas" vira condição concreta a ser resolvida, sem ceder por
   conformismo.
3. **Síntese da Presidente.** Consolide placar, consensos, divergências, riscos e
   um plano de ação para 7/30/90 dias.
4. **Entregáveis.** Um plano de negócio detalhado e, se for projeto de código,
   ofereça **implementar direto no repositório** (você é o Claude Code) — ou um
   prompt de execução, se o usuário preferir revisar antes.

Responda sempre em **português do Brasil**. Se o usuário anexar imagens, PDFs ou
apontar um repositório, leve-os na análise.

> Este skill espelha o app **Board of Directors**
> (https://movits.github.io/Board_of_Directors/). Diferença: aqui roda no seu
> plano do Claude Code, sem API — e o conselho pode ler o repositório de verdade
> e executar.
