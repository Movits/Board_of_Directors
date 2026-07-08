---
tipo: arquitetura
tags: [arquitetura]
---
# Transporte
A interface que separa o [[Orquestrador]] dos [[Provedores]] — o
[[Modo Demonstração]] implementa a mesma interface, por isso ensaia o fluxo
inteiro de graça:

```ts
interface Transporte {
  estruturada({ system, user, schema, membroId, signal }): Promise<string>  // JSON validado
  streamada({ system, user, proposito, onDelta, signal }): Promise<string>  // texto corrido
}
```

- **Anthropic**: `output_config` com JSON Schema + thinking adaptativo +
  streaming; sem temperature/top_p.
- **OpenAI-compatível**: `response_format: json_schema` com `strict: true` —
  por isso TODO campo novo do schema precisa estar no `required`
  (ex.: `ressalvas_pendentes` no schema do [[Debate]]).
- **Fallback**: APIs personalizadas sem saída estruturada recebem instruções de
  JSON no prompt; o parse tolera campos ausentes (tipos TS opcionais).
- Erros de API são traduzidos para mensagens humanas antes de chegar à UI.

## Relacionado
[[Visão Geral]] · [[Provedores]]
