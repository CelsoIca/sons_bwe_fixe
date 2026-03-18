// =============================================
// INDEX-PAGE.JS — Lógica exclusiva do index
// =============================================

const ICONES_CAT = {
    'Album':   { icon: 'fa-compact-disc',  cor: 'text-orange-500' },
    'EP':      { icon: 'fa-layer-group',   cor: 'text-yellow-500' },
    'Single':  { icon: 'fa-bolt',          cor: 'text-[#EF3C54]'  },
    'Mixtape': { icon: 'fa-cassette-tape', cor: 'text-purple-500' },
};

// Categorias padrão já têm link fixo na sidebar
const CATS_PADRAO = ['Album', 'EP', 'Single', 'Mixtape'];

// =============================================
// 1. CATEGORIAS EXTRAS DINÂMICAS NA SIDEBAR
//    (apenas as que não são padrão)
// =============================================
db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
    const container = document.getElementById('cats-extras');
    if (!container) return;
    container.innerHTML = '';

    snap.forEach(doc => {
        const cat = doc.data();
        if (CATS_PADRAO.includes(cat.nome)) return; // já tem link fixo

        const cfg = ICONES_CAT[cat.nome] || { icon: 'fa-music', cor: 'text-blue-400' };
        const a = document.createElement('a');
        a.href = `categoria.html?tipo=${encodeURIComponent(cat.nome)}`;
        a.className = 'category-link w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-left';
        a.innerHTML = `
            <i class="fa-solid ${cfg.icon} ${cfg.cor}"></i>
            <span class="text-sm font-bold group-hover:text-white text-gray-400">${cat.nome}s</span>`;
        container.appendChild(a);
    });
});

// =============================================
// 2. SLIDESHOW
// =============================================
let slideshowInterval = null;
let slideshowIndex = 0;

function iniciarSlideshow() {
    const capas = playlistOriginal.map(m => m.capa).filter(c => c && c.trim() !== '');
    const unicas = [...new Set(capas)];
    if (unicas.length === 0) return;

    const container = document.getElementById('slideshow');
    if (!container) return;
    container.innerHTML = '';

    unicas.forEach((capa, i) => {
        const div = document.createElement('div');
        div.className = 'slide' + (i === 0 ? ' active' : '');
        div.innerHTML = `<img src="${capa}" class="w-full h-full object-cover" onerror="this.parentElement.remove()">`;
        container.appendChild(div);
    });

    clearInterval(slideshowInterval);
    slideshowIndex = 0;
    slideshowInterval = setInterval(() => {
        const slides = container.querySelectorAll('.slide');
        if (!slides.length) return;
        slides[slideshowIndex % slides.length].classList.remove('active');
        slideshowIndex = (slideshowIndex + 1) % slides.length;
        slides[slideshowIndex].classList.add('active');
    }, 3000);
}

function pararSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
}

function mostrarSlideshowOuCapa(musicaTocando) {
    const coverEl = document.getElementById('main-cover');
    const slideshowEl = document.getElementById('slideshow');
    if (!coverEl || !slideshowEl) return;

    if (musicaTocando) {
        coverEl.style.opacity = '1';
        coverEl.style.zIndex = '10';
        slideshowEl.style.opacity = '0';
        pararSlideshow();
    } else {
        coverEl.style.opacity = '0';
        coverEl.style.zIndex = '0';
        slideshowEl.style.opacity = '1';
        iniciarSlideshow();
    }
}

// =============================================
// 3. LISTA DE FAIXAS
// =============================================
function renderizarListaFaixas() {
    const lista = document.getElementById('lista-faixas');
    const totalEl = document.getElementById('total-faixas');
    if (!lista) return;

    if (totalEl) totalEl.innerText = playlist.length + ' faixas';
    lista.innerHTML = '';

    if (playlist.length === 0) {
        lista.innerHTML = '<p class="text-center text-gray-600 text-xs py-8 italic">Nenhuma faixa disponível.</p>';
        return;
    }

    playlist.forEach((m, i) => {
        const isAtual = i === indexMusica && audio && audio.src;
        const div = document.createElement('div');
        div.id = 'faixa-' + i;
        div.className = 'faixa-item px-5 py-4 flex items-center gap-4 cursor-pointer' + (isAtual ? ' playing' : '');
        div.onclick = () => {
            renderizarMusica(i);
            audio.play();
            if (playBtn) {
                playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                playBtn.classList.add('animate-pulse-pink');
            }
            mostrarSlideshowOuCapa(true);
            atualizarFaixaAtiva(i);
        };
        div.innerHTML = `
            <div class="w-6 flex items-center justify-center flex-shrink-0">
                <span class="faixa-num text-[10px] text-gray-600 font-black">${i + 1}</span>
                <div class="faixa-eq">
                    <span></span><span></span><span></span>
                </div>
            </div>
            <img src="${m.capa || 'assets/default.png'}" class="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
            <div class="flex-1 overflow-hidden">
                <p class="text-xs font-black text-white truncate">${m.titulo}</p>
                <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
            </div>
            <a href="categoria.html?tipo=${encodeURIComponent(m.tipo || 'Single')}"
               onclick="event.stopPropagation()"
               class="text-[8px] text-gray-600 font-bold uppercase flex-shrink-0 hover:text-[#EF3C54] transition px-2 py-1 rounded-lg hover:bg-white/5">
               ${m.tipo || 'Single'}
            </a>`;
        lista.appendChild(div);
    });
}

function atualizarFaixaAtiva(idx) {
    document.querySelectorAll('.faixa-item').forEach((el, i) => {
        el.classList.toggle('playing', i === idx);
    });
}

// =============================================
// 4. HOOKS NOS EVENTOS DO ÁUDIO
// =============================================
window.addEventListener('load', () => {
    const audioEl = document.getElementById('main-audio');
    if (!audioEl) return;

    audioEl.addEventListener('play',  () => mostrarSlideshowOuCapa(true));
    audioEl.addEventListener('pause', () => mostrarSlideshowOuCapa(false));
    audioEl.addEventListener('ended', () => mostrarSlideshowOuCapa(false));

    // Arrancar slideshow após 1.5s (dá tempo ao Firebase carregar)
    setTimeout(() => {
        if (!audioEl.src || audioEl.paused) mostrarSlideshowOuCapa(false);
    }, 1500);
});

// =============================================
// 5. HOOK NO renderizarMusica do script.js
//    (actualiza a faixa activa na lista)
// =============================================
window.addEventListener('load', () => {
    const orig = window.renderizarMusica;
    if (typeof orig === 'function') {
        window.renderizarMusica = function(i) {
            orig(i);
            setTimeout(() => atualizarFaixaAtiva(i), 50);
        };
    }
});
