import { Vector2, Vector3 } from 'three';
import express from "express";
import { createServer } from "http";
import { Server as SocketIoServer } from "socket.io";
import cors from "cors";
import { checkSelected, pendingUsers, alreadyMatched } from "./middlewares.js";
import Maze from "./Maze.js";

const app = express();
const http = createServer(app);
const io = new SocketIoServer(http);
const PORT = 8080;
const users = [];
const inviteCodes = [];
const matchMaking = [];

app.use(express.json());
app.use(express.static("../client"));
app.use(cors());

io.on('connection', socket => {
    let username = getSocketUsername(socket.handshake.auth.username, socket);
    let room = null;
    console.log(username + " si è connesso. Socket_id: " + socket.id);

    socket.on('set-username', uname => {
        console.log(username + " ha cambiato nome in: " + uname);
        username = getSocketUsername(uname, socket);
    });

    socket.on('send-invite', invite => {
        if (invite.receiver == username) {
            socket.emit('invite-error', "Failed: You can't invite yourself.");
            return;
        }

        console.log(invite.sender + " vuole invitare " + invite.receiver + " ad una partita...");
        const i = users.findIndex(u => u.username === invite.receiver);

        if (i !== -1) {
            if (users[i].available) {
                if (!users[i].invitations) {
                    users[i]["invitations"] = [];
                    users[i].invitations.push({ invitedBy: invite.sender, code: invite.code });

                    console.log("Invito inviato.");
                    socket.emit('sent', "Invitation sent to " + invite.receiver);
                    socket.to(users[i].socketID).emit("receive-invite", { sender: invite.sender, code: invite.code });

                } else if (!users[i].invitations.some(i => i.invitedBy == invite.sender)) {
                    users[i].invitations.push({ invitedBy: invite.sender, code: invite.code });
                    console.log("Invito inviato.");
                    socket.emit('sent', "Invitation sent to " + invite.receiver);
                    socket.to(users[i].socketID).emit("receive-invite", { sender: invite.sender, code: invite.code });
                } else {
                    console.log("L'invito non è stato inviato: " + invite.sender + " ha già invitato " + invite.receiver);
                    socket.emit('invite-error', "Failed: You already invited " + invite.receiver + ".");
                }
            } else {
                console.log("L'invito non è stato inviato: " + invite.receiver + " è già impegnato in una partita.");
                socket.emit('invite-error', "Failed: " + invite.receiver + " is already playing.");
            }
        } else {
            console.log("L'invito non è stato inviato: " + invite.sender + " ha invitato un utente offline.");
            socket.emit('invite-error', "Failed: Your friend is not online.");
        }
    });

    socket.on('accepted', data => {
        const receiver = users.find(u => u.username == username);
        const inviteIndex = receiver.invitations.findIndex(i => i.code === data.inviteCode);

        if (inviteIndex !== -1) {
            const senderName = receiver.invitations[inviteIndex].invitedBy;
            const sender = users.find(u => u.username == senderName);

            if (sender.available === true) {
                console.log("Invito di " + senderName + " accettato da " + username);
                const matchIndex = makeMatch(senderName, username);
                console.log("Match creato: ", matchMaking[matchIndex], " all'indice: ", matchIndex);


                room = 'room-' + matchIndex;
                console.log("Stanza creata: " + room);
                socket.join(room);
                io.sockets.sockets.get(sender.socketID).join(room);
                socket.to(room).emit('invite-accepted', { "receiver": username, playerNum: 1, matchIndex });
                socket.to(room).emit('get-room', room);


                socket.emit('lobby-joined', { "sender": senderName, playerNum: 2, matchIndex });
                receiver.invitations.splice(inviteIndex, 1);
                receiver.available = false;
                sender.available = false;
            } else {
                socket.emit('invite-error', "Failed: Your friend is already playing.");
            }
        } else {
            socket.emit('invite-error', "Failed: Your friend disconnected.");
        }
    });

    socket.on('refused', data => {
        const receiver = users.find(u => u.username == username);
        const inviteIndex = receiver.invitations.findIndex(i => i.code === data.inviteCode);

        if (inviteIndex !== -1) {
            const senderName = receiver.invitations[inviteIndex].invitedBy;
            const sender = users.find(u => u.username == senderName);

            if (sender.available === true) {
                socket.to(sender.socketID).emit('invite-refused', username + " refused your invite.");
                receiver.invitations.splice(inviteIndex, 1);
                console.log("Invito di " + senderName + " rifiutato da " + username);
            } else {
                socket.emit('invite-error', "Failed: Your friend is already playing.");
            }
        } else {
            socket.emit('invite-error', "Failed: Your friend disconnected.");
        }
    });

    socket.on('set-room', matchRoom => {
        room = matchRoom;
    });

    socket.on('move', action => {
        if (matchMaking[action.match]) {

            socket.to(room).emit('startMoving', action);
        }
    });

    socket.on('stop', action => {
        if (matchMaking[action.match]) {

            socket.to(room).emit('stopMoving', action);
        }
    });

    socket.on('update', state => {
        if (matchMaking[state.match]) {

            if (state.name == 'survivor') {
                socket.to(room).emit('updateSurvivor', state);
            } else if (state.name == 'monster') {
                socket.to(room).emit('updateEntity', state);
            }
        }
    });

    socket.on('gameover', data => {
        if (matchMaking[data.match]) {

            const thisUser = getOtherPlayer(data.match, data.player === 1 ? 2 : 1);
            const otherPlayer = getOtherPlayer(data.match, data.player);

            console.log("Il match ", data.match, " è terminato.");
            matchMaking.splice(data.match, 1);
            thisUser.available = true;
            otherPlayer.available = true;

            socket.to(room).emit('setGameover');

            console.log("Scollego gli utenti dalla stanza: " + room + "...");
            io.socketsLeave(room);
        }
    });

    socket.on('escaped', data => {
        if (matchMaking[data.match]) {

            socket.to(room).emit('setEscaped');
        }
    });

    socket.on('disconnect', () => {
        const index = users.findIndex(u => u.socketID == socket.id);
        if (index !== -1) {
            users.splice(index, 1);
            console.log(username + " si è disconnesso.");
            users.forEach(u => {
                if (u.invitations) {
                    const jindex = u.invitations.findIndex(i => i.invitedBy == username);
                    if (jindex !== -1) {
                        u.invitations.splice(jindex, 1);
                    }
                }
            });
        }

        if (matchMaking.length > 0) {
            const index = matchMaking.findIndex(m => m.player1.username == username || m.player2.username == username);

            if (index !== -1) {
                const match = matchMaking[index];
                const otherPlayer = users.find(u => u.username == (match.player1.username == username ? match.player2.username : match.player1.username));

                console.log("Il match ", index, " è terminato a causa della disconnessione dell'utente: " + username);
                matchMaking.splice(index, 1);
                socket.to(room).emit('opponent-disconnected', username);
                console.log("Scollego gli utenti dalla stanza: " + room + "...");
                io.socketsLeave(room);
                otherPlayer.available = true;
            }
        }
    });

});

