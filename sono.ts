// sono.ts
// Logic for the Sleep Quality monitoring page.

const healthDimensions = [
    { name: 'Física', icon: 'fa-heartbeat', key: 'fisica' },
    { name: 'Mental', icon: 'fa-brain', key: 'mental' },
    { name: 'Emocional', icon: 'fa-heart', key: 'emocional' },
    { name: 'Social', icon: 'fa-users', key: 'social' },
    { name: 'Espiritual', icon: 'fa-wand-magic-sparkles', key: 'espiritual' },
    { name: 'Profissional', icon: 'fa-briefcase', key: 'profissional' },
    { name: 'Ambiental', icon: 'fa-leaf', key: 'ambiental' },
];

const sleepData: { [key: string]: any[] } = {
  doente: [
    { hour: 0, emoji: '💀', title: 'Estado Crítico', impacts: { fisica: 'Sistema imune colapsado, alucinações, tremores severos, risco de morte', mental: 'Confusão mental extrema, incapacidade de raciocínio lógico, delírios', emocional: 'Pânico, ansiedade severa, descontrole emocional total', social: 'Isolamento completo, incapacidade de interação', espiritual: 'Desconexão total, sensação de vazio existencial', profissional: 'Incapacidade total de trabalhar ou tomar decisões', ambiental: 'Hipersensibilidade a luz, som e temperatura', } },
    { hour: 2, emoji: '🤢', title: 'Estado Péssimo', impacts: { fisica: 'Náuseas, visão turva, coordenação motora comprometida, dores intensas', mental: 'Memória de curto prazo falha, dificuldade extrema de concentração', emocional: 'Irritabilidade extrema, choro fácil, desespero', social: 'Conflitos interpessoais, respostas agressivas', espiritual: 'Perda de sentido, desesperança profunda', profissional: 'Erros graves, acidentes, produtividade -80%', ambiental: 'Incapacidade de lidar com estímulos externos', } },
    { hour: 4, emoji: '😵', title: 'Estado Muito Ruim', impacts: { fisica: 'Fadiga severa, inflamação aumentada, sintomas agravados', mental: 'Pensamento lento, esquecimento constante, confusão', emocional: 'Depressão, ansiedade alta, humor instável', social: 'Dificuldade de comunicação, mal-entendidos frequentes', espiritual: 'Questionamento do propósito, falta de motivação', profissional: 'Procrastinação severa, produtividade -60%', ambiental: 'Desconforto em qualquer ambiente, hipersensibilidade', } },
    { hour: 5, emoji: '😫', title: 'Estado Ruim', impacts: { fisica: 'Dores persistentes, recuperação lenta, imunidade baixa', mental: 'Dificuldade de foco, lapsos de memória', emocional: 'Frustração constante, baixa tolerância', social: 'Preferência por isolamento, conversas superficiais', espiritual: 'Sensação de estar perdido, falta de clareza', profissional: 'Tarefas simples parecem difíceis, -40% produtividade', ambiental: 'Ambientes parecem opressivos', } },
    { hour: 6, emoji: '😰', title: 'Estado Insuficiente', impacts: { fisica: 'Recuperação mínima, sintomas ainda presentes', mental: 'Raciocínio abaixo do normal, desatenção', emocional: 'Ansiedade residual, nervosismo', social: 'Interações básicas possíveis, mas cansativas', espiritual: 'Busca por sentido, mas sem energia', profissional: 'Funcionamento no mínimo, erros ocasionais', ambiental: 'Tolerância limitada a mudanças', } },
    { hour: 7, emoji: '😐', title: 'Estado Mínimo', impacts: { fisica: 'Recuperação básica, corpo em modo sobrevivência', mental: 'Funcional mas não criativo, pensamento limitado', emocional: 'Estado neutro, sem grandes oscilações', social: 'Interações possíveis mas sem entusiasmo', espiritual: 'Conexão fraca, rotina automática', profissional: 'Tarefas básicas executadas, sem inovação', ambiental: 'Adaptação mínima ao ambiente', } },
    { hour: 8, emoji: '🙂', title: 'Estado Aceitável', impacts: { fisica: 'Recuperação ativa, sintomas controlados, energia voltando', mental: 'Clareza mental melhorando, foco razoável', emocional: 'Humor estável, esperança retornando', social: 'Abertura para conexões, conversas significativas', espiritual: 'Reconexão com propósito, paz interior', profissional: 'Produtividade normal, confiança crescente', ambiental: 'Conforto em ambientes familiares', } },
    { hour: 9, emoji: '😊', title: 'Estado Bom', impacts: { fisica: 'Sistema imune fortalecido, dores reduzidas, vitalidade', mental: 'Concentração forte, memória nítida, criatividade', emocional: 'Alegria, otimismo, resiliência emocional', social: 'Empatia alta, conexões profundas, comunicação clara', espiritual: 'Sentido de propósito, gratidão, paz interior', profissional: 'Alta performance, decisões assertivas, inovação', ambiental: 'Harmonia com ambiente, adaptabilidade', } },
    { hour: 10, emoji: '😴', title: 'Estado Ideal', impacts: { fisica: 'Cura acelerada, energia plena, corpo regenerado', mental: 'Clareza máxima, insights profundos, aprendizado rápido', emocional: 'Serenidade, amor próprio, equilíbrio total', social: 'Relações enriquecedoras, liderança natural', espiritual: 'Conexão profunda, transcendência, plenitude', profissional: 'Excelência, flow state, resultados extraordinários', ambiental: 'Integração total, bem-estar em qualquer lugar', } },
  ],
  saudavel: [
    { hour: 0, emoji: '💀', title: 'Estado Crítico', impacts: { fisica: 'Equivalente a 0.10% álcool no sangue, risco cardiovascular alto', mental: 'Incapacidade cognitiva, QI reduzido em 30 pontos', emocional: 'Descontrole total, risco de surto psicótico', social: 'Comportamento errático, perda de vínculos', espiritual: 'Vazio existencial, crise profunda', profissional: 'Demissão iminente, acidentes graves', ambiental: 'Incapaz de perceber perigos ambientais', } },
    { hour: 2, emoji: '😵', title: 'Estado Péssimo', impacts: { fisica: 'Reflexos como embriagado, tremores, náusea', mental: 'Julgamento prejudicado, decisões péssimas', emocional: 'Irritação extrema, explosões emocionais', social: 'Conflitos constantes, respostas hostis', espiritual: 'Perda de valores, cinismo', profissional: 'Produtividade -70%, erros catastróficos', ambiental: 'Acidentes domésticos/trânsito aumentados', } },
    { hour: 4, emoji: '😫', title: 'Estado Muito Ruim', impacts: { fisica: 'Imunidade -50%, ganho de peso, dores crônicas', mental: 'Memória falha, concentração 30 segundos', emocional: 'Depressão, ansiedade, paranoia', social: 'Isolamento, mal-entendidos frequentes', espiritual: 'Sensação de estar perdido na vida', profissional: 'Produtividade -50%, reputação danificada', ambiental: 'Bagunça, desleixo com espaço pessoal', } },
    { hour: 5, emoji: '😰', title: 'Estado Ruim', impacts: { fisica: 'Metabolismo lento, cortisol alto, hipertensão', mental: 'Criatividade bloqueada, pensamento rígido', emocional: 'Ansiedade persistente, insegurança', social: 'Conversas superficiais, falta de conexão', espiritual: 'Rotina automática sem propósito', profissional: 'Mediocridade, estagnação na carreira', ambiental: 'Ambiente desorganizado, estresse visual', } },
    { hour: 6, emoji: '😐', title: 'Estado Abaixo do Ideal', impacts: { fisica: 'Energia insuficiente, recuperação incompleta', mental: 'Raciocínio lento, esquecimentos ocasionais', emocional: 'Humor instável, sensibilidade aumentada', social: 'Interações OK mas sem profundidade', espiritual: 'Busca por sentido, mas sem clareza', profissional: 'Tarefas cumpridas, mas sem brilho', ambiental: 'Tolerância média a mudanças', } },
    { hour: 7, emoji: '🙂', title: 'Estado Funcional', impacts: { fisica: 'Corpo restaurado 85%, energia boa', mental: 'Foco adequado, memória funcional', emocional: 'Estabilidade, respostas equilibradas', social: 'Boa comunicação, empatia presente', espiritual: 'Conexão moderada com propósito', profissional: 'Performance sólida, confiável', ambiental: 'Adaptação normal ao ambiente', } },
    { hour: 8, emoji: '😊', title: 'Estado Ideal', impacts: { fisica: 'Energia plena, imunidade forte, metabolismo otimizado', mental: 'Foco laser, criatividade alta, aprendizado rápido', emocional: 'Alegria natural, resiliência, inteligência emocional', social: 'Carisma, conexões profundas, liderança natural', espiritual: 'Propósito claro, gratidão, paz interior', profissional: 'Alta performance, inovação, reconhecimento', ambiental: 'Harmonia total, ambientes energizantes', } },
    { hour: 9, emoji: '😴', title: 'Estado Excelente', impacts: { fisica: 'Recuperação além do normal, anti-aging, vitalidade máxima', mental: 'Clareza excepcional, insights revolucionários', emocional: 'Serenidade profunda, amor incondicional', social: 'Influência positiva, relações transformadoras', espiritual: 'Transcendência, conexão universal, sabedoria', profissional: 'Excelência absoluta, legado construído', ambiental: 'Integração perfeita, bem-estar pleno', } },
  ],
  atleta: [
    { hour: 0, emoji: '💀', title: 'Estado Catastrófico', impacts: { fisica: 'Catabolismo muscular severo, risco de rabdomiólise', mental: 'Incapacidade de executar técnicas, coordenação zero', emocional: 'Desmotivação total, risco de abandono do esporte', social: 'Conflitos com equipe, isolamento', espiritual: 'Perda de paixão pelo esporte, vazio', profissional: 'Fim de carreira iminente, perda de patrocínios', ambiental: 'Incapaz de treinar em qualquer condição', } },
    { hour: 2, emoji: '😵', title: 'Estado Crítico', impacts: { fisica: 'Zero recuperação muscular, lesões iminentes, overtraining', mental: 'Tempo de reação +200%, decisões péssimas', emocional: 'Frustração extrema, explosões de raiva', social: 'Brigas com treinador/equipe, toxicidade', espiritual: 'Questionamento se vale a pena continuar', profissional: 'Performance -80%, derrotas consecutivas', ambiental: 'Qualquer treino parece impossível', } },
    { hour: 4, emoji: '😫', title: 'Estado Péssimo', impacts: { fisica: 'Cortisol alto, inflamação, perda de força (-40%)', mental: 'Estratégia falha, não consegue se concentrar', emocional: 'Ansiedade pré-competição, medo de falhar', social: 'Distanciamento da equipe, falta de química', espiritual: 'Desconexão com o amor pelo esporte', profissional: 'Performance -60%, resultados medíocres', ambiental: 'Sensível a altitude, temperatura, pressão', } },
    { hour: 5, emoji: '😰', title: 'Estado Ruim', impacts: { fisica: 'Fadiga crônica, VO2 max reduzido, overtraining', mental: 'Tática comprometida, erros de julgamento', emocional: 'Desmotivação, insegurança constante', social: 'Competição interna negativa, inveja', espiritual: 'Perde o "porquê" treina, rotina pesada', profissional: 'Estagnação, sem evolução técnica', ambiental: 'Dificuldade em treinos outdoor/altitude', } },
    { hour: 6, emoji: '😐', title: 'Estado Insuficiente', impacts: { fisica: 'Recuperação incompleta, músculos não crescem', mental: 'Foco OK, mas sem flow state', emocional: 'Motivação fraca, treinos sem paixão', social: 'Interações normais, mas sem sinergia de equipe', espiritual: 'Treina por obrigação, não por amor', profissional: 'Performance mediana, sem destaque', ambiental: 'Treinos indoor OK, outdoor difíceis', } },
    { hour: 7, emoji: '🙂', title: 'Estado Mínimo', impacts: { fisica: 'Recuperação básica, força mantida mas não aumenta', mental: 'Execução técnica boa, estratégia funcional', emocional: 'Motivação estável, sem grandes oscilações', social: 'Trabalho em equipe funcional', espiritual: 'Conexão moderada com propósito atlético', profissional: 'Performance sólida, resultados consistentes', ambiental: 'Adaptação razoável a condições adversas', } },
    { hour: 8, emoji: '😊', title: 'Estado Bom', impacts: { fisica: 'Músculos recuperados, síntese proteica ativa, força +15%', mental: 'Foco intenso, estratégia clara, leitura de jogo perfeita', emocional: 'Confiança alta, mentalidade vencedora', social: 'Liderança natural, química de equipe forte', espiritual: 'Paixão pelo esporte, flow nos treinos', profissional: 'Alta performance, vitórias consistentes', ambiental: 'Adaptação rápida a altitude, clima, fuso', } },
    { hour: 9, emoji: '💪', title: 'Estado Ideal', impacts: { fisica: 'Crescimento muscular máximo, força explosiva, resistência superior', mental: 'Zona de flow constante, antecipação perfeita', emocional: 'Invencibilidade mental, zero medo, coragem total', social: 'Inspiração para equipe, liderança transformadora', espiritual: 'Transcendência atlética, paixão inabalável', profissional: 'Performance de elite, recordes quebrados', ambiental: 'Domínio total em qualquer condição', } },
    { hour: 10, emoji: '⚡', title: 'Estado Perfeito', impacts: { fisica: 'Recuperação sobre-humana, adaptação evolutiva, força máxima', mental: 'Genialidade tática, decisões instantâneas perfeitas', emocional: 'Estado de graça, confiança absoluta', social: 'Ícone inspirador, legado construído', espiritual: 'União total com esporte, missão cumprida', profissional: 'Lenda do esporte, hall da fama garantido', ambiental: 'Adaptação instantânea, vantagem competitiva', } },
  ],
};

