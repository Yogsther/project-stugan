var fs = require("fs");
var jimp = require('jimp');

var textures = fs.readdirSync("textures");
    textures.splice(textures.indexOf("list.js"), 1);
var toBeFlipped = [];
var allTextures = [];
var list = [];
run();

function run() {
    for (texture of textures) exploreDirectory("textures/" + texture);

    index = 0;
    if (toBeFlipped.length > 0) flip(toBeFlipped[index]);

    function flip(image) {
        jimp.read(image, (err, img) => {
            if (err) throw err;
            var texture = image;
            try{
                var ree = fs.readFileSync(texture.substr(0, texture.indexOf(".")) + "_flipped.png")
            } catch(e) {
                img.flip(true, false).write(texture.substr(0, texture.indexOf(".")) + "_flipped.png");
                allTextures.push(texture.substr(0, texture.indexOf(".")) + "_flipped.png")
                console.log("Flipped: " + texture);
            }
                
            index++;
            if (index < toBeFlipped.length) flip(toBeFlipped[index]);
            else {
                for (texture of allTextures) {
                    list.push(texture.substr(9, texture.length));
                }
                fs.writeFileSync("textures/list.js", "const texture_list = " + JSON.stringify(list));
                console.log("Done!");
            }
        })
    }
}


function exploreDirectory(directoryString) {
    var directory = fs.readdirSync(directoryString);
    for (dir of directory) {
        if (dir.indexOf(".") == -1) exploreDirectory(directoryString + "/" + dir);
        else {
            var texture = directoryString + "/" + dir.toString();
            allTextures.push(texture);
            if (texture.indexOf("/tiles/") === -1 && texture.indexOf("/ui/") === -1 && texture.indexOf("/misc/") === -1 && texture.indexOf("_flipped.png") === -1) toBeFlipped.push(texture);
        }
    }
}