import * as THREE from '../../libs/three/three.module.js';
import BasicCharacterController from "./BasicCharacterController.js";
import BasicCharacterControllerProxy from './BasicCharacterControllerProxy.js';
import BasicCharacterControllerInput from "./BasicCharacterControllerInput.js";
import SurvivorFSM from './SurvivorFSM.js';

class SurvivorControllerInput extends BasicCharacterControllerInput {
    constructor() {
        super();
        this._InitSurvInput();
    }

    _InitSurvInput() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            ctrl: false,
            shift: false,
        };

        this._ctrlPressed = false;

        this._onKeyDownRef = e => this._onKeyDown(e);
        this._onKeyUpRef = e => this._onKeyUp(e);

        document.addEventListener('keydown', this._onKeyDownRef, false);
        document.addEventListener('keyup', this._onKeyUpRef, false);
    }

    set ActiveKey(type) {
        if (type === "forward") {
            this._keys.forward = true;
        } else if (type === "backward") {
            this._keys.backward = true;
        } else if (type === "left") {
            this._keys.left = true;
        } else if (type === "right") {
            this._keys.right = true;
        } else if (type === "ctrl") {
            this._keys.ctrl = true;
        } else if (type === "shift") {
            this._keys.shift = true;
        }
    }

    set DeactiveKey(type) {
        if (type === "forward") {
            this._keys.forward = false;
        } else if (type === "backward") {
            this._keys.backward = false;
        } else if (type === "left") {
            this._keys.left = false;
        } else if (type === "right") {
            this._keys.right = false;
        } else if (type === "ctrl") {
            this._keys.ctrl = false;
        } else if (type === "shift") {
            this._keys.shift = false;
        }
    }

    _onKeyDown(event) {
        event.preventDefault();
        let match = undefined;
        let player = undefined;
        if (this._sockObj && this._sockObj.matchIndex && this._sockObj.playerNum) {
            match = this._sockObj.matchIndex;
            player = this._sockObj.playerNum;
        }

        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'survivor', key: 'forward', match, player });
                }
                break;
            case 65: // a
                this._keys.left = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'survivor', key: 'left', match, player });
                }
                break;
            case 83: // s
                this._keys.backward = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'survivor', key: 'backward', match, player });
                }
                break;
            case 68: // d
                this._keys.right = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'survivor', key: 'right', match, player });
                }
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'survivor', key: 'shift', match, player });
                }
                break;
            case 17: // CTRL
                if (!this._ctrlPressed) {
                    this._keys.ctrl = !this._keys.ctrl;
                    this._ctrlPressed = true;
                    if (this._socket) {
                        this._socket.emit('move', { character: 'survivor', key: 'ctrl', match, player });
                    }
                }
                break;
        }
    }

    _onKeyUp(event) {
        event.preventDefault();
        let match = undefined;
        let player = undefined;
        if (this._sockObj && this._sockObj.matchIndex && this._sockObj.playerNum) {
            match = this._sockObj.matchIndex;
            player = this._sockObj.playerNum;
        }

        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'survivor', key: 'forward', match, player });
                }
                break;
            case 65: // a
                this._keys.left = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'survivor', key: 'left', match, player });
                }
                break;
            case 83: // s
                this._keys.backward = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'survivor', key: 'backward', match, player });
                }
                break;
            case 68: // d
                this._keys.right = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'survivor', key: 'right', match, player });
                }
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'survivor', key: 'shift', match, player });
                }
                break;
            case 17: // CTRL
                if (this._ctrlPressed) {
                    this._ctrlPressed = false;
                    if (this._socket) {
                        this._socket.emit('stop', { character: 'survivor', key: 'ctrl', match, player });
                    }
                }
                break;
        }
    }

    dispose() {
        document.removeEventListener("keydown", this._onKeyDownRef, false);
        document.removeEventListener("keyup", this._onKeyUpRef, false);
    }
}

export default class Survivor extends BasicCharacterController {
    constructor(params) {
        super(params);
        this.#_InitSurv();
    }

    async #_InitSurv() {
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 100.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();
        this._input = new SurvivorControllerInput();
        this._stateMachine = new SurvivorFSM(
            new BasicCharacterControllerProxy(this._animations));

        this._firstCrouchedSteps = false;
        this._firstBackwardSteps = false;

        this._health = 100;
        this._canExit = false;
        this._activatedPlates = 0;

