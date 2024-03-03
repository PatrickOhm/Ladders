const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

let ladderColor = 'black';
let blockColor = 'black';

const blocks = [];
const ladders = [];

let angles;
let score = 0;
let difficultyMultiplier = 1;

let animate;
let blinkingRestart;
let moving;
let buildLadder;

let ladderActive = false;
let laddertipping = false;
let firstStart = true;
let gameOverBool = false;

let currentBlock;
let currentLadder;

function init() {
    blocks.splice(0);
    ladders.splice(0);
    angles = {};
    score = 0;
    gameOverBool = false;

    clearInterval(animate);
    clearInterval(blinkingRestart);
    clearCanvas();
    main();
}

function main() {
    drawBlock();
}

main();

function random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function degreesToRadians(deg) {
    return deg * (Math.PI / 180);
}

function euclidianDistance(x1, x2, y1, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function createHeight() {
    return random(50, 150);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBlock() {
    let x = 390;
    let height = createHeight();

    ctx.fillStyle = blockColor;
    let i = 0;
    let j = 400;
    let blockWidth = random(40, 60) * difficultyMultiplier;

    const buildBlock = setInterval(() => {
        if (blocks.length !== 0) {
            if (i <= blocks[blocks.length - 1].height - 20) {
                i++;
                j--;
                if (i === height || i > blocks[blocks.length - 1].height - 20) {
                    clearInterval(buildBlock);
                    safeBlockData({ x: x, y: j, width: blockWidth, height: i });
                    let currentBlock = blocks[blocks.length - 2];
                    drawLadder(currentBlock.x + currentBlock.width - 5, currentBlock.y);
                }
            }
        } else {
            i++;
            j--;
            if (i === height) {
                clearInterval(buildBlock);
                safeBlockData({ x: x, y: j, width: blockWidth, height: i });
            }
        }
        ctx.fillRect(x, j, blockWidth, i);
    }, 15);
}

function safeBlockData(block) {
    blocks.push(block);
}

function safeLadderData(ladder) {
    ladders.push(ladder);
    currentLadder = ladders[ladders.length - 1];
}

function moveBlock(blocks) {
    if (!blocks) return;

    moving = setInterval(() => {
        clearCanvas();
        drawScore('black');
        ladders.forEach(ladder => {
            ladder.x -= 3;
            ladder.y -= 0.7;
        })
        blocks.forEach(block => {
            block.y -= 0.7;
            block.height += 0.7;
            block.x -= 3;
            ctx.fillStyle = blockColor;
            ctx.fillRect(block.x, block.y, block.width, block.height);
        });
        drawLadders(ladders);
    }, 25);
}

function drawBlocks(blocks) {
    blocks.forEach(block => {
        ctx.fillStyle = blockColor;
        ctx.fillRect(
            block === blocks[blocks.length - 1] ? block.x : block.x + 0,
            block.y + 0,
            block.width,
            block.height);
    });
}

function drawLadder(x, y) {
    let optimalLength;
    let stopGrowing = false;
    if (firstStart) {
        optimalLength = euclidianDistance(
            blocks[0].x + blocks[0].width,
            390 + (blocks[1].width / 2),
            blocks[0].y,
            blocks[1].y
        )
    }

    ladderActive = true;
    ctx.fillStyle = ladderColor;

    let j = y;
    let i = 0;

    buildLadder = setInterval(() => {
        ctx.fillRect(x, j, 5, i);
        if (!stopGrowing) {
            i++;
            j--;
        }
        if (i >= optimalLength && firstStart) {
            stopGrowing = true;
            firstStart = false;
            drawTutorial();
        }
        if (!ladderActive) {
            clearInterval(buildLadder);
            firstStart = false;
            safeLadderData({
                x: blocks[blocks.length - 2].x + blocks[blocks.length - 2].width,
                y: blocks[blocks.length - 2].y,
                width: 5,
                height: i
            })
            tiltLadder(currentLadder);
            angles = getAnlges(currentLadder, blocks[blocks.length - 1]);
            currentLadder.deg = angles.collisionAngle;
        }
    }, (10 * difficultyMultiplier));
}

function drawLadders(ladders) {
    ctx.fillStyle = ladderColor;
    ladders.forEach(ladder => {
        rotateRect(ladder, ladder.deg);
    })

}

function rotateRect(rect, deg) {
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.rotate(degreesToRadians(deg));
    ctx.fillRect(-rect.width, -rect.height, rect.width, rect.height);
    ctx.restore();
}

function gameOver() {
    gameOverBool = true;
    drawBlocks(blocks);
    drawLadders(ladders);
    gameOverAnimation(canvas.height, canvas.width);
}

function tiltLadder(ladder) {
    let deg = 0;
    laddertipping = setInterval(() => {

        if (angles.collisionAngle - deg < 1
            && checkCollision(angles) !== 'short'
            && checkCollision(angles) !== 'long'
        ) {
            deg = angles.collisionAngle
        } else {
            deg++
        }

        if (checkCollision(angles) === 'long' && angles.alpha2 - deg < 1) {
            deg = angles.alpha2;
        }

        clearCanvas();
        ctx.fillStyle = ladderColor;
        rotateRect(ladder, deg);
        drawScore('black');
        drawBlocks(blocks);
        drawLadders(ladders.slice(0, -1));

        if (deg == 180) {
            clearInterval(laddertipping);
            currentLadder.deg = 180;
            gameOver();

        }
        if (checkCollision(angles) == 'long' && deg == angles.alpha2) {
            clearInterval(laddertipping);
            currentLadder.deg = angles.alpha2;
            gameOver();
        }

        if (deg == angles.collisionAngle && checkCollision(angles) === 'win') {
            clearInterval(laddertipping)
            score++;
            if (score % 5 === 0) {
                if (difficultyMultiplier === 0.5) return;
                difficultyMultiplier -= 0.1;
            }
            console.log(score);
            next();
        };
    }, 15 * difficultyMultiplier)
}

function getAnlges(ladder, block) {
    const startingPoint = { x: ladder.x, y: ladder.y };
    const endPointLeft = { x: block.x, y: block.y };
    const endPointRight = { x: block.x + block.width, y: block.y };

    const distanceBetweenBlocks = 390 - startingPoint.x;
    const adjacentSideAlpha = blocks[blocks.length - 2].height - block.height;

    const lengthLineOne = euclidianDistance(
        startingPoint.x,
        endPointLeft.x,
        startingPoint.y,
        endPointLeft.y
    )
    const lengthLineTwo = euclidianDistance(
        startingPoint.x,
        endPointRight.x,
        startingPoint.y,
        endPointRight.y
    )

    const alpha1 = 180 - ((Math.asin(distanceBetweenBlocks / lengthLineOne)) * (180 / Math.PI));
    const alpha2 = 180 - ((Math.asin((distanceBetweenBlocks + block.width) / lengthLineTwo)) * (180 / Math.PI));
    const collisionAngle = 180 - ((Math.acos(adjacentSideAlpha / ladder.height)) * (180 / Math.PI));

    return {
        alpha1: parseFloat(alpha1.toFixed(2)),
        alpha2: parseFloat(alpha2.toFixed(2)),
        collisionAngle: parseFloat(collisionAngle.toFixed(2)),
    };
}

function checkCollision(angles) {
    if (angles.collisionAngle > angles.alpha1) return 'short';
    if (angles.collisionAngle < angles.alpha2) return 'long';
    return 'win';
}

function gameOverAnimation(height, width) {
    const tileSize = 20;
    ctx.fillStyle = 'red';

    let right = true;
    let down = false;
    let left = false;
    let up = false;

    let steps = 0;
    let remainingWidth = width;
    let remainingHeight = height;

    let x = 0;
    let y = 0;

    animate = setInterval(() => {
        ctx.fillStyle = 'red';
        steps++;
        if (steps === 775) {
            clearCanvas();
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawGamerOverText();
            drawRestartText();
            drawScore('white');
            clearInterval(animate);
        }

        if (right && x <= remainingWidth - tileSize) {
            ctx.fillRect(x, y, tileSize, tileSize);
            x += tileSize;
            if (x == remainingWidth - tileSize) {
                remainingWidth -= tileSize;
                right = false;
                down = true;
            }
        }
        if (down && y <= remainingHeight - tileSize) {
            ctx.fillRect(x, y, tileSize, tileSize);
            y += tileSize;
            if (y == remainingHeight - tileSize) {
                remainingHeight -= tileSize;
                down = false;
                left = true;
            }
        }

        if (left && x >= width - remainingWidth) {
            ctx.fillRect(x, y, tileSize, tileSize);
            x -= tileSize;
            if (x == width - remainingWidth - tileSize) {
                left = false;
                up = true;
            }
        }

        if (up && y >= height - remainingHeight) {
            ctx.fillRect(x, y, tileSize, tileSize);
            y -= tileSize;
            if (y == height - remainingHeight) {
                up = false;
                right = true;
            }
        }

        if (x == 460 && y == 20) drawScore('white');
        drawGamerOverText();
    }, 2);
}

function drawGamerOverText() {
    ctx.save();
    const text = 'GAME OVER'
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    const textWidth = ctx.measureText(text).width;

    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height / 2;

    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawTutorial() {
    ctx.save();
    const text1 = 'press space to tilt the ladder';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'black';
    const textWidth = ctx.measureText(text1).width;
    const x1 = (canvas.width - textWidth) / 2;
    const y1 = canvas.height / 2;
    ctx.fillText(text1, x1 + 150, y1 - 100)

    const text2 = "(Next time it won't stop automatically!)";
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = 'black';
    const textWidth2 = ctx.measureText(text2).width;
    const x2 = (canvas.width - textWidth2) / 2;
    const y2 = canvas.height / 2;
    ctx.fillText(text2, x2 + 150, y2 - 75)
    ctx.restore();
}

function drawRestartText() {
    const text = 'press space to restart'
    ctx.font = 'bold 20px Arial';
    const textWidth = ctx.measureText(text).width;
    const textMetrics = ctx.measureText(text);
    textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height / 2 + 40;

    let blink = false;
    blinkingRestart = setInterval(() => {
        if (blink) {
            drawRect(x, y, textWidth, textHeight, 'red')
        } else {
            ctx.fillStyle = 'white';
            ctx.fillText(text, x, y);
        }
        blink = !blink;

    }, 800)
}

function drawStartText() {
    const text = 'press space to start'
    ctx.font = 'bold 20px Arial';
    const textWidth = ctx.measureText(text).width;
    const textMetrics = ctx.measureText(text);
    textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height / 2;

    let blink = false;
    blinkingRestart = setInterval(() => {
        ctx.save();
        if (blink) {
            drawRect(x, y, textWidth, textHeight, 'white')
        } else {
            ctx.fillStyle = 'black';
            ctx.fillText(text, x, y);
        }
        blink = !blink;
        ctx.restore();
    }, 800)
}

drawStartText();

function drawRect(x, y, width, height, color) {
    height = height * 1.5;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - height * 0.75, width, height);
}

function drawScore(color) {
    ctx.save();
    const text = 'score: ' + score;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(text).width;

    const x = (canvas.width - textWidth) / 2;
    const y = canvas.height / 2;

    ctx.fillText(text, x, 30);
    ctx.restore();
}

function next() {
    clearInterval(blinkingRestart)
    moveBlock(blocks);
    setTimeout(() => {
        clearInterval(moving);
        drawLadders(ladders);
        drawBlock();
    }, random(1000, 2000));
}

document.addEventListener('keydown', (e) => {
    if (e.key == ' ') {
        ladderActive = false;

        if (gameOverBool) {
            init();
        }

        if (blocks.length == 1) {
            next();
        }
    }
});






