'use strict';

import { LevelBuilder } from './idk-level.js';

const ARROW_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];

class IdkGame {
    static get CANVAS_X_SCALE() { return 2.5; }
    static get CANVAS_Y_SCALE() { return 2.5; }
    static get TICK_TIME() { return 110; }

    constructor(canvas) {
        this.levelBuilder = new LevelBuilder();
        this.gameRenderer = new GameRenderer(canvas, IdkGame.CANVAS_X_SCALE, IdkGame.CANVAS_Y_SCALE);
        this.keyPresses = new Map();
    }

    start() {
        this.tickCount = -1;
        this.isRunning = true;
        this.currentLevel = this.levelBuilder.buildLevelFromJsonFile('./src/levels/level1.json');

        let keyPresses = this.keyPresses;
        keyPresses.clear();
        document.addEventListener("keydown", function(event) {
            //Prevents the screen from scrolling when attempting to move
            if (ARROW_KEYS.includes(event.key)) {
                event.preventDefault();
            }

            keyPresses.set(event.key, true);
        });

        document.addEventListener("keyup", function(event) {
            keyPresses.set(event.key, false);
        });

        this.tick();
    }

    tick() {
        ++this.tickCount;
        this.gameRenderer.draw(this.currentLevel);
        this.currentLevel.tick(this.tickCount, this.keyPresses);
        if (this.isRunning) {
            let currentGame = this;
            setTimeout(() => currentGame.tick(), IdkGame.TICK_TIME)
        }
    }
}

class GameRenderer {
    constructor(canvas, xScale, yScale) {
        this.canvas = canvas;
        this.xScale = xScale;
        this.yScale = yScale;
    }

    draw(level) {
        let ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.columns, this.canvas.rows); //Clears the canvas before every draw cycle
        ctx.save();
        ctx.scale(this.xScale, this.yScale);
        level.draw(ctx);
        ctx.restore();
    }
}

let canvas = document.getElementById('gameCanvas');
let game = new IdkGame(canvas);
game.start();