        try {
            await super._LoadModel('./assets/models/survivor/', 'Ch42_nonPBR.fbx');
            console.log("Modello del Sopravvissuto caricato.");

            const audioLoadPromise = this.#_LoadSoundEffects();
            console.log("Caricamento degli effetti sonori...");

            const animationPromises = [
                super._LoadAnimation('./assets/models/survivor/animations/', 'Nervously_Look_Around.fbx', 'idle'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Crouched_Walking_basic.fbx', 'walk'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Running.fbx', 'run'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Standing_To_Crouched.fbx', 'crouch'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Crouched_Walking_ctrl.fbx', 'walk_ctrl'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Crouching_Idle.fbx', 'crouch_idle'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Walk_Backwards.fbx', 'walk_backwards'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Running_Backward.fbx', 'run_backwards'),
                super._LoadAnimation('./assets/models/survivor/animations/', 'Walk_Backwards_ctrl.fbx', 'walk_backwards_ctrl')
            ];

            await Promise.all(animationPromises);
            console.log("Animazioni del Sopravvissuto caricate.");

            await audioLoadPromise;
            console.log("Effetti sonori del Sopravvissuto caricati.");

            this._stateMachine.SetState('idle');

            this._ready = true;

        } catch (error) {
            console.error("Errore durante il caricamento del personaggio:", error);
        }
    }

    // Get Survivor name

    get Name() {
        return 'survivor';
    }

    // Set Entity reference

    set Monster(monster) {
        this._params["monster"] = monster;
        this._monster = this._params.monster;
    }

    // Get health

    get Health() {
        return this._health;
    }

    // Getting hit

    hit() {
        if (Math.floor(this._health - 33) === 1) {
            this._health = 0;
        } else {
            this._health -= 33;
        }
    }

    // Get if the survivor can exit the maze

    get canExit() {
        return this._canExit;
    }

    // Update events

    Update(timeInSeconds) {
        if (!this._ready || !this._monster || !this._monster.Ready) {
            return;
        }
        super.Update(timeInSeconds);
        this.#_HandleFootstepAudio();
        this.#_CheckCollisions();
    }

    #_HandleFootstepAudio() {
        const footsteps = this._params.audio.footsteps;
        const runningFootsteps = this._params.audio.running_footsteps;
        const crouchedFootstepsStart = this._params.audio.crouched_footsteps_start;
        const crouchedFootstepsLoop = this._params.audio.crouched_footsteps_loop;
        const backwardFootstepsStart = this._params.audio.backward_footsteps_start;
        const backwardFootstepsLoop = this._params.audio.backward_footsteps_loop;
        const backwardRunningFootsteps = this._params.audio.backward_running_footsteps;
        const backwardCrouchedFootsteps = this._params.audio.backward_crouched_footsteps;
        const currentState = this._stateMachine._currentState;

        const isMovingForward = this._input._keys.forward && !this._input._keys.ctrl;
        const isMovingBackward = this._input._keys.backward && !this._input._keys.ctrl;
        const isMovingCrouchedForward = this._input._keys.forward && this._input._keys.ctrl;
        const isMovingCrouchedBackward = this._input._keys.backward && this._input._keys.ctrl;
        const isWalkingState = currentState.Name === 'walk';
        const isWalkingBackwardState = currentState.Name === 'walk_backwards';
        const isWalkingCrouchedState = currentState.Name === 'walk_ctrl';
        const isRunningState = currentState.Name === 'run';
        const isRunningBackwardState = currentState.Name === 'run_backwards';
        const isWalkingCrouchedBackwardState = currentState.Name === 'walk_backwards_ctrl';

        if (isMovingForward && isWalkingState) { // Cammina
            if (!footsteps.isPlaying) {
                footsteps.setLoop(true);
                footsteps.setVolume(1.5);
                footsteps.play();
            }
        } else if (footsteps.isPlaying) {
            footsteps.stop();
        }

        if (isMovingBackward && isWalkingBackwardState) { // Cammina all'indietro
            if (!backwardFootstepsStart.isPlaying && !this._firstBackwardSteps) {
                backwardFootstepsStart.setLoop(false);
                backwardFootstepsStart.setVolume(1.5);
                backwardFootstepsStart.play();
                this._firstBackwardSteps = true;
            } else if (!backwardFootstepsStart.isPlaying && this._firstBackwardSteps) {
                if (!backwardFootstepsLoop.isPlaying) {
                    backwardFootstepsLoop.setLoop(true);
                    backwardFootstepsLoop.setVolume(1.5);
                    backwardFootstepsLoop.play();
                }
            }
        } else if (backwardFootstepsStart.isPlaying) {
            backwardFootstepsStart.stop();
        } else if (backwardFootstepsLoop.isPlaying) {
            backwardFootstepsLoop.stop();
            this._firstBackwardSteps = false;
        }

        if ((isMovingForward || isMovingCrouchedForward) && isRunningState) { // Corre
            if (!runningFootsteps.isPlaying) {
                runningFootsteps.setLoop(true);
                runningFootsteps.setVolume(4.0);
                runningFootsteps.play();
            }
        } else if (runningFootsteps.isPlaying) {
            runningFootsteps.stop();
        }

