# 🧠 SERENVIA

### Plataforma Demonstrativa de Agendamento Psicológico

**Projeto desenvolvido por AW TECHNOLOGY**

O SERENVIA é uma plataforma web demonstrativa desenvolvida para simular o gerenciamento de consultas psicológicas online.

O sistema oferece ambientes específicos para pacientes, psicólogos e administradores, permitindo organizar agendamentos, acompanhar consultas e gerenciar cadastros profissionais.

> **Aviso:** este é um projeto demonstrativo, desenvolvido para fins de estudo e portfólio. Todos os usuários e atendimentos utilizados na demonstração são fictícios. A plataforma não oferece atendimento psicológico real.

---

## 🚀 Funcionalidades

### 👤 Área do Paciente

- Cadastro e autenticação.
- Visualização de psicólogos disponíveis.
- Agendamento de consultas.
- Consulta de horários disponíveis.
- Reagendamento.
- Cancelamento.
- Acompanhamento do status das consultas.
- Histórico de atendimentos.

### 🧑‍⚕️ Área do Psicólogo

- Cadastro profissional.
- Gerenciamento do perfil.
- Configuração de disponibilidade.
- Visualização de agendamentos.
- Confirmação de consultas.
- Cancelamento de consultas.
- Registro de conclusão de atendimentos.
- Histórico de consultas.

### 🛡️ Área Administrativa

- Acesso administrativo.
- Visualização de cadastros profissionais.
- Análise e aprovação de psicólogos.
- Acompanhamento de registros de auditoria.

---

## 🛠️ Tecnologias Utilizadas

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM

### Banco de Dados

- PostgreSQL
- Neon

### Controle de Versão

- Git
- GitHub

---

## 🏗️ Estrutura do Projeto

```text
serenvia/
├── backend/
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── server.ts
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   └── app/
│   │       ├── admin/
│   │       ├── cadastro/
│   │       ├── login/
│   │       ├── paciente/
│   │       └── psicologo/
│   └── package.json
│
└── README.md
```

---

## 🔐 Autenticação e Controle de Acesso

O sistema utiliza autenticação baseada em JWT e separação de permissões por perfil de usuário.

Os ambientes são organizados conforme as responsabilidades de pacientes, psicólogos e administradores.

**Observação:** os mecanismos implementados são demonstrativos e não representam certificação de segurança para utilização em ambiente clínico real.

---

## 📅 Gerenciamento de Consultas

O sistema permite acompanhar diferentes situações dos agendamentos:

- Pendente
- Confirmado
- Cancelado
- Concluído

Os horários disponíveis são atualizados conforme os agendamentos realizados, cancelados ou reagendados.

---

## 📸 Demonstração

### 🏠 Página Inicial

![Página inicial da plataforma SERENVIA](docs/screenshots/serenvia-home.png)

*Interface inicial do SERENVIA — plataforma demonstrativa desenvolvida pela AW TECHNOLOGY.*

### 🔐 Tela de Login

![Tela de login da plataforma SERENVIA](docs/screenshots/serenvia-login.png)

*Interface de autenticação do SERENVIA, com acesso à plataforma.*

### 📝 Tela de Cadastro

![Tela de cadastro da plataforma SERENVIA](docs/screenshots/serenvia-cadastro.png)

*Interface de cadastro do SERENVIA, para criação de conta na plataforma.*

### 👤 Painel do Paciente

![Painel do paciente da plataforma SERENVIA](docs/screenshots/serenvia-painel-paciente.png)

*Painel do paciente do SERENVIA, com acesso aos recursos da plataforma.*

---

## 📌 Status do Projeto

**Versão demonstrativa funcional — em desenvolvimento.**

Funcionalidades adicionais e melhorias de interface poderão ser implementadas futuramente.

O SERENVIA não está preparado para utilização com pacientes reais ou processamento de dados clínicos.

---

## 👨‍💻 Desenvolvimento

**AW TECHNOLOGY**

Desenvolvimento de sistemas web, plataformas personalizadas e soluções digitais.

**Desenvolvedor:** André Waldige

**GitHub:** awaldige

---

## 📄 Finalidade

Este projeto integra o portfólio técnico da AW TECHNOLOGY e demonstra conhecimentos em desenvolvimento full stack, autenticação, gerenciamento de usuários, agendamento e integração com banco de dados.