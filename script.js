window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- VARIÁVEIS GLOBAIS DO JOGO ---
    let score, gameSpeed, obstacles, obstacleTimer, gameOver;
    let player, background, input;
    
    // Variáveis para todos os assets
    let openingIntroMusic, menuMusic, gameIntroMusic, backgroundMusic, gameOverMusic;
    let gameOverImage, scoreIcon, menuBackground;
    let openingIntroImages = [], gameIntroImages = [], startButtonImages = [];
    let startButtonRect = {}, menuAnimationId;

    // --- FUNÇÃO DE REDIMENSIONAMENTO ---
    function setCanvasDimensions() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // --- CLASSES DO JOGO ---

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = this.gameWidth * 0.30; 
            this.height = this.width;
            this.x = (this.gameWidth / 2) - (this.width / 2);
            this.y = this.gameHeight - this.height - 20;
            this.image = new Image();
            this.image.src = 'IMG/player1.png';
        }
        draw(context) {
            if (this.image.complete) context.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
        update(input) {
            if (input.touchX) this.x = input.touchX - (this.width / 2);
            if (this.x < 0) this.x = 0;
            if (this.x > this.gameWidth - this.width) this.x = this.gameWidth - this.width;
        }
    }

    class Obstacle {
        constructor(gameWidth, gameHeight, speed) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = this.gameWidth * 0.38;
            this.height = this.width;
            const lanes = [this.gameWidth * 0.20, this.gameWidth / 2, this.gameWidth * 0.80];
            this.x = lanes[Math.floor(Math.random() * lanes.length)] - (this.width / 2);
            this.y = -this.height;
            this.speed = speed;
            this.markedForDeletion = false;
            this.image = new Image();
            const obstacleImages = ['obstacle1.png', 'obstacle2.png', 'obstacle3.png', 'obstacle4.png', 'obstacle5.png'];
            this.image.src = `IMG/${obstacleImages[Math.floor(Math.random() * obstacleImages.length)]}`;
        }
        draw(context) {
            if (this.image.complete) context.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
        update() {
            this.y += this.speed;
            if (this.y > this.gameHeight) {
                this.markedForDeletion = true;
                score++;
            }
        }
    }

    class Background {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = new Image();
            this.image.src = 'IMG/background1.png';
            this.negaImage = new Image();
            this.negaImage.src = 'IMG/nega_background1.png';
            this.y1 = 0;
            this.y2 = -this.gameHeight;
            this.speed = this.gameHeight * 0.005;
            this.isNegaPhase = false;
        }
        draw(context) {
            const currentImage = this.isNegaPhase ? this.negaImage : this.image;
            if (currentImage.complete) {
                context.drawImage(currentImage, 0, this.y1, this.gameWidth, this.gameHeight);
                context.drawImage(currentImage, 0, this.y2, this.gameWidth, this.gameHeight);
            }
        }
        update() {
            this.y1 += this.speed;
            this.y2 += this.speed;
            if (this.y1 >= this.gameHeight) this.y1 = -this.gameHeight + this.speed;
            if (this.y2 >= this.gameHeight) this.y2 = -this.gameHeight + this.speed;
        }
        startNegaPhase() { this.isNegaPhase = true; }
        endNegaPhase() { this.isNegaPhase = false; }
    }

    class InputHandler {
        constructor(gameCanvas) {
            this.touchX = null;
            gameCanvas.addEventListener('touchstart', e => { this.touchX = e.touches[0].clientX; });
            gameCanvas.addEventListener('touchmove', e => { this.touchX = e.touches[0].clientX; });
            gameCanvas.addEventListener('touchend', e => { this.touchX = null; });
            gameCanvas.addEventListener('mousedown', e => { this.touchX = e.clientX; });
            gameCanvas.addEventListener('mousemove', e => { if (e.buttons === 1) this.touchX = e.clientX; });
            gameCanvas.addEventListener('mouseup', e => { this.touchX = null; });
            gameCanvas.addEventListener('mouseleave', e => { this.touchX = null; });
        }
    }

    // --- FUNÇÕES DE CONTROLE DO JOGO ---

    function checkCollision(rect1, rect2) {
        const margin = rect1.width * 0.7; 
        return (
            rect1.x < rect2.x + rect2.width - margin &&
            rect1.x + rect1.width > rect2.x + margin &&
            rect1.y < rect2.y + rect2.height - margin &&
            rect1.y + rect1.height > rect2.y + margin
        );
    }

    function displayUI(context) {
        if (scoreIcon && scoreIcon.complete && !gameOver) {
            const iconSize = canvas.width * 0.1;
            const iconX = 20;
            const iconY = 25;
            const textX = iconX + iconSize + 10;
            const textY = iconY + iconSize / 2;

            context.drawImage(scoreIcon, iconX, iconY, iconSize, iconSize);
            
            context.textAlign = 'left';
            context.textBaseline = 'middle';
            context.fillStyle = 'white';
            context.font = `${canvas.width * 0.05}px Arial`;
            context.fillText(score, textX, textY);
        }

        if (gameOver) {
            if (gameOverImage.complete) {
                context.drawImage(gameOverImage, 0, 0, canvas.width, canvas.height);
            }
        }
    }

    // --- INICIALIZAÇÃO E LOOP DO JOGO ---

    function setupGame() {
        setCanvasDimensions();
        score = 0;
        gameSpeed = canvas.height * 0.005;
        obstacles = [];
        obstacleTimer = 100;
        gameOver = false;
        background = new Background(canvas.width, canvas.height);
        player = new Player(canvas.width, canvas.height);
        input = new InputHandler(canvas);

        if (gameOverMusic) gameOverMusic.pause();
        if (backgroundMusic) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play();
        }

        canvas.onclick = () => {
            if (gameOver) {
                setupGame();
                animate(0);
            }
        };
    }

    let lastTime = 0;
    function animate(timestamp) {
        if (gameOver) {
            displayUI(ctx);
            return;
        }
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background.update();
        background.draw(ctx);
        player.update(input);
        player.draw(ctx);

        if (obstacleTimer <= 0) {
            obstacles.push(new Obstacle(canvas.width, canvas.height, gameSpeed));
            obstacleTimer = Math.random() * 40 + 30; 
        } else {
            obstacleTimer -= deltaTime / 13.67; 
        }

        obstacles.forEach(o => {
            o.update();
            o.draw(ctx);
            if (checkCollision(player, o)) {
                gameOver = true;
                if (backgroundMusic) backgroundMusic.pause();
                if (gameOverMusic) {
                    gameOverMusic.currentTime = 0;
                    gameOverMusic.play();
                }
            }
        });
        obstacles = obstacles.filter(o => !o.markedForDeletion);

        if (score > 0 && score % 200 === 0 && !background.isNegaPhase) {
            background.startNegaPhase();
            gameSpeed *= 1.5;
            background.speed *= 1.5;
        }

        displayUI(ctx);
        requestAnimationFrame(animate);
    }

    // --- PONTO DE PARTIDA E SEQUÊNCIAS ---
    
    function showStartScreen(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (menuBackground && menuBackground.complete) {
            ctx.drawImage(menuBackground, 0, 0, canvas.width, canvas.height);
        }

        if (startButtonImages.length > 0) {
            const baseButtonWidth = canvas.width * 0.6;
            const pulseSpeed = 0.002;
            const pulseAmount = 0.01;
            const scale = 1 + Math.sin(timestamp * pulseSpeed) * pulseAmount;
            
            const buttonWidth = baseButtonWidth * scale;
            const buttonImage = startButtonImages[0];
            const buttonHeight = buttonWidth * (buttonImage.height / buttonImage.width);
            const buttonX = (canvas.width / 2) - (buttonWidth / 2);
            const buttonY = (canvas.height * 0.7) + 20;

            startButtonRect = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
            
            if (buttonImage.complete) {
                ctx.drawImage(buttonImage, buttonX, buttonY, buttonWidth, buttonHeight);
            }
        }
        
        menuAnimationId = requestAnimationFrame(showStartScreen);
    }

    function handleMenuClick(event) {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        if (clickX >= startButtonRect.x && clickX <= startButtonRect.x + startButtonRect.width &&
            clickY >= startButtonRect.y && clickY <= startButtonRect.y + startButtonRect.height) {
            
            cancelAnimationFrame(menuAnimationId);
            if (menuMusic) menuMusic.pause();
            canvas.removeEventListener('click', handleMenuClick);

            playGameIntro();
        }
    }

    function initializeAssets() {
        openingIntroMusic = new Audio('AUDIO/sound5.mp3');
        openingIntroMusic.volume = 0.5;

        menuMusic = new Audio('AUDIO/8bit incicio.mp3');
        menuMusic.loop = true;
        menuMusic.volume = 0.5;

        gameIntroMusic = new Audio('AUDIO/intro_music.mp3');
        gameIntroMusic.volume = 0.5;
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `IMG/intro_${i}.png`;
            gameIntroImages.push(img);
        }

        backgroundMusic = new Audio('AUDIO/game_music.mp3'); 
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.5;
        
        gameOverMusic = new Audio('AUDIO/game_over_music.mp3');
        gameOverMusic.volume = 0.5;

        gameOverImage = new Image();
        gameOverImage.src = 'IMG/game_over.png';

        scoreIcon = new Image();
        scoreIcon.src = 'IMG/score_icon.png';

        menuBackground = new Image();
        menuBackground.src = 'IMG/bg.png';
        
        const btnImg = new Image();
        btnImg.src = 'IMG/btn_01.png';
        startButtonImages.push(btnImg);

        for (let i = 1; i <= 10; i++) {
            const img = new Image();
            const number = i.toString().padStart(2, '0');
            img.src = `IMG/seq_${number}.png`;
            openingIntroImages.push(img);
        }
    }

    function playOpeningIntro() {
        setCanvasDimensions();
        let currentFrame = 0;

        setTimeout(() => {
            if (openingIntroMusic) openingIntroMusic.play();
        }, 500);

        const introInterval = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const img = openingIntroImages[currentFrame];
            if (img && img.complete) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            
            currentFrame++;
            
            if (currentFrame >= openingIntroImages.length) {
                clearInterval(introInterval);
                if (openingIntroMusic) openingIntroMusic.pause();
                if (menuMusic) {
                    menuMusic.currentTime = 0;
                    menuMusic.play();
                }
                menuAnimationId = requestAnimationFrame(showStartScreen);
                canvas.addEventListener('click', handleMenuClick);
            }
        }, 500);
    }

    // *** FUNÇÃO FINAL CORRIGIDA PARA A SEGUNDA INTRODUÇÃO ***
    function playGameIntro() {
        setCanvasDimensions();
        let currentFrame = 0;
        const frameDuration = 4000 / 3; // Altere aqui o tempo de cada imagem

        const firstImage = gameIntroImages[0];

        const startTheIntro = () => {
            // 1. Desenha a primeira imagem para evitar a tela preta.
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(firstImage, 0, 0, canvas.width, canvas.height);
            currentFrame++;

            // 2. Inicia a música.
            if (gameIntroMusic) {
                gameIntroMusic.currentTime = 0;
                gameIntroMusic.play();
            }

            // 3. Inicia o intervalo para as imagens restantes.
            const gameIntroInterval = setInterval(() => {
                // PRIMEIRO, verificamos se a animação já terminou.
                if (currentFrame >= gameIntroImages.length) {
                    clearInterval(gameIntroInterval);
                    // Se terminou, inicia o jogo de verdade.
                    setupGame();
                    animate(0);
                    return; // Sai da função do intervalo.
                }

                // SEGUNDO, se não terminou, limpamos a tela e desenhamos a imagem atual.
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const img = gameIntroImages[currentFrame];
                if (img && img.complete) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                
                // TERCEIRO, preparamos para o próximo frame.
                currentFrame++;

            }, frameDuration);
        };

        if (firstImage.complete) {
            startTheIntro();
        } else {
            firstImage.onload = startTheIntro;
        }
    }

    // Inicia todo o processo
    initializeAssets();
    playOpeningIntro();

    window.addEventListener('resize', () => {
        window.location.reload();
    });
});
