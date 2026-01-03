import { type Command } from '../Core/Command'
import { type UserConfig } from 'tsdown';
import type { Application } from './Application';

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

export type ParsedCommand<A extends Application = Application> = {
    commandClass: Command<A>;

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

export type PackageMeta = string | { name: string, alias: string, base?: boolean }

export type CommandMethodResolver = <X extends Command>(cmd: X, met: any) => Promise<X>

export interface KernelConfig<A extends Application = Application> {
    /**
     * ASCII Art style logo
     */
    logo?: string
    /**
     * The name of the CLI app we're running
     * 
     * @default musket
     */
    name?: string
    /**
     * The version of the CLI app we're running (if provided, this will overwrite the value of resolved version from packages config marked as base)
     * 
     * @default musket
     */
    version?: string
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
    resolver?: CommandMethodResolver
    /**
     * If we need to programmatically run the tsdown build command, we will use this config.
     */
    tsDownConfig?: UserConfig
    /**
     * Packages that should show up up when the `-V` flag is passed
     */
    packages?: PackageMeta[]
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
    baseCommands?: typeof Command<A>[],
    /**
     * A command that will be run when the script is run without arguments
     */
    rootCommand?: typeof Command<A>,
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
