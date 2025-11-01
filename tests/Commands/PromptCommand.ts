import { Command } from "../../src/Core/Command"

export class PromptCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `prompt
        {name= : The prompt to call : ask,choice,confirm,secret,anticipate}
        {default : Set default value }
    `

    /**
     * The console command description.
     *
     * @var string
     */
    protected description: string = 'Call a prompt'

    public async handle () {
        const def = this.argument('default')
        const name = this.argument('name')

        if (name === 'ask') {
            const val = await this.ask('What is your name?', def)
            this.info(val)
        }

        if (name === 'choice') {
            const val = await this.choice('What is your name?', ['Legacy', 'Kaylah'], Number(def ?? 0))
            this.info(val)
        }

        if (name === 'confirm') {
            const val = await this.confirm('Are you ready?', ['true', 'y', 'Y'].includes(def))
            this.info(String(val))
        }

        if (name === 'secret') {
            const val = await this.secret('Enter Password', ['true', 'false'].includes(def) ? def === true : def)
            this.info(val)
        }

        if (name === 'anticipate') {
            const val = await this.anticipate('Who are you?', ['Legacy', 'Kaylah'], def)
            this.info(val)
        }
    }
}
