// =============================================
// SCRIPT.JS — Core da aplicação Sons Bwé Fixe
// Firebase init + player + auth + utilitários
// =============================================

// 1. FIREBASE
const firebaseConfig = {
    apiKey:            "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
    authDomain:        "sons-bwe-fixes-a543b.firebaseapp.com",
    projectId:         "sons-bwe-fixes-a543b",
    storageBucket:     "sons-bwe-fixes-a543b.firebasestorage.app",
    messagingSenderId: "25559012829",
    appId:             "1:25559012829:web:ce469fbf416d8d8d975234"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// Activar cache offline do Firestore (melhora performance)
db.settings({ experimentalForceLongPolling: false });

const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6';

// 2. VARIÁVEIS GLOBAIS DO PLAYER
let playlist         = [];
let playlistOriginal = [];
let indexMusica      = 0;

// Elementos do player (null em páginas sem player — protegido abaixo)
const audio       = document.getElementById('main-audio');
const playBtn     = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const mainCover   = document.getElementById('main-cover');
const partyLights = document.getElementById('party-lights');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

// 3. AUTH — estado do utilizador
auth.onAuthStateChanged(user => {
    const linkLogin  = document.getElementById('link-login');
    const btnLogout  = document.getElementById('btn-logout');
    const linkAdmin  = document.getElementById('link-admin');

    if (user) {
        if (linkLogin) linkLogin.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');

        db.collection("users").doc(user.uid).onSnapshot(doc => {
            const data = doc.data();
            if (!data) return;
            if (data.ativo === false) {
                alert("A tua conta foi desativada.");
                auth.signOut().then(() => window.location.href = "index.html");
                return;
            }
            if (data.role === 'admin' && linkAdmin) {
                linkAdmin.classList.remove('hidden');
            }
        });
    } else {
        if (linkLogin) linkLogin.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
        if (linkAdmin) linkAdmin.classList.add('hidden');
    }
});

// 4. PLAYER — só inicializa se existir na página
if (audio) {
    db.collection("playlist")
        .where("oculto", "==", false)
        .orderBy("ordem", "desc")
        .onSnapshot(snap => {
            playlist         = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            playlistOriginal = [...playlist];

            // Notificar index-page.js que a playlist carregou (para actualizar contagens)
            if (typeof window._onPlaylistLoad === 'function') window._onPlaylistLoad();

            if (typeof renderizarListaFaixas === 'function') renderizarListaFaixas();
            if (typeof mostrarSlideshowOuCapa === 'function' && (!audio.src || audio.paused)) {
                mostrarSlideshowOuCapa(false);
            }
            if (playlist.length > 0 && !audio.src) renderizarMusica(0);
        });

    audio.ontimeupdate = () => {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            const pct = (audio.currentTime / audio.duration) * 100;
            if (progressBar) progressBar.value = pct;
            if (currentTimeEl)  currentTimeEl.innerText  = fmt(audio.currentTime);
            if (durationTimeEl) durationTimeEl.innerText = fmt(audio.duration);
        }
    };

    if (progressBar) {
        progressBar.oninput = () => {
            audio.currentTime = (progressBar.value / 100) * audio.duration;
        };
    }
    audio.onended = () => proximaMusica();
}

function renderizarMusica(i) {
    if (!playlist.length) return;
    indexMusica = i;
    const m = playlist[i];

    const titleEl  = document.getElementById('main-title');
    const artistEl = document.getElementById('main-artist');
    if (titleEl)  titleEl.innerText  = m.titulo;
    if (artistEl) artistEl.innerText = m.artista;
    audio.src = m.url;

    if (m.capa && m.capa.trim()) {
        if (mainCover)   { mainCover.src = m.capa; mainCover.classList.remove('hidden'); }
        if (partyLights) partyLights.classList.add('hidden');
    } else {
        if (mainCover)   mainCover.classList.add('hidden');
        if (partyLights) { partyLights.classList.remove('hidden'); partyLights.classList.add('animate-party'); }
    }

    if (typeof atualizarFaixaAtiva === 'function') atualizarFaixaAtiva(i);
}

function togglePlay() {
    if (!audio || !audio.src) return;
    if (audio.paused) {
        audio.play();
        if (playBtn) { playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; playBtn.classList.add('animate-pulse-pink'); }
        registarPlay(playlist[indexMusica]?.id);
        if (typeof mostrarSlideshowOuCapa === 'function') mostrarSlideshowOuCapa(true);
    } else {
        audio.pause();
        if (playBtn) { playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; playBtn.classList.remove('animate-pulse-pink'); }
        if (typeof mostrarSlideshowOuCapa === 'function') mostrarSlideshowOuCapa(false);
    }
}

