// =============================================
// CATEGORIA-PAGE.JS
// =============================================

// ── Utilitários ──────────────────────────────
function fmtDur(seg) {
    if (!seg||seg<=0) return null;
    const m=Math.floor(seg/60),s=Math.floor(seg%60);
    return `${m}:${s<10?'0':''}${s}`;
}
function fmtDataCurta(ts) {
    if (!ts?.toDate) return null;
    return ts.toDate().toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
}

const COR_ICONE = {
    'fa-compact-disc':'text-orange-500','fa-layer-group':'text-yellow-500',
    'fa-bolt':'text-[#EF3C54]','fa-cassette-tape':'text-purple-500',
    'fa-microphone':'text-pink-400','fa-star':'text-yellow-300',
    'fa-fire':'text-red-400','fa-headphones':'text-blue-400',
    'fa-guitar':'text-green-400','fa-drum':'text-indigo-400',
    'fa-record-vinyl':'text-teal-400','fa-radio':'text-cyan-400',
    'fa-music':'text-blue-400',
};
const COR_BG = {
    'fa-compact-disc':'bg-orange-500/20','fa-layer-group':'bg-yellow-500/20',
    'fa-bolt':'bg-[#EF3C54]/20','fa-cassette-tape':'bg-purple-500/20',
    'fa-microphone':'bg-pink-500/20','fa-star':'bg-yellow-400/20',
    'fa-fire':'bg-red-500/20','fa-headphones':'bg-blue-500/20',
    'fa-guitar':'bg-green-500/20','fa-drum':'bg-indigo-500/20',
    'fa-record-vinyl':'bg-teal-500/20','fa-radio':'bg-cyan-500/20',
    'fa-music':'bg-blue-500/20',
};

// ── URL params ───────────────────────────────
const params       = new URLSearchParams(window.location.search);
const CATEGORIA    = params.get('tipo') || '';
const SUBCATEGORIA = params.get('sub')  || '';
const MODO_TODAS   = !CATEGORIA; // ?tipo= vazio → modo "Todas as categorias"

if (!CATEGORIA && !MODO_TODAS) { window.location.href = 'index.html'; }

// =============================================
// 1. CONFIGURAR CABEÇALHO DA PÁGINA
// =============================================
function configurarCabecalho(cat) {
    const icone = cat?.icone || 'fa-music';
    const cores = { bg: COR_BG[icone]||'bg-blue-500/20', cor: COR_ICONE[icone]||'text-blue-400' };
    const nome  = MODO_TODAS ? 'Todas as Categorias' : (cat?.nome || CATEGORIA);

    document.title = `${nome} | Sons Bwé Fixe`;

    const t  = document.getElementById('cat-titulo');
    const ic = document.getElementById('cat-icon');
    const ib = document.getElementById('cat-icon-bg');

    if (t)  t.innerText    = MODO_TODAS ? 'Explorar Categorias' : nome + 's';
    if (ic) ic.className   = `fa-solid ${MODO_TODAS ? 'fa-layer-group text-[#2E5EBE]' : icone+' '+cores.cor}`;
    if (ib) ib.className   = `w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${MODO_TODAS ? 'bg-blue-500/20' : cores.bg}`;
}

if (MODO_TODAS) {
    configurarCabecalho(null);
    // Destacar link "Todas" na sidebar
    const linkTodas = document.getElementById('link-todas');
    if (linkTodas) {
        linkTodas.classList.add('sidebar-link-active');
        const span = linkTodas.querySelector('span');
        if (span) span.classList.replace('text-gray-400', 'text-white');
    }
} else {
    db.collection("categorias").where("nome","==",CATEGORIA).limit(1).get()
        .then(s => configurarCabecalho(s.empty ? null : s.docs[0].data()));
}

// =============================================
// 2. SIDEBAR — todas as categorias (tempo real)
// =============================================
db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
    const nav = document.getElementById('nav-categorias');
    if (!nav) return;

    // Manter parágrafo + link "Tudo"
    const fixos = Array.from(nav.children).filter(el => el.tagName==='P'||(el.tagName==='A'&&el.href.includes('index.html')));
    nav.innerHTML='';
    fixos.forEach(el=>nav.appendChild(el));

    snap.forEach(doc => {
        const cat = doc.data();
        const isActive = !MODO_TODAS && cat.nome === CATEGORIA;
        const cor = COR_ICONE[cat.icone||'fa-music']||'text-blue-400';
        const a = document.createElement('a');
        a.href = `categoria.html?tipo=${encodeURIComponent(cat.nome)}`;
        a.className = `category-link w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-left${isActive?' sidebar-link-active':''}`;
        a.innerHTML = `<i class="fa-solid ${cat.icone||'fa-music'} ${cor}"></i>
            <span class="text-sm font-bold group-hover:text-white ${isActive?'text-white':'text-gray-400'}">${cat.nome}s</span>`;
        nav.appendChild(a);
    });
});

