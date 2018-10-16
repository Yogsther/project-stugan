/*
    Project Stugan - Back end
*/

/* Choose a port */
var port = 5234;
var ticks = 30; // Ticks per second
/**
 *  Import node modules
 *  - Socket, socket io - for multiplayer
 *  - mysql - Database
 *  - sanitize (sqlstring) sanitize sql queries
 *  - md5, encrypt passwords
 *  - fs, file-chooser, browse and load JSON's for items and monsters.
 */
var socket = require("socket.io");
var mysql = require("mysql");
var sanitize = require('sqlstring');
var md5 = require('md5');
var fs = require("fs");

var express = require("express");
var app = express();

var con = mysql.createPool({
  connectionLimit: 10,
  host: "127.0.0.1",
  user: "root",
  /*   password: "", */
  database: "stugan"
});

/* con.connect(function (err) {
  if (err) throw err;
  console.log("Connected to db, stugan.");
}); */

/* World arrays */

var items = new Array(); // Index of items, loaded from /items/ (Not live items, just for refrence)
var map = JSON.parse(fs.readFileSync("map.json", "utf8"));
var players = new Array(); // All active players
var npcs = new Array(); // All active NPC's
var chat = new Array();
var droppedItems = new Array();

var joinedMessages = ["appeared out of nowhere!", "jumped in!", "hopped in!", "joined the game!", "flew in!", "is here!", "dab!"]
var leftMessages = ["is no longer with us.", "has left us.", "commited.", "went somewhere else.", "left the game.", "yeeeted."]



