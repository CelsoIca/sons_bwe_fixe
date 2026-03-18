// =============================================
// CATEGORIA-PAGE.JS — Lógica da página de categoria
// =============================================

const ICONES_CAT = {
    'Album':   { icon: 'fa-compact-disc',  bg: 'bg-orange-500/20', cor: 'text-orange-400' },
    'EP':      { icon: 'fa-layer-group',   bg: 'bg-yellow-500/20', cor: 'text-yellow-400' },
    'Single':  { icon: 'fa-bolt',          bg: 'bg-[#EF3C54]/20',  cor: 'text-[#EF3C54]' },
    'Mixtape': { icon: 'fa-cassette-tape', bg: 'bg-purple-500/20', cor: 'text-purple-400' },
};

const CATS_PADRAO = ['Album', 'EP', 'Single', 'Mixtape'];

// =============================================
// 1. LER TIPO DA URL E CONFIGURAR PÁGINA
// =============================================
const params   = new URLSearchParams(window.location.search);
const CATEGORIA = params.get('tipo') || 'Single';

const cfg = ICONES_CAT[CATEGORIA] || { icon: 'fa-music', bg: 'bg-blue-500/20', cor: 'text-blue-400' };

document.title = `${CATEGORIA}s | Sons Bwé Fixe`;
document.getElementById('cat-titulo').innerText = CATEGORIA + 's';
document.getElementById('cat-icon').className   = `fa-solid ${cfg.icon} ${cfg.cor}`;
document.getElementById('cat-icon-bg').className = `w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${cfg.bg}`;

// Destacar link activo na sidebar
const linkActivo = document.getElementById('link-' + CATEGORIA);
if (linkActivo) {
    linkActivo.classList.add('sidebar-link-active');
    linkActivo.querySelector('span').classList.replace('text-gray-400', 'text-white');
}

// =============================================
// 2. PLAYER LOCAL DA CATEGORIA
// =============================================
let catPlaylist = [];
let catIndex    = 0;
const audioEl   = document.getElementById('main-audio');
const miniPlayer = document.getElementById('mini-player');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniProgress = document.getElementById('mini-progress');

audioEl.ontimeupdate = () => {
    if (!isNaN(audioEl.duration)) {
        miniProgress.value = (audioEl.currentTime / audioEl.duration) * 100;
        document.getElementById('mini-current').innerText = fmt(audioEl.currentTime);
        document.getElementById('mini-duration').innerText = fmt(audioEl.duration);
    }
};
miniProgress.oninput = () => { audioEl.currentTime = (miniProgress.value / 100) * audioEl.duration; };
audioEl.onended = () => proximaMusicaCat();

