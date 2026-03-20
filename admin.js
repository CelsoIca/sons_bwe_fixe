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

        await db.collection("playlist").add({
            titulo, artista, url: urlMp3,
            capa: urlFinalCapa, tipo, oculto: false,
            ordem: Date.now(),
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAdminToast("✅ Música publicada com sucesso!");
        document.getElementById('adm-titulo').value    = '';
        document.getElementById('adm-artista').value   = '';
        document.getElementById('adm-url').value       = '';
        const capaNome = document.getElementById('capa-filename');
        if (capaNome) capaNome.innerText = 'Escolher ficheiro de imagem...';
        if (inputCapa) inputCapa.value = '';
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
// 3. LISTAR MÚSICAS
// ==========================================
function carregarMusicasAdmin() {
    const lista = document.getElementById('adm-lista-musicas');
    db.collection("playlist").orderBy("ordem", "desc").onSnapshot(snap => {
        lista.innerHTML = "";
        if (snap.empty) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10 italic col-span-2'>Nenhuma música publicada ainda.</p>";
            return;
        }
        snap.forEach(doc => {
            const m = doc.data();
            lista.innerHTML += `
                <div class="glass p-5 rounded-[2rem] border border-white/5 flex items-center gap-4 hover:border-blue-500/20 transition">
                    <img src="${m.capa || 'assets/default.png'}" class="w-14 h-14 rounded-2xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='assets/default.png'">
                    <div class="flex-1 overflow-hidden">
                        <h4 class="font-black text-sm text-white truncate">${m.titulo}</h4>
                        <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                        <span class="text-[8px] font-black ${m.oculto ? 'text-red-400' : 'text-emerald-400'} uppercase">${m.oculto ? 'OCULTO' : 'VISÍVEL'} · ${m.tipo || 'Single'}</span>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="toggleOcultarMusica('${doc.id}', ${m.oculto})" class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition" title="${m.oculto ? 'Mostrar' : 'Ocultar'}">
                            <i class="fa-solid ${m.oculto ? 'fa-eye' : 'fa-eye-slash'} text-xs text-gray-400"></i>
                        </button>
                        <button onclick="apagarMusica('${doc.id}')" class="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition">
                            <i class="fa-solid fa-trash-can text-xs text-red-500"></i>
                        </button>
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
    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        const valAtual = select.value;
        select.innerHTML = '';
        if (snap.empty) {
            ['Single','Album','EP','Mixtape'].forEach(n => {
                select.innerHTML += `<option value="${n}">${n}</option>`;
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
    const nomeInput  = document.getElementById('nova-cat-nome');
    const iconeSelect = document.getElementById('nova-cat-icone');
    const btn        = document.getElementById('btn-criar-cat');

    const nome  = nomeInput ? nomeInput.value.trim() : '';
    const icone = iconeSelect ? iconeSelect.value : 'fa-music';

    if (!nome) return catToast('Dá um nome à categoria!', 'erro');

    // Verificar duplicado
    try {
        const existe = await db.collection("categorias").where("nome", "==", nome).get();
        if (!existe.empty) return catToast(`"${nome}" já existe!`, 'erro');
    } catch (e) {
        return catToast('Erro ao verificar. Tenta novamente.', 'erro');
    }

    // Bloquear botão
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A CRIAR...'; }

    try {
        const snap = await db.collection("categorias").orderBy("ordem", "desc").limit(1).get();
        const ordemMax = snap.empty ? 0 : (snap.docs[0].data().ordem || 0);

        await db.collection("categorias").add({
            nome,
            icone,
            ordem: ordemMax + 1,
            criada: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Limpar formulário
        if (nomeInput)  nomeInput.value  = '';
        const previewNome = document.getElementById('preview-nome');
        if (previewNome) previewNome.innerText = '—';

        catToast(`Categoria "${nome}" criada com sucesso!`);

    } catch (e) {
        console.error("Erro ao criar categoria:", e);
        catToast('Erro ao criar. Verifica a ligação.', 'erro');
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
