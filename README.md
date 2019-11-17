# Void AI

My personal AI for screeps which uses a declarative/DSL approach.

## Roadmap

- [ ] Scavange room / Automatic room designations
- [ ] Base planning/building functionality
- [ ] Creep Renewal / proper recycling task
- [ ] Reconstruction of destroyed buildings
- [ ] Soldiers
- [ ] Labs
- [ ] Links

## Basic Usage

You will need:

 - [Node.JS](https://nodejs.org/en/download) (>= 8.0.0)
 - A Package Manager ([Yarn](https://yarnpkg.com/en/docs/getting-started) or [npm](https://docs.npmjs.com/getting-started/installing-node))
 - Rollup CLI (Optional, install via `npm install -g rollup`)
 - Python 2 (for node-gyp, [Python 3 is not supported](https://github.com/nodejs/node-gyp/issues/193))
 - Build tools (`apt install build-essential` for Ubuntu, [Visual Studio](https://www.visualstudio.com/vs/) for Windows, etc)

Open the folder in your terminal and run your package manager to install install the required packages and TypeScript declaration files:

```bash
# yarn
yarn
```

Fire up your preferred editor with typescript installed and you are good to go!

### Rollup and code upload

Screeps Typescript Starter uses rollup to compile your typescript and upload it to a screeps server.

Move or copy `screeps.sample.json` to `screeps.json` and edit it, changing the credentials and optionally adding or removing some of the destinations.

Running `rollup -c` will compile your code and do a "dry run", preparing the code for upload but not actually pushing it. Running `rollup -c --environment DEST:main` will compile your code, and then upload it to a screeps server using the `main` config from `screeps.json`.

You can use `-cw` instead of `-c` to automatically re-run when your source code changes - for example, `rollup -cw --environment DEST:main` will automatically upload your code to the `main` configuration every time your code is changed.

Finally, there are also NPM scripts that serve as aliases for these commands in `package.json` for IDE integration. Running `npm run push-main` is equivalent to `rollup -c --environment DEST:main`, and `npm run watch-sim` is equivalent to `rollup -cw --dest sim`.

## Typings

The type definitions for Screeps come from [typed-screeps](https://github.com/screepers/typed-screeps). If you find a problem or have a suggestion, please open an issue there.
