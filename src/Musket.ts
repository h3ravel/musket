
import { CommandOption, InitConfig, ParsedCommand } from './Contracts/ICommand'
import { Argument, Option, program, type Command as Commander } from 'commander'

import { Command } from './Core/Command'
import { Kernel } from './Core/Kernel'
import { Logger } from '@h3ravel/shared'
import { Signature } from './Signature'
import { altLogo } from './logo'
import { build, Options } from 'tsdown'
import { glob } from 'glob'
import path from 'node:path'
import { HelpCommand } from './Commands/HelpCommand'
import { ListCommand } from './Commands/ListCommand'
import { Application } from './Contracts/Application'
import { Arr, Str } from '@h3ravel/support'


export class Musket {
    /**
     * The name of the CLI app we're building
     * 
     * @default musket
     */
    public cliName: string = 'musket'
    private config: InitConfig = {}
    private commands: ParsedCommand[] = []

    constructor(
        private app: Application,
        private kernel: Kernel,
        private baseCommands: Command[] = [],
        private resolver?: NonNullable<InitConfig['resolver']>,
        private tsDownConfig: Options = {}
    ) { }

    async build () {
        this.loadBaseCommands()
        await this.loadDiscoveredCommands()
        return await this.initialize()
    }

    private loadBaseCommands () {
        const commands: Command[] = this.baseCommands.concat([
            new HelpCommand(this.app, this.kernel),
            new ListCommand(this.app, this.kernel),
        ])

        commands.forEach(e => this.addCommand(e))
    }

    /**
     * Provide the configuration to initialize the CLI with
     * 
     * @param config 
     * @returns 
     */
    public configure (config: InitConfig) {
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
        const commands: Command[] = [
            ...(this.app.registeredCommands ?? []).map(cmd => new cmd(this.app, this.kernel))
        ]

        const paths = Arr.wrap(this.config.discoveryPaths)

        /**
         * CLI Commands auto registration
         */
        for await (const pth of glob.stream(paths)) {
            const name = path.basename(pth).replace('.js', '').replace('.mjs', '').replace('.ts', '')
            try {
                const cmdClass = (await import(pth))[name]
                commands.push(new cmdClass(this.app, this.kernel))
            } catch { /** */ }
        }

        commands.forEach(e => this.addCommand(e))
    }

    addCommand (command: Command) {
        this.commands.push(Signature.parseSignature(command.getSignature(), command))
    }

    private async initialize () {
        // Build the app if the user is calling for help to ensure we get the latest data
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            await this.rebuild('help')
        }

        /** 
         * Get the provided packages versions
         */
        const moduleVersions = this.kernel.modules.map(e => {
            return Logger.parse([
                [`${Str.of(e.alias ?? e.name).afterLast('/').ucfirst().replace(['-', '_'], ' ').replace('cli', 'CLI', false)}:`, 'white'],
                [e.version, 'green']
            ], ' ', false)
        }).join(' | ')

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
            program
                .name(this.cliName)
                .version(moduleVersions)
                .description(this.config.logo ?? altLogo)
                .configureHelp({ showGlobalOptions: true })
                .addOption(new Option(additional.quiet[0], additional.quiet[1]))
                .addOption(new Option(additional.silent[0], additional.silent[1]).implies({ quiet: true }))
                .addOption(new Option(additional.verbose[0], additional.verbose[1]).choices(['1', '2', '3', 'v', 'vv']).default('1'))
                .addOption(new Option(additional.noInteraction[0], additional.noInteraction[1]))
                .action(async () => {
                    const instance = new ListCommand(this.app, this.kernel)
                    instance.setInput(program.opts(), program.args, program.registeredArguments, {}, program)
                    await this.handle(instance)
                })
        } else {
            /**
             * Load the root command here
             */
            const root = new this.config.rootCommand(this.app, this.kernel)
            const sign = Signature.parseSignature(root.getSignature(), root)
            const cmd = program
                .name(sign.baseCommand)
                .description(sign.description ?? sign.baseCommand)
                .configureHelp({ showGlobalOptions: true })
                .action(async () => {
                    root.setInput(program.opts(), program.args, program.registeredArguments, {}, program)
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
        program.configureHelp({
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
                    ? program
                    : program
                        .command(command.baseCommand)
                        .description(command.description ?? '')
                        .action(async () => {
                            instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, command, program)
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
                        const cmd = program
                            .command(`${command.baseCommand}:${sub.name}`)
                            .description(sub.description || '')
                            .action(async () => {
                                instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, sub, program)
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
                const cmd = program
                    .command(command.baseCommand)
                    .description(command.description ?? '')

                command
                    ?.options
                    ?.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                    .forEach(opt => {
                        this.makeOption(opt, cmd, true)
                    })

                cmd.action(async () => {
                    instance.setInput(cmd.opts(), cmd.args, cmd.registeredArguments, command, program)
                    await this.handle(instance)
                })
            }
        }

        /** 
         * Rebuild the app on every command except fire so we wont need TS
         */
        program.hook('preAction', async (_, cmd) => {
            this.rebuild(cmd.name())
        })

        return program
    }

    async rebuild (name: string) {
        if (name !== 'fire' && name !== 'build' && this.config.allowRebuilds) {
            await build({
                ...this.tsDownConfig,
                logLevel: 'silent',
                watch: false,
                plugins: []
            })
        }
    }

    private makeOption (opt: CommandOption, cmd: Commander, parse?: boolean, parent?: any) {
        const description = opt.description?.replace(/\[(\w+)\]/g, (_, k) => parent?.[k] ?? `[${k}]`) ?? ''
        const type = opt.name.replaceAll('-', '')

        if (opt.isFlag) {
            if (parse) {
                let flags = opt.flags
                    ?.map(f => (f.length === 1 ? `-${f}` : `--${f.replace(/^-+/, '')}`))
                    .join(', ') ?? undefined

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

    private async handle (cmd: Command) {
        if (this.resolver) {
            return await this.resolver(cmd, 'handle')
        }

        await cmd.handle(this.app)
    }

    static async parse (
        kernel: Kernel,
        config: InitConfig = {}
    ) {
        const commands = config.baseCommands?.map(e => new e(kernel.app, kernel))
        const cli = new Musket(kernel.app, kernel, commands, config.resolver, config.tsDownConfig).configure(config)
        if (config.cliName) cli.cliName = config.cliName

        const command = (await cli.build())
            .exitOverride((e) => {
                if (e.exitCode <= 0) return
                Logger.log('Unknown command or argument.', 'white')
                Logger.log([
                    ['Run', 'white'],
                    [`\`${config.cliName} --help\``, ['grey', 'italic']],
                    ['to see available commands.', 'white']
                ], ' ')
            })

        if (!config.skipParsing) {
            await command.parseAsync(process.argv).catch(e => e)
        }

        if (cli.app) {
            cli.app.musket = cli
        }

        return command
    }

}
