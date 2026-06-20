import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Command } from '../src/Core/Command'
import { DupCommand } from './DiscoveryFixtures/Dup'
import { Kernel } from '../src/Core/Kernel'
import path from 'node:path'

class App {
    registeredCommands: typeof Command[] = []
    musket?: unknown
}

const fixtures = (glob: string) => path.join(process.cwd(), 'tests/DiscoveryFixtures', glob)

const registeredNames = async (config: Record<string, unknown>) => {
    const program = await Kernel.init(new App(), {
        cliName: 'musket-cli',
        skipParsing: true,
        ...config,
    })

    return program.commands.map(c => c.name())
}

let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
})

afterEach(() => {
    logSpy.mockRestore()
    vi.restoreAllMocks()
})

describe('Command discovery', () => {
    it('resolves a default-export command whose class name differs from the file name', async () => {
        const names = await registeredNames({ discoveryPaths: [fixtures('Renamed.ts')] })

        expect(names).toContain('disc:renamed')
    })

    it('uses a custom importModule override when provided', async () => {
        class InjectedCommand extends Command {
            protected signature = 'disc:injected'
            protected description = 'Injected via importModule'
            public async handle () { /** */ }
        }

        const importModule = vi.fn(async () => ({ InjectedCommand }))

        const names = await registeredNames({
            // The path is never read from disk — importModule short-circuits it.
            discoveryPaths: [fixtures('Injected.ts')],
            importModule,
        })

        expect(importModule).toHaveBeenCalledWith(fixtures('Injected.ts'))
        expect(names).toContain('disc:injected')
    })

    it('reports a failing command file instead of silently swallowing it', async () => {
        const error = new Error('boom')
        const importModule = vi.fn(async () => { throw error })

        const names = await registeredNames({
            discoveryPaths: [fixtures('Broken.ts')],
            importModule,
        })

        // Discovery keeps going (base commands still registered) and the failure
        // is surfaced rather than hidden.
        expect(names).toContain('list')
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to load command'),
        )
    })

    it('ignores non-command exports (e.g. bundler chunks) instead of crashing', async () => {
        // Chunk.ts exports a `Rebuilder` class with no getSignature(); discovery
        // must skip it and keep the CLI alive rather than `new`-ing it and
        // crashing when getSignature() is later called.
        const names = await registeredNames({ discoveryPaths: [fixtures('Chunk.ts')] })

        expect(names).toContain('list')
        expect(names).not.toContain('rebuilder')
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('No command class export found'),
        )
    })

    it('registers a command only once when it surfaces from multiple sources', async () => {
        // Registered as a base command AND discovered from disk — the same
        // command from two sources (mirrors dist/*.js + src/*.ts) must dedupe.
        const names = await registeredNames({
            baseCommands: [DupCommand],
            discoveryPaths: [fixtures('Dup.ts')],
        })

        expect(names.filter(name => name === 'disc:dup')).toHaveLength(1)
    })
})
