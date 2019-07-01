'use strict';
import { SIZE_PER_TILE, GRID_LINE_WIDTH } from './idk-level.js';

export class LevelEntity {
    tick(tickCount, keyPresses, levelGrid) { }
    draw(ctx, x, y) { }
}

const PLAYER_COLOR = '#0000FF';
export class Player extends LevelEntity {

    constructor() {
        super();
    }

    tick(tickCount, keyPresses, levelGrid) {
        let pos = levelGrid.getPosition(this);
        if(keyPresses.get('d') || keyPresses.get('ArrowRight') && !(keyPresses.get('a') || keyPresses.get('ArrowLeft'))) {
            if(pos.x < levelGrid.columns - 1) {
                levelGrid.requestMove(this, pos.x + 1, pos.y);
            }
        } else if(keyPresses.get('a') || keyPresses.get('ArrowLeft') && !(keyPresses.get('d') || keyPresses.get('ArrowRight'))) {
            if(pos.x > 0) {
                levelGrid.requestMove(this, pos.x - 1, pos.y);
            }
        } else if(keyPresses.get('s') || keyPresses.get('ArrowDown') && !(keyPresses.get('w') || keyPresses.get('ArrowUp'))) {
            if(pos.y < levelGrid.rows - 1) {
                levelGrid.requestMove(this, pos.x, pos.y + 1);
            }
        } else if(keyPresses.get('w') || keyPresses.get('ArrowUp') && !(keyPresses.get('s') || keyPresses.get('ArrowDown'))) {
            if(pos.y > 0) {
                levelGrid.requestMove(this, pos.x, pos.y - 1);
            }
        }
    }

    draw(ctx, x, y) {
        drawInLevel(ctx, x, y, PLAYER_COLOR);
    }
}

const BASIC_ENEMY_MOVE_PERIOD = 2;
const BASIC_ENEMY_COLOR = '#FF0000';
export class BasicEnemy extends LevelEntity {

    constructor(movePeriod = BASIC_ENEMY_MOVE_PERIOD, targetFunction = (ent => isPlayer(ent))) {
        super();
        this.targetFunction = targetFunction;
        this.movePeriod = movePeriod;

        this.lastMoved = 0;
        this.lastTicked = 0;
        this.lastDirection = null;
        this.lastPosition = null;
    }

    tick(tickCount, keyPresses, levelGrid) {
        let pos = levelGrid.getPosition(this);

        //If the current position isn't the same as the last one, the enemy must have moved
        if (pos !== this.lastPosition) {
            this.lastMoved = this.lastTicked;
        }

        if (pos !== null) {
            let x = pos.x, y = pos.y;
            if (tickCount - this.lastMoved >= this.movePeriod) {
                //This finds a list of all targets and sorts them according to distance from this enemy.
                let targets = levelGrid.entities().filter(obj => obj !== this && this.targetFunction(obj));
                if (targets.length > 0) {
                    let distanceFunction = function (target) {
                        let tPos = levelGrid.getPosition(target);
                        return taxiCabDistance(tPos.x, tPos.y, pos.x, pos.y);
                    };

                    let closestTarget = selectRandomMinimumElement(targets, distanceFunction); //Randomly chooses between one of the closest targets so that the same target is not always selected

                    //The enemy will request to move 1 tile (in one of 8 directions) towards the closest target
                    let targetPos = levelGrid.getPosition(closestTarget);
                    let deltaX = Math.sign(targetPos.x - x);
                    let deltaY = Math.sign(targetPos.y - y);

                    //Makes sure the enemy doesn't travel in diagonals, and alternates axis of movement when it attempts to do so
                    if (deltaX !== 0 && deltaY !== 0) {
                        if (this.lastDirection === null) {
                            let directionChoice = Math.floor(Math.random() * 2);

                            if (directionChoice === 0) {
                                deltaX = 0;
                            } else {
                                deltaY = 0;
                            }
                        } else if (this.lastDirection === 'y') {
                            deltaY = 0;
                        } else if (this.lastDirection === 'x') {
                            deltaX = 0;
                        }
                    }

                    if (deltaX !== 0) {
                        this.lastDirection = 'x';
                    } else if (deltaY !== 0) {
                        this.lastDirection = 'y';
                    }

                    let newX = x + deltaX;
                    let newY = y + deltaY;

                    if (newX >= 0 && newY >= 0 && newX < levelGrid.columns && newY < levelGrid.rows) {
                        levelGrid.requestMove(this, newX, newY);
                    }
                }
            }
        }

        this.lastPosition = pos;
        this.lastTicked = tickCount;
    }

    draw(ctx, x, y) {
        drawInLevel(ctx, x, y, BASIC_ENEMY_COLOR);
    }
}

function selectRandomMinimumElement(arr, valueFunction) {
    if (arr.length === 0) {
        return null;
    }

    let sortedArr = arr.sort(function(target1, target2) {
        return valueFunction(target1) - valueFunction(target2);
    });

    //Find the first element with a different value than the minimum
    let minimumValue = valueFunction(arr[0]);
    let i;
    // noinspection StatementWithEmptyBodyJS
    for (i = 1; i < sortedArr.length && valueFunction(sortedArr[i]) === minimumValue; i++);

   return sortedArr[Math.floor(Math.random() * i)]; //Chooses a random up to (and NOT including i, because element i is the element which doees not have the minimum value)
}

function taxiCabDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function isPlayer(levelEntity) {
    return levelEntity instanceof Player;
}

const WALL_COLOR = '#808080';
export class Wall extends LevelEntity {
    draw(ctx, x, y) {
        drawInLevel(ctx, x, y, WALL_COLOR);
    }
}

function drawInLevel(ctx, x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    let objectDimension = SIZE_PER_TILE - GRID_LINE_WIDTH * 2;
    ctx.rect(x * SIZE_PER_TILE + GRID_LINE_WIDTH, y * SIZE_PER_TILE + GRID_LINE_WIDTH, objectDimension, objectDimension);
    ctx.fill();
}