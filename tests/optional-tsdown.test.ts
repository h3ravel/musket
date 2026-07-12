import { beforeEach, describe, expect, it, vi } from 'vitest'

const tsdown = vi.hoisted(() => ({
    build: vi.fn(),
    loads: 0,
}))

vi.mock('tsdown', () => {
    tsdown.loads++

    return { build: tsdown.build }
})

import { Musket } from '../src/Musket'

describe('optional tsdown integration', () => {
    beforeEach(() => {
        tsdown.build.mockReset()
    })

    it('does not load tsdown when Musket is imported', () => {
        expect(tsdown.loads).toBe(0)
    })

    it('loads tsdown only when rebuilds are enabled', async () => {
        const musket = Object.create(Musket.prototype) as any
        musket.config = { allowRebuilds: true }
        musket.tsDownConfig = { entry: ['src/index.ts'] }

        await musket.rebuild('list')

        expect(tsdown.loads).toBe(1)
        expect(tsdown.build).toHaveBeenCalledWith({
            entry: ['src/index.ts'],
            logLevel: 'silent',
            plugins: [],
            watch: false,
        })
    })
})
