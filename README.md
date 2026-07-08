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

## Como funciona a reunião

1. **Análises independentes** — cada conselheiro estuda a ideia pela ótica da sua especialidade: análise, estratégias, riscos, perguntas críticas e voto preliminar.
2. **Debate** (1, 2 ou 3 rodadas — ou **até consenso**) — cada um lê as posições dos colegas, rebate citando-os pelo nome e pode **mudar de voto**. No modo consenso, o debate se repete até todos votarem igual (máximo de 5 rodadas).
3. **Síntese** — a Presidente consolida: placar, consensos, divergências, riscos e um plano de ação para 7/30/90 dias.
4. **Entregáveis** (opcionais) — 📄 o **plano detalhado** em documento visual com download em PDF (análise de mercado, SWOT, cronograma, orçamento com gráficos, riscos), e 🚀 o **prompt de execução** autossuficiente para colar num agente de programação. O conselho decide; quem executa é você — ou seu agente.

### Treine cada conselheiro do seu jeito

Clique em qualquer conselheiro para ver a análise completa e **avaliar as respostas com 👍/👎** (com comentário opcional). O feedback muda o comportamento **apenas daquele agente** nas próximas reuniões — os aprendizados ficam na aba *Configuração* da gaveta, onde também dá para **editar a persona** (system prompt) dele diretamente.

Votos possíveis: ✅ Aprovar · ⚠️ Aprovar com ressalvas · ❌ Rejeitar.

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
