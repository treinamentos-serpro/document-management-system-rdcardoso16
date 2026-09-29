---
description: Gera testes para um módulo do frontend.
name: gerar-testes-frontend
agent: agent
---

# Gerar testes do frontend

Gere testes automatizados para o módulo `${input:modulo:caminho do modulo}` usando o runner nativo `node:test` e `node:assert`.

Requisitos:

- Cubra os casos de sucesso e de erro principais.
- Mantenha os testes isolados e legíveis.
- Coloque os testes em `frontend/test`.
- Não dependa de serviços externos. Use o filesystem local quando necessário.
