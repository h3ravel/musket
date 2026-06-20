import { describe, expect, it, vi } from 'vitest'

import { Command } from '../src/Core/Command'
import { Kernel } from '../src/Core/Kernel'
import type { KernelConfig } from '../src/Contracts/ICommand'
import { Logger } from '@h3ravel/shared'
import { version } from '../package.json'

class App {
    registeredCommands: typeof Command[] = []
    version = '9.9.9'
}

// eslint-disable-next-line no-control-regex
const strip = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, '')

const versionLine = (config: KernelConfig) => {
    const kernel = new Kernel(new App())
        .setConfig(config)
        .setPackages(config.packages ?? [])
        .bootstrap()

    return strip(kernel.getVersionString())
}

describe('Version rendering', () => {
    it('renders the default `Label: version` layout joined with " | "', () => {
        const line = versionLine({ name: 'MyCLI' })

        expect(line).toBe(`MyCLI: ${version} | Musket CLI: 9.9.9`)
    })

    it('honors a custom versionSeparator', () => {
        const line = versionLine({ name: 'MyCLI', versionSeparator: '  •  ' })

        expect(line).toBe(`MyCLI: ${version}  •  Musket CLI: 9.9.9`)
    })

    it('applies per-package label and version overrides', () => {
        const line = versionLine({
            hideMusketInfo: true,
            packages: [{ name: 'commander', label: 'Commander Engine', version: '1.2.3' }],
        })

        expect(line).toBe('Commander Engine: 1.2.3')
    })

    it('fully overrides rendering through versionFormatter', () => {
        const line = versionLine({
            name: 'MyCLI',
            versionFormatter: (modules, helpers) =>
                modules.map(m => `${helpers.label(m)}@${m.version}`).join(' / '),
        })

        expect(line).toBe(`MyCLI@${version} / Musket CLI@9.9.9`)
    })

    it('exposes default formatter + separator helpers to versionFormatter', () => {
        const line = versionLine({
            name: 'MyCLI',
            versionFormatter: (modules, helpers) =>
                `[${modules.map(helpers.format).join(helpers.separator)}]`,
        })

        expect(line).toBe(`[MyCLI: ${version} | Musket CLI: 9.9.9]`)
    })

    it('passes configured versionColors through to the renderer', () => {
        const parse = vi.spyOn(Logger, 'parse')

        const line = versionLine({ name: 'MyCLI', versionColors: { label: 'cyan', version: 'magenta' } })

        // Text is preserved (color support varies by environment), and the
        // configured colors reach the underlying Logger.parse call.
        expect(line).toBe(`MyCLI: ${version} | Musket CLI: 9.9.9`)
        expect(parse).toHaveBeenCalledWith(
            [['MyCLI:', 'cyan'], [`${version}`, 'magenta']],
            ' ',
            false,
        )

        parse.mockRestore()
    })
})
