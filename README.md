# Connor — Assistente de IA

Assistente de IA pessoal que responde perguntas sobre a formação, experiência
profissional e projetos de Gerardo Silva. Usa a API da Groq (modelo Llama 3.3,
gratuita) com um contexto customizado — sem fine-tuning, o "treinamento" é
feito via prompt de sistema com as informações reais do currículo.

🔗 **Publicado em:** https://connor-assistente.onrender.com
🔗 **Integrado no portfólio:** https://alexdenico96-tech.github.io/Meu-Portfolio/ (widget flutuante, canto inferior direito)

## 🚧 Status
Concluído e publicado — chat funcional com memória de conversa, escopo
restrito ao currículo/portfólio, e integrado ao portfólio principal via
widget com iframe.

## 🛠️ Tecnologias
- Node.js + Express (serve o front-end e a API no mesmo servidor, sem CORS)
- Groq API (modelo `openai/gpt-oss-120b`, gratuita) com function calling
- Resend (envio de email quando o Connor encaminha uma conversa)
- HTML/CSS/JS puro no front-end, com efeito glassmorphism azul neon
- Deploy no Render

## ✨ Funcionalidades
- Chat com memória de conversa (histórico reenviado a cada mensagem)
- Contexto customizado com dados reais de formação, experiência e projetos
- Fala sobre o Gerardo em terceira pessoa (não finge ser ele)
- Escopo restrito: recusa perguntas sobre orçamento, capacidade técnica,
  tecnologias específicas ou processo de trabalho dos projetos
- **Encaminhamento de conversa**: quando o visitante pergunta algo fora do
  escopo, o Connor pede o email dele e usa *function calling* pra enviar a
  conversa completa (não um resumo) por email para o Gerardo, via Resend
- Modo embutido (`?embed=1`): quando carregado dentro do widget do
  portfólio, remove seu próprio cartão/cabeçalho para não duplicar a "caixa"

## 📁 Estrutura do projeto
```
assistente-ia/
├── server.js          (backend Express + rota /api/chat + function calling)
├── contexto.js         (system prompt: dados sobre o Gerardo + regras de comportamento)
├── package.json
├── .env.example
├── .gitignore
├── public/
│   ├── index.html
│   ├── favicon.svg
│   ├── css/style.css
│   └── js/script.js
└── README.md            (este arquivo)
```

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

