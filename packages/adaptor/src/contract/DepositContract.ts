import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { IDepositContract, EventLog } from '@cryptoeconomicslab/contract'
import {
  Address,
  Bytes,
  Integer,
  Range,
  Struct,
  Codable,
  BigNumber
} from '@cryptoeconomicslab/primitives'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import { Checkpoint } from '@cryptoeconomicslab/plasma'
import EventWatcher from '../events/SubstrateEventWatcher'
import { Property } from '@cryptoeconomicslab/ovm'
import {
  encodeToPolcadotCodec,
  decodeFromPolcadotCodec
} from '../coder/PolcadotCoder'

/**
 * @name DepositContract
 * @description DepositContract class is the wrapper to access Deposit Contract.
 *     Deposit contracts are the smart contracts into which assets are custodying the money as it is transacted on Plasma.
 *     It provides the API to finalize the rightful exit state of previously deposited assets.
 */
export class DepositContract implements IDepositContract {
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
    this.contractId = new AccountId(this.registry, this.address.data)
    this.eventWatcher = new EventWatcher({
      api: this.api,
      kvs: eventDb,
      contractAddress: address.data
    })
  }

  /**
   * deposit token
   * @param amount amount of deposit
   * @param initialState The initial StateObject to deposit
   */
  async deposit(amount: BigNumber, initialState: Property): Promise<void> {
    await this.api.tx.deposit
      .deposit(
        this.contractId,
        this.encodeParam(amount),
        this.encodeParam(initialState.toStruct())
      )
      .signAndSend(this.operatorKeyPair, {})
  }

  /**
   * finalize checkpoint claim
   * @param checkpoint
   */
  async finalizeCheckpoint(checkpoint: Property): Promise<void> {
    await this.api.tx.deposit
      .finalizeCheckpoint(
        this.contractId,
        this.encodeParam(checkpoint.toStruct())
      )
      .signAndSend(this.operatorKeyPair, {})
  }

  /**
   * finalize exit claim
   * @param exit
   * @param depositedRangeId
   */
  async finalizeExit(exit: Property, depositedRangeId: Integer): Promise<void> {
    await this.api.tx.deposit
      .finalizeCheckpoint(
        this.contractId,
        [exit.toStruct(), depositedRangeId].map(i => this.encodeParam(i))
      )
      .signAndSend(this.operatorKeyPair, {})
  }

  /**
   * Start to subscribe CheckpointFinalized event
   * @param handler
   */
  subscribeCheckpointFinalized(
    handler: (checkpointId: Bytes, checkpoint: [Property]) => void
  ): void {
    this.eventWatcher.subscribe('CheckpointFinalized', (log: EventLog) => {
      const checkpointId: Codec = log.values[0]
      const encodedCheckpoint: Codec = log.values[1]
      const checkpoint = Checkpoint.fromStruct(
        this.decodeParam(Checkpoint.getParamType(), encodedCheckpoint) as Struct
      )
      handler(Bytes.fromHexString(checkpointId.toHex()), [
        checkpoint.stateUpdate
      ])
    })
  }

  /**
   * Start to subscribe ExitFinalized event
   * @param handler
   */
  subscribeExitFinalized(handler: (exitId: Bytes) => void): void {
    this.eventWatcher.subscribe('ExitFinalized', (log: EventLog) => {
      const exitId: Codec = log.values[0]
      handler(this.decodeParam(Bytes.default(), exitId) as Bytes)
    })
  }

  /**
   * Start to subscribe DepositedRangeExtended event
   * @param handler
   */
  subscribeDepositedRangeExtended(handler: (range: Range) => void): void {
    this.eventWatcher.subscribe('DepositedRangeExtended', (log: EventLog) => {
      const range: Codec = log.values[0]
      handler(
        Range.fromStruct(
          this.decodeParam(Range.getParamType(), range) as Struct
        )
      )
    })
  }

  /**
   * Start to subscribe DepositedRangeRemoved event
   * @param handler
   */
  subscribeDepositedRangeRemoved(handler: (range: Range) => void): void {
    this.eventWatcher.subscribe('DepositedRangeRemoved', (log: EventLog) => {
      const range: Codec = log.values[0]
      handler(
        Range.fromStruct(
          this.decodeParam(Range.getParamType(), range) as Struct
        )
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
