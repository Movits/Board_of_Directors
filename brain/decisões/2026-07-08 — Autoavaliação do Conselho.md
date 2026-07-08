---
tipo: reuniao-conselho
data: 2026-07-08
demo: false
modo_consenso: true
consenso: legado
consenso_na_rodada: 0
placar_aprovar: 0
placar_ressalvas: 12
placar_rejeitar: 0
tags: [conselho/reuniao, decisao]
---
# 2026-07-08 — Autoavaliação do Conselho

> [!quote] Pauta
> Os próprios 13 agentes do app (rodando como agentes reais, modo debate até
> consenso) revisaram o Board of Directors inteiro: estrutura, visão, UI/UX,
> copy, jurídico, dados.

**Placar:** 0 ✅ · 12 ⚠️ · 0 ❌ — consenso já na 1ª rodada, sem debate.
**Nota histórica:** este placar contou como "consenso" pela regra antiga
(unanimidade de qualquer voto). Foi exatamente este caso que motivou a regra do
[[Consenso Pleno]]: 12 votos idênticos com ressalvas **não debatidas** — o
conformismo estrutural que o próprio [[Paulo Meirelles|CHRO]] criticou na
reunião.

## Veredito da Presidente
*"Aprovado com ressalvas, por unanimidade: o app tem fundação, alma e
honestidade raras — mas não deveria receber um único usuário novo antes de
parar de perder o dinheiro que esse usuário paga."* — [[Helena Vasquez]]

Condição final: antes de qualquer feature nova, corrigir as **três feridas do
primeiro uso** — a reunião paga que se perde, o funil demo→real que joga a
ideia fora e o campo Personalizado que trava o botão. *(As três foram
corrigidas na rodada 5 — ver [[Registro de Decisões]].)*

## O que o app já faz muito bem
1. **Privacidade por arquitetura** — estático, chaves no navegador, chamadas
   diretas, código aberto ([[Dra. Renata Lins]]: "melhor defesa jurídica
   possível").
2. **[[Modo Demonstração]] como test drive completo** — mesmo orquestrador do
   modo real, custo zero.
3. **Engenharia proporcional** — 4 dependências, ~5.500 linhas, PDF sem
   biblioteca ([[André Falcão]]: "anti-over-engineering").
4. **Transparência de custo no ponto de decisão** — preços nos cards, teto de
   rodadas, aviso de limite de gasto.
5. **Identidade "sala de conselho" sustentada de ponta a ponta**
   ([[Yuri Almeida]] e [[Clara Nunes]]: "o app tem alma").
6. **[[Feedback Local]]** — "RLHF caseiro funcional" ([[Tiago Freitas]]).

## Os 10 problemas apontados (e o status)
1. **Perda total da reunião paga** (6 conselheiros) — `gravaReuniao` só em
   `onConcluida`; falha na última chamada evaporava US$1–2. ✅ *Corrigido:
   entregáveis não-fatais + "Gerar novamente" + upsert no histórico.*
2. **Funil demo→real quebrado** ([[Beatriz Rocha]], [[Sofia Carvalho]],
   [[Marina Duarte]], [[Tiago Freitas]]) — ✅ *rascunho persistido e home em
   dois estados;* 🔜 *cartão pós-demo e teste de chave no [[Backlog]].*
3. **Custo estimado, nunca medido + default Opus** ([[Ricardo Tanaka]],
   [[Larissa Fontes]]) — ✅ *estimativa dinâmica de chamadas e default Sonnet;*
   🔜 *medidor de custo real via `usage` no [[Backlog]].*
4. **Falhas silenciosas** — ✅ *falha de debate visível (selo ⚠ + nota);*
   🔜 *QuotaExceeded e checkpoint incremental no [[Backlog]].*
5. **Bug do "Personalizado…"** ([[André Falcão]] achou a causa raiz no CSS) —
   ✅ *corrigido.*
6. **Acessibilidade e mobile** ([[Yuri Almeida]]) — ✅ *kit de acessibilidade +
   documento responsivo.*
7. **Exposição jurídica** ([[Dra. Renata Lins]]) — ✅ *Sobre & privacidade,
   LICENSE MIT, disclaimer na capa do PDF, OLLAMA_ORIGINS restrito.*
8. **Zero testes e zero medição** ([[André Falcão]], [[Larissa Fontes]]) —
   🔜 *[[Backlog]].*
9. **Copy que promete mais do que entrega** ([[Clara Nunes]]) — ✅ *CTA com
   motivo, "Salvar em PDF", hero reconciliado, aba "Persona".*
10. **Desenho organizacional do conselho** ([[Paulo Meirelles]]) — ✅ *virou o
    [[Consenso Pleno]] (rodada 6) + feedback bloqueado no demo.*

## Como cada conselheiro votou
Todos ⚠️ Aprovar com ressalvas — os destaques individuais estão na nota de cada
um: [[Ricardo Tanaka]] · [[Marina Duarte]] · [[André Falcão]] ·
[[Beatriz Rocha]] · [[Yuri Almeida]] · [[Clara Nunes]] · [[Paulo Meirelles]] ·
[[Sofia Carvalho]] · [[Dra. Renata Lins]] · [[Jorge Batista]] ·
[[Larissa Fontes]] · [[Tiago Freitas]]

## Divergências registradas
- **Privacidade vs. medição** — convergiu para telemetria opt-in sem dados
  pessoais + contadores locais ([[Backlog]]).
- **Default caro vs. qualidade máxima** — Sonnet venceu: "churn por susto na
  fatura mata mais que uma análise um degrau menos brilhante".
- **Simplicidade vs. poder** — o poder deve existir "na segunda reunião, não na
  primeira" (home em dois estados).
- **Sobre nós mesmos** — 12 votos idênticos podem ser conformismo; a crítica
  permaneceu de pé e virou a regra do [[Consenso Pleno]].

> A ata integral (115 KB, com as 12 análises completas) foi entregue ao dono do
> conselho fora do repositório.

## Relacionado
[[Registro de Decisões]] · [[Backlog]] · [[Início]]