const profiles = [
    { id: 'doente', name: 'Pessoa Doente', colorClass: 'profile-doente' },
    { id: 'saudavel', name: 'Pessoa Saudável', colorClass: 'profile-saudavel' },
    { id: 'atleta', name: 'Atleta', colorClass: 'profile-atleta' },
];

// --- Module-scoped state ---
let currentProfile = 'saudavel';
let selectedIndex: number | null = null;

// --- DOM Elements ---
const elements = {
    page: null as HTMLElement | null,
    profileSelector: null as HTMLElement | null,
    markersContainer: null as HTMLElement | null,
    impactContainer: null as HTMLElement | null,
};

function renderProfiles() {
    if (!elements.profileSelector) return;
    elements.profileSelector.innerHTML = profiles.map(p => `
        <button class="sleep-profile-btn ${p.colorClass} ${currentProfile === p.id ? 'active' : ''}" data-profile-id="${p.id}">
            ${p.name}
        </button>
    `).join('');
}

function renderMarkers() {
    if (!elements.markersContainer) return;
    const currentData = sleepData[currentProfile];
    const maxHours = currentData[currentData.length - 1].hour;

    elements.markersContainer.innerHTML = currentData.map((item, index) => {
        const position = (item.hour / maxHours) * 100;
        return `
            <div class="sleep-marker ${selectedIndex === index ? 'selected' : ''}" style="left: ${position}%" data-index="${index}">
                <div class="sleep-marker-emoji">${item.emoji}</div>
                <div class="sleep-marker-label"><span>${item.hour}h</span></div>
            </div>
        `;
    }).join('');
}

