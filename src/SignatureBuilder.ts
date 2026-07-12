import type { CommandOption, ParsedCommand } from './Contracts/ICommand'

import type { Application } from './Contracts/Application'
import type { Command } from './Core/Command'

export type SignatureValue = string | number | boolean | string[] | undefined

/**
 * Definition of a positional argument added via {@link SignatureBuilder.argument}.
 */
export interface ArgumentDefinition {
    /** Human readable description. */
    description?: string
    /** Whether the argument must be provided. Defaults to `true`. */
    required?: boolean
    /** A default value. Implies the argument is optional. */
    default?: SignatureValue
    /** Whether the argument accepts multiple (variadic) values. */
    multiple?: boolean
    /** Restrict the accepted values to this list. */
    choices?: string[]
}

/**
 * Definition of an option/flag added via {@link SignatureBuilder.option}.
 *
 * By default an option is a boolean flag. Give it a `default`, set
 * `requiresValue`, or set `optionalValue` to make it take a value.
 */
export interface OptionDefinition {
    /** Human readable description. */
    description?: string
    /** A single character short alias, e.g. `Q` for `-Q`. */
    short?: string
    /** A default value. Implies the option takes an optional value. */
    default?: SignatureValue
    /** The option requires a value (`--queue <value>`). */
    requiresValue?: boolean
    /** The option takes an optional value (`--queue [value]`). */
    optionalValue?: boolean
    /** Restrict the accepted values to this list. */
    choices?: string[]
    /** Share this option with sub-commands of a namespace command. */
    shared?: boolean
    /** Hide this option from help output. */
    hidden?: boolean
}

interface BuiltArgument extends ArgumentDefinition {
    name: string
}

interface BuiltOption extends OptionDefinition {
    name: string
}

/**
 * A fluent builder for constructing a command's signature programmatically,
 * without authoring the string DSL by hand.
 *
 * ```ts
 * buildSignature (sig: SignatureBuilder) {
 *   return sig
 *     .command('queue:work')
 *     .describe('Process jobs on the queue')
 *     .argument('connection', { description: 'The connection to work', required: false })
 *     .option('queue', { description: 'The queue to process', short: 'Q' })
 *     .option('once', { description: 'Process a single job and exit' })
 * }
 * ```
 *
 * Musket consumes the builder directly (lossless) for normal commands, and can
 * also reconstruct the equivalent signature string via {@link toString} for
 * anything that still expects the DSL.
 */
export class SignatureBuilder {
    private baseName = ''
    private commandDescription?: string
    private hidden = false
    private args: BuiltArgument[] = []
    private opts: BuiltOption[] = []

    /**
     * Set the command name, e.g. `make:model` or `queue:work`. A trailing `:`
     * marks a namespace command.
     */
    command (name: string): this {
        this.baseName = name.trim()

        return this
    }

    /** 
     * Alias for {@link command}. 
     * 
     * @param name 
     * @returns 
     */
    name (name: string): this {
        return this.command(name)
    }

    /** 
     * Set the command description. 
     * 
     * @param name 
     * @returns 
     */
    describe (description: string): this {
        this.commandDescription = description

        return this
    }

    /** 
     * Alias for {@link describe}. 
     * 
     * @param name 
     * @returns 
     */
    description (description: string): this {
        return this.describe(description)
    }

    /** 
     * Mark the command as hidden from help output. 
     * 
     * @param name 
     * @returns 
     */
    hide (hidden = true): this {
        this.hidden = hidden

        return this
    }

    /** 
     * Add a positional argument. 
     * 
     * @param name 
     * @returns 
     */
    argument (name: string, definition: ArgumentDefinition = {}): this {
        this.args.push({ name: name.trim(), ...definition })

        return this
    }

    /**
     * Add an option/flag.
     *
     * By default an option is a boolean flag. The name accepts an optional short
     * alias inline using the DSL's `short|long` syntax, with or without leading
     * dashes:
     *
     * ```ts
     * sig.option('dev')          // --dev
     * sig.option('--dev')        // --dev
     * sig.option('--d|dev')      // -d, --dev
     * sig.option('d|dev')        // -d, --dev
     * ```
     *
     * A `short` provided in the {@link OptionDefinition} takes precedence over
     * one parsed from the name.
     *
     * @param name
     * @returns
     */
    option (name: string, definition: OptionDefinition = {}): this {
        const { long, short } = this.parseOptionName(name)

        this.opts.push({ ...definition, name: long, short: definition.short ?? short })

        return this
    }

    /**
     * Parse an option name into its long name and optional short alias. Supports
     * the `short|long` DSL syntax (e.g. `--d|dev`), independent of dash prefixes
     * and part ordering. A single-character part is treated as the short alias;
     * a multi-character part is the long name.
     */
    private parseOptionName (raw: string): { long: string, short?: string } {
        const parts = raw
            .split('|')
            .map(part => part.replace(/^--?/, '').trim())
            .filter(Boolean)

        let long: string | undefined
        let short: string | undefined

        for (const part of parts) {
            if (part.length === 1 && short === undefined) {
                short = part
            } else {
                long ??= part
            }
        }

        long ??= short ?? ''

        if (long === short) {
            short = undefined
        }

        return { long, short }
    }

