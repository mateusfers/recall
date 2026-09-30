/* ============================================================
   RECALL — SCRIPT PRINCIPAL
   ============================================================ */

/* ============================================================
   1. ESTADO GLOBAL
   ============================================================ */
const STATE = {
  currentSection: 'home',
  mastery: {},           // { 'c1-1': true/false }
  erros: {},             // { 'c1-1': count }
  visitadas: [],         // seções visitadas
  revisoes: {},          // { 'c1-1': timestamp próxima revisão }
  totalSecoes: 0,
  secoesConcluidas: 0
};

const STORAGE_KEY = 'recall_state_v1';

/* ============================================================
   2. INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  carregarEstado();
  contarSecoes();
  configurarNavegacao();
  configurarBotoes();
  configurarBusca();
  configurarOverlay();
  atualizarProgresso();
  configurarTeclado();
  renderizarResumoAtivo();
  renderizarErros();
  
  // Se há uma seção salva, ir para ela
  if (STATE.currentSection && STATE.currentSection !== 'home') {
    irParaSecao(STATE.currentSection);
  }
});

/* ============================================================
   3. LOCALSTORAGE
   ============================================================ */
function carregarEstado() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      Object.assign(STATE, parsed);
    }
  } catch (e) {
    console.warn('Erro ao carregar estado:', e);
  }
}

function salvarEstado() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

/* ============================================================
   4. CONTAGEM DE SEÇÕES
   ============================================================ */
function contarSecoes() {
  const secoes = document.querySelectorAll('.section');
  STATE.totalSecoes = secoes.length - 1; // -1 = Home
}

/* ============================================================
   5. NAVEGAÇÃO
   ============================================================ */
function configurarNavegacao() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      irParaSecao(sectionId);
      
      // Fechar sidebar no mobile
      if (window.innerWidth <= 768) {
        fecharSidebar();
      }
    });
  });
}

function irParaSecao(sectionId) {
  // Esconder todas as seções
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
  });
  
  // Mostrar a seção alvo
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Atualizar nav ativo
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionId) {
      item.classList.add('active');
    }
  });
  
  // Salvar seção atual
  STATE.currentSection = sectionId;
  
  // Marcar como visitada
  if (sectionId !== 'home' && !STATE.visitadas.includes(sectionId)) {
    STATE.visitadas.push(sectionId);
  }
  
  salvarEstado();
  atualizarProgresso();
}

function startStudy() {
  // Ir para a primeira seção não dominada
  const secoes = document.querySelectorAll('.section');
  for (let i = 1; i < secoes.length; i++) {
    const id = secoes[i].id;
    if (STATE.mastery[id] !== true) {
      irParaSecao(id);
      return;
    }
  }
  // Se todas dominadas, ir para a primeira
  irParaSecao(secoes[1].id);
}

/* ============================================================
   6. BOTÕES DO HEADER
   ============================================================ */
function configurarBotoes() {
  // Botão de erros
  const btnErros = document.getElementById('btnErros');
  if (btnErros) {
    btnErros.addEventListener('click', () => {
      renderizarErros();
      abrirPainel('panelErros');
    });
  }
  
  // Botão de resumo
  const btnResumo = document.getElementById('btnResumo');
  if (btnResumo) {
    btnResumo.addEventListener('click', () => {
      renderizarResumoAtivo();
      abrirPainel('panelResumo');
    });
  }
  
  // Botão de reset
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('⚠️ Tem certeza que quer resetar TODO o progresso? Esta ação não pode ser desfeita.')) {
        resetarProgresso();
      }
    });
  }
  
  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      abrirSidebar();
    });
  }
}

/* ============================================================
   7. SIDEBAR MOBILE
   ============================================================ */
function configurarOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      fecharSidebar();
    });
  }
}

function abrirSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

/* ============================================================
   8. BUSCA
   ============================================================ */
function configurarBusca() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const match = query === '' || text.includes(query);
      item.style.display = match ? 'block' : 'none';
    });
    
    // Mostrar/esconder títulos de capítulo
    document.querySelectorAll('.nav-chapter').forEach(chapter => {
      const items = chapter.querySelectorAll('.nav-item');
      const hasVisible = Array.from(items).some(i => i.style.display !== 'none');
      chapter.style.display = hasVisible ? 'block' : 'none';
    });
  });
}

