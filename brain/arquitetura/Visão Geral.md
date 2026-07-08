---
tipo: arquitetura
tags: [arquitetura]
---
# Visão Geral
SPA **React 18 + TypeScript + Vite**, 100% estática, publicada no GitHub Pages
por Actions a cada push. **Sem backend**: privacidade por arquitetura, não por
promessa — chaves e dados vivem no [[Armazenamento Local]] e as chamadas de IA
vão direto do navegador ao provedor ([[Provedores]]).

Números da autoavaliação: 4 dependências de runtime, ~5.500 linhas — "o
anti-over-engineering" ([[André Falcão|CTO]]).

## Mapa do código

| Caminho | O quê |
|---|---|
| `src/board/members.ts` | As 13 personas (system prompts) |
| `src/board/orchestrator.ts` | [[Orquestrador]] — o fluxo da [[Reunião]] |
| `src/board/prompts.ts` | Prompts de análise, [[Debate]], síntese e entregáveis |
| `src/board/schemas.ts` | JSON Schemas da saída estruturada |
| `src/board/demo.ts` | [[Modo Demonstração]] |
| `src/api/` | [[Transporte]] Anthropic / OpenAI-compatível |
| `src/lib/storage.ts` | [[Armazenamento Local]] |
| `src/lib/exportar.ts` | Exports: Markdown, JSON e ata Obsidian (🧠) |
| `src/components/` | Telas e painéis (sala, gaveta, documento do plano…) |
| `brain/` | Este vault |

## Relacionado
[[Início]] · [[Registro de Decisões]]