app.get('/checkUsername', (req, res) => {
    if (!users.some(u => u.username == req.query.username)) {
        users.push({ "username": req.query.username, available: true });
        return res.json({ success: true });
    } else {
        return res.json({ success: false });
    }
});

app.get('/get-invite-code', (req, res) => {
    let id = 1;

    while (inviteCodes.some(c => c === id)) {
        id++;
    }

    inviteCodes.push(id);

    return res.json({ "id": id, success: true });

});

app.put('/setPending', (req, res) => {
    const user = users.find(u => u.username == req.body.username);
    if (user && user.available === true) {
        user.available = "pending";
        console.log(user.username + " è in matchmaking...")

        setTimeout(() => {
            if (users.find(u => u.username == req.body.username) && user.available === "pending") {
                user.available = true;
                console.log(`[Timeout] Stato di ${req.body.username} riportato a disponibile.`);
            }
        }, 15000);

        return res.json({ success: true });
    } else {
        return res.json({ success: false });
    }
});

app.get('/matchmaking', pendingUsers(users), alreadyMatched(users, matchMaking), (req, res) => {
    if (req.alreadyMatched === 0) {
        const alreadyMatchedIndex = parseInt(req.alreadyMatched);
        console.log(alreadyMatchedIndex);
        const playerNum = matchMaking[alreadyMatchedIndex].player1.username == req.query.username ? 1 : 2;
        const match = {
            matchIndex: alreadyMatchedIndex,
            playerNum,
            otherPlayer: getOtherPlayer(alreadyMatchedIndex, playerNum).username
        };
        return res.json({ match, success: true });
    }

    if (req.userAvailable) {
        console.log("Lo stato di pending dell'utente è stato reimpostato, annullo il matchmaking..");
        return res.json({ available: req.userAvailable, success: false });
    }

    if (req.found) {
        console.log("Utente libero trovato, effettuo il matchmaking..");
        const thisUser = users.find(u => u.username == req.query.username);
        const otherUser = users.find(u => u.username == req.foundUser);

        if (thisUser && !otherUser) {
            thisUser.available = true;
            console.log(otherUser + " si è scollegato, annullo il matchmaking...");
            return res.json({ success: false });
        }

        const matchIndex = makeMatch(req.query.username, req.foundUser);
        console.log("Matchmaking effettuato: ", matchMaking[matchIndex]);

        const room = 'room-' + matchIndex;

        io.sockets.sockets.get(thisUser.socketID).join(room);
        io.sockets.sockets.get(otherUser.socketID).join(room);

        console.log("Stanza creata: " + room);

        io.to(room).emit('get-room', room);

        return res.json({ match: { matchIndex, playerNum: 1, otherPlayer: getOtherPlayer(matchIndex, 1).username }, success: true });
    } else {
        console.log("Non sono stati trovati utenti disponibili.");
        return res.json({ success: false });
    }
});

