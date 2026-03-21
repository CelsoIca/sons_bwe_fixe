// ==========================================
// PAINEL DO GENERAL — admin.js
// ==========================================

// Mapa de ícones disponíveis
const ICONES_DISPONIVEIS = {
    'fa-bolt':          '⚡ Bolt',
    'fa-compact-disc':  '💿 Compact Disc',
    'fa-layer-group':   '📚 Layer Group',
    'fa-cassette-tape': '📼 Cassette',
    'fa-music':         '🎵 Music Note',
    'fa-microphone':    '🎤 Microphone',
    'fa-star':          '⭐ Star',
    'fa-fire':          '🔥 Fire',
    'fa-headphones':    '🎧 Headphones',
    'fa-guitar':        '🎸 Guitar',
    'fa-drum':          '🥁 Drum',
    'fa-record-vinyl':  '🎵 Vinyl',
    'fa-radio':         '📻 Radio',
};

// ==========================================
// 1. ARRANQUE — verificar acesso admin
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }

    try {
        const userDoc  = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        if (!userData || userData.ativo === false) {
            await auth.signOut(); window.location.href = "index.html";
            return;
        }

        if (userData.role === 'admin') {
            document.getElementById('admin-content').classList.remove('hidden');
            const err = document.getElementById('error-overlay');
            if (err) err.classList.add('hidden');

            carregarEstatisticas();
            monitorarNotificacoes();
            carregarCategoriasSelect();
            abrirAba('musicas');
            iniciarPreviewCategoria();
        } else {
            const err = document.getElementById('error-overlay');
            if (err) err.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Erro ao verificar acesso:", e);
    }
});


