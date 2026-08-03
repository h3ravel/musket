import { Command } from '../Core/Command'
import { Musket } from 'src/Musket'

export abstract class Application {
    [key: string]: any

    private _musket?: Musket<this>

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
        if (this._musket) {
            throw new Error('Musket is already attached to this application.')
        }

        this._musket = musket
        this.registerMusketListeners(musket)

        return this
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