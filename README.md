# 🏛️ Board of Directors — Conselho de Administração de IA

Apresente uma ideia e um conselho de **13 conselheiros de IA** — cada um com expertise, personalidade e vieses próprios — analisa, propõe estratégias, **debate em rodadas** e **vota** na decisão. No final, a Presidente do Conselho consolida tudo em um veredito e entrega:

- 📄 um **plano detalhado em documento visual** (análise de mercado, SWOT, cronograma, orçamento com gráficos, riscos) com **download em PDF** — para você avaliar antes de executar qualquer coisa;
- 🚀 um **prompt de execução** pronto para colar no seu agente de programação preferido (Claude Code, Codex, Cursor…).

**App:** `https://movits.github.io/Board_of_Directors/`

## Os conselheiros

| | Conselheiro | Área |
|---|---|---|
| 🏛️ | Helena Vasquez | Presidente do Conselho (síntese final) |
| 💰 | Ricardo Tanaka | CFO / Investidor |
| 📣 | Marina Duarte | CMO / Marketing |
| ⚙️ | André Falcão | CTO / Engenharia |
| 🎯 | Beatriz Rocha | CPO / Produto |
| 🎨 | Yuri Almeida | Head de Design |
| ✍️ | Clara Nunes | Copywriter Chefe |
| 🤝 | Paulo Meirelles | CHRO / Recursos Humanos |
| 📈 | Sofia Carvalho | VP de Vendas |
| ⚖️ | Dra. Renata Lins | Jurídico / Compliance |
| 🔧 | Jorge Batista | COO / Operações |
| 📊 | Larissa Fontes | Head de Dados / Analytics |
| 💬 | Tiago Freitas | Head de Sucesso do Cliente |

Todas as personas são **editáveis** em *Configurações → Personas dos conselheiros*.

## Projetos — sua mini empresa

Cada ideia apresentada vira um **projeto**, e o conselho trabalha nele **reunião após reunião**:

- **Pitch rico** — além do texto, anexe **imagens, PDFs e arquivos de texto** (identidade visual, mockups, pesquisa), **conecte um repositório do GitHub** ou **analise uma pasta local do seu computador** (para projetos ainda não publicados — o navegador lê o código aí mesmo). Nos três casos os conselheiros recebem um digest do código (árvore de arquivos, README, dependências, trechos) e analisam o estado REAL do projeto. A pasta local só sai do navegador ao ir para o provedor de IA na análise — e com *Rodar no Claude Code*, nem isso.
- **Reuniões de acompanhamento** — na aba **Projetos**, abra um projeto e convoque a equipe de novo com uma **pauta** ("o que mudou, o que quero de vocês agora"). Os conselheiros recebem a ideia, os materiais, o repositório e o resumo da reunião anterior — e focam em **aperfeiçoar** o projeto, não só aprovar/rejeitar.
- Anexos: até 5 arquivos (~3 MB no total, imagens são comprimidas automaticamente). PDFs são lidos nativamente pelo provedor Claude; nos demais provedores, envie imagens ou texto.

## Como funciona a reunião

1. **Análises independentes** — cada conselheiro estuda a ideia pela ótica da sua especialidade: análise, estratégias, riscos, perguntas críticas e voto preliminar.
2. **Debate** (1, 2 ou 3 rodadas — ou **até consenso pleno**) — cada um lê as posições dos colegas, rebate citando-os pelo nome e pode **mudar de voto**. No modo consenso, a reunião só encerra quando **todos votarem Aprovar ou todos votarem Rejeitar**: ressalvas não encerram — viram **condições declaradas** (`ressalvas pendentes`) que os colegas precisam aceitar, resolver ou rebater, rodada após rodada (máximo de 5). Quem rejeita explica o que o faria mudar de voto, e ninguém deve ceder por conformismo.
3. **Síntese** — a Presidente consolida: placar, consensos, divergências, riscos e um plano de ação para 7/30/90 dias.
4. **Entregáveis** (opcionais) — 📄 o **plano detalhado** em documento visual com download em PDF (análise de mercado, SWOT, cronograma, orçamento com gráficos, riscos), e 🚀 o **prompt de execução** autossuficiente para colar num agente de programação. O conselho decide; quem executa é você — ou seu agente.

### Treine cada conselheiro do seu jeito

Clique em qualquer conselheiro para ver a análise completa e **avaliar as respostas com 👍/👎** (com comentário opcional). O feedback muda o comportamento **apenas daquele agente** nas próximas reuniões — os aprendizados ficam na aba *Configuração* da gaveta, onde também dá para **editar a persona** (system prompt) dele diretamente.

Votos possíveis: ✅ Aprovar · ⚠️ Aprovar com ressalvas · ❌ Rejeitar.

## Second brain (`brain/`) — o cérebro do projeto no Obsidian

A pasta [`brain/`](brain) é um **vault do Obsidian**: notas interconectadas sobre os conselheiros, os conceitos (reunião, debate, consenso pleno…), a arquitetura e as decisões do projeto.

Para ter o vault no seu computador (escolha um caminho):

1. **Pelo app** (mais fácil): rodapé → *sobre & privacidade* → **⬇︎ Baixar o vault (brain.zip)** → extraia e abra a pasta `brain` no Obsidian com *Open folder as vault*;
2. **Pelo GitHub**: botão verde **Code → Download ZIP** (a pasta `brain/` vem dentro do zip do repositório);
3. **Com git**: `git clone` do repositório — o vault fica sempre atualizado com `git pull`.

