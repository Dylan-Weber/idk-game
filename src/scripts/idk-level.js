'use strict';
import { BasicEnemy, Player, Wall } from './idk-level-entities.js';

export const SIZE_PER_TILE = 20;
const BACKGROUND_COLOR = '#D3D3D3';
export const GRID_LINE_WIDTH = 0;
class Level {

    constructor(stageData) {
        this.columns = stageData.columns;
        this.rows = stageData.rows;
        this.levelGrid = new LevelGrid(this.columns, this.rows);
        this.levelType = stageData.levelType;
    }

    tick(tickCount, keyPresses) {
        this.levelGrid.tick(tickCount, keyPresses);
    }

    draw(ctx) {
        //Draws the level background
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.rect(0, 0, this.columns * SIZE_PER_TILE, this.rows * SIZE_PER_TILE);

        ctx.fill();

        this.levelGrid.draw(ctx);
    }
}

class LevelGrid {
    constructor(columns, rows) {
        this.grid = buildLevelGridArray(columns, rows);
        this.levelEntityPositionMap = new Map();
        this.moveRequestHandler = new MoveRequestHandler(this);
    }

    get columns() {
        return this.grid.length;
    }

    get rows() {
        return this.grid[0].length;
    }

    addLevelEntity(levelEntity, x, y) {
        if(x < 0 || y < 0 || x >= this.columns || y >= this.rows) {
            throw `Position (${x}, ${y}) is not included in grid with dimensions (${this.columns}, ${this.rows}))`
        }

        this.grid[x][y].add(levelEntity);
        this.levelEntityPositionMap.set(levelEntity, {x: x, y: y});
    }

    removeLevelObject(levelEntity) {
        let pos = this.getPosition(levelEntity);
        if (pos !== null) {
            this.grid[pos.x][pos.y].delete(levelEntity);
            this.levelEntityPositionMap.delete(levelEntity);
        }
    }

    entities() {
        return Array.from(this.levelEntityPositionMap.keys());
    }

    tick(tickCount, keyPresses) {
        for (let levelEntity of this.levelEntityPositionMap.keys()) {
            levelEntity.tick(tickCount, keyPresses, this);
        }

        this.moveRequestHandler.processAllRequests();
    }

    draw(ctx) {
        for (let x = 0; x < this.columns; x++) {
            let column = this.grid[x];
            for(let y = 0; y < column.length; y++) {
                let positionSet = column[y];
                for (let levelEntity of positionSet) {
                    levelEntity.draw(ctx, x, y);
                }
            }
        }
    }

    /**
     *
     * @param levelEntity
     * @returns The position of the levelEntityect in the grid if it exists, otherwise null
     */
    getPosition(levelEntity) {
        if (this.levelEntityPositionMap.has(levelEntity)) {
            return this.levelEntityPositionMap.get(levelEntity);
        }
        else {
            return  null;
        }
    }

    move(levelEntity, x, y) {
        this.removeLevelObject(levelEntity);
        this.addLevelEntity(levelEntity, x, y);
    }

    requestMove(levelEntity, x, y) {
        if(x >= 0 && y >= 0 && x < this.columns && y < this.rows) {
            //If the levelEntity is requesting to move to its current position, ignore request
            if (this.getPosition(levelEntity) != {x: x, y: y}) {
                this.moveRequestHandler.addRequest(levelEntity, x, y);
            }
        }
        else
        {
            throw `MoveRequestError: Position (${x}, ${y}) is not included in grid with dimensions (${this.columns}, ${this.rows}))`
        }
    }
}

class MoveRequestHandler {
    constructor(levelGrid) {
        this.levelGrid = levelGrid;
        this.requests = new Map();
    }

    addRequest(levelEntity, x, y) {
        this.requests.set(levelEntity, {x: x, y: y});
    }

    processAllRequests() {
        for (let [levelEntity, position] of this.requests) {
            this.processSingleRequest(levelEntity, position);
        }
        this.requests.clear();
    }

