// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
  authDomain: "sons-bwe-fixes-a543b.firebaseapp.com",
  projectId: "sons-bwe-fixes-a543b",
  storageBucket: "sons-bwe-fixes-a543b.firebasestorage.app",
  messagingSenderId: "25559012829",
  appId: "1:25559012829:web:ce469fbf416d8d8d975234",
  measurementId: "G-7Q13H5SRQS"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Substitui pelo teu código real do ImgBB
const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6'; 

async function uploadParaImgBB(file) {
    // 1. Criar o formulário de envio
    const formData = new FormData();
    formData.append('image', file);

    try {
        // 2. Enviar para o servidor do ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            console.log("Upload feito com sucesso: ", data.data.url);
            return data.data.url; // Este é o link direto da imagem (.jpg ou .png)
        } else {
            throw new Error("Erro no ImgBB: " + data.error.message);
        }
    } catch (error) {
        console.error("Erro ao carregar imagem:", error);
        return null;
    }
}

// 3. LOGICA DO MENU LATERAL (Funciona em todas as páginas)
document.addEventListener('DOMContentLoaded', () => {
    const sideMenu = document.getElementById('side-menu');
    const openBtn = document.getElementById('open-menu');
    const closeBtn = document.getElementById('close-menu');
    const menuX = document.getElementById('menu-x');

    if (openBtn) openBtn.onclick = () => sideMenu.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => sideMenu.classList.add('hidden');
    if (menuX) menuX.onclick = () => sideMenu.classList.add('hidden');
});

// 4. FUNÇÃO UPLOAD IMGBB
async function uploadParaImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.success ? data.data.url : null;
    } catch (e) { return null; }
}

// 5. PLAYER GLOBAL (Só roda se os elementos existirem na página)
let playlist = [];
let indexMusica = 0;
const audio = document.getElementById('main-audio');

if (audio) {
    db.collection("playlist").orderBy("ordem", "asc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (playlist.length > 0) renderizarMusica(0);
    });
}

function renderizarMusica(i) {
    const m = playlist[i];
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url;
    document.getElementById('main-cover').src = m.capa || '../assets/default.png';
}

// 6. LOGOUT
function logout() {
    auth.signOut().then(() => window.location.href = "../index.html");
}

// --- LÓGICA DO PLAYER GLOBAL ---
let playlist = [];
let indexMusica = 0;
const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const coverContainer = document.getElementById('cover-container');
const mainCover = document.getElementById('main-cover');
const partyLights = document.getElementById('party-lights');

if (audio) {
    // 1. Carregar Playlist do Firestore (Músicas reais)
    db.collection("playlist").orderBy("ordem", "asc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (playlist.length > 0 && audio.src === "") renderizarMusica(0); // Carrega a primeira mas não toca
    });

    // 2. Atualizar Barra de Progresso e Tempo
    audio.ontimeupdate = () => {
        if (!isNaN(audio.duration)) {
            const progresso = (audio.currentTime / audio.duration) * 100;
            progressBar.value = progresso;
            
            // Atualizar tempos (ex: 0:30 / 3:15)
            document.getElementById('current-time').innerText = formatarTempo(audio.currentTime);
            document.getElementById('duration-time').innerText = formatarTempo(audio.duration);
        }
    };

    // 3. Permitir clicar na barra de progresso
    progressBar.oninput = () => {
        const tempoDestino = (progressBar.value / 100) * audio.duration;
        audio.currentTime = tempoDestino;
    };

    // 4. Passar para a próxima automaticamente quando acaba
    audio.onended = () => proximaMusica();
}

// Auxiliar: Formatar tempo (segundos -> mm:ss)
function formatarTempo(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

// Auxiliar: Mostrar música na tela
function renderizarMusica(i) {
    indexMusica = i;
    const m = playlist[i];
    if (!m) return;

    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url; // Link do MP3

    // Ativar Modo Festa se não houver capa
    if (m.capa) {
        mainCover.src = m.capa;
        mainCover.classList.remove('hidden');
        partyLights.classList.add('hidden');
    } else {
        // Modo Festa: Esconde a imagem e mostra as luzes piscando
        mainCover.classList.add('hidden');
        partyLights.classList.remove('hidden');
    }
}

// Controlos de Reprodução
function togglePlay() {
    if (!audio.src) return alert("Escolha um som primeiro!");

    if (audio.paused) {
        audio.play();
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playBtn.classList.add('animate-pulse-pink');
    } else {
        audio.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.classList.remove('animate-pulse-pink');
    }
}

function proximaMusica() {
    if (playlist.length === 0) return;
    indexMusica = (indexMusica + 1) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    playBtn.classList.add('animate-pulse-pink');
}

function musicaAnterior() {
    if (playlist.length === 0) return;
    indexMusica = (indexMusica - 1 + playlist.length) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    playBtn.classList.add('animate-pulse-pink');
}

// --- VARIÁVEIS GLOBAIS (Garante que estão no topo) ---
const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const mainCover = document.getElementById('main-cover');
const partyLights = document.getElementById('party-lights');

// ... (Resto do código da playlist) ...

// 1. FUNÇÃO: MOSTRAR MÚSICA (Lógica do Modo Festa Inteligente)
function renderizarMusica(i) {
    indexMusica = i;
    const m = playlist[i];
    if (!m) return;

    // Atualizar Texto
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url; 

    // --- LÓGICA MODO FESTA INTELIGENTE ---
    if (m.capa && m.capa.trim() !== "") {
        // HÁ CAPA: Mostra imagem, esconde luzes
        mainCover.src = m.capa;
        mainCover.classList.remove('hidden'); // Mostra imagem
        
        partyLights.classList.add('hidden'); // Esconde div das luzes
        partyLights.classList.remove('animate-party'); // Desliga animação CSS
    } else {
        // NÃO HÁ CAPA: Esconde imagem, liga modo festa
        mainCover.classList.add('hidden'); // Esconde imagem
        
        partyLights.classList.remove('hidden'); // Mostra div das luzes
        partyLights.classList.add('animate-party'); // LIGA ANIMAÇÃO CSS
    }
}

// 2. FUNÇÃO: PLAY/PAUSE (Lógica da Animação do Botão)
function togglePlay() {
    if (!audio.src) return alert("Escolha um som primeiro!");

    if (audio.paused) {
        audio.play();
        // Mudar ícone
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        // LIGAR ANIMAÇÃO (Adiciona classe CSS)
        playBtn.classList.add('animate-pulse-pink');
    } else {
        audio.pause();
        // Mudar ícone
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        // DESLIGAR ANIMAÇÃO (Remove classe CSS)
        playBtn.classList.remove('animate-pulse-pink');
    }
}


