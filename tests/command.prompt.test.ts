import { afterEach, beforeAll, beforeEach, describe, expect, it, MockInstance, vi } from "vitest";
import { Command } from "../src/Core/Command";
import { type Command as Commander } from "commander";
import { Kernel } from "../src/Core/Kernel";
import path from "node:path";
import { Prompts } from "@h3ravel/shared";

class App {
    registeredCommands: typeof Command[] = []
}

let app, program: Commander

console.log = vi.fn(() => 0)

vi.mock('@h3ravel/shared', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@h3ravel/shared')>()

    return {
        ...actual, // keep Logger, and any other real exports
        Prompts: {
            choice: vi.fn(),
            anticipate: vi.fn(),
            secret: vi.fn(),
            confirm: vi.fn(),
            ask: vi.fn()
        }
    }
})

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

afterEach(() => {
    vi.resetAllMocks()
})

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Prompts.Choice', () => {

    it('calls select with correct message and choices', async () => {
        const mock = Prompts.choice as any
        mock.mockResolvedValue('Legacy')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'choice']);

        expect(mock).toHaveBeenCalledWith('What is your name?', ['Legacy', 'Kaylah'], 0)
        expect(await mock.getMockImplementation()()).toBe('Legacy')
    })

    it('calls select with correct message and choices but accepts default value', async () => {
        const mock = Prompts.choice as any
        mock.mockResolvedValue('Kaylah')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'choice', '1']);

        expect(mock).toHaveBeenCalledWith('What is your name?', ['Legacy', 'Kaylah'], 1)
        expect(await mock.getMockImplementation()()).toBe('Kaylah')
    })
})

describe('Prompts.Confirm', () => {
    it('asks for confirmation', async () => {
        const mock = Prompts.confirm as any
        mock.mockResolvedValue('y')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'confirm']);

        expect(mock).toHaveBeenCalledWith('Are you ready?', false)
        expect(await mock.getMockImplementation()()).toBe('y')
    })
})

describe('Prompts.Ask', () => {
    it('prompts for answer', async () => {
        const mock = Prompts.ask as any
        mock.mockResolvedValue('Legacy')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'ask']);

        expect(mock).toHaveBeenCalledWith('What is your name?', undefined)
        expect(await mock.getMockImplementation()()).toBe('Legacy')
    })

    it('prompts for answer but accepts default value', async () => {
        await Prompts.ask('What is your name?', 'Legacy')

        expect(Prompts.ask).toHaveBeenCalledWith('What is your name?', 'Legacy')
    })
})


describe('Prompts.Secret', () => {
    it('calls password with default mask (undefined)', async () => {
        const mock = Prompts.secret as any
        mock.mockResolvedValue('hidden')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'secret']);
        expect(mock).toHaveBeenCalledWith('Enter Password', undefined)
        expect(await mock.getMockImplementation()()).toBe('hidden')
    })

    it('calls password with message and mask', async () => {
        const mock = Prompts.secret as any
        mock.mockResolvedValue('my-secret')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'secret', '*']);

        expect(mock).toHaveBeenCalledWith('Enter Password', '*')
        expect(await mock.getMockImplementation()()).toBe('my-secret')
    })
})

describe('Prompts.Anticipate', () => {
    it('calls autocomplete with array source', async () => {
        const mock = Prompts.anticipate as any
        mock.mockResolvedValue('Legacy')

        await program.parseAsync(['node', 'tests/run', 'prompt', 'anticipate', 'banana']);

        expect(mock).toHaveBeenCalledTimes(1)
        expect(mock.mock.calls[0][0]).toBe('Who are you?')
        expect(mock.mock.calls[0][2]).toBe('banana')

        expect(await mock.getMockImplementation()()).toBe('Legacy')
    })
})