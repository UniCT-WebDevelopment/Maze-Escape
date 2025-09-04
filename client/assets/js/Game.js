import * as THREE from '../../libs/three/three.module.js';
import { RoundedBoxGeometry } from '../../libs/three/RoundedBoxGeometry.js';
import ThirdPersonCamera from './ThirdPersonCamera.js';
import Survivor from './Survivor.js';
import Monster from './Monster.js';
import Maze, { Cell } from './Maze.js';

const SERVER = 'http://' + window.location.hostname + ':' + window.location.port;
let debug = false;

const lifeBar = document.querySelector(".lifeBar");
const win = document.querySelector(".win");
const lost = document.querySelector(".lost");

export default class MazeEscape {
    constructor(params) {
        this._gameOver = false;
        this._survivorEscaped = false;
        this._previousRAF = null;
        this._mixers = [];
        this._pressedPlates = 0;
        document.querySelector(".pressurePlates").textContent = "Pressed plates: " + 0 + "/3";
        this._sockObj = params.socket;
        this._socket = this._sockObj.socket;
        params.control == 'survivor' ? this._controlSurvivor = true : this._controlEntity = true;
    }

    static async create(params) {
        if (this._instance) {
            this.destroy();
        }
        this._instance = new MazeEscape(params);
        await this._instance.initialize();
        this._instance.setCharacterSocket();
        this._instance._RAF();
        return this._instance;
    }

    static destroy() {

        if (this._instance) {
            window.removeEventListener("resize", this._instance._OnWindowResizeRef);
            if (this._instance._survivor) {
                this._instance._survivor.clearAudio();
                this._instance._survivor.destroy();
            }
            if (this._instance._entity) {
                this._instance._entity.clearAudio();
                this._instance._entity.destroy();
            }
            if (this._instance._scene) {
                while (this._instance._scene.children.length > 0) {
                    const object = this._instance._scene.children[0];
                    this._instance._scene.remove(object);
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                    if (object.texture) {
                        object.texture.dispose();
                    }
                }
            }

            if (this._instance._renderer && this._instance._renderer.domElement.parentNode) {
                this._instance._renderer.domElement.parentNode.removeChild(this._instance._renderer.domElement);
                this._instance._renderer.dispose();
            }

            this._instance._gameOver = false;
            this._instance._survivorEscaped = false;
            this._instance._previousRAF = null;
            this._instance._mixers = [];
            this._instance._scene = null;
            this._instance._camera = null;
            this._instance._renderer = null;
            this._instance._light = null;
            this._instance._survivor = null;
            this._instance._entity = null;
            this._instance._thirdPersonCamera = null;
            this._instance._maze = null;
            this._instance._boundingBoxes = null;
            this._instance._pressurePlates = null;
            this._instance._exit = null;
            this._instance._textureLoader = null;
            this._instance._clock = null;
            this._instance = null;
        }
    }

    async initialize() {
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.outputColorSpace = THREE.SRGBColorSpace;
        this._renderer.physicallyCorrectLights = true;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.0;
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._renderer.domElement);

        this._OnWindowResizeRef = () => { this._OnWindowResize() };

        window.addEventListener("resize", this._OnWindowResizeRef);