// Toast genérico para o painel admin
function showAdminToast(msg, tipo) {
    // Reutiliza catToast se existir, senão cria um toast temporário
    const existing = document.getElementById('cat-toast');
    if (existing) { catToast(msg, tipo); return; }
    const t = document.createElement('div');
    t.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl transition-all ${tipo === 'erro' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`;
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ==========================================
// UTILITÁRIOS DE FAIXAS
// ==========================================

// Formatar duração em segundos → M:SS
function fmtDuracao(seg) {
    if (!seg || seg <= 0) return '—';
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Formatar timestamp Firestore → DD/MM/AAAA
function fmtData(date) {
    if (!date) return '—';
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Detectar duração de um MP3 via URL (carrega em background)
function detectarDuracaoAudio(url) {
    return new Promise((resolve) => {
        const a = new Audio();
        const timeout = setTimeout(() => resolve(0), 8000); // máx 8s
        a.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            resolve(Math.round(a.duration) || 0);
        });
        a.addEventListener('error', () => { clearTimeout(timeout); resolve(0); });
        a.src = url;
        a.load();
    });
}

// Botão "detectar duração" para músicas já publicadas sem duração
async function detectarEGuardarDuracao(id, url) {
    showAdminToast('A detectar duração...');
    try {
        const dur = await detectarDuracaoAudio(url);
        if (dur > 0) {
            await db.collection("playlist").doc(id).update({ duracao: dur });
            showAdminToast(`Duração detectada: ${fmtDuracao(dur)}`);
        } else {
            showAdminToast('Não foi possível detectar. URL inválido?', 'erro');
        }
    } catch (e) {
        showAdminToast('Erro ao detectar duração.', 'erro');
    }
}

// ==========================================
// 2. PUBLICAR MÚSICA
// ==========================================
async function publicarMusicaAdmin() {
    const btn     = document.getElementById('btn-publicar');
    const titulo  = document.getElementById('adm-titulo').value.trim();
    const artista = document.getElementById('adm-artista').value.trim();
    const urlMp3  = document.getElementById('adm-url').value.trim();
    const tipo    = document.getElementById('adm-tipo').value;
    const inputCapa = document.getElementById('adm-ficheiro-capa');
    const file    = inputCapa ? inputCapa.files[0] : null;

    if (!titulo || !artista || !urlMp3) {
        return showAdminToast("Preenche o Título, Artista e o Link do Áudio!", "erro");
    }
    if (!tipo) {
        return showAdminToast("Selecciona uma categoria para esta música!", "erro");
    }

    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A PROCESSAR...';

    let urlFinalCapa = "";
    try {
        if (file) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A CARREGAR CAPA...';
            urlFinalCapa = await uploadParaImgBB(file);
            if (!urlFinalCapa) {
                showAdminToast("Erro no upload da capa.", "erro");
                btn.disabled = false;
                btn.innerHTML = textoOriginal;
                return;
            }
        }

        const subcategoria = document.getElementById('adm-subcategoria')?.value || '';

        // Detectar duração do MP3 automaticamente
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A DETECTAR DURAÇÃO...';
        let duracaoSegundos = 0;
        try {
            duracaoSegundos = await detectarDuracaoAudio(urlMp3);
        } catch (_) { duracaoSegundos = 0; }

        await db.collection("playlist").add({
            titulo, artista, url: urlMp3,
            capa: urlFinalCapa, tipo,
            subcategoria,
            oculto: false,
            ordem: Date.now(),
            duracao: duracaoSegundos,
            visualizacoes: 0,
            dataPublicacao: firebase.firestore.FieldValue.serverTimestamp(),
            dataCriacao:    firebase.firestore.FieldValue.serverTimestamp()
        });

        showAdminToast("✅ Música publicada com sucesso!");
        document.getElementById('adm-titulo').value    = '';
        document.getElementById('adm-artista').value   = '';
        document.getElementById('adm-url').value       = '';
        const capaNome = document.getElementById('capa-filename');
        if (capaNome) capaNome.innerText = 'Escolher ficheiro de imagem...';
        if (inputCapa) inputCapa.value = '';
        const subcatSel = document.getElementById('adm-subcategoria');
        if (subcatSel) { subcatSel.innerHTML = '<option value="">Sem subcategoria</option>'; }
        carregarMusicasAdmin();
    } catch (e) {
        console.error(e);
        showAdminToast("Erro ao salvar. Verifica a conexão.", "erro");
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ==========================================
// 3. LISTAR MÚSICAS (com filtro de categoria/subcategoria)
// ==========================================
let _musicasUnsubscribe = null;

function carregarMusicasAdmin() {
    const lista       = document.getElementById('adm-lista-musicas');
    const filtroCat   = document.getElementById('filtro-categoria')?.value || '';
    const filtroSub   = document.getElementById('filtro-subcategoria')?.value || '';

    if (_musicasUnsubscribe) { _musicasUnsubscribe(); _musicasUnsubscribe = null; }

    let query = db.collection("playlist").orderBy("ordem", "desc");

    _musicasUnsubscribe = query.onSnapshot(snap => {
        lista.innerHTML = "";
        let docs = snap.docs;

        // Filtrar localmente (evita índices compostos)
        if (filtroCat)  docs = docs.filter(d => d.data().tipo === filtroCat);
        if (filtroSub)  docs = docs.filter(d => d.data().subcategoria === filtroSub);

        if (!docs.length) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10 italic col-span-2'>Nenhuma música encontrada.</p>";
            return;
        }
        docs.forEach(doc => {
            const m   = doc.data();
            const dur = fmtDuracao(m.duracao || 0);
            const pub = m.dataPublicacao?.toDate ? fmtData(m.dataPublicacao.toDate()) : (m.dataCriacao?.toDate ? fmtData(m.dataCriacao.toDate()) : '—');
            const cri = m.dataCriacao?.toDate ? fmtData(m.dataCriacao.toDate()) : '—';
            const vis = (m.visualizacoes || 0).toLocaleString('pt-PT');

            lista.innerHTML += `
                <div class="glass rounded-[2rem] border border-white/5 hover:border-blue-500/20 transition overflow-hidden">
                    <!-- Linha principal -->
                    <div class="p-5 flex items-center gap-4">
                        <img src="${m.capa || 'assets/default.png'}" class="w-14 h-14 rounded-2xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
                        <div class="flex-1 overflow-hidden">
                            <h4 class="font-black text-sm text-white truncate">${m.titulo}</h4>
                            <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                                <span class="text-[8px] font-black ${m.oculto ? 'text-red-400' : 'text-emerald-400'} uppercase">${m.oculto ? 'OCULTO' : 'VISÍVEL'}</span>
                                <a href="categoria.html?tipo=${encodeURIComponent(m.tipo || '')}" target="_blank"
                                   class="text-[8px] font-black text-[#2E5EBE] hover:underline uppercase">${m.tipo || '—'} ↗</a>
                                ${m.subcategoria ? `<span class="text-[8px] font-black text-purple-400 uppercase">${m.subcategoria}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col gap-2 flex-shrink-0">
                            <button onclick="abrirModalMover('${doc.id}')"
                                class="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center hover:bg-blue-500/20 transition" title="Mover">
                                <i class="fa-solid fa-arrows-up-down-left-right text-xs text-blue-400"></i>
                            </button>
                            <button onclick="toggleOcultarMusica('${doc.id}', ${m.oculto})"
                                class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition" title="${m.oculto ? 'Mostrar' : 'Ocultar'}">
                                <i class="fa-solid ${m.oculto ? 'fa-eye' : 'fa-eye-slash'} text-xs text-gray-400"></i>
                            </button>
                            <button onclick="apagarMusica('${doc.id}')"
                                class="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition" title="Apagar">
                                <i class="fa-solid fa-trash-can text-xs text-red-500"></i>
                            </button>
                        </div>
                    </div>
                    <!-- Barra de detalhes -->
                    <div class="px-5 pb-4 flex items-center gap-4 flex-wrap border-t border-white/5 pt-3">
                        <div class="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase">
                            <i class="fa-solid fa-clock text-[#EF3C54]"></i>
                            <span class="text-white">${dur}</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase">
                            <i class="fa-solid fa-eye text-[#2E5EBE]"></i>
                            <span class="text-white">${vis}</span>
                            <span>plays</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase">
                            <i class="fa-solid fa-calendar-plus text-emerald-400"></i>
                            <span>${pub}</span>
                        </div>
                        ${dur === '—' ? `
                        <button onclick="detectarEGuardarDuracao('${doc.id}', '${m.url}')"
                            class="ml-auto text-[8px] text-gray-600 hover:text-blue-400 font-bold uppercase transition flex items-center gap-1" title="Detectar duração">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> detectar duração
                        </button>` : ''}
                    </div>
                </div>`;
        });
    });
}

async function toggleOcultarMusica(id, ocultoAtual) {
    await db.collection("playlist").doc(id).update({ oculto: !ocultoAtual });
}

async function apagarMusica(id) {
    if (confirm("Apagar esta música definitivamente?")) {
        await db.collection("playlist").doc(id).delete();
    }
}

