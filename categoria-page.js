// =============================================
// CATEGORIA-PAGE.JS
// Tudo carregado do Firebase — suporta qualquer
// categoria criada pelo admin, não só as padrão.
// =============================================

const params    = new URLSearchParams(window.location.search);
const CATEGORIA = params.get('tipo') || '';

// Redirecionar se não houver tipo na URL
if (!CATEGORIA) { window.location.href = 'index.html'; }

// =============================================
// 1. CONFIGURAR PÁGINA COM DADOS DO FIREBASE
//    (título, ícone, cor — vindos da colecção
//    "categorias", não de um mapa hardcoded)
// =============================================
function configurarPagina(cat) {
    // Mapa de cores por ícone para dar variedade visual
    const COR_POR_ICONE = {
        'fa-compact-disc':  { bg: 'bg-orange-500/20', cor: 'text-orange-400' },
        'fa-layer-group':   { bg: 'bg-yellow-500/20', cor: 'text-yellow-400' },
        'fa-bolt':          { bg: 'bg-[#EF3C54]/20',  cor: 'text-[#EF3C54]'  },
        'fa-cassette-tape': { bg: 'bg-purple-500/20', cor: 'text-purple-400' },
        'fa-microphone':    { bg: 'bg-pink-500/20',   cor: 'text-pink-400'   },
        'fa-star':          { bg: 'bg-yellow-400/20', cor: 'text-yellow-300' },
        'fa-fire':          { bg: 'bg-red-500/20',    cor: 'text-red-400'    },
        'fa-headphones':    { bg: 'bg-blue-500/20',   cor: 'text-blue-400'   },
        'fa-guitar':        { bg: 'bg-green-500/20',  cor: 'text-green-400'  },
        'fa-drum':          { bg: 'bg-indigo-500/20', cor: 'text-indigo-400' },
        'fa-record-vinyl':  { bg: 'bg-teal-500/20',   cor: 'text-teal-400'   },
        'fa-radio':         { bg: 'bg-cyan-500/20',   cor: 'text-cyan-400'   },
        'fa-music':         { bg: 'bg-blue-500/20',   cor: 'text-blue-400'   },
    };

    const icone = cat ? (cat.icone || 'fa-music') : 'fa-music';
    const cores = COR_POR_ICONE[icone] || { bg: 'bg-blue-500/20', cor: 'text-blue-400' };
    const nome  = cat ? cat.nome : CATEGORIA;

    document.title = `${nome}s | Sons Bwé Fixe`;

    const titulo = document.getElementById('cat-titulo');
    const icon   = document.getElementById('cat-icon');
    const iconBg = document.getElementById('cat-icon-bg');

    if (titulo) titulo.innerText = nome + 's';
    if (icon)   icon.className   = `fa-solid ${icone} ${cores.cor}`;
    if (iconBg) iconBg.className = `w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${cores.bg}`;
}

// Buscar a configuração desta categoria no Firebase
db.collection("categorias")
    .where("nome", "==", CATEGORIA)
    .limit(1)
    .get()
    .then(snap => {
        if (!snap.empty) {
            configurarPagina(snap.docs[0].data());
        } else {
            // Categoria não encontrada no Firebase — usar defaults visuais
            configurarPagina(null);
        }
    });

// =============================================
// 2. SIDEBAR — todas as categorias do Firebase
//    (em tempo real: aparece logo que o admin cria)
// =============================================
db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
    const nav = document.getElementById('nav-categorias');
    if (!nav) return;

    // Manter só o parágrafo "Categorias" e o link "Tudo"
    const fixos = Array.from(nav.children).filter(el =>
        el.tagName === 'P' || (el.tagName === 'A' && el.href.includes('index.html'))
    );
    nav.innerHTML = '';
    fixos.forEach(el => nav.appendChild(el));

    snap.forEach(doc => {
        const cat = doc.data();
        const isActive = cat.nome === CATEGORIA;

        const COR_ICONE = {
            'fa-compact-disc': 'text-orange-500', 'fa-layer-group': 'text-yellow-500',
            'fa-bolt': 'text-[#EF3C54]',          'fa-cassette-tape': 'text-purple-500',
            'fa-microphone': 'text-pink-400',      'fa-star': 'text-yellow-300',
            'fa-fire': 'text-red-400',             'fa-headphones': 'text-blue-400',
            'fa-guitar': 'text-green-400',         'fa-drum': 'text-indigo-400',
            'fa-record-vinyl': 'text-teal-400',    'fa-radio': 'text-cyan-400',
            'fa-music': 'text-blue-400',
        };
        const corIcone = COR_ICONE[cat.icone || 'fa-music'] || 'text-blue-400';

        const a = document.createElement('a');
        a.href      = `categoria.html?tipo=${encodeURIComponent(cat.nome)}`;
        a.className = `category-link w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-left${isActive ? ' sidebar-link-active' : ''}`;
        a.innerHTML = `
            <i class="fa-solid ${cat.icone || 'fa-music'} ${corIcone}"></i>
            <span class="text-sm font-bold group-hover:text-white ${isActive ? 'text-white' : 'text-gray-400'}">${cat.nome}s</span>`;
        nav.appendChild(a);
    });
});

// =============================================
// 3. PLAYER LOCAL
// =============================================
let catPlaylist  = [];
let catIndex     = 0;
const audioEl    = document.getElementById('main-audio');
const miniPlayer = document.getElementById('mini-player');
const miniPlayBtn  = document.getElementById('mini-play-btn');
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
    const m  = catPlaylist[idx];
    audioEl.src = m.url;
    audioEl.play();
    miniPlayer.classList.add('visible');
    miniPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-sm"></i>';
    document.getElementById('mini-title').innerText  = m.titulo;
    document.getElementById('mini-artist').innerText = m.artista;
    document.getElementById('mini-cover').src = m.capa || 'assets/default.png';

    document.querySelectorAll('.card-musica').forEach((c, i) => {
        const ind = c.querySelector('.playing-indicator');
        if (ind) ind.classList.toggle('hidden', i !== idx);
        c.classList.toggle('ring-2',                    i === idx);
        c.classList.toggle('ring-[#EF3C54]',            i === idx);
        c.classList.toggle('ring-offset-1',             i === idx);
        c.classList.toggle('ring-offset-[#020617]',     i === idx);
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
// 4. MÚSICAS DA CATEGORIA (tempo real)
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

    if (count) count.innerText = lista.length + (lista.length === 1 ? ' faixa' : ' faixas');

    if (lista.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = '';

    lista.forEach((m, i) => {
        const isActivo = (i === catIndex && audioEl.src && !audioEl.paused);
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
// 5. PESQUISA
// =============================================
function pesquisarNaCategoria() {
    const termo = document.getElementById('search-cat').value.trim().toLowerCase();
    if (!termo) { renderizarGrid(catPlaylist); return; }
    renderizarGrid(catPlaylist.filter(m =>
        m.titulo.toLowerCase().includes(termo) || m.artista.toLowerCase().includes(termo)
    ));
}
