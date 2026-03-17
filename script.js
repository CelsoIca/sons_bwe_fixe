// ==========================================
// 1. CONFIGURAÇÃO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
    authDomain: "sons-bwe-fixes-a543b.firebaseapp.com",
    projectId: "sons-bwe-fixes-a543b",
    storageBucket: "sons-bwe-fixes-a543b.firebasestorage.app",
    messagingSenderId: "25559012829",
    appId: "1:25559012829:web:ce469fbf416d8d8d975234",
    measurementId: "G-7Q13H5SRQS"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// CONFIGURAÇÃO IMGBB
const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6';

// ==========================================
// 2. VARIÁVEIS GLOBAIS DO PLAYER
// ==========================================
let playlist = [];
let indexMusica = 0;

const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const mainCover = document.getElementById('main-cover');
const partyLights = document.getElementById('party-lights');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

// ==========================================
// 3. LÓGICA DO MENU LATERAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sideMenu = document.getElementById('side-menu');
    const openBtn = document.getElementById('open-menu');
    const closeBtn = document.getElementById('close-menu');

    if (openBtn) openBtn.onclick = () => sideMenu.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => sideMenu.classList.add('hidden');
});

// ==========================================
// 4. FUNÇÕES DE SUPORTE (UPLOAD & TEMPO)
// ==========================================
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
    } catch (e) { 
        console.error("Erro ImgBB:", e);
        return null; 
    }
}

function formatarTempo(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

// ==========================================
// 5. CORE DO PLAYER (FIREBASE & RENDER)
// ==========================================
if (audio) {
    // Carregar músicas do banco de dados
    db.collection("playlist").orderBy("ordem", "asc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (playlist.length > 0 && audio.src === "") {
            renderizarMusica(0);
        }
    });

    // Atualizar Barra de Progresso
    audio.ontimeupdate = () => {
        if (!isNaN(audio.duration)) {
            const progresso = (audio.currentTime / audio.duration) * 100;
            progressBar.value = progresso;
            if (currentTimeEl) currentTimeEl.innerText = formatarTempo(audio.currentTime);
            if (durationTimeEl) durationTimeEl.innerText = formatarTempo(audio.duration);
        }
    };

    // Scroll na barra de progresso
    progressBar.oninput = () => {
        const tempoDestino = (progressBar.value / 100) * audio.duration;
        audio.currentTime = tempoDestino;
    };

    audio.onended = () => proximaMusica();
}

function renderizarMusica(i) {
    indexMusica = i;
    const m = playlist[i];
    if (!m) return;

    // Atualizar textos
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url;

    // Lógica Modo Festa Inteligente
    if (m.capa && m.capa.trim() !== "") {
        mainCover.src = m.capa;
        mainCover.classList.remove('hidden');
        partyLights.classList.add('hidden');
        partyLights.classList.remove('animate-party');
    } else {
        mainCover.classList.add('hidden');
        partyLights.classList.remove('hidden');
        partyLights.classList.add('animate-party');
    }
}

// ==========================================
// 6. CONTROLOS (PLAY, NEXT, PREV)
// ==========================================
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

function logout() {
    auth.signOut().then(() => window.location.href = "index.html");
}

// --- CONTROLO DA SIDEBAR ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// --- PESQUISA E FILTROS ---
let playlistFiltrada = [];

function filtrarMusica() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    
    // Filtra por Título ou Artista
    const resultados = playlist.filter(m => 
        m.titulo.toLowerCase().includes(termo) || 
        m.artista.toLowerCase().includes(termo)
    );

    // Se houver resultados, toca o primeiro ou atualiza a lista visual
    if(resultados.length > 0) {
        console.log("Encontrado:", resultados[0].titulo);
        // Aqui podes disparar uma função para mostrar apenas estes resultados na tua lista visual
    }
}

function filtrarCategoria(categoria) {
    if (categoria === 'all') {
        console.log("Mostrar tudo");
        // Lógica para resetar filtros
    } else {
        console.log("Filtrar por:", categoria);
        // Filtra a playlist original pela propriedade 'tipo' (que deves adicionar no Firestore)
        const porCategoria = playlist.filter(m => m.tipo === categoria);
        if(porCategoria.length > 0) renderizarMusica(playlist.indexOf(porCategoria[0]));
    }
    toggleSidebar(); // Fecha o menu após escolher
}
