// ==========================================
// 1. VIGIA DE SEGURANÇA E ACESSO
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();

    if (userData && userData.ativo === false) {
        alert("ACESSO NEGADO: Esta conta foi suspensa.");
        await auth.signOut();
        window.location.href = '../index.html';
        return;
    }

    if (userData && userData.role === 'admin') {
        document.getElementById('admin-content').classList.remove('hidden');
        const errorOverlay = document.getElementById('error-overlay');
        if (errorOverlay) errorOverlay.classList.add('hidden');

        carregarEstatisticas();
        abrirAba('musicas');
        monitorarNotificacoes();
    } else {
        const errorOverlay = document.getElementById('error-overlay');
        if (errorOverlay) errorOverlay.classList.remove('hidden');
        document.getElementById('admin-content').classList.add('hidden');
    }
});

// ==========================================
// 2. GESTÃO DE MÚSICAS
// ==========================================
async function publicarMusicaAdmin() {
    const btn = document.getElementById('btn-publicar');
    const inputCapa = document.getElementById('adm-ficheiro-capa');
    const file = inputCapa ? inputCapa.files[0] : null;

    const titulo = document.getElementById('adm-titulo').value.trim();
    const artista = document.getElementById('adm-artista').value.trim();
    const urlMp3 = document.getElementById('adm-url').value.trim();
    const tipo = document.getElementById('adm-tipo').value;

    if (!titulo || !artista || !urlMp3) {
        return alert("Preenche o Título, Artista e o Link do Áudio!");
    }

    btn.innerText = "A PROCESSAR...";
    btn.disabled = true;

    let urlFinalCapa = "";

    try {
        if (file) {
            btn.innerText = "A CARREGAR CAPA...";
            urlFinalCapa = await uploadParaImgBB(file);
            if (!urlFinalCapa) {
                alert("Erro no upload da capa. Tenta novamente.");
                btn.disabled = false;
                btn.innerText = "PUBLICAR NO PLAYER";
                return;
            }
        }

        await db.collection("playlist").add({
            titulo,
            artista,
            url: urlMp3,
            capa: urlFinalCapa,
            tipo,
            oculto: false,
            ordem: Date.now(),
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Música publicada com sucesso!");
        document.getElementById('adm-titulo').value = '';
        document.getElementById('adm-artista').value = '';
        document.getElementById('adm-url').value = '';
        if (inputCapa) inputCapa.value = '';
        carregarMusicasAdmin();

    } catch (e) {
        console.error("Erro ao publicar:", e);
        alert("Erro ao salvar. Verifica a conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = "PUBLICAR NO PLAYER";
    }
}

// ==========================================
// 3. LISTAR MÚSICAS NO ADMIN
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
            const ocultoLabel = m.oculto ? 'OCULTO' : 'VISÍVEL';
            const ocultoClass = m.oculto ? 'text-red-400' : 'text-emerald-400';
            const ocultoIcon = m.oculto ? 'fa-eye-slash' : 'fa-eye';

            lista.innerHTML += `
                <div class="glass p-5 rounded-[2rem] border border-white/5 flex items-center gap-4 hover:border-blue-500/20 transition group">
                    <img src="${m.capa || '../assets/default.png'}" class="w-14 h-14 rounded-2xl object-cover bg-white/5 flex-shrink-0" onerror="this.src='../assets/default.png'">
                    <div class="flex-1 overflow-hidden">
                        <h4 class="font-black text-sm text-white truncate">${m.titulo}</h4>
                        <p class="text-[9px] text-gray-500 uppercase font-bold truncate">${m.artista}</p>
                        <span class="text-[8px] font-black ${ocultoClass} uppercase">${ocultoLabel} · ${m.tipo || 'Single'}</span>
                    </div>
                    <div class="flex flex-col gap-2 flex-shrink-0">
                        <button onclick="toggleOcultarMusica('${doc.id}', ${m.oculto})" class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition" title="${m.oculto ? 'Mostrar' : 'Ocultar'}">
                            <i class="fa-solid ${ocultoIcon} text-xs text-gray-400"></i>
                        </button>
                        <button onclick="apagarDocumento('playlist', '${doc.id}')" class="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition" title="Apagar">
                            <i class="fa-solid fa-trash-can text-xs text-red-500"></i>
                        </button>
                    </div>
                </div>`;
        });
    });
}

