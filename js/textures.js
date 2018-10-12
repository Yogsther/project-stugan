/*
  Example: "bodies/1.png" will be imported in textures["bodies_1"]
  You can get it by using t("bodies_1") or textures["bodies_1"]
  It will return an image object, you can put that into the draw() method, or not - it's up to you :)

*/

var textures = ["bodies/1.png","bodies/1_flipped.png","bodies/player_body_black.png","bodies/player_body_black_flipped.png","bodies/player_body_white.png","bodies/player_body_white_flipped.png","items/beards/brown_beard.png","items/beards/brown_beard_flipped.png","items/beards/ginger_beard.png","items/beards/ginger_beard_flipped.png","items/beards/grey_beard.png","items/beards/grey_beard_flipped.png","items/hairs/ginger_braid.png","items/hairs/ginger_braid_flipped.png","items/headwear/helmet.png","items/headwear/helmet_flipped.png","items/headwear/leather.png","items/headwear/leather_flipped.png","items/headwear/stone_helmet.png","items/headwear/stone_helmet_flipped.png","items/headwear/wah_hat.png","items/headwear/wah_hat_flipped.png","items/pants/brown_belt.png","items/pants/brown_belt_flipped.png","items/pants/wah_overalls.png","items/pants/wah_overalls_flipped.png","items/shirts/blue.png","items/shirts/blue_flipped.png","items/shirts/wah_shirt.png","items/shirts/wah_shirt_flipped.png","items/weapons/stone.png","items/weapons/stone_flipped.png","misc/screenshot.png","misc/splash.png","tiles/grass.png","tiles/island_b.png","tiles/island_bl.png","tiles/island_br.png","tiles/island_l.png","tiles/island_m.png","tiles/island_r.png","tiles/island_t.png","tiles/island_tl.png","tiles/island_tr.png","tiles/stone_ground.png","tiles/water_island_b.png","tiles/water_island_bl.png","tiles/water_island_br.png","tiles/water_island_m.png","ui/11_Systembeskrivning_IT-plattform_v02.pdf","ui/common_slot.png","ui/inventory.png","ui/inventory_closed.png","ui/inventory_open.png","ui/ui_bar.png"]

textures.forEach(texture => importTexture(texture));

function t(name) {
    return textures[name];
}

function importTexture(texture) {
    var textureName = texture.split("/").join("_");
    textureName = textureName.substr(0, textureName.indexOf("."));

    textures[textureName] = new Image();
    textures[textureName].src = "textures/" + texture;
    return textures[textureName];
}