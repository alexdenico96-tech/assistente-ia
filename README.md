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
- Groq API (modelo `llama-3.3-70b-versatile`, gratuita)
- HTML/CSS/JS puro no front-end, com efeito glassmorphism azul neon
- Deploy no Render

## ✨ Funcionalidades
- Chat com memória de conversa (histórico reenviado a cada mensagem)
- Contexto customizado com dados reais de formação, experiência e projetos
- Fala sobre o Gerardo em terceira pessoa (não finge ser ele)
- Escopo restrito: recusa perguntas sobre orçamento, preços ou detalhes
  técnicos internos dos projetos, redirecionando para contato direto
- Modo embutido (`?embed=1`): quando carregado dentro do widget do
  portfólio, remove seu próprio cartão/cabeçalho para não duplicar a "caixa"

## 📁 Estrutura do projeto
```
assistente-ia/
├── server.js          (backend Express + rota /api/chat)
├── contexto.js         (system prompt: dados sobre o Gerardo + regras de comportamento)
├── package.json
├── .env.example
├── .gitignore
├── public/
│   ├── index.html
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

4. Rode o servidor:
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
5. Em "Environment Variables", adicione `GROQ_API_KEY`

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

## ⚠️ Solução de problemas

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