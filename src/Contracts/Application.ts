import { Command } from '../Core/Command'
import { Musket } from 'src/Musket'

export abstract class Application {
    [key: string]: any
    /**
     * The current musket CLI Instance
     */
    musket?: Musket<this>
    /**
     * Registered commands will be preloaded
     */
    registeredCommands?: Array<typeof Command<this>>

    /**
     * Set the current musket instance
     * 
     * @param musket 
     * @returns 
     */
    setMusket(musket: Musket<this>): this {
        this.musket = musket

        return this
    }
}
