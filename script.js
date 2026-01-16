const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlr79W34FnrB1e6DyLLYBOQIHkF833P5G7_xShFG32mn0fwrmgE9Lu-tD81-5GPH0/exec"; 

let currentUser = { email:'', rol:'', xp:0, perfil:'', nombre:'' };
let authMode = 'login', qIdx = 0, answers = [], currentMissionKey = '', chatHistory = [];

// --- DATOS ---
const quizQs = [
    {t:"¿Cuánto conoces de IA?", opts:[{t:"He creado mis propios GPTs",v:3},{t:"Lo uso para resumir textos",v:2},{t:"Solo he oído hablar de ello",v:1}]},
    {t:"¿Confías en las respuestas de la IA?", opts:[{t:"Siempre verifico fuentes",v:3},{t:"A veces dudo",v:2},{t:"Confío ciegamente",v:1}]},
    {t:"Un compañero usa ChatGPT para todo su ensayo...", opts:[{t:"Es plagio y no aprende nada",v:3},{t:"Es inteligente, ahorra tiempo",v:1},{t:"Debería editarlo al menos",v:2}]},
    {t:"¿Cuál es tu mayor miedo con la IA?", opts:[{t:"Perder mi futuro trabajo",v:1},{t:"Privacidad de datos",v:3},{t:"Que se vuelva muy compleja",v:2}]}
];

const lessons = {
    'prompt': { 
        icon: 'fa-solid fa-terminal', 
        t:'Ingeniería de Prompts', 
        d:'<p>La IA no lee tu mente. Para obtener resultados brillantes, deja de darle órdenes simples. Usa la fórmula <strong>C.O.F.</strong>:</p><ul><li><strong>C</strong>ontexto: ¿Quién eres tú y quién es la IA?</li><li><strong>O</strong>bjetivo: ¿Qué quieres lograr exactamente?</li><li><strong>F</strong>ormato: ¿Cómo quieres recibir la información (tabla, lista, código)?</li></ul>', 
        topic: 'Fórmula de Prompting COF' 
    },
    'perplexity': { 
        icon: 'fa-solid fa-magnifying-glass-chart', 
        t:'Investigación Verificada', 
        d:'<p>ChatGPT alucina con frecuencia porque no tiene acceso real a la web actualizada. Usa <strong>Perplexity.ai</strong> para investigaciones académicas; este motor cita fuentes reales y enlaces verificables.</p>', 
        topic: 'Diferencia entre ChatGPT y Perplexity' 
    },
    'alucina': { 
        icon: 'fa-solid fa-ghost', 
        t:'Detector de Alucinaciones', 
        d:'<p>Las alucinaciones son datos falsos presentados con total seguridad por la IA. Para combatirlas, nunca copies datos biográficos, fechas o leyes sin verificar. <strong>Regla de oro:</strong> Si la IA te da una cita bibliográfica, búscala en Google Académico antes de usarla.</p>', 
        topic: 'Ejemplo de alucinación de IA' 
    }
};

const newsData = {
    'gemini': { tag:'TENDENCIA', color:'bg-purple', title:'Gemini 1.5 vs ChatGPT', body:'<p>Google ha lanzado Gemini 1.5 con una ventana de contexto masiva. Esto permite analizar libros enteros o largas bases de código de una sola vez, algo que ChatGPT aún procesa por partes.</p>' },
    'deepfake': { tag:'SEGURIDAD', color:'bg-orange', title:'Auge de los Deepfakes', body:'<p>Las nuevas herramientas de IA permiten clonar voces en solo 3 segundos. Es vital establecer palabras clave de seguridad con familiares y nunca confiar en peticiones de dinero por audio o video sin verificación secundaria.</p>' }
};

// --- LOGICA ---

async function callBackend(action, data = {}) {
    const body = { action: action, ...data };
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(body) });
        return await response.json();
    } catch (error) { return { error: error }; }
}

function showAuthForm(mode) {
    authMode = mode;
    document.getElementById('auth-tabs-row').classList.add('hidden');
    document.getElementById('form-container').classList.remove('hidden');
    document.getElementById('in-name').classList.toggle('hidden', mode === 'login');
}

function resetAuthUI() {
    document.getElementById('auth-tabs-row').classList.remove('hidden');
    document.getElementById('form-container').classList.add('hidden');
}

async function handleGuestLogin() {
    // Pantalla de carga
    document.getElementById('guest-loader').classList.remove('hidden');
    const textElem = document.getElementById('guest-loader-text');

    setTimeout(() => { textElem.innerText = "Configurando acceso..."; }, 1500);
    setTimeout(() => { textElem.innerText = "Personalizando entorno..."; }, 3000);

    const res = await callBackend('loginGuest');
    
    setTimeout(() => {
        document.getElementById('guest-loader').classList.add('hidden');
        if(res.success) onLogin(res);
    }, 4500);
}

