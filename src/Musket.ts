import { Argument, Command as Commander, Option } from 'commander'
import { CommandMethodResolver, CommandOption, KernelConfig, MusketBuildConfig, ParsedCommand } from './Contracts/ICommand'

import { Application } from './Contracts/Application'
import { Command } from './Core/Command'
import { HelpCommand } from './Commands/HelpCommand'
import { Kernel } from './Core/Kernel'
import { ListCommand } from './Commands/ListCommand'
import { Logger, importFile } from '@h3ravel/shared'
import { Signature } from './Signature'
import { altLogo } from './logo'
import { glob } from 'glob'
import path from 'node:path'

export class Musket<A extends Application = Application> {
    /**
     * The name of the CLI app we're building
     * 
     * @default musket
     */
    public name: string = 'musket'
    private config: KernelConfig<A> = {}
    private commands: ParsedCommand<A>[] = []
    /**
     * Keys (baseCommand, namespace-aware) of commands already registered, so the
     * same command surfacing from more than one source — e.g. discovered both as
     * built `dist/*.js` and as `src/*.ts` via the jiti loader — is only added
     * once. The first registration wins (base commands before discovered ones).
     */
    private registeredKeys = new Set<string>()
    private program: Commander

    constructor(
        private app: A,
        private kernel: Kernel<A>,
        private baseCommands: Command<A>[] = [],
        private resolver?: CommandMethodResolver,
        private tsDownConfig: MusketBuildConfig = {}
    ) {
        this.program = new Commander()
    }

    async build () {
        await this
            .loadBaseCommands()
            .loadDiscoveredCommands()
        return await this.initialize()
    }

    private loadBaseCommands () {
        const commands: Command<A>[] = this.baseCommands
            .concat([
                new HelpCommand(this.app, this.kernel),
                new ListCommand(this.app, this.kernel),
            ])

        commands.forEach(e => this.addCommand(e))

        return this
    }

    /**
     * Provide the configuration to initialize the CLI with
     * 
     * @param config 
     * @returns 
     */
    public configure (config: KernelConfig<A>) {
        this.config = config
        return this
    }

    /**
     * Set the paths where the cli can search and auto discover commands
     * 
     * @param paths
     * 
     * @example instance.discoverCommandsFrom('Console/Commands/*.js')
     * @example instance.discoverCommandsFrom(['Console/Commands/*.js', 'App/Commands/*.js'])
     * 
     * @returns the current cli intance
     */
    public discoverCommandsFrom (paths: string | string[]) {
        this.config.discoveryPaths = paths
        return this
    }

    private async loadDiscoveredCommands () {
        const commands: Command<A>[] = [
            ...(this.app.registeredCommands ?? []).map(cmd => new cmd(this.app, this.kernel))
        ]

        const paths = (Array.isArray(this.config.discoveryPaths)
            ? this.config.discoveryPaths
            : [this.config.discoveryPaths]).filter(e => typeof e === 'string')

        /**
         * CLI Commands auto registration
         */
        for await (const pth of glob.stream(paths)) {
            const file = pth.toString()
            const name = path.basename(file).replace(/\.(c|m)?(t|j)s$/, '')

            try {
                const mod = await this.importCommandModule(file)
                const CommandClass = this.resolveCommandClass(mod, name)

                if (!CommandClass) {
                    this.warnDiscovery(`No command class export found in ${file}`)
                    continue
                }

                commands.push(new CommandClass(this.app, this.kernel))
            } catch (error) {
                /**
                 * Never swallow load failures silently — a command that throws on
                 * import would otherwise just vanish from the CLI with no clue why.
                 */
                this.warnDiscovery(`Failed to load command ${file}: ${(error as Error)?.message ?? String(error)}`)
            }
        }

        commands.forEach(e => this.addCommand(e))
    }

    /**
     * Import a discovered command module with full TypeScript support.
     *
     * Native `import()` is attempted first: it loads built `.js`, and works
     * verbatim in TypeScript-aware runtimes/test loaders (vitest, tsx, Node with
     * type stripping) — which also keeps their module mocking and single module
     * registry intact. When native import can't load a TypeScript source (plain
     * Node throwing on a `.ts`/`.mts`/`.cts` file), it is transpiled on the fly
     * via jiti (`@h3ravel/shared`'s `importFile`) so commands are discovered
     * without a prior build. Consumers can bypass all of this with
     * {@link KernelConfig.importModule}.
     *
     * @param file  Absolute or cwd-relative path to the command module.
     */
    private async importCommandModule (file: string): Promise<Record<string, unknown>> {
        if (this.config.importModule) {
            return await this.config.importModule(file)
        }

        try {
            return await import(file)
        } catch (error) {
            if (/\.(c|m)?ts$/.test(file)) {
                return await importFile<Record<string, unknown>>(file)
            }

            throw error
        }
    }

