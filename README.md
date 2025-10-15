<div align="center">
  <a href="https://h3ravel.toneflix.net"  target="_blank">
    <img src="https://raw.githubusercontent.com/h3ravel/assets/refs/heads/main/logo-full.svg" width="200" alt="H3ravel Logo">
  </a>
  <h1 align="center"><a href="https://h3ravel.toneflix.net/guide/deeper/musket">Musket CLI</a></h1>

[![Framework][ix]][lx]
[![Musket Version][i1]][l1]
[![Downloads][d1]][d1]
[![Tests][tei]][tel]
[![License][lini]][linl]

</div>

# About Musket CLI

Musket CLI is a framework-agnostic CLI framework designed to allow you build artisan-like CLI apps and for use in the [H3ravel](https://h3ravel.toneflix.net) framework.

## Installation

To use **Musket CLI**, you may install it by running:

```sh

npm install @h3ravel/musket
# or
pnpm add @h3ravel/musket
# or
yarn add @h3ravel/musket
```

## Quick Setup

The base requirement fo setting up **Musket CLI** is an application class that it can bind itself to:

```ts
class Application {}
```

Once bound, **Musket CLI** will bind itself to the application class as `musket` and can be accessed as:

```ts
const app = new Application();

// Initialize Musket CLI here

console.log(app.musket);
```

### Initialization

To initialize **Musket CLI** you can follow the example below:

```ts
import { Kernel } from 'h3ravel/musket';

const app = new Application();

Kernel.init(app);
```

The `init` method returs and instance of `commanderjs`'s `Command` class allowing to further extend and customize your app if there is a need for that.

### Passing Configuration

Musket allows passing a `config` object that alters it's behavior and provide some level of customizations

```ts
Kernel.init(app, {
  packages: ['@h3ravel/shared', '@h3ravel/support'],
  cliName: 'musket-cli',
  discoveryPaths: [path.join(process.cwd(), 'tests/Commands/*.ts')],
});
```

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
[lini]: https://img.shields.io/github/license/h3ravel/framework
[tel]: https://github.com/h3ravel/framework/actions/workflows/test.yml
[tei]: https://github.com/h3ravel/framework/actions/workflows/test.yml/badge.svg

````

```

```
````
