import {
    IDerivationState,
    IObservable,
    IDerivation,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    noop,
    onBecomeObserved,
    onBecomeUnobserved,
    propagateChanged,
    reportObserved,
    startBatch
} from "../internal"
import { Lambda } from "../utils/utils"

export const $mobx = Symbol("mobx administration")

export interface IAtom extends IObservable {
    reportObserved()
    reportChanged()
}

/**
 * 原子类
 * 用来通知 Mobx 某些 observable 数据源被观察或发生了改变。
 * 当数据源被使用或者不再使用的时候, Mobx 会通知 Atom.
 *
 * 这个类继承自 IObservable 所以也是可观察的，主要用于那些基本 API 不满足的场景，更加灵活。一般情况下不需要使用
 *
 * @see https://cn.mobx.js.org/refguide/extending.html
 */
export class Atom implements IAtom {
    isPendingUnobservation = false // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
    isBeingObserved = false
    observers = new Set<IDerivation>()

    diffValue = 0
    lastAccessedBy = 0
    lowestObserverState = IDerivationState.NOT_TRACKING
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(public name = "Atom@" + getNextId()) {}

    public onBecomeObservedListeners: Set<Lambda> | undefined
    public onBecomeUnobservedListeners: Set<Lambda> | undefined

    public onBecomeObserved() {
        if (this.onBecomeObservedListeners) {
            this.onBecomeObservedListeners.forEach(listener => listener())
        }
    }

    public onBecomeUnobserved() {
        if (this.onBecomeUnobservedListeners) {
            this.onBecomeUnobservedListeners.forEach(listener => listener())
        }
    }

    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     */
    public reportObserved(): boolean {
        return reportObserved(this)
    }

    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
    public reportChanged() {
        startBatch()
        propagateChanged(this)
        endBatch()
    }

    toString() {
        return this.name
    }
}

export const isAtom = createInstanceofPredicate("Atom", Atom)

export function createAtom(
    name: string,
    onBecomeObservedHandler: () => void = noop,
    onBecomeUnobservedHandler: () => void = noop
): IAtom {
    const atom = new Atom(name)
    // default `noop` listener will not initialize the hook Set
    if (onBecomeObservedHandler !== noop) {
        onBecomeObserved(atom, onBecomeObservedHandler)
    }

    if (onBecomeUnobservedHandler !== noop) {
        onBecomeUnobserved(atom, onBecomeUnobservedHandler)
    }
    return atom
}
