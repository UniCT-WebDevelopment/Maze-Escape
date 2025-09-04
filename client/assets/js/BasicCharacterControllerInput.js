export default class BasicCharacterControllerInput {
    constructor() {
        if (new.target === BasicCharacterControllerInput) {
            throw new TypeError("Non puoi instanziare direttamente BasicCharacterControllerInput");
        }
        this._gameScreen = document.querySelector(".gameScreen");
        this._Init();
    }

    _Init() {

        this._lockedMouse = false;

        document.addEventListener('pointerlockchange', () => this._onPointerlockChange(), false);

        this._gameScreen.addEventListener('click', () => {
            if (!this._lockedMouse) {
                this._gameScreen.requestPointerLock();
            }
        }, false);
    }

    _onPointerlockChange() {
        if (document.pointerLockElement === document.body) {
            this._lockedMouse = true;
        } else {
            this._lockedMouse = false;
        }
    }

    get LockedMouse() {
        return this._lockedMouse;
    }

    _onKeyDown(event) { }

    _onKeyUp(event) { }

    _SetSocket(socket) {
        this._socket = socket;
        console.log("Riferimento al socket impostato.");
    }

    _SetSockObj(sockObj){
        this._sockObj = sockObj;
        console.log("Riferimento all'oggetto Socket impostato.");
    }

};