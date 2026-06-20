import { Command } from '../../src/Core/Command'

/**
 * Fixture exercising command discovery resolution where the exported class name
 * does not match the file name, and is exported as `default`.
 */
export default class WhateverCommand extends Command {
    protected signature: string = 'disc:renamed'

    protected description: string = 'Renamed default-export command'

    public async handle () {
        this.info('RENAMED OK')
    }
}
