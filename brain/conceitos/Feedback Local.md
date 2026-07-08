---
tipo: conceito
tags: [conceito]
---
# Feedback Local
O dono do conselho avalia respostas individuais com **👍/👎** (+ comentário
opcional) na gaveta de cada conselheiro. O feedback muda o comportamento
**apenas daquele agente**: entra como apêndice no system prompt dele
(`personaEfetiva()`), nunca no dos outros.

- Máximo de 10 avaliações por membro (as mais novas empurram as antigas).
- Listadas na aba "🎭 Persona" da gaveta, onde podem ser removidas uma a uma.
- **Desativado no [[Modo Demonstração]]** — respostas simuladas não devem
  treinar o agente (ressalva do [[Paulo Meirelles|CHRO]]: "evidência
  contaminada no prontuário").

[[Tiago Freitas]] chamou o mecanismo de "RLHF caseiro funcional": transparente,
reversível e escopado. As personas base também são editáveis (aba Persona ou
Configurações → Personas).

## Relacionado
[[Início]] · [[Armazenamento Local]]
