import { FileSystem, Logger } from '@h3ravel/shared'

import { Application } from 'src/Contracts/Application'
import { InitConfig } from 'src/Contracts/ICommand'
import { Musket } from '../Musket'
import { XGeneric } from '@h3ravel/support'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export class Kernel<A extends Application = Application> {
    /**
     * The current working directory
     */
    private cwd!: string

    public output = typeof Logger

    public modules: XGeneric<{ version: string, name: string }>[] = []

    /**
     * The base path for the CLI app
     */
    public basePath: string = ''

    /**
     * Packages that should show up up when the -V flag is passed
     */
    private packages: NonNullable<InitConfig['packages']> = []

    /**
     * The CLI configuration options
     */
    private config: InitConfig = {}

    constructor(public app: A) { }

    async ensureDirectoryExists (dir: string) {
        await mkdir(dir, { recursive: true })
    }

    /**
     * Initialize Musket CLI
     * 
     * @param app 
     * @param config 
     * @returns 
     */
    static async init<A extends Application> (
        app: A,
        config: InitConfig = {}
    ) {
        return await new Kernel(app)
            .setConfig(config)
            .setPackages(config.packages ?? [])
            .bootstrap()
            .run()
    }

    /**
     * Run the CLI IO
     */
    async run () {
        return await Musket.parse(this, this.config)
    }

    /**
     * Set the configuration for the CLI
     */
    setConfig (config: InitConfig) {
        this.config = config
        return this
    }

    /**
     * Get the configuration for the CLI
     */
    getConfig (): InitConfig {
        return this.config
    }

    /**
     * Set the current working directory
     */
    setCwd (cwd: string) {
        this.cwd = cwd
        return this
    }

    /**
     * Get the current working directory
     */
    getCwd (): string {
        return this.cwd
    }

    /**
     * Set the packages that should show up up when the -V flag is passed
     */
    setPackages (packages: NonNullable<InitConfig['packages']>) {
        this.packages = packages
        return this
    }

    /**
     * Get the packages that should show up up when the -V flag is passed
     */
    getPackages (): NonNullable<InitConfig['packages']> {
        return this.packages
    }

    /**
     * Bootstrap the CLI
     */
    bootstrap () {
        const require = createRequire(import.meta.url)
        this.cwd ??= path.join(process.cwd(), this.basePath)

        if (!this.config.hideMusketInfo) {
            try {
                const pkg = require(path.join(process.cwd(), 'package.json'))
                pkg.name = this.config.cliName ?? pkg.name
                this.modules.push(pkg)
            } catch { /** */ }
        }

        for (let i = 0; i < this.packages.length; i++) {
            try {
                const item = this.packages[i];
                const name = typeof item === 'string' ? item : item.name;
                const alias = typeof item === 'string' ? item : item.alias;

                const modulePath = FileSystem.findModulePkg(name, this.cwd) ?? ''
                const pkg = require(path.join(modulePath, 'package.json'))
                pkg.alias = alias
                this.modules.push(pkg)

            } catch (e) {
                this.modules.push({ version: 'N/A', name: 'Unknown' })
            }
        }

        return this
    }
}