        // Set and add Camera
        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 10, 40);

        this._scene = new THREE.Scene();

        // Add lights
        const light = new THREE.DirectionalLight(0x444444, 1.2);
        light.name = "light";
        light.position.set(-100, 150, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 1.0;
        light.shadow.camera.far = 1000.0;
        light.shadow.camera.left = -500.0;
        light.shadow.camera.right = 500.0;
        light.shadow.camera.top = 500.0;
        light.shadow.camera.bottom = -500.0;
        light.shadow.camera.updateProjectionMatrix();
        this._light = light;
        this._scene.add(this._light);

        const ambientLight = new THREE.AmbientLight(0xFAEBD7, 0.25);
        this._scene.add(ambientLight);

        /*const cameraHelper = new THREE.CameraHelper(this._light.shadow.camera);
        this._scene.add(cameraHelper);*/

        // Add Skybox
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            "./assets/imgs/_px.jpg",
            "./assets/imgs/_nx.jpg",
            "./assets/imgs/_py.jpg",
            "./assets/imgs/_ny.jpg",
            "./assets/imgs/_pz.jpg",
            "./assets/imgs/_nz.jpg",
        ]);

        texture.encoding = THREE.sRGBEncoding;
        this._scene.background = texture;

        this._textureLoader = new THREE.TextureLoader();

        // Floor
        const floorTexture = this.getTexture("./assets/imgs/textures/green-grass-field-texture.jpg", 100, 100);

        const floorMaterial = floorTexture ? new THREE.MeshStandardMaterial({
            map: floorTexture,
            depthTest: true,
            depthWrite: true
        }) : new THREE.MeshStandardMaterial({
            color: 0xdbdbdb,
            depthTest: true,
            depthWrite: true
        });

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(8000, 8000, 5),
            floorMaterial
        );
        floor.castShadow = false;
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5 / 2;

        if (!debug) {
            this._scene.add(floor);
        }

        // Floor Bounding Box
        this._floorBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        this._floorBB.setFromObject(floor);

        // Bounding Boxes

        this._boundingBoxes = {
            "floor": this._floorBB,
            "walls": [],
            "pressurePlates": new Map(),
            "exit": undefined
        };

        // Maze

        await this._initMaze();

        // Load Survivor
        this._survivor = new Survivor({
            camera: this._camera,
            scene: this._scene,
            boundingBoxes: this._boundingBoxes,
            capsuleRadius: 3.5,
            capsuleHeight: 10.5,
            "debug": false,
            control: this._controlSurvivor ? true : false
        });

        // Load survivor's health bar

        if (this._controlSurvivor) {
            lifeBar.style.visibility = "visible";
        }

        // Load Entity

        this._entity = new Monster({
            camera: this._camera,
            scene: this._scene,
            boundingBoxes: this._boundingBoxes,
            capsuleRadius: 6.0,
            capsuleHeight: 5.0,
            "debug": false,
            control: this._controlEntity ? true : false
        });

        // Set references

        this._survivor.Monster = this._entity;
        this._entity.Survivor = this._survivor;

        // Set characters position

        this.setSpawn();

        // Adapt global illumination to the scene

        this.adjustIllumination();

        // Third Person Camera

        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._controlSurvivor ? this._survivor : this._entity
        });

        // RAF
        this._clock = new THREE.Clock();
        this._mixers = [];
        this._previousRAF = null;
    }

    get Survivor() {
        return this._survivor;
    }

    get Entity() {
        return this._entity;
    }

    get Control() {
        return this._controlSurvivor ? 'survivor' : 'monster';
    }

    setCharacterSocket() {
        this._controlledCharacter == 'survivor' ? this._survivor.SockObj = this._sockObj
            : this._entity.SockObj = this._sockObj;

        this._controlledCharacter == 'survivor' ? this._survivor.Socket = this._sockObj.socket
            : this._entity.Socket = this._sockObj.socket;
    }

    getTexture(url, x, y) {
        let texture = null;
        if (this._textureLoader) {
            texture = this._textureLoader.load(url);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(x, y);
        }
        return texture;
    }

    checkReady(){
        if(this._survivor?.Ready && this._entity?.Ready){
            return true;
        }
        return false;
    }

    async fetchMaze() {
        try {
            const res = await fetch(SERVER + '/maze?match=' + this._sockObj.matchIndex);
            const data = await res.json();
            return data.success ? data : null;
        } catch (err) {
            console.log("Errore nell'ottenimento dei dati del labirinto: " + err);
            return null;
        }
    };

    createMaze(serverResponse) {
        const mazeData = serverResponse.maze;
        const { x: resX, y: resY } = mazeData.resolution;

        this._maze = new Maze({ resolution: new THREE.Vector2(resX, resY), cellSize: mazeData.cellSize, scene: this._scene });

        this.drawMaze(mazeData);
    }

    drawMaze(mazeData) {

        console.log("Genero il labirinto...");

        const cells = mazeData.nodes.map((node, i) => {
            const cell = new Cell({ "maze": this._maze });
            cell.index = node.index;
            const cellMesh = cell.draw();
            if (debug) {
                this._scene.add(cellMesh);
            }
            return cell;
        });

        this._maze.nodes = cells;

        mazeData.nodes.forEach((node, i) => {
            node.neighbors.forEach(j => {
                if (i < j) {
                    const from = cells[i];
                    const to = cells[j];

                    this._maze.addEdge(from, to);
                    const edgeMesh = this._maze.drawEdge({ from, to });
                    this._scene.add(edgeMesh);
                }
            });
        });

        if (!debug) {
            console.log("Creo le mura interne...");
            cells.forEach(cell => {
                const neighbors = cell.getNeighbors();

                neighbors.forEach(neighborIndex => {
                    const neighbor = this._maze.nodes[neighborIndex];

                    if (cell.index > neighbor.index) {
                        return;
                    }

                    const edgeExists = this._maze.edges.some(edge => (edge.from === cell && edge.to === neighbor) || (edge.from === neighbor && edge.to === cell));

                    if (!edgeExists) {
                        const wall = this.createWallBetween(cell.mesh.position, neighbor.mesh.position);
                        this._scene.add(wall);
                    }
                });
            });
            console.log("Mura interne create.");
        }

        console.log("Labirinto generato.");

    };

    createWallBetween(pos1, pos2) {

        const height = 50;
        const thickness = this._maze.cellSize / 2;
        const length = this._maze.cellSize;
        const texture = this.getTexture("./assets/imgs/textures/green-hedge-texture.jpg", 2, 2);

        const direction = new THREE.Vector3().subVectors(pos2, pos1);
        const wallPosition = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
        wallPosition.y = height / 2;

        let wallGeo;

        if (Math.abs(direction.x) > Math.abs(direction.z)) {
            wallGeo = new RoundedBoxGeometry(thickness, height, length, 1, 5);
        } else {
            wallGeo = new RoundedBoxGeometry(length, height, thickness, 1, 5);
        }

        const wallMat = texture ? new THREE.MeshStandardMaterial({
            map: texture,
            depthTest: true,
            depthWrite: true
        }) : new THREE.MeshStandardMaterial({
            color: 0xdbdbdb,
            depthTest: true,
            depthWrite: true
        });

        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.copy(wallPosition);
        wall.castShadow = true;
        wall.receiveShadow = true;

        const wallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(wall);
        this._boundingBoxes.walls.push(wallBB);

        return wall;

    };

    addOuterWalls() {

        console.log("Creo le mura esterne...");

        const cellSize = this._maze.cellSize;
        const cols = this._maze.resolution.x;
        const rows = this._maze.resolution.y;

        const totalWidth = cols * cellSize;
        const totalHeight = rows * cellSize;
        const wallThickness = cellSize / 2;
        const wallHeight = 50;
        const texture = this.getTexture("./assets/imgs/textures/brick-wall-texture.jpg", 8, 2);

        const halfWidth = totalWidth / 2 - cellSize / 2;
        const halfHeight = totalHeight / 2 - cellSize / 2;

        const wallMat = texture ? new THREE.MeshStandardMaterial({
            map: texture,
            depthTest: true,
            depthWrite: true
        }) : new THREE.MeshStandardMaterial({
            color: 0xdbdbdb,
            depthTest: true,
            depthWrite: true
        });

        // TOP
        const topWall = new THREE.Mesh(
            new THREE.BoxGeometry(totalWidth + wallThickness, wallHeight, wallThickness),
            wallMat
        );
        topWall.position.set(0, wallHeight / 2, -halfHeight - cellSize / 2);
        topWall.castShadow = true;
        topWall.receiveShadow = true;

        const topWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(topWall);
        this._boundingBoxes.walls.push(topWallBB);

        this._scene.add(topWall);

        // BOTTOM
        const bottomWall = new THREE.Mesh(
            new THREE.BoxGeometry(totalWidth + wallThickness, wallHeight, wallThickness),
            wallMat
        );
        bottomWall.position.set(0, wallHeight / 2, halfHeight + cellSize / 2);
        bottomWall.castShadow = true;
        bottomWall.receiveShadow = true;

        const bottomWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(bottomWall);
        this._boundingBoxes.walls.push(bottomWallBB);

        this._scene.add(bottomWall);

        // LEFT
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, totalHeight + wallThickness),
            wallMat
        );
        leftWall.position.set(-halfWidth - cellSize / 2, wallHeight / 2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;

        const leftWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(leftWall);
        this._boundingBoxes.walls.push(leftWallBB);

        this._scene.add(leftWall);

        // RIGHT
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, totalHeight + wallThickness),
            wallMat
        );
        rightWall.position.set(halfWidth + cellSize / 2, wallHeight / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;

        const rightWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(rightWall);
        this._boundingBoxes.walls.push(rightWallBB);

        this._scene.add(rightWall);

        console.log("Mura esterne create.");

    };

    addExit(serverResponse) {
        console.log("Creo l'uscita...");

        const exitThickness = this._maze.cellSize / 5;
        const exitHeight = serverResponse.maze.exit.height;
        const texture = this.getTexture("./assets/imgs/textures/exit-texture.jpg", 1, 1);

        const exitMaterial = texture ? new THREE.MeshStandardMaterial({
            map: texture,
            depthTest: true,
            depthWrite: true
        }) : new THREE.MeshStandardMaterial({
            color: 0x000000,
            depthTest: true,
            depthWrite: true
        });
        this._exit = new THREE.Mesh(
            new RoundedBoxGeometry(exitThickness, exitHeight, exitThickness, 10, 20),
            exitMaterial
        );
        this._exit.castShadow = true;
        this._exit.receiveShadow = true;

        const { x: posX, y: posY, z: posZ } = serverResponse.maze.exit.position;

        this._exit.position.set(posX, posY, posZ);

        this._exit.name = "exit";

        console.log("Uscita generata.");
    }

    addPressurePlates(serverResponse) {
        console.log("Genero le pressure plates...");

        this._pressurePlates = [];

        const positionsData = serverResponse.maze.pressurePlatesPositions;

        const pressurePlatesPositions = positionsData.map(pos => {
            return new THREE.Vector3(pos.x, pos.y, pos.z);
        });

        const texture = this.getTexture("./assets/imgs/textures/pressure-plate-texture.jpg", 2, 2);

        pressurePlatesPositions.forEach(pos => {
            const geometry = new THREE.BoxGeometry(10, 2, 10);

            const material = texture ? new THREE.MeshStandardMaterial({
                map: texture,
                depthTest: true,
                depthWrite: true
            }) : new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                depthTest: true,
                depthWrite: true
            });

            const pPlate = new THREE.Mesh(geometry, material);

            pPlate.position.copy(pos);
            pPlate.castShadow = true;
            pPlate.receiveShadow = true;
            pPlate.userData["activated"] = false;

            pPlate.geometry.computeBoundingBox();
            const pPlateBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(pPlate);
            this._boundingBoxes.pressurePlates.set(pPlate, pPlateBB);

            this._scene.add(pPlate);
            this._pressurePlates.push(pPlate);
        });

        console.log("Pressure plates generate.");
    };

    async _initMaze() {
        const res = await this.fetchMaze();

        if (!res) {
            return;
        }

        this.createMaze(res);
        this.addOuterWalls();
        this.addExit(res);
        this.addPressurePlates(res);

        console.log("Labirinto inizializzato correttamente: ", this._maze);
    }

    setSpawn() {
        const { x: cols, y: rows } = this._maze.resolution;

        const survSpawnPosition = this.survivorSpawn(rows, cols);
        const entitySpawnPosition = this.entitySpawn(rows, cols);

        this._survivor.Position = survSpawnPosition;
        this._entity.Position = entitySpawnPosition;
    };

    survivorSpawn(rows, cols) {
        const borderCells = this._maze.nodes.filter((cell, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            const isBorder = (row === 1 || row === rows - 2)
                || (col === 1 || col === cols - 2);

            return isBorder && cell.edges.length > 0;
        });

        if (borderCells.length === 0) {
            console.log("Errore nella generazione dello spawn del sopravvissuto: Nessuna cella percorribile trovata.");
        }

        const randomIndex = Math.floor(Math.random() * borderCells.length);
        const cell = borderCells[randomIndex];
        const pos = cell.getPositionByIndex();

        return pos;
    }

    entitySpawn(rows, cols) {
        const cell = this._maze.nodes[Math.floor(rows / 2) * cols + Math.floor(cols / 2)];
        const pos = cell.getPositionByIndex();

        return pos;
    }

    adjustIllumination() {
        const { x: cols, y: rows } = this._maze.resolution;
        const cellSize = this._maze.cellSize;
        const totalWidth = cols * cellSize;
        const totalHeight = rows * cellSize;

        this._light.position.copy(this._entity.Position);
        this._light.position.y = 150;
        this._light.target.position.copy(this._entity.Position);
        this._light.target.updateMatrixWorld(true);
        this._light.shadow.camera.left = -totalWidth / 2 - cellSize;
        this._light.shadow.camera.right = totalWidth / 2 + cellSize;
        this._light.shadow.camera.top = totalHeight / 2 + cellSize;
        this._light.shadow.camera.bottom = -totalHeight / 2 - cellSize;
        this._light.shadow.camera.near = 1.0;
        this._light.shadow.camera.far = this._light.position.y + Math.abs(this._floorBB.min.y) + cellSize;
        this._light.shadow.camera.updateProjectionMatrix();
    };

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        if (this._gameOver) {
            this._animationFrameId = null;
            return;
        }
        this._animationFrameId = requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._RAF();

            this._renderer.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers && !this._gameOver) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._survivor && !this._gameOver) {
            this._survivor.Update(timeElapsedS);

            if (this._controlSurvivor) {
                const survState = {
                    name: 'survivor',
                    position: {
                        x: this._survivor.Position.x,
                        y: this._survivor.Position.y,
                        z: this._survivor.Position.z
                    },
                    rotation: {
                        x: this._survivor.Rotation.x,
                        y: this._survivor.Rotation.y,
                        z: this._survivor.Rotation.z,
                        w: this._survivor.Rotation.w
                    },
                    action: this._survivor.CurrentState,
                    player: this._sockObj.playerNum,
                    match: this._sockObj.matchIndex
                };

                this._socket.emit('update', survState);
            }
        }

        if (this._entity && !this._gameOver) {
            this._entity.Update(timeElapsedS);

            if (this._controlEntity) {
                const entityState = {
                    name: 'monster',
                    position: {
                        x: this._entity.Position.x,
                        y: this._entity.Position.y,
                        z: this._entity.Position.z
                    },
                    rotation: {
                        x: this._entity.Rotation.x,
                        y: this._entity.Rotation.y,
                        z: this._entity.Rotation.z,
                        w: this._entity.Rotation.w
                    },
                    action: this._entity.CurrentState,
                    player: this._sockObj.playerNum,
                    match: this._sockObj.matchIndex
                };

                this._socket.emit('update', entityState);
            }
        }

        if (this._thirdPersonCamera && !this._gameOver) {
            this._thirdPersonCamera.Update(timeElapsedS);
        }

        this._updatePlates();
        this._checkGameOver();

        if (this._gameOver) {
            if (win.style.visibility == "visible" || lost.style.visibility == "visible") {
                return;
            }

            if ((this._controlSurvivor && this._survivorEscaped) || (this._controlEntity && !this._survivorEscaped)) {
                win.style.visibility = "visible";
                console.log("Hai vinto!");
            } else if ((this._controlSurvivor && !this._survivorEscaped) || (this._controlEntity && this._survivorEscaped)) {
                lost.style.visibility = "visible";
                console.log("Hai perso!");
            }

            if (this._survivor) {
                this._survivor.clearAudio();
            }
            if (this._entity) {
                this._entity.clearAudio();
            }
            return;
        }
    }

    _checkGameOver() {
        if (this._gameOver) {
            return;
        }
        if (this._survivor.Health < 10 || this._survivorEscaped) {
            this._gameOver = true;
            this._socket.emit('gameover', { match: this._sockObj.matchIndex, player: this._sockObj.playerNum });
        }
    }

    _updatePlates() {
        if (this._pressurePlates && this._pressedPlates < 3) {
            let countPressedPlates = 0;
            this._pressurePlates.forEach(pPlate => {
                if (pPlate.userData.activated) {
                    countPressedPlates++;
                }
            });
            if (countPressedPlates > this._pressedPlates) {
                this._pressedPlates = countPressedPlates;
                document.querySelector(".pressurePlates").textContent = "Pressed plates: " + this._pressedPlates + "/3";
            }
        } else if (this._pressedPlates === 3 && this._survivor.canExit && !this._gameOver) {
            console.log("Exited!");
            this._survivorEscaped = true;
            this._socket.emit("escaped", { match: this._sockObj.matchIndex, player: this._sockObj.playerNum });
        }

        if (this._pressedPlates === 3 && !this._scene.getObjectByName("exit")) {
            console.log("L'uscita è spawnata!");
            this._exit.geometry.computeBoundingBox();
            const exitBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()).setFromObject(this._exit);
            this._boundingBoxes.exit = exitBB;
            this._survivor.BoundingBoxes = this._boundingBoxes;
            this._entity.BoundingBoxes = this._boundingBoxes;
            this._scene.add(this._exit);
        }
    }

};
