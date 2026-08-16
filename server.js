// ============================
// SERVIDOR DO ASSISTENTE DE IA
// ============================
// Este servidor faz duas coisas ao mesmo tempo:
// 1) Serve os arquivos do front-end (HTML/CSS/JS) que estão em /public
// 2) Expõe rotas de API (como /api/chat, que criaremos no Passo 3)
// Isso evita ter dois projetos/deploys separados, como fizemos no portfólio.

require('dotenv').config();
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Cliente da Groq, autenticado com a chave de API guardada no .env
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Permite que o servidor entenda corpos de requisição em JSON
// (necessário pra quando o front-end mandar { mensagem: "..." } pro backend)
app.use(express.json());

// Serve tudo que estiver dentro da pasta /public como arquivo estático.
// Ou seja: public/index.html vira "/", public/css/style.css vira "/css/style.css", etc.
app.use(express.static(path.join(__dirname, 'public')));

// Rota de teste simples, só pra confirmar que o servidor está de pé
// e consegue responder a chamadas de API (antes de conectar com a Claude).
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', mensagem: 'Backend do assistente está rodando.' });
});

// ============================
// TESTE DA API DA GROQ
// ============================
// Rota temporária, só pra confirmar que a integração funciona antes de
// montar o chat de verdade (Passo 4 em diante).
app.get('/api/teste-groq', async (req, res) => {
  try {
    const resposta = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // modelo open-source rodando na infraestrutura da Groq
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'Responda em uma frase curta: você está funcionando?' },
      ],
    });

    // A resposta vem dentro de "choices[0].message.content"
    // (mesmo formato usado pela API da OpenAI, que a Groq segue)
    const texto = resposta.choices[0].message.content;
    res.json({ sucesso: true, resposta: texto });
  } catch (erro) {
    console.error('Erro ao chamar a API da Groq:', erro);
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});