function proximaMusica() {
    if (!playlist.length) return;
    indexMusica = (indexMusica + 1) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
    if (playBtn) { playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; playBtn.classList.add('animate-pulse-pink'); }
}

function musicaAnterior() {
    if (!playlist.length) return;
    indexMusica = (indexMusica - 1 + playlist.length) % playlist.length;
    renderizarMusica(indexMusica);
    audio.play();
    if (playBtn) { playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; playBtn.classList.add('animate-pulse-pink'); }
}

// 5. PESQUISA NA SIDEBAR
// Debounce para não pesquisar a cada tecla
let _searchTimer = null;

function executarPesquisa() {
    _toggleClearBtn();
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(_fazerPesquisa, 200);
}

function _fazerPesquisa() {
    const input      = document.getElementById('search-input');
    const resultsDiv = document.getElementById('search-results');
    const icon       = document.getElementById('search-icon');
    if (!input || !resultsDiv) return;

    const termo = input.value.trim().toLowerCase();

    // Limpar pesquisa
    if (!termo) {
        resultsDiv.classList.add('hidden');
        resultsDiv.innerHTML = '';
        if (icon) icon.classList.remove('text-[#EF3C54]');
        return;
    }

    // Se playlist ainda não carregou do Firebase
    if (!playlistOriginal.length) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '<p class="text-xs text-gray-600 text-center py-4 italic">A carregar músicas...</p>';
        return;
    }

    const res = playlistOriginal.filter(m =>
        (m.titulo  || '').toLowerCase().includes(termo) ||
        (m.artista || '').toLowerCase().includes(termo) ||
        (m.tipo    || '').toLowerCase().includes(termo)
    );

    if (icon) icon.classList.add('text-[#EF3C54]');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `
        <div class="flex items-center justify-between mb-3 px-1">
            <p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                ${res.length} resultado${res.length !== 1 ? 's' : ''}
            </p>
            <button onclick="limparPesquisa()" class="text-[9px] text-gray-600 hover:text-white transition uppercase font-bold">
                Limpar
            </button>
        </div>`;

    if (!res.length) {
        resultsDiv.innerHTML += `
            <div class="text-center py-6">
                <i class="fa-solid fa-magnifying-glass text-gray-700 text-2xl mb-2"></i>
                <p class="text-xs text-gray-600">Nenhum resultado para "<strong class="text-gray-400">${termo}</strong>"</p>
            </div>`;
        return;
    }

    res.forEach(m => {
        const dur = m.duracao ? (() => { const min=Math.floor(m.duracao/60),sec=Math.floor(m.duracao%60); return `${min}:${sec<10?'0':''}${sec}`; })() : '';
        resultsDiv.innerHTML += `
            <div onclick="selecionarMusica('${m.id}')"
                class="group bg-white/5 p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 active:scale-95 transition border border-white/5 hover:border-[#EF3C54]/30">
                <div class="relative flex-shrink-0">
                    <img src="${m.capa || 'assets/default.png'}" class="w-10 h-10 rounded-xl object-cover" onerror="this.src='assets/default.png'">
                    <div class="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <i class="fa-solid fa-play text-white text-xs"></i>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden">
                    <p class="text-xs font-black text-white truncate">${_highlight(m.titulo, termo)}</p>
                    <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${_highlight(m.artista, termo)}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[8px] text-[#2E5EBE] font-bold uppercase">${m.tipo || ''}</span>
                        ${dur ? `<span class="text-[8px] text-gray-600 font-bold">${dur}</span>` : ''}
                    </div>
                </div>
                <i class="fa-solid fa-play text-[#EF3C54] text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition"></i>
            </div>`;
    });
}

// Highlight do termo pesquisado no texto (sem regex)
function _highlight(text, termo) {
    if (!text || !termo) return text || '';
    const idx = text.toLowerCase().indexOf(termo.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx)
        + '<mark class="bg-[#EF3C54]/30 text-white rounded px-0.5">'
        + text.slice(idx, idx + termo.length)
        + '</mark>'
        + text.slice(idx + termo.length);
}

