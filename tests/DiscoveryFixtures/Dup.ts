import { Command } from '../../src/Core/Command'

/**
 * A command used to verify de-duplication: it is registered both as a base
 * command and discovered from disk, yet must only be registered once.
 */
export class DupCommand extends Command {
    protected signature: string = 'disc:dup'

    protected description: string = 'Duplicated command'

    public async handle () {
        this.info('DUP OK')
    }
}