    /**
     * Resolve the command class out of an imported module. Prefers the export
     * named after the file, then a `default` export, then the first exported
     * constructor — because a file's name and its exported class name do not
     * always match.
     *
     * @param mod   The imported module namespace.
     * @param name  The file name without extension.
     */
    private resolveCommandClass (
        mod: Record<string, unknown>,
        name: string
    ): (new (...args: any[]) => Command<A>) | undefined {
        const named = mod[name]

        if (this.isCommandClass(named)) return named
        if (this.isCommandClass(mod.default)) return mod.default

        return Object.values(mod).find(value => this.isCommandClass(value))
    }

    /**
     * Whether a value is a Command class (constructor), as opposed to any other
     * exported function/class.
     *
     * The check is structural — it looks for `getSignature` on the prototype
     * rather than using `instanceof Command` — so it stays correct when the
     * discovered command extends a Command from a different copy/version of
     * musket. Crucially, it rejects non-command exports such as the shared
     * bundler chunks tools like tsdown can emit alongside built commands (e.g. a
     * `Rebuilder` helper), which would otherwise be `new`-ed and then crash when
     * `getSignature()` is called on them.
     *
     * @param value  The candidate export.
     */
    private isCommandClass (value: unknown): value is (new (...args: any[]) => Command<A>) {
        return typeof value === 'function'
            && typeof (value as { prototype?: { getSignature?: unknown } }).prototype?.getSignature === 'function'
    }

    /**
     * Emit a non-fatal command-discovery warning.
     *
     * @param message
     */
    private warnDiscovery (message: string) {
        Logger.log([
            ['[musket]', 'yellow'],
            [message, 'white']
        ], ' ')
    }

    /**
     * Push a new command into the commands stack.
     *
     * Resolution prefers a command's structured signature (built via
     * {@link Command.buildSignature}) and falls back to parsing its signature
     * string. Commands that expose no usable signature are skipped with a warning
     * rather than crashing the CLI, and a command whose key was already
     * registered is ignored (de-duplication — see {@link registeredKeys}).
     *
     * @param command
     */
    addCommand (command: Command<A>) {
        if (!command || typeof command.getSignature !== 'function') {
            this.warnDiscovery(`Skipping ${this.describeCommand(command)}: not a valid command (no getSignature()).`)

            return this
        }

        let parsed: ParsedCommand<A> | undefined

        try {
            parsed = command.toParsedSignature?.()
                ?? Signature.parseSignature(command.getSignature(), command)
        } catch (error) {
            this.warnDiscovery(`Skipping ${this.describeCommand(command)}: ${(error as Error)?.message ?? String(error)}`)

            return this
        }

        if (!parsed || !parsed.baseCommand) {
            this.warnDiscovery(`Skipping ${this.describeCommand(command)}: empty or unparsable signature.`)

            return this
        }

        const key = parsed.isNamespaceCommand ? `${parsed.baseCommand}:` : parsed.baseCommand

        if (this.registeredKeys.has(key)) {
            return this
        }

        this.registeredKeys.add(key)
        this.commands.push(parsed)

        return this
    }

    /**
     * A best-effort human label for a command, for diagnostics.
     *
     * @param command
     */
    private describeCommand (command: unknown): string {
        return (command as { constructor?: { name?: string } })?.constructor?.name ?? 'command'
    }

    /**
     * Push a list of new commands to commands stack
     *
     * @param command
     */
    registerCommands (commands: Command<A>[]) {
        commands.forEach(e => this.addCommand(e))

        return this
    }

    /**
     * Get all the registered commands
     */
    getRegisteredCommands (): ParsedCommand[] {
        return this.commands
    }

    private async initialize () {
        // Build the app if the user is calling for help to ensure we get the latest data
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            await this.rebuild('help')
        }

        /**
         * Render the provided packages versions (single source of truth shared
         * with ListCommand, fully overridable via KernelConfig).
         */
        const moduleVersions = this.kernel.getVersionString()

        const additional = {
            quiet: ['-q, --quiet', 'Do not output any message except errors and warnings'],
            silent: ['--silent', 'Do not output any message'],
            verbose: ['-v, --verbose [level]', 'Increase the verbosity of messages: 1 for normal output, 2 and v for more verbose output and 3 and vv for debug'],
            noInteraction: ['-n, --no-interaction', 'Do not ask any interactive question'],
        }