async function toggleOcultarMusica(id, estadoAtual) {
    await db.collection("playlist").doc(id).update({ oculto: !estadoAtual });
}

// ==========================================
// 4. GESTÃO DE PARCERIAS / CONTACTOS
// ==========================================
function carregarParcerias() {
    const lista = document.getElementById('adm-lista-parcerias');

    db.collection("contactos").orderBy("data", "desc").onSnapshot(snap => {
        lista.innerHTML = "";

        if (snap.empty) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10 italic col-span-2'>Nenhuma proposta recebida ainda.</p>";
            return;
        }

        const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarParcerias(dados);
    });
}

function renderizarParcerias(dados) {
    const list = document.getElementById('adm-lista-parcerias');
    list.innerHTML = "";

    dados.forEach(p => {
        const isLido = p.lido === true;
        const dataEnvio = p.data ? p.data.toDate().toLocaleString('pt-PT') : 'Data desconhecida';

        list.innerHTML += `
            <div class="glass p-6 rounded-[2rem] border ${isLido ? 'border-white/5 opacity-60' : 'border-white/10 shadow-lg'} flex flex-col transition-all duration-300">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">${p.assunto || 'Parceria'}</span>
                        ${!isLido ? '<span class="text-[8px] text-[#EF3C54] font-black animate-pulse ml-1">● NOVO</span>' : ''}
                    </div>
                    <button onclick="toggleLido('${p.id}', ${isLido})" class="text-xl ${isLido ? 'text-blue-500' : 'text-gray-600'} hover:scale-110 transition" title="${isLido ? 'Marcar como não lido' : 'Marcar como lido'}">
                        <i class="fa-solid ${isLido ? 'fa-circle-check' : 'fa-circle'}"></i>
                    </button>
                </div>

                <h4 class="font-black text-base text-white">${p.nome}</h4>
                <p class="text-[10px] text-gray-500 mb-3">${p.email}</p>

                <div class="bg-black/20 p-4 rounded-xl mb-4 border border-white/5 flex-1">
                    <p class="text-xs text-gray-300 leading-relaxed italic">"${p.mensagem || p.descricao || 'Sem mensagem.'}"</p>
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-white/5">
                    <span class="text-[8px] text-gray-600 uppercase font-bold"><i class="fa-solid fa-calendar-day mr-1"></i>${dataEnvio}</span>
                    <div class="flex gap-2">
                        ${p.anexoUrl ? `<a href="${p.anexoUrl}" target="_blank" class="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition" title="Ver Anexo"><i class="fa-solid fa-paperclip text-xs"></i></a>` : ''}
                        <a href="mailto:${p.email}" class="w-8 h-8 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center hover:bg-white/10 transition" title="Responder"><i class="fa-solid fa-reply text-xs"></i></a>
                        <button onclick="apagarDocumento('contactos', '${p.id}')" class="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition" title="Apagar"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                </div>
            </div>`;
    });
}

async function toggleLido(id, statusAtual) {
    try {
        await db.collection("contactos").doc(id).update({ lido: !statusAtual });
    } catch (e) {
        console.error("Erro ao atualizar status:", e);
    }
}

// ==========================================
// 5. FUNÇÕES UTILITÁRIAS
// ==========================================
async function apagarDocumento(colecao, id) {
    if (confirm("Tens a certeza que queres apagar este registo?")) {
        try {
            await db.collection(colecao).doc(id).delete();
        } catch (e) {
            alert("Erro ao apagar: " + e.message);
        }
    }
}

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
