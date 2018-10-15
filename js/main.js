var socket = io.connect("nut.livfor.it:5234");
//var socket = io.connect("localhost:5234");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Allow for upscaling

var players; // All players in the game

var player; // You
var map;
var items;

var camera = {
    x: 0,
    y: 0,
    zoom: 1
}

var localMove = {
    x: 0,
    y: 0
}

var localPos = {
    x: 0,
    y: 0
}

var keysDown = []; // Current keys down
var joined = false;
var globalTick = 0;


// Updated on join
socket.on("game", package => {
    items = package.items;
    map = package.map;
    player = package.player;
    for (pack of package.chat) addChatMessage(pack);
    loadInventory();
})

socket.on("update", package => {
    player = package;
    loadInventory();
})

// Updated each tick
socket.on("tick", package => {
    if (localMove.x != 0 || localMove.y != 0) {
        socket.emit("move", {
            x: localMove.x,
            y: localMove.y,
            flipped: player.flipped
        });
        localPos = Object.create(localMove);
        localMove = {
            x: 0,
            y: 0
        }; // Reset local move.
    } else {
        localPos = {
            x: 0,
            y: 0
        }; // Reset local pos
    }

    players = package.players;

    function sortByHeight(a, b) {
        if (a.position.y < b.position.y)
            return -1;
        if (a.position.y > b.position.y)
            return 1;
        return 0;
    }

    players.sort(sortByHeight);
})

// Main loop, render and logic
function heartbeat() {

    globalTick++; // Increase global counter each frame

    logic();

    try {
        render();
    } catch (e) {}


    requestAnimationFrame(heartbeat);
}

function render() {
    ctx.fillStyle = "#165f9e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderMap();
    renderPlayers(); // Draw players
    renderUI();
}

function renderPlayers() {
    // Draw players
    for (p of players) { // Draw own player with localMove
        if (p.username == player.username) {
            drawPlayer(p, p.position.x + localMove.x + localPos.x, p.position.y + localMove.y + localPos.y, player.flipped)
            // Update private player position
            player.position.x = p.position.x + localMove.x + localPos.x;
            player.position.y = p.position.y + localMove.y + localPos.y;
        } else {
            drawPlayer(p, p.position.x, p.position.y, p.flipped, p.outfit);
        }
    }
}

function drawPlayer(p, x, y, flipped) {
    /* In order of drawing */
    /* var outfit = {
        skin: 10,
        pants: 1,
        shirt: 3,
        headwear: 8,
        hair: 0,
        beard: 6
    } */

    /* outfit = p.outfit; */

    outfit = p.outfit;

    /* Draw cosmetic items */
    drawItem(outfit.body);
    if (!p.closedEyes) drawItem(outfit.eyes);
    drawItem(outfit.pants);
    drawItem(outfit.shirt);
    drawItem(outfit.hair);
    drawItem(outfit.headwear);
    drawItem(outfit.beard);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "20px Roboto";
    ctx.fillText(p.username, x - camera.x + (t("bodies_1").width / 2) * 5, y - camera.y - 10);

    function drawItem(item) {
        try{
            if (item !== undefined && item !== "" && item !== 0) {
                item = items[Number(item)]; // Convert ID to actual item
                var texture;
                if (item.texture.constructor == Array) { // If item is animated
                    texture = item.texture[Math.round(globalTick / 10) % item.texture.length];
                } else texture = item.texture;
                draw(texture, x, y, 5, flipped)
            }
        } catch(e){}
    }
}

var seed = 843587528;

function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function renderMap() {
    for (tile of map) {
        if (tile.sprite.indexOf("invisible_barrier") != -1 && !editorOpen) continue;
        draw(tile.sprite, tile.x, tile.y, tile.scale, false, false);
    }
}

var fps = 0;
var frames = 0;
var lastCountedFPS = Date.now();
var frameScoreCached = new Array();

function getFPS() {
    // This has to be called each frame to ensure the FPS is accurate.
    if (Date.now() - lastCountedFPS > 50) {
        frameScoreCached.push(frames); // Add new package
        if (frameScoreCached.length > 20) frameScoreCached.splice(0, 1); // Remove first in order
        var totalFrames = 0;
        for (let i = 0; i < frameScoreCached.length; i++) {
            totalFrames += frameScoreCached[i];
        }
        fps = (totalFrames / frameScoreCached.length) * 20
        frames = 0;
        lastCountedFPS = Date.now();
    }
    frames++;
    return Math.round(fps);
}

