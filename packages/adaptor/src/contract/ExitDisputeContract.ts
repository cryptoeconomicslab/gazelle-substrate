import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import types, { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { EventLog, IExitDisputeContract } from '@cryptoeconomicslab/contract'
import {
  Address,
  Bytes,
  BigNumber,
  FixedBytes,
  List,
  Struct,
  Codable,
  Property
} from '@cryptoeconomicslab/primitives'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import EventWatcher from '../events/SubstrateEventWatcher'
import { ChallengeGame, encodeProperty } from '@cryptoeconomicslab/ovm'
import PolcadotCoder, {
  decodeFromPolcadotCodec,
  encodeToPolcadotCodec
} from '../coder/PolcadotCoder'
import { StateUpdate } from '@cryptoeconomicslab/plasma'
import { DoubleLayerInclusionProof } from '@cryptoeconomicslab/merkle-tree'

/**
 * @name AdjudicationContract
 * @description Adjudication Contract is the contract to archive dispute game defined by predicate logic.
 */
export class ExitDisputeContract implements IExitDisputeContract {
  registry: TypeRegistry
  contractId: AccountId
  eventWatcher: EventWatcher

  constructor(
    readonly address: Address,
    eventDb: KeyValueStore,
    readonly api: ApiPromise,
    readonly keyPair: KeyringPair
  ) {
    this.registry = new TypeRegistry()
    this.contractId = new AccountId(this.registry, this.address.data)
    this.eventWatcher = new EventWatcher({
      api: this.api,
      kvs: eventDb,
      contractAddress: address.data
    })
  }
  claim(
    stateUpdate: StateUpdate,
    inclusionProof: DoubleLayerInclusionProof
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  claimExitCheckpoint(
    stateUpdate: StateUpdate,
    checkpoint: StateUpdate
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  challenge(
    challenge: import('@cryptoeconomicslab/plasma').ExitChallenge
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  removeChallenge(
    stateUpdate: StateUpdate,
    challenge: StateUpdate,
    witness: Bytes[]
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }
  settle(stateUpdate: StateUpdate): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getClaimDecision(stateUpdate: StateUpdate): Promise<number> {
    throw new Error('Method not implemented.')
  }
  isCompletable(stateUpdate: StateUpdate): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  subscribeExitClaimed(handler: (stateUpdate: StateUpdate) => void): void {
    throw new Error('Method not implemented.')
  }
  subscribeExitChallenged(
    handler: (
      challengeType: import('@cryptoeconomicslab/plasma').EXIT_CHALLENGE_TYPE,
      stateUpdate: StateUpdate,
      challengeStateUpdate?: StateUpdate | undefined
    ) => void
  ): void {
    throw new Error('Method not implemented.')
  }
  subscribeExitChallengeRemoved(
    handler: (
      stateUpdate: StateUpdate,
      challengeStateUpdate: StateUpdate
    ) => void
  ): void {
    throw new Error('Method not implemented.')
  }
  subscribeExitSettled(
    handler: (stateUpdate: StateUpdate, decision: boolean) => void
  ): void {
    throw new Error('Method not implemented.')
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

  private getPropertyHash(property: Property) {
    const propertyHash = FixedBytes.fromHexString(
      32,
      Keccak256.hash(encodeProperty(PolcadotCoder, property)).toHexString()
    )
    return propertyHash
  }
}
