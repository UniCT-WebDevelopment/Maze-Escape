import * as THREE from '../../libs/three/three.module.js';
import { FiniteStateMachine, State } from "./FiniteStateMachine.js";
import BasicCharacterControllerProxy from "./BasicCharacterControllerProxy.js";

export default class SurvivorFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('crouch', CrouchState);
        this._AddState('walk_ctrl', WalkCtrlState);
        this._AddState('crouch_idle', CrouchIdleState);
        this._AddState('walk_backwards', WalkBackwardsState);
        this._AddState('run_backwards', RunBackwardsState);
        this._AddState('walk_backwards_ctrl', WalkBackwardsCtrlState);
    }
};

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle';
    }

    Enter(prevState) {
        if(!this._parent._proxy._animations){
            return;
        }
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Exit() {
    }

    Update(_, input) {
        if (input._keys.forward) {
            this._parent.SetState('walk');
        } else if (input._keys.backward) {
            this._parent.SetState('walk_backwards');
        } else if (input._keys.ctrl) {
            this._parent.SetState('crouch');
        }
    }
};

class CrouchIdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'crouch_idle';
    }

    Enter(prevState) {
        const idleAction = this._parent._proxy._animations['crouch_idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Exit() {
    }

    Update(_, input) {
        if (!input._keys.ctrl) {
            this._parent.SetState('idle');
        }

        if (input._keys.forward) {
            this._parent.SetState('walk_ctrl');
        } else if (input._keys.backward) {
            this._parent.SetState('walk_backwards_ctrl');
        }
    }
};

class CrouchState extends State {
    constructor(parent) {
        super(parent);

        this._FinishedCallback = () => {
            this._Finished();
        }
    }

    get Name() {
        return 'crouch';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['crouch'].action;
        const mixer = curAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);

        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.reset();
            curAction.setLoop(THREE.LoopOnce, 1);
            curAction.clampWhenFinished = true;
            curAction.crossFadeFrom(prevAction, 0.2, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    _Finished() {
        this._Cleanup();
        this._parent.SetState('crouch_idle');
    }

    _Cleanup() {
        const action = this._parent._proxy._animations['crouch'].action;

        action.getMixer().removeEventListener('finished', this._FinishedCallback);
    }

    Exit() {
        this._Cleanup();
    }

    Update(_) {
    }
};

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.ctrl) {
            this._parent.SetState('crouch');
            return;
        }
        if (input._keys.forward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        } else if (input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run_backwards');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};

class WalkBackwardsState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk_backwards';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk_backwards'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run' || prevState.Name == 'run_backwards') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.ctrl) {
            this._parent.SetState('crouch');
            return;
        }

        if (input._keys.forward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            } else {
                this._parent.SetState('walk');
            }
            return;
        } else if (input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run_backwards');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};

class WalkCtrlState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk_ctrl';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk_ctrl'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (!input._keys.ctrl) {
            this._parent.SetState('idle');
            return;
        }

        if (input._keys.forward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        } else if (input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run_backwards');
            } else {
                this._parent.SetState('walk_backwards_ctrl');
            }
            return;
        }

        this._parent.SetState('crouch_idle');
    }
};

class WalkBackwardsCtrlState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk_backwards_ctrl';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk_backwards_ctrl'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (!input._keys.ctrl) {
            this._parent.SetState('idle');
            return;
        }

        if (input._keys.forward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            } else {
                this._parent.SetState('walk_ctrl');
            }
            return;
        } else if (input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run_backwards');
            }
            return;
        }

        this._parent.SetState('crouch_idle');
    }
};

class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'walk') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.forward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        } else if (input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk_backwards');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};

class RunBackwardsState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run_backwards';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run_backwards'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'walk' || prevState.Name == 'walk_backwards') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.forward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        } else if (input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk_backwards');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};