        if (!this.config.rootCommand) {
            /** 
             * Run the base Command if a root command was not defined
             */
            this.program
                .name(this.name)
                .version(moduleVersions)
                .description(this.config.logo ?? altLogo)
                .configureHelp({ showGlobalOptions: true })
                .addOption(new Option(additional.quiet[0], additional.quiet[1]))
                .addOption(new Option(additional.silent[0], additional.silent[1]).implies({ quiet: true }))
                .addOption(new Option(additional.verbose[0], additional.verbose[1]).choices(['1', '2', '3', 'v', 'vv']).default('1'))
                .addOption(new Option(additional.noInteraction[0], additional.noInteraction[1]))
                .action(async () => {
                    const instance = new ListCommand(this.app, this.kernel)
                    instance.setInput(this.program.opts(), this.program.args, this.program.registeredArguments, {}, this.program)
                    await this.handle(instance)
                })
        } else {
            /**
             * Load the root command here
             */
            const root = new this.config.rootCommand(this.app, this.kernel)
            const sign = root.toParsedSignature?.()
                ?? Signature.parseSignature(root.getSignature(), root)
            const cmd = this.program
                .name(sign.baseCommand)
                .description(sign.description ?? sign.baseCommand)
                .configureHelp({ showGlobalOptions: true })
                .action(async () => {
                    root.setInput(this.program.opts(), this.program.args, this.program.registeredArguments, {}, this.program)
                    await this.handle(root)
                })
            if ((sign.options?.length ?? 0) > 0) {
                sign.options
                    ?.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                    .forEach(opt => {
                        this.makeOption(opt, cmd)
                    })
            }
        }

        /**
         * Format the help command display
         */
        this.program.configureHelp({
            styleTitle: (str) => Logger.log(str, 'yellow', false),
            styleOptionTerm: (str) => Logger.log(str, 'green', false),
            styleArgumentTerm: (str) => Logger.log(str, 'green', false),
            styleSubcommandTerm: (str) => Logger.log(str, 'green', false),
            formatItemList (heading, items) {
                if (items.length < 1) {
                    return []
                }

                if (!heading.includes('Commands:')) {
                    return items
                }

                const c = (str: string) => str.replace(/[^A-Za-z0-9-,]/g, '').replace('32m', '')

                let flags = items.filter(e => c(e).startsWith('--') || c(e).includes(',--'))

                if (flags.length > 0) {
                    flags = [Logger.log('\n' + heading + '\n', 'yellow', false)].concat(flags)
                }

                const list = items.filter(e => !c(e).startsWith('--') && !c(e).includes(',--'))

                if (list.length < 1) {
                    return flags
                }

                const _heading = c(heading).includes('Arguments') ? heading : 'Available Commands:'

                return flags.concat(Logger.log(`\n${_heading}`, 'yellow', false), ListCommand.groupItems(list, true))
            },
            showGlobalOptions: true
        })