// ==========================================
// 4. PARCERIAS / CONTACTOS
// ==========================================
function carregarParcerias() {
    const lista = document.getElementById('adm-lista-parcerias');
    db.collection("contactos").orderBy("data", "desc").onSnapshot(snap => {
        lista.innerHTML = "";
        if (snap.empty) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10 italic col-span-2'>Nenhuma proposta recebida ainda.</p>";
            return;
        }
        snap.forEach(doc => {
            const p = doc.data();
            const isLido   = p.lido === true;
            const dataEnvio = p.data ? p.data.toDate().toLocaleString('pt-PT') : '—';
            lista.innerHTML += `
                <div class="glass p-6 rounded-[2rem] border ${isLido ? 'border-white/5 opacity-60' : 'border-white/10 shadow-lg'} flex flex-col transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">${p.assunto || 'Parceria'}</span>
                        <div class="flex items-center gap-2">
                            ${!isLido ? '<span class="text-[8px] text-[#EF3C54] font-black animate-pulse">● NOVO</span>' : ''}
                            <button onclick="toggleLido('${doc.id}', ${isLido})" class="text-xl ${isLido ? 'text-blue-500' : 'text-gray-600'} hover:scale-110 transition">
                                <i class="fa-solid ${isLido ? 'fa-circle-check' : 'fa-circle'}"></i>
                            </button>
                        </div>
                    </div>
                    <h4 class="font-black text-base text-white">${p.nome}</h4>
                    <p class="text-[10px] text-gray-500 mb-3">${p.email}</p>
                    <div class="bg-black/20 p-4 rounded-xl mb-4 border border-white/5 flex-1">
                        <p class="text-xs text-gray-300 leading-relaxed italic">"${p.mensagem || p.descricao || 'Sem mensagem.'}"</p>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-white/5">
                        <span class="text-[8px] text-gray-600 font-bold"><i class="fa-solid fa-calendar mr-1"></i>${dataEnvio}</span>
                        <div class="flex gap-2">
                            ${p.anexoUrl ? `<a href="${p.anexoUrl}" target="_blank" class="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"><i class="fa-solid fa-paperclip text-xs"></i></a>` : ''}
                            <a href="mailto:${p.email}" class="w-8 h-8 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center hover:bg-white/10 transition"><i class="fa-solid fa-reply text-xs"></i></a>
                            <button onclick="apagarDoc('contactos','${doc.id}')" class="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                    </div>
                </div>`;
        });
    });
}

async function toggleLido(id, statusAtual) {
    await db.collection("contactos").doc(id).update({ lido: !statusAtual });
}

async function apagarDoc(colecao, id) {
    if (confirm("Apagar este registo definitivamente?")) {
        await db.collection(colecao).doc(id).delete();
    }
}

// ==========================================
// 5. ESTATÍSTICAS
// ==========================================
function carregarEstatisticas() {
    db.collection("playlist").onSnapshot(snap => {
        const el = document.getElementById('stat-musicas');
        if (el) el.innerText = snap.size;
    });
    db.collection("users").onSnapshot(snap => {
        const el = document.getElementById('stat-users');
        if (el) el.innerText = snap.size;
    });
    db.collection("contactos").onSnapshot(snap => {
        const el = document.getElementById('stat-total');
        if (el) el.innerText = snap.size;
    });
}

// ==========================================
// 6. GESTÃO DE CATEGORIAS
// ==========================================

// Toast de feedback (sem alert())
function catToast(msg, tipo) {
    const el = document.getElementById('cat-toast');
    if (!el) return;
    const isErro = tipo === 'erro';
    el.className = 'mb-4 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center '
        + (isErro
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20');
    el.innerText = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}

// Preview em tempo real do ícone + nome
function iniciarPreviewCategoria() {
    const nomeInput   = document.getElementById('nova-cat-nome');
    const iconeSelect = document.getElementById('nova-cat-icone');
    const previewIcon = document.getElementById('preview-icone');
    const previewNome = document.getElementById('preview-nome');
    if (!nomeInput || !iconeSelect) return;

    function atualizar() {
        if (previewIcon) previewIcon.className = `fa-solid ${iconeSelect.value} text-[#EF3C54] text-sm`;
        if (previewNome) previewNome.innerText  = nomeInput.value.trim() || ICONES_DISPONIVEIS[iconeSelect.value] || '—';
    }
    nomeInput.addEventListener('input', atualizar);
    iconeSelect.addEventListener('change', atualizar);
}

// Select de tipo nas músicas — carregado dinamicamente do Firebase
function carregarCategoriasSelect() {
    const select = document.getElementById('adm-tipo');
    if (!select) return;

    // Preencher imediatamente com fallback (enquanto Firebase carrega)
    const FALLBACK = ['Album', 'EP', 'Single', 'Mixtape'];
    select.innerHTML = FALLBACK.map(n => `<option value="${n}">${n}</option>`).join('');

    // Substituir com dados reais do Firebase em tempo real
    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        const valAtual = select.value;
        select.innerHTML = '';

        if (snap.empty) {
            // Firebase vazio — usar fallback
            FALLBACK.forEach(n => {
                select.innerHTML += `<option value="${n}" ${n === valAtual ? 'selected' : ''}>${n}</option>`;
            });
        } else {
            snap.forEach(doc => {
                const cat = doc.data();
                select.innerHTML += `<option value="${cat.nome}" ${cat.nome === valAtual ? 'selected' : ''}>${cat.nome}</option>`;
            });
        }
    });
}

