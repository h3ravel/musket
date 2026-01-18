import { Command } from "../../src/Core/Command"

export class TestCommand extends Command {

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected signature: string = `test
        {name=help : The command name} 
        {--opts? : The command options : [opt1, opt2, opt3]} 
        {--opts2? : The command options 2 : opt1.val, opt2, opt3} 
        {--opts3? : The command options 3 : [opt1.val, opt2.val, opt3.val]} 
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
