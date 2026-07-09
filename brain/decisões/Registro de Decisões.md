---
tipo: decisao
tags: [decisao]
---
# Registro de Decisões
Linha do tempo das rodadas de desenvolvimento, com as decisões que moldaram o
produto.

## Rodada 1 — fundação
- App web estático (GitHub Pages), 13 conselheiros com personas próprias,
  debate em rodadas, votos e síntese da Presidente ([[Visão Geral]]).
- BYOK: chave só no navegador, chamadas diretas ao provedor.

## Rodada 2 — provedores e consenso
- Lista de modelos muda conforme o provedor ([[Provedores]]).
- 3ª rodada de debate + modo "até consenso" (na época: todos votarem igual).
- Prompt de execução como entregável — o conselho decide, não executa.

## Rodada 3 — qualquer API
- Provedor Personalizado: qualquer API compatível com o protocolo OpenAI
  (Ollama local, LM Studio, OpenRouter…), com descoberta de modelos.

## Rodada 4 — agentes inspecionáveis e plano em PDF
- Gaveta por conselheiro com [[Feedback Local]] (👍/👎 muda só aquele agente).
- Plano detalhado como documento visual com PDF via impressão ([[Entregáveis]]).
- Copy neutro (sem citar provedores no texto geral).

## Rodada 5 — autoavaliação e quick wins (2026-07-08)
- Os próprios 13 agentes revisaram o app:
  [[2026-07-08 — Autoavaliação do Conselho]] (12×aprovar com ressalvas).
- Implementados os 9 quick wins: entregáveis não-fatais + "Gerar novamente",
  correção do "Personalizado…", estimativa de chamadas, default Sonnet,
  rascunho persistido, falhas de debate visíveis, kit de acessibilidade,
  pacote jurídico (Sobre & privacidade + LICENSE MIT), texto a limpo.
- Home em dois estados: sem API, só o botão "Conectar uma API de IA".

## Rodada 10 — o conselho revisa a si mesmo, 26 melhorias (2026-07-09)
- Os 12 conselheiros leram o **código real** do app e entregaram um backlog de
  26 melhorias priorizadas; todas foram implementadas em 5 ondas de agentes
  paralelos (arquivos disjuntos), com build + testes + Playwright entre elas.
- **Confiança** (a Presidente: "é o que separa o app de premium"): demo
  coerente (placar = veredito, sem `[DEMO]` na prosa, 1 dissenso persistente);
  **checkpoint** da síntese (falha não descarta análises/debate já pagos);
  `ErrorBoundary` com escape hatch; filtro **anti-segredo** no digest de código.
- **Debate melhor**: dissenso estrutural no prompt base ([[Debate]]),
  contexto enxuto na rodada 2+, frase-síntese citável por conselheiro, personas
  com voz/vieses/postura de voto próprios ([[conselho/Início|conselho]]).
- **Ativação**: home enxuta (progressive disclosure) + "Ver reunião de exemplo"
  em 1 clique; medidor de **custo real** ("esta reunião custou ~US$X"); teto de
  gasto; avisos de saída de dados; acessibilidade (aria-live, reduced-motion).
- **Painel do Conselho**: analytics 100% local (M1/M2/M3, votos, custo) +
  diagnóstico anônimo opt-in. **Rede de testes** (vitest) das funções de placar.
- **Code-split**: SDKs sob `import()` dinâmico — bundle inicial 582 KB → 213 KB.

## Rodada 9 — pasta local (projeto não publicado) (2026-07-08)
- **Pasta local**: além do repositório do GitHub, dá para escolher uma pasta do
  computador (projeto ainda não publicado). O navegador lê os arquivos ali mesmo
  (`webkitdirectory`), monta um digest (árvore + README + trechos de código) e o
  conselho analisa — sem servidor, sem publicar nada. Disponível no pitch novo
  ([[Projetos|IdeaForm]]) e ao continuar um projeto ([[Projetos|ProjectPage]]).
- **Segredos protegidos**: só arquivos de código/README têm o conteúdo lido; um
  `.env` aparece na árvore, mas o valor secreto nunca entra no digest. O digest
  é limitado (~48 KB) para caber no armazenamento local; entra no mesmo lugar do
  repo no contexto da reunião ([[Armazenamento Local]]).

## Rodada 8 — rodar no plano do Claude Code (2026-07-08)
- **[[Rodar no Claude Code]]**: botão que gera um briefing pronto (13 personas +
  ideia + anexos + repo) para colar no Claude Code — o conselho roda no plano
  Pro/Max do usuário, sem gastar API; skill `board-of-directors` no repo.
- Motivo: a Anthropic proíbe apps de terceiros usarem a auth da assinatura, e o
  navegador bloqueia https→localhost — então o caminho é rodar dentro do
  próprio Claude Code. Notas corrigidas em Configurações, About e README.

## Rodada 7 — pitch rico e projetos contínuos (2026-07-08)
- **[[Projetos]]**: o Histórico virou Projetos — cada ideia vira um projeto com
  reuniões de acompanhamento (pauta + resumo da reunião anterior no contexto);
  a persona base dos conselheiros passou a mirar em APERFEIÇOAR o projeto.
- **Pitch rico**: anexos no pitch (imagens comprimidas no navegador, PDF nativo
  no provedor Claude, textos inline) e repositório do GitHub conectado (digest
  com árvore, README e dependências lido direto do navegador).
- Nota "assinatura ≠ API" nas Configurações e no README (créditos da API são
  separados do plano Pro/Max do claude.ai).

## Rodada 6 — consenso pleno e second brain (2026-07-08)
- **[[Consenso Pleno]]**: ressalvas nunca encerram o modo consenso; consenso =
  todos Aprovar OU todos Rejeitar; `ressalvas_pendentes` declaradas e debatidas;
  registros antigos viram "legado". Motivada pela crítica de conformismo do
  [[Paulo Meirelles|CHRO]] e por pedido do dono.
- **Second brain**: esta pasta `brain/` como vault do Obsidian + botão
  "🧠 Exportar ata (Obsidian)" no app.

## Relacionado
[[Início]] · [[Backlog]]
