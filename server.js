// ============================
// SERVIDOR DO ASSISTENTE DE IA (CONNOR)
// ============================
// Este servidor faz duas coisas:
// 1) Serve os arquivos do front-end (HTML/CSS/JS) que estão em /public
// 2) Expõe a rota /api/chat, que conversa com a Groq

require('dotenv').config();
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');
const { CONTEXTO_GERARDO } = require('./contexto');

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', mensagem: 'Backend do assistente está rodando.' });
});

// ============================
// CHAT COM MEMÓRIA DE CONVERSA
// ============================
// O front-end manda a mensagem nova E o histórico da conversa até agora.
// Isso é necessário porque a API não guarda memória sozinha — cada chamada
// é isolada, então SOMOS NÓS que reenviamos o histórico toda vez, pra dar
// a ilusão de "conversa contínua".
app.post('/api/chat', async (req, res) => {
  const { mensagem, historico } = req.body;

  if (!mensagem || typeof mensagem !== 'string') {
    return res.status(400).json({ erro: 'Mensagem inválida.' });
  }

  const historicoLimitado = Array.isArray(historico) ? historico.slice(-20) : [];

  try {
    const resposta = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b', // llama-3.3-70b-versatile foi descontinuado pela Groq em jun/2026
      max_tokens: 500,
      messages: [
        { role: 'system', content: CONTEXTO_GERARDO },
        ...historicoLimitado,
        { role: 'user', content: mensagem },
      ],
    });

    const texto = resposta.choices[0].message.content;
    res.json({ sucesso: true, resposta: texto });
  } catch (erro) {
    console.error('Erro ao chamar a API da Groq:', erro);
    res.status(500).json({ sucesso: false, erro: 'Não foi possível obter uma resposta agora.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});