// Listar categorias no painel
function carregarCategoriasAdmin() {
    const lista      = document.getElementById('adm-lista-categorias');
    const badge      = document.getElementById('cat-total-badge');
    const seedBanner = document.getElementById('seed-banner');
    if (!lista) return;

    db.collection("categorias").orderBy("ordem").onSnapshot(async snap => {
        lista.innerHTML = '';

        if (seedBanner) seedBanner.classList.toggle('hidden', !snap.empty);
        if (badge) badge.innerText = snap.size + (snap.size === 1 ? ' categoria' : ' categorias');

        if (snap.empty) {
            lista.innerHTML = `<p class="text-gray-600 text-xs italic text-center py-6">Nenhuma categoria ainda. Usa o formulário acima ou inicializa as categorias padrão.</p>`;
            return;
        }

        // Contar músicas por categoria
        const contagemMap = {};
        const musicasSnap = await db.collection("playlist").get();
        musicasSnap.forEach(d => {
            const t = d.data().tipo || '';
            contagemMap[t] = (contagemMap[t] || 0) + 1;
        });

        const docs = snap.docs;
        docs.forEach((doc, idx) => {
            const cat       = doc.data();
            const total     = contagemMap[cat.nome] || 0;
            const isPrimeira = idx === 0;
            const isUltima   = idx === docs.length - 1;

            const opcoesIcone = Object.entries(ICONES_DISPONIVEIS).map(([val, label]) =>
                `<option value="${val}" ${val === (cat.icone || 'fa-music') ? 'selected' : ''}>${label}</option>`
            ).join('');

            const div = document.createElement('div');
            div.className = 'glass rounded-[1.5rem] border border-white/5 hover:border-white/10 transition overflow-hidden';
            div.id = `cat-card-${doc.id}`;
            div.innerHTML = `
                <!-- Modo visualização -->
                <div id="cat-view-${doc.id}" class="p-5 flex items-center gap-4">
                    <div class="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid ${cat.icone || 'fa-music'} text-[#EF3C54]"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-black text-sm text-white">${cat.nome}s</p>
                            <span class="text-[8px] font-bold bg-white/5 text-gray-500 px-2 py-0.5 rounded-full">${total} música${total !== 1 ? 's' : ''}</span>
                        </div>
                        <a href="categoria.html?tipo=${encodeURIComponent(cat.nome)}" target="_blank"
                           class="text-[9px] text-[#2E5EBE] hover:underline font-bold mt-0.5 inline-flex items-center gap-1">
                           <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>Ver página
                        </a>
                    </div>
                    <!-- Reordenar -->
                    <div class="flex flex-col gap-1 flex-shrink-0">
                        <button onclick="moverCategoria('${doc.id}', 'up', ${cat.ordem})" ${isPrimeira ? 'disabled' : ''}
                            class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition disabled:opacity-20 disabled:cursor-not-allowed">
                            <i class="fa-solid fa-chevron-up text-[9px] text-gray-400"></i>
                        </button>
                        <button onclick="moverCategoria('${doc.id}', 'down', ${cat.ordem})" ${isUltima ? 'disabled' : ''}
                            class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition disabled:opacity-20 disabled:cursor-not-allowed">
                            <i class="fa-solid fa-chevron-down text-[9px] text-gray-400"></i>
                        </button>
                    </div>
                    <!-- Acções -->
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="abrirEdicaoCategoria('${doc.id}')"
                            class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition" title="Editar">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onclick="eliminarCategoria('${doc.id}', '${cat.nome}', ${total})"
                            class="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition" title="Eliminar">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- Modo edição -->
                <div id="cat-edit-${doc.id}" class="hidden p-5 bg-white/3 border-t border-white/5">
                    <p class="text-[9px] font-black uppercase text-gray-500 mb-4 tracking-widest">Editar Categoria</p>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="space-y-1">
                            <label class="text-[8px] text-gray-600 font-bold uppercase ml-1">Nome</label>
                            <input type="text" id="edit-nome-${doc.id}" value="${cat.nome}"
                                class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#EF3C54] transition"
                                onkeydown="if(event.key==='Enter') guardarEdicaoCategoria('${doc.id}')">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[8px] text-gray-600 font-bold uppercase ml-1">Ícone</label>
                            <select id="edit-icone-${doc.id}"
                                class="w-full bg-[#020617] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-[#EF3C54] transition">
                                ${opcoesIcone}
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 justify-end">
                        <button onclick="fecharEdicaoCategoria('${doc.id}')"
                            class="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-xs font-black hover:bg-white/10 transition">
                            CANCELAR
                        </button>
                        <button onclick="guardarEdicaoCategoria('${doc.id}')"
                            class="px-5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black hover:bg-emerald-500/30 transition">
                            <i class="fa-solid fa-check mr-1"></i>GUARDAR
                        </button>
                    </div>
                </div>`;

            lista.appendChild(div);
        });
    });
}

// Abrir / fechar modo edição inline
function abrirEdicaoCategoria(id) {
    document.getElementById(`cat-view-${id}`).classList.add('hidden');
    document.getElementById(`cat-edit-${id}`).classList.remove('hidden');
    document.getElementById(`edit-nome-${id}`).focus();
}

function fecharEdicaoCategoria(id) {
    document.getElementById(`cat-view-${id}`).classList.remove('hidden');
    document.getElementById(`cat-edit-${id}`).classList.add('hidden');
}

// Guardar edição
async function guardarEdicaoCategoria(id) {
    const novoNome  = document.getElementById(`edit-nome-${id}`).value.trim();
    const novoIcone = document.getElementById(`edit-icone-${id}`).value;
    if (!novoNome) return catToast('O nome não pode estar vazio!', 'erro');
    try {
        await db.collection("categorias").doc(id).update({ nome: novoNome, icone: novoIcone });
        fecharEdicaoCategoria(id);
        catToast(`"${novoNome}" actualizada com sucesso!`);
    } catch (e) {
        catToast('Erro ao guardar. Tenta novamente.', 'erro');
    }
}

