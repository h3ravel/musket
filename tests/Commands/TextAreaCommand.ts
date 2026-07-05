import { Command } from '../../src/Core/Command'

export class TextAreaCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `textarea
        {input=? : The command input} 
    `

    /**
     * The console command description.
     *
     * @var string
     */
    protected description: string = 'Display TEST OK'

    public async handle() {
        if (this.argument('input')) {
            this.info(this.argument('input'))
        } else {
            console.log(
                await this.multiline('input', 'Enter your input (type "exit" to finish):')
            )
        }
    }
}