Toda reunião concluída tem o botão **🧠 Exportar ata (Obsidian)** (no veredito e no Histórico): baixa a ata como `.md` com frontmatter e `[[wikilinks]]` para os conselheiros — solte o arquivo em `brain/reuniões/` e a reunião entra no grafo do seu second brain.

## Provedores de IA — use a API que quiser

A lista de modelos muda conforme o provedor escolhido em **Configurações**:

| Provedor | Modelos | Chave |
|---|---|---|
| **Claude (Anthropic)** — padrão | Sonnet 5 (padrão) · Opus 4.8 · Haiku 4.5 | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **OpenAI (GPT / Codex)** | GPT-5.5 · GPT-5.4 · GPT-5.4 mini | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Personalizado — qualquer API** | os da sua API (botão "Buscar modelos") | opcional para APIs locais |

O provedor **Personalizado** conecta qualquer API compatível com o protocolo da OpenAI — **Ollama local**, LM Studio, OpenRouter, Groq, Gemini, Mistral, vLLM… Basta informar a **Base URL** (há atalhos prontos), opcionalmente a chave, e usar o botão **"🔎 Buscar modelos"** para listar os modelos disponíveis na própria API. Para APIs que não suportam saída estruturada, a app cai automaticamente para instruções de JSON no prompt.

> **Ollama local:** inicie com `OLLAMA_ORIGINS='https://movits.github.io' ollama serve` (libera o CORS só para o app) e use a Base URL `http://localhost:11434/v1`. Funciona direto no Chrome mesmo com o site em HTTPS, pois `localhost` é considerado seguro. O curinga `OLLAMA_ORIGINS='*'` também funciona, mas libera a API para qualquer site — prefira-o apenas em testes.

## Para usar

1. Abra a app e vá em **Configurações**: escolha o provedor e cole sua chave de API. Recomendado: defina um **limite de gasto** na conta do provedor.
2. Escreva sua ideia, escolha os conselheiros, o modelo e as rodadas de debate.
3. Clique em **Convocar o Conselho**.

Sem chave, a app roda em **modo demonstração** (respostas simuladas, sem custo) para você conhecer a interface.

### Custos aproximados por reunião (12 conselheiros, 1 rodada de debate, com Claude)

| Modelo | Custo estimado |
|---|---|
| Claude Sonnet 5 (padrão — equilíbrio custo/qualidade) | ~US$ 0,30–0,60 |
| Claude Opus 4.8 (máxima qualidade) | ~US$ 1–2 |
| Claude Haiku 4.5 (rápido e barato) | ~US$ 0,10 |

A tela inicial mostra, antes de convocar, **quantas chamadas de IA** a configuração escolhida fará.

O modo "até consenso" pode multiplicar o custo (até 5 rodadas de debate). O prompt de execução adiciona ~1 chamada longa ao final.

## Rodar no Claude Code — usa o seu plano Pro/Max, sem gastar API

Já assina o Claude (Pro/Max) e não quer pagar API? Na tela inicial (e na página do projeto) há o botão **🖥 Rodar no Claude Code**: ele gera um **briefing pronto** para colar numa sessão do [Claude Code](https://claude.com/claude-code). O Claude Code convoca os 13 conselheiros (subagentes em paralelo), debate, vota e entrega veredito + plano + próximos passos — **rodando no seu plano, custo de API zero**. Se for projeto de código, ele lê o repositório de verdade e pode **implementar na hora**.

Quem clona este repositório ganha também o **skill** `board-of-directors` (em `.claude/skills/`): rode `/board-of-directors "sua ideia"` dentro do Claude Code.

> **Por que não conectar o app direto ao Claude Code?** A Anthropic **não permite** apps de terceiros usarem a autenticação da assinatura (claude.ai/Max) — e um navegador em `https://` não consegue falar com uma ponte local em `http://localhost` (bloqueio de conteúdo misto). Por isso o caminho é rodar dentro do próprio Claude Code.

### Assinatura do claude.ai ≠ créditos de API

A API da Anthropic (console.anthropic.com) usa **créditos próprios, pagos por consumo** — ela é separada da assinatura do claude.ai (Pro/Max) e **não consome o limite do seu plano**. Para rodar no app com custo mínimo: compre um valor pequeno de créditos (ex.: US$5), defina limite de gasto e use **Sonnet ou Haiku**. Para custo **zero** usando seu plano, veja *Rodar no Claude Code* acima.

### Segurança da chave

As chaves ficam **somente no `localStorage` do seu navegador** e são enviadas **diretamente** à API do provedor (`dangerouslyAllowBrowser` dos SDKs oficiais). Nenhum outro servidor as recebe. Ainda assim: não use em computadores compartilhados e prefira chaves dedicadas com limite de gasto.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm run build    # build de produção em dist/
```

Stack: React + TypeScript + Vite + [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) + [`openai`](https://github.com/openai/openai-node). Sem backend.

## Deploy (GitHub Pages)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) faz build e publica no GitHub Pages a cada push na `main` (ou manualmente via *Actions → Run workflow*).

> **Ativação necessária (uma vez):** no repositório, vá em **Settings → Pages → Build and deployment → Source** e selecione **GitHub Actions**.

## Licença

[MIT](LICENSE). Todo o conteúdo produzido pelo conselho é **gerado por IA e pode conter erros** — valide números e decisões de forma independente. Detalhes em *sobre & privacidade* dentro do app.