app.post('/character-selection', checkSelected(matchMaking), (req, res) => {
    const i = users.findIndex(u => u.username == req.body.username);
    if (i !== -1) {
        if (!req.isSelected) {
            const playerNum = parseInt(req.body.playerNum);
            const matchIndex = parseInt(req.body.match);
            if (playerNum === 1) {
                if (!matchMaking[matchIndex].player1.character) {
                    matchMaking[matchIndex].player1["character"] = req.body.character;
                } else {
                    return res.json({ message: "Hai già scelto questo personaggio!", success: false });
                }
            } else {
                if (!matchMaking[matchIndex].player2.character) {
                    matchMaking[matchIndex].player2["character"] = req.body.character;
                } else {
                    return res.json({ message: "Hai già scelto questo personaggio!", selectedFromYou: true, success: false });
                }
            }
            return res.json({ message: req.body.character + ' assegnato a ' + req.body.username, success: true });
        } else {
            return res.json({ message: "Personaggio già scelto dall'altro utente.", selectedFromYou: false, success: false });
        }
    } else {
        return res.json({ message: 'Utente non trovato', success: false });
    }
});

app.delete('/reset-username', (req, res) => {
    const index = users.findIndex(u => u.username === req.body.username);
    if (index !== -1) {
        users.splice(index, 1);
        users.forEach(u => {
            if (u.invitations) {
                const jindex = u.invitations.findIndex(i => i.invitedBy == req.body.username);
                if (jindex !== -1) {
                    u.invitations.splice(jindex, 1);
                }
            }
        });
        return res.json({ message: "Reset consentito.", success: true });
    } else {
        return res.json({ message: "Il reset non è consentito.", success: false });
    }
});

app.get('/ready', (req, res) => {
    const matchIndex = parseInt(req.query.match);
    const playerNum = parseInt(req.query.player);

    if (playerNum === 1) {
        matchMaking[matchIndex].player1["ready"] = true;

        if (!matchMaking[matchIndex].maze) {
            matchMaking[matchIndex]["maze"] = new Maze({ resolution: new Vector2(10, 10), cellSize: 80 });
            matchMaking[matchIndex]["exit"] = generateExit(matchIndex);
            matchMaking[matchIndex]["pressurePlatesPositions"] = generatePressurePlatesPositions(matchIndex);
            console.log("Labirinto creato per il match: ", matchIndex);
        }
    } else {
        matchMaking[matchIndex].player2["ready"] = true;

        setTimeout(() => {
            if (!matchMaking[matchIndex].maze) {
                matchMaking[matchIndex]["maze"] = new Maze({ resolution: new Vector2(10, 10), cellSize: 80 });
                matchMaking[matchIndex]["exit"] = generateExit(matchIndex);
                matchMaking[matchIndex]["pressurePlatesPositions"] = generatePressurePlatesPositions(matchIndex);
                console.log("Labirinto creato per il match: ", matchIndex);
            }
        }, 5000);
    }

    return res.json({ message: 'Sei pronto a giocare', success: true });
});

app.get('/start', (req, res) => {
    const matchIndex = parseInt(req.query.match);
    const playerNum = parseInt(req.query.player);

    if (!matchMaking[matchIndex]) {
        return res.json({ message: 'Il tuo avversario si è disconnesso.', disconnection: true, success: false });
    }

    if (playerNum === 1) {
        if (matchMaking[matchIndex].player2.ready) {
            console.log("Il match ", matchIndex, " sta per iniziare: ", matchMaking[matchIndex]);
            return res.json({ message: matchMaking[matchIndex].player2.username + ' è pronto a giocare', success: true });
        } else {
            return res.json({ message: matchMaking[matchIndex].player2.username + ' non è ancora pronto', success: false });
        }
    } else {
        if (matchMaking[matchIndex].player1.ready) {
            return res.json({ message: matchMaking[matchIndex].player1.username + ' è pronto a giocare', success: true });
        } else {
            return res.json({ message: matchMaking[matchIndex].player1.username + ' non è ancora pronto', success: false });
        }
    }
});

