import * as THREE from '../../libs/three/three.module.js';
import { FBXLoader } from '../../libs/three/FBXLoader.js';

export default class BasicCharacterController {
    constructor(params) {
        if (new.target === BasicCharacterController) {
            throw new TypeError("Non puoi instanziare direttamente BasicCharacterController");
        }
        this._Init(params);
    }

    _Init(params) {
        this._params = params;
        this._decceleration = undefined;
        this._acceleration = undefined;
        this._velocity = undefined;
        this._position = undefined;
        this._spawn = undefined;

        this._animations = {};

        this._input = undefined;
        this._stateMachine = undefined;

        this._ready = false;
        this._isOnGround = true;
        this._collisionEnabled = false;
        setTimeout(() => {
            this._collisionEnabled = true;
        }, 10 * 1000);
        this._collided = false;
        this._collidedWithPlayer = false;
        this._collidedWithExit = false;

        this._capsuleRadius = this._params.capsuleRadius;
        this._capsuleHeight = this._params.capsuleHeight;


        const capsuleGeometry = new THREE.CylinderGeometry(this._capsuleRadius, this._capsuleRadius, this._capsuleHeight, 16);
        const sphereTopGeometry = new THREE.SphereGeometry(this._capsuleRadius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const sphereBottomGeometry = new THREE.SphereGeometry(this._capsuleRadius, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

        sphereTopGeometry.translate(0, this._capsuleHeight / 2, 0);
        sphereBottomGeometry.translate(0, -this._capsuleHeight / 2, 0);

        let capsuleMaterial = undefined;

        if (this._params.debug) {
            capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.5 });
        } else {
            capsuleMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
        }

        this._capsuleHelper = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
        const sphereTopMesh = new THREE.Mesh(sphereTopGeometry, capsuleMaterial);
        const sphereBottomMesh = new THREE.Mesh(sphereBottomGeometry, capsuleMaterial);

        this._capsuleHelper.add(sphereTopMesh);
        this._capsuleHelper.add(sphereBottomMesh);

        this._collisionBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        this._collisionBox.setFromObject(this._capsuleHelper);

        this._params.scene.add(this._capsuleHelper);

        this._floorBB = this._params.boundingBoxes.floor;
        this._wallsBBs = this._params.boundingBoxes.walls;
        this._exitBB = this._params.boundingBoxes.exit;
    }

    get Position() {
        if (this._position) {
            return this._position;
        }
    }

    set Position(pos) {
        if (!this._position) {
            this._position = new THREE.Vector3();
        }

        this._position.copy(pos);

        if (this._target) {
            this._target.position.copy(pos);
        } else {
            this._spawn = pos.clone();
        }
    }

    get Rotation() {
        if (!this._target) {
            return new THREE.Quaternion();
        }
        return this._target.quaternion;
    }

    set Rotation(rot) {
        if (this._target) {
            this._target.quaternion.copy(rot);
        }
    }

    get CollisionBox() {
        if (this._collisionBox) {
            return this._collisionBox;
        } else {
            return undefined;
        }
    }

    get Ready() {
        return this._ready;
    }

    get CurrentState() {
        if (this._stateMachine && this._stateMachine._currentState) {
            return this._stateMachine._currentState.Name;
        }
    }

    set CurrentState(cs) {
        if (this._stateMachine) {
            this._stateMachine.SetState(cs);
        }
    }

    get Keys() {
        if (this._input) {
            return this._input._keys;
        }
    }

    set ActiveKey(type) {
        if (this._input) {
            this._input.ActiveKey = type;
        }
    }

    set DeactiveKey(type) {
        if (this._input) {
            this._input.DeactiveKey = type;
        }
    }

    set SockObj(sockObj) {
        if(this._input){
            this._sockObj = sockObj;
            this._input._SetSockObj(this._sockObj);
        }
    }

    set Socket(socket) {
        if (this._input) {
            this._socket = socket;
            this._input._SetSocket(this._socket);
        }
    }

