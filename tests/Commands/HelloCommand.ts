import { Command } from "../../src/Core/Command"

export class HelloCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `hello
        {name=help : The command name}
        {--o|out=txt : The output format}
    `

    /**
     * The console command description.
     *
     * @var string
     */
    protected description: string = 'Display HELLO'

    public async handle () {
        this.info('HELLO')

        if (this.argument('name')) {
            this.info(this.argument('name'))
        }

        if (this.option('out')) {
            this.info(this.option('out'))
        }

        this.debug('Debug Info')
    }
}
