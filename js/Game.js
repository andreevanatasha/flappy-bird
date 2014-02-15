(function() {
    var GameInitialize = function GameInitialize() {
        ///////////////////
        //GAME CONSTANTS //
        ///////////////////
        var DEBUG_MODE = true,
            SPEED = 180,
            GRAVITY = 1800,
            BIRD_FLAP = 550,
            TOWER_SPAWN_INTERVAL = 2000,
            AVAILABLE_SPACE_BETWEEN_TOWERS = 130,
            CLOUDS_SHOW_MIN_TIME = 5000,
            CLOUDS_SHOW_MAX_TIME = 10000,
            MAX_DIFFICULT = 50,
            SCENE = '',
            TITLE_TEXT = "FLAPPY BIRD",
            INSTRUCTIONS_TEXT = "TOUCH\nTO\nFLY",
            INSTRUCTIONS_TEXT_GAME_OVER = "TOUCH\nFOR GO\nBACK",
            ABOUT_TEXT = "Developer\nEugene Obrezkov\nghaiklor@gmail.com\n\n\nGraphic\nDima Lezhenko",
            LOADING_TEXT = "LOADING...",
            WINDOW_WIDTH = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
            WINDOW_HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;

        /////////////////////////////////////////////
        //HELPER VARIABLES FOR SAVING GAME-OBJECTS //
        /////////////////////////////////////////////
        var Background,
            Clouds, CloudsTimer,
            Towers, TowersTimer, FreeSpacesInTowers,
            Bird,
            Fence,
            FlapSound, ScoreSound, HurtSound,
            TitleText, AboutText, ScoreText, InstructionsText, HighScoreText, LoadingText;

        //////////////////////////////////
        //VARIABLES FOR GAME-MANAGEMENT //
        //////////////////////////////////
        var isGameStarted = false,
            isGameOver = false,
            gameScore = 0;


        ////////////////////////////////////////////
        //State - BootGame (Loading text appears) //
        ////////////////////////////////////////////
        var BootGameState = new Phaser.State();

        BootGameState.create = function() {
            LoadingText = Game.add.text(Game.world.width / 2, Game.world.height / 2, LOADING_TEXT, {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            LoadingText.anchor.setTo(0.5, 0.5);

            Game.state.start('Preloader', false, false);
        };

        BootGameState.update = function() {
            LoadingText.angle = 10 * Math.cos(Game.time.now / 100);
        };

        /////////////////////////////////////
        //State - Preloader (Loading Assets) //
        /////////////////////////////////////
        var PreloaderGameState = new Phaser.State();

        PreloaderGameState.preload = function() {
            loadAssets();
            Game.state.start('MainMenu');
        };

        PreloaderGameState.update = function() {
            LoadingText.angle = 10 * Math.cos(Game.time.now / 100);
        };

        //////////////////////
        //State - Main Menu //
        //////////////////////
        var MainMenuState = new Phaser.State();

        MainMenuState.preload = function() {
            loadAssets();
        };

        MainMenuState.create = function() {
            isGameStarted = false;
            isGameOver = false;
            gameScore = 0;

            createBackground();
            createRain();
            createClouds();
            createFence();
            createBird();
            createTexts();
            createSounds();

            Game.input.onDown.addOnce(function() {
                birdFlap();
                Game.state.start('Game', false, false);
            });
        };

        MainMenuState.update = function() {
            Bird.y = (Game.world.height / 2) + 32 * Math.cos(Game.time.now / 1000);
            Bird.x = (Game.world.width / 10) + 32 * Math.sin(Game.time.now / 3000);

            Clouds.forEachAlive(function(cloud) {
                if (cloud.x + cloud.width < Game.world.bounds.left) {
                    cloud.kill();
                }
            });

            // TitleText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
            Fence.tilePosition.x -= Game.time.physicsElapsed * SPEED / 2;
            TitleText.angle = 5 * Math.cos(Game.time.now / 100);
            InstructionsText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
        };

        /////////////////////////////////////
        //Game state - Where game is going //
        /////////////////////////////////////
        var GameState = new Phaser.State();

        GameState.preload = function() {
            // loadAssets();
        };

        GameState.create = function() {
            isGameStarted = true;

            // createBackground();
            // createRain();
            // createClouds();
            createTowers();
            // createFence();
            // createBird();
            // createTexts();
            // createSounds();

            Game.input.onDown.add(birdFlap);

            TitleText.renderable = false;
            InstructionsText.renderable = false;
            AboutText.renderable = false;
            HighScoreText.renderable = false;
            ScoreText.renderable = true;
            ScoreText.setText(gameScore);

            Bird.body.allowGravity = true;

        };

        GameState.update = function() {
            var divingInAir = BIRD_FLAP + Bird.body.velocity.y;
            Bird.angle = (90 * divingInAir / BIRD_FLAP) - 180;
            if (Bird.angle < -30) {
                Bird.angle = -30;
            } else if (Bird.angle > 30) {
                Bird.angle = 30;
            }

            if (Bird.body.bottom >= Game.world.bounds.bottom - 32 || Bird.body.top <= Game.world.bounds.top) {
                Game.state.start('GameOver', false, false);
            }

            Game.physics.overlap(Bird, Towers, function() {
                Game.state.start('GameOver', false, false);
            });

            Game.physics.overlap(Bird, FreeSpacesInTowers, addScore);

            Towers.forEachAlive(function(tower) {
                if (tower.x + tower.width < Game.world.bounds.left) {
                    tower.kill();
                }
            });
        };

        GameState.render = function() {
            if (DEBUG_MODE) {
                Game.debug.renderCameraInfo(Game.camera, 32, 32);
                Game.debug.renderSpriteBody(Bird);
                Game.debug.renderSpriteBounds(Bird);
                Game.debug.renderSpriteCorners(Bird, true, true);

                Game.debug.renderQuadTree(Game.physics.quadTree);

                Towers.forEachAlive(function(tower) {
                    Game.debug.renderSpriteBody(tower);
                    Game.debug.renderSpriteCorners(tower, true, true);
                });

                FreeSpacesInTowers.forEachAlive(function(spaceInTower) {
                    Game.debug.renderSpriteBody(spaceInTower);
                });
            }
        };

        //////////////////////////////////
        //State which show on Game Over //
        //////////////////////////////////
        var GameOverState = new Phaser.State();

        GameOverState.preload = function() {
            // loadAssets();
        };

        GameOverState.create = function() {
            isGameOver = true;

            // createBackground();
            // createRain();
            // createClouds();
            // createFence();
            // createBird();
            // createTexts();

            Game.input.onDown.add(function() {
                Game.state.start('MainMenu', true, false);
            });

            Towers.forEachAlive(function(tower) {
                tower.body.velocity.x = 0;
            });

            FreeSpacesInTowers.forEachAlive(function(spaceInTower) {
                spaceInTower.body.velocity.x = 0;
            });

            TowersTimer.stop();
            HurtSound.play();
            ScoreText.renderable = false;
            HighScoreText.renderable = true;
            InstructionsText.renderable = true;
            InstructionsText.setText(INSTRUCTIONS_TEXT_GAME_OVER);
            HighScoreText.setText("HIGHSCORE: " + getHighscore(gameScore) + "\nYOUR SCORE: " + gameScore);
            Bird.angle = 180;
            Bird.animations.stop();
            Bird.frame = 3;
        };

        ///////////////////
        //Make bird flap //
        ///////////////////
        var birdFlap = function birdFlap() {
            Bird.body.velocity.y = -BIRD_FLAP;
            FlapSound.play();
        };

        ////////////////////////////////////
        // Add score to current gameScore //
        ////////////////////////////////////
        var addScore = function addScore(_, spaceInTower) {
            FreeSpacesInTowers.remove(spaceInTower);
            ++gameScore;
            ScoreText.setText(gameScore);
            ScoreSound.play();
        };

        ///////////////////
        // Get highscore //
        ///////////////////
        var getHighscore = function getHighscore(score) {
            var highscore = window.localStorage.getItem('highscore');
            if (score > highscore || highscore === null) {
                highscore = score;
                window.localStorage.setItem('highscore', highscore);
            }

            return highscore;
        };

        ////////////////////////
        //Load assets in game //
        ////////////////////////
        var loadAssets = function loadAssets() {
            Game.load.spritesheet('bird', 'img/bird.png', 48, 34);
            Game.load.spritesheet('clouds', 'img/clouds.png', 128, 64);
            Game.load.spritesheet('rain', 'img/rain.png', 17, 17);
            Game.load.image('fence', 'img/fence.png');
            Game.load.image('tower', 'img/tower.png');
            Game.load.audio('flap', 'wav/flap.wav');
            Game.load.audio('hurt', 'wav/hurt.wav');
            Game.load.audio('score', 'wav/score.wav');
        };

        //////////////////////
        //Create background //
        //////////////////////
        var createBackground = function createBackground() {
            Background = Game.add.graphics(0, 0);
            Background.beginFill(0x4E5B61, 1);
            Background.drawRect(0, 0, Game.world.width, Game.world.height);
            Background.endFill();
        };

        ////////////////
        //Create Rain //
        ////////////////
        var createRain = function createRain() {
            var emitter = Game.add.emitter(Game.world.centerX, 0, 400);
            emitter.width = Game.world.width;
            emitter.angle = 0;
            emitter.makeParticles('rain');
            emitter.maxParticleScale = 0.5;
            emitter.minParticleScale = 0.1;
            emitter.setYSpeed(300, 500);
            emitter.setXSpeed(-5, 5);
            emitter.minRotation = 0;
            emitter.maxRotation = 0;
            emitter.gravity = GRAVITY;
            emitter.start(false, 1600, 5, 0);
        };

        //////////////////
        //Create clouds //
        //////////////////
        var createClouds = function createClouds() {
            function makeNewCloud() {
                var cloudY = Math.random() * Game.world.height / 2,
                    cloud = Clouds.create(Game.world.width, cloudY, 'clouds', Math.floor(4 * Math.random())),
                    cloudScale = 1 + Math.floor((3 * Math.random()));

                cloud.alpha = 2 / cloudScale;
                cloud.scale.setTo(cloudScale, cloudScale);
                cloud.body.allowGravity = false;
                cloud.body.velocity.x = -SPEED / cloudScale;
                cloud.anchor.setTo(0, 0.5);

                CloudsTimer.add(Game.rnd.integerInRange(CLOUDS_SHOW_MIN_TIME, CLOUDS_SHOW_MAX_TIME), makeNewCloud, this);
            }
            Clouds = Game.add.group();
            CloudsTimer = Game.time.create(false);
            CloudsTimer.add(0, makeNewCloud, this);
            CloudsTimer.start();
        };

        /////////////////
        //Create Fence //
        /////////////////
        var createFence = function createFence() {
            Fence = Game.add.tileSprite(0, Game.world.height - 32, Game.world.width, 32, 'fence');
            Fence.tileScale.setTo(2, 2);
        };

        ////////////////
        //Create bird //
        ////////////////
        var createBird = function createBird() {
            Bird = Game.add.sprite(0, 0, 'bird');
            Bird.anchor.setTo(0.5, 0.5);
            Bird.animations.add('flying', [0, 1, 2, 3, 2, 1, 0], 20, true);
            Bird.animations.play('flying');
            Bird.body.collideWorldBounds = true;
            Bird.body.gravity.y = GRAVITY;
        };

        //////////////////
        //Create towers //
        //////////////////
        var createTowers = function createTowers() {
            function calcDifficult() {
                return AVAILABLE_SPACE_BETWEEN_TOWERS + 60 * ((gameScore > MAX_DIFFICULT ? MAX_DIFFICULT : MAX_DIFFICULT - gameScore) / MAX_DIFFICULT);
            }

            function makeNewTower(towerY, isFlipped) {
                var tower = Towers.create(Game.world.width, towerY + (isFlipped ? -calcDifficult() : calcDifficult()) / 2, 'tower');

                tower.body.allowGravity = false;
                tower.scale.setTo(2, isFlipped ? -2 : 2);
                tower.body.offset.y = isFlipped ? -tower.body.height * 2 : 0;
                tower.body.velocity.x = -SPEED;
                return tower;
            }

            function makeTowers() {
                var towerY = ((Game.world.height - 16 - calcDifficult() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * Game.world.height / 6,
                    bottomTower = makeNewTower(towerY),
                    topTower = makeNewTower(towerY, true);

                var spaceInTower = FreeSpacesInTowers.create(topTower.x + topTower.width, 0);
                spaceInTower.width = 2;
                spaceInTower.height = Game.world.height;
                spaceInTower.body.allowGravity = false;
                spaceInTower.body.velocity.x = -SPEED;

                TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
            }

            Towers = Game.add.group();
            FreeSpacesInTowers = Game.add.group();
            TowersTimer = Game.time.create(false);
            TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
            TowersTimer.start();
        };

        /////////////////
        //Create Texts //
        /////////////////
        var createTexts = function createTexts() {
            TitleText = Game.add.text(Game.world.width / 2, Game.world.height / 3, TITLE_TEXT, {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            TitleText.anchor.setTo(0.5, 0.5);
            TitleText.angle = 5;

            AboutText = Game.add.text(Game.world.width - 10, 10, ABOUT_TEXT, {
                font: '14px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            AboutText.anchor.x = 1;

            InstructionsText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 3, INSTRUCTIONS_TEXT, {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            InstructionsText.anchor.setTo(0.5, 0.5);

            ScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            ScoreText.anchor.setTo(0.5, 0.5);

            HighScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
                font: '24px "Press Start 2P"',
                fill: '#fff',
                stroke: '#430',
                strokeThickness: 8,
                align: 'center'
            });
            HighScoreText.anchor.setTo(0.5, 0.5);
        };

        //////////////////
        //Create Sounds //
        //////////////////
        var createSounds = function createSounds() {
            FlapSound = Game.add.audio('flap');
            ScoreSound = Game.add.audio('score');
            HurtSound = Game.add.audio('hurt');
        };

        //////////////
        //INIT CORE //
        //////////////
        var Game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, SCENE);
        Game.state.add('Boot', BootGameState, false);
        Game.state.add('Preloader', PreloaderGameState, false);
        Game.state.add('MainMenu', MainMenuState, false);
        Game.state.add('Game', GameState, false);
        Game.state.add('GameOver', GameOverState, false);

        Game.state.start('Boot');
    };


    WebFont.load({
        google: {
            families: ['Press+Start+2P']
        },
        active: function() {
            GameInitialize();
        }
    });
})();