function renderUI() {

    // Level editor
    if (editorOpen) {
        editorPosition.x = player.position.x;
        editorPosition.y = player.position.y;
        if (snap) {
            editorPosition.x = editorPosition.x - (editorPosition.x % (16 * 6))
            editorPosition.y = editorPosition.y - (editorPosition.y % (16 * 6))
        }
        draw(selectedTexture, editorPosition.x, editorPosition.y, 6);
    }

    ctx.font = "20px Roboto";
    ctx.textAlign = "left";
    ctx.fillText("fps: " + getFPS(), 20, 30);

    //ctx.textAlign = "right";
    //ctx.fillText("Playing as: " + player.username, canvas.width-20, canvas.height-20);

    if (globalTick % 10 == 0) {
        // Update inventory every 10 frames
        var elements = document.getElementsByClassName("animated");
        for (el of elements) {
            el.src = "textures/" + items[player.inventory[el.id]].texture[Math.round(globalTick / 10) % items[player.inventory[el.id]].texture.length]
        }
    }

    // Render Context menu
    if (ctxMenuOpen) {
        ctx.fillStyle = "red";
        ctx.fillRect(ctxMenuLocation.x, ctxMenuLocation.y, 150, 200);
    }
}



var mousePos = {
    x: 0,
    y: 0
};
canvas.addEventListener("mousemove", e => {
    var rect = canvas.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    mousePos = {
        x: x,
        y: y
    };
})

var onclickEvents = [
    /*{
        top: {x: 659, y: 418},
        bottom: {x: 735, y: 472},
        call: toggleInventory
    }*/
]



var ctxMenuOpen = false;
document.addEventListener('contextmenu', e => {
    e.preventDefault()
    var changed = false;
    //ctxMenuOpen = true;

    for(var el of e.path){
        try{
            if(el.classList.toString().indexOf("inventory-slot") != -1){
                var index = el.id;
                // User click on an item in their inventory
                contextOptions = [{
                    text: "Equip",
                    action: () => {equip(index)}
                },{
                    text: "Unequip",
                    action: () => {unequip(index)}
                },{
                    text: "Drop item",
                    action: () => {dropItem(index)}
                }]
                changed = true;
            }
        } catch(e){}
    }

    if(!changed) contextOptions = [];

    openContextMenu(e.pageX, e.pageY);
    ctxMenuOpen = true;
});

contextOptions = []

function openContextMenu(x, y){
    // Build context menu and place it
    contextMenuString = "";
    for(i = 0; i < contextOptions.length; i++){
        contextMenuString += '<div class="menu-option" onclick="context(' + i + ')">' + contextOptions[i].text + '</div>';
    }
    document.getElementById("context-menu").innerHTML = '<div id="ctx-menu" class="menu">' + contextMenuString + '</div>';
    document.getElementById("ctx-menu").style.top = y+"px";
    document.getElementById("ctx-menu").style.left = x+"px";
}

function context(index){
    contextOptions[index].action()
}


canvas.addEventListener("click", e => {
    var rect = canvas.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    mousePos = {
        x: x,
        y: y
    };
    /* console.log(mousePos) */

    // Call events

    var events = new Array();
    onclickEvents.forEach(ev => events.push(ev));
    /* if(inventoryOpen) inventoryEvents.forEach(ev => events.push(ev)); */

    for (event of events) {
        if (event.top.x < mousePos.x && event.bottom.x > mousePos.x &&
            event.top.y < mousePos.y && event.bottom.y > mousePos.y) {
            event.call();
        }
    }

    ctxMenuOpen = false;
})

document.addEventListener("click", e => {
    document.getElementById("context-menu").innerHTML = "";
})



document.addEventListener("keydown", e => {
    keysDown[e.keyCode] = true;
    if(e.keyCode == 80 && editorOpen) placeTile();
    if (e.keyCode == 71) {
        var username = prompt("Username to who you will give to", player.username);
        var itemID = prompt("Item ID", 1);
        socket.emit("give", {
            username: username,
            id: itemID
        })
    }
    if (e.key == "Enter") document.getElementById("chat-input").focus();
})

document.addEventListener("keyup", e => {
    keysDown[e.keyCode] = false;
})

function keyDown(key) {
    if (keysDown[key]) return true;
    return false;
}

var previousPosition = {};

function move(x, y) {

    p = {
        x: player.position.x + x,
        y: player.position.y + y,
        width: t("bodies_1").width * 6,
        height: t("bodies_1").width * 6
    };
    for (tile of map) {
        if (tile.collision) {
            tile.width = 16 * 6;
            tile.height = 16 * 6;

            var collision = checkCollision(p, tile);
            var breakPoint = 0;
            while (collision) {
                breakPoint++;
                if (breakPoint > 50) break;
                if (collision.fromLeft) localMove.x -= 5;
                if (collision.fromRight) localMove.x += 5;
                if (collision.fromTop) localMove.y -= 5;
                if (collision.fromBottom) localMove.y += 5;

                p.x += localMove.x;
                p.y += localMove.y;
                collision = checkCollision(p, tile);
            }
        }
    }

    if (document.getElementById("chat-input") == document.activeElement) return; // Prevent moving while chatting
    var speed = 5;
    if (keyDown(16)) speed /= 3;
    if (x > 0) player.flipped = true;
    if (x < 0) player.flipped = false;
    localMove.x += Math.round(x * speed);
    localMove.y += Math.round(y * speed);
}

