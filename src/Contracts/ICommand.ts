import { type Command } from '../Core/Command'
import { type UserConfig } from 'tsdown';

export type CommandOption = {
    name: string;
    shared?: boolean;
    required?: boolean;
    multiple?: boolean;
    placeholder?: string;
    description?: string;
    defaultValue?: string | number | boolean | undefined | string[]
    choices?: string[]
    argParser?: (...args: []) => any
    /**
     * for options like --Q|queue
     */
    flags?: string[];
    /**
     * true if it's a flag option
     */
    isFlag?: boolean;
    /**
     * true if name begins with '#' or '^'
     */
    isHidden?: boolean;
    /**
     * for nested options
     */
    nestedOptions?: CommandOption[];
};

export type ParsedCommand = {
    commandClass: Command;

    baseCommand: string;

    description?: string;
    /**
     * true if baseCommand begins with '#' or '^'
     */
    isHidden?: boolean;
    /**
     * true if baseCommand ends with ':'
     */
    isNamespaceCommand: boolean;
    /**
     * for colon-ended commands
     */
    subCommands?: CommandOption[];
    /**
     * for normal commands
     */
    options?: CommandOption[];
};

export interface InitConfig {
    /**
     * ASCII Art style logo
     */
    logo?: string
    /**
     * The name of the CLI app we're building
     * 
     * @default musket
     */
    cliName?: string
    /**
     * Don't parse the command, usefull for testing or manual control
     */
    skipParsing?: boolean
    /**
     * A callback function that should resolve the handle method of every command
     * 
     * @param cmd 
     * @param met 
     * @returns 
     */
    resolver?: <X extends Command>(cmd: X, met: any) => Promise<X>
    /**
     * If we need to programmatically run the tsdown build command, we will use this config.
     */
    tsDownConfig?: UserConfig
    /**
     * Packages that should show up up when the `-V` flag is passed
     */
    packages?: (string | { name: string, alias: string })[]
    /**
     * If set to true, information about musket CLI like name and
     * version info will not be unexpectedly shown in console
     */
    hideMusketInfo?: boolean
    /**
     * If enabled rebuilds will be triggered when code changes happen
     */
    allowRebuilds?: boolean
    /**
     * Commands that should be autoloaded by default
     */
    baseCommands?: typeof Command[],
    /**
     * A command that will be run when the script is run without arguments
     */
    rootCommand?: typeof Command,
    /**
     * Paths where musket can search and auto discover commands
     * 
     * 
     * @example 'Console/Commands/*.js'
     * @example 'dist/app/Console/Commands/*.js'
     * @example ['Console/Commands/*.js', 'src/app/Commands/*.js']
     */
    discoveryPaths?: string | string[]
}
