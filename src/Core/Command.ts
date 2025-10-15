import type { Argument, Command as ICommand } from 'commander'

import { Application } from 'src/Contracts/Application'
import { Kernel } from './Kernel'
import { Logger } from '@h3ravel/shared'
import { XGeneric } from '@h3ravel/support'

export class Command {
    constructor(protected app: Application, protected kernel: Kernel) { }

    /**
     * The underlying commander instance.
     *
     * @var Command
     */
    public program!: ICommand

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature!: string

    /**
     * A dictionary of signatures or what not.
     *
     * @var object
     */
    protected dictionary: Record<string, any> = {}

    /**
     * The console command description.
     *
     * @var string
     */
    protected description?: string

    /**
     * The console command input.
     *
     * @var object
     */
    private input: XGeneric<{ options: Record<string, any>, arguments: Record<string, any> }> = {
        options: {},
        arguments: {},
    }

    /**
     * Execute the console command.
     */
    public async handle (..._args: any[]): Promise<void> { }

    setApplication (app: Application) {
        this.app = app
    }

    setInput (
        options: XGeneric,
        args: string[],
        regArgs: readonly Argument[],
        dictionary: Record<string, any>,
        program: ICommand,
    ) {
        this.program = program
        this.dictionary = dictionary
        this.input.options = options
        this.input.arguments = regArgs
            .map((e, i) => ({ [e.name()]: args[i] }))
            .reduce((e, x) => Object.assign(e, x), {})
        this.loadBaseFlags()

        Logger.configure({
            verbosity: this.option('verbose'),
            silent: this.option('silent'),
            quiet: this.option('quiet'),
        })

        return this
    }

    setOption (key: string, value: unknown) {
        this.program.setOptionValue(key, value)
        return this
    }

    setProgram (program: ICommand) {
        this.program = program
        return this
    }

    getSignature () {
        return this.signature
    }

    getDescription () {
        return this.description
    }

    option (key: string, def?: any) {
        const option = this.input.options[key] ?? def
        return option === 'null' || option === 'undefined' ? undefined : option
    }

    options (key?: string) {
        if (key) {
            return this.input.options[key]
        }
        return this.input.options
    }

    argument (key: string, def?: any) {
        return this.input.arguments[key] ?? def
    }

    arguments () {
        return this.input.arguments
    }

    public loadBaseFlags () {
        let verbose = 0
        if (this.program.getOptionValue('verbose') == 'v') verbose = 2
        else if (this.program.getOptionValue('verbose') == 'vv') verbose = 3
        else verbose = Number(this.program.getOptionValue('verbose') ?? 0)

        this.input.options.quiet = this.program.getOptionValue('quiet') ?? false
        this.input.options.silent = this.program.getOptionValue('silent') ?? false
        this.input.options.verbose = verbose
        this.input.options.interaction = this.program.getOptionValue('interaction') ?? false
    }

    /**
     * Check if the command is quiet
     * 
     * @returns 
     */
    isQuiet () {
        return this.option('quiet')
    }

    /**
     * Check if the command is silent
     * 
     * @returns 
     */
    isSilent () {
        return this.option('silent')
    }

    /**
     * Check if the command is non interactive
     * 
     * @returns 
     */
    isNonInteractive () {
        return this.option('interaction') === false
    }

    /**
     * Get the verbosity of the command
     * 
     * @returns 
     */
    getVerbosity () {
        return Number(this.option('verbose'))
    }

    /**
     * Log an info message
     */
    info (message: string) {
        Logger.info(message)
        return this
    }

    /**
     * Log a warning message
     */
    warn (message: string) {
        Logger.warn(message)
        return this
    }

    /**
     * Log a line message
     */
    line (message: string) {
        Logger.log(message, 'white')
        return this
    }

    /**
     * Log a new line
     */
    newLine (count: number = 1) {
        if (Number(this.getVerbosity()) >= 3 || (!this.isSilent() && !this.isQuiet()))
            for (let i = 0; i < count; i++)
                console.log('')
        return this
    }

    /**
     * Log a success message
     */
    success (message: string) {
        Logger.success(message)
        return this
    }

    /**
     * Log an error message
     */
    error (message: string) {
        Logger.error(message, false)
        return this
    }

    /**
     * Log an error message and terminate execution of the command
     * return an exit code of 1
     * 
     * This method is not chainable
     */
    fail (message: string) {
        this.error(message)

        process.exit(1)
    }

    /**
     * Log a debug message
     */
    debug (message: string | string[]) {
        Logger.debug(message)
        return this
    }
}
