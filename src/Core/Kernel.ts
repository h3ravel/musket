import { FileSystem, Logger } from '@h3ravel/shared'
import { KernelConfig, ModuleMeta, PackageMeta } from 'src/Contracts/ICommand'

import { Application } from 'src/Contracts/Application'
import { Command } from './Command'
import { Musket } from '../Musket'
import { createRequire } from 'module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { XGeneric } from '../Contracts/Utils'

export class Kernel<A extends Application = Application> {
    /**
     * The current working directory
     */
    private cwd!: string

    public output = typeof Logger

    public modules: XGeneric<ModuleMeta>[] = []

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

    async ensureDirectoryExists(dir: string) {
        await mkdir(dir, { recursive: true })
    }

    /**
     * Initialize Musket CLI
     * 
     * @param app 
     * @param config 
     * @returns 
     */
    static async init<A extends Application>(
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
    async run<E extends boolean = false>(returnExit?: E) {
        return await Musket.parse(this, this.config, this.getRegisteredCommands(), returnExit)
    }

    /**
     * Set the configuration for the CLI
     */
    setConfig(config: KernelConfig) {
        this.config = config
        return this
    }

    /**
     * Get the configuration for the CLI
     */
    getConfig(): KernelConfig {
        return this.config
    }

    /**
     * Set the current working directory
     */
    setCwd(cwd: string) {
        this.cwd = cwd
        return this
    }

    /**
     * Get the current working directory
     */
    getCwd(): string {
        return this.cwd
    }

    /**
     * Set the packages that should show up up when the -V flag is passed
     */
    setPackages(packages: PackageMeta[]) {
        this.packages = packages
        return this
    }

    /**
     * Get the packages that should show up up when the -V flag is passed
     */
    getPackages(): PackageMeta[] {
        return this.packages
    }

    /**
     * Push a list of new commands to commands stack
     * 
     * @param command 
     */
    registerCommands(commands: typeof Command<A>[]) {
        commands.forEach(e => this.commands.add(e))

        return this
    }

    /**
     * Get all the pre-registered commands
     */
    getRegisteredCommands(): typeof Command<A>[] {
        return Array.from(this.commands)
    }

    /**
     * Add a path or more to the discovery paths
     * 
     * @param path 
     */
    registerDiscoveryPath(path: string | string[]): this {
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
    getDiscoveryPaths(): string[] {
        return Array.isArray(this.config.discoveryPaths)
            ? this.config.discoveryPaths
            : (this.config.discoveryPaths ? [this.config.discoveryPaths] : [])
    }

    /**
     * Prepares the CLI for execution
     */
    bootstrap(): this {
        let version = this.config.version
        const require = createRequire(import.meta.url)
        this.cwd ??= path.join(process.cwd(), this.basePath)

        if (!this.config.hideMusketInfo) {
            try {
                const pkg = require(path.join(process.cwd(), 'package.json'))
                pkg.name = this.config.name ?? pkg.name
                this.modules.push(pkg)
            } catch { /** */ }
        }

        for (const item of this.packages) {
            try {
                const cwd = typeof item === 'string' ? this.cwd : (item.path ?? this.cwd)
                const name = typeof item === 'string' ? item : item.name
                const alias = typeof item === 'string' ? item : (item.alias ?? item.name)
                const base = typeof item === 'string' ? false : item.base
                const label = typeof item === 'string' ? undefined : item.label
                const versionOverride = typeof item === 'string' ? undefined : item.version

                if (typeof item === 'object' && item.version && item.name) {
                    this.modules.push({
                        base: item.base,
                        name: item.name,
                        label: item.label,
                        alias: item.alias,
                        version: item.version,
                    })
                    continue
                }

                const modulePath = FileSystem.findModulePkg(name, cwd) ?? ''
                const pkg = require(path.join(modulePath, 'package.json'))
                pkg.alias = alias
                pkg.base = base
                pkg.label = label

                /** A per-package version wins, then the base-package override. */
                if (versionOverride) {
                    pkg.version = versionOverride
                } else if (base === true && version) {
                    pkg.version = version
                }
                this.modules.push(pkg)

            } catch {
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


        /*
         * The final Musket instance and its event objects are now ready.
         */
        this.app.bootMusketListeners()

        return this
    }

    /**
     * Format a module's display label: strip the package scope, turn `-`/`_`
     * into spaces, normalise "cli" casing and capitalise. A module's explicit
     * `label` short-circuits all of this.
     *
     * @param module
     */
    formatModuleLabel(module: ModuleMeta): string {
        if (module.label) return module.label

        return String(module.alias ?? module.name)
            .split('/')
            .pop()!
            .replace(/[-_]/g, ' ')
            .replace(/cli/gi, match => match === 'cli' ? 'CLI' : match)
            .replace(/^./, c => c.toUpperCase())
    }

    /**
     * Render a single module as a colored `Label: version` segment, honoring
     * {@link KernelConfig.versionColors}.
     *
     * @param module
     */
    renderModuleVersion(module: ModuleMeta): string {
        const colors = this.config.versionColors ?? {}

        return Logger.parse([
            [`${this.formatModuleLabel(module)}:`, colors.label ?? 'white'],
            [String(module.version), colors.version ?? 'green'],
        ], ' ', false)
    }

    /**
     * Build the full version line shown for `--version` and atop the command
     * list. A single source of truth for both render sites.
     *
     * Honors {@link KernelConfig.versionFormatter} for complete control,
     * otherwise joins each module with {@link KernelConfig.versionSeparator}.
     */
    getVersionString(): string {
        const modules = this.modules as ModuleMeta[]
        const separator = this.config.versionSeparator ?? ' | '

        if (this.config.versionFormatter) {
            return this.config.versionFormatter(modules, {
                format: module => this.renderModuleVersion(module),
                label: module => this.formatModuleLabel(module),
                separator,
            })
        }

        return modules.map(module => this.renderModuleVersion(module)).join(separator)
    }
}