/* ============================================================
   9. PROGRESSO
   ============================================================ */
function atualizarProgresso() {
  const total = STATE.totalSecoes;
  const concluidas = Object.values(STATE.mastery).filter(v => v === true).length;
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  
  STATE.secoesConcluidas = concluidas;
  
  const miniBar = document.getElementById('progressMiniBar');
  const miniText = document.getElementById('progressMiniText');
  const fullBar = document.getElementById('progressFullBar');
  const fullText = document.getElementById('progressFullText');
  
  if (miniBar) miniBar.style.width = pct + '%';
  if (miniText) miniText.textContent = pct + '%';
  if (fullBar) fullBar.style.width = pct + '%';
  if (fullText) fullText.textContent = `Progresso: ${pct}% (${concluidas}/${total})`;
  
  salvarEstado();
}

/* ============================================================
   10. MASTERY (DOMÍNIO)
   ============================================================ */
function markMastery(sectionId, dominado) {
  STATE.mastery[sectionId] = dominado;
  
  if (dominado) {
    // Agendar revisão (Spaced Repetition)
    agendarRevisao(sectionId);
    
    // Feedback visual
    mostrarToast('✅ Conceito marcado como dominado!', 'success');
  } else {
    // Registrar erro
    registrarErro(sectionId);
    mostrarToast('❌ Conceito marcado para revisão.', 'warning');
  }
  
  salvarEstado();
  atualizarProgresso();
  renderizarErros();
}

/* ============================================================
   11. ACTIVE RECALL
   ============================================================ */
function revealRecall(btn) {
  const block = btn.closest('.recall-block');
  const answer = block.querySelector('.recall-answer');
  
  if (answer) {
    answer.classList.toggle('show');
    
    if (answer.classList.contains('show')) {
      btn.textContent = '🙈 Esconder';
    } else {
      btn.textContent = '👁️ Revelar';
    }
  }
}

function revealInterrogation(btn) {
  const block = btn.closest('.interrogation-block');
  const answer = block.querySelector('.interrogation-answer');
  
  if (answer) {
    answer.classList.toggle('show');
    
    if (answer.classList.contains('show')) {
      btn.textContent = '🙈 Esconder resposta';
    } else {
      btn.textContent = '👁️ Ver resposta';
    }
  }
}

/* ============================================================
   12. FEYNMAN TIMER
   ============================================================ */
const timers = {};

function startFeynmanTimer(sectionId) {
  const display = document.getElementById('timer-' + sectionId);
  if (!display) return;
  
  // Se já está rodando, parar
  if (timers[sectionId]) {
    clearInterval(timers[sectionId]);
    delete timers[sectionId];
    display.textContent = '01:00';
    display.classList.remove('running');
    return;
  }
  
  let segundos = 60;
  display.classList.add('running');
  
  timers[sectionId] = setInterval(() => {
    segundos--;
    
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const sec = String(segundos % 60).padStart(2, '0');
    display.textContent = `${min}:${sec}`;
    
    if (segundos <= 0) {
      clearInterval(timers[sectionId]);
      delete timers[sectionId];
      display.textContent = '✅ Fim!';
      display.classList.remove('running');
      
      // Feedback
      setTimeout(() => {
        display.textContent = '01:00';
      }, 3000);
    }
  }, 1000);
}

/* ============================================================
   13. ERROS
   ============================================================ */
function registrarErro(sectionId) {
  if (!STATE.erros[sectionId]) {
    STATE.erros[sectionId] = 0;
  }
  STATE.erros[sectionId]++;
  salvarEstado();
}

