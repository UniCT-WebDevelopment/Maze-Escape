# Web Programming Project

---

## English

The project presented here is a *3D Web Survival Horror Multiplayer Videogame* developed with the help of **Three.js**, an open-source JavaScript library used to create and display 3D graphics in a web browser.

### Maze Escape - Concept

**Maze Escape** pits two players against each other in a **maze**: one player controls a **survivor**, while the other controls an **entity** that roams the map and hunts them. The maze contains **pressure plates**, of which only three must be stepped on by the survivor to make the **exit portal** appear. If the survivor manages to find the portal and escape, they are awarded the victory. If, on the other hand, the survivor is touched exactly three times by the entity, the game ends with the entity's victory.

### Project Structure

Within the **client/** directory, in addition to the **index.html** file, we have important folders for managing the *frontend*, such as:

* The **assets/** folder, which contains the files that define the game structure and the files necessary for managing graphics and audio.
* The **libs/** folder, which contains the **three/** folder, which holds some modules of the *three.js* library in order to eliminate dependencies on external online resources.

Within the **server/** directory, we find all the files useful for managing the *backend*. As can be seen, *Maze.js*, *Graph.js*, and *Edge.js* are also present on the server-side; this is because some operations need to be shared between clients (such as maze generation, to ensure that both players see the same map).
The *backend* logic uses the **Express.js API** to handle HTTP requests, while it uses the **Socket.io API** to manage real-time events and provide feedback to users.

**P.S.:** To ensure **modularity** and **code reuse**, on both the *server-side* and the *client-side*, the application features several .js files, each with a specific responsibility.

### How to use the application

Once you have accessed the main screen, you will be presented with:

* a parchment containing the game rules;
* a menu to set your username and to play, either **online via matchmaking** or **with a friend via invite**.

In the bottom right corner, a **console** will be present to inform the user of the actions they have performed, any waiting periods, or invitations from other users to a game session.

1. To perform any operation, you must be logged in.
2. Once logged in, and after a friend has accepted the invite or a user has been found online via matchmaking, you will go to the character selection screen: *survivor* or *entity*.
3. Once both users have chosen their characters and both have clicked "Ready," the game will begin, and once all models have been loaded, the game screen will be displayed.
4. At the end of the game, marked by the victory of one of the two players, you just need to click the "Back to main menu" button to return to the main screen.

---

## Italian

Il progetto qui presentato tratta di un *Videogioco Web 3D Survival Horror Multiplayer* sviluppato tramite l'ausilio di **Three.js**, una libreria JavaScript open-source utile per creare e visualizzare grafica 3D nel browser web.

### Fuga dal labirinto - Concept

**Maze Escape** mette due giocatori uno contro l'altro in un **labirinto**: un giocatore controlla un **sopravvissuto**, mentre un altro giocatore controlla l'**entità** che si aggira per la mappa e che gli da la caccia. Il *labirinto* contiene delle **pedane**, di cui solo tre andranno schiacciate dal sopravvissuto per permettere al **portale di uscita** di comparire. Se il sopravvissuto riesce a trovare il portale e ad uscire, gli verrà assegnata la vittoria. Se, invece, il sopravvissuto viene toccato esattamente tre volte dall'entità, la partita finisce con la vittoria di quest'ultima.

### Struttura del progetto

All'interno del **client/**, oltre a trovare l'**index.html**, abbiamo delle cartelle importanti per la gestione del *frontend*, come:

* La cartella **assets/**, dove troviamo i file che definiscono la struttura del gioco e i file necessari per la gestione della grafica e dell'audio.
* La cartella **libs/** che al suo interno contiene la cartella **three/**, la quale contiene alcuni moduli della libreria *three.js* in modo tale da eliminare le dipendenze da risorse esterne online.

All'interno del **server/** troviamo invece tutti i file utili alla gestione del *backend*. Come è possibile notare, anche lato server sono presenti *Maze.js*, *Graph.js*, *Edge.js*; questo perchè alcune operazioni hanno la necessità di essere condivise fra i client (come ad esempio la generazione del labirinto, per garantire che entrambi i giocatori visualizzino la stessa mappa).
La logica *backend* sfrutta l' **API** di **Express.js** per gestire le richieste HTTP, mentre per gestire gli eventi in tempo reale e fornire feedback agli utenti utilizza l' **API** di **Socket.io**.

**P.S.:** Per garantire la **modularità** ed il **riuso** del codice, sia *lato server* che *lato client*, l'applicazione presenta diversi file .js, ognuno con una specifica responsabilità.

### Come usare l'applicativo

Una volta che si è acceduti alla schermata principale, avremo davanti:

* una pergamena che contiene le regole di gioco;
* il menu per impostare il proprio username e per giocare, **online tramite matchmaking** o **con un amico tramite invito**.

In basso a destra sarà presente una **console** che informerà l'utente delle azioni che ha effettuato, di eventuali attese o di inviti da parte di altri utenti ad una sessione di gioco.

1. Per effettuare qualsiasi operazione, è necessario aver effettuato il login.
2. Effettuato l'accesso, una volta che l'amico ha accettato l'invito o che è stato trovato un utente online tramite matchmaking, si andrà alla schermata di selezione del personaggio: *sopravvissuto* o *entità*.
3. Una volta che entrambi gli utenti avranno scelto i propri personaggi ed entrambi avranno cliccato su "Pronto", la partita avrà inizio e, una volta caricati tutti i modelli, si passerà alla schermata di gioco.
4. Al termine della partita, segnata dalla vittoria di uno dei due giocatori, basterà cliccare sul pulsante "Back to main menu" per ritornare alla schermata principale.
