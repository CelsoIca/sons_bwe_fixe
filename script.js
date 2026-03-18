// 1. CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
    authDomain: "sons-bwe-fixes-a543b.firebaseapp.com",
    projectId: "sons-bwe-fixes-a543b",
    storageBucket: "sons-bwe-fixes-a543b.firebasestorage.app",
    messagingSenderId: "25559012829",
    appId: "1:25559012829:web:ce469fbf416d8d8d975234",
    measurementId: "G-7Q13H5SRQS"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6';

// 2. VARIÁVEIS GLOBAIS
let playlist = [];
let playlistOriginal = []; // Backup para filtros
let indexMusica = 0;
const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const mainCover = document.getElementById('main-cover');
const partyLights = document.getElementById('party-lights');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

// 3. SEGURANÇA & ESTADO DO UTILIZADOR
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('link-login').classList.add('hidden');
        document.getElementById('btn-logout').classList.remove('hidden');
        
        db.collection("users").doc(user.uid).onSnapshot(doc => {
            const data = doc.data();
            // Vigia de banimento
            if (data && data.ativo === false) {
                alert("A tua conta foi desativada pelo General.");
                auth.signOut().then(() => window.location.href = "index.html");
            }
            // Mostrar link Admin se for admin
            if (data && data.role === 'admin') {
                document.getElementById('link-admin').classList.remove('hidden');
            }
        });
    } else {
        document.getElementById('link-login').classList.remove('hidden');
        document.getElementById('btn-logout').classList.add('hidden');
        document.getElementById('link-admin').classList.add('hidden');
    }
});

// 4. CORE DO PLAYER
if (audio) {
    // Carregar apenas músicas NÃO ocultas
    db.collection("playlist").where("oculto", "==", false).orderBy("ordem", "desc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        playlistOriginal = [...playlist];
        if (playlist.length > 0 && audio.src === "") renderizarMusica(0);
    });

    audio.ontimeupdate = () => {
        if (!isNaN(audio.duration)) {
            progressBar.value = (audio.currentTime / audio.duration) * 100;
            currentTimeEl.innerText = formatarTempo(audio.currentTime);
            durationTimeEl.innerText = formatarTempo(audio.duration);
        }
    };

    progressBar.oninput = () => audio.currentTime = (progressBar.value / 100) * audio.duration;
    audio.onended = () => proximaMusica();
}

function renderizarMusica(i) {
    if (playlist.length === 0) return;
    indexMusica = i;
    const m = playlist[i];
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url;

    if (m.capa && m.capa.trim() !== "") {
        mainCover.src = m.capa;
        mainCover.classList.remove('hidden');
        partyLights.classList.add('hidden');
    } else {
        mainCover.classList.add('hidden');
        partyLights.classList.remove('hidden');
        partyLights.classList.add('animate-party');
    }
}

function togglePlay() {
    if (!audio.src) return;
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
    indexMusica = (indexMusica + 1) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
}

function musicaAnterior() {
    indexMusica = (indexMusica - 1 + playlist.length) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
}

// 5. PESQUISA VISUAL & FILTROS
function executarPesquisa() {
    const termo = document.getElementById('search-input').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('search-results');
    const icon = document.getElementById('search-icon');

    if (termo === "") {
        resultsDiv.classList.add('hidden');
        icon.classList.remove('text-[#EF3C54]');
        return;
    }

    const res = playlistOriginal.filter(m => m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo));
    icon.classList.add('text-[#EF3C54]');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-3 ml-2">Resultados</p>';

    res.forEach(m => {
        resultsDiv.innerHTML += `
            <div onclick="selecionarMusica('${m.id}')" class="bg-white/5 p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition border border-white/5 hover:border-[#EF3C54]/20">
                <img src="${m.capa || 'assets/default.png'}" class="w-8 h-8 rounded-lg object-cover">
                <div class="flex-1 overflow-hidden">
                    <h4 class="text-xs font-bold text-white truncate">${m.titulo}</h4>
                    <p class="text-[9px] text-gray-500 uppercase tracking-widest truncate">${m.artista}</p>
                </div>
            </div>`;
    });
}

