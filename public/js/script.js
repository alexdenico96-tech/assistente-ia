// ============================
// CHAT DO ASSISTENTE
// ============================

const chatMensagens = document.getElementById('chatMensagens');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBotao = document.getElementById('chatBotao');
const chatDigitando = document.getElementById('chatDigitando');

// Guarda o histórico da conversa em memória (no navegador).
// É esse array que reenviamos pro backend a cada mensagem nova, pra dar
// a "sensação" de memória (veja a explicação no server.js).
let historico = [];

// Adiciona uma bolha de mensagem na tela
function adicionarMensagem(texto, tipo) {
  const div = document.createElement('div');
  div.className = `mensagem mensagem-${tipo}`;
  div.textContent = texto;
  chatMensagens.appendChild(div);

  // Rola automaticamente pra mensagem mais recente
  chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

chatForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const mensagem = chatInput.value.trim();
  if (!mensagem) return;

  // Mostra a mensagem do usuário na tela imediatamente
  adicionarMensagem(mensagem, 'usuario');
  chatInput.value = '';
  chatInput.disabled = true;
  chatBotao.disabled = true;
  chatDigitando.style.display = 'flex';

  try {
    const resposta = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem, historico }),
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.erro || 'Erro desconhecido.');
    }

    adicionarMensagem(dados.resposta, 'assistente');

    // Atualiza o histórico local com essa troca de mensagens,
    // pra próxima pergunta já ir com esse contexto incluído.
    historico.push({ role: 'user', content: mensagem });
    historico.push({ role: 'assistant', content: dados.resposta });
  } catch (erro) {
    adicionarMensagem('Não consegui responder agora. Tenta de novo em instantes.', 'erro');
    console.error(erro);
  } finally {
    chatInput.disabled = false;
    chatBotao.disabled = false;
    chatDigitando.style.display = 'none';
    chatInput.focus();
  }
});