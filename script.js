const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx37SLKtwxzXHQJS7Bm0_5XDQ-A4arFfFXSl__fVWi_uZoLk6MXLhclm_oTyCMj31KIHQ/exec"; 

let currentUser = { email:'', rol:'', xp:0, perfil:'', nombre:'' };
let authMode = 'login', qIdx = 0, answers = [], currentMissionKey = '', chatHistory = [];
let currentChatMode = 'mentor'; 

// VARIABLE PARA CONTROLAR EL FLUJO
let isGuestFlow = false;

window.onload = function() {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.classList.add('splash-hidden');
        setTimeout(() => splash.style.display = 'none', 800);
    }, 2500); 
};

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

// 1. EL INVITADO INICIA EL FLUJO -> VA A ELEGIR ROL
function startGuestFlow() {
    isGuestFlow = true;
    switchView('view-role');
}

// 2. MANEJA LA SELECCIÓN DE ROL (SIRVE PARA INVITADO Y REGISTRO)
function handleRoleSelection(rol) {
    if (isGuestFlow) {
        completeGuestLogin(rol);
    } else {
        finishRegister(rol);
    }
}

// 3. FINALIZA EL LOGIN DE INVITADO CON EL ROL ELEGIDO
async function completeGuestLogin(rol) {
    document.getElementById('guest-loader').classList.remove('hidden');
    const textElem = document.getElementById('guest-loader-text');
    
    // Texto personalizado según rol
    const rolTxt = rol === 'student' ? 'Estudiante' : 'Docente';
    textElem.innerText = `Ingresando como ${rolTxt}...`;
    
    setTimeout(() => { textElem.innerText = "Configurando acceso..."; }, 1500);
    
    // Llamada al backend pasando el ROL
    const res = await callBackend('loginGuest', { rol: rol });
    
    setTimeout(() => {
        document.getElementById('guest-loader').classList.add('hidden');
        if(res.success) onLogin(res);
    }, 4000);
}

async function handleAuth() {
    const email = document.getElementById('in-email').value, pass = document.getElementById('in-pass').value;
    if(!email || !pass) return alert("Completa los campos");
    
    loading(true, "Verificando...");
    
    if(authMode === 'login') {
        callBackend('login', {email, pass}).then(onLogin);
    } else {
        // MODO REGISTRO: Guardamos datos y vamos a selección de rol
        currentUser.email = email; 
        currentUser.pass = pass; 
        currentUser.nombre = document.getElementById('in-name').value; 
        loading(false); 
        
        isGuestFlow = false; // Importante: NO es flujo invitado
        switchView('view-role'); 
    }
}

async function finishRegister(rol) {
    loading(true, "Creando cuenta...");
    const res = await callBackend('register', { ...currentUser, rol: rol });
    loading(false);
    if(res.error) {
        alert(res.error); 
    } else { 
        currentUser = res; 
        // TODOS van al quiz si son Pendiente
        if(res.perfil === 'Pendiente') startQuiz(); 
        else goToDashboard(); 
    }
}

function onLogin(res) {
    loading(false); 
    if(res.error) {
        alert(res.error); 
    } else { 
        currentUser = res; 
        // TODOS van al quiz si son Pendiente
        if(res.perfil === 'Pendiente') startQuiz(); 
        else goToDashboard(); 
    }
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
    
    setTimeout(() => {
        const modal = document.getElementById('welcome-modal');
        modal.classList.remove('hidden'); 
        modal.style.display = 'flex'; 
    }, 500);
    
    const botBtn = document.getElementById('bot-trigger-priv');
    botBtn.classList.remove('hidden');
    
    // AQUÍ ESTÁ LA SIMPLIFICACIÓN: TODOS VEN LO MISMO
    renderMissions();
    callBackend('readMessages', {perfil: currentUser.perfil}).then(showMsgs);
}

function animateTutorialStep() {
    const step1 = document.getElementById('tut-step-1');
    const step2 = document.getElementById('tut-step-2');
    step1.classList.add('slide-out-left');
    setTimeout(() => {
        step1.classList.add('hidden'); 
        step2.classList.remove('hidden'); 
        step2.classList.add('slide-in-right'); 
    }, 280); 
}

function startGenIATutorial() {
    document.getElementById('welcome-modal').style.display = 'none'; 
    toggleBot('private'); 
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
    document.getElementById('m-desc').innerHTML = marked.parse(l.d);
    document.getElementById('ai-example-box').classList.add('hidden');
    document.getElementById('btn-gen-ex').classList.remove('hidden');
    document.getElementById('completion-area').classList.add('hidden');
    document.getElementById('mission-modal').classList.remove('hidden');
    document.getElementById('mission-modal').style.display = 'flex';
}

