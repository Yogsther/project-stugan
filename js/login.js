
// VERY BAD AND INSECURE, TODO - IMPLEMENT THE TOKEN SYSTEM!
if(localStorage.getItem("cred") != undefined && localStorage.getItem("cred") != ""){
    cred = JSON.parse(localStorage.getItem("cred"));
    document.getElementById("username").value = cred.username;
    document.getElementById("password").value = cred.password;
}

var autolog = localStorage.getItem("autologin");
if(autolog === "true"){
    login();
    document.getElementById("autologin").checked = autolog;
}

function getCredentials(){
    return {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
    }
}

function login(){
    socket.emit("login", getCredentials())
    localStorage.setItem("cred", JSON.stringify(getCredentials()))
    // TODO: Move all of this below to a callback
    joined = true; 
}

function logout(){
    localStorage.setItem("cred", "");
    socket.emit("leave");
    joined = false;
}

function openLoginWindow(){
    document.getElementById("login-background").style.visibility = "visible";
}

function closeLoginWindow(){
    document.getElementById("login-background").style.visibility = "hidden";
}
function sign_up(){
    socket.emit("sign_up", getCredentials())
}


function autologin(value){
    console.log(value.checked)
    localStorage.setItem("autologin", value.checked);
}

/* socket.on("token", token => {
    localStorage.setItem("token", token);
}) */

socket.on("err", error => alert(error));