// CRIAR nova categoria — função global, acessível pelo botão no HTML
async function criarCategoria() {
    const nomeInput   = document.getElementById('nova-cat-nome');
    const iconeSelect = document.getElementById('nova-cat-icone');
    const btn         = document.getElementById('btn-criar-cat');

    const nome  = nomeInput ? nomeInput.value.trim() : '';
    const icone = iconeSelect ? iconeSelect.value : 'fa-music';

    if (!nome) return catToast('Dá um nome à categoria!', 'erro');

    // Bloquear botão
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A CRIAR...'; }

    try {
        // Verificar duplicado lendo todos os docs (sem where, sem índice)
        const todasSnap = await db.collection("categorias").get();
        const nomesExist = todasSnap.docs.map(d => (d.data().nome || '').toLowerCase());
        if (nomesExist.includes(nome.toLowerCase())) {
            catToast(`A categoria "${nome}" já existe!`, 'erro');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>CRIAR CATEGORIA'; }
            return;
        }

        const ordemMax = todasSnap.empty ? 0 : Math.max(0, ...todasSnap.docs.map(d => d.data().ordem || 0));

        await db.collection("categorias").add({
            nome, icone,
            ordem: ordemMax + 1,
            criada: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (nomeInput) nomeInput.value = '';
        const previewNome = document.getElementById('preview-nome');
        if (previewNome) previewNome.innerText = '—';

        catToast(`Categoria "${nome}" criada com sucesso!`);

    } catch (e) {
        console.error("Erro ao criar categoria:", e);
        catToast('Erro ao criar. Verifica a ligação: ' + e.message, 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>CRIAR CATEGORIA'; }
    }
}

// Eliminar categoria
async function eliminarCategoria(id, nome, totalMusicas) {
    const aviso = totalMusicas > 0
        ? `⚠️ Existem ${totalMusicas} música(s) nesta categoria.\nEliminar "${nome}"? As músicas ficam sem categoria visível.`
        : `Eliminar a categoria "${nome}"?`;
    if (!confirm(aviso)) return;
    try {
        await db.collection("categorias").doc(id).delete();
        catToast(`"${nome}" eliminada.`);
    } catch (e) {
        catToast('Erro ao eliminar.', 'erro');
    }
}

// Reordenar (trocar posição com vizinho)
async function moverCategoria(id, direcao, ordemActual) {
    const query = direcao === 'up'
        ? db.collection("categorias").where("ordem", "<", ordemActual).orderBy("ordem", "desc").limit(1)
        : db.collection("categorias").where("ordem", ">", ordemActual).orderBy("ordem", "asc").limit(1);

    const snap = await query.get();
    if (snap.empty) return;

    const vizinho      = snap.docs[0];
    const ordemVizinho = vizinho.data().ordem;

    const batch = db.batch();
    batch.update(db.collection("categorias").doc(id),         { ordem: ordemVizinho });
    batch.update(db.collection("categorias").doc(vizinho.id), { ordem: ordemActual  });
    await batch.commit();
}

// Inicializar categorias padrão (seed)
async function seedCategorias() {
    const snap = await db.collection("categorias").get();
    if (!snap.empty) { catToast('Já existem categorias!', 'erro'); return; }

    const defaults = [
        { nome: 'Album',   icone: 'fa-compact-disc',  ordem: 1 },
        { nome: 'EP',      icone: 'fa-layer-group',    ordem: 2 },
        { nome: 'Single',  icone: 'fa-bolt',           ordem: 3 },
        { nome: 'Mixtape', icone: 'fa-cassette-tape',  ordem: 4 },
    ];
    const batch = db.batch();
    defaults.forEach(cat => {
        batch.set(db.collection("categorias").doc(), {
            ...cat, criada: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
    catToast('Categorias padrão criadas com sucesso!');
}

// ==========================================
// 7. SUBCATEGORIAS
// ==========================================

function subcatToast(msg, tipo) {
    const el = document.getElementById('subcat-toast');
    if (!el) return;
    el.className = 'mb-4 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center '
        + (tipo === 'erro'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20');
    el.innerText = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}

// Preencher select de categoria-mãe das subcategorias
function carregarSelectPaiSubcat() {
    const sel = document.getElementById('nova-subcat-pai');
    if (!sel) return;
    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        const val = sel.value;
        sel.innerHTML = '<option value="">Escolher categoria-mãe...</option>';
        snap.forEach(doc => {
            const c = doc.data();
            sel.innerHTML += `<option value="${c.nome}" ${c.nome === val ? 'selected' : ''}>${c.nome}</option>`;
        });
    });
}

// Listar subcategorias agrupadas por categoria-mãe
function carregarSubcategoriasAdmin() {
    const lista = document.getElementById('adm-lista-subcategorias');
    if (!lista) return;

    db.collection("subcategorias").orderBy("pai").onSnapshot(snap => {
        lista.innerHTML = '';
        if (snap.empty) {
            lista.innerHTML = `<p class="text-gray-600 text-xs italic text-center py-6">Nenhuma subcategoria criada ainda.</p>`;
            return;
        }

        // Agrupar por categoria-mãe
        const grupos = {};
        snap.forEach(doc => {
            const s = doc.data();
            if (!grupos[s.pai]) grupos[s.pai] = [];
            grupos[s.pai].push({ id: doc.id, ...s });
        });

        Object.entries(grupos).forEach(([pai, subs]) => {
            const bloco = document.createElement('div');
            bloco.className = 'glass rounded-[1.5rem] border border-white/5 overflow-hidden mb-2';
            bloco.innerHTML = `
                <div class="px-5 py-3 bg-white/3 border-b border-white/5 flex items-center gap-2">
                    <i class="fa-solid fa-folder text-[#2E5EBE] text-xs"></i>
                    <span class="text-xs font-black text-white uppercase tracking-widest">${pai}</span>
                    <span class="text-[9px] text-gray-600 font-bold">${subs.length} sub${subs.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="p-4 space-y-3">
                    ${subs.map(s => {
                        const capaUrl = s.capa || '';
                        return `
                        <div class="flex items-center gap-3 bg-white/3 p-3 rounded-2xl hover:bg-white/5 transition" id="subcat-row-${s.id}">

                            <!-- Capa da subcategoria -->
                            <div class="relative group flex-shrink-0 cursor-pointer" onclick="abrirEditarCapaSubcat('${s.id}','${s.nome}','${s.pai}')">
                                <div class="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                    ${capaUrl
                                        ? `<img src="${capaUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=\"fa-solid fa-folder-open text-purple-400\"></i>'">`
                                        : `<i class="fa-solid fa-folder-open text-purple-400 text-sm"></i>`}
                                </div>
                                <div class="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <i class="fa-solid fa-camera text-white text-xs"></i>
                                </div>
                            </div>

                            <!-- Nome -->
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-black text-white truncate">${s.nome}</p>
                                <p class="text-[9px] text-gray-500 uppercase font-bold">${pai}</p>
                                ${capaUrl ? '<span class="text-[8px] text-emerald-400 font-bold">● CAPA DEFINIDA</span>' : '<span class="text-[8px] text-gray-600 font-bold">○ SEM CAPA</span>'}
                            </div>

                            <!-- Acções -->
                            <a href="categoria.html?tipo=${encodeURIComponent(pai)}&sub=${encodeURIComponent(s.nome)}" target="_blank"
                               class="text-[9px] text-[#2E5EBE] hover:underline font-bold flex-shrink-0">Ver ↗</a>
                            <button onclick="abrirEditarCapaSubcat('${s.id}','${s.nome}','${s.pai}')"
                                class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition flex-shrink-0" title="Editar Capa">
                                <i class="fa-solid fa-image text-xs"></i>
                            </button>
                            <button onclick="eliminarSubcategoria('${s.id}','${s.nome}')"
                                class="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition flex-shrink-0" title="Eliminar">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>`;
                    }).join('')}
                </div>`;
            lista.appendChild(bloco);
        });
    });
}

async function criarSubcategoria() {
    const pai  = document.getElementById('nova-subcat-pai')?.value?.trim();
    const nome = document.getElementById('nova-subcat-nome')?.value?.trim();
    const btn  = document.getElementById('btn-criar-subcat');

    if (!pai)  return subcatToast('Escolhe uma categoria-mãe!', 'erro');
    if (!nome) return subcatToast('Dá um nome à subcategoria!', 'erro');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A CRIAR...'; }

    try {
        const todas = await db.collection("subcategorias").get();
        const existe = todas.docs.some(d => d.data().pai === pai && d.data().nome.toLowerCase() === nome.toLowerCase());
        if (existe) {
            subcatToast(`"${nome}" já existe em "${pai}"!`, 'erro');
            return;
        }

        await db.collection("subcategorias").add({
            nome, pai,
            criada: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('nova-subcat-nome').value = '';
        subcatToast(`Subcategoria "${nome}" criada em "${pai}"!`);
    } catch (e) {
        console.error(e);
        subcatToast('Erro ao criar: ' + e.message, 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>CRIAR SUB'; }
    }
}

async function eliminarSubcategoria(id, nome) {
    if (!confirm(`Eliminar a subcategoria "${nome}"?`)) return;
    try {
        await db.collection("subcategorias").doc(id).delete();
        subcatToast(`"${nome}" eliminada.`);
    } catch (e) {
        subcatToast('Erro ao eliminar.', 'erro');
    }
}

// Actualizar select de subcategoria no formulário de publicar
function atualizarSubcategoriasSelect() {
    const tipo = document.getElementById('adm-tipo')?.value;
    const sel  = document.getElementById('adm-subcategoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem subcategoria</option>';
    if (!tipo) return;

    db.collection("subcategorias").where("pai", "==", tipo).get().then(snap => {
        snap.forEach(doc => {
            const s = doc.data();
            sel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    }).catch(() => {
        // Fallback sem índice
        db.collection("subcategorias").get().then(snap => {
            snap.forEach(doc => {
                const s = doc.data();
                if (s.pai === tipo) sel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
            });
        });
    });
}

// Actualizar filtros de lista
function carregarFiltrosCategorias() {
    const filtroCat = document.getElementById('filtro-categoria');
    if (!filtroCat) return;
    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        const val = filtroCat.value;
        filtroCat.innerHTML = '<option value="">Todas as categorias</option>';
        snap.forEach(doc => {
            const c = doc.data();
            filtroCat.innerHTML += `<option value="${c.nome}" ${c.nome === val ? 'selected' : ''}>${c.nome}</option>`;
        });
    });
}

function atualizarFiltroSubcategorias() {
    const cat = document.getElementById('filtro-categoria')?.value;
    const sel = document.getElementById('filtro-subcategoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas as subcategorias</option>';
    if (!cat) return;

    db.collection("subcategorias").get().then(snap => {
        snap.forEach(doc => {
            const s = doc.data();
            if (s.pai === cat) sel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    });
}

// ==========================================
// 8. MODAL MOVER MÚSICA
// ==========================================

// Armazena dados da música em aberto (evita problemas com aspas/caracteres especiais)
let _musicaEmEdicao = null;

// Abre o modal com os dados da música (recebe o ID, busca dados do Firebase)
async function abrirModalMover(id) {
    const modal = document.getElementById('modal-mover');
    if (!modal) return;

    // Mostrar modal com loading
    modal.style.display = 'flex';
    document.getElementById('modal-musica-id').value = id;
    document.getElementById('modal-musica-nome').innerText    = 'A carregar...';
    document.getElementById('modal-musica-artista').innerText = '';
    document.getElementById('modal-musica-actual').innerText  = '';
    document.getElementById('modal-mover-feedback').classList.add('hidden');

    const btn = document.getElementById('btn-salvar-mover');
    if (btn) btn.disabled = true;

    try {
        // Buscar dados actuais da música
        const doc = await db.collection("playlist").doc(id).get();
        if (!doc.exists) { fecharModalMover(); return; }

        const m = doc.data();
        _musicaEmEdicao = { id, ...m };

        // Preencher info visual
        document.getElementById('modal-musica-nome').innerText    = m.titulo || '—';
        document.getElementById('modal-musica-artista').innerText = m.artista || '—';
        document.getElementById('modal-musica-actual').innerText  =
            [m.tipo, m.subcategoria].filter(Boolean).join(' › ') || 'Sem categoria';

        const capaEl = document.getElementById('modal-musica-capa');
        if (capaEl) capaEl.src = m.capa || 'assets/default.png';

        // Preencher select de categorias
        const selTipo = document.getElementById('modal-tipo');
        selTipo.innerHTML = '';

        const catsSnap = await db.collection("categorias").orderBy("ordem").get();
        if (catsSnap.empty) {
            // Fallback: categorias padrão
            ['Album','EP','Single','Mixtape'].forEach(n => {
                selTipo.innerHTML += `<option value="${n}" ${n === m.tipo ? 'selected' : ''}>${n}</option>`;
            });
        } else {
            catsSnap.forEach(catDoc => {
                const c = catDoc.data();
                selTipo.innerHTML += `<option value="${c.nome}" ${c.nome === m.tipo ? 'selected' : ''}>${c.nome}</option>`;
            });
        }

        // Preencher subcategorias
        await atualizarModalSubcategorias(m.subcategoria || '');

        if (btn) btn.disabled = false;

    } catch (e) {
        console.error("Erro ao abrir modal mover:", e);
        document.getElementById('modal-musica-nome').innerText = 'Erro ao carregar';
        if (btn) btn.disabled = false;
    }
}

function fecharModalMover() {
    const modal = document.getElementById('modal-mover');
    if (modal) modal.style.display = 'none';
    _musicaEmEdicao = null;
}

// Fecha o modal ao clicar fora da caixa branca
document.addEventListener('click', e => {
    const modal = document.getElementById('modal-mover');
    if (modal && e.target === modal) fecharModalMover();
});

async function atualizarModalSubcategorias(subcatActual) {
    const tipo = document.getElementById('modal-tipo')?.value;
    const sel  = document.getElementById('modal-subcategoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem subcategoria</option>';
    if (!tipo) return;

    try {
        const snap = await db.collection("subcategorias").get();
        let found = false;
        snap.forEach(doc => {
            const s = doc.data();
            if (s.pai === tipo) {
                found = true;
                const selected = subcatActual && s.nome === subcatActual ? 'selected' : '';
                sel.innerHTML += `<option value="${s.nome}" ${selected}>${s.nome}</option>`;
            }
        });
        if (!found) {
            sel.innerHTML = '<option value="">Sem subcategorias nesta categoria</option>';
        }
    } catch (e) {
        sel.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function salvarMoverMusica() {
    const id       = document.getElementById('modal-musica-id').value;
    const novoTipo = document.getElementById('modal-tipo').value;
    const novaSub  = document.getElementById('modal-subcategoria').value;
    const btn      = document.getElementById('btn-salvar-mover');
    const feedback = document.getElementById('modal-mover-feedback');

    if (!id || !novoTipo) {
        feedback.className = 'mt-4 p-3 rounded-xl text-xs font-black uppercase text-center bg-red-500/10 text-red-400';
        feedback.innerText = 'Selecciona uma categoria!';
        feedback.classList.remove('hidden');
        return;
    }

    const textoOrig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A MOVER...';
    feedback.classList.add('hidden');

    try {
        await db.collection("playlist").doc(id).update({
            tipo:         novoTipo,
            subcategoria: novaSub || ''
        });

        // Feedback de sucesso no modal
        const destino = [novoTipo, novaSub].filter(Boolean).join(' › ');
        feedback.className = 'mt-4 p-3 rounded-xl text-xs font-black uppercase text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        feedback.innerText = `✓ Movida para ${destino}`;
        feedback.classList.remove('hidden');

        // Fechar modal após 1.2s
        setTimeout(() => {
            fecharModalMover();
            showAdminToast(`Faixa movida para "${destino}"!`);
        }, 1200);

    } catch (e) {
        console.error("Erro ao mover:", e);
        feedback.className = 'mt-4 p-3 rounded-xl text-xs font-black uppercase text-center bg-red-500/10 text-red-400';
        feedback.innerText = 'Erro: ' + e.message;
        feedback.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = textoOrig;
    }
}

// ==========================================
// 9. EDITAR CAPA DA SUBCATEGORIA
//    + actualizar todas as faixas
// ==========================================

// Abrir modal de edição de capa
function abrirEditarCapaSubcat(id, nome, pai) {
    // Criar modal dinamicamente se não existir
    let modal = document.getElementById('modal-capa-subcat');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-capa-subcat';
        modal.className = 'fixed inset-0 z-[800] bg-black/90 backdrop-blur-md flex items-center justify-center p-6';
        modal.innerHTML = `
            <div class="glass w-full max-w-md p-8 rounded-[3rem] border border-white/10 relative shadow-2xl">
                <button onclick="fecharModalCapaSubcat()" class="absolute top-5 right-5 text-gray-500 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h2 class="text-lg font-black mb-1">Capa da Subcategoria</h2>
                <p id="mcs-nome" class="text-xs text-gray-500 mb-6">—</p>

                <input type="hidden" id="mcs-id">
                <input type="hidden" id="mcs-pai">

                <!-- Preview da capa actual -->
                <div class="flex justify-center mb-6">
                    <div class="w-32 h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center" id="mcs-preview-box">
                        <i id="mcs-preview-placeholder" class="fa-solid fa-image text-gray-600 text-3xl"></i>
                        <img id="mcs-preview-img" src="" class="w-full h-full object-cover hidden" onerror="this.classList.add('hidden'); document.getElementById('mcs-preview-placeholder').classList.remove('hidden')">
                    </div>
                </div>

                <!-- Upload de nova capa -->
                <div class="relative glass border-2 border-dashed border-white/10 rounded-2xl p-5 hover:border-blue-500/40 transition flex items-center gap-4 cursor-pointer group mb-2">
                    <i class="fa-solid fa-cloud-arrow-up text-2xl text-gray-600 group-hover:text-blue-400 transition"></i>
                    <div class="flex-1">
                        <p id="mcs-filename" class="text-xs text-gray-400">Escolher nova imagem...</p>
                        <p class="text-[8px] text-gray-700 uppercase mt-0.5">PNG, JPG, WEBP · Máx 5MB</p>
                    </div>
                    <input type="file" id="mcs-ficheiro" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer"
                        onchange="previewCapaSubcat(this)">
                </div>

                <!-- Info sobre actualização em massa -->
                <div class="glass p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 mb-6">
                    <div class="flex items-start gap-2">
                        <i class="fa-solid fa-circle-info text-blue-400 text-xs mt-0.5 flex-shrink-0"></i>
                        <p class="text-[9px] text-blue-300 leading-relaxed">
                            A capa será actualizada na subcategoria <strong>e em todas as faixas</strong> que lhe pertencem automaticamente.
                        </p>
                    </div>
                </div>

                <div id="mcs-progress" class="hidden mb-4">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-[9px] text-gray-500 uppercase font-bold">A actualizar faixas...</p>
                        <p id="mcs-progress-text" class="text-[9px] text-blue-400 font-black">0/0</p>
                    </div>
                    <div class="w-full bg-white/5 rounded-full h-1.5">
                        <div id="mcs-progress-bar" class="bg-[#2E5EBE] h-1.5 rounded-full transition-all" style="width:0%"></div>
                    </div>
                </div>

                <button onclick="guardarCapaSubcat()" id="btn-guardar-capa-sub"
                    class="w-full bg-[#2E5EBE] py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition">
                    <i class="fa-solid fa-check mr-2"></i>GUARDAR E ACTUALIZAR FAIXAS
                </button>
            </div>`;
        document.body.appendChild(modal);
    }

    // Preencher dados
    document.getElementById('mcs-id').value   = id;
    document.getElementById('mcs-pai').value  = pai;
    document.getElementById('mcs-nome').innerText = `${pai} › ${nome}`;
    document.getElementById('mcs-filename').innerText = 'Escolher nova imagem...';
    document.getElementById('mcs-progress').classList.add('hidden');

    // Mostrar capa actual
    db.collection("subcategorias").doc(id).get().then(snap => {
        const capaActual = snap.data()?.capa || '';
        const img = document.getElementById('mcs-preview-img');
        const ph  = document.getElementById('mcs-preview-placeholder');
        if (capaActual) {
            img.src = capaActual;
            img.classList.remove('hidden');
            ph.classList.add('hidden');
        } else {
            img.classList.add('hidden');
            ph.classList.remove('hidden');
        }
        // Limpar input de ficheiro
        const fi = document.getElementById('mcs-ficheiro');
        if (fi) fi.value = '';
    });

    modal.style.display = 'flex';
}

function fecharModalCapaSubcat() {
    const modal = document.getElementById('modal-capa-subcat');
    if (modal) modal.style.display = 'none';
}

// Preview da nova capa antes de guardar
function previewCapaSubcat(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('mcs-filename').innerText = file.name;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('mcs-preview-img');
        const ph  = document.getElementById('mcs-preview-placeholder');
        img.src = e.target.result;
        img.classList.remove('hidden');
        ph.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// Guardar capa e actualizar todas as faixas da subcategoria
async function guardarCapaSubcat() {
    const id   = document.getElementById('mcs-id').value;
    const pai  = document.getElementById('mcs-pai').value;
    const file = document.getElementById('mcs-ficheiro').files[0];
    const btn  = document.getElementById('btn-guardar-capa-sub');

    if (!file) return subcatToast('Escolhe uma imagem primeiro!', 'erro');

    const nomeSub = document.getElementById('mcs-nome').innerText.split(' › ')[1] || '';

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A CARREGAR IMAGEM...';

    try {
        // 1. Upload para ImgBB
        const novaCapaUrl = await uploadParaImgBB(file);
        if (!novaCapaUrl) {
            subcatToast('Erro no upload da imagem.', 'erro');
            return;
        }

        // 2. Actualizar documento da subcategoria
        await db.collection("subcategorias").doc(id).update({ capa: novaCapaUrl });

        // 3. Buscar todas as faixas desta subcategoria
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A ACTUALIZAR FAIXAS...';
        const progressEl  = document.getElementById('mcs-progress');
        const progressBar = document.getElementById('mcs-progress-bar');
        const progressTxt = document.getElementById('mcs-progress-text');
        progressEl.classList.remove('hidden');

        const faixasSnap = await db.collection("playlist").get();
        const faixasDaSub = faixasSnap.docs.filter(d => {
            const data = d.data();
            return data.subcategoria === nomeSub && data.tipo === pai;
        });

        const total = faixasDaSub.length;
        progressTxt.innerText = `0/${total}`;

        if (total === 0) {
            progressTxt.innerText = 'Nenhuma faixa para actualizar';
            progressBar.style.width = '100%';
        } else {
            // Actualizar em lotes de 500 (limite do Firestore batch)
            const LOTE = 500;
            let actualizadas = 0;

            for (let i = 0; i < faixasDaSub.length; i += LOTE) {
                const lote = db.batch();
                const chunk = faixasDaSub.slice(i, i + LOTE);
                chunk.forEach(doc => {
                    lote.update(db.collection("playlist").doc(doc.id), { capa: novaCapaUrl });
                });
                await lote.commit();
                actualizadas += chunk.length;
                const pct = Math.round((actualizadas / total) * 100);
                progressBar.style.width = pct + '%';
                progressTxt.innerText = `${actualizadas}/${total}`;
            }
        }

        subcatToast(`Capa actualizada${total > 0 ? ` em ${total} faixa${total !== 1 ? 's' : ''}` : ''}!`);

        setTimeout(() => fecharModalCapaSubcat(), 1500);

    } catch (e) {
        console.error(e);
        subcatToast('Erro: ' + e.message, 'erro');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>GUARDAR E ACTUALIZAR FAIXAS';
    }
}
