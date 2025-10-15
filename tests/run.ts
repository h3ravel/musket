import { Command } from "../src/Core/Command"
import { Kernel } from "../src/Core/Kernel"
import path from "node:path"

class App {
    registeredCommands: typeof Command[] = []
}

const app = new App()

Kernel.init(
    app,
    {
        packages: ['@h3ravel/shared', '@h3ravel/support'],
        discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')]
    }
)