    set BoundingBoxes(bbs) {
        if (this._params.boundingBoxes) {
            this._params.boundingBoxes = bbs;
        } else {
            this._params["boundingBoxes"] = bbs;
        }
        this._floorBB = this._params.boundingBoxes.floor;
        this._wallsBBs = this._params.boundingBoxes.walls;
        this._exitBB = this._params.boundingBoxes.exit;
    }

    _LoadModel(path, model) {
        return new Promise((resolve, reject) => {
            const modelLoader = new FBXLoader();
            modelLoader.setPath(path);
            modelLoader.load(model, (fbx) => {
                fbx.scale.setScalar(0.1);
                fbx.traverse(c => {
                    c.castShadow = true;
                });

                this._target = fbx;

                if (this._spawn) {
                    this.Position = this._spawn;
                }

                this._params.scene.add(this._target);

                this._mixer = new THREE.AnimationMixer(this._target);

                if (!this._manager) {
                    this._manager = new THREE.LoadingManager();
                }

                this._OnLoad = (animName, anim) => {
                    const clip = anim.animations[0];
                    const action = this._mixer.clipAction(clip);

                    this._animations[animName] = {
                        clip: clip,
                        action: action,
                    };
                };

                this._animationLoader = new FBXLoader(this._manager);
                resolve();
            }, undefined, (error) => {
                console.error('Errore caricamento animazione ' + animName + ':', error);
                reject(error);
            });
        });
    }

    _LoadAnimation(path, animation, animName) {
        return new Promise((resolve, reject) => {
            if (!this._animationLoader) {
                reject(new Error("animationLoader non è ancora inizializzato."));
                return;
            }
            this._animationLoader.setPath(path);
            this._animationLoader.load(animation, (a) => {
                this._OnLoad(animName, a);
            });
            resolve();
        }, undefined, (error) => {
            console.error(`Errore caricamento animazione ${animName}:`, error);
            reject(error);
        });
    }

