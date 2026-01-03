import { Command } from "../../src/Core/Command"

export class TestCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `test
        {name=help : The command name} 
    `

    /**
     * The console command description.
     *
     * @var string
     */
    protected description: string = 'Display TEST OK'

    public async handle () {
        this.info('TEST OK')

        if (this.argument('name')) {
            this.info(this.argument('name'))
        }
    }
}