// =============================================
// 3. PLAYER LOCAL
// =============================================
let catPlaylist=[], catIndex=0;
const audioEl    = document.getElementById('main-audio');
const miniPlayer = document.getElementById('mini-player');
const miniPlayBtn  = document.getElementById('mini-play-btn');
const miniProgress = document.getElementById('mini-progress');

audioEl.ontimeupdate = () => {
    if (!isNaN(audioEl.duration)) {
        miniProgress.value = (audioEl.currentTime/audioEl.duration)*100;
        document.getElementById('mini-current').innerText = fmtDurSec(audioEl.currentTime);
        document.getElementById('mini-duration').innerText = fmtDurSec(audioEl.duration);
    }
};
miniProgress.oninput = () => { audioEl.currentTime = (miniProgress.value/100)*audioEl.duration; };
audioEl.onended = () => proximaMusicaCat();

function fmtDurSec(s) { const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; }

function tocarMusica(idx) {
    catIndex=idx;
    const m=catPlaylist[idx];
    audioEl.src=m.url; audioEl.play();
    miniPlayer.classList.add('visible');
    miniPlayBtn.innerHTML='<i class="fa-solid fa-pause text-sm"></i>';
    document.getElementById('mini-title').innerText  = m.titulo;
    document.getElementById('mini-artist').innerText = m.artista;
    document.getElementById('mini-cover').src = m.capa||'assets/default.png';
    // Destacar linha activa
    document.querySelectorAll('.faixa-cat').forEach((el,i) => el.classList.toggle('playing', i===idx));
}

function togglePlayCat() {
    if (!audioEl.src) return;
    if (audioEl.paused) { audioEl.play(); miniPlayBtn.innerHTML='<i class="fa-solid fa-pause text-sm"></i>'; }
    else { audioEl.pause(); miniPlayBtn.innerHTML='<i class="fa-solid fa-play text-sm"></i>'; }
}
function proximaMusicaCat() { if (!catPlaylist.length) return; catIndex=(catIndex+1)%catPlaylist.length; tocarMusica(catIndex); }
function musicaAnteriorCat() { if (!catPlaylist.length) return; catIndex=(catIndex-1+catPlaylist.length)%catPlaylist.length; tocarMusica(catIndex); }

