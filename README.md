# 🏛️ Board of Directors — Conselho de Administração de IA

Apresente uma ideia e um conselho de **13 conselheiros de IA** — cada um com expertise, personalidade e vieses próprios — analisa, propõe estratégias, **debate em rodadas** e **vota** na decisão. No final, a Presidente do Conselho consolida tudo em um veredito com plano de ação **e gera um prompt de execução detalhado, pronto para colar no Claude Code** e tirar a ideia do papel.

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
4. **Prompt de execução** (opcional) — o conselho transforma a decisão em um prompt autossuficiente e detalhado (contexto, escopo do MVP, fora de escopo, stack, UX, critérios de aceitação, riscos, passo a passo) para colar no **Claude Code**. O conselho decide; o Claude Code executa.

Votos possíveis: ✅ Aprovar · ⚠️ Aprovar com ressalvas · ❌ Rejeitar.

## Provedores de IA

A lista de modelos muda conforme o provedor escolhido em **Configurações**:

| Provedor | Modelos | Chave |
|---|---|---|
| **Claude (Anthropic)** — padrão | Opus 4.8 · Sonnet 5 · Haiku 4.5 | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **OpenAI (GPT / Codex)** | GPT-5.5 · GPT-5.4 · GPT-5.4 mini | [platform.openai.com](https://platform.openai.com/api-keys) |

Também há a opção **"Personalizado…"** para digitar o ID de qualquer modelo, e uma **Base URL personalizada** para APIs compatíveis com OpenAI (OpenRouter, Groq, Gemini, Ollama…) — desde que a API aceite chamadas do navegador (CORS).

## Para usar

1. Abra a app e vá em **Configurações**: escolha o provedor e cole sua chave de API. Recomendado: defina um **limite de gasto** na conta do provedor.
2. Escreva sua ideia, escolha os conselheiros, o modelo e as rodadas de debate.
3. Clique em **Convocar o Conselho**.

Sem chave, a app roda em **modo demonstração** (respostas simuladas, sem custo) para você conhecer a interface.

### Custos aproximados por reunião (12 conselheiros, 1 rodada de debate, com Claude)

| Modelo | Custo estimado |
|---|---|
| Claude Opus 4.8 (padrão, máxima qualidade) | ~US$ 1–2 |
| Claude Sonnet 5 (equilíbrio) | ~US$ 0,30–0,60 |
| Claude Haiku 4.5 (rápido e barato) | ~US$ 0,10 |

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