3. Gere uma chave de API gratuita em [console.groq.com](https://console.groq.com)
   (não pede cartão de crédito) e cole no `.env`, em `GROQ_API_KEY`.

4. Gere uma chave de API gratuita em [resend.com](https://resend.com) e cole
   no `.env`, em `RESEND_API_KEY`. ⚠️ Atenção: as chaves da Groq começam com
   `gsk_` e as da Resend com `re_` — são projetos diferentes, não confunda os
   valores ao colar (já aconteceu).

5. Preencha `EMAIL_USER` com o email que deve receber as conversas encaminhadas.

6. Rode o servidor:
   ```bash
   npm start
   ```
   Acesse `http://localhost:3000` — deve abrir a tela de chat do Connor.

## Como publicar (deploy)

No Render (render.com), plano free:
1. "New +" → "Web Service", conecte este repositório
2. **Root Directory:** deixe em branco (projeto já está na raiz)
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Em "Environment Variables", adicione `GROQ_API_KEY`, `RESEND_API_KEY` e `EMAIL_USER`

## 🧠 Como o contexto funciona
Todo o "conhecimento" do Connor sobre o Gerardo está em `contexto.js`, numa
string chamada `CONTEXTO_GERARDO`. Esse texto é enviado como mensagem
`role: "system"` em toda chamada à API — é isso que dá ao modelo genérico da
Groq (que não sabe nada sobre o Gerardo por padrão) o conhecimento específico
necessário, junto com regras de comportamento (responder em terceira pessoa,
não inventar informações, recusar temas fora do escopo).

Pra atualizar as informações (nova experiência, formação, projeto), basta
editar esse arquivo — não precisa mexer na lógica do servidor.

## 🔌 Como a integração com o portfólio funciona
O portfólio principal carrega esta aplicação inteira dentro de um `<iframe>`,
num widget flutuante. A URL usada no `data-src` do iframe inclui
`?embed=1`, que o `public/js/script.js` detecta e usa para adicionar a
classe `embutido` ao `<body>` — isso remove o cabeçalho e a "moldura" da
página (definidos em `public/css/style.css`), porque o widget do portfólio já
tem os seus próprios, evitando o efeito de caixa dentro de caixa.

## 🔧 Como o encaminhamento de conversa funciona (function calling)
Além de responder texto, o Connor pode "chamar uma ferramenta" real durante
a conversa — isso é feito descrevendo pro modelo uma função disponível
(`enviar_copia_conversa`, definida em `server.js`) e deixando ele decidir
quando usá-la, baseado nas regras do `contexto.js`.

Fluxo técnico:
1. O visitante pergunta algo fora do escopo (ex: sobre orçamento).
2. O modelo responde pedindo o email de contato (sem chamar a ferramenta ainda).
3. Quando o email é fornecido, o modelo devolve um `tool_calls` em vez de texto.
4. O **servidor** (não o modelo) executa a função de verdade: monta o
   histórico da conversa e chama a API da Resend pra enviar o email.
5. O resultado é devolvido ao modelo numa segunda chamada, pra ele formular
   a resposta final que o visitante vê.

⚠️ **Importante sobre confiabilidade:** nem sempre o modelo chama a
ferramenta quando deveria — às vezes ele só responde com texto confirmando
uma ação que não aconteceu de verdade (mais comum quando a conversa já tem
contexto de uma tentativa anterior). Por isso o `server.js` tem logs
explícitos (`console.log`) tanto quando a ferramenta executa de verdade
quanto quando o modelo responde sem chamá-la — sempre confira os Logs do
Render (não confie só na palavra do chat) se precisar confirmar que um
envio realmente aconteceu.

## ⚠️ Solução de problemas

### Erro 404 "model not found" da Groq
Modelos de LLM hospedados em APIs de terceiros podem ser descontinuados com
o tempo. Se isso acontecer, confira a lista de modelos atuais em
[console.groq.com/docs/models](https://console.groq.com/docs/models) e
atualize a constante `model` nas chamadas dentro de `server.js`.

### Erro 401 "Invalid API Key"
A chave configurada expirou, foi revogada, ou foi colada errada. Gere uma
chave nova no provedor correspondente (Groq ou Resend) e atualize tanto o
`.env` local quanto as "Environment Variables" no Render — são dois lugares
separados, cada um com sua própria cópia da variável.

⚠️ **Cuidado ao copiar/colar múltiplas chaves de uma vez**: já aconteceu de
`GROQ_API_KEY` e `RESEND_API_KEY` ficarem com o mesmo valor por engano
(colando a chave errada no campo errado). As chaves da Groq começam com
`gsk_`, as da Resend com `re_` — confira o prefixo se o erro insistir mesmo
depois de "corrigir".

### Resend não lança erro mas o email não chega
O SDK da Resend nem sempre lança uma exceção quando o envio falha — em
alguns casos (ex: restrição de remetente) ele retorna `{ error: {...} }`
normalmente, sem quebrar o `await`. O código precisa checar
`resultado.error` manualmente depois do `send()`; sem isso, o `try/catch`
nunca pega o problema e o código segue achando que deu certo.

### Confirmar de verdade se um email foi enviado
Não confie só na resposta do chat. Confira, nesta ordem: (1) Logs do Render
— procure pela linha `[enviar_copia_conversa] Email enviado com sucesso`;
(2) painel da Resend → aba "Emails" → veja o status (Delivered/Opened/etc);
(3) Gmail — busque `from:resend.dev` (esse remetente de teste costuma cair
em Promoções/Atualizações, não na caixa principal).

### Primeira requisição demora ~50 segundos
Normal no plano gratuito do Render: o servidor "dorme" após ~15 minutos sem
uso. As requisições seguintes ficam rápidas.

### Widget do portfólio aparece sem estilo (bordas brancas padrão do navegador)
Sinal de que o `public/css/style.css` publicado está desatualizado — confirme
o commit/push e force um "Manual Deploy" no Render se o redeploy automático
não disparar sozinho.

### Iframe do widget não carrega nada (fica em branco)
Verifique se o `<iframe>` no portfólio está com o atributo `src` sendo
preenchido via JavaScript corretamente. Um bug comum: checar
`iframe.src` (propriedade) em vez de `iframe.getAttribute('src')` para saber
se já foi carregado — a propriedade `.src` de um iframe com `src=""` no HTML
retorna a URL da própria página atual, não uma string vazia, o que quebra
verificações do tipo `if (!iframe.src)`.