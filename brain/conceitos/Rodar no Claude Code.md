---
tipo: conceito
tags: [conceito]
---
# Rodar no Claude Code
Caminho para rodar o conselho **usando o plano Pro/Max do Claude**, sem gastar
créditos de [[Provedores|API]]. O botão **🖥 Rodar no Claude Code** (na tela
inicial e na página do [[Projetos|projeto]]) gera um **briefing autossuficiente**
— as 13 personas + a ideia + os anexos de texto + o digest do repositório — para
colar numa sessão do Claude Code. Lá, o Claude Code convoca o conselho
(subagentes em paralelo), debate, vota e entrega os [[Entregáveis]]; se for
projeto de código, lê o repositório real e pode **implementar na hora**.

Quem clona o repositório tem também o **skill** `board-of-directors`
(`.claude/skills/`), que roda o mesmo fluxo lendo as personas de `members.ts`.

## Por que não conectar o app direto?
- A **Anthropic proíbe** apps de terceiros usarem a autenticação da assinatura
  (claude.ai/Max) — desde jun/2026 há um credit pool pago à parte para o Agent
  SDK; usar o token da assinatura num app de terceiros arrisca a conta.
- Um navegador em `https://` **não fala** com uma ponte local em
  `http://localhost` (bloqueio de conteúdo misto) — nem CORS resolve.

Logo, o [[Armazenamento Local|app]] usa API (créditos próprios) para rodar a
reunião *dentro* dele; o plano da assinatura é usado *dentro do Claude Code*.

## Relacionado
[[Início]] · [[Entregáveis]] · [[Provedores]] · [[Projetos]]
