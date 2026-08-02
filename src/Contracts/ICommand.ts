import { type Command } from '../Core/Command'
import { type LoggerChalk } from '@h3ravel/shared'
import type { Application } from './Application'

/**
 * Configuration forwarded to the optional tsdown integration when rebuilds
 * are enabled. Musket deliberately keeps this structural so importing its
 * public types does not require tsdown to be installed.
 */
export type MusketBuildConfig = object

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

export type PackageMeta = string | {
    /**
     * The package name to resolve version info from (its `package.json`).
     */
    name: string,
    /**
     * Display alias; defaults to `name`. Still passes through label formatting.
     */
    alias?: string,
    /**
     * Mark as the base package whose version `KernelConfig.version` overrides.
     */
    base?: boolean,
    /**
     * Exact display label, bypassing the default name formatting entirely.
     */
    label?: string,
    /**
     * By default, Musket cli will try to resolve the dependency at
     * cwd, set this to overide the search path.
     */
    path?: string,
    /**
     * Hardcoded version string, bypassing `package.json` resolution.
     */
    version?: string,
}

/**
 * Resolved metadata for a single module shown in the CLI version line.
 */
export type ModuleMeta = {
    name: string
    base?: boolean
    alias?: string
    label?: string
    version: string
}

/**
 * Helpers handed to {@link KernelConfig.versionFormatter} so a custom renderer
 * can reuse the default per-module formatting while controlling the layout.
 */
export type VersionRenderHelpers = {
    /** Default per-module renderer: the colored `Label: version` segment. */
    format: (module: ModuleMeta) => string
    /** Default label formatter (scope-stripped, spaced, capitalized). */
    label: (module: ModuleMeta) => string
    /** The separator that would be used between modules. */
    separator: string
}

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
     * Separator rendered between modules in the version line.
     *
     * @default ' | '
     */
    versionSeparator?: string
    /**
     * Colors used by the default version renderer. Ignored when
     * {@link versionFormatter} is supplied.
     */
    versionColors?: {
        /**
         * Color of each module's label.
         *
         * @default 'white'
         */
        label?: LoggerChalk
        /**
         * Color of each module's version.
         *
         * @default 'green'
         */
        version?: LoggerChalk
    }
    /**
     * Fully override how the version line is rendered. Receives the resolved
     * modules plus helpers (default per-module formatter, label formatter and
     * separator) and must return the final string shown for `--version` and
     * atop the command list. When omitted, modules are joined with
     * {@link versionSeparator} using the default colored `Label: version`
     * layout.
     *
     * @param modules  The resolved module metadata.
     * @param helpers  Default formatters so layout can be customized cheaply.
     */
    versionFormatter?: (modules: ModuleMeta[], helpers: VersionRenderHelpers) => string
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
    tsDownConfig?: MusketBuildConfig
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
     * A callback function that will recieve and proccess any caught exceptions
     */
    exceptionHandler?: (exception: Error) => void
    /**
     * Paths where musket can search and auto discover commands
     *
     *
     * @example 'Console/Commands/*.js'
     * @example 'dist/app/Console/Commands/*.js'
     * @example ['Console/Commands/*.js', 'src/app/Commands/*.js']
     */
    discoveryPaths?: string | string[]
    /**
     * Optional override for how discovered command modules are imported.
     * Receives the matched file path and must resolve the module namespace.
     *
     * When omitted, musket loads TypeScript sources via jiti (`@h3ravel/shared`'s
     * `importFile`) and JavaScript natively, so `.ts` commands are discovered
     * without a prior build.
     *
     * @param filePath  The matched command file path.
     */
    importModule?: (filePath: string) => Promise<Record<string, unknown>>
}
