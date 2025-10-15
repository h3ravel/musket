import { FileSystem, Logger } from '@h3ravel/shared'

import { Application } from 'src/Contracts/Application'
import { InitConfig } from 'src/Contracts/ICommand'
import { Musket } from '../Musket'
import { XGeneric } from '@h3ravel/support'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import pkg from 'package.json'

export class Kernel {

    public cwd!: string
    public output = typeof Logger
    public modules: XGeneric<{ version: string, name: string }>[] = []
    public basePath: string = ''
    public packages: string[] = []
    private config: InitConfig = {}

    constructor(public app: Application) { }

    async ensureDirectoryExists (dir: string) {
        await mkdir(dir, { recursive: true })
    }

    static async init (
        app: Application,
        config: InitConfig = {}
    ) {
        const instance = new Kernel(app)
        instance.config = config
        instance.packages = config.packages ?? []

        return (await instance.loadRequirements()).run()
    }


    private async run () {
        return await Musket.parse(this, this.config)
    }

    private async loadRequirements () {
        this.cwd = path.join(process.cwd(), this.basePath)

        try {
            pkg.name = this.config.cliName ?? pkg.name
            this.modules.push(pkg)
        } catch { /** */ }

        for (let i = 0; i < this.packages.length; i++) {
            try {
                const name = this.packages[i];
                const modulePath = FileSystem.findModulePkg(name, this.cwd) ?? ''
                this.modules.push(await import(path.join(modulePath, 'package.json')))

            } catch (e) {
                this.modules.push({ version: 'N/A', name: 'Unknown' })
            }
        }

        return this
    }
}
