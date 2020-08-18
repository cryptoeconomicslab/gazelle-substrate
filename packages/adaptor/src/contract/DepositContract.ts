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
    readonly keyPair: KeyringPair,
    readonly plappId: Address
  ) {
    this.registry = new TypeRegistry()
    this.contractId = new AccountId(this.registry, this.address.data)
    this.eventWatcher = new EventWatcher({
      api: this.api,
      kvs: eventDb,
      contractAddress: address.data
    })
    this.eventWatcher.subscribe('Deploy', (log: EventLog) => {
      const encodedPlappId: Codec = log.values[1]
      const plappId = this.decodeParam(
        Address.default(),
        encodedPlappId
      ) as Address
      console.log('plappId is', plappId.data)
    })
  }

  /**
   * deposit token
   * @param amount amount of deposit
   * @param initialState The initial StateObject to deposit
   */
  async deposit(amount: BigNumber, initialState: Property): Promise<void> {
    console.log('deposite', this.encodeParam(this.plappId))
    if (this.plappId.equals(Address.default())) {
      throw new Error('must deploy')
    }
    await this.api.tx.plasma
      .deposit(
        this.encodeParam(this.plappId),
        this.encodeParam(this.plappId),
        this.encodeParam(amount),
        this.encodeParam(initialState.toStruct())
      )
      .signAndSend(this.keyPair, {})
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
      .signAndSend(this.keyPair, {})
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
      .signAndSend(this.keyPair, {})
  }

  /**
   * Start to subscribe CheckpointFinalized event
   * @param handler
   */
  subscribeCheckpointFinalized(
    handler: (checkpointId: Bytes, checkpoint: [Property]) => void
  ): void {
    this.eventWatcher.subscribe('CheckpointFinalized', (log: EventLog) => {
      const checkpointId: Codec = log.values[1]
      const checkpoint = log.values[2]
      console.log(
        'CheckpointFinalized',
        checkpoint.stateUpdate.inputs[0],
        checkpoint.stateUpdate.inputs[1],
        checkpoint.stateUpdate.inputs[2],
        checkpoint.stateUpdate.inputs[3]
      )
      handler(Bytes.fromHexString(checkpointId.toHex()), [
        new Property(
          Address.from(
            Bytes.from(checkpoint.stateUpdate.predicateAddress).toHexString()
          ),
          checkpoint.stateUpdate.inputs.map(i => Bytes.from(i))
        )
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
      const plappId: Codec = log.values[0]
      const range = log.values[1]
      console.log('DepositedRangeExtended', range.start, range.end)
      handler(
        new Range(
          BigNumber.fromString(range.start.toString()),
          BigNumber.fromString(range.end.toString())
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
