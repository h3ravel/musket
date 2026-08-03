<div align="center">
  <a href="https://h3ravel.toneflix.net"  target="_blank">
    <img src="https://raw.githubusercontent.com/h3ravel/assets/refs/heads/main/logo-full.svg" width="200" alt="H3ravel Logo">
  </a>
  <h1 align="center"><a href="https://h3ravel.toneflix.net/musket">Musket CLI</a></h1>

[![Framework][ix]][lx]
[![Musket Version][i1]][l1]
[![Downloads][d1]][l1]
[![Tests][tei]][tel]
[![License][lini]][linl]

</div>

# About Musket CLI

Musket CLI is a framework-agnostic CLI framework designed to allow you build artisan-like CLI apps and for use in the [H3ravel](https://h3ravel.toneflix.net) framework.

## Installation

Install **Musket CLI** using your preferred package manager:

```sh
npm install @h3ravel/musket
```

```sh
pnpm add @h3ravel/musket
```

```sh
yarn add @h3ravel/musket
```

## Quick Setup

Musket requires an application class that extends its base `Application` class:

```ts
import { Application as BaseApplication } from '@h3ravel/musket';

export class Application extends BaseApplication {}
```

When Musket is initialized, it binds itself to the application instance through the `musket` property:

```ts
const app = new Application();

// Initialize Musket CLI here.

console.log(app.musket);
```

The `musket` property is only available after Musket has been initialized.

## Initialization

Use `Kernel.init()` to initialize Musket:

```ts
import { Kernel } from '@h3ravel/musket';
import { Application } from './Application';

const app = new Application();

await Kernel.init(app);
```

After initialization, the current Musket instance can be accessed from the application:

```ts
console.log(app.musket);
```

The `init()` method returns Commander.js' `Command` instance, allowing you to further extend or customize the underlying CLI program:

```ts
const program = await Kernel.init(app);

program.option('--debug', 'Enable debug mode');
```

## Passing Configuration

Musket accepts a configuration object as the second argument to `Kernel.init()`:

```ts
import path from 'node:path';
import { Kernel } from '@h3ravel/musket';

await Kernel.init(app, {
  name: 'musket-cli',
  packages: ['@h3ravel/shared', '@h3ravel/support'],
  discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')],
});
```

The configuration can be used to define the CLI name, package discovery, command discovery paths and other Musket behaviour.

## Advanced Initialization

For more control over the initialization process, create the `Kernel` instance directly and configure it using the available methods:

```ts
import path from 'node:path';
import { Kernel } from '@h3ravel/musket';
import { Application } from './Application';
import { TestCommand } from './TestCommand';

const app = new Application();

const kernel = new Kernel(app)
  .setCwd(process.cwd())
  .setConfig({
    name: 'musket-cli',
    discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')],
  })
  .setPackages([
    {
      name: '@h3ravel/shared',
      alias: 'Shared Package',
    },
    '@h3ravel/support',
  ])
  .registerCommands([TestCommand])
  .bootstrap();

await kernel.run();
```

When initializing Musket manually, the `packages` property passed through `setConfig()` is ignored.

Use `setPackages()` instead:

```ts
kernel.setPackages(['@h3ravel/shared', '@h3ravel/support']);
```

## Application Lifecycle

The application constructor runs before Musket has been initialized. This means `this.musket` should not be accessed from the constructor:

```ts
export class Application extends BaseApplication {
  constructor() {
    super();

    /*
     * Musket has not been attached at this point.
     */
    console.log(this.musket);
  }
}
```

Use the `registerMusketListeners()` lifecycle method when you need to access the Musket instance or register command lifecycle listeners:

```ts
import { Application as BaseApplication, Musket } from '@h3ravel/musket';

export class Application extends BaseApplication {
  protected registerMusketListeners(musket: Musket<this>): void {
    console.log('Musket has been attached', musket);
  }
}
```

This method is called after Musket has been attached to the application instance.

Application properties and services are also available inside the method:

```ts
export class Application extends BaseApplication {
  logger = console;

  protected registerMusketListeners(musket: Musket<this>): void {
    musket.beforeHandle.on(({ command }) => {
      this.logger.log(`Handling ${command.constructor.name}`);
    });
  }
}
```

## Command Lifecycle Events

Musket exposes events that allow applications and packages to listen to the command execution lifecycle.

The available events are:

- `beforeHandle`
- `afterHandle`
- `handleFailed`

### Before Handle

The `beforeHandle` event is emitted immediately before the command's `handle()` method or custom resolver is called:

```ts
protected registerMusketListeners(
  musket: Musket<this>,
): void {
  musket.beforeHandle.on(({ app, command }) => {
    console.log(
      `Handling ${command.constructor.name}`,
    );

    console.log(app);
  });
}
```

The listener receives:

```ts
{
  app,
  command,
}
```

Listeners may also be asynchronous:

```ts
musket.beforeHandle.on(async ({ command }) => {
  await prepareCommand(command);
});
```

### After Handle

The `afterHandle` event is emitted after a command has completed successfully:

```ts
protected registerMusketListeners(
  musket: Musket<this>,
): void {
  musket.afterHandle.on(({
    command,
    result,
  }) => {
    console.log(
      `Handled ${command.constructor.name}`,
      result,
    );
  });
}
```

The listener receives:

```ts
{
  app,
  command,
  result,
}
```

The `result` property contains the value returned by the command's `handle()` method or custom resolver.

### Handle Failed

The `handleFailed` event is emitted when the command's `handle()` method or custom resolver throws an error:

```ts
protected registerMusketListeners(
  musket: Musket<this>,
): void {
  musket.handleFailed.on(({
    command,
    error,
  }) => {
    console.error(
      `Failed to handle ${command.constructor.name}`,
      error,
    );
  });
}
```

The listener receives:

```ts
{
  app,
  command,
  error,
}
```

The original error is rethrown after all failure listeners have completed.

The command lifecycle follows this order:

```text
beforeHandle
    ├── success → afterHandle
    └── failure → handleFailed → rethrow
```

Errors thrown by a `beforeHandle` listener are not considered command handling failures and therefore do not emit `handleFailed`.

### Removing Listeners

The `on()` method returns a function that can be used to remove the listener:

```ts
const removeListener = musket.beforeHandle.on(({ command }) => {
  console.log(command.constructor.name);
});

removeListener();
```

Listeners may also be registered to run only once:

```ts
musket.beforeHandle.once(({ command }) => {
  console.log(`First command: ${command.constructor.name}`);
});
```

### Event Listener Shortcut

Musket provides a `listen()` method as a convenient alternative to accessing its lifecycle event properties directly.

```ts
musket.listen('handling', ({ command }) => {
  console.log(`Handling ${command.constructor.name}`);
});

musket.listen('handled', ({ command, result }) => {
  console.log(`${command.constructor.name} completed`, result);
});

musket.listen('error', ({ command, error }) => {
  console.error(`${command.constructor.name} failed`, error);
});
```

The supported event names are:

| Event      | Lifecycle event | Emitted when                             |
| ---------- | --------------- | ---------------------------------------- |
| `handling` | `beforeHandle`  | Before command handling begins           |
| `handled`  | `afterHandle`   | After the command completes successfully |
| `error`    | `handleFailed`  | When command handling throws an error    |

The following registrations are equivalent:

```ts
musket.listen('handling', callback);
musket.beforeHandle.on(callback);
```

```ts
musket.listen('handled', callback);
musket.afterHandle.on(callback);
```

```ts
musket.listen('error', callback);
musket.handleFailed.on(callback);
```

The method returns a function that removes the listener:

```ts
const removeListener = musket.listen('handled', ({ command }) => {
  console.log(command.constructor.name);
});

removeListener();
```

### Listening from Commands

The base `Command` class also exposes a `listen()` method. It delegates listener registration to the current Musket instance:

```ts
export default class GreetCommand extends Command {
  protected signature = 'greet {name}';

  async handle(): Promise<void> {
    const removeListener = this.listen('error', ({ command, error }) => {
      console.error(`${command.constructor.name} failed`, error);
    });

    this.info(`Hello, ${this.argument('name')}!`);

    removeListener();
  }
}
```

The command shortcut supports the same event names and payloads as `Musket.listen()`:

```ts
this.listen('handling', ({ app, command }) => {
  //
});

this.listen('handled', ({ app, command, result }) => {
  //
});

this.listen('error', ({ app, command, error }) => {
  //
});
```

When Musket has not yet been attached to the application, `Command.listen()` does not register the listener and returns an empty removal function.

Listeners registered during `handle()` remain active until removed. A `handling` listener registered from inside `handle()` will not receive the current command's event because that event has already been emitted.

## Creating Commands

Musket commands extend the base `Command` class and define a `signature`, `description` and `handle()` method:

```ts
import { Command } from '@h3ravel/musket';

export default class GreetCommand extends Command {
  protected signature = 'greet {name}';

  protected description = 'Display a personalized greeting.';

  async handle(): Promise<void> {
    const name = this.argument('name');

    this.info(`Hello, ${name}!`);
  }
}
```

Every command has access to the current application instance through `this.app`:

```ts
export default class EnvironmentCommand extends Command {
  protected signature = 'environment';

  protected description = 'Display the current environment.';

  async handle(): Promise<void> {
    this.info(this.app.environment);
  }
}
```

The application type can also be passed to the command when stronger type inference is required:

```ts
import { Command } from '@h3ravel/musket';
import type { Application } from './Application';

export default class EnvironmentCommand extends Command<Application> {
  protected signature = 'environment';

  async handle(): Promise<void> {
    this.info(this.app.environment);
  }
}
```

## Registering Commands

When command discovery paths are configured, matching commands are registered automatically:

```ts
await Kernel.init(app, {
  discoveryPaths: [path.join(process.cwd(), 'app/Commands/*.ts')],
});
```

Commands may also be registered directly on the application:

```ts
import { BuildCommand } from './Commands/BuildCommand';
import { GreetCommand } from './Commands/GreetCommand';

export class Application extends BaseApplication {
  registeredCommands = [GreetCommand, BuildCommand];
}
```

Alternatively, pass commands through the kernel configuration:

```ts
await Kernel.init(app, {
  baseCommands: [GreetCommand, BuildCommand],
});
```

Commands can also be registered during advanced initialization:

```ts
const kernel = new Kernel(app)
  .registerCommands([GreetCommand, BuildCommand])
  .bootstrap();

await kernel.run();
```

## Running Commands

Once the CLI has been compiled or built, commands can be executed using Node.js:

```sh
node dist/cli.js greet Legacy
```

Output:

```text
Hello, Legacy!
```

## Documentation

The full musket documentation is available [Here](https://h3ravel.toneflix.net/musket)

## Contributing

Thank you for considering contributing to the H3ravel framework! The [Contribution Guide](https://h3ravel.toneflix.net/contributing) can be found in the H3ravel documentation and will provide you with all the information you need to get started.

## Code of Conduct

In order to ensure that the H3ravel community is welcoming to all, please review and abide by the [Code of Conduct](#).

## Security Vulnerabilities

If you discover a security vulnerability within H3ravel, please send an e-mail to Legacy via hamzas.legacy@toneflix.ng. All security vulnerabilities will be promptly addressed.

## License

The H3ravel framework is open-sourced software licensed under the [MIT license](LICENSE).

[ix]: https://img.shields.io/npm/v/%40h3ravel%2Fcore?style=flat-square&label=Framework&color=%230970ce
[lx]: https://www.npmjs.com/package/@h3ravel/core
[i1]: https://img.shields.io/npm/v/%40h3ravel%2Fmusket?style=flat-square&label=@h3ravel/musket&color=%230970ce
[l1]: https://www.npmjs.com/package/@h3ravel/musket
[d1]: https://img.shields.io/npm/dt/%40h3ravel%2Fmusket?style=flat-square&label=Downloads&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40h3ravel%2Fmusket
[linl]: https://github.com/h3ravel/framework/blob/main/LICENSE
[lini]: https://img.shields.io/github/license/h3ravel/framework?style=flat-square
[tel]: https://github.com/h3ravel/musket/actions/workflows/tests.yml
[tei]: https://github.com/h3ravel/musket/actions/workflows/tests.yml/badge.svg?style=flat-square