function renderizarErros() {
  const body = document.getElementById('errosBody');
  if (!body) return;
  
  const errosArray = Object.entries(STATE.erros)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]); // ordenar por frequência
  
  if (errosArray.length === 0) {
    body.innerHTML = '<p class="empty-state">Nenhum erro registrado ainda. Continue estudando! 🚀</p>';
    return;
  }
  
  let html = '';
  errosArray.forEach(([sectionId, count]) => {
    const section = document.getElementById(sectionId);
    const titulo = section ? (section.querySelector('h2')?.textContent || sectionId) : sectionId;
    
    html += `
      <div class="erro-item">
        <div class="erro-conceito">${titulo}</div>
        <span class="erro-count">${count} ${count === 1 ? 'erro' : 'erros'}</span>
      </div>
    `;
  });
  
  body.innerHTML = html;
}

/* ============================================================
   14. PAINÉIS
   ============================================================ */
function abrirPainel(painelId) {
  // Fechar outros painéis
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  
  const painel = document.getElementById(painelId);
  if (painel) {
    painel.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closePanel(painelId) {
  const painel = document.getElementById(painelId);
  if (painel) {
    painel.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function openResumo() {
  renderizarResumoAtivo();
  abrirPainel('panelResumo');
}

/* ============================================================
   15. RESUMO ATIVO
   ============================================================ */
const RESUMO_PONTOS = [
  'Um SO tem 2 funções: <strong>gerenciador de recursos</strong> e <strong>máquina estendida</strong>.',
  'Existem <strong>9 tipos de SO</strong>: grande porte, servidores, multiprocessadores, PCs, portáteis, embarcados, sensores, tempo real, cartões.',
  'Processo tem <strong>3 estados</strong>: Executando, Pronto, Bloqueado. E <strong>4 transições</strong> (2 perdidas: Pronto→Bloqueado, Bloqueado→Executando).',
  '<strong>fork()</strong> dobra o número de processos: n forks = <strong>2ⁿ processos</strong>. Retorna 0 no filho, PID no pai.',
  '<strong>Threads</strong> compartilham espaço de endereçamento, mas cada uma tem PC, registradores e pilha.',
  '<strong>4 condições para exclusão mútua</strong>: exclusão mútua, sem suposições, fora da RC não bloqueia, sem espera infinita.',
  '<strong>Strict Alternation viola Condição 3</strong> (fora da RC bloqueia). Peterson e TSL funcionam.',
  '<strong>Semáforos</strong> usam down() e up() atômicos. Binário (0/1) ou contador (>1).',
  '<strong>Produtor/Consumidor</strong>: down(empty) → down(mutex) → insere → up(mutex) → up(full). Inverter = deadlock.',
  '<strong>Jantar dos Filósofos</strong>: solução ingênua causa deadlock. Solução correta usa estados THINKING/HUNGRY/EATING.',
  '<strong>Impasase</strong> tem 4 condições: exclusão mútua, posse e espera, não preempção, espera circular.',
  '<strong>Ciclo em grafo de recursos = impasse</strong>. Use DFS para detectar.',
  '<strong>Algoritmo do Banqueiro</strong> verifica estado seguro antes de conceder. Necessário = Máximo − Alocado.',
  '<strong>Evasão (Banqueiro) não nega condição</strong>, evita o ciclo. Prevenção nega 1 das 4.',
  '<strong>Turnaround</strong> = Conclusão − Chegada. <strong>Espera</strong> = Turnaround − Execução.',
  '<strong>SJF</strong> tem melhor tempo médio. <strong>RR</strong> com quantum pequeno tem pior.'
];

const RESUMO_PERGUNTAS = [
  { q: 'Quais são as duas funções de um SO?', a: 'Gerenciador de recursos + Máquina estendida.' },
  { q: 'Quantos tipos de SO existem?', a: '9 tipos.' },
  { q: 'Quais são os 3 estados de um processo?', a: 'Executando, Pronto, Bloqueado.' },
  { q: 'Quantos processos após 3 forks?', a: '2³ = 8 processos.' },
  { q: 'O que é compartilhado entre threads?', a: 'Espaço de endereçamento, variáveis globais, arquivos abertos.' },
  { q: 'Quais as 4 condições para exclusão mútua?', a: 'Exclusão mútua, sem suposições, fora da RC não bloqueia, sem espera infinita.' },
  { q: 'Qual condição o Strict Alternation viola?', a: 'Condição 3 (fora da RC bloqueia).' },
  { q: 'O que down() e up() fazem?', a: 'down: espera/decrementa. up: libera/incrementa.' },
  { q: 'Inverter down no produtor/consumidor causa?', a: 'DEADLOCK.' },
  { q: 'Por que HUNGRY no jantar dos filósofos?', a: 'Indica que o filósofo quer comer; usado pelo test().' },
  { q: 'Quais as 4 condições para impasse?', a: 'Exclusão mútua, posse e espera, não preempção, espera circular.' },
  { q: 'O que significa ciclo em grafo de recursos?', a: 'IMPASSE.' },
  { q: 'O que é estado seguro?', a: 'Existe sequência onde todos os processos terminam.' },
  { q: 'Evasão atua em qual condição?', a: 'NENHUMA. Evita o ciclo dinamicamente.' },
  { q: 'Fórmula do turnaround?', a: 'Conclusão − Chegada.' },
  { q: 'Melhor e pior algoritmo de escalonamento?', a: 'Melhor: SJF. Pior: RR com quantum pequeno.' }
];

function renderizarResumoAtivo() {
  const pontosDiv = document.getElementById('resumoPontos');
  const perguntasDiv = document.getElementById('resumoPerguntas');
  
  if (!pontosDiv || !perguntasDiv) return;
  
  // Renderizar pontos
  pontosDiv.innerHTML = RESUMO_PONTOS.map(p => 
    `<div class="resumo-ponto">${p}</div>`
  ).join('');
  
  // Renderizar perguntas (com respostas escondidas)
  perguntasDiv.innerHTML = RESUMO_PERGUNTAS.map((item, i) => `
    <div class="resumo-pergunta">
      <div class="pergunta-text">${i + 1}. ${item.q}</div>
      <button class="btn-mini" onclick="togglePerguntaResposta(this)">👁️ Revelar</button>
      <div class="pergunta-answer">${item.a}</div>
    </div>
  `).join('');
}

function togglePerguntaResposta(btn) {
  const parent = btn.closest('.resumo-pergunta');
  const answer = parent.querySelector('.pergunta-answer');
  
  if (answer) {
    answer.classList.toggle('show');
    btn.textContent = answer.classList.contains('show') ? '🙈 Esconder' : '👁️ Revelar';
  }
}

/* ============================================================
   16. RESET
   ============================================================ */
function resetarProgresso() {
  // Limpar estado
  STATE.mastery = {};
  STATE.erros = {};
  STATE.visitadas = [];
  STATE.revisoes = {};
  STATE.currentSection = 'home';
  
  // Limpar localStorage
  localStorage.removeItem(STORAGE_KEY);
  
  // Atualizar UI
  atualizarProgresso();
  renderizarErros();
  
  // Ir para home
  irParaSecao('home');
  
  mostrarToast('🔄 Progresso resetado!', 'info');
}

/* ============================================================
   17. SPACED REPETITION
   ============================================================ */
function agendarRevisao(sectionId) {
  // Agenda revisão em 1, 3 e 7 dias (simplificado)
  const agora = Date.now();
  const dias = [1, 3, 7];
  
  STATE.revisoes[sectionId] = {
    criado: agora,
    proxima: agora + (dias[0] * 24 * 60 * 60 * 1000)
  };
  
  salvarEstado();
}

function verificarRevisoes() {
  const agora = Date.now();
  const paraRevisar = [];
  
  Object.entries(STATE.revisoes).forEach(([sectionId, info]) => {
    if (info.proxima && info.proxima <= agora) {
      paraRevisar.push(sectionId);
    }
  });
  
  if (paraRevisar.length > 0) {
    console.log('📚 Revisões pendentes:', paraRevisar);
  }
  
  return paraRevisar;
}

/* ============================================================
   18. TOAST (NOTIFICAÇÃO)
   ============================================================ */
function mostrarToast(mensagem, tipo = 'info') {
  // Remove toast existente
  const existente = document.querySelector('.toast');
  if (existente) existente.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  
  // Estilos inline (para não depender do CSS)
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '25px',
    left: '50%',
    transform: 'translateX(-50%) translateY(100px)',
    padding: '14px 24px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '700',
    fontSize: '0.9em',
    zIndex: '1000',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    maxWidth: '90vw',
    textAlign: 'center'
  });
  
  // Cor por tipo
  const cores = {
    success: 'linear-gradient(135deg, #3FB950, #2EA043)',
    warning: 'linear-gradient(135deg, #F5A524, #D29922)',
    danger: 'linear-gradient(135deg, #F85149, #DA3633)',
    info: 'linear-gradient(135deg, #4A9EFF, #6B7FFF)'
  };
  toast.style.background = cores[tipo] || cores.info;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  // Animar saída
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

/* ============================================================
   19. ATALHOS DE TECLADO
   ============================================================ */
function configurarTeclado() {
  document.addEventListener('keydown', (e) => {
    // ESC fecha painéis e sidebar
    if (e.key === 'Escape') {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      fecharSidebar();
      document.body.style.overflow = '';
    }
    
    // Ctrl+K foca na busca
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.focus();
    }
  });
}

/* ============================================================
   20. INTERLEAVING (EMBARALHAR)
   ============================================================ */
function embaralharSecoes() {
  const secoes = Array.from(document.querySelectorAll('.section')).filter(s => s.id !== 'home');
  
  // Fisher-Yates shuffle
  for (let i = secoes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [secoes[i], secoes[j]] = [secoes[j], secoes[i]];
  }
  
  // Reordenar no DOM
  const main = document.getElementById('main');
  if (main) {
    secoes.forEach(s => main.appendChild(s));
  }
  
  mostrarToast('🔀 Seções embaralhadas para interleaving!', 'info');
}

/* ============================================================
   21. ESTATÍSTICAS
   ============================================================ */
function obterEstatisticas() {
  const total = STATE.totalSecoes;
  const dominadas = Object.values(STATE.mastery).filter(v => v === true).length;
  const erros = Object.values(STATE.erros).reduce((a, b) => a + b, 0);
  const visitadas = STATE.visitadas.length;
  
  return {
    total,
    dominadas,
    pct: total > 0 ? Math.round((dominadas / total) * 100) : 0,
    erros,
    visitadas
  };
}

/* ============================================================
   22. EXPORTAR/IMPORTAR PROGRESSO
   ============================================================ */
function exportarProgresso() {
  const dados = JSON.stringify(STATE, null, 2);
  const blob = new Blob([dados], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `recall-progresso-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  mostrarToast('📥 Progresso exportado!', 'success');
}

function importarProgresso(input) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      Object.assign(STATE, dados);
      salvarEstado();
      atualizarProgresso();
      renderizarErros();
      mostrarToast('📤 Progresso importado!', 'success');
    } catch (err) {
      mostrarToast('❌ Erro ao importar arquivo.', 'danger');
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   23. SCROLL SUAVE PARA ÂNCORAS
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ============================================================
   24. LAZY LOADING DE ANIMAÇÕES
   ============================================================ */
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.content-block, .recall-block, .interrogation-block').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(15px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ============================================================
   25. VERIFICAÇÃO PERIÓDICA DE REVISÕES
   ============================================================ */
setInterval(() => {
  const pendentes = verificarRevisoes();
  if (pendentes.length > 0) {
    console.log(`📚 ${pendentes.length} seções para revisar!`);
  }
}, 60000); // a cada 1 minuto

/* ============================================================
   26. LOG DE INICIALIZAÇÃO
   ============================================================ */
console.log(`
╔══════════════════════════════════════╗
║         🧠 RECALL v1.0              ║
║   Plataforma de Estudos Ativos      ║
╚══════════════════════════════════════╝

📚 Seções: ${STATE.totalSecoes}
✅ Dominadas: ${Object.values(STATE.mastery).filter(v => v === true).length}
❌ Erros: ${Object.values(STATE.erros).reduce((a, b) => a + b, 0)}

Atalhos:
  • Ctrl+K → Buscar
  • ESC → Fechar painéis

Bons estudos! 🚀
`);