import { afterEach, beforeAll, beforeEach, describe, expect, it, MockInstance, vi } from "vitest";
import { Command } from "../src/Core/Command";
import { type Command as Commander } from "commander";
import { Kernel } from "../src/Core/Kernel";
import path from "node:path";
import chalk from "chalk";

class App {
    registeredCommands: typeof Command[] = []
}

let app, spy: MockInstance, program: Commander


beforeAll(async () => {
    app = new App()
    program = await Kernel.init(
        app,
        {
            packages: [{ name: '@h3ravel/shared', alias: 'Shared PKG' }, '@h3ravel/support'],
            skipParsing: true,
            cliName: 'musket-cli',
            discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')]
        }
    )
})

beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => { })
})

afterEach(() => {
    spy.mockRestore()
})

describe('Musket', async () => {
    it('runs the hello command', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'HELLO')
    })

    it('runs the please command', async () => {
        await program.parseAsync(['node', 'tests/run', 'please']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'Please...')
    })

    it('receives the command arguments for the hello command', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello', 'doe']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'doe')
    })

    it('receives the command options for the hello command', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello', '--out', 'now']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'now')
    })

    it('receives the command arguments for the please command ', async () => {
        await program.parseAsync(['node', 'tests/run', 'please', 'dont']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'dont')
    })

    it('receives the command options for the please command ', async () => {
        await program.parseAsync(['node', 'tests/run', 'please', '--out', 'png']);
        expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'png')
    })

    it('will emit debug info when verbosity is 3', async () => {
        await program.parseAsync(['node', 'tests/run', 'please', '-v', 'vv']);
        expect(console.log).toHaveBeenNthCalledWith(3, chalk.gray('🐛'), 'Debug Info')
    })

    it('will not emit debug info when verbosity is less than 3', async () => {
        await program.parseAsync(['node', 'tests/run', 'please', '-v', 'v']);
        expect(console.log).toHaveBeenCalledTimes(2)
    })

    it('will quiet all messages', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello', '--quiet']);
        expect(console.log).toHaveBeenCalledTimes(0)
    })

    it('will silent all messages even with verbose active', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello', '--silent', '-v', 'vv']);
        expect(console.log).toHaveBeenCalledTimes(0)
    })

    it('will not quiet debug messages with verbose active', async () => {
        await program.parseAsync(['node', 'tests/run', 'hello', '--quiet', '-v', 'vv']);
        expect(console.log).toHaveBeenNthCalledWith(1, chalk.gray('🐛'), 'Debug Info')
        expect(console.log).toHaveBeenCalledTimes(1)
    })
})
