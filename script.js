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

// Chave ImgBB unificada (não duplicar por todo o código)
const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6';

// 2. VARIÁVEIS GLOBAIS
let playlist = [];
let playlistOriginal = [];
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
    const linkLogin = document.getElementById('link-login');
    const btnLogout = document.getElementById('btn-logout');
    const linkAdmin = document.getElementById('link-admin');

    if (user) {
        if (linkLogin) linkLogin.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');

        db.collection("users").doc(user.uid).onSnapshot(doc => {
            const data = doc.data();
            if (data && data.ativo === false) {
                alert("A tua conta foi desativada pelo General.");
                auth.signOut().then(() => window.location.href = "index.html");
            }
            if (data && data.role === 'admin') {
                if (linkAdmin) linkAdmin.classList.remove('hidden');
            }
        });
    } else {
        if (linkLogin) linkLogin.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
        if (linkAdmin) linkAdmin.classList.add('hidden');
    }
});

// 4. CORE DO PLAYER (só corre se a página tiver o player)
if (audio) {
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
        registarPlay(playlist[indexMusica]?.id);
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

    const res = playlistOriginal.filter(m =>
        m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo)
    );
    icon.classList.add('text-[#EF3C54]');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-3 ml-2">Resultados</p>';

    if (res.length === 0) {
        resultsDiv.innerHTML += `<p class="text-xs text-gray-600 text-center py-4">Nenhum resultado encontrado.</p>`;
        return;
    }

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
        playlist = [...playlistOriginal];
        renderizarMusica(idx);
        audio.play();
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playBtn.classList.add('animate-pulse-pink');
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
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
    if (overlay) overlay.classList.toggle('hidden');
}

function formatarTempo(s) {
    const min = Math.floor(s / 60);
    const seg = Math.floor(s % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

function logout() {
    auth.signOut().then(() => window.location.reload());
}

// 7. MOTOR DE UPLOAD (IMGBB)
async function uploadParaImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            console.error("Erro ImgBB:", data);
            return null;
        }
    } catch (error) {
        console.error("Erro na requisição ImgBB:", error);
        return null;
    }
}

// 8. REGISTAR PLAY
async function registarPlay(musicaId) {
    const user = auth.currentUser;
    if (!user || !musicaId) return;

    const statsRef = db.collection("users").doc(user.uid).collection("estatisticas").doc(musicaId);
    await statsRef.set({
        plays: firebase.firestore.FieldValue.increment(1),
        ultimoOuvido: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// 9. MENU DIREITO
const sideMenu = document.getElementById('side-menu');
const openMenuBtn = document.getElementById('open-menu');
const closeMenuEl = document.getElementById('close-menu');

if (openMenuBtn) openMenuBtn.onclick = () => sideMenu.classList.remove('hidden');
if (closeMenuEl) closeMenuEl.onclick = () => sideMenu.classList.add('hidden');

// 10. VIGIA GLOBAL DE SESSÃO (banimento)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.ativo === false) {
                alert("A tua conta foi desativada.");
                await auth.signOut();
                window.location.href = 'index.html';
            }
        }
    }
});

// 11. MONITORIZAR NOTIFICAÇÕES (só corre se o elemento existir — apenas no admin)
function monitorarNotificacoes() {
    const countElement = document.getElementById('notif-count');
    if (!countElement) return;

    db.collection("contactos").where("lido", "==", false).onSnapshot(snap => {
        const totalNovos = snap.size;
        if (totalNovos > 0) {
            countElement.innerText = totalNovos > 99 ? "+99" : totalNovos;
            countElement.classList.remove('hidden');
            document.title = `(${totalNovos}) Painel General | Sons Bwé Fixe`;
        } else {
            countElement.classList.add('hidden');
            document.title = `Painel General | Sons Bwé Fixe`;
        }
    });
}

monitorarNotificacoes();
