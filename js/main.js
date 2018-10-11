var socket = io.connect("localhost:5234");

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


// Updated on join
socket.on("game", package => {
    items = package.items;
    map = package.map;
    player = package.player;
    for(pack of package.chat) addChatMessage(pack);
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

    function sortByHeight(a,b) {
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
    for (p of players) {        // Draw own player with localMove
        if (p.username == player.username) {
            drawPlayer(player, p.position.x + localMove.x + localPos.x, p.position.y + localMove.y + localPos.y, player.flipped)
            // Update private player position
            player.position.x = p.position.x + localMove.x + localPos.x;
            player.position.y = p.position.y + localMove.y + localPos.y;
        } else {
            drawPlayer(p, p.position.x, p.position.y, p.flipped);
        }
    }
}

function drawPlayer(p, x, y, flipped) {
    /* In order of drawing */
    var outfit = {
        skin: 10,
        pants: 1,
        shirt: 3,
        headwear: 8,
        hair: 0,
        beard: 6
    }

    /* Draw cosmetic items */
    drawItem(outfit.skin);
    drawItem(outfit.pants);
    drawItem(outfit.shirt);
    drawItem(outfit.hair);
    drawItem(outfit.headwear);
    drawItem(outfit.beard);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "20px Roboto";
    ctx.fillText(p.username, p.position.x - camera.x + (t("bodies_1").width/2)*5, p.position.y - camera.y - 10);

    function drawItem(item) {
        if (item !== undefined && item !== "" && item !== 0) draw(items[item].texture, x, y, 5, flipped)
    }
}

var seed = 843587528;

function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function renderMap() {
    for (tile of map) {
        draw(tile.sprite, tile.x, tile.y, tile.scale, false, false);
    }
}

function renderUI() {

    // Level editor
    if(editorOpen){
        editorPosition.x = player.position.x;
        editorPosition.y = player.position.y;
        if(snap){
            editorPosition.x = editorPosition.x - (editorPosition.x % (16*6))
            editorPosition.y = editorPosition.y - (editorPosition.y % (16*6))
        }
        draw(selectedTexture, editorPosition.x, editorPosition.y, 6);
    }

    ctx.font = "20px Roboto";
    ctx.textAlign = "left";
    ctx.fillText("x: " + player.position.x + " y: " + player.position.y, 20, canvas.height-20);

    //ctx.textAlign = "right";
    //ctx.fillText("Playing as: " + player.username, canvas.width-20, canvas.height-20);

    // Render Context menu
    if(ctxMenuOpen){
        ctx.fillStyle = "red";
        ctx.fillRect(ctxMenuLocation.x, ctxMenuLocation.y, 150, 200);
    }


}



var mousePos = {x: 0, y: 0};
canvas.addEventListener("mousemove", e => {
    var rect = canvas.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    mousePos = {x: x, y: y};
})

var onclickEvents = [/*{
    top: {x: 659, y: 418},
    bottom: {x: 735, y: 472},
    call: toggleInventory
}*/] 


var ctxMenuLocation = {x: 0, y: 0}
var ctxMenuOpen = false;
canvas.addEventListener('contextmenu', e => {
    e.preventDefault()
    //ctxMenuOpen = true;
    ctxMenuLocation.x = mousePos.x;
    ctxMenuLocation.y = mousePos.y;
});


canvas.addEventListener("click", e => {
    var rect = canvas.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    mousePos = {x: x, y: y};
    console.log(mousePos)

    // Call events
    
    var events = new Array();
    onclickEvents.forEach(ev => events.push(ev));
    /* if(inventoryOpen) inventoryEvents.forEach(ev => events.push(ev)); */

    for(event of events){
        if( event.top.x < mousePos.x && event.bottom.x > mousePos.x &&
            event.top.y < mousePos.y && event.bottom.y > mousePos.y){
            event.call();
        }
    }

    ctxMenuOpen = false;
})



document.addEventListener("keydown", e => {
    keysDown[e.keyCode] = true;
    if(e.code == "Enter") document.getElementById("chat-input").focus();
})

document.addEventListener("keyup", e => {
    keysDown[e.keyCode] = false;
})

function keyDown(key) {
    if (keysDown[key]) return true;
    return false;
}

function move(x, y) {
    if(document.getElementById("chat-input") == document.activeElement) return; // Prevent moving while chatting
    var speed = 5;
    if(keyDown(16)) speed /= 3;
    if (x > 0) player.flipped = true;
    if (x < 0) player.flipped = false;
    localMove.x += Math.round(x * speed);
    localMove.y += Math.round(y * speed);
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
    if(ignoreCamera) ctx.drawImage(sprite, x, y, width, height);
        else ctx.drawImage(sprite, x - camera.x, y - camera.y, width, height);

    ctx.restore();
}

// CHAT

document.getElementById("chat-input").addEventListener("keyup", e => {
    if(e.code == "Enter"){
        var chatInput = document.getElementById("chat-input");
        socket.emit("chat", chatInput.value);
        chatInput.value = "";
    }
})

socket.on("chat", package => {
    addChatMessage(package);
})

function addChatMessage(pack){
    chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML += '<span class="chat-message"><span style="color:' + pack.color + ';">' + sanitizeHTML(pack.sender) + ':</span> ' + sanitizeHTML(pack.message) + '</span>';
    chatWindow.scrollTop = chatWindow.scrollHeight;

    function sanitizeHTML(str) {
        var temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };
}