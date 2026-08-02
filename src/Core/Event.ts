import { EventListener } from '../Contracts/Utils'

export class Event<T> {
    private readonly callbacks = new Set<EventListener<T>>()

    /**
     * Register an event listener
     * 
     * @param callback 
     * @returns 
     */
    on(callback: EventListener<T>): () => void {
        this.callbacks.add(callback)

        return () => {
            this.off(callback)
        }
    }

    /**
     * Register an event listener, deregister after first run
     * 
     * @param callback 
     * @returns 
     */
    once(callback: EventListener<T>): () => void {
        const listener: EventListener<T> = async payload => {
            this.off(listener)
            await callback(payload)
        }

        return this.on(listener)
    }

    /**
     * Remove a registered event listener
     * 
     * @param callback 
     * @returns 
     */
    off(callback: EventListener<T>): boolean {
        return this.callbacks.delete(callback)
    }

    /**
     * Clear all registered event listeners
     */
    clear(): void {
        this.callbacks.clear()
    }

    async emit(payload: T): Promise<void> {
        /*
         * Create a snapshot so listeners can safely register or unregister
         * other listeners while the event is being dispatched.
         */
        for (const callback of [...this.callbacks]) {
            await callback(payload)
        }
    }
}