    /** 
     * The configured command name (empty when unset). 
     * 
     * @param name 
     * @returns 
     */
    getName (): string {
        return this.baseName
    }

    /** 
     * The configured description, if any. 
     * 
     * @param name 
     * @returns 
     */
    getDescription (): string | undefined {
        return this.commandDescription
    }

    /** 
     * Whether the command is a namespace command (name ends with `:`). 
     * 
     * @param name 
     * @returns 
     */
    isNamespace (): boolean {
        return this.baseName.endsWith(':')
    }

    /** 
     * Whether anything has been configured on this builder. 
     * 
     * @param name 
     * @returns 
     */
    isEmpty (): boolean {
        return this.baseName.length === 0
    }

    /**
     * Build the structured {@link ParsedCommand} consumed by the kernel. This is
     * lossless — no string round-trip — and is the path used for normal commands.
     * 
     * @param commandClass 
     * @returns 
     */
    toParsed<A extends Application = Application> (commandClass: Command<A>): ParsedCommand<A> {
        const options: CommandOption[] = [
            ...this.args.map(arg => this.argumentToOption(arg)),
            ...this.opts.map(opt => this.optionToOption(opt)),
        ]

        return {
            baseCommand: this.baseName,
            isNamespaceCommand: false,
            description: this.commandDescription ?? commandClass.getDescription(),
            commandClass,
            options,
            isHidden: this.hidden,
        }
    }

    private argumentToOption (arg: BuiltArgument): CommandOption {
        const required = arg.required ?? arg.default === undefined
        const multiple = arg.multiple ?? false

        let placeholder: string | undefined

        if (multiple) {
            placeholder = required ? `<${arg.name}...>` : `[${arg.name}...]`
        }

        return {
            name: arg.name,
            isFlag: false,
            required,
            multiple,
            description: arg.description ?? '',
            choices: arg.choices ?? [],
            defaultValue: arg.default,
            placeholder,
        }
    }

    private optionToOption (opt: BuiltOption): CommandOption {
        const long = `--${opt.name}`
        const flags = opt.short ? [`-${opt.short}`, long] : [long]
        const takesValue = opt.default !== undefined
            || opt.requiresValue === true
            || opt.optionalValue === true
            || (opt.choices?.length ?? 0) > 0

        let required = false
        let placeholder: string | undefined

        if (takesValue) {
            if (opt.requiresValue === true && opt.default === undefined && opt.optionalValue !== true) {
                required = true
            } else {
                placeholder = `[${opt.name}]`
            }
        }

        return {
            name: long,
            flags,
            isFlag: true,
            required,
            placeholder,
            description: opt.description ?? '',
            choices: opt.choices ?? [],
            defaultValue: opt.default ?? (takesValue ? undefined : false),
            shared: opt.shared,
            isHidden: opt.hidden,
        }
    }

    /**
     * Reconstruct the equivalent signature string in musket's DSL. Used by
     * {@link Command.getSignature} so external consumers (and the namespace path)
     * keep working unchanged.
     */
    toString (): string {
        const tokens = [this.baseName]

        for (const arg of this.args) {
            tokens.push(this.argumentToken(arg))
        }

        for (const opt of this.opts) {
            tokens.push(this.optionToken(opt))
        }

        return tokens.join('\n        ')
    }

    private argumentToken (arg: BuiltArgument): string {
        const required = arg.required ?? arg.default === undefined
        const multiple = arg.multiple ?? false

        let token = arg.name

        if (arg.default !== undefined) {
            token += `=${arg.default}`
        } else if (!required && multiple) {
            token += '?*'
        } else if (multiple) {
            token += '*'
        } else if (!required) {
            token += '?'
        }

        return this.wrap(token, arg.description, arg.choices)
    }

    private optionToken (opt: BuiltOption): string {
        const takesValue = opt.default !== undefined
            || opt.requiresValue === true
            || opt.optionalValue === true

        let token = opt.short ? `--${opt.short}|${opt.name}` : `--${opt.name}`

        if (opt.default !== undefined) {
            token += `=${opt.default}`
        } else if (opt.requiresValue === true && opt.optionalValue !== true) {
            token += '='
        } else if (opt.optionalValue === true) {
            token += '?'
        }

        return this.wrap(token, opt.description, opt.choices, takesValue)
    }

    private wrap (token: string, description?: string, choices?: string[], _value?: boolean): string {
        let body = token

        if (description) {
            body += ` : ${description}`
        }

        if (choices?.length) {
            body += ` : [${choices.join(', ')}]`
        }

        return `{${body}}`
    }
}