async function handleAuth() {
    const email = document.getElementById('in-email').value, pass = document.getElementById('in-pass').value;
    if(!email || !pass) return alert("Completa los campos");
    loading(true, "Verificando...");
    if(authMode === 'login') callBackend('login', {email, pass}).then(onLogin);
    else { currentUser.email = email; currentUser.pass = pass; currentUser.nombre = document.getElementById('in-name').value; loading(false); switchView('view-role'); }
}

async function finishRegister(rol) {
    loading(true, "Configurando cuenta...");
    const res = await callBackend('register', { ...currentUser, rol: rol });
    loading(false);
    if(res.error) alert(res.error); else { currentUser = res; if(rol==='student') startQuiz(); else { currentUser.perfil = 'Profesor'; goToDashboard(); } }
}

function onLogin(res) {
    loading(false); if(res.error) alert(res.error); else { currentUser = res; if(res.perfil === 'Pendiente' && res.rol === 'student') startQuiz(); else goToDashboard(); }
}

function startQuiz() { switchView('view-quiz'); renderQ(); }
function renderQ() {
    const q = quizQs[qIdx];
    document.getElementById('q-counter').innerText = (qIdx+1) + "/4";
    document.getElementById('q-txt').innerText = q.t;
    document.getElementById('q-bar').style.width = ((qIdx+1)/4)*100 + "%";
    let h = ''; q.opts.forEach(o => { h += `<div class="btn btn-outline" style="justify-content:flex-start;" onclick="nextQ(${o.v})">${o.t}</div>`; });
    document.getElementById('q-opts').innerHTML = h;
}

function nextQ(v) {
    answers.push(v); qIdx++;
    if(qIdx < quizQs.length) renderQ();
    else {
        let s = answers.reduce((a,b)=>a+b,0), p = s < 6 ? 'Cauteloso Digital' : (s > 10 ? 'Arquitecto de Prompts' : 'Explorador Curioso');
        currentUser.perfil = p;
        callBackend('saveTest', {email: currentUser.email, respuestas: answers, perfil: p});
        document.getElementById('p-name').innerText = p; switchView('view-reveal');
    }
}

function goToDashboard() {
    switchView('view-home');
    document.getElementById('navbar').style.display = 'flex';
    document.getElementById('user-name').innerText = currentUser.nombre;
    document.getElementById('xp-val').innerText = currentUser.xp;
    
    // MOSTRAR TUTORIAL (MODAL)
    document.getElementById('welcome-modal').style.display = 'flex';
    
    // BOT CHAT LISTO
    const botBtn = document.getElementById('bot-trigger-priv');
    botBtn.classList.remove('hidden');
    
    if(currentUser.rol === 'student') {
        document.getElementById('student-dash').classList.remove('hidden');
        renderMissions();
        callBackend('readMessages', {perfil: currentUser.perfil}).then(showMsgs);
    } else {
        document.getElementById('teacher-dash').classList.remove('hidden');
        callBackend('getStats').then(st => {
            document.getElementById('admin-total').innerText = st.total || 0;
            document.getElementById('admin-avg').innerText = st.avgXP || 0;
        });
    }
}

// --- LOGICA DEL TUTORIAL ANIMADO (2 PASOS) ---
function animateTutorialStep() {
    const step1 = document.getElementById('tut-step-1');
    const step2 = document.getElementById('tut-step-2');

    // 1. Deslizar Paso 1 hacia afuera
    step1.classList.add('slide-out-left');

    setTimeout(() => {
        step1.classList.add('hidden'); // Ocultar Paso 1
        step2.classList.remove('hidden'); // Mostrar Paso 2
        step2.classList.add('slide-in-right'); // Deslizar Paso 2 hacia adentro
    }, 280); // Esperar a que termine la animación de salida
}

function startGenIATutorial() {
    document.getElementById('welcome-modal').style.display = 'none'; 
    toggleBot('private'); // Acción final: Abrir Chat
}

function renderMissions() {
    document.getElementById('resources-list').innerHTML = `
        <div class="solid-card bg-green" onclick="openM('prompt')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Prompting PRO</h3> <i class="fa-solid fa-chevron-right"></i>
            </div>
            <p style="font-size:0.9rem; opacity:0.9;">Aprende C.O.F.</p>
        </div>
        <div class="solid-card bg-blue" onclick="openM('perplexity')">
             <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Investigación Real</h3> <i class="fa-solid fa-chevron-right"></i>
            </div>
            <p style="font-size:0.9rem; opacity:0.9;">Fuentes verificadas.</p>
        </div>
        <div class="solid-card bg-orange" onclick="openM('alucina')">
             <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Cazador de Fakes</h3> <i class="fa-solid fa-chevron-right"></i>
            </div>
            <p style="font-size:0.9rem; opacity:0.9;">Detecta alucinaciones.</p>
        </div>`;
}

