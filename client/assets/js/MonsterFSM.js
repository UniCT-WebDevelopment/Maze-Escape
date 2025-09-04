import * as THREE from '../../libs/three/three.module.js';
import { FiniteStateMachine, State } from "./FiniteStateMachine.js";
import BasicCharacterControllerProxy from "./BasicCharacterControllerProxy.js";

export default class MonsterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('walk_backwards', WalkBackwardsState);
        this._AddState('run_backwards', RunBackwardsState);
        this._AddState('basic_hit', BasicHitState);
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

        if (input._keys.space){
            this._parent.SetState('basic_hit');
            return;
        }

        if (input._keys.forward) {
            this._parent.SetState('walk');
        } else if (input._keys.backward) {
            this._parent.SetState('walk_backwards');
        } else if (input._keys.space){
            this._parent.SetState('basic_hit');
        }
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

        if (input._keys.space){
            this._parent.SetState('basic_hit');
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

        if (input._keys.space){
            this._parent.SetState('basic_hit');
            return;
        }

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

class BasicHitState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    }
  }

  get Name() {
    return 'basic_hit';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['basic_hit'].action;
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
    this._parent.SetState('idle');
  }

  _Cleanup() {
    const action = this._parent._proxy._animations['basic_hit'].action;
    
    action.getMixer().removeEventListener('finished', this._FinishedCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {
  }
};