auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Verifica no Firestore se o usuário é ADMIN
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        if (userData && userData.role === 'admin') {
            document.getElementById('admin-content').classList.remove('hidden');
            carregarMensagens();
        } else {
            document.getElementById('admin-denied').classList.remove('hidden');
        }
    } else {
        window.location.href = 'login.html';
    }
});

function carregarMensagens() {
    const lista = document.getElementById('mensagens-lista');
    
    db.collection("contactos").orderBy("data", "desc").onSnapshot((snapshot) => {
        lista.innerHTML = "";
        document.getElementById('stat-total').innerText = snapshot.size;

        if (snapshot.empty) {
            lista.innerHTML = "<p class='text-center text-gray-600 py-10'>Nenhuma mensagem recebida.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            const dataEnvio = msg.data ? msg.data.toDate().toLocaleString() : '---';
            
            const card = document.createElement('div');
            card.className = "glass p-6 rounded-[2rem] border border-white/10 hover:border-blue-500/50 transition";
            card.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between gap-4">
                    <div class="space-y-2">
                        <span class="bg-blue-600/20 text-blue-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase italic">${msg.assunto}</span>
                        <h3 class="font-black text-lg">${msg.nome}</h3>
                        <p class="text-gray-400 text-sm italic">"${msg.descricao}"</p>
                        <p class="text-[9px] text-gray-600 uppercase font-bold">${dataEnvio}</p>
                    </div>
                    <div class="flex items-center">
                        ${msg.anexoUrl ? 
                            `<a href="${msg.anexoUrl}" target="_blank" class="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-6 py-3 rounded-2xl text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition">
                                VER COMPROVATIVO <i class="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                             </a>` : 
                            `<span class="text-[10px] text-gray-600 font-bold uppercase">Sem Anexo</span>`
                        }
                    </div>
                </div>
            `;
            lista.appendChild(card);
        });
    });

    async function salvarMusicaNova() {
    const btn = document.getElementById('btn-publicar');
    const inputCapa = document.getElementById('adm-ficheiro-capa');
    const file = inputCapa.files[0];
    
    btn.innerText = "A carregar imagem...";
    btn.disabled = true;

    let urlFinalCapa = "";

    // Se o usuário selecionou uma foto, faz o upload primeiro
    if (file) {
        urlFinalCapa = await uploadParaImgBB(file);
    }

    // Agora guarda no Firestore com o link que veio do ImgBB
    try {
        await db.collection("playlist").add({
            titulo: document.getElementById('adm-titulo').value,
            artista: document.getElementById('adm-artista').value,
            url: document.getElementById('adm-url').value,
            capa: urlFinalCapa, // Link do ImgBB guardado aqui!
            ordem: Date.now()
        });
        alert("Música publicada com sucesso!");
        window.location.reload();
    } catch (e) {
        alert("Erro ao salvar.");
    }
}
}
