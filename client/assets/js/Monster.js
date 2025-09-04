import * as THREE from '../../libs/three/three.module.js';
import BasicCharacterController from "./BasicCharacterController.js";
import BasicCharacterControllerProxy from './BasicCharacterControllerProxy.js';
import BasicCharacterControllerInput from "./BasicCharacterControllerInput.js";
import MonsterFSM from './MonsterFSM.js';

const greenBar = document.querySelector(".green");

class MonsterControllerInput extends BasicCharacterControllerInput {

    constructor() {
        super();
        this._InitMonsterInput();
    }

    _InitMonsterInput() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };

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
        } else if (type === "space") {
            this._keys.space = true;
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
        } else if (type === "space") {
            this._keys.space = false;
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
                    this._socket.emit('move', { character: 'monster', key: 'forward', match, player });
                }
                break;
            case 65: // a
                this._keys.left = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'monster', key: 'left', match, player });
                }
                break;
            case 83: // s
                this._keys.backward = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'monster', key: 'backward', match, player });
                }
                break;
            case 68: // d
                this._keys.right = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'monster', key: 'right', match, player });
                }
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'monster', key: 'shift', match, player });
                }
                break;
            case 32: // SPACE
                this._keys.space = true;
                if (this._socket) {
                    this._socket.emit('move', { character: 'monster', key: 'space', match, player });
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
                    this._socket.emit('stop', { character: 'monster', key: 'forward', match, player });
                }
                break;
            case 65: // a
                this._keys.left = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'monster', key: 'left', match, player });
                }
                break;
            case 83: // s
                this._keys.backward = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'monster', key: 'backward', match, player });
                }
                break;
            case 68: // d
                this._keys.right = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'monster', key: 'right', match, player });
                }
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'monster', key: 'shift', match, player });
                }
                break;
            case 32: // SPACE
                this._keys.space = false;
                if (this._socket) {
                    this._socket.emit('stop', { character: 'monster', key: 'space', match, player });
                }
                break;
        }
    }

    dispose() {
        document.removeEventListener('keydown', this._onKeyDownRef, false);
        document.removeEventListener('keyup', this._onKeyUpRef, false);
    }
}

export default class Monster extends BasicCharacterController {
    constructor(params) {
        super(params);
        this.#_InitMonster();
    }

    // Monster initialization

