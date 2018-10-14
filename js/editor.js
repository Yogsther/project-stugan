var snap = true;
var selectedTexture = "";
var editorOpen = false;

var editorPosition = {x: 0, y: 0};

function initLeveleditor(){
    if(selectedTexture == "") selectedTexture = textures[0];
    editorOpen = !editorOpen;
    var buttonString = "<br>";
    for(tile of textures){
        if(tile.indexOf("tiles") != -1)buttonString += "<a href='javascript:selectTexture(" + JSON.stringify(tile) + ")'> <img title='" + tile + "' height='50' class='tile' src='textures/" + tile + "'> </a>"
    }
    if(editorOpen){
        document.getElementById("editor-textures").innerHTML = 'Collision <input type="checkbox" id="collision"> <button onclick="toggleSnap()">Toggle snap</button>  <button onclick="placeTile()">Place tile [P]</button> <button onclick="exportMap()">Export map</button> <span id="textures-insert"></span>';
        document.getElementById("textures-insert").innerHTML = buttonString;
    } else {
        document.getElementById("editor-textures").innerHTML = "";
    }
}

function toggleSnap(){
    snap = !snap;
}

function selectTexture (texture) {
    selectedTexture = texture;
    console.log("Selected " + texture);
}

function exportMap(){
    console.log(JSON.stringify(map));
}

function placeTile(){
    map.push({
        "x": editorPosition.x,
        "y": editorPosition.y,
        "sprite": selectedTexture,
        "scale": 6,
        "collision": document.getElementById("collision").checked
    })
}

function allItems(){

    itemString = "";
    for(item of items){
        if(item == null) continue;
        itemString+= "<br><img src='textures/" + item.texture + "' height='50'> Name: " + item.name + " id: " + item.id;
    }
    document.getElementById("all-items").innerHTML = itemString;
}