import { Command } from '../../src/Core/Command'
import { SignatureBuilder } from '../../src/SignatureBuilder'

/**
 * A command whose signature is defined programmatically via `buildSignature`
 * rather than the string DSL.
 */
export default class BuiltCommand extends Command {
    protected buildSignature (sig: SignatureBuilder) {
        return sig
            .command('disc:built')
            .describe('A command built without the string DSL')
            .argument('label', { description: 'An optional label', required: false })
            .option('loud', { description: 'Shout the output' })
    }

    public async handle () {
        this.info('BUILT')

        if (this.argument('label')) {
            this.info(this.argument('label'))
        }

        if (this.option('loud')) {
            this.info('LOUD')
        }
    }
}
