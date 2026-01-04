import { FileSystem, Logger } from '@h3ravel/shared'
import { KernelConfig, PackageMeta } from 'src/Contracts/ICommand'

import { Application } from 'src/Contracts/Application'
import { Command } from './Command'
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

    public modules: XGeneric<{ version: string, name: string, base?: boolean, alias?: string }>[] = []

    /**
     * The base path for the CLI app
     */
    public basePath: string = ''

    /**
     * A list of pre-registered CLI commands
     */
    private commands = new Set<typeof Command<A>>([])

    /**
     * Packages that should show up up when the -V flag is passed
     */
    private packages: PackageMeta[] = []

    /**
     * The CLI configuration options
     */
    public config: KernelConfig = {}

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
        config: KernelConfig = {}
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
    async run<E extends boolean = false> (returnExit?: E) {
        return await Musket.parse(this, this.config, this.getRegisteredCommands(), returnExit)
    }

    /**
     * Set the configuration for the CLI
     */
    setConfig (config: KernelConfig) {
        this.config = config
        return this
    }

    /**
     * Get the configuration for the CLI
     */
    getConfig (): KernelConfig {
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
    setPackages (packages: PackageMeta[]) {
        this.packages = packages
        return this
    }

    /**
     * Get the packages that should show up up when the -V flag is passed
     */
    getPackages (): PackageMeta[] {
        return this.packages
    }

    /**
     * Push a list of new commands to commands stack
     * 
     * @param command 
     */
    registerCommands (commands: typeof Command<A>[]) {
        commands.forEach(e => this.commands.add(e))

        return this
    }

    /**
     * Get all the pre-registered commands
     */
    getRegisteredCommands (): typeof Command<A>[] {
        return Array.from(this.commands)
    }

    /**
     * Add a path or more to the discovery paths
     * 
     * @param path 
     */
    registerDiscoveryPath (path: string | string[]): this {
        path = Array.isArray(path) ? path : [path]
        const discoveryPaths = Array.isArray(this.config.discoveryPaths)
            ? this.config.discoveryPaths
            : (this.config.discoveryPaths ? [this.config.discoveryPaths] : [])

        path.forEach(e => discoveryPaths.push(e))
        this.config.discoveryPaths = discoveryPaths

        return this
    }

    /**
     * Get all the registered discovery paths
     */
    getDiscoveryPaths (): string[] {
        return Array.isArray(this.config.discoveryPaths)
            ? this.config.discoveryPaths
            : (this.config.discoveryPaths ? [this.config.discoveryPaths] : [])
    }

    /**
     * Prepares the CLI for execution
     */
    bootstrap (): this {
        let version = this.config.version;
        const require = createRequire(import.meta.url)
        this.cwd ??= path.join(process.cwd(), this.basePath)

        if (!this.config.hideMusketInfo) {
            try {
                const pkg = require(path.join(process.cwd(), 'package.json'))
                pkg.name = this.config.name ?? pkg.name
                this.modules.push(pkg)
            } catch { /** */ }
        }

        for (let i = 0; i < this.packages.length; i++) {
            try {
                const item = this.packages[i];
                const name = typeof item === 'string' ? item : item.name;
                const alias = typeof item === 'string' ? item : item.alias;
                const base = typeof item === 'string' ? false : item.base;

                const modulePath = FileSystem.findModulePkg(name, this.cwd) ?? ''
                const pkg = require(path.join(modulePath, 'package.json'))
                pkg.alias = alias
                pkg.base = base
                if (base === true && version) {
                    pkg.version = version
                }
                this.modules.push(pkg)

            } catch (e) {
                this.modules.push({ version: 'N/A', name: 'Unknown' })
            }
        }

        if (this.packages.length < 1) {
            if (!version) {
                version = typeof this.app.version === 'function'
                    ? this.app.version()
                    : (typeof this.app.getVersion === 'function'
                        ? this.app.getVersion()
                        : this.app.version
                    )
            }
            this.modules.push({ version: version ?? 'N/A', name: 'Musket CLI' })
        }

        return this
    }
}
