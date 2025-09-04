import { resetStartScreen, createLogMessage } from './sharedMethods.js';
import Sock from './Socket.js';
import MazeEscape from './Game.js';

window.onload = () => {

    const SERVER = 'http://' + window.location.hostname + ':' + window.location.port;
    let username = undefined;
    let controlSurvivor = undefined;
    let controlEntity = undefined;
    let sockObj = undefined;
    let usernameAllowed = false;
    const disableClicks = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const startScreen = document.querySelector(".startScreen");
    const win = document.querySelector(".win");
    const lost = document.querySelector(".lost");

    createLogMessage("Set an username.");

    startScreen.addEventListener('click', async (e) => {
        const targetNode = e.target;

        if (targetNode.className === 'username') {
            if (startScreen.querySelector(".inviteFriend").style.visibility == "visible") {
                startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
            }
        } else if (targetNode.className === 'setButt') {
            username = startScreen.querySelector(".username").value.trim();

            if (username === "") {
                startScreen.querySelector(".username").placeholder = "Insert an username";
                createLogMessage("Insert an username!");
                return;
            }

            await setUsername();

        } else if (targetNode.className === 'resetButt') {
            if (startScreen.querySelector(".inviteFriend").style.visibility == "visible") {
                startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
            }

            await resetUsername();

        } else if (targetNode.className === 'friendButt' || targetNode.className === 'onlineButt') {
            if (!username || !usernameAllowed) {
                createLogMessage("Insert an Username!");
                return;
            }

            if (targetNode.className === 'friendButt') {
                if (startScreen.querySelector(".inviteFriend").style.visibility == "visible") {
                    startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
                } else {
                    startScreen.querySelector(".inviteFriend").style.visibility = "visible";
                }
            } else {

                if (startScreen.querySelector(".inviteFriend").style.visibility == "visible") {
                    startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
                }

                await matchMaking();
            }

        } else if (targetNode.className === 'sendButt') {
            const friendUsername = startScreen.querySelector(".friendUsername").value.trim();

            if (friendUsername == "") {
                startScreen.querySelector(".friendUsername").placeholder = "Insert an username";
                createLogMessage("Insert your friend's username!");
                return;
            }

            startScreen.querySelector(".friendUsername").value = "";

            await sendInvite(friendUsername);

        } else if (targetNode.className === 'survButt' || targetNode.className === 'entityButt') {

            selectCharacter(targetNode.className === 'survButt' ? 'survivor' : 'monster');

        } else if (targetNode.className === 'startButt') {
            if (!controlSurvivor && !controlEntity) {
                createLogMessage("Choose a Character!");
                return;
            }

            await startMatch();

        } else if (targetNode.className === 'hideButt') {
            startScreen.querySelector(".log").style.visibility = "hidden";
            startScreen.querySelector(".openLogButt").style.display = "block";
        } else if (targetNode.className === 'openLogButt') {
            startScreen.querySelector(".log").removeAttribute("style");
            startScreen.querySelector(".openLogButt").style.display = "none";
        } else if (targetNode.className === 'acceptButt') {
            sockObj.socket.emit('accepted', { acceptedBy: username, inviteCode: parseInt(targetNode.parentElement.parentElement.id) });
            targetNode.parentElement.parentElement.remove();
        } else if (targetNode.className === 'refuseButt') {
            sockObj.socket.emit('refused', { refusedBy: username, inviteCode: parseInt(targetNode.parentElement.parentElement.id) });
            targetNode.parentElement.parentElement.remove();
        }
    });

    win.addEventListener('click', (e) => {
        const targetNode = e.target;

        if (targetNode.className == "exit") {
            backToMainMenu();
            createLogMessage("You won the match!");
        }
    });

    lost.addEventListener('click', (e) => {
        const targetNode = e.target;

        if (targetNode.className == "exit") {
            backToMainMenu();
            createLogMessage("You lost the match.");
        }
    });

    async function setUsername() {
        await fetch(SERVER + "/checkUsername?username=" + username)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    if (!sockObj) {
                        sockObj = new Sock(username);
                    } else {
                        sockObj.socket.emit('set-username', username);
                    }
                    usernameAllowed = true;
                    createLogMessage(username + " connected.");
                    startScreen.querySelector(".username").setAttribute("disabled", true);
                    startScreen.querySelector(".disabledButt").classList.add("resetButt");
                    startScreen.querySelector(".disabledButt").classList.remove("disabledButt");
                    startScreen.querySelector(".setButt").classList.add("disabledButt");
                    startScreen.querySelector(".disabledButt").classList.remove("setButt");

                    startScreen.querySelector(".username").value = "";
                    startScreen.querySelector(".username").placeholder = "Username";
                } else {
                    usernameAllowed = false;
                    createLogMessage("Failed: username is already in use.");
                }
            })
            .catch(err => console.log("Errore durante il controllo dell'username: " + err));
    };

    async function resetUsername() {
        await fetch(SERVER + "/reset-username", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username
            })
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    startScreen.querySelector(".disabledButt").classList.add("setButt");
                    startScreen.querySelector(".disabledButt").classList.remove("disabledButt");
                    startScreen.querySelector(".resetButt").classList.add("disabledButt");
                    startScreen.querySelector(".disabledButt").classList.remove("resetButt");
                    startScreen.querySelector(".username").removeAttribute("disabled");
                    usernameAllowed = false;
                    createLogMessage("Reset allowed.");
                } else {
                    createLogMessage("Reset is not allowed.");
                }
            })
            .catch(err => {
                console.log("Errore nella reimpostazione dell'username: " + err);
                createLogMessage("Error during the reset...");
            });
    };

    async function sendInvite(receiver) {
        const inviteCode = await getInviteCode();

        if (!inviteCode) {
            createLogMessage("Failed to generate invite code");
            return;
        }

        sockObj.socket.emit("send-invite", { sender: username, receiver, code: inviteCode });
    };

    async function getInviteCode() {
        try {
            const response = await fetch(SERVER + "/get-invite-code");
            const json = await response.json();
            return json.success ? json.id : undefined;
        } catch (err) {
            console.log("Errore nell'ottenimento dell'Id invito: " + err);
            return undefined;
        }
    };

    async function matchMaking() {
        createLogMessage("Matchmaking... (If no users are found within 15 seconds, it will be automatically canceled.)");
        startScreen.style.cursor = "wait";
        const friendButt = startScreen.querySelector(".friendButt");
        const onlineButt = startScreen.querySelector(".onlineButt");
        const resetButt = startScreen.querySelector(".resetButt");

        friendButt.addEventListener('click', disableClicks);
        onlineButt.addEventListener('click', disableClicks);
        resetButt.addEventListener('click', disableClicks);
        friendButt.style.cursor = "wait";
        onlineButt.style.cursor = "wait";
        resetButt.style.cursor = "wait";

        const matchData = await match();

        if (!matchData) {
            createLogMessage("Failed to match another user.");
            return;
        }

        sockObj.matchIndex = matchData.matchIndex;
        sockObj.playerNum = matchData.playerNum;
        sockObj.playingWithFriend = false;

        createLogMessage("You and " + matchData.otherPlayer + " are now in the same lobby.");
        startScreen.removeAttribute("style");
        startScreen.querySelector(".userMode").style.visibility = "hidden";
        startScreen.querySelector(".characterStart").style.visibility = "visible";

        setTimeout(() => {
            friendButt.removeEventListener('click', disableClicks);
            onlineButt.removeEventListener('click', disableClicks);
            resetButt.removeEventListener('click', disableClicks);
            startScreen.removeAttribute("style");
            friendButt.removeAttribute("style");
            onlineButt.removeAttribute("style");
            resetButt.removeAttribute("style");
        }, 15000);
    };

    async function match() {
        try {
            const firstResponse = await fetch(SERVER + "/setPending", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username
                })
            });
            const firstJson = await firstResponse.json();
            if (firstJson.success) {
                return new Promise((resolve, reject) => {
                    const polling = setInterval(async () => {
                        try {
                            const secondRes = await fetch(SERVER + "/matchmaking?username=" + username);
                            const secondJson = await secondRes.json();
                            if (secondJson.success && secondJson.match) {
                                clearInterval(polling);
                                createLogMessage("The Matchmaking was successful.");
                                resolve(secondJson.match);
                            } else if (secondJson.available) {
                                clearInterval(polling);
                                createLogMessage("Matchmaking expired.");
                                reject(new Error("Matchmaking expired."));
                            } else {
                                createLogMessage("Waiting for another user...");
                            }
                        } catch (err) {
                            clearInterval(polling);
                            createLogMessage(err);
                            reject(err);
                        }
                    }, 2000);
                });
            } else {
                throw new Error("Fallimento nel passaggio allo stato di 'pending'.");
            }
        } catch (err) {
            console.log("Errore durante il matchmaking: " + err);
            return undefined;
        }
    };

    async function selectCharacter(character) {
        await fetch(SERVER + "/character-selection", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'username': username,
                character,
                'match': sockObj.matchIndex >= 0 ? sockObj.matchIndex : null,
                'playerNum': sockObj.playerNum ? sockObj.playerNum : null
            })
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    if (character == 'survivor') {
                        controlSurvivor = true;
                        controlEntity = false;
                        createLogMessage("Survivor selected.");
                    } else {
                        controlEntity = true;
                        controlSurvivor = false;
                        document.querySelector(".lifeBar").style.visibility = "hidden";
                        createLogMessage("Entity selected.");
                    }
                } else if (res.selectedFromYou) {
                    createLogMessage("You already selected this character.");
                } else {
                    createLogMessage("Character already selected by the other player.");
                }
                console.log(res.message);
            })
            .catch(err => {
                createLogMessage("Error during character selection...");
                console.log("Errore in /character-selection: " + err);
            });
    };

    async function startMatch() {
        startScreen.style.cursor = "wait";
        const survButt = startScreen.querySelector(".survButt");
        const entityButt = startScreen.querySelector(".entityButt");
        const startButt = startScreen.querySelector(".startButt");

        survButt.addEventListener('click', disableClicks);
        entityButt.addEventListener('click', disableClicks);
        startButt.addEventListener('click', disableClicks);
        survButt.style.cursor = "wait";
        entityButt.style.cursor = "wait";
        startButt.style.cursor = "wait";

        await fetch(SERVER + "/ready?username=" + username + "&player=" + sockObj.playerNum + "&match=" + sockObj.matchIndex)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    createLogMessage("You are ready to play.");
                    if (sockObj.playingWithFriend) {
                        createLogMessage("Waiting for your friend to be ready...");
                    } else {
                        createLogMessage("Waiting for the other player to be ready...");
                    }
                    const pollInterval = setInterval(() => {
                        fetch(SERVER + "/start?username=" + username + "&player=" + sockObj.playerNum + "&match=" + sockObj.matchIndex)
                            .then(res => res.json())
                            .then(res => {
                                if (res.success) {
                                    if (sockObj.playingWithFriend) {
                                        createLogMessage("Your friend is ready! Starting match...");
                                    } else {
                                        createLogMessage("Your opponent is ready! Starting match...");
                                    }
                                    clearInterval(pollInterval);
                                    const params = {
                                        'socket': sockObj,
                                        control: controlSurvivor ? 'survivor' : 'entity'
                                    };
                                    MazeEscape.create(params).then(mainScene => sockObj.Scene = mainScene)
                                        .catch(err => {
                                            console.log("Errore nella creazione della mainScene: " + err);
                                            createLogMessage("Error during the generation of the Maze...");
                                        });

                                    createLogMessage("Initializing the map...");

                                    setTimeout(() => {
                                        survButt.removeEventListener('click', disableClicks);
                                        entityButt.removeEventListener('click', disableClicks);
                                        startButt.removeEventListener('click', disableClicks);
                                        survButt.removeAttribute("style");
                                        entityButt.removeAttribute("style");
                                        startButt.removeAttribute("style");
                                        startScreen.style.visibility = "hidden";
                                        startScreen.querySelector(".characterStart").style.visibility = "hidden";
                                    }, 12000);
                                } else if (res.disconnection) {
                                    clearInterval(pollInterval);
                                    resetStartScreen();
                                    if (sockObj.playingWithFriend) {
                                        createLogMessage("Your friend disconnected.");
                                    } else {
                                        createLogMessage("The other user disconnected.");
                                    }
                                }
                                console.log(res.message);
                            })
                            .catch(err => {
                                createLogMessage("Error during matchmaking...");
                                console.log("Errore in /start durante il polling: " + err);
                                clearInterval(pollInterval);
                            });
                    }, 2000);

                }
                console.log(res.message);
            })
            .catch(err => console.log("Errore in /ready: " + err));
    };

    function backToMainMenu() {
        MazeEscape.destroy();
        console.log("Gioco distrutto.");
        sockObj.Scene = null;
        resetStartScreen();
        if (controlSurvivor !== null) {
            controlSurvivor = null;
        }
        if (controlEntity !== null) {
            controlEntity = null;
        }
    };

};