// =============================================
// 4A. MODO: UMA CATEGORIA — lista vertical
// =============================================
function renderizarListaVertical(lista) {
    const grid  = document.getElementById('grid-musicas');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('cat-count');

    if (count) count.innerText = lista.length + (lista.length===1?' faixa':' faixas');

    if (!lista.length) { grid.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    grid.innerHTML='';

    lista.forEach((m, i) => {
        const dur  = fmtDur(m.duracao);
        const pub  = fmtDataCurta(m.dataPublicacao||m.dataCriacao);
        const prod = fmtDataCurta(m.dataProducao);
        const vis  = m.visualizacoes ? m.visualizacoes.toLocaleString('pt-PT') : null;

        const div = document.createElement('div');
        div.className = 'faixa-cat px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition border-b border-white/5 last:border-0';
        div.onclick = () => tocarMusica(i);
        div.innerHTML = `
            <div class="w-6 flex-shrink-0 text-center">
                <span class="text-[10px] text-gray-600 font-black">${i+1}</span>
            </div>
            <img src="${m.capa||'assets/default.png'}" class="w-12 h-12 rounded-xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
            <div class="flex-1 overflow-hidden">
                <p class="text-sm font-black text-white truncate">${m.titulo}</p>
                <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                <div class="flex items-center gap-3 mt-1 flex-wrap">
                    ${dur  ? `<span class="flex items-center gap-1 text-[8px] text-gray-600 font-bold"><i class="fa-solid fa-clock text-[#EF3C54]"></i>${dur}</span>` : ''}
                    ${vis  ? `<span class="flex items-center gap-1 text-[8px] text-gray-600 font-bold"><i class="fa-solid fa-eye text-[#2E5EBE]"></i>${vis}</span>` : ''}
                    ${prod ? `<span class="flex items-center gap-1 text-[8px] text-gray-600 font-bold"><i class="fa-solid fa-compact-disc text-gray-700"></i>Prod: ${prod}</span>` : ''}
                    ${pub  ? `<span class="flex items-center gap-1 text-[8px] text-gray-600 font-bold"><i class="fa-solid fa-calendar-check text-emerald-600"></i>Pub: ${pub}</span>` : ''}
                </div>
            </div>
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[#EF3C54]/10 flex items-center justify-center group-hover:bg-[#EF3C54] transition">
                <i class="fa-solid fa-play text-[#EF3C54] text-xs ml-0.5"></i>
            </div>`;
        grid.appendChild(div);
    });
}

// =============================================
// 4B. MODO: TODAS AS CATEGORIAS — accordion
// =============================================
async function renderizarTodasCategorias() {
    const grid  = document.getElementById('grid-musicas');
    const count = document.getElementById('cat-count');
    const empty = document.getElementById('empty-state');
    grid.className = 'space-y-3'; // lista vertical, sem grid

    // Buscar categorias
    const catsSnap = await db.collection("categorias").orderBy("ordem").get();
    if (catsSnap.empty) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    // Buscar todas as músicas visíveis
    const musicasSnap = await db.collection("playlist").where("oculto","==",false).get();
    const todasMusicas = musicasSnap.docs.map(d => ({id:d.id,...d.data()}));

    // Agrupar por categoria
    const grupos = {};
    catsSnap.forEach(doc => { grupos[doc.data().nome] = { cat: doc.data(), musicas: [] }; });
    todasMusicas.forEach(m => { if (grupos[m.tipo]) grupos[m.tipo].musicas.push(m); });

    // Ordenar músicas dentro de cada grupo
    Object.values(grupos).forEach(g => g.musicas.sort((a,b)=>(b.ordem||0)-(a.ordem||0)));

    const totalMusicas = todasMusicas.length;
    if (count) count.innerText = `${Object.keys(grupos).length} categorias · ${totalMusicas} faixas`;

    grid.innerHTML = '';

    Object.entries(grupos).forEach(([nomeCat, grupo]) => {
        const { cat, musicas } = grupo;
        const icone = cat.icone || 'fa-music';
        const cor   = COR_ICONE[icone] || 'text-blue-400';
        const bg    = COR_BG[icone]    || 'bg-blue-500/20';
        const catId = 'acc-' + nomeCat.replace(/\s+/g,'_');

        const bloco = document.createElement('div');
        bloco.className = 'glass rounded-[1.5rem] border border-white/5 overflow-hidden';
        bloco.innerHTML = `
            <!-- Cabeçalho clicável -->
            <div class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition select-none"
                 onclick="toggleAccordion('${catId}')">
                <div class="w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid ${icone} ${cor} text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="font-black text-sm text-white">${nomeCat}s</p>
                    <p class="text-[9px] text-gray-500 font-bold uppercase">${musicas.length} faixa${musicas.length!==1?'s':''}</p>
                </div>
                <div class="flex items-center gap-3">
                    <a href="categoria.html?tipo=${encodeURIComponent(nomeCat)}" onclick="event.stopPropagation()"
                       class="text-[9px] text-[#2E5EBE] font-bold hover:underline">Ver todas ↗</a>
                    <i class="fa-solid fa-chevron-down text-gray-500 text-xs transition-transform" id="chevron-${catId}"></i>
                </div>
            </div>
            <!-- Lista de faixas (escondida por defeito) -->
            <div id="${catId}" class="hidden border-t border-white/5 divide-y divide-white/5">
                ${musicas.length === 0
                    ? `<p class="text-center text-gray-700 text-xs italic py-6">Nenhuma faixa publicada nesta categoria.</p>`
                    : musicas.map((m, i) => {
                        const dur  = fmtDur(m.duracao);
                        const pub  = fmtDataCurta(m.dataPublicacao||m.dataCriacao);
                        const prod = fmtDataCurta(m.dataProducao);
                        const vis  = m.visualizacoes ? m.visualizacoes.toLocaleString('pt-PT') : null;
                        return `
                        <div class="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition faixa-acc"
                             data-cat="${nomeCat}" data-idx="${i}" onclick="tocarDaListaGlobal(this)">
                            <span class="text-[10px] text-gray-700 font-black w-5 text-center flex-shrink-0">${i+1}</span>
                            <img src="${m.capa||'assets/default.png'}" class="w-10 h-10 rounded-xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
                            <div class="flex-1 overflow-hidden">
                                <p class="text-xs font-black text-white truncate">${m.titulo}</p>
                                <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                                <div class="flex items-center gap-3 mt-1 flex-wrap">
                                    ${dur  ? `<span class="text-[8px] text-gray-600 font-bold flex items-center gap-1"><i class="fa-solid fa-clock text-[#EF3C54]"></i>${dur}</span>` : ''}
                                    ${vis  ? `<span class="text-[8px] text-gray-600 font-bold flex items-center gap-1"><i class="fa-solid fa-eye text-[#2E5EBE]"></i>${vis}</span>` : ''}
                                    ${prod ? `<span class="text-[8px] text-gray-600 font-bold flex items-center gap-1"><i class="fa-solid fa-compact-disc text-gray-700"></i>Prod: ${prod}</span>` : ''}
                                    ${pub  ? `<span class="text-[8px] text-gray-600 font-bold flex items-center gap-1"><i class="fa-solid fa-calendar-check text-emerald-600"></i>Pub: ${pub}</span>` : ''}
                                </div>
                            </div>
                            <i class="fa-solid fa-play text-[#EF3C54] text-xs flex-shrink-0"></i>
                        </div>`;
                    }).join('')
                }
            </div>`;
        grid.appendChild(bloco);
    });

    // Guardar dados globais para o player do accordion
    window._gruposAcc = grupos;
}

// Toggle accordion
function toggleAccordion(id) {
    const el  = document.getElementById(id);
    const ch  = document.getElementById('chevron-' + id);
    if (!el) return;
    const open = !el.classList.contains('hidden');
    el.classList.toggle('hidden', open);
    if (ch) ch.style.transform = open ? '' : 'rotate(180deg)';
}

// Tocar faixa do accordion (modo "Todas")
function tocarDaListaGlobal(row) {
    const nomeCat = row.dataset.cat;
    const idx     = parseInt(row.dataset.idx);
    const grupo   = window._gruposAcc?.[nomeCat];
    if (!grupo) return;

    catPlaylist = grupo.musicas;
    tocarMusica(idx);

    // Highlight na linha
    document.querySelectorAll('.faixa-acc').forEach(el => el.classList.remove('bg-white/10'));
    row.classList.add('bg-white/10');
}

// =============================================
// 5. CARREGAR MÚSICAS DO FIREBASE
// =============================================
if (MODO_TODAS) {
    // Modo accordion — todas as categorias
    renderizarTodasCategorias();
} else {
    // Modo lista — uma categoria específica
    const grid = document.getElementById('grid-musicas');
    if (grid) grid.className = 'divide-y divide-white/5'; // lista vertical

    db.collection("playlist")
        .where("oculto","==",false)
        .where("tipo","==",CATEGORIA)
        .orderBy("ordem","desc")
        .onSnapshot(
            snap => {
                let docs = snap.docs.map(d=>({id:d.id,...d.data()}));
                if (SUBCATEGORIA) docs = docs.filter(d=>d.subcategoria===SUBCATEGORIA);
                catPlaylist = docs;
                renderizarListaVertical(catPlaylist);
                carregarSubcategoriasNav();
            },
            err => {
                db.collection("playlist").where("oculto","==",false).where("tipo","==",CATEGORIA)
                    .onSnapshot(snap => {
                        let docs = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.ordem||0)-(a.ordem||0));
                        if (SUBCATEGORIA) docs = docs.filter(d=>d.subcategoria===SUBCATEGORIA);
                        catPlaylist = docs;
                        renderizarListaVertical(catPlaylist);
                        carregarSubcategoriasNav();
                    });
            }
        );
}

