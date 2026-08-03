import { Command } from '../Core/Command'
import { Musket } from 'src/Musket'

export abstract class Application {
    [key: string]: any

    private _musket?: Musket<this>
    private musketListenersBooted?: boolean = false

    /**
     * Registered commands will be preloaded
     */
    registeredCommands?: Array<typeof Command<this>>

    /**
     * The current musket CLI Instance
     */
    get musket(): Musket<this> {
        if (!this._musket) {
            throw new Error('Musket has not been attached to the application.')
        }

        return this._musket
    }

    /**
     * Set the current musket instance
     * 
     * @param musket 
     * @returns 
     */
    setMusket(musket: Musket<this>): this {
        if (!this._musket) {
            this._musket = musket
            this.registerMusketListeners(musket)
        }

        return this
    }

    /**
     * Register application listeners after Musket has bootstrapped.
     *
     * @internal
     */
    public bootMusketListeners(): void {
        if (!this._musket || this.musketListenersBooted)
            return

        this.musketListenersBooted = true
        this.registerMusketListeners(this._musket)
    }

    /**
     * Called after Musket has been attached to the application.
     * 
     * @param _musket 
     */
    public registerMusketListeners(_musket: Musket<this>): void {
        //
    }
}