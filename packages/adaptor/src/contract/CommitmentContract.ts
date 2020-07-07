import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { ICommitmentContract, EventLog } from '@cryptoeconomicslab/contract'
import {
  Address,
  BigNumber,
  Codable,
  FixedBytes
} from '@cryptoeconomicslab/primitives'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import EventWatcher from '../events/SubstrateEventWatcher'
import {
  encodeToPolcadotCodec,
  decodeFromPolcadotCodec
} from '../coder/PolcadotCoder'

/**
 * @name CommitmentContract
 * @description This is the wrapper to access Commitment Contract.
 *     Each plasma chain has one commitment contract.
 *     Commitment contracts hold Merkle roots for the Plasma.
 */
export class CommitmentContract implements ICommitmentContract {
  private registry: TypeRegistry
  private contractId: AccountId
  private eventWatcher: EventWatcher

  constructor(
    readonly address: Address,
    readonly eventDb: KeyValueStore,
    readonly api: ApiPromise,
    readonly operatorKeyPair: KeyringPair
  ) {
    this.registry = new TypeRegistry()
    // confirm that this.address.data is hex string
    this.contractId = new AccountId(this.registry, this.address.data)
    this.eventWatcher = new EventWatcher({
      api: this.api,
      kvs: eventDb,
      contractAddress: address.data
    })
  }

  /**
   * Submit Merkle root hash to Commitment Contract
   * @param blockNumber The block number where to submit Merkle root hash
   * @param root Merkle root Hash
   */
  async submit(blockNumber: BigNumber, root: FixedBytes) {
    await this.api.tx.commitment
      .submitRoot(
        this.contractId,
        this.encodeParam(blockNumber),
        this.encodeParam(root)
      )
      .signAndSend(this.operatorKeyPair, {})
  }

  /**
   * Get current Plasma block number
   */
  async getCurrentBlock(): Promise<BigNumber> {
    const blockNumber = await this.api.query.commitment.getCurrentBlock(
      this.contractId
    )
    return BigNumber.fromHexString(blockNumber.toHex())
  }

  /**
   * Get Merkle root hash by Plasma block number
   * @param blockNumber Plasma block number
   */
  async getRoot(blockNumber: BigNumber): Promise<FixedBytes> {
    const root = await this.api.query.commitment.getRoot(
      this.contractId,
      this.encodeParam(blockNumber)
    )
    return FixedBytes.fromHexString(32, root.toHex())
  }

  /**
   * Start to subscribe BlockSubmitted event
   * @param handler
   */
  subscribeBlockSubmitted(
    handler: (blockNumber: BigNumber, root: FixedBytes) => void
  ) {
    this.eventWatcher.subscribe('BlockSubmitted', (log: EventLog) => {
      const blockNumber: Codec = log.values[0]
      const root: Codec = log.values[1]
      handler(
        this.decodeParam(BigNumber.default(), blockNumber) as BigNumber,
        this.decodeParam(FixedBytes.default(32), root) as FixedBytes
      )
    })
  }

  async startWatchingEvents() {
    this.unsubscribeAll()
    await this.eventWatcher.start(() => {
      /* do nothing */
    })
  }

  unsubscribeAll() {
    this.eventWatcher.cancel()
  }

  private encodeParam(input: Codable): Codec {
    return encodeToPolcadotCodec(this.registry, input)
  }

  private decodeParam(def: Codable, input: Codec): Codable {
    return decodeFromPolcadotCodec(this.registry, def, input)
  }
}