function fmt(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function tocarMusica(idx) {
    catIndex = idx;
    const m = catPlaylist[idx];
    audioEl.src = m.url;
    audioEl.play();
    miniPlayer.classList.add('visible');
    miniPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-sm"></i>';
    document.getElementById('mini-title').innerText  = m.titulo;
    document.getElementById('mini-artist').innerText = m.artista;
    document.getElementById('mini-cover').src        = m.capa || 'assets/default.png';

    // Destacar card activo
    document.querySelectorAll('.card-musica').forEach((c, i) => {
        const overlay = c.querySelector('.playing-indicator');
        if (overlay) overlay.classList.toggle('hidden', i !== idx);
        c.classList.toggle('ring-2',          i === idx);
        c.classList.toggle('ring-[#EF3C54]',  i === idx);
        c.classList.toggle('ring-offset-1',   i === idx);
        c.classList.toggle('ring-offset-[#020617]', i === idx);
    });
}

function togglePlayCat() {
    if (!audioEl.src) return;
    if (audioEl.paused) {
        audioEl.play();
        miniPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-sm"></i>';
    } else {
        audioEl.pause();
        miniPlayBtn.innerHTML = '<i class="fa-solid fa-play text-sm"></i>';
    }
}

function proximaMusicaCat() {
    if (!catPlaylist.length) return;
    catIndex = (catIndex + 1) % catPlaylist.length;
    tocarMusica(catIndex);
}

function musicaAnteriorCat() {
    if (!catPlaylist.length) return;
    catIndex = (catIndex - 1 + catPlaylist.length) % catPlaylist.length;
    tocarMusica(catIndex);
}

// =============================================
// 3. CARREGAR MÚSICAS DO FIREBASE (em tempo real)
// =============================================
db.collection("playlist")
    .where("oculto", "==", false)
    .where("tipo", "==", CATEGORIA)
    .orderBy("ordem", "desc")
    .onSnapshot(snap => {
        catPlaylist = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarGrid(catPlaylist);
    });

function renderizarGrid(lista) {
    const grid  = document.getElementById('grid-musicas');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('cat-count');

    count.innerText = lista.length + (lista.length === 1 ? ' faixa' : ' faixas');

    if (lista.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = '';

    lista.forEach((m, i) => {
        const isActivo = i === catIndex && audioEl.src && !audioEl.paused;
        const card = document.createElement('div');
        card.className = 'card-musica cursor-pointer rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition group'
            + (isActivo ? ' ring-2 ring-[#EF3C54] ring-offset-1 ring-offset-[#020617]' : '');
        card.onclick = () => tocarMusica(i);
        card.innerHTML = `
            <div class="relative aspect-square overflow-hidden bg-black/30">
                <img src="${m.capa || 'assets/default.png'}" class="w-full h-full object-cover" onerror="this.src='assets/default.png'">
                <div class="play-overlay absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div class="w-12 h-12 rounded-full bg-[#EF3C54] flex items-center justify-center shadow-xl">
                        <i class="fa-solid fa-play text-white ml-1"></i>
                    </div>
                </div>
                <div class="playing-indicator ${isActivo ? '' : 'hidden'} absolute bottom-2 right-2 bg-[#EF3C54] rounded-full px-2 py-1 flex items-center gap-1">
                    <span class="w-1 h-3 bg-white rounded-full animate-bounce" style="animation-delay:0s"></span>
                    <span class="w-1 h-3 bg-white rounded-full animate-bounce" style="animation-delay:0.15s"></span>
                    <span class="w-1 h-3 bg-white rounded-full animate-bounce" style="animation-delay:0.3s"></span>
                </div>
            </div>
            <div class="p-3">
                <p class="text-xs font-black text-white truncate">${m.titulo}</p>
                <p class="text-[9px] text-gray-500 uppercase font-bold truncate mt-0.5">${m.artista}</p>
            </div>`;
        grid.appendChild(card);
    });
}

// =============================================
// 4. PESQUISA NA CATEGORIA
// =============================================
function pesquisarNaCategoria() {
    const termo = document.getElementById('search-cat').value.trim().toLowerCase();
    if (!termo) { renderizarGrid(catPlaylist); return; }
    const res = catPlaylist.filter(m =>
        m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo)
    );
    renderizarGrid(res);
}

// =============================================
// 5. CATEGORIAS EXTRAS NA SIDEBAR
//    (só as que não são padrão)
// =============================================
db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
    const container = document.getElementById('cats-extras');
    if (!container) return;
    container.innerHTML = '';

    snap.forEach(doc => {
        const cat = doc.data();
        if (CATS_PADRAO.includes(cat.nome)) return;

        const cfgExtra = ICONES_CAT[cat.nome] || { icon: 'fa-music', cor: 'text-blue-400' };
        const isActive = cat.nome === CATEGORIA;
        const a = document.createElement('a');
        a.href = `categoria.html?tipo=${encodeURIComponent(cat.nome)}`;
        a.className = `category-link w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-left${isActive ? ' sidebar-link-active' : ''}`;
        a.innerHTML = `
            <i class="fa-solid ${cfgExtra.icon} ${cfgExtra.cor}"></i>
            <span class="text-sm font-bold group-hover:text-white ${isActive ? 'text-white' : 'text-gray-400'}">${cat.nome}s</span>`;
        container.appendChild(a);
    });
});
