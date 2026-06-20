import { Command } from '../../src/Core/Command'

/**
 * Placeholder fixture — its real content is never imported because the
 * discovery test supplies an `importModule` override that resolves it.
 */
export class PlaceholderCommand extends Command {
    protected signature: string = 'disc:placeholder'

    protected description: string = 'Placeholder (overridden via importModule)'

    public async handle () { /** */ }
}
