import { Command } from '../../src/Core/Command'
import { SignatureBuilder } from '../../src/SignatureBuilder'

/**
 * A command whose only argument is variadic, used to verify that every operand
 * is collected into an array rather than just the first.
 */
export default class VariadicCommand extends Command {
    protected buildSignature (sig: SignatureBuilder) {
        return sig
            .command('disc:variadic')
            .describe('Collects every value of a variadic argument')
            .argument('items', { description: 'One or more items', required: false, multiple: true })
    }

    public async handle () {
        const items = this.argument('items')
        this.info(Array.isArray(items) ? items.join('|') : String(items))
    }
}