async function generateAIExample() {
    document.getElementById('btn-gen-ex').classList.add('hidden');
    document.getElementById('ai-example-box').classList.remove('hidden');
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

// --- LOGICA DEL CHAT Y CAMBIO DE MODO ---

function setChatMode(mode) {
    if(mode === currentChatMode) return;
    currentChatMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-mode-${mode}`).classList.add('active');
    
    const chips = document.getElementById('quick-chips');
    const chat = document.getElementById('chat-feed');

    if(mode === 'libre') {
        chips.innerHTML = `
            <button class="chat-chip" onclick="quickChat('Genera una tabla comparativa sobre...')">📊 Tabla</button>
            <button class="chat-chip" onclick="quickChat('Dame un formato de cita APA para...')">📝 Cita APA</button>
            <button class="chat-chip" onclick="quickChat('Explícame en detalle qué es...')">🧠 Profundizar</button>
        `;
        chat.innerHTML += `<div class="msg-system system-libre fade-in">✨ Modo <strong>LIBRE</strong> activado</div>`;
        sendHiddenTrigger(`[SISTEMA: El usuario ha cambiado al modo LIBRE. Actúa ahora como un INVESTIGADOR ACADÉMICO SERIO. Saluda formalmente y pregunta en qué investigación puedes ayudar.]`);

    } else {
        chips.innerHTML = `
            <button class="chat-chip" onclick="quickChat('Dame un reto sobre Prompting')">🎯 Reto Prompting</button>
            <button class="chat-chip" onclick="quickChat('Explícame qué es una Alucinación')">👻 Alucinaciones</button>
            <button class="chat-chip" onclick="quickChat('¿Cómo uso Perplexity?')">🔍 Perplexity</button>
        `;
        chat.innerHTML += `<div class="msg-system system-mentor fade-in">🎓 Modo <strong>MENTOR</strong> activado</div>`;
        sendHiddenTrigger(`[SISTEMA: El usuario ha cambiado al modo MENTOR. Actúa ahora como un MENTOR GAMIFICADO ENÉRGICO. Saluda con entusiasmo, recuérdale que ganará XP y proponle un reto rápido para empezar.]`);
    }
}

async function sendHiddenTrigger(hiddenText) {
    lockInput(true);
    document.getElementById('typing-indicator').classList.remove('hidden');
    const chat = document.getElementById('chat-feed');
    chat.scrollTop = chat.scrollHeight;

    chatHistory.push({ "role": "user", "content": hiddenText });
    
    const res = await callBackend('chat', {
        history: chatHistory.slice(-6), 
        email: currentUser.email, 
        perfil: currentUser.perfil,
        mode: currentChatMode 
    });
    
    lockInput(false);
    document.getElementById('typing-indicator').classList.add('hidden');
    if(res.success) {
        chat.innerHTML += `<div class="msg msg-bot fade-in">${marked.parse(res.text)}</div>`;
        chatHistory.push({ "role": "assistant", "content": res.text });
        chat.scrollTop = chat.scrollHeight;
    }
}

function lockInput(state) {
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('btn-send');
    if(state) {
        input.disabled = true;
        btn.disabled = true;
        input.placeholder = "Esperando respuesta...";
    } else {
        input.disabled = false;
        btn.disabled = false;
        input.placeholder = "Pregunta sobre IA...";
        input.focus();
    }
}

function toggleBot(mode) { 
    document.getElementById('bot-callout').classList.add('hidden');
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
    
    chat.innerHTML += `<div class="msg msg-user fade-in">${marked.parse(txt)}</div>`;
    
    input.value = ''; 
    lockInput(true);
    document.getElementById('typing-indicator').classList.remove('hidden');
    chat.scrollTop = chat.scrollHeight;

    chatHistory.push({ "role": "user", "content": txt });
    
    const res = await callBackend('chat', {
        history: chatHistory.slice(-6), 
        email: currentUser.email, 
        perfil: currentUser.perfil,
        mode: currentChatMode 
    });
    
    lockInput(false);
    document.getElementById('typing-indicator').classList.add('hidden');
    
    if(res.success) {
        chat.innerHTML += `<div class="msg msg-bot fade-in">${marked.parse(res.text)}</div>`;
        chatHistory.push({ "role": "assistant", "content": res.text });
        if(res.xpGranted) { currentUser.xp += 40; document.getElementById('xp-val').innerText = currentUser.xp; showToastXP(40); }
    } else {
        chat.innerHTML += `<div class="msg msg-bot fade-in" style="color:red;">Error de conexión.</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
}

function loading(s, msg = "Cargando...") { 
    document.getElementById('loading-modal').style.display = s ? 'flex' : 'none'; 
    if(s) document.getElementById('loading-text').innerText = msg;
}
function switchView(id) { document.querySelectorAll('.container-view').forEach(v=>v.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
    document.getElementById(id).style.display = 'none'; 
}
function closeBot() { document.getElementById('bot-overlay').style.display = 'none'; }
function quickChat(t) { document.getElementById('chat-input').value = t; sendToJamba(); }
function nav(d, el) { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); el.classList.add('active'); d==='home' ? goToDashboard() : switchView('view-impact'); }
function openNews(id) {
    const n = newsData[id];
    document.getElementById('n-tag').innerText = n.tag;
    document.getElementById('n-title').innerText = n.title;
    document.getElementById('n-body').innerHTML = n.body;
    document.getElementById('news-modal').classList.remove('hidden');
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
