import type { Argument, Command as ICommand } from 'commander'
import { ChoiceOrSeparatorArray, Choices, Logger, Prompts, Spinner } from '@h3ravel/shared'

import { Application } from 'src/Contracts/Application'
import { Kernel } from './Kernel'
import { XGeneric } from '../Contracts/Utils'

export class Command<A extends Application = Application> {
    constructor(protected app: A, protected kernel: Kernel<A>) { }

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
     * 
     * @param _args The command arguments
     */
    public async handle (..._args: any[]): Promise<void> { }

    /**
     * Set the application instance
     * 
     * @param app The application instance
     */
    setApplication (app: A) {
        this.app = app
    }

    /**
     * Set the command input
     * 
     * @param options    The command options
     * @param args       The command arguments
     * @param regArgs    The registered arguments
     * @param dictionary The dictionary of signatures or what not
     * @param program    The underlying commander program
     * @returns 
     */
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

    /**
     * Set a specific option
     * 
     * @param key   The option key
     * @param value The option value
     * @returns 
     */
    setOption (key: string, value: unknown) {
        this.program.setOptionValue(key, value)
        return this
    }

    /**
     * Set the underlying commander program
     * 
     * @param program The underlying commander program
     * @returns 
     */
    setProgram (program: ICommand) {
        this.program = program
        return this
    }

    /**
     * Get the command signature
     * 
     * @returns 
     */
    getSignature () {
        return this.signature
    }

    /**
     * Get the command description
     * 
     * @returns 
     */
    getDescription () {
        return this.description
    }

    /**
     * Get a specific option
     * 
     * @param key          The option key
     * @param defaultValue The default value
     * @returns 
     */
    option (key: string, defaultValue?: any) {
        const option = this.input.options[key] ?? defaultValue
        return option === 'null' || option === 'undefined' ? undefined : option
    }

    /**
     * Get all options
     * 
     * @param key The option key
     * @returns 
     */
    options (key?: string) {
        if (key) {
            return this.input.options[key]
        }
        return this.input.options
    }

    /**
     * Get a specific argument
     * 
     * @param key          The argument key
     * @param defaultValue The default value
     * @returns 
     */
    argument (key: string, defaultValue?: any) {
        return this.input.arguments[key] ?? defaultValue
    }

    /**
     * Get all arguments
     * @returns 
     */
    arguments () {
        return this.input.arguments
    }

    /**
     * Load base flags into the command input
     */
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
     * 
     * @param message The message to log
     * @returns 
     */
    info (message: string) {
        Logger.info(message)
        return this
    }

    /**
     * Log a warning message
     * 
     * @param message The message to log
     * @returns 
     */
    warn (message: string) {
        Logger.warn(message)
        return this
    }

    /**
     * Log a line message
     * 
     * @param message The message to log
     * @returns 
     */
    line (message: string) {
        Logger.log(message, 'white')
        return this
    }

    /**
     * Log a new line
     * 
     * @param count Number of new lines to log
     * @returns 
     */
    newLine (count: number = 1) {
        if (Number(this.getVerbosity()) >= 3 || (!this.isSilent() && !this.isQuiet()))
            for (let i = 0; i < count; i++)
                console.log('')
        return this
    }

    /**
     * Log a success message
     * 
     * @param message The message to log
     * @returns 
     */
    success (message: string) {
        Logger.success(message)
        return this
    }

    /**
     * Log an error message
     * 
     * @param message The message to log
     * @returns 
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
     * 
     * @param message The message to log
     * @returns 
     */
    fail (message: string) {
        this.error(message)

        process.exit(1)
    }

    /**
     * Log a debug message
     * 
     * @param message The message to log
     * @returns 
     */
    debug (message: string | string[]) {
        Logger.debug(message)
        return this
    }

    /**
     * Prompt the user with the given question, accept their input, and 
     * then return the user's input back to your command.
     * 
     * @param message      Message to display
     * @param defaultValue The default value 
     * @returns 
     */
    ask (
        message: string,
        defaultValue?: string | undefined) {
        return Prompts.ask(message, defaultValue)
    }

    /**
     * Allows users to pick from a predefined set of choices when asked a question.
     * 
     * @param message      Message to display
     * @param choices      The choices available to the user
     * @param defaultIndex Item index front of which the cursor will initially appear
     * @returns 
     */
    choice (
        message: string,
        choices: Choices,
        defaultIndex?: number,
        pageSize?: number,
    ) {
        return Prompts.choice(message, choices, defaultIndex, pageSize)
    }

    /**
     * Ask the user for a simple "yes or no" confirmation. By default, this method returns `false`. 
     * However, if the user enters y or yes in response to the prompt, the method would return `true`.
     * 
     * @param message      Message to display
     * @param defaultValue The default value 
     * @returns 
     */
    confirm (
        message: string,
        defaultValue?: boolean | undefined
    ) {
        return Prompts.confirm(message, defaultValue)
    }

    /**
     * Prompt the user with the given question, accept their input which will be visible 
     * to them as they type in the console, and then return the user's input back to your command.
     * 
     * @param message Message to display
     * @param mask    Mask the user input
     * @returns 
     */
    secret (
        message: string,
        mask?: string | boolean
    ) {
        return Prompts.secret(message, mask)
    }

    /**
     * Display a spinner while performing a long task
     * 
     * @param options The spinner options
     * @returns 
     */
    spinner (options?: string): Spinner {
        return Prompts.spinner(options)
    }

    /**
     * Provide auto-completion for possible choices. The user can still provide any 
     * answer, regardless of the auto-completion hints.
     * 
     * @param message      Message to dislpay
     * @param source       The source of completions
     * @param defaultValue Set a default value 
     * @returns 
     */
    anticipate (
        message: string,
        source: string[] | ((input?: string | undefined) => Promise<ChoiceOrSeparatorArray<any>>),
        defaultValue?: string,
        pageSize?: number,
    ) {
        return Prompts.anticipate(message, source, defaultValue, pageSize)
    }

    /**
     * Allows users to select multiple options from a predefined list of choices.
     * 
     * @param message  Message to display
     * @param choices  The choices available to the user
     * @param required Whether at least one choice is required
     * @param prefix   Prefix to display before the message
     * @param pageSize The number of items to show per page
     * @returns
     */
    checkbox (
        message: string,
        choices: Choices,
        required?: boolean,
        prefix?: string,
        pageSize?: number,
    ) {
        return Prompts.checkbox(message, choices, required, prefix, pageSize)
    }

    /**
     * Open the user's default text editor to accept multi-line input.
     * 
     * @param message  Message to display
     * @param postfix  The postfix of the file being edited [e.g., '.txt', '.md']
     * @param defaultValue The default value to pre-fill in the editor
     * @param validate A function to validate the input text
     * @returns
     */
    editor (
        message?: string,
        postfix?: string,
        defaultValue?: string,
        validate?: (text: string) => boolean | string
    ) {
        return Prompts.editor(message, postfix, defaultValue, validate)
    }
}
