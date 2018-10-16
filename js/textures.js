/*
  Example: "bodies/1.png" will be imported in textures["bodies_1"]
  You can get it by using t("bodies_1") or textures["bodies_1"]
  It will return an image object, you can put that into the draw() method, or not - it's up to you :)

*/
var textures = texture_list;
textures.forEach(texture => importTexture(texture));

function t(name) {
    name = name.split("/").join("_");
    if(name.indexOf(".") != -1)name = name.substr(0, name.indexOf("."));
    return textures[name];
}

function importTexture(texture) {
    var textureName = texture.split("/").join("_");
    textureName = textureName.substr(0, textureName.indexOf("."));

    textures[textureName] = new Image();
    textures[textureName].src = "textures/" + texture;
    return textures[textureName];
}