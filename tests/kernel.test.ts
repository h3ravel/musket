import { MockInstance, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Command } from "../src/Core/Command";
import { Kernel } from "../src/Core/Kernel";
import { TestCommand } from "./Commands/TestCommand";
import chalk from "chalk";
import path from "node:path";

class App {
    registeredCommands: typeof Command[] = []
}

let app, spy: MockInstance, instance: Kernel
const config = {
    cliName: 'musket-cli',
    discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')],
}
const pacakges = [
    { name: '@h3ravel/shared', alias: 'Shared PKG' },
    '@h3ravel/support',
]


beforeAll(() => {
    app = new App()
    instance = new Kernel(app)
        .setCwd(process.cwd())
        .setConfig(config)
        .setPackages(pacakges)
        .registerCommands([TestCommand])
        .bootstrap();
})

beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => { })
})

afterEach(() => {
    spy.mockRestore()
})

describe('Kernel', () => {
    describe('Initiliazation', () => {
        it('can get the configuration object', async () => {
            expect(instance.getConfig()).toBe(config)
            expect(instance.getConfig().cliName).toBe(config.cliName)
        })

        it('can get the configured cwd', async () => {
            expect(instance.getCwd()).toBe(process.cwd())
        })

        it('can get the configured packages', async () => {
            expect(instance.getPackages()).toBe(pacakges)
        })

        it('runs the test command', async () => {
            const program = await instance.run()
            await program.parseAsync(['node', 'tests/run', 'test']);
            expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ'), 'TEST OK')
        })
    })
})
