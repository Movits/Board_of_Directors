# 🏛️ Board of Directors — Conselho de Administração de IA

Apresente uma ideia e um conselho de **13 conselheiros de IA** — cada um com expertise, personalidade e vieses próprios — analisa, propõe estratégias, **debate em rodadas** e **vota** na decisão. No final, a Presidente do Conselho consolida tudo em um veredito com plano de ação.

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
2. **Debate** (1 ou 2 rodadas) — cada um lê as posições dos colegas, rebate citando-os pelo nome e pode **mudar de voto**.
3. **Síntese** — a Presidente consolida: placar, consensos, divergências, riscos e um plano de ação para 7/30/90 dias.

Votos possíveis: ✅ Aprovar · ⚠️ Aprovar com ressalvas · ❌ Rejeitar.

## Para usar

1. Abra a app e vá em **Configurações**.
2. Cole sua **chave de API da Anthropic** — crie uma em [console.anthropic.com](https://console.anthropic.com/settings/keys). Recomendado: defina um **limite de gasto** na conta.
3. Escreva sua ideia, escolha os conselheiros e clique em **Convocar o Conselho**.

Sem chave, a app roda em **modo demonstração** (respostas simuladas, sem custo) para você conhecer a interface.

### Custos aproximados por reunião (12 conselheiros, 1 rodada de debate)

| Modelo | Custo estimado |
|---|---|
| Claude Opus 4.8 (padrão, máxima qualidade) | ~US$ 1–2 |
| Claude Sonnet 5 (equilíbrio) | ~US$ 0,30–0,60 |
| Claude Haiku 4.5 (rápido e barato) | ~US$ 0,10 |

### Segurança da chave

A chave fica **somente no `localStorage` do seu navegador** e é enviada **diretamente** à API da Anthropic (`dangerouslyAllowBrowser` do SDK oficial). Nenhum outro servidor a recebe. Ainda assim: não use em computadores compartilhados e prefira uma chave dedicada com limite de gasto.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm run build    # build de produção em dist/
```

Stack: React + TypeScript + Vite + [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript). Sem backend.

## Deploy (GitHub Pages)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) faz build e publica no GitHub Pages a cada push na `main` (ou manualmente via *Actions → Run workflow*).

> **Ativação necessária (uma vez):** no repositório, vá em **Settings → Pages → Build and deployment → Source** e selecione **GitHub Actions**.
