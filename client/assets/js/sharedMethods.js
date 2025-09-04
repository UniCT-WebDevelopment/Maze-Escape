const startScreen = document.querySelector(".startScreen");
const lifeBar = document.querySelector(".lifeBar");
const greenBar = document.querySelector(".green");
const win = document.querySelector(".win");
const lost = document.querySelector(".lost");

export function resetStartScreen() {
    if (startScreen.style) {
        startScreen.removeAttribute("style");
    }
    if (startScreen.querySelector(".userMode").style.visibility != "visible") {
        startScreen.querySelector(".userMode").style.visibility = "visible";
    }
    if (startScreen.querySelector(".inviteFriend").style.visibility != "hidden") {
        startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
    }
    if (startScreen.querySelector(".characterStart").style.visibility != "hidden") {
        startScreen.querySelector(".characterStart").style.visibility = "hidden";
    }
    if (lost.style.visibility == "visible") {
        lost.style.visibility = "hidden";
    }
    if (win.style.visibility == "visible") {
        win.style.visibility = "hidden";
    }

    if (greenBar.style.width != "100%") {
        greenBar.style.width = "100%";
    }

};

export function createLogMessage(msg) {
    console.log(msg);

    const logMessage = document.createElement("div");
    logMessage.className = "logMessage";
    const message = document.createElement("div");
    message.className = "message";
    message.textContent = msg;
    logMessage.appendChild(message);

    startScreen.querySelector(".logBody").appendChild(logMessage);
};