// ============================
// SERVIDOR DO ASSISTENTE DE IA (CONNOR)
// ============================
// Este servidor faz três coisas:
// 1) Serve os arquivos do front-end (HTML/CSS/JS) que estão em /public
// 2) Expõe a rota /api/chat, que conversa com a Groq
// 3) Dá ao Connor uma "ferramenta" (function calling): a capacidade de
//    enviar a conversa inteira por email pro Gerardo, quando o visitante
//    pergunta algo fora do escopo dele (orçamento, capacidade técnica, etc).
//    O modelo não manda o email sozinho — ele só "pede" pra essa função
//    rodar aqui no servidor, com o email do visitante como argumento.

require('dotenv').config();
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');
const { Resend } = require('resend');
const { CONTEXTO_GERARDO } = require('./contexto');

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', mensagem: 'Backend do assistente está rodando.' });
});

// ============================
// DEFINIÇÃO DA FERRAMENTA (TOOL)
// ============================
const ferramentas = [
  {
    type: 'function',
    function: {
      name: 'enviar_copia_conversa',
      description:
        'Envia a conversa inteira por email para o Gerardo entrar em contato. ' +
        'Use quando o visitante perguntar sobre orçamento, capacidade técnica, ' +
        'tecnologias específicas, ou processo de trabalho — assuntos que o Connor ' +
        'não deve responder diretamente. Só chame depois de já ter o email do visitante.',
      parameters: {
        type: 'object',
        properties: {
          email_visitante: {
            type: 'string',
            description: 'Email de contato do visitante, para o Gerardo responder diretamente.',
          },
        },
        required: ['email_visitante'],
      },
    },
  },
];

// Formata o histórico + mensagem atual num texto de conversa legível,
// pra mandar por email exatamente como aconteceu (não um resumo do modelo).
function formatarConversa(historico, mensagemAtual) {
  const todasMensagens = [...historico, { role: 'user', content: mensagemAtual }];

  return todasMensagens
    .map((m) => {
      const autor = m.role === 'user' ? 'Visitante' : 'Connor';
      return `<p><strong>${autor}:</strong> ${m.content}</p>`;
    })
    .join('\n');
}

// A função de verdade, que roda quando o Connor decide usar a ferramenta acima.
async function enviarCopiaConversa({ email_visitante, historico, mensagemAtual }) {
  const conversaFormatada = formatarConversa(historico, mensagemAtual);

  const resultado = await resend.emails.send({
    from: 'Connor <onboarding@resend.dev>',
    to: process.env.EMAIL_USER,
    reply_to: email_visitante,
    subject: `[Connor] Cópia de conversa — possível interesse de negócio`,
    html: `
      <h3>O Connor encaminhou esta conversa</h3>
      <p><strong>Email do visitante:</strong> ${email_visitante}</p>
      <hr>
      ${conversaFormatada}
    `,
  });

  // IMPORTANTE: o SDK da Resend não lança exceção em todo erro — em muitos
  // casos (ex: restrição de remetente/domínio) ele retorna { error: {...} }
  // normalmente, sem quebrar o await. Por isso PRECISAMOS checar esse campo
  // manualmente; sem isso, o código seguia achando que tinha dado certo.
  if (resultado.error) {
    throw new Error(resultado.error.message);
  }

  console.log(`[enviar_copia_conversa] Email enviado com sucesso (id: ${resultado.data?.id}) para ${process.env.EMAIL_USER}, reply-to: ${email_visitante}`);
}

// ============================
// CHAT COM MEMÓRIA + FERRAMENTA
// ============================
app.post('/api/chat', async (req, res) => {
  const { mensagem, historico } = req.body;

  if (!mensagem || typeof mensagem !== 'string') {
    return res.status(400).json({ erro: 'Mensagem inválida.' });
  }

  const historicoLimitado = Array.isArray(historico) ? historico.slice(-20) : [];
  const mensagens = [
    { role: 'system', content: CONTEXTO_GERARDO },
    ...historicoLimitado,
    { role: 'user', content: mensagem },
  ];

  try {
    // PRIMEIRA CHAMADA: o modelo vê a conversa e as ferramentas disponíveis,
    // e decide se quer responder direto com texto OU chamar a ferramenta.
    const primeiraResposta = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      max_tokens: 500,
      messages: mensagens,
      tools: ferramentas,
      tool_choice: 'auto',
    });

    const mensagemResposta = primeiraResposta.choices[0].message;
    const chamadasDeFerramenta = mensagemResposta.tool_calls;

    // Se o modelo NÃO pediu pra usar a ferramenta, é uma resposta de texto normal.
    if (!chamadasDeFerramenta || chamadasDeFerramenta.length === 0) {
      console.log(`[chat] Resposta direta, sem chamar ferramenta. Mensagem do visitante: "${mensagem}"`);
      return res.json({ sucesso: true, resposta: mensagemResposta.content });
    }

    // Se pediu, executamos a função de verdade aqui no servidor.
    const chamada = chamadasDeFerramenta[0];
    const argumentos = JSON.parse(chamada.function.arguments);

    let resultadoFerramenta;
    try {
      await enviarCopiaConversa({
        email_visitante: argumentos.email_visitante,
        historico: historicoLimitado,
        mensagemAtual: mensagem,
      });
      resultadoFerramenta = 'Cópia da conversa enviada com sucesso para o Gerardo.';
    } catch (erroEnvio) {
      console.error('Erro ao enviar cópia da conversa:', erroEnvio);
      resultadoFerramenta = 'Houve um erro ao tentar enviar a cópia da conversa.';
    }

    // SEGUNDA CHAMADA: contamos ao modelo o resultado da função, pra ele
    // formular a resposta final que o visitante vai ler.
    const segundaResposta = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      max_tokens: 300,
      messages: [
        ...mensagens,
        mensagemResposta,
        {
          role: 'tool',
          tool_call_id: chamada.id,
          content: resultadoFerramenta,
        },
      ],
    });

    res.json({ sucesso: true, resposta: segundaResposta.choices[0].message.content });
  } catch (erro) {
    console.error('Erro ao chamar a API da Groq:', erro);
    res.status(500).json({ sucesso: false, erro: 'Não foi possível obter uma resposta agora.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});