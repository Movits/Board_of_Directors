---
tipo: conceito
tags: [conceito]
---
# Provedores
O app é **BYOK** (bring your own key): o usuário conecta a API que quiser e
paga preço de tabela do provedor, sem intermediário — as chaves ficam só no
[[Armazenamento Local]] e as chamadas vão do navegador direto ao provedor
(SDKs oficiais com `dangerouslyAllowBrowser`).

| Provedor | Modelos | Observação |
|---|---|---|
| **Anthropic (Claude)** | Sonnet 5 (padrão) · Opus 4.8 · Haiku 4.5 | saída estruturada via `output_config` |
| **OpenAI (GPT)** | GPT-5.5 · GPT-5.4 · GPT-5.4 mini | `json_schema` strict |
| **Personalizado** | qualquer API compatível com o protocolo OpenAI | Ollama local, LM Studio, OpenRouter, Groq… |

- O provedor Personalizado exige só a Base URL (chave opcional) e tem
  "🔎 Buscar modelos" para listar os modelos da própria API.
- Ollama local: `OLLAMA_ORIGINS='https://movits.github.io' ollama serve`
  (o curinga `'*'` só em testes — ressalva da [[Dra. Renata Lins]]).
- APIs sem saída estruturada caem para instruções de JSON no prompt
  ([[Transporte]]).

## Relacionado
[[Transporte]] · [[Armazenamento Local]] · [[Modo Demonstração]]
