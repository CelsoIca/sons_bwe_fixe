// ==========================================
// 1. VIGIA DE SEGURANÇA E ACESSO
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Verifica no Firestore se o usuário é ADMIN e se está ATIVO
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        // 1.1 Bloqueio se o usuário foi desativado pelo General
        if (userData && userData.ativo === false) {
            alert("ACESSO NEGADO: Esta conta de administrador foi suspensa.");
            await auth.signOut();
            window.location.href = '../index.html';
            return;
        }

        // 1.2 Verificação de Role (Cargo)
        if (userData && userData.role === 'admin') {
            document.getElementById('admin-content').classList.remove('hidden');
            if(document.getElementById('error-overlay')) document.getElementById('error-overlay').classList.add('hidden');
            
            // Inicia o carregamento dos dados do painel
            carregarEstatisticas();
            abrirAba('musicas'); // Abre a aba inicial por padrão
        } else {
            // Se não for admin, mostra tela de erro e bloqueia
            if(document.getElementById('error-overlay')) document.getElementById('error-overlay').classList.remove('hidden');
            document.getElementById('admin-content').classList.add('hidden');
        }
    } else {
        // Sem login, volta para a página de entrada
        window.location.href = 'login.html';
    }
});

// ==========================================
// 2. GESTÃO DE MÚSICAS (LANÇAMENTOS)
// ==========================================
async function salvarMusicaNova() {
    const btn = document.getElementById('btn-publicar');
    const inputCapa = document.getElementById('adm-ficheiro-capa');
    const file = inputCapa.files[0];
    
    // Pegar valores dos campos
    const titulo = document.getElementById('adm-titulo').value;
    const artista = document.getElementById('adm-artista').value;
    const urlMp3 = document.getElementById('adm-url').value;
    const tipo = document.getElementById('adm-tipo').value; // Sincronizado com filtros (Single, EP, etc)

    if (!titulo || !artista || !urlMp3) {
        return alert("General, preencha o Título, Artista e o Link do Áudio!");
    }

    btn.innerText = "A PROCESSAR LANÇAMENTO...";
    btn.disabled = true;

    let urlFinalCapa = "";

    try {
        // 2.1 Upload da Capa para ImgBB (se houver ficheiro)
        if (file) {
            btn.innerText = "A CARREGAR CAPA...";
            urlFinalCapa = await uploadParaImgBB(file);
        }

        // 2.2 Salvar no Firestore
        await db.collection("playlist").add({
            titulo: titulo,
            artista: artista,
            url: urlMp3,
            capa: urlFinalCapa, // Link vindo do ImgBB
            tipo: tipo,         // Sincronizado com o filtro do Index
            oculto: false,      // Nova música nasce visível
            ordem: Date.now(),
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Sons Bwé Fixe! Música publicada com sucesso.");
        window.location.reload();

    } catch (e) {
        console.error("Erro ao publicar:", e);
        alert("Erro ao salvar música. Verifique a conexão.");
        btn.disabled = false;
        btn.innerText = "PUBLICAR NO PLAYER";
    }
}

// ==========================================
// 3. GESTÃO DE MENSAGENS E PARCERIAS
// ==========================================
function carregarMensagens() {
    const lista = document.getElementById('adm-lista-parcerias'); // Sincronizado com o ID do seu HTML
    
    db.collection("contactos").orderBy("data", "desc").onSnapshot((snapshot) => {
        lista.innerHTML = "";
        
        // Atualiza contador de parcerias se o elemento existir
        const statTotal = document.getElementById('stat-total');
        if(statTotal) statTotal.innerText = snapshot.size;

        if (snapshot.empty) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10 italic'>Nenhuma proposta de parceria recebida.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            const dataEnvio = msg.data ? msg.data.toDate().toLocaleString() : 'Data desconhecida';
            
            const card = document.createElement('div');
            card.className = "bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition animate-fade-in";
            card.innerHTML = `
                <div class="flex flex-col gap-4">
                    <div class="flex justify-between items-start">
                        <span class="bg-blue-600/20 text-blue-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase italic">
                            ${msg.assunto || 'Parceria'}
                        </span>
                        <button onclick="apagarDocumento('contactos', '${doc.id}')" class="text-gray-600 hover:text-red-500 transition">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    
                    <div>
                        <h3 class="font-black text-lg text-white">${msg.nome}</h3>
                        <p class="text-gray-400 text-sm leading-relaxed mt-2">"${msg.mensagem || msg.descricao}"</p>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-white/5">
                        <div class="text-[9px] text-gray-600 uppercase font-bold">
                            <i class="fa-solid fa-calendar-day mr-1"></i> ${dataEnvio}
                        </div>
                        
                        <div class="flex gap-2">
                            <a href="mailto:${msg.email}" class="bg-white/5 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-white/10 transition">
                                <i class="fa-solid fa-reply mr-1"></i> RESPONDER
                            </a>
                            ${msg.anexoUrl ? 
                                `<a href="${msg.anexoUrl}" target="_blank" class="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition">
                                    VER ANEXO <i class="fa-solid fa-paperclip ml-1"></i>
                                 </a>` : ''
                            }
                        </div>
                    </div>
                </div>
            `;
            lista.appendChild(card);
        });
    });
}

// ==========================================
// 4. FUNÇÕES UTILITÁRIAS DO GENERAL
// ==========================================

// Apagar qualquer documento (Música ou Mensagem)
async function apagarDocumento(colecao, id) {
    if (confirm("General, tem a certeza que deseja apagar este registo?")) {
        try {
            await db.collection(colecao).doc(id).delete();
            // O onSnapshot cuida de atualizar a lista visualmente
        } catch (e) {
            alert("Erro ao apagar: " + e.message);
        }
    }
}

// Estatísticas Rápidas
function carregarEstatisticas() {
    // Total de Músicas
    db.collection("playlist").onSnapshot(snap => {
        const el = document.getElementById('stat-musicas');
        if(el) el.innerText = snap.size;
    });
    // Total de Membros
    db.collection("users").onSnapshot(snap => {
        const el = document.getElementById('stat-users');
        if(el) el.innerText = snap.size;
    });
}
