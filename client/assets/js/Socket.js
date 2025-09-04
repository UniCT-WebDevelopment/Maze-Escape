import { resetStartScreen, createLogMessage } from './sharedMethods.js';

const startScreen = document.querySelector(".startScreen");
const greenBar = document.querySelector(".green");

export default class Socket {
    constructor(username) {
        this.socket = io({
            auth: {
                "username": username
            }
        });

        this.matchIndex = null;
        this.playerNum = null;
        this.playingWithFriend = null;

        this.init();
    }

    get Socket() {
        return this.socket;
    }

    set Scene(mainScene) {
        if (mainScene) {
            this._mainScene = mainScene;
            this._remoteSurvivor = this._mainScene.Survivor;
            this._remoteEntity = this._mainScene.Entity;
            this._control = this._mainScene.Control;
        } else {
            this._mainScene = null;
            this._remoteSurvivor = null;
            this._remoteEntity = null;
            this._control = null;
        }
    }

    get Scene(){
        if(this._mainScene){
            return this._mainScene;
        }
        return undefined;
    }

    init() {

        this.socket.on('invite-accepted', data => {
            createLogMessage(data.receiver + " accepted your invite!");
            startScreen.querySelector(".userMode").style.visibility = "hidden";
            startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
            startScreen.querySelector(".characterStart").style.visibility = "visible";
            createLogMessage("You and " + data.receiver + " are now in the same lobby.");
            this.matchIndex = data.matchIndex;
            this.playerNum = data.playerNum;
            this.playingWithFriend = true;
        });

        this.socket.on('lobby-joined', data => {
            createLogMessage("You and " + data.sender + " are now in the same lobby.");
            startScreen.querySelector(".userMode").style.visibility = "hidden";
            startScreen.querySelector(".inviteFriend").style.visibility = "hidden";
            startScreen.querySelector(".characterStart").style.visibility = "visible";
            this.matchIndex = data.matchIndex;
            this.playerNum = data.playerNum;
            this.playingWithFriend = true;
        });

        this.socket.on('invite-refused', refuseMessage => {
            createLogMessage(refuseMessage);
        });

        this.socket.on('invite-error', err => {
            createLogMessage(err);
        });

        this.socket.on('sent', message => {
            createLogMessage(message);
        });

        this.socket.on('receive-invite', invite => {
            createLogInviteMessage(invite.sender, invite.code);
        });

        this.socket.on('matchFound', match => {
            createLogMessage("Match found! You and " + match.otherPlayer + " are now in the same lobby.");
            this.matchIndex = match.matchIndex;
            this.playerNum = match.playerNum;
            this.playingWithFriend = false;
        });

        this.socket.on('get-room', room => {
            this.socket.emit('set-room', room);
        });

        this.socket.on('startMoving', action => {
            if (this._remoteSurvivor?.Ready && this._remoteEntity?.Ready) {
                if (action.character === 'survivor' && !(this._control == 'survivor')) {
                    this._remoteSurvivor.ActiveKey = action.key;
                } else if (action.character === 'monster' && !(this._control == 'monster')) {
                    this._remoteEntity.ActiveKey = action.key;
                }
            }
        });

        this.socket.on('stopMoving', action => {
            if (this._remoteSurvivor?.Ready && this._remoteEntity?.Ready) {
                if (action.character === 'survivor' && !(this._control == 'survivor')) {
                    this._remoteSurvivor.DeactiveKey = action.key;
                } else if (action.character === 'monster' && !(this._control == 'monster')) {
                    this._remoteEntity.DeactiveKey = action.key;
                }
            }
        });

        this.socket.on('updateSurvivor', state => {
            if (this._remoteSurvivor?.Ready && this._remoteEntity?.Ready) {
                if (!(this._control == 'survivor')) {
                    this._remoteSurvivor.Position = state.position;
                    this._remoteSurvivor.Rotation = state.rotation;
                    this._remoteSurvivor.CurrentState = state.action;
                }
            }
        });

        this.socket.on('updateEntity', state => {
            if (this._remoteSurvivor?.Ready && this._remoteEntity?.Ready) {
                if (!(this._control == 'monster')) {
                    this._remoteEntity.Position = state.position;
                    this._remoteEntity.Rotation = state.rotation;
                    this._remoteEntity.CurrentState = state.action;
                }
            }
        });

        this.socket.on('gotHit', () => {
            if(this._control == 'survivor'){
                this._remoteEntity._UpdateHealthBar();
                console.log("HealthBar aggiornata.");
            }
        });

        this.socket.on('setGameover', () => {
            if (!this._mainScene._gameOver) {
                this._mainScene._gameOver = true;

                if ((this._control == "survivor" && this._mainScene._survivorEscaped) || (this._control == "monster" && !this._mainScene._survivorEscaped)) {
                    document.querySelector(".win").style.visibility = "visible";
                    console.log("Hai vinto!");
                } else if ((this._control == "survivor" && !this._mainScene._survivorEscaped) || (this._control == "monster" && this._mainScene._survivorEscaped)) {
                    document.querySelector(".lost").style.visibility = "visible";
                    console.log("Hai perso!");
                }

                document.exitPointerLock();
            }
        });

        this.socket.on('setEscaped', () => {
            if (!this._mainScene._survivorEscaped) {
                this._mainScene._survivorEscaped = true;
            }
        });

        this.socket.on('opponent-disconnected', user => {
            if (this._mainScene) {
                if (this._control == "survivor") {
                    this._mainScene._survivorEscaped = true;
                } else if (this._control == "monster") {
                    this._mainScene._survivorEscaped = false;
                }
                this._mainScene._gameOver = true;
            } else {
                resetStartScreen();
                if(this.playingWithFriend){
                    createLogMessage("Your friend disconnected.");
                } else {
                    createLogMessage("Your opponent disconnected.");
                }
            }
        });

        this.socket.on('server-offline', () => {
            resetStartScreen();
            createLogMessage("Il server è andato offline...");
        });

    }
};

function createLogInviteMessage(sender, inviteCode) {

    const msg = sender + " invited you to a game!";
    console.log(msg);

    const logMessage = document.createElement("div");
    logMessage.className = "logMessage";
    logMessage.id = inviteCode;
    const message = document.createElement("div");
    message.className = "message";
    message.textContent = msg;
    logMessage.appendChild(message);

    const inviteButts = document.createElement("div");
    inviteButts.className = "inviteButts";
    const acceptButt = document.createElement("button");
    acceptButt.className = "acceptButt";
    acceptButt.textContent = "Accept";
    const refuseButt = document.createElement("button");
    refuseButt.className = "refuseButt";
    refuseButt.textContent = "Refuse";
    inviteButts.appendChild(acceptButt);
    inviteButts.appendChild(refuseButt);

    logMessage.appendChild(inviteButts);

    startScreen.querySelector(".logBody").appendChild(logMessage);

}