        /** 
         * Loop through all the available commands
         */
        for (let i = 0; i < this.commands.length; i++) {
            const command = this.commands[i]
            const instance = command.commandClass

            if (command.isNamespaceCommand && command.subCommands) {
                /**
                 * Initialize the base command
                 */
                const cmd = command.isHidden
                    ? this.program
                    : this.program
                        .command(command.baseCommand)
                        .description(command.description ?? '')
                        .action(async () => {
                            instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, command, this.program)
                            await this.handle(instance)
                        })

                /**
                 * Add options to the base command if it has any
                 */
                if ((command.options?.length ?? 0) > 0) {
                    command.options
                        ?.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                        .forEach(opt => {
                            this.makeOption(opt, cmd)
                        })
                }

                /**
                 * Initialize the sub commands
                 */
                command
                    .subCommands
                    .filter((v, i, a) => !v.shared && a.findIndex(t => t.name === v.name) === i)
                    .forEach(sub => {
                        const cmd = this.program
                            .command(`${command.baseCommand}:${sub.name}`)
                            .description(sub.description || '')
                            .action(async () => {
                                instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, sub, this.program)
                                await this.handle(instance)
                            })

                        /**
                         * Add the shared arguments here
                         */
                        command.subCommands?.filter(e => e.shared).forEach(opt => {
                            this.makeOption(opt, cmd, false, sub)
                        })

                        /**
                         * Add the shared options here
                         */
                        command.options?.filter(e => e.shared).forEach(opt => {
                            this.makeOption(opt, cmd, false, sub)
                        })

                        /**
                         * Add options to the sub command if it has any
                         */
                        if (sub.nestedOptions) {
                            sub.nestedOptions
                                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                                .forEach(opt => {
                                    this.makeOption(opt, cmd)
                                })
                        }
                    })
            } else {
                /**
                 * Initialize command with options
                 */
                const cmd = this.program
                    .command(command.baseCommand)
                    .description(command.description ?? '')

                command
                    ?.options
                    ?.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                    .forEach(opt => {
                        this.makeOption(opt, cmd, true)
                    })

                cmd.action(async () => {
                    instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, command, this.program)
                    await this.handle(instance)
                })
            }
        }

        /** 
         * Rebuild the app on every command except fire so we wont need TS
         */
        this.program.hook('preAction', async (_, cmd) => {
            this.rebuild(cmd.name())
        })

        return this.program
    }

    async rebuild (name: string) {
        if (name !== 'fire' && name !== 'build' && this.config.allowRebuilds) {
            const build = await this.resolveTsdownBuild()

            await build({
                ...this.tsDownConfig,
                logLevel: 'silent',
                watch: false,
                plugins: []
            })
        }
    }

    private async resolveTsdownBuild () {
        try {
            const moduleName = 'tsdown'
            const module = await import(moduleName) as {
                build?: (config: MusketBuildConfig) => Promise<unknown>
            }

            if (typeof module.build === 'function') {
                return module.build
            }
        } catch (cause) {
            throw new Error(
                'Musket rebuilds require the optional "tsdown" package. Install it in your application to use allowRebuilds.',
                { cause }
            )
        }

        throw new Error('The installed "tsdown" package does not export a build function.')
    }

    private makeOption (opt: CommandOption, cmd: Commander, parse?: boolean, parent?: any) {
        const description = opt.description?.replace(/\[(\w+)\]/g, (_, k) => parent?.[k] ?? `[${k}]`) ?? ''
        const type = opt.name.replaceAll('-', '')

        if (opt.isFlag) {
            if (parse) {
                let flags = (opt.flags ?? [])
                    .map(flag => {
                        if (flag.length === 1) {
                            return '-' + flag
                        } else if (flag.startsWith('--')) {
                            return flag
                        }

                        return flag
                    })
                    .join(', ') ?? ''

                if (opt.required && !opt.placeholder) {
                    flags += ` <${type}>`
                } else if (opt.placeholder) {
                    flags += ' ' + opt.placeholder
                }

                let optn = new Option(flags || '', description).default(opt.defaultValue)
                if (opt.choices && opt.choices.length) {
                    optn = optn.choices(opt.choices ?? [])
                }
                cmd.addOption(optn)
            } else {
                let flags = opt.flags?.join(', ') ?? ''

                if (opt.required && !opt.placeholder) {
                    flags += ` <${type}>`
                } else if (opt.placeholder) {
                    flags += ' ' + opt.placeholder
                }

                let optn = new Option(flags, description).default(opt.defaultValue)
                if (opt.choices && opt.choices.length) {
                    optn = optn.choices(opt.choices ?? [])
                }
                cmd.addOption(optn)
            }
        } else {
            let name = opt.placeholder
            if (!name) {
                name = opt.required ? `<${opt.name}>` : `[${opt.name}]`
            }

            let arg = new Argument(name, description)
            if (opt.choices && opt.choices.length) {
                arg = arg.choices(opt.choices ?? [])
            }
            if (opt.defaultValue) arg.default(opt.defaultValue)
            cmd.addArgument(arg)
        }
    }

    private async handle (cmd: Command<A>) {
        if (this.resolver) {
            return await this.resolver(cmd, 'handle')
        }

        await cmd.handle(this.app)
    }

    static async parse<E extends boolean = false, A extends Application = Application> (
        kernel: Kernel<A>,
        config: KernelConfig<A>,
        returnExit?: E
    ): Promise<E extends true ? number : Commander>
    static async parse<E extends boolean = false, A extends Application = Application> (
        kernel: Kernel<A>,
        config: KernelConfig<A>,
        commands: typeof Command<A>[],
        returnExit?: E
    ): Promise<E extends true ? number : Commander>
    static async parse<_E extends boolean = false, A extends Application = Application> (
        kernel: Kernel<A>,
        config: KernelConfig<A> = {},
        extraCommands: typeof Command<A>[] | boolean = [],
        returnExit: boolean = false
    ) {
        let exitCode = 0
        if (typeof extraCommands === 'boolean') {
            returnExit = extraCommands
            extraCommands = []
        }

        const commands = config.baseCommands?.concat(extraCommands)?.map(e => new e(kernel.app, kernel))
        const cli = new Musket(kernel.app, kernel, commands, config.resolver, config.tsDownConfig).configure(config)
        if (config.name) cli.name = config.name

        const command = (await cli.build())
            .exitOverride((e) => {
                exitCode = e.exitCode
                if (e.exitCode <= 0) return
                Logger.log('Unknown command or argument.', 'white')
                Logger.log([
                    ['Run', 'white'],
                    [`\`${config.name} --help\``, ['grey', 'italic']],
                    ['to see available commands.', 'white']
                ], ' ')
            })

        if (!config.skipParsing) {
            await command
                .parseAsync(process.argv)
                .catch(e => config.exceptionHandler?.(e) || void e)
        }

        if (cli.app) {
            cli.app.musket = cli
        }

        if (returnExit === true) {
            return exitCode
        }

        return command
    }

}