/* function checkCollision(x, y){
    
    for(tile of map){
        tile.width = 16*6;
        tile.height = 16*6;

        if(tile.collision){
            if (tile.x < p.x + p.width &&
                tile.x + tile.width > p.x &&
                tile.y < p.y + p.height &&
                tile.height + tile.y > p.y) {
                return true;
             }
        }
    }
} */


function checkCollision(obj1, obj2) {
    /**
     * Check 2D collision between two object.
     * Returns false for no collision. 
     * Returns an object on collision: {fromLeft: bool, fromRight: bool, fromTop: bool, fromBottom: bool}
     * Usage: if(checkCollision(obj1, obj2).fromLeft) // Do something
     */

    /* if (obj1.texture === undefined) obj1.texture = obj1.sprite;
    if (obj2.texture === undefined) obj2.texture = obj2.sprite;
    if (obj1.texture.constructor == String) obj1.texture = t(obj1.texture)
    if (obj2.texture.constructor == String) obj2.texture = t(obj2.texture) */

    if(editorOpen) return false;

    if (obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.height + obj1.y > obj2.y) {

        /* Collision has happened, calculate further */

        info = {
            fromLeft: false,
            fromRight: false,
            fromTop: false,
            fromBottom: false
        }

        values = new Array();

        /* From left value */
        values[0] = ((obj1.x + obj1.width - obj2.x)) /* * obj1.texture.width; / Possible addition */
        /* From right value */
        values[1] = (obj2.x + obj2.width - obj1.x);
        /* From top values */
        values[2] = (obj1.y + obj1.height - obj2.y);
        /* From bottom value */
        values[3] = obj2.height + obj2.y - obj1.y;

        /**
         * Get the shortest distance from values, the shortest one will be the direction of overlap.
         */
        short = 0;
        for (let i = 0; i < values.length; i++) {
            if (values[i] < values[short]) short = i;
        }

        return {
            fromLeft: short == 0,
            fromRight: short == 1,
            fromTop: short == 2,
            fromBottom: short == 3
        }

    }

    return false;
}

function logic() {
    if (keyDown(87) || keyDown(38)) move(0, -1);
    if (keyDown(83) || keyDown(40)) move(0, 1);
    if (keyDown(65) || keyDown(37)) move(-1, 0);
    if (keyDown(68) || keyDown(39)) move(1, 0);

    try {
        camera.x = (player.position.x - (canvas.width / 2) * camera.zoom) + (t("bodies_1").width * 5) / 2;
        camera.y = (player.position.y - (canvas.height / 2) * camera.zoom) + (t("bodies_1").width * 5) / 2;
    } catch (e) {}
}


function draw(sprite, x, y, scale, flipped, ignoreCamera, rotation, opacity) {

    if (sprite.indexOf("/") != -1) {
        sprite = sprite.split("/").join("_");
        sprite = sprite.substr(0, sprite.indexOf("."));
    }

    if (flipped === undefined) flipped = false;
    if (ignoreCamera === undefined) ignoreCamera = false;
    if (flipped && sprite.constructor == String) sprite = t(sprite + "_flipped");
    else if (sprite.constructor == String) sprite = t(sprite);

    if (rotation === undefined) rotation = 0;
    if (scale === undefined) scale = 1;
    if (!ignoreCamera) scale *= camera.zoom;
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
    if (ignoreCamera) ctx.drawImage(sprite, x, y, width, height);
    else ctx.drawImage(sprite, x - camera.x, y - camera.y, width, height);

    ctx.restore();
}

// CHAT

document.getElementById("chat-input").addEventListener("keyup", e => {
    if (e.code == "Enter") {
        var chatInput = document.getElementById("chat-input");
        socket.emit("chat", chatInput.value);
        chatInput.value = "";
    }
})

socket.on("chat", package => {
    addChatMessage(package);
})

function addChatMessage(pack) {
    chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML += '<span class="chat-message"><span style="color:' + pack.color + ';">' + sanitizeHTML(pack.sender) + ':</span> ' + sanitizeHTML(pack.message) + '</span>';
    chatWindow.scrollTop = chatWindow.scrollHeight;

    function sanitizeHTML(str) {
        var temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };
}

// INVENTORY


function loadInventory() {
    invString = "";
    for (var index = 0; index < player.inventory.length; index++) {
        item = items[player.inventory[index]];
        var animated = "";
        var texture = "";

        if (item.texture.constructor == Array) {
            animated = "animated";
            texture = item.texture[0];
        } else texture = item.texture;

        invString += '<div class="inventory-slot" title="' + item.name + '" id="' + index + '"> <img src="textures/misc/dark.png" class="item-background"> <img src="textures/' + texture + '" id="' + index + '" class="item-slot-image  ' + animated + '" alt=""> </div>'
    }
    document.getElementById("inventory-window").innerHTML = invString;
}

function equip(index) {
    socket.emit("equip", index);
    console.log(index);
}
function unequip(index) {
    socket.emit("unequip", index);
}
function dropItem(index) {
    socket.emit("dropItem", index);
}