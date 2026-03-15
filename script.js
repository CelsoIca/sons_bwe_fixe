// 1. CONFIGURAÇÕES INICIAIS
const IMGBB_API_KEY = "b0f9a034a766f6b052c4b537e0b1d2e6"; // <-- COLOCA A TUA CHAVE AQUI

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
  authDomain: "sons-bwe-fixes-a543b.firebaseapp.com",
  projectId: "sons-bwe-fixes-a543b",
  storageBucket: "sons-bwe-fixes-a543b.firebasestorage.app",
  messagingSenderId: "25559012829",
  appId: "1:25559012829:web:ce469fbf416d8d8d975234",
  measurementId: "G-7Q13H5SRQS"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Ativar cache offline para melhor performance em Angola
db.enablePersistence().catch(err => console.error("Erro persistência:", err.code));

// 2. FUNÇÃO DE NOTIFICAÇÃO (TOAST)
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const tTitle = document.getElementById('toast-title');
    const tMsg = document.getElementById('toast-msg');
    const tIcon = document.getElementById('toast-icon');

    if (type === 'success') {
        tIcon.className = "w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center";
        tIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
        tIcon.className = "w-8 h-8 rounded-full bg-red-500 flex items-center justify-center";
        tIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }

    tTitle.innerText = title;
    tMsg.innerText = message;

    toast.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
    toast.classList.add('opacity-100', 'scale-100', 'bottom-16');

    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
        toast.classList.remove('opacity-100', 'scale-100', 'bottom-16');
    }, 3500);
}

// 3. LÓGICA DO PLAYER
const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');

playBtn.addEventListener('click', () => {
    if (audio.src === "" || audio.paused) {
        if(audio.src === "") showToast("Aviso", "Escolha uma música primeiro!", "error");
        else {
            audio.play();
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    } else {
        audio.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
});

// 4. ENVIO DE FORMULÁRIO (FIREBASE + IMGBB)
document.getElementById('contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const fileInput = document.getElementById('form-file');
    
    btn.innerText = "A ENVIAR... ⏳";
    btn.disabled = true;

    try {
        let fileUrl = "";

        // Se houver imagem, sobe para o ImgBB
        if (fileInput.files[0]) {
            const formData = new FormData();
            formData.append("image", fileInput.files[0]);

            const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const imgData = await imgRes.json();
            fileUrl = imgData.data.url;
        }

        // Guarda no Firestore
        await db.collection("contactos").add({
            nome: e.target[0].value,
            assunto: document.getElementById('form-subject').value,
            descricao: document.getElementById('form-desc').value,
            anexoUrl: fileUrl,
            data: new Date()
        });

        showToast("Sucesso!", "A tua mensagem foi enviada com sucesso.", "success");
        this.reset();

    } catch (error) {
        showToast("Erro!", "Não foi possível enviar: " + error.message, "error");
    } finally {
        btn.innerText = "ENVIAR SOLICITAÇÃO";
        btn.disabled = false;
    }
});

// 5. REGISTO DE ESTATÍSTICAS (OPCIONAL)
async function trackPlay(songTitle) {
    const user = auth.currentUser;
    if (user) {
        const ref = db.collection("users").doc(user.uid).collection("top_musicas").doc(songTitle);
        await ref.set({
            titulo: songTitle,
            reproducoes: firebase.firestore.FieldValue.increment(1),
            ultimaEscuta: new Date()
        }, { merge: true });
    }
}