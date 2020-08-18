# gazelle-substrate

This repository contains L1 adapter code for [Substrate](https://github.com/paritytech/substrate).
L1 adaptor is the adaptor to support any blockchain for Gazelle client. Please also see "[What L1 adaptor is](https://github.com/cryptoeconomicslab/ovm-plasma-chamber-spec/blob/master/core-spec/index.md#l1-adaptor-spec)".

![](https://github.com/cryptoeconomicslab/gazelle-substrate/workflows/Test/badge.svg)

## Packages

### [@cryptoeconomicslab/substrate-adaptor](/packages/adaptor)

L1 Adaptor implementation.

### [@cryptoeconomicslab/substrate-cli](/packages/cli)

CLI Plasma Light Client.

### [@cryptoeconomicslab/substrate-plasma-light-client](/packages/plasma-light-client)

Initializer of Plasma Light Client.

### [@cryptoeconomicslab/substrate-plasma-aggregator](/packages/plasma-aggregator)

Plasma Aggregator.

## Development

### Install

```
npm i
lerna bootstrap
```

### How to test

```
npm test
```

### Test Run

run main chain: https://github.com/staketechnologies/Plasm/tree/feature/runtime-with-plasma

```
cargo run purge-chain --dev
cargo run -- --dev
```

run CLI

```
cd packages/cli
npm start -- deploy
// check plappId and write it as PLAPP_ID at .env.
npm start -- deposit 100
```

### Docmentation

- [Document root of framework](https://github.com/cryptoeconomicslab/ovm-plasma-chamber-spec)
- [API Reference of Substrate L1 Adaptor](https://cryptoeconomicslab.github.io/gazelle-substrate/)

### Contributing

When contributing to this repository, please first discuss the change you wish to make via issue or any other method with the owners of this repository before making a change.

Please note we have [a code of conduct](https://github.com/cryptoeconomicslab/ovm-plasma-chamber-spec/blob/master/CODE-OF-CONDUCT.md), please follow it in all your interactions with the project.

1.  Ensure that tests pass and code is lint free: `npm run lint`
2.  Update the README.md if any changes invalidate its current content.
3.  Include any tests for new functionality.
4.  Reference any revelant issues in your PR comment.

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

![project supported by web3 foundation grants program](images/badge.jpg)
