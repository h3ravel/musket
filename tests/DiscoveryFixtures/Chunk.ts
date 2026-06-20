/**
 * Simulates a non-command module that can land in a discovery directory — e.g. a
 * shared bundler chunk a tool like tsdown emits alongside built commands. It
 * exports a class with no `getSignature`, so discovery must ignore it rather than
 * instantiate it and crash.
 */
export class Rebuilder {
    static build () {
        return 'not a command'
    }
}