function renderImpactCard() {
    if (!elements.impactContainer) return;

    if (selectedIndex === null) {
        elements.impactContainer.innerHTML = `
            <div class="sleep-placeholder-card">
                <i class="fas fa-moon"></i>
                <p>Clique em qualquer hora na linha acima para ver o impacto detalhado nas 7 dimensões da saúde</p>
            </div>
        `;
        return;
    }

    const selectedData = sleepData[currentProfile][selectedIndex];
    const dimensionsHtml = healthDimensions.map(dim => `
        <div class="sleep-dimension-item">
            <div class="sleep-dimension-item-inner">
                <div class="sleep-dimension-icon-wrapper">
                    <i class="fas ${dim.icon}"></i>
                </div>
                <div class="sleep-dimension-text">
                    <h3>${dim.name}</h3>
                    <p>${selectedData.impacts[dim.key]}</p>
                </div>
            </div>
        </div>
    `).join('');

    elements.impactContainer.innerHTML = `
        <div class="sleep-impact-card">
            <div class="sleep-impact-card-header">
                <div class="emoji">${selectedData.emoji}</div>
                <div class="title-group">
                    <h2>${selectedData.hour} horas de sono</h2>
                    <p>${selectedData.title}</p>
                </div>
            </div>
            <div class="sleep-impact-grid">
                ${dimensionsHtml}
            </div>
        </div>
    `;
}

