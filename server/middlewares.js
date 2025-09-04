export function pendingUsers(users) {
    return (req, res, next) => {
        req.found = false;
        const user = req.query.username;
        if (users.length > 1) { // Esistono almeno 2 utenti collegati
            const thisUser = users.find(u => u.username == user);
            if (thisUser.available != "pending") {
                return next();
            }
            const foundUser = users.find(u => u.username != user && u.available == "pending");
            if (foundUser) {
                thisUser.available = false;
                foundUser.available = false;
                req.found = true;
                req.foundUser = foundUser.username;
            }
        } else {
            console.log("Al momento " + user + " è l'unico utente online.");
        }

        next();
    };
};

export function alreadyMatched(users, matchMaking) {
    return (req, res, next) => {
        const thisUser = users.find(u => u.username == req.query.username);
        console.log("Utente che ha richiesto il matchmaking: ", thisUser);
        const alreadyMatchedIndex = matchMaking.findIndex(m => m.player1.username == req.query.username
            || m.player2.username == req.query.username);

        if (thisUser.available === true || alreadyMatchedIndex !== -1) {
            if (alreadyMatchedIndex !== -1) {
                console.log("L'avversario è già in partita!");
                req.alreadyMatched = alreadyMatchedIndex;
            } else {
                console.log("Lo stato di pending dell'utente è stato reimpostato, annullo il matchmaking..");
                req.userAvailable = thisUser.available;
            }
        }

        next();
    }
}

export function checkSelected(matchMaking) {
    return (req, res, next) => {
        req.isSelected = false;
        const playerNum = parseInt(req.body.playerNum);
        const matchIndex = parseInt(req.body.match);
        if (matchMaking && matchMaking.length > 0 && playerNum && matchIndex !== null) {
            const player1 = matchMaking[matchIndex].player1;
            const player2 = matchMaking[matchIndex].player2;
            if (playerNum === 1) {
                if (player2.character == req.body.character) {
                    req.isSelected = true;
                    console.log("Il personaggio è già stato selezionato.");
                }
            } else {
                if (player1.character == req.body.character) {
                    req.isSelected = true;
                    console.log("Il personaggio è già stato selezionato.");
                }
            }
        } else if (!matchMaking) {
            console.log("Attenzione! Il database 'matchMaking' non è stato definito.");
        } else if (!playerNum) {
            console.log("Attenzione! Non è stata fornito il numero del giocatore.");
        } else if (!matchIndex) {
            console.log("Attenzione! Non è stata fornita la partita.");
        }
        next();
    }
};