function limparPesquisa() {
    const input      = document.getElementById('search-input');
    const resultsDiv = document.getElementById('search-results');
    const icon       = document.getElementById('search-icon');
    const clearBtn   = document.getElementById('clear-search-btn');
    if (input)      input.value = '';
    if (resultsDiv) { resultsDiv.classList.add('hidden'); resultsDiv.innerHTML = ''; }
    if (icon)       icon.classList.remove('text-[#EF3C54]');
    if (clearBtn)   clearBtn.classList.add('hidden');
    if (input)      input.focus();
}

// Mostrar/esconder botão X conforme há texto
function _toggleClearBtn() {
    const input    = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    if (!input || !clearBtn) return;
    if (input.value.trim()) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
}

function selecionarMusica(id) {
    const idx = playlistOriginal.findIndex(m => m.id === id);
    if (idx === -1) return;

    playlist = [...playlistOriginal];

    // Só toca se o player existir na página
    if (audio) {
        renderizarMusica(idx);
        audio.play().catch(() => {});
        if (playBtn) {
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            playBtn.classList.add('animate-pulse-pink');
        }
        if (typeof mostrarSlideshowOuCapa === 'function') mostrarSlideshowOuCapa(true);
    }

    limparPesquisa();

    // Só fechar sidebar em mobile (desktop fica sempre aberta)
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth < 768;
    if (isMobile && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        toggleSidebar();
    }
}

function filtrarCategoria(cat, btn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('sidebar-link-active'));
    if (btn) btn.classList.add('sidebar-link-active');
    playlist = cat === 'all' ? [...playlistOriginal] : playlistOriginal.filter(m => m.tipo === cat);
    if (playlist.length) renderizarMusica(0);
    if (typeof renderizarListaFaixas === 'function') renderizarListaFaixas();
    toggleSidebar();
}

// 6. UTILITÁRIOS
function toggleSidebar() {
    const sb  = document.getElementById('sidebar');
    const ov  = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.toggle('-translate-x-full');
    if (ov) ov.classList.toggle('hidden');
}

function fmt(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function logout() {
    auth.signOut().then(() => window.location.reload());
}

// 7. UPLOAD IMGBB
async function uploadParaImgBB(file) {
    const fd = new FormData();
    fd.append('image', file);
    try {
        const r    = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
        const data = await r.json();
        return data.success ? data.data.url : null;
    } catch { return null; }
}

// 8. REGISTAR PLAY — actualiza estatísticas do utilizador + contador global da música
async function registarPlay(musicaId) {
    if (!musicaId) return;
    try {
        // Contador global de visualizações na própria música
        db.collection("playlist").doc(musicaId).update({
            visualizacoes: firebase.firestore.FieldValue.increment(1)
        }).catch(() => {}); // silencioso se falhar permissões

        // Estatísticas por utilizador (só se estiver autenticado)
        const user = auth.currentUser;
        if (!user) return;
        await db.collection("users").doc(user.uid).collection("estatisticas").doc(musicaId).set({
            plays:       firebase.firestore.FieldValue.increment(1),
            ultimoOuvido: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch { /* silencioso */ }
}

// 9. MENU DIREITO — inicializado após DOM estar pronto
function initMenus() {
    // Menu esquerdo (sidebar)
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    const overlay   = document.getElementById('sidebar-overlay');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (overlay)   overlay.addEventListener('click', toggleSidebar);

    // Menu direito (side-menu)
    const openBtn  = document.getElementById('open-menu');
    const closeEl  = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');

    if (openBtn && sideMenu) {
        openBtn.addEventListener('click', () => sideMenu.classList.remove('hidden'));
    }
    if (closeEl && sideMenu) {
        closeEl.addEventListener('click', () => sideMenu.classList.add('hidden'));
    }

    // Fechar side-menu ao clicar no overlay escuro
    if (sideMenu) {
        sideMenu.addEventListener('click', e => {
            if (e.target === sideMenu) sideMenu.classList.add('hidden');
        });
    }
}

// Correr quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenus);
} else {
    initMenus();
}

// 10. NOTIFICAÇÕES ADMIN (só na página admin)
function monitorarNotificacoes() {
    const badge = document.getElementById('notif-count');
    if (!badge) return;
    db.collection("contactos").where("lido", "==", false).onSnapshot(snap => {
        const n = snap.size;
        if (n > 0) {
            badge.innerText = n > 99 ? '+99' : n;
            badge.classList.remove('hidden');
            document.title = `(${n}) Painel General | Sons Bwé Fixe`;
        } else {
            badge.classList.add('hidden');
            document.title = 'Painel General | Sons Bwé Fixe';
        }
    });
}
monitorarNotificacoes();
