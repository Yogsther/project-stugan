var socket = io.connect("localhost:45599");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Allow for upscaling

var players; // All players in the game
var player; // You
var world; // The world, including the map.
var localMove = {
    x: 0,
    y: 0
}
var keysDown = []; // Current keys down
var joined = false;



// Updated on join
socket.on("game", package => {
    world = package;
    player = package.player;
})

// Updated each tick
socket.on("tick", package => {
    if (localMove.x != 0 || localMove.y != 0) {
        socket.emit("move", {
            x: localMove.x,
            y: localMove.y,
            flipped: player.flipped
        });
        localMove = {
            x: 0,
            y: 0
        }; // Reset local move.
    }
    players = package.players;
})

// Main loop, render and logic
function heartbeat() {

    logic();

    try {
        render();
    } catch (e) {}


    requestAnimationFrame(heartbeat);
}

function render() {
    draw("tiles_temp_ground", 0, 0, 3, 0, 1);

    // Draw map

    // Draw players
    for (p of players) {
        var sprite = "bodies_1";
        if (p.flipped) sprite += "_flipped";
        // Draw own player with localMove
        if (p.username == player.username){
            draw(sprite, p.position.x + localMove.x, p.position.y + localMove.y, 5);
        } else {
            draw(sprite, p.position.x, p.position.y, 5);
            // Draw player name
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.username, p.position.x + ((t("bodies_1").width/2) * 5), p.position.y + 10);
        } 
    }
}

document.addEventListener("keydown", e => {
    if (keysDown.indexOf(e.key) == -1) keysDown.push(e.key);
})

document.addEventListener("keyup", e => {
    keysDown.splice(keysDown.indexOf(e.key), 1);
})

function keyDown(key) {
    if (keysDown.indexOf(key) != -1) return true;
    return false;
}


function move(x, y) {
    var speed = 5;
    if (x > 0) player.flipped = true;
    if (x < 0) player.flipped = false;
    localMove.x += x * speed;
    localMove.y += y * speed;
}

function logic() {
    if (keyDown("w")) move(0, -1);
    if (keyDown("s")) move(0, 1);
    if (keyDown("a")) move(-1, 0);
    if (keyDown("d")) move(1, 0);
}




/**
 * Draw a texture on screen, provide a scale if you want.
 * You need to provide a scale if you want to change the rotation.
 * You can either submit an Image or a string of the name.
 * Note: Flipping sprites in a canvas is very resource intensive,
 * please instead make a second flipped sprite.
 */

function draw(sprite, x, y, scale, rotation, opacity) {

    /* Import texture if a String is provided. */
    if (sprite.constructor == String) sprite = t(sprite);
    if (rotation === undefined) rotation = 0;
    if (scale === undefined) scale = 1;
    if (opacity === undefined) opacity = 1;

    width = sprite.width * scale; // Get width of the sprite
    height = sprite.height * scale; // Get height of the sprite
    center = {
        x: x + width / 2,
        y: y + height / 2
    }

    if (y === undefined) {
        if (x !== undefined) scale = x;
        x = c.width / 2 - width / 2;
        y = c.height / 2 - height / 2;
    }

    ctx.save(); // Save context
    // Rotate and move origin
    ctx.translate(center.x, center.y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-center.x, -center.y);
    // Set opacity
    ctx.globalAlpha = opacity;
    // Draw image
    ctx.drawImage(sprite, x, y, width, height);

    ctx.restore();
}