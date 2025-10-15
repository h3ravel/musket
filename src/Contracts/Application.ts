import { Command } from "../Core/Command";
import { Musket } from "src/Musket";

export declare class Application {
    /**
     * The current musket CLI Instance
     */
    musket?: Musket
    /**
     * Registered commands will be preloaded
     */
    registeredCommands?: typeof Command[]
}
