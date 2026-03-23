// =============================================
// INDEX-PAGE.JS — Lógica exclusiva do index
// =============================================

// ── Utilitários partilhados ──────────────────
function fmtDur(seg) {
    if (!seg || seg <= 0) return null;
    const m = Math.floor(seg / 60), s = Math.floor(seg % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
function fmtDataCurta(ts) {
    if (!ts?.toDate) return null;
    return ts.toDate().toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ── Cores por ícone ──────────────────────────
const COR_ICONE_INDEX = {
    'fa-compact-disc':'text-orange-500','fa-layer-group':'text-yellow-500',
    'fa-bolt':'text-[#EF3C54]','fa-cassette-tape':'text-purple-500',
    'fa-microphone':'text-pink-400','fa-star':'text-yellow-300',
    'fa-fire':'text-red-400','fa-headphones':'text-blue-400',
    'fa-guitar':'text-green-400','fa-drum':'text-indigo-400',
    'fa-record-vinyl':'text-teal-400','fa-radio':'text-cyan-400',
    'fa-music':'text-blue-400',
};

// =============================================
// 1. FILTROS NA SIDEBAR — funcionais inline
// =============================================
let _filtroActivo = 'all';

const CATS_FALLBACK = [
    { nome:'Album',   icone:'fa-compact-disc',  cor:'text-orange-500' },
    { nome:'EP',      icone:'fa-layer-group',   cor:'text-yellow-500' },
    { nome:'Single',  icone:'fa-bolt',          cor:'text-[#EF3C54]'  },
    { nome:'Mixtape', icone:'fa-cassette-tape', cor:'text-purple-500' },
];

// Aplica filtro e actualiza lista + player
function aplicarFiltro(tipo, btn) {
    _filtroActivo = tipo;

    // Destacar botão activo
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('sidebar-link-active');
        b.querySelector('span:first-of-type')?.classList.replace('text-white', 'text-gray-400');
    });
    if (btn) {
        btn.classList.add('sidebar-link-active');
        btn.querySelector('span:first-of-type')?.classList.replace('text-gray-400', 'text-white');
    }

    // Filtrar playlist
    playlist = tipo === 'all'
        ? [...playlistOriginal]
        : playlistOriginal.filter(m => m.tipo === tipo);

    // Actualizar lista e player
    if (typeof renderizarListaFaixas === 'function') renderizarListaFaixas();
    if (playlist.length > 0) renderizarMusica(0);

    // Fechar sidebar em mobile
    if (window.innerWidth < 768) toggleSidebar();
}

// Construir botões de filtro a partir das categorias do Firebase
function renderizarFiltrosCategorias(lista) {
    const container = document.getElementById('filtros-categorias');
    if (!container) return;
    container.innerHTML = '';

    lista.forEach(cat => {
        const cor = COR_ICONE_INDEX[cat.icone||'fa-music'] || cat.cor || 'text-blue-400';
        const count = playlistOriginal.filter(m => m.tipo === cat.nome).length;
        const isActive = _filtroActivo === cat.nome;

        const btn = document.createElement('button');
        btn.className = `filter-btn w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-left${isActive ? ' sidebar-link-active' : ''}`;
        btn.setAttribute('onclick', `aplicarFiltro('${cat.nome}', this)`);
        btn.innerHTML = `
            <i class="fa-solid ${cat.icone||'fa-music'} ${cor}"></i>
            <span class="text-sm font-bold group-hover:text-white ${isActive ? 'text-white' : 'text-gray-400'}">${cat.nome}s</span>
            ${count > 0 ? `<span class="ml-auto text-[9px] text-gray-600 font-black">${count}</span>` : ''}`;
        container.appendChild(btn);
    });

    // Actualizar badge do "Tudo"
    const badgeAll = document.getElementById('badge-all');
    if (badgeAll) badgeAll.innerText = playlistOriginal.length || '';
}

// Carregar categorias do Firebase e construir filtros
db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
    const lista = snap.empty ? CATS_FALLBACK : snap.docs.map(d => d.data());
    renderizarFiltrosCategorias(lista);
});