app.get('/maze', (req, res) => {
    const matchIndex = parseInt(req.query.match);
    if (matchMaking[matchIndex].maze) {
        const serializedMaze = matchMaking[matchIndex].maze.serialize();
        serializedMaze["pressurePlatesPositions"] = matchMaking[matchIndex].pressurePlatesPositions;
        serializedMaze["exit"] = matchMaking[matchIndex].exit;
        return res.json({ "maze": serializedMaze, success: true });
    } else {
        return res.status(400).json({ message: "Il labirinto non è stato generato!", success: false });
    }
});

http.listen(PORT, '0.0.0.0', () => {
    console.log("Server in ascolto alla porta: " + PORT);
});

process.on('SIGINT', disconnectAllUsers);

process.on('SIGTERM', disconnectAllUsers);

function getSocketUsername(username, socket) {
    const user = users.find(u => u.username == username);
    if (user && !user.socketID) {
        user["socketID"] = socket.id;
    }
    return username;
}

function makeMatch(player1, player2) {
    const match = {
        "player1": {
            username: player1
        },
        "player2": {
            username: player2
        }
    };

    matchMaking.push(match);
    return matchMaking.findIndex(m => m.player1.username == match.player1.username
        && m.player2.username == match.player2.username);
};

function getOtherPlayer(match, player) {
    let player1 = false;
    let player2 = false;

    if (parseInt(player) === 1) {
        player1 = true;
    } else {
        player2 = true;
    }

    if (player1) {
        return users.find(u => u.username == matchMaking[match].player2.username);
    } else {
        return users.find(u => u.username == matchMaking[match].player1.username);
    }
}

function generateExit(matchIndex) {
    console.log("Genero l'uscita per il labirinto del match: ", matchIndex);
    const maze = matchMaking[matchIndex].maze;
    const { x: cols, y: rows } = maze.resolution;
    const cellSize = maze.cellSize;
    const exitHeight = 15;

    const borderCells = maze.nodes.filter((cell, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const isBorder = (row === 0 || row === rows - 1) || (col === 0 || col === cols - 1);

        return isBorder && cell.edges.length > 0;
    });

    if (borderCells.length === 0) {
        console.log("Errore nella generazione dell'uscita: Nessuna cella percorribile trovata.");
    }

    const randomIndex = Math.floor(Math.random() * borderCells.length);
    const cell = borderCells[randomIndex];
    const pos = cell.getPositionByIndex();

    return {
        height: exitHeight,
        position: {
            x: pos.x,
            y: exitHeight / 2,
            z: pos.z
        }
    };
};

function generatePressurePlatesPositions(matchIndex) {
    console.log("Genero le pressure plates per il labirinto del match: ", matchIndex);
    const maze = matchMaking[matchIndex].maze;
    const exit = matchMaking[matchIndex].exit;
    let positions = [];
    const pressurePlatesNum = (maze.resolution.x * maze.resolution.y) < 400 ? 4 : 5;

    while (positions.length < pressurePlatesNum) {
        const cell = maze.nodes[Math.floor(Math.random() * maze.nodes.length - 1)];

        if (cell?.edges?.length > 0) {
            const cellPos = cell.getPositionByIndex();
            const sameSpawnAsOtherPlate = positions.some(pos => pos.x === cellPos.x && pos.z === cellPos.z);
            const sameSpawnAsExit = cellPos.x === exit.position.x && cellPos.z === exit.position.z;
            if (!sameSpawnAsOtherPlate && !sameSpawnAsExit) {
                positions.push(cell.getPositionByIndex());
            }
        }
    }

    positions = positions.map(pos => {
        return {
            x: pos.x,
            y: pos.y,
            z: pos.z
        }
    });

    return positions;

};

function disconnectAllUsers() {
    console.log("Server in chiusura. Scollego gli utenti...");
    io.sockets.emit('server-offline');
    setTimeout(() => {
        io.disconnectSockets();
        console.log("Utenti scollegati.");
        process.exit(0);
    }, 5000);
}