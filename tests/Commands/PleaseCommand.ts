import { Command } from "../../src/Core/Command"

export class PleaseCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `please
        {name=help : The command name}
        {--out=txt : The output format}
    `

    /**
     * The console command description.
     *
     * @var string
     */
    protected description: string = 'Say Please'

    public async handle () {
        this.info('Please...')

        if (this.argument('name')) {
            this.info(this.argument('name'))
        }

        if (this.option('out')) {
            this.info(this.option('out'))
        }

        this.debug('Debug Info')
    }
}
