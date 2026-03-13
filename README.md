#Sons Bwé Fixe - Teu Hub de Música em Angola

O **Sons Bwé Fixe** é uma central de entretenimento web completa e imersiva. Mais do que um simples player de áudio, o projeto une o design moderno *Glassmorphism* com funcionalidades avançadas para oferecer uma experiência premium de streaming e interação.

#Funcionalidades Premium

- **Player de Áudio com Efeito Vinil:** As capas das músicas transformam-se em discos giratórios em 360° durante a reprodução, com animação fluida e estado de "pausa" realista.
- **Identidade "Bwé Fixe":** Design personalizado com foco na experiência do usuário, incluindo um logotipo moderno e cabeçalho estilizado.
- **Sistema de Temas Dinâmicos:** 4 temas neon (Azul, Roxo, Verde e Rosa) que alteram as cores de destaque e sombras de todo o site, guardando a preferência do usuário no `localStorage`.
- **Destaques & YouTube:** Integração com a API do YouTube para exibir os vídeos mais recentes do seu canal e uma seção dedicada a novidades e eventos.
- **Playlist com Busca Inteligente:** Filtro em tempo real para encontrar faixas rapidamente e indicador visual de "equalizador" na música que está a tocar.
- **Barra de Notificações (Marquee):** Letreiro animado no topo para anúncios importantes e transmissões em direto.
- **Aba de Contactos & Apoio:** Formulário de contacto completo para parcerias e sistema de doação via PIX/Café com feedback de "Copiado" automático.
- **Atalhos de Teclado:** Controle total via teclado (`Espaço` para Play/Pause, `Setas` para saltar faixas).

#Tecnologias Utilizadas

- **HTML5 (Audio API):** Gestão robusta da engine de som.
- **Tailwind CSS:** Design responsivo e estilização utilitária de alta velocidade.
- **JavaScript (Vanilla):** Lógica pura para garantir leveza e performance, sem dependências pesadas.
- **FontAwesome:** Iconografia completa para interface de usuário.
- **Google Fonts:** Tipografia focada em legibilidade e estilo moderno.

#Estrutura do Projeto

```text
📂 sons-bwe-fixe/
├── 📄 index.html          # Estrutura principal
├── 📄 style.css           # Estilização e Animações Neon
├── 📄 script.js          # Lógica do Player e UI
├── 📂 capas/              # Capas dos álbuns (Quadradas)
├── 📂 musicas/            # Ficheiros MP3
└── 📂 assets/             # Logotipos e ícones adicionais