// Re-renderizar filtros quando playlist carrega (para mostrar contagens correctas)
const _origOnPlaylistLoad = window._onPlaylistLoad;
window._onPlaylistLoad = function() {
    if (_origOnPlaylistLoad) _origOnPlaylistLoad();
    // Actualizar contagens nos botões
    document.querySelectorAll('.filter-btn[onclick*="aplicarFiltro"]').forEach(btn => {
        const oc = btn.getAttribute('onclick') || '';
        const match = oc.match(/aplicarFiltro..([^']+)/);
        if (!match || match[1] === 'all') return;
        const tipo  = match[1];
        const count = playlistOriginal.filter(m => m.tipo === tipo).length;
        const badge = btn.querySelector('span:last-child');
        if (badge && badge !== btn.querySelector('span:first-of-type')) {
            badge.innerText = count > 0 ? count : '';
        }
    });
    const badgeAll = document.getElementById('badge-all');
    if (badgeAll) badgeAll.innerText = playlistOriginal.length || '';
};

// =============================================
// 2. SLIDESHOW
// =============================================
let slideshowInterval = null, slideshowIndex = 0;

function iniciarSlideshow() {
    const capas = [...new Set(playlistOriginal.map(m=>m.capa).filter(c=>c&&c.trim()))];
    const el = document.getElementById('slideshow');
    if (!el || !capas.length) return;
    el.innerHTML = '';
    capas.forEach((capa, i) => {
        const d = document.createElement('div');
        d.className = 'slide' + (i===0?' active':'');
        d.innerHTML = `<img src="${capa}" class="w-full h-full object-cover" onerror="this.parentElement.remove()">`;
        el.appendChild(d);
    });
    clearInterval(slideshowInterval);
    slideshowIndex = 0;
    slideshowInterval = setInterval(() => {
        const slides = el.querySelectorAll('.slide');
        if (!slides.length) return;
        slides[slideshowIndex%slides.length].classList.remove('active');
        slideshowIndex = (slideshowIndex+1)%slides.length;
        slides[slideshowIndex].classList.add('active');
    }, 3000);
}

function pararSlideshow() { clearInterval(slideshowInterval); slideshowInterval = null; }

function mostrarSlideshowOuCapa(tocando) {
    const coverEl = document.getElementById('main-cover');
    const slideshowEl = document.getElementById('slideshow');
    if (!coverEl || !slideshowEl) return;
    if (tocando) {
        coverEl.style.opacity='1'; coverEl.style.zIndex='10';
        slideshowEl.style.opacity='0'; pararSlideshow();
    } else {
        coverEl.style.opacity='0'; coverEl.style.zIndex='0';
        slideshowEl.style.opacity='1'; iniciarSlideshow();
    }
}

// =============================================
// 3. LISTA DE FAIXAS VERTICAL COM DETALHES
// =============================================
function renderizarListaFaixas() {
    const lista = document.getElementById('lista-faixas');
    const totalEl = document.getElementById('total-faixas');
    if (!lista) return;

    if (totalEl) totalEl.innerText = playlist.length + ' faixas';
    lista.innerHTML = '';

    if (!playlist.length) {
        lista.innerHTML = '<p class="text-center text-gray-600 text-xs py-8 italic">Nenhuma faixa disponível.</p>';
        return;
    }

    playlist.forEach((m, i) => {
        const isAtual = i === indexMusica && audio && audio.src;
        const dur  = fmtDur(m.duracao);
        const pub  = fmtDataCurta(m.dataPublicacao || m.dataCriacao);
        const prod = fmtDataCurta(m.dataProducao);
        const vis  = m.visualizacoes ? (m.visualizacoes).toLocaleString('pt-PT') : null;

        const div = document.createElement('div');
        div.id = 'faixa-' + i;
        div.className = 'faixa-item px-5 py-4 flex items-center gap-4 cursor-pointer' + (isAtual ? ' playing' : '');
        div.onclick = () => {
            renderizarMusica(i);
            audio.play();
            if (playBtn) { playBtn.innerHTML='<i class="fa-solid fa-pause"></i>'; playBtn.classList.add('animate-pulse-pink'); }
            mostrarSlideshowOuCapa(true);
            atualizarFaixaAtiva(i);
        };

        // Linha de detalhes (só mostra se tiver dados)
        const detalhes = [
            dur  ? `<span class="flex items-center gap-1"><i class="fa-solid fa-clock text-[#EF3C54]"></i>${dur}</span>` : '',
            vis  ? `<span class="flex items-center gap-1"><i class="fa-solid fa-eye text-[#2E5EBE]"></i>${vis}</span>` : '',
            prod ? `<span class="flex items-center gap-1"><i class="fa-solid fa-compact-disc text-gray-600"></i>${prod}</span>` : '',
            pub  ? `<span class="flex items-center gap-1"><i class="fa-solid fa-calendar-check text-emerald-500"></i>${pub}</span>` : '',
        ].filter(Boolean).join('');

        div.innerHTML = `
            <div class="w-6 flex items-center justify-center flex-shrink-0">
                <span class="faixa-num text-[10px] text-gray-600 font-black">${i+1}</span>
                <div class="faixa-eq"><span></span><span></span><span></span></div>
            </div>
            <img src="${m.capa||'assets/default.png'}" class="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
            <div class="flex-1 overflow-hidden">
                <p class="text-xs font-black text-white truncate">${m.titulo}</p>
                <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                ${detalhes ? `<div class="flex items-center gap-3 mt-1 flex-wrap text-[8px] text-gray-600 font-bold uppercase">${detalhes}</div>` : ''}
            </div>
            <a href="categoria.html?tipo=${encodeURIComponent(m.tipo||'Single')}" onclick="event.stopPropagation()"
               class="text-[8px] text-gray-600 font-bold uppercase flex-shrink-0 hover:text-[#EF3C54] transition px-2 py-1 rounded-lg hover:bg-white/5">
               ${m.tipo||'Single'}
            </a>`;
        lista.appendChild(div);
    });
}

function atualizarFaixaAtiva(idx) {
    document.querySelectorAll('.faixa-item').forEach((el,i) => el.classList.toggle('playing', i===idx));
}

// =============================================
// 4. HOOKS DE ÁUDIO
// =============================================
window.addEventListener('load', () => {
    const audioEl = document.getElementById('main-audio');
    if (!audioEl) return;
    audioEl.addEventListener('play',  () => mostrarSlideshowOuCapa(true));
    audioEl.addEventListener('pause', () => mostrarSlideshowOuCapa(false));
    audioEl.addEventListener('ended', () => mostrarSlideshowOuCapa(false));
    setTimeout(() => { if (!audioEl.src||audioEl.paused) mostrarSlideshowOuCapa(false); }, 1500);
});

window.addEventListener('load', () => {
    const orig = window.renderizarMusica;
    if (typeof orig==='function') {
        window.renderizarMusica = function(i) { orig(i); setTimeout(()=>atualizarFaixaAtiva(i),50); };
    }
});
