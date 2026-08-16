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
const { CONTEXTO_GERARDO } = require('./contexto');

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

  // Limite de segurança: no máximo 20 mensagens de histórico, pra não deixar
  // a conversa crescer sem limite (isso afeta custo/velocidade da API).
  const historicoLimitado = Array.isArray(historico) ? historico.slice(-20) : [];

  try {
    const resposta = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        // "system" define o papel/contexto — só aparece uma vez, no início
        { role: 'system', content: CONTEXTO_GERARDO },
        // depois vem todo o histórico da conversa até agora
        ...historicoLimitado,
        // e por último, a mensagem nova do visitante
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