        if ((isMovingBackward || isMovingCrouchedBackward) && isRunningBackwardState) { // Corre all'indietro
            if (!backwardRunningFootsteps.isPlaying) {
                backwardRunningFootsteps.setLoop(true);
                backwardRunningFootsteps.setVolume(4.0);
                backwardRunningFootsteps.play();
            }
        } else if (backwardRunningFootsteps.isPlaying) {
            backwardRunningFootsteps.stop();
        }

        if (isMovingCrouchedForward && isWalkingCrouchedState) { // Cammina abbassato
            if (!crouchedFootstepsStart.isPlaying && !this._firstCrouchedSteps) {
                crouchedFootstepsStart.setLoop(false);
                crouchedFootstepsStart.setVolume(0.5);
                crouchedFootstepsStart.play();
                this._firstCrouchedSteps = true;
            } else if (!crouchedFootstepsStart.isPlaying && this._firstCrouchedSteps) {
                if (!crouchedFootstepsLoop.isPlaying) {
                    crouchedFootstepsLoop.setLoop(true);
                    crouchedFootstepsLoop.setVolume(0.5);
                    crouchedFootstepsLoop.play();
                }
            }
        } else if (crouchedFootstepsStart.isPlaying) {
            crouchedFootstepsStart.stop();
        } else if (crouchedFootstepsLoop.isPlaying) {
            crouchedFootstepsLoop.stop();
            this._firstCrouchedSteps = false;
        }

        if (isMovingCrouchedBackward && isWalkingCrouchedBackwardState) { // Cammina abbassato all'indietro
            if (!backwardCrouchedFootsteps.isPlaying) {
                backwardCrouchedFootsteps.setLoop(true);
                backwardCrouchedFootsteps.setVolume(0.5);
                backwardCrouchedFootsteps.play();
            }
        } else if (backwardCrouchedFootsteps.isPlaying) {
            backwardCrouchedFootsteps.stop();
        }
    }

    clearAudio() {
        Object.values(this._params.audio).forEach(value => {
            if (value.isPlaying) {
                value.stop();
            }
        });
    }

    #_CheckCollisions() {
        if (!this._collisionEnabled) {
            return;
        }

        if (this._collisionBox.intersectsBox(this._monster.CollisionBox)) {
            if (this._params.control) {
                if (!this._collidedWithPlayer) {
                    this._collidedWithPlayer = true;
                }
            }
        } else {
            if (this._collidedWithPlayer) {
                this._collidedWithPlayer = false;
            }
        }

        if (this._collidedWithExit && this._activatedPlates >= 3) {
            this._canExit = true;
        } else if (this._activatedPlates < 3) {
            this._collidedWithExit = false;
        }

        for (const [pPlate, pPlateBB] of this._params.boundingBoxes.pressurePlates.entries()) {
            if (this._collisionBox.intersectsBox(pPlateBB) && !pPlate.userData.activated) {
                this.#_HandlePressurePlate(pPlate, pPlateBB);
                this._activatedPlates++;
                this._monster._pace += 5.0;
                if(!this._params.control){
                    this._monster._acceleration = new THREE.Vector3(1, 0.25, this._monster._pace);
                    console.log("Aumentata la velocità dell'entità.");
                }
                console.log("Pedana attivata!");
            }
        }
    }

    #_HandlePressurePlate(pPlate, pPlateBB) {
        pPlate.userData.activated = true;
        pPlate.scale.y = 0.2;
        pPlate.position.y = 0.2;
        pPlateBB.setFromObject(pPlate);
        this._params.boundingBoxes.pressurePlates.set(pPlate, pPlateBB);
    }

    async #_LoadSoundEffects() {
        super._SetSoundEffectsBase();

        this._params["audio"] = {};

        const mp3s = ["footsteps", "running_footsteps", "crouched_footsteps_start", "crouched_footsteps_loop", "backward_footsteps_start",
            "backward_footsteps_loop", "backward_running_footsteps", "backward_crouched_footsteps"];

        const audioPromises = [];

        mp3s.forEach((name) => {
            const sound = new THREE.PositionalAudio(this._audioListener);
            sound.name = name;
            this._sounds.push(sound);

            // Parametri di attenuazione
            sound.setDistanceModel('linear');
            sound.setMaxDistance(50);
            sound.setRefDistance(5);
            sound.setRolloffFactor(1);

            const promise = new Promise((resolve, reject) => {
                this._audioLoader.load("./assets/audio/survivor/" + name + ".mp3", (buffer) => {
                    sound.setBuffer(buffer);
                    this._params.audio[name] = sound;

                    if (this._target) {
                        this._target.add(sound);
                    } else {
                        console.log('Modello del Sopravvissuto non disponibile per attaccare il suono: ', sound);
                    }

                    resolve();
                });
            }, undefined, (error) => {
                console.error("Errore caricamento audio" + name + ":", error);
                reject(error);
            });
            audioPromises.push(promise);
        });
        await Promise.all(audioPromises);
    }

    // Destroy model

    destroy() {
        this._input.dispose();
        console.log("Survivor: Rimossi gli event listener.");
    }
};