    async #_InitMonster() {
        this._pace = 80.0;
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, this._pace);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();
        this._input = new MonsterControllerInput();
        this._stateMachine = new MonsterFSM(
            new BasicCharacterControllerProxy(this._animations));

        try {
            await super._LoadModel('./assets/models/monster/', 'Mutant.fbx');
            console.log("Modello dell'Entità caricato.");

            //this.Position = new THREE.Vector3(0, 0, 30); // Debug
            this._target.rotation.y = Math.PI;

            const audioLoadPromise = this.#_LoadSoundEffects();
            console.log("Caricamento degli effetti sonori...");

            const animationPromises = [
                super._LoadAnimation('./assets/models/monster/animations/', 'Mutant_Breathing_Idle.fbx', 'idle'),
                super._LoadAnimation('./assets/models/monster/animations/', 'Mutant_Walking.fbx', 'walk'),
                super._LoadAnimation('./assets/models/monster/animations/', 'Mutant_Run.fbx', 'run'),
                super._LoadAnimation('./assets/models/monster/animations/', 'Walking_Backwards.fbx', 'walk_backwards'),
                super._LoadAnimation('./assets/models/monster/animations/', 'Run_Backward.fbx', 'run_backwards'),
                super._LoadAnimation('./assets/models/monster/animations/', 'Mutant_Punch.fbx', 'basic_hit'),
            ];

            await Promise.all(animationPromises);
            console.log("Animazioni dell'Entità caricate.");

            await audioLoadPromise;
            console.log("Effetti sonori dell'Entità caricati.");

            this._stateMachine.SetState('idle');

            this._ready = true;

        } catch (error) {
            console.error("Errore durante il caricamento dell'Entità:", error);
        }
    }

    // Get Monster name

    get Name() {
        return 'monster';
    }

    // Set Survivor reference

    set Survivor(surv) {
        this._params["survivor"] = surv;
        this._survivor = this._params.survivor;
    }

    // Audio Setup

    #_HandleFootstepAudio() {
        const footsteps = this._params.audio.mutant_walking_footsteps;
        const runningFootsteps = this._params.audio.mutant_running_footsteps;
        const backwardFootsteps = this._params.audio.mutant_walking_backward_footsteps;
        const backwardRunningFootsteps = this._params.audio.mutant_running_backward_footsteps;
        const currentState = this._stateMachine._currentState;

        const isMovingForward = this._input._keys.forward && !this._input._keys.space;
        const isMovingBackward = this._input._keys.backward && !this._input._keys.space;
        const isWalkingState = currentState.Name === 'walk';
        const isWalkingBackwardState = currentState.Name === 'walk_backwards';
        const isRunningState = currentState.Name === 'run';
        const isRunningBackwardState = currentState.Name === 'run_backwards';

        if (isMovingForward && isWalkingState) { // Cammina
            if (!footsteps.isPlaying) {
                footsteps.setLoop(true);
                footsteps.setVolume(1.0);
                footsteps.play();
            }
        } else if (footsteps.isPlaying) {
            footsteps.stop();
        }

        if (isMovingBackward && isWalkingBackwardState) { // Cammina all'indietro
            if (!backwardFootsteps.isPlaying) {
                backwardFootsteps.setLoop(true);
                backwardFootsteps.setVolume(1.0);
                backwardFootsteps.play();
            }
        } else if (backwardFootsteps.isPlaying) {
            backwardFootsteps.stop();
        }

        if (isMovingForward && isRunningState) { // Corre
            if (!runningFootsteps.isPlaying) {
                runningFootsteps.setLoop(true);
                runningFootsteps.setVolume(2.0);
                runningFootsteps.play();
            }
        } else if (runningFootsteps.isPlaying) {
            runningFootsteps.stop();
        }

        if (isMovingBackward && isRunningBackwardState) { // Corre all'indietro
            if (!backwardRunningFootsteps.isPlaying) {
                backwardRunningFootsteps.setLoop(true);
                backwardRunningFootsteps.setVolume(2.0);
                backwardRunningFootsteps.play();
            }
        } else if (backwardRunningFootsteps.isPlaying) {
            backwardRunningFootsteps.stop();
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

        for (const [pPlate, pPlateBB] of this._params.boundingBoxes.pressurePlates.entries()) {
            if (this._collisionBox.intersectsBox(pPlateBB)) {
                return;
            }
        }

        if (this._collisionBox.intersectsBox(this._survivor.CollisionBox)) {
            console.log("Collided. this._collided: ", this._collided, ", this._params.control: ", this._params.control);
            if (!this._collided && !this._params.control) {
                this._collided = true;
                this._stateMachine.SetState('basic_hit');
                if (this._survivor.Health > 0) {
                    this._survivor.hit();
                    this._UpdateHealthBar();
                }
                console.log("Salute sopravvissuto: " + this._survivor.Health);
            } else if (!this._collided && this._params.control) {
                if (!this._collidedWithPlayer) {
                    this._collidedWithPlayer = true;
                    this._collided = true;
                    this._stateMachine.SetState('basic_hit');
                    if (this._survivor.Health > 0) {
                        this._survivor.hit();
                        this._UpdateHealthBar();
                    }
                    console.log("Salute sopravvissuto: " + this._survivor.Health);
                }
            }
        } else {
            if (this._collided) {
                this._collided = false;
            }
            if (this._collidedWithPlayer) {
                this._collidedWithPlayer = false;
            }
        }
    }

    _UpdateHealthBar() {
        console.log("Health: ", this._survivor?._health);
        if(this._survivor?._health < 10){
            greenBar.style.width = "1%";
        } else if (this._survivor?._health < 40){
            greenBar.style.width = "35%";
        } else if (this._survivor?._health < 70) {
            greenBar.style.width = "75%";
        }
    }

    async #_LoadSoundEffects() {
        super._SetSoundEffectsBase();

        this._params["audio"] = {};

        const mp3s = ["mutant_walking_footsteps", "mutant_running_footsteps", "mutant_walking_backward_footsteps",
            "mutant_running_backward_footsteps"];

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
                this._audioLoader.load("./assets/audio/monster/" + name + ".mp3", (buffer) => {
                    sound.setBuffer(buffer);
                    this._params.audio[name] = sound;

                    if (this._target) {
                        this._target.add(sound);
                    } else {
                        console.log('Modello del Mostro non disponibile per attaccare il suono: ', sound);
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

    // Audio and Animations Update

    Update(timeInSeconds) {
        if (!this._ready || !this._survivor || !this._survivor.Ready) {
            return;
        }
        super.Update(timeInSeconds);
        this.#_HandleFootstepAudio();
        this.#_CheckCollisions();
    }

    // Destroy model

    destroy() {
        this._input.dispose();
        console.log("Monster: Rimossi gli event listener.");
    }
};