// Filtros de subcategoria
function carregarSubcategoriasNav() {
    const grid = document.getElementById('grid-musicas');
    if (!grid) return;
    db.collection("subcategorias").get().then(snap => {
        const subs = snap.docs.map(d=>d.data()).filter(s=>s.pai===CATEGORIA);
        if (!subs.length) return;
        const filtrosId = 'subcat-filtros';
        let filtrosEl = document.getElementById(filtrosId);
        if (!filtrosEl) {
            filtrosEl = document.createElement('div');
            filtrosEl.id = filtrosId;
            filtrosEl.className = 'flex flex-wrap gap-2 mb-4';
            grid.parentElement.insertBefore(filtrosEl, grid);
        }
        filtrosEl.innerHTML = `
            <a href="categoria.html?tipo=${encodeURIComponent(CATEGORIA)}"
               class="px-4 py-2 rounded-full text-xs font-black uppercase transition ${!SUBCATEGORIA?'bg-[#EF3C54] text-white':'bg-white/5 text-gray-400 hover:bg-white/10'}">
               Todas</a>
            ${subs.map(s=>`
            <a href="categoria.html?tipo=${encodeURIComponent(CATEGORIA)}&sub=${encodeURIComponent(s.nome)}"
               class="px-4 py-2 rounded-full text-xs font-black uppercase transition ${SUBCATEGORIA===s.nome?'bg-[#2E5EBE] text-white':'bg-white/5 text-gray-400 hover:bg-white/10'}">
               ${s.nome}</a>`).join('')}`;
    }).catch(()=>{});
}

// Pesquisa
function pesquisarNaCategoria() {
    const termo = document.getElementById('search-cat')?.value.trim().toLowerCase();
    if (!CATEGORIA) return;
    if (!termo) { renderizarListaVertical(catPlaylist); return; }
    renderizarListaVertical(catPlaylist.filter(m =>
        m.titulo.toLowerCase().includes(termo)||m.artista.toLowerCase().includes(termo)
    ));
}