    processSingleRequest(levelEntity, position, visited = new Set()) {
        //Makes sure objects don't attempt to move into their own position
        if (position != this.levelGrid.getPosition(levelEntity)) {

            let objectsInRequestedPosition = this.levelGrid.grid[position.x][position.y];
            let filteredGridPosition = Array.from(objectsInRequestedPosition).filter(ent => !(ent instanceof Player));

            //Checks if the requested position does not already have a non-player object, then checks if that object is also requesting to move
            //If so, call the handler function for this circumstance.
            if (filteredGridPosition.length === 0 || filteredGridPosition.every(ent => visited.has(ent))) {
                this.levelGrid.move(levelEntity, position.x, position.y);
                this.requests.delete(levelEntity);
            } else if (filteredGridPosition.every(ent => this.requests.has(ent))) {
                this._handleAnyMovementConflicts(levelEntity, position, visited);
                let newFilteredGridPosition = Array.from(objectsInRequestedPosition).filter(ent => !(ent instanceof Player));
                if (newFilteredGridPosition.length === 0) {
                    this.levelGrid.move(levelEntity, position.x, position.y);
                    this.requests.delete(levelEntity);
                }
            }
        }
    }

    _handleAnyMovementConflicts(levelEntity, position, visited) {
        //If levelEntity is attempting to move into other objects, recursively attempt to move those objects too.
        //If the object has already been visited recursively, there must be a motion loop, and all objects in the loop will be moved.
        visited.add(levelEntity);

        //This is somewhat repetitive, but I didn't want too many arguments in the function definition
        let objectsInRequestedPosition = this.levelGrid.grid[position.x][position.y];
        let filteredGridPosition = Array.from(objectsInRequestedPosition).filter(ent => !(ent instanceof Player));

        for (let blockingEntity of filteredGridPosition) {
            this.processSingleRequest(blockingEntity, this.requests.get(blockingEntity), visited);
        }

        visited.delete(levelEntity);
    }
}

/**
 * Builds a 2D array filled with empty sets
 * @param columns
 * @param rows
 */
function buildLevelGridArray(columns, rows) {
    let grid = Array.from(Array(columns)).map(() => new Array(rows));

    //I tried to use another map rather than this nested for loop, but nothing was working
    for (let column of grid) {
        for (let i = 0; i < column.length; i++) {
            column[i] = new Set();
        }
    }
    return grid;
}

export class LevelBuilder {
    buildLevelFromJsonFile(fileUrl) {
        let levelData;

        //This reads the json file synchronously. The regular async function $.getJson() wasn't working as I wanted it to.
        //I admit this isn't the best solution, but I wasn't able to find many better ways to solve it.
        $.ajax({
            url: fileUrl,
            async: false,
            dataType: 'json',
            success: function (response) {
                levelData = response;
            }
        });
        // noinspection JSUnusedAssignment
        return this.buildLevel(levelData);
    }

    buildLevel(levelData) {
        const {stageData, levelEntities} = levelData;
        let level = new Level(stageData);
        for (let levelEntity of levelEntities) {
            try {
                level.levelGrid.addLevelEntity(buildLevelObject(levelEntity), levelEntity.x, levelEntity.y);
            } catch(err) {
                console.error(err);
            }
        }

        return level;
    }
}

let stringEntityMap = new Map([ ['player', Player], ['basicenemy', BasicEnemy], ['wall', Wall] ]);

function buildLevelObject(blueprint) {
    switch(blueprint.type.toLowerCase()) {
        case 'player':
            return new Player();

        case 'basicenemy': {
            return buildBasicEnemy(blueprint);
        }

        case 'wall': {
            return new Wall();
        }

        default: {
            throw `LevelBuildError: ${blueprint.type} is not a valid levelEntity type`;
        }
    }
}

function buildBasicEnemy(blueprint) {
    let targetFunction = undefined;
    let movePeriod = undefined;

    if (blueprint.hasOwnProperty('optional')) {
        if (blueprint.optional.hasOwnProperty('targets')) {
            targetFunction = ent => ent instanceof stringEntityMap.get(blueprint.optional.targets.toLowerCase());
        }

        if (blueprint.optional.hasOwnProperty('movePeriod')) {
            movePeriod = blueprint.optional.movePeriod;
        }
    }
    return new BasicEnemy(movePeriod, targetFunction);
}