function openM(id) {
    currentMissionKey = id; const l = lessons[id];
    document.getElementById('m-title').innerText = l.t;
    document.getElementById('m-icon').className = `${l.icon} modal-icon-lg`;
    document.getElementById('m-desc').innerHTML = l.d;
    document.getElementById('ai-example-box').style.display = 'none'; 
    document.getElementById('btn-gen-ex').classList.remove('hidden');
    document.getElementById('completion-area').classList.add('hidden');
    document.getElementById('mission-modal').style.display = 'flex';
}

async function generateAIExample() {
    document.getElementById('btn-gen-ex').classList.add('hidden');
    document.getElementById('ai-example-box').style.display = 'block';
    document.getElementById('loader-ai').classList.remove('hidden');
    const res = await callBackend('genExample', {tema: lessons[currentMissionKey].topic});
    document.getElementById('loader-ai').classList.add('hidden');
    if (res && res.text) {
        document.getElementById('ai-example-content').innerHTML = marked.parse(res.text);
        document.getElementById('completion-area').classList.remove('hidden');
    }
}

async function completeMission() {
    closeModal('mission-modal');
    const resXP = await callBackend('addXP', {email: currentUser.email, actividad: "Misión "+currentMissionKey, puntos: 15});
    currentUser.xp = resXP; document.getElementById('xp-val').innerText = resXP; showToastXP(15);
}

// --- CHATBOT ---
function toggleBot(mode) { 
    // Limpieza de efectos
    document.getElementById('bot-callout').classList.add('hidden');
    // Quitar glow si existe
    const btn = document.getElementById('bot-trigger-priv');
    if(btn) btn.classList.remove('bot-highlight');

    document.getElementById('bot-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('bot-overlay').style.opacity = '1', 10);
    if(chatHistory.length === 0) {
        document.getElementById('chat-feed').innerHTML = `<div class="msg msg-bot fade-in">¡Hola <strong>${currentUser.nombre}</strong>! Soy tu Mentor IA. ¿Qué quieres aprender hoy?</div>`;
    }
}

async function sendToJamba() {
    const input = document.getElementById('chat-input'), txt = input.value;
    if(!txt) return;
    const chat = document.getElementById('chat-feed');
    chat.innerHTML += `<div class="msg msg-user fade-in">${txt}</div>`;
    input.value = ''; 
    document.getElementById('typing-indicator').classList.remove('hidden'); // Mostrar indicador visual
    chatHistory.push({ "role": "user", "content": txt });
    
    const res = await callBackend('chat', {history: chatHistory.slice(-6), email: currentUser.email, perfil: currentUser.perfil});
    document.getElementById('typing-indicator').classList.add('hidden'); // Ocultar indicador
    if(res.success) {
        chat.innerHTML += `<div class="msg msg-bot fade-in">${marked.parse(res.text)}</div>`;
        chatHistory.push({ "role": "assistant", "content": res.text });
        if(res.xpGranted) { currentUser.xp += 40; document.getElementById('xp-val').innerText = currentUser.xp; showToastXP(40); }
    }
    chat.scrollTop = chat.scrollHeight;
}

// --- UTILIDADES ---
function loading(s, msg = "Cargando...") { 
    document.getElementById('loading-modal').style.display = s ? 'flex' : 'none'; 
    if(s) document.getElementById('loading-text').innerText = msg;
}
function switchView(id) { document.querySelectorAll('.container-view').forEach(v=>v.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeBot() { document.getElementById('bot-overlay').style.display = 'none'; }
function quickChat(t) { document.getElementById('chat-input').value = t; sendToJamba(); }
function nav(d, el) { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); el.classList.add('active'); d==='home' ? goToDashboard() : switchView('view-impact'); }
function openNews(id) {
    const n = newsData[id];
    document.getElementById('n-tag').innerText = n.tag;
    document.getElementById('n-title').innerText = n.title;
    document.getElementById('n-body').innerHTML = n.body;
    document.getElementById('news-modal').style.display = 'flex';
}
function showMsgs(msgs) {
    let h = ''; if(Array.isArray(msgs)) msgs.forEach(m => h+=`<div class="card" style="border-left:5px solid var(--v-blue);">${m.texto}</div>`);
    document.getElementById('teacher-msgs').innerHTML = h || '<div class="card-empty">No hay mensajes hoy.</div>';
}
function showToastXP(p) {
    const t = document.getElementById('toast-xp');
    document.getElementById('toast-msg').innerText = `+${p} XP Ganados`;
    t.classList.add('show');
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => t.classList.remove('show'), 3000);
}