    Update(timeInSeconds) {
        if (!this._target || !this._ready) {
            return;
        }

        if (!this._params.control) {
            const controlObject = this._target;
            if (this._mixer) {
                this._mixer.update(timeInSeconds);
            }

            if (this._capsuleHelper) {
                this._capsuleHelper.position.copy(controlObject.position);
                this._capsuleHelper.position.y += this._capsuleHeight / 2 + this._capsuleRadius;

                if (this._collisionBox) {
                    this._collisionBox.setFromObject(this._capsuleHelper);
                }
            }
            return;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
            Math.abs(frameDecceleration.z), Math.abs(velocity.z));

        velocity.add(frameDecceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();
        if (this._input._keys.shift) {
            acc.multiplyScalar(4.0);
        }

        if (this._stateMachine._currentState && this._stateMachine._currentState.Name == 'crouch') {
            acc.multiplyScalar(0.0);
        }

        if (this._isOnGround) {
            if (this._input._keys.forward) {
                if (!this._collided) {
                    velocity.z += acc.z * timeInSeconds;
                }
            }
            if (this._input._keys.backward) {
                if (!this._collided) {
                    velocity.z -= acc.z * timeInSeconds;
                }
            }
            if (this._input._keys.left) {
                _A.set(0, 1, 0);
                _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
                _R.multiply(_Q);
            }
            if (this._input._keys.right) {
                _A.set(0, 1, 0);
                _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
                _R.multiply(_Q);
            }
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        const nextPosition = new THREE.Vector3();
        nextPosition.copy(oldPosition);
        nextPosition.add(forward);
        nextPosition.add(sideways);

        this._HandleEnvironmentCollisions(nextPosition, timeInSeconds);

        nextPosition.y += this._velocity.y * timeInSeconds;

        controlObject.position.copy(nextPosition);

        this._position.copy(controlObject.position);

        if (this._capsuleHelper) {
            this._capsuleHelper.position.copy(controlObject.position);
            this._capsuleHelper.position.y += this._capsuleHeight / 2 + this._capsuleRadius;
            if (this._collisionBox) {
                this._collisionBox.setFromObject(this._capsuleHelper);
            }
        }

        if (this._mixer) {
            this._mixer.update(timeInSeconds);
        }
    }

    _HandleEnvironmentCollisions(nextPosition, timeInSeconds) {
        const capsuleCenterY = nextPosition.y + this._capsuleHeight / 2 + this._capsuleRadius;
        const capsuleCenterX = nextPosition.x;
        const capsuleCenterZ = nextPosition.z;

        // Floor collision

        const planeMinX = this._floorBB.min.x;
        const planeMaxX = this._floorBB.max.x;
        const planeMinZ = this._floorBB.min.z;
        const planeMaxZ = this._floorBB.max.z;
        const groundLevelY = this._floorBB.max.y;

        const isOutsideX = (capsuleCenterX + this._capsuleRadius < planeMinX) || (capsuleCenterX - this._capsuleRadius > planeMaxX);
        const isOutsideZ = (capsuleCenterZ + this._capsuleRadius < planeMinZ) || (capsuleCenterZ - this._capsuleRadius > planeMaxZ);

        if (isOutsideX || isOutsideZ) {
            this._velocity.y -= 9.8 * timeInSeconds;
            this._isOnGround = false;
        } else {
            const capsuleBaseY = nextPosition.y;

            if (capsuleBaseY < groundLevelY + 0.05 && this._velocity.y < 0) {
                nextPosition.y = groundLevelY;
                this._velocity.y = 0;
                this._isOnGround = true;
            } else {
                this._velocity.y -= 9.8 * timeInSeconds;
                this._isOnGround = false;
            }
        }

        // Walls collision

        this._collided = false;

        if (!this._wallsBBs) {
            return;
        }

        const capsuleHelperBB = new THREE.Box3().copy(this._collisionBox);
        const offset = new THREE.Vector3(
            nextPosition.x - this._position.x,
            nextPosition.y - this._position.y,
            nextPosition.z - this._position.z
        );
        capsuleHelperBB.translate(offset);

        this._wallsBBs.forEach(wallBB => {
            if (capsuleHelperBB.intersectsBox(wallBB)) {
                this._collided = true;

                const closestPoint = new THREE.Vector3();
                wallBB.clampPoint(this._position, closestPoint);

                const pushDir = new THREE.Vector3().subVectors(this._position, closestPoint);
                pushDir.y = 0;
                pushDir.normalize();

                const push = pushDir.multiplyScalar(1);
                this._position.add(push);
                nextPosition.copy(this._position);
            }
        });

        // Collisions among players

        if (this._collidedWithPlayer) {

            const otherPlayer = this._survivor ? this._survivor : this._monster

            const closestPoint = new THREE.Vector3();
            otherPlayer.CollisionBox.clampPoint(this._position, closestPoint);

            const pushDir = new THREE.Vector3().subVectors(this._position, closestPoint);
            pushDir.y = 0;
            pushDir.normalize();

            const push = pushDir.multiplyScalar(5);

            this._position.add(push);
            nextPosition.copy(this._position);
        }

        // Exit collision

        if (!this._exitBB) {
            return;
        }

        if (capsuleHelperBB.intersectsBox(this._exitBB)) {
            this._collidedWithExit = true;

            const closestPoint = new THREE.Vector3();
            this._exitBB.clampPoint(this._position, closestPoint);

            const pushDir = new THREE.Vector3().subVectors(this._position, closestPoint);
            pushDir.y = 0;
            pushDir.normalize();

            const push = pushDir.multiplyScalar(1);
            this._position.add(push);
            nextPosition.copy(this._position);
        }

    };

    _SetSoundEffectsBase() {
        this._sounds = [];
        this._audioLoader = new THREE.AudioLoader(this._manager);
        this._audioListener = new THREE.AudioListener();
        this._params.camera.add(this._audioListener);
    }

};