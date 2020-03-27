import initialize from '@cryptoeconomicslab/substrate-plasma-light-client'
import { Bytes } from '@cryptoeconomicslab/primitives'
import leveldown from 'leveldown'
import { LevelKeyValueStore } from '@cryptoeconomicslab/level-kvs'
import * as config from '../config.local.json'

import Cli from 'cac'
const cli = Cli()

const tokenAddress = config.PlasmaETH
async function instantiate() {
  const kvs = new LevelKeyValueStore(Bytes.fromString('cli'), leveldown('.db'))
  return initialize({ kvs, config: config as any })
}

cli.command('deposit <amount>', 'Deposit').action(async (amount, options) => {
  const lightClient = await instantiate()
  await lightClient.deposit(Number(amount), tokenAddress)
  console.log('deposited')
})
cli.command('balance', 'getBalance').action(async options => {
  const lightClient = await instantiate()
  const balances = await lightClient.getBalance()
  const balanceOfL1 = await lightClient['wallet'].getL1Balance()
  console.log('Balance L1:', balanceOfL1)
  console.log('Balance L2:', balances)
})
cli
  .command('transfer <amount> <to>', 'transfer')
  .action(async (amount, to, options) => {
    const lightClient = await instantiate()
    await lightClient.transfer(amount, tokenAddress, to)
  })
cli.help()
cli.parse()