function renderAll() {
    renderProfiles();
    renderMarkers();
    renderImpactCard();
}

function handleProfileClick(e: Event) {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.sleep-profile-btn');
    if (!button || !button.dataset.profileId) return;

    currentProfile = button.dataset.profileId;
    selectedIndex = null;
    renderAll();
}

function handleMarkerClick(e: Event) {
    const target = e.target as HTMLElement;
    const marker = target.closest<HTMLElement>('.sleep-marker');
    if (!marker || !marker.dataset.index) return;

    selectedIndex = parseInt(marker.dataset.index, 10);
    renderAll();
}

export function setup(): void {
    const page = document.getElementById('page-sono');
    if (!page) {
        console.warn("Sleep Quality page container (#page-sono) not found.");
        return;
    }
    
    elements.page = page;
    elements.profileSelector = page.querySelector('#profile-selector-sono .sleep-profile-selector-inner');
    elements.markersContainer = page.querySelector('#sleep-bar-markers-sono');
    elements.impactContainer = page.querySelector('#sleep-impact-container-sono');

    elements.profileSelector?.addEventListener('click', handleProfileClick);
    elements.markersContainer?.addEventListener('click', handleMarkerClick);
}

export function show(): void {
    currentProfile = 'saudavel';
    selectedIndex = null;
    renderAll();
}