// ==========================================
// PAINEL DO GENERAL — admin.js
// Carregado APÓS script.js (que já tem Firebase init)
// ==========================================

// Aguarda o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {

    // 1. VERIFICAÇÃO DE ACESSO (único listener de auth para esta página)
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            const userData = userDoc.data();

            if (!userData || userData.ativo === false) {
                alert("ACESSO NEGADO: Conta suspensa.");
                await auth.signOut();
                window.location.href = 'index.html';
                return;
            }

            if (userData.role === 'admin') {
                // Mostrar o conteúdo admin
                document.getElementById('admin-content').classList.remove('hidden');
                const errOverlay = document.getElementById('error-overlay');
                if (errOverlay) errOverlay.classList.add('hidden');

                // Iniciar painel
                carregarEstatisticas();
                monitorarNotificacoes();
                carregarCategoriasSelect();
                abrirAba('musicas');
            } else {
                // Não é admin — mostrar erro
                const errOverlay = document.getElementById('error-overlay');
                if (errOverlay) errOverlay.classList.remove('hidden');
            }
        } catch (e) {
            console.error("Erro ao verificar acesso:", e);
            const errOverlay = document.getElementById('error-overlay');
            if (errOverlay) errOverlay.classList.remove('hidden');
        }
    });

});

// ==========================================
// 2. PUBLICAR MÚSICA
// ==========================================
async function publicarMusicaAdmin() {
    const btn = document.getElementById('btn-publicar');
    const titulo = document.getElementById('adm-titulo').value.trim();
    const artista = document.getElementById('adm-artista').value.trim();
    const urlMp3 = document.getElementById('adm-url').value.trim();
    const tipo = document.getElementById('adm-tipo').value;
    const inputCapa = document.getElementById('adm-ficheiro-capa');
    const file = inputCapa ? inputCapa.files[0] : null;

    if (!titulo || !artista || !urlMp3) {
        return alert("Preenche o Título, Artista e o Link do Áudio!");
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
                alert("Erro no upload da capa. Tenta de novo.");
                return;
            }
        }

        await db.collection("playlist").add({
            titulo, artista,
            url: urlMp3,
            capa: urlFinalCapa,
            tipo, oculto: false,
            ordem: Date.now(),
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ Música publicada com sucesso!");
        document.getElementById('adm-titulo').value = '';
        document.getElementById('adm-artista').value = '';
        document.getElementById('adm-url').value = '';
        if (inputCapa) inputCapa.value = '';
        document.getElementById('capa-filename').innerText = 'Escolher ficheiro de imagem...';

    } catch (e) {
        console.error("Erro ao publicar:", e);
        alert("❌ Erro ao salvar. Verifica a conexão.");
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
            const isLido = p.lido === true;
            const dataEnvio = p.data ? p.data.toDate().toLocaleString('pt-PT') : '—';
            lista.innerHTML += `
                <div class="glass p-6 rounded-[2rem] border ${isLido ? 'border-white/5 opacity-60' : 'border-white/10 shadow-lg'} flex flex-col transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">${p.assunto || 'Parceria'}</span>
                        <div class="flex items-center gap-2">
                            ${!isLido ? '<span class="text-[8px] text-[#EF3C54] font-black animate-pulse">● NOVO</span>' : ''}
                            <button onclick="toggleLido('${doc.id}', ${isLido})" class="text-xl ${isLido ? 'text-blue-500' : 'text-gray-600'} hover:scale-110 transition" title="Marcar lido">
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

// Carregar categorias no select do formulário de música
function carregarCategoriasSelect() {
    const select = document.getElementById('adm-tipo');
    if (!select) return;
    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        const val = select.value; // preservar selecção actual
        select.innerHTML = '';
        if (snap.empty) {
            // Fallback: categorias padrão se não houver nenhuma criada
            ['Single','Album','EP','Mixtape'].forEach(n => {
                select.innerHTML += `<option value="${n}">${n}</option>`;
            });
        } else {
            snap.forEach(doc => {
                const cat = doc.data();
                select.innerHTML += `<option value="${cat.nome}" ${cat.nome === val ? 'selected' : ''}>${cat.nome}</option>`;
            });
        }
    });
}

// Carregar e listar categorias no painel admin
function carregarCategoriasAdmin() {
    const lista = document.getElementById('adm-lista-categorias');
    if (!lista) return;

    db.collection("categorias").orderBy("ordem").onSnapshot(snap => {
        lista.innerHTML = '';

        if (snap.empty) {
            lista.innerHTML = `<p class='text-gray-600 text-xs italic col-span-2'>Nenhuma categoria criada. Cria a primeira acima.</p>`;
            return;
        }

        snap.forEach(doc => {
            const cat = doc.data();
            const div = document.createElement('div');
            div.className = 'glass p-5 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition flex items-center gap-4';
            div.id = `cat-card-${doc.id}`;
            div.innerHTML = `
                <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid ${cat.icone || 'fa-music'} text-[#EF3C54]"></i>
                </div>
                <div class="flex-1 overflow-hidden" id="cat-display-${doc.id}">
                    <p class="font-black text-sm text-white">${cat.nome}</p>
                    <p class="text-[9px] text-gray-500 uppercase font-bold">Ordem: ${cat.ordem}</p>
                </div>
                <div class="flex-1 hidden" id="cat-edit-${doc.id}">
                    <input type="text" value="${cat.nome}" id="cat-edit-nome-${doc.id}"
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#EF3C54] transition">
                </div>
                <div class="flex gap-2 flex-shrink-0" id="cat-btns-${doc.id}">
                    <button onclick="editarCategoria('${doc.id}')" class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition" title="Editar">
                        <i class="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button onclick="eliminarCategoria('${doc.id}', '${cat.nome}')" class="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition" title="Eliminar">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
                <div class="hidden gap-2 flex-shrink-0" id="cat-save-btns-${doc.id}">
                    <button onclick="guardarEdicaoCategoria('${doc.id}')" class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition" title="Guardar">
                        <i class="fa-solid fa-check text-xs"></i>
                    </button>
                    <button onclick="cancelarEdicaoCategoria('${doc.id}', '${cat.nome}')" class="w-8 h-8 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center hover:bg-white/10 transition" title="Cancelar">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>`;
            lista.appendChild(div);
        });
    });
}

async function criarCategoria() {
    const nome = document.getElementById('nova-cat-nome').value.trim();
    const icone = document.getElementById('nova-cat-icone').value;
    if (!nome) return alert("Dá um nome à categoria!");

    // Verificar se já existe
    const existe = await db.collection("categorias").where("nome", "==", nome).get();
    if (!existe.empty) return alert(`A categoria "${nome}" já existe!`);

    // Ordem: próximo número
    const snap = await db.collection("categorias").orderBy("ordem", "desc").limit(1).get();
    const ordemMax = snap.empty ? 0 : (snap.docs[0].data().ordem || 0);

    await db.collection("categorias").add({
        nome, icone,
        ordem: ordemMax + 1,
        criada: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('nova-cat-nome').value = '';
    alert(`✅ Categoria "${nome}" criada!`);
}

function editarCategoria(id) {
    document.getElementById(`cat-display-${id}`).classList.add('hidden');
    document.getElementById(`cat-edit-${id}`).classList.remove('hidden');
    document.getElementById(`cat-btns-${id}`).classList.add('hidden');
    document.getElementById(`cat-save-btns-${id}`).classList.remove('hidden');
    document.getElementById(`cat-save-btns-${id}`).style.display = 'flex';
}

function cancelarEdicaoCategoria(id, nomeOriginal) {
    document.getElementById(`cat-display-${id}`).classList.remove('hidden');
    document.getElementById(`cat-edit-${id}`).classList.add('hidden');
    document.getElementById(`cat-btns-${id}`).classList.remove('hidden');
    document.getElementById(`cat-save-btns-${id}`).classList.add('hidden');
}

async function guardarEdicaoCategoria(id) {
    const novoNome = document.getElementById(`cat-edit-nome-${id}`).value.trim();
    if (!novoNome) return alert("O nome não pode estar vazio!");
    await db.collection("categorias").doc(id).update({ nome: novoNome });
    // O onSnapshot actualiza automaticamente o card
}

async function eliminarCategoria(id, nome) {
    if (!confirm(`Eliminar a categoria "${nome}"?\nAs músicas desta categoria não serão apagadas, apenas ficarão sem categoria visível.`)) return;
    await db.collection("categorias").doc(id).delete();
}

async function seedCategorias() {
    const snap = await db.collection("categorias").get();
    if (!snap.empty) {
        alert("Já existem categorias criadas! Não é necessário inicializar.");
        return;
    }
    const defaults = [
        { nome: 'Album',   icone: 'fa-compact-disc',  ordem: 1 },
        { nome: 'EP',      icone: 'fa-layer-group',    ordem: 2 },
        { nome: 'Single',  icone: 'fa-bolt',           ordem: 3 },
        { nome: 'Mixtape', icone: 'fa-cassette-tape',  ordem: 4 },
    ];
    const batch = db.batch();
    defaults.forEach(cat => {
        const ref = db.collection("categorias").doc();
        batch.set(ref, { ...cat, criada: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    document.getElementById('seed-banner').classList.add('hidden');
    alert("✅ Categorias padrão criadas com sucesso!");
}
