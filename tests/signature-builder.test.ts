import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { type Command as Commander } from 'commander'
import { Command } from '../src/Core/Command'
import { Kernel } from '../src/Core/Kernel'
import { Signature } from '../src/Signature'
import { SignatureBuilder } from '../src/SignatureBuilder'
import chalk from 'chalk'
import path from 'node:path'
import { Application } from '../src/Contracts/Application'

class App extends Application {
    registeredCommands: typeof Command[] = []
}

const stubCommand = { getDescription: () => undefined } as unknown as Command

describe('SignatureBuilder', () => {
    it('builds a structured ParsedCommand without a string round-trip', () => {
        const parsed = new SignatureBuilder()
            .command('queue:work')
            .describe('Process jobs on the queue')
            .argument('connection', { description: 'The connection', required: false })
            .option('queue', { short: 'Q', description: 'The queue', default: 'default' })
            .option('once', { description: 'Process a single job' })
            .toParsed(stubCommand)

        expect(parsed.baseCommand).toBe('queue:work')
        expect(parsed.isNamespaceCommand).toBe(false)
        expect(parsed.description).toBe('Process jobs on the queue')

        const connection = parsed.options?.find(o => o.name === 'connection')
        expect(connection).toMatchObject({ isFlag: false, required: false })

        const queue = parsed.options?.find(o => o.name === '--queue')
        expect(queue).toMatchObject({
            isFlag: true,
            flags: ['-Q', '--queue'],
            defaultValue: 'default',
            placeholder: '[queue]',
        })

        const once = parsed.options?.find(o => o.name === '--once')
        expect(once).toMatchObject({ isFlag: true, flags: ['--once'], required: false, defaultValue: false })
    })

    it('parses inline short|long boolean flag syntax in the option name', () => {
        const parsed = new SignatureBuilder()
            .command('serve')
            .option('--d|dev', { description: 'Run in dev mode' })
            .option('--watch')
            .option('watch-poll')
            .toParsed(stubCommand)

        const dev = parsed.options?.find(o => o.name === '--dev')
        expect(dev).toMatchObject({
            isFlag: true,
            flags: ['-d', '--dev'],
            required: false,
            defaultValue: false,
        })

        const watch = parsed.options?.find(o => o.name === '--watch')
        expect(watch).toMatchObject({ isFlag: true, flags: ['--watch'], defaultValue: false })

        const watchPoll = parsed.options?.find(o => o.name === '--watch-poll')
        expect(watchPoll).toMatchObject({ isFlag: true, flags: ['--watch-poll'], defaultValue: false })
    })

    it('lets an explicit short in the definition win over the inline one', () => {
        const parsed = new SignatureBuilder()
            .command('serve')
            .option('--d|dev', { short: 'D' })
            .toParsed(stubCommand)

        const dev = parsed.options?.find(o => o.name === '--dev')
        expect(dev).toMatchObject({ flags: ['-D', '--dev'] })
    })

    it('reconstructs an equivalent, parseable signature string', () => {
        const builder = new SignatureBuilder()
            .command('report:make')
            .argument('name', { description: 'Report name' })
            .option('format', { default: 'pdf', description: 'Output format' })

        const signature = builder.toString()
        // The reconstructed string must round-trip through the DSL parser.
        const parsed = Signature.parseSignature(signature, stubCommand)

        expect(parsed.baseCommand).toBe('report:make')
        expect(parsed.options?.some(o => o.name === 'name' && !o.isFlag)).toBe(true)
        expect(parsed.options?.some(o => o.name === '--format' && o.defaultValue === 'pdf')).toBe(true)
    })

    it('feeds the description through Command.getDescription/getSignature', () => {
        class BuiltCommand extends Command {
            protected buildSignature(sig: SignatureBuilder) {
                return sig.command('demo:built').describe('Demo description').option('flag')
            }

            public async handle() { /** */ }
        }

        const cmd = new BuiltCommand(new App() as never, {} as never)

        expect(cmd.getDescription()).toBe('Demo description')
        expect(cmd.getSignature()).toContain('demo:built')
        expect(cmd.toParsedSignature()?.baseCommand).toBe('demo:built')
    })

    it('lets the string signature take precedence over buildSignature', () => {
        class MixedCommand extends Command {
            protected signature = 'string:wins'
            protected buildSignature(sig: SignatureBuilder) {
                return sig.command('builder:loses')
            }

            public async handle() { /** */ }
        }

        const cmd = new MixedCommand(new App() as never, {} as never)

        expect(cmd.getSignature()).toBe('string:wins')
        expect(cmd.toParsedSignature()).toBeUndefined()
    })
})

describe('SignatureBuilder integration', () => {
    let app: App
    let program: Commander
    let spy: ReturnType<typeof vi.spyOn>

    beforeAll(async () => {
        app = new App()
        program = await Kernel.init(app, {
            skipParsing: true,
            name: 'musket-cli',
            discoveryPaths: [
                path.join(process.cwd(), 'tests/DiscoveryFixtures/Built.ts'),
                path.join(process.cwd(), 'tests/DiscoveryFixtures/Variadic.ts'),
            ],
        })
    })

    beforeEach(() => {
        spy = vi.spyOn(console, 'log').mockImplementation(() => { })
    })

    afterEach(() => {
        spy.mockRestore()
    })

    it('registers and runs a builder-defined command with its argument and option', async () => {
        await program.parseAsync(['node', 'tests/run', 'disc:built', 'hi', '--loud'])

        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'BUILT')
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'hi')
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'LOUD')
    })

    it('collects every value of a variadic argument into an array', async () => {
        await program.parseAsync(['node', 'tests/run', 'disc:variadic', 'alpha', 'beta', 'gamma'])

        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'alpha|beta|gamma')
    })
})
