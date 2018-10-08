/*
    Project Stugan - Back end
*/

/* Choose a port */
var port = 45599;
var ticks = 20; // Ticks per second
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

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "stugan"
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected to db, stugan.");
});

/* World arrays */

var items = new Array(); // Index of items, loaded from /items/ (Not live items, just for refrence)
var map = new Array(); // Map of the entire world
var players = new Array(); // All active players
var npcs = new Array(); // All active NPC's


loadItemsLibary(); // Read all JSON's with item data.

var server = app.listen(port, function () {

  console.log("Project Stugan | Listening to requests on port " + port + ", at " + ticks + " ticks.");

  // Socket setup
  var io = socket(server);

  // Start tick, 20 ticks/s
  setInterval(() => tick(), 1000/ticks);
  
  /**
   * Load a player into the server, get all items etc 
   */
  function loginPlayer(username, socketid) {
    /* Make sure user is not already logged in */
    for (player of players)
      if (player.username == username) return;

    var player = {
      inventory: [],
      outfit: {},
      position: {},
      id: 0,
      walking: false,
      flipped: false,
      username: username,
      socketid: socketid
    }

    con.query("SELECT * FROM `users` WHERE upper(username) = " + sanitize.escape(username).toUpperCase(), (error, result) => {
      if (!error) {
        res = result[0];
        player.position.x = res.position_x;
        player.position.y = res.position_y;
        player.username = res.username; // ensure capital letters are correct
        player.id = res.id;

        con.query("SELECT * FROM `items` WHERE owner_id = " + player.id, (error, result) => {
          if (!error) {
            for (item of result) {
              player.inventory.push(item);
            }

            players.push(player);
            io.to(player.socketid).emit("game", {
              map: map,
              player: player
            })
          }
        })

      }
    })



  }

  function tick() {

    /* Gather data for from all players */
    clientPlayerData = new Array();
    for (player of players) {
      clientPlayerData.push({
        position: player.position,
        username: player.username,
        walking: player.walking,
        flipped: player.flipped
      })
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
    for(let i = 0; i < players.length; i++){
      if(players[i].socketid === socketid){
        players.splice(i, 1);
        return;
      }
    }
  }

  

  io.on("connection", (socket) => {

    function getPlayer(){ for(p of players) if(p.socketid == socket.id) return p }

    /* Server-side movement, and flipping */
    socket.on("move", movement => {
      player = getPlayer();
      if(player){
        p.position.x+=movement.x;
        p.position.y+=movement.y;
        p.flipped = movement.flipped;
      }
    })

    socket.on("disconnect", () => {
      disconnectPlayer(socket.id);
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
            con.query("INSERT INTO `users`(`username`, `password`) VALUES (" + sanitize.escape(pack.username) + ", " + sanitize.escape(pack.password) + ")", (error, result) => {
              if (!error) {
                console.log("Created account for: " + pack.username);
                socket.emit("successful_account_creation", true);
                socket.emit("token", get_user_key(pack.username, pack.password));
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





    /* END OF SOCKET */
  });
});




function get_user_key(username, password) {
  return username.toLowerCase() + "_" + password;
}

function loadItemsLibary() {
  var jsons = fs.readdirSync("items");
  for (json of jsons) {
    item = JSON.parse(fs.readFileSync("items/" + json));
    items[item.id] = item;
  }
  console.log("Loaded " + jsons.length + " items.");
}

function createItem(id, ownerId) {
  //INSERT INTO `items` (`id`, `owner_id`, `enchantment`) VALUES ('0', '0', '0');
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