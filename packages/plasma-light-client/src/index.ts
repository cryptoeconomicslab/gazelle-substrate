import { KeyringPair } from '@polkadot/keyring/types'
import { ApiPromise, WsProvider } from '@polkadot/api'
import {
  PolcadotCoder,
  SubstrateWallet,
  DepositContract,
  ERC20Contract,
  CommitmentContract,
  AdjudicationContract,
  OwnershipPayoutContract,
  SubstarteContractConfig
} from '@cryptoeconomicslab/substrate-adaptor'
import { Address, Bytes } from '@cryptoeconomicslab/primitives'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import LightClient from '@cryptoeconomicslab/plasma-light-client'
import { DeciderConfig } from '@cryptoeconomicslab/ovm'
import { setupContext } from '@cryptoeconomicslab/context'
import customTypes from './customTypes'

setupContext({
  coder: PolcadotCoder
})

export interface SubstrateLightClientOptions {
  keyringPair: KeyringPair
  kvs: KeyValueStore
  config: DeciderConfig & SubstarteContractConfig
  plappId: Address
  aggregatorEndpoint?: string
}

export default async function initialize(options: SubstrateLightClientOptions) {
  const eventDb = await options.kvs.bucket(Bytes.fromString('event'))
  const keyringPair = options.keyringPair
  const provider = new WsProvider(
    process.env.PLASM_ENDPOINT || 'ws://127.0.0.1:9944'
  )
  const apiPromise = await ApiPromise.create({
    provider: provider,
    types: customTypes
  })
  const substrateWallet = new SubstrateWallet(keyringPair)
  const adjudicationContract = new AdjudicationContract(
    Address.from(options.config.adjudicationContract),
    eventDb,
    apiPromise,
    keyringPair
  )
  function depositContractFactory(address: Address) {
    return new DepositContract(
      address,
      eventDb,
      apiPromise,
      keyringPair,
      options.plappId
    )
  }
  function tokenContractFactory(address: Address) {
    return new ERC20Contract(address, apiPromise, keyringPair)
  }
  const commitmentContract = new CommitmentContract(
    Address.from(options.config.commitmentContract),
    eventDb,
    apiPromise,
    keyringPair
  )
  const ownershipPayoutContract = new OwnershipPayoutContract(
    Address.from(options.config.payoutContracts['OwnershipPayout']),
    apiPromise,
    keyringPair
  )
  const client = await LightClient.initilize({
    wallet: substrateWallet,
    witnessDb: options.kvs,
    adjudicationContract,
    depositContractFactory,
    tokenContractFactory,
    commitmentContract,
    ownershipPayoutContract,
    deciderConfig: options.config,
    aggregatorEndpoint: options.aggregatorEndpoint
  })
  await client.registerCustomToken(
    new ERC20Contract(
      Address.from(options.config.PlasmaETH),
      apiPromise,
      keyringPair
    ),
    depositContractFactory(
      Address.from(options.config.payoutContracts['DepositContract'])
    )
  )
  await client.start()
  return client
}