function selecionarMusica(id) {
    const idx = playlistOriginal.findIndex(m => m.id === id);
    if (idx !== -1) {
        playlist = [...playlistOriginal]; // Reset playlist para tocar a partir daqui
        renderizarMusica(idx);
        togglePlay();
        toggleSidebar();
    }
}

function filtrarCategoria(cat, btn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('sidebar-link-active'));
    btn.classList.add('sidebar-link-active');

    playlist = cat === 'all' ? [...playlistOriginal] : playlistOriginal.filter(m => m.tipo === cat);
    if (playlist.length > 0) renderizarMusica(0);
    toggleSidebar();
}

// 6. UTILITÁRIOS
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

function formatarTempo(s) {
    const min = Math.floor(s / 60);
    const seg = Math.floor(s % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

function logout() {
    auth.signOut().then(() => window.location.reload());
}

// ==========================================
// MOTOR DE UPLOAD (IMGBB)
// ==========================================
async function uploadParaImgBB(file) {
    const apiKey = 'TU_API_KEY_AQUI'; // Pega a tua chave em api.imgbb.com
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            return data.data.url; // Retorna o link direto da imagem
        } else {
            console.error("Erro ImgBB:", data);
            return null;
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        return null;
    }
}

// ==========================================
// VIGIA DE SESSÃO GLOBAL
// ==========================================
// Este bloco garante que se o Admin banir alguém, 
// o utilizador é expulso na hora de qualquer página.
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                alert("🚫 A tua conta foi desativada.");
                await auth.signOut();
                window.location.href = 'login.html';
            }
        }
    }
});

// Menu Navegação Direito
const sideMenu = document.getElementById('side-menu');
document.getElementById('open-menu').onclick = () => sideMenu.classList.remove('hidden');
document.getElementById('close-menu').onclick = () => sideMenu.classList.add('hidden');

async function registarPlay(musicaId) {
    const user = auth.currentUser;
    if (!user) return;

    const statsRef = db.collection("users").doc(user.uid).collection("estatisticas").doc(musicaId);
    
    // Incrementa o contador de plays para essa música específica
    await statsRef.set({
        plays: firebase.firestore.FieldValue.increment(1),
        ultimoOuvido: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function atualizarContadores() {
    const user = auth.currentUser;
    const statsSnap = await db.collection("users").doc(user.uid).collection("estatisticas").get();
    
    let totalGeralPlays = 0;
    statsSnap.forEach(doc => {
        totalGeralPlays += doc.data().plays || 0;
    });

    // Atualiza o HTML
    document.querySelector('.text-[15px].font-black.italic').innerText = totalGeralPlays;
    
    // Lógica simples de Nível: a cada 50 plays sobe 1 nível
    const nivel = Math.floor(totalGeralPlays / 50) + 1;
    document.querySelector('.text-xs.font-black.text-emerald-400').innerText = `NÍVEL ${nivel}`;
}

function monitorarNotificacoes() {
    // Escuta em tempo real apenas as mensagens NÃO lidas
    db.collection("contactos").where("lido", "==", false).onSnapshot(snap => {
        const countElement = document.getElementById('notif-count');
        const totalNovos = snap.size;

        if (totalNovos > 0) {
            countElement.innerText = totalNovos > 99 ? "+99" : totalNovos;
            countElement.classList.remove('hidden');
            
            // Opcional: Altera o título da aba do navegador para chamar atenção
            document.title = `(${totalNovos}) Painel General | Sons Bwé Fixe`;
        } else {
            countElement.classList.add('hidden');
            document.title = `Painel General | Sons Bwé Fixe`;
        }
    });
}

// Inicie a monitorização assim que o Admin logar
// Chame esta função dentro do auth.onAuthStateChanged
monitorarNotificacoes();