var server = app.listen(port, function () {

  console.log("Project Stugan | Listening to requests on port " + port + ", at " + ticks + " ticks.");
  loadItemsLibary(); // Read all JSON's with item data.
  // Socket setup
  var io = socket(server);

  // Start tick, 20 ticks/s
  setInterval(() => tick(), 1000 / ticks);

  /**
   * Load a player into the server, get all items etc 
   */

  function loginPlayer(username, socketid) {
    /* Make sure user is not already logged in */
    for (player of players)
      if (player.username == username) disconnectPlayer(player.socketid);

    sendChat(username + " " + joinedMessages[Math.floor(Math.random() * joinedMessages.length)], "#f4d742", "Server");

    var player = {
      inventory: [],
      outfit: {},
      position: {},
      id: 0,
      walking: false,
      flipped: false,
      username: username,
      socketid: socketid,
      blinking: 0
    }

    con.query("SELECT * FROM `users` WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
      if (!error) {
        res = result[0];
        player.position.x = res.position_x;
        player.position.y = res.position_y;
        player.username = res.username; // ensure capital letters are correct
        player.id = res.id;
        player.outfit = JSON.parse(res.outfit);
        if (res.inventory == "") player.inventory = [];
        else player.inventory = JSON.parse(res.inventory);

        players.push(player);
        io.to(player.socketid).emit("game", {
          map: map,
          items: items,
          player: player,
          chat: chat,
          droppedItems: droppedItems
        })
      }
    })
  }

  function sendChat(message, color, sender) {
    var chatMessage = {
      message: message,
      color: color,
      sender: sender,
      date: Date.now()
    };
    for (player of players) {
      io.to(player.socketid).emit("chat", chatMessage);
    }
    console.log(sender + ": " + message);
    chat.push(chatMessage);
    while (chat.length > 50) chat.splice(chat.length - 1, 1); // Make sure chat is no longer than 50 messages
  }

  function tick() {

    /* Gather data for from all players */
    clientPlayerData = new Array();
    for (player of players) {

      if (Math.floor(Math.random() * (ticks * 4)) == 0) {
        player.blinking = 5;
      }

      clientPlayerData.push({
        position: player.position,
        username: player.username,
        walking: player.walking,
        flipped: player.flipped,
        outfit: player.outfit,
        closedEyes: player.blinking > 0
      })

      if (player.blinking > 0) player.blinking--;
    }

    /* Send that data to all players */
    for (player of players) {
      io.to(player.socketid).emit("tick", {
        players: clientPlayerData
      });
      //TODO: Send NPC's and world
    }
  }

  function disconnectPlayer(socketid) {
    for (let i = 0; i < players.length; i++) {
      if (players[i].socketid === socketid) {
        sendChat(players[i].username + " " + leftMessages[Math.floor(Math.random() * leftMessages.length)], "#f4d742", "Server");
        players.splice(i, 1);
        return;
      }
    }
  }



  io.on("connection", (socket) => {

    function getPlayer() {
      for (p of players)
        if (p.socketid == socket.id) return p
    }

    /* Server-side movement, and flipping */
    socket.on("move", movement => {
      player = getPlayer();
      if (player) {
        p.position.x += movement.x;
        p.position.y += movement.y;
        p.flipped = movement.flipped;
      }
    })

    socket.on("disconnect", () => {
      disconnectPlayer(socket.id);
    })

    socket.on("chat", message => {
      var player = getPlayer();
      if (player == undefined) return;
      if (message.length > 100) return;
      if (message.trim().length == 0) return;
      sendChat(message, "grey", player.username)
    })

    // Sign up
    socket.on("sign_up", pack => {
      var err = "";

      if (pack.password.length < 5) err = "Password must be at least 5 characters long";
      if (pack.password.length > 300) err = "Password is too long";
      // Encrypt password
      pack.password = md5(pack.password);

      if (!pack.username.match('([A-Za-z0-9\-\_]+)')) err = "Username is not allowed.";
      if (pack.username.length > 12) err = "Too long username.";
      if (pack.username.length < 3) err = "Username must be at least 3 characters.";

      con.query('SELECT * FROM users WHERE upper(username) = ' + sanitize.escape(pack.username).toUpperCase(), (error, result) => {
        if (error) return;
        else if (result.length > 0) err = "Username is already taken."
        if (err === "") {
          // If there are no errors, create account
          try {
            con.query("INSERT INTO `users`(`username`, `password`, `inventory`, `outfit`) VALUES (" + sanitize.escape(pack.username) + ", " + sanitize.escape(pack.password) + ", '[10, 32]', '" + '{"body":10, "eyes":32}' + "')", (error, result) => {
              if (!error) {
                console.log("Created account for: " + pack.username);
                socket.emit("successful_account_creation", true);
                socket.emit("token", get_user_key(pack.username, pack.password));
              } else {
                console.log("Opsiee!", error);
              }
            })
          } catch (e) {
            console.log("Could not create account...")
            socket.emit("err", "Something unexpected happened when creating your account. Please try again.");
          }
        } else {
          // Respond if there was a problem
          socket.emit("err", err);
        }
      })
    })




    socket.on("login", pack => {
      if (pack.token !== undefined) {
        // Automatic login, actual login process
        var username = pack.token.substr(0, pack.token.lastIndexOf("_"));
        var password = pack.token.substr(pack.token.lastIndexOf("_") + 1, pack.token.length - 1);
        con.query('SELECT * FROM users WHERE upper(username) = ' + sanitize.escape(username).toUpperCase(), (err, result) => {
          var account = result[0];
          if (account.password === password) {
            console.log("Logged in " + account.username)
          }
        });

      } else if (pack.username && pack.password) {
        con.query('SELECT * FROM users WHERE username = ' + sanitize.escape(pack.username), (err, result) => {
          if (err) return;
          else if (result.length > 0) {
            // User exists
            var account = result[0];
            if (account.password === md5(pack.password)) {
              // Correct password and username, send user their token and redirect them.
              //socket.emit("token", get_user_key(account.username, account.password));
              loginPlayer(account.username, socket.id);
            }
          }
        })

      }

    });



    socket.on("give", pack => give(pack.username, pack.id));
    socket.on("equip", index => {
      try {
        equip(getPlayer().username, index)
      } catch (e) {}
    });
    socket.on("unequip", index => {
      try {
        unequip(getPlayer().username, index)
      } catch (e) {}
    });

    socket.on("drop", index => {
      try {
        drop(getPlayer().username, index)
      } catch (e) {

      }
    });

    socket.on("pick", item => {
      try {
        pick(getPlayer().username, item)
      } catch (e) {
      }
    });

    function getPlayerSocket(username) {
      for (player of players)
        if (player.username.toLowerCase() == username.toLowerCase()) return player.socketid;
      return false;
    }

    function getPlayerFromSocket(socket) {
      for (player of players)
        if (player.socketid == socket) return player;
      return false;
    }




    function get_user_key(username, password) {
      return username.toLowerCase() + "_" + password;
    }


    function give(username, itemID, amount) {
      if (amount === undefined) amount = 1;
      con.query("SELECT * FROM users WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
        if (!error) {
          if (result.length < 1) return;
          inventory = result[0].inventory;
          if (inventory == "") inventory = [];
          else inventory = JSON.parse(inventory);

          inventory.push(itemID);
          var player = getPlayer();

          for (player of players) {
            if (player.username == username) {
              player.inventory = inventory;
            }
          }

          con.query("UPDATE users SET inventory = '" + JSON.stringify(inventory) + "' WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
            if (!error) {
              io.to(getPlayerSocket(username)).emit("update", player);
            } else throw error;
          })
        } else throw error;
      })
    }


    function equip(username, index) {
      var itemID = player.inventory[index];
      var wearableTypes = ["body", "beard", "hair", "headwear", "pants", "shirt", "eyes", "mouth", "glasses", "makeup"]
      if (wearableTypes.indexOf(items[itemID].type) != -1) {
        con.query("SELECT * FROM users WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
          if (!error) {
            if (result.length < 1) return;
            outfit = result[0].outfit;
            if (outfit == "") outfit = {};
            else outfit = JSON.parse(outfit);

            if (JSON.parse(result[0].inventory).indexOf(itemID.toString()) != -1) outfit[items[itemID].type] = itemID;
            else {
              console.log("WARN: Does not own item!", JSON.parse(result[0].inventory));
              return;
            }
            con.query("UPDATE users SET outfit = '" + JSON.stringify(outfit) + "' WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
              if (!error) {
                for (player of players) {
                  if (player.username == username) {
                    player.outfit = outfit;
                  }
                }
              } else throw error;
            })
          } else throw error;
        })
      } else {
        console.log("WARN: not a wearable item!");
      }
    }

    function unequip(username, index) {
      var itemID = player.inventory[index];
      var wearableTypes = ["makeup", "beard", "hair", "headwear", "pants", "shirt", "mouth", "glasses"]
      if (wearableTypes.indexOf(items[itemID].type) != -1) {
        con.query("SELECT * FROM users WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
          if (!error) {
            if (result.length < 1) return;
            outfit = result[0].outfit;
            if (outfit == "") outfit = {};
            else outfit = JSON.parse(outfit);

            outfit[items[itemID].type] = "0";

            con.query("UPDATE users SET outfit = '" + JSON.stringify(outfit) + "' WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
              if (!error) {
                for (player of players) {
                  if (player.username == username) {
                    player.outfit = outfit;
                  }
                }
              } else throw error;
            })
          } else throw error;
        })
      } else {
        console.log("WARN: not a wearable item!");
      }
    }

    function dropItem(x, y, id) {
      droppedItems.push({
        x: x,
        y: y,
        id: id,
        droppedAt: Date.now()
      })

      for (p of players) {
        io.to(p.socketid).emit("droppedItems", droppedItems);
      }

    }

    function removeDroppedItem(index){
      droppedItems.splice(index, 1);
      for (p of players) {
        io.to(p.socketid).emit("droppedItems", droppedItems);
      }
    }

    function drop(username, index) {
      var itemID = player.inventory[index];
      con.query("SELECT * FROM users WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
        if (!error) {
          if (result.length < 1) return;
          inventory = result[0].inventory;
          if (inventory == "") inventory = [];
          else inventory = JSON.parse(inventory);

          if (items[itemID].droppable === false) {
            console.log("ERR: Item is not droppable!");
            return;
          }

          var player = getPlayer();

          for(item in player.outfit){
            if(player.outfit[item] == itemID){
              var count = 0;
              for(itm of player.inventory){
                if(itm == itemID) count++;
              }
              if(count == 1){
                console.log("ERR: User is wearing this item!")
                return;
              }
            }
          }

          inventory.splice(index, 1); // Remove item from users inventory
         
          if (player !== undefined) {
            dropItem(player.position.x, player.position.y, itemID)
          }

          con.query("UPDATE users SET inventory = '" + JSON.stringify(inventory) + "' WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
            if (!error) {
              for (player of players) {
                if (player.username == username) {
                  player.inventory = inventory;
                }
              }

              io.to(getPlayerSocket(username)).emit("update", player);

            } else throw error;
          })
        } else throw error;
      })
    }

    
    function pick(username, item) {
      con.query("SELECT * FROM users WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
        if (!error) {
          if (result.length < 1) return;
          inventory = result[0].inventory;
          if (inventory == "") inventory = [];
          else inventory = JSON.parse(inventory);

          var player = getPlayer();

          for(i = 0; i < droppedItems.length; i++){
            droppedItem = droppedItems[i];
            if(droppedItem.id == item.id && droppedItem.x == item.x && droppedItem.y == item.y){
              inventory.push(droppedItem.id);
              removeDroppedItem(i);
            } 
          }
         
          con.query("UPDATE users SET inventory = '" + JSON.stringify(inventory) + "' WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
            if (!error) {
              for (player of players) {
                if (player.username == username) {
                  player.inventory = inventory;
                }
              }
              io.to(getPlayerSocket(username)).emit("update", player);
            } else throw error;
          })
        } else throw error;
      })
    }




    /**
     * Explicit words censored for users and warns admins.
     * Some, even more explicit words are not event accepted by the server and are not indexed here.
     */

    // Base List of Bad Words in English
    let bad_words = ["asshole", "bastard", "bitch", "boong", "cock", "cocksucker", "cunt", "dick", "fag", "faggot", "fuck", "gook", "motherfucker", "piss", "pussy", "slut", "tits", "nigga"]

    function containes_bad_word(comment) {
      for (badWord of bad_words) {
        if (comment.toLowerCase().indexOf(badWord) != -1) return true;
      }
      return false;
    }

    function censor_comment(comment) {
      for (badWord of bad_words) {
        var breakPoint = 0;
        while (comment.toLowerCase().indexOf(badWord) != -1) {
          breakPoint++;
          if (breakPoint > 50) {
            console.warn("There was a problem with the censor filter, please report this bug via 'Contact me', Thanks!");
            break;
          }
          var index = comment.toLowerCase().indexOf(badWord);
          var censorString = new String();
          for (let i = 1; i < badWord.length; i++) censorString += "*";
          comment = comment.substr(0, index + 1) + censorString + comment.substr(index + badWord.length, comment.length);
        }
      }
      return comment;
    }








    /* END OF SOCKET */
  });
});


function loadItemsLibary() {
  var jsons = fs.readdirSync("items");
  for (json of jsons) {
    item = JSON.parse(fs.readFileSync("items/" + json));
    items[item.id] = item;
  }
  console.log("Loaded " + jsons.length + " items.");
}