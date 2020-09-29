import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import types, { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { EventLog } from '@cryptoeconomicslab/contract'
import {
  Address,
  Bytes,
  FixedBytes,
  Struct,
  Codable,
  Property
} from '@cryptoeconomicslab/primitives'
import { ICheckpointDisputeContract } from '@cryptoeconomicslab/contract'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import EventWatcher from '../events/SubstrateEventWatcher'
import { encodeProperty } from '@cryptoeconomicslab/ovm'
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
export class CheckpointDisputeContract implements ICheckpointDisputeContract {
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

  async claim(
    stateUpdate: StateUpdate,
    inclusionProof: DoubleLayerInclusionProof
  ): Promise<void> {
    await this.api.tx.adjudication
      .claim(
        this.encodeParam(stateUpdate.toStruct()),
        this.encodeParam(inclusionProof.toStruct())
      )
      .signAndSend(this.keyPair, {})
  }

  async challenge(
    stateUpdate: StateUpdate,
    challenge: StateUpdate,
    inclusionProof: DoubleLayerInclusionProof
  ): Promise<void> {
    await this.api.tx.adjudication
      .challenge(
        this.encodeParam(stateUpdate.toStruct()),
        this.encodeParam(challenge.toStruct()),
        this.encodeParam(inclusionProof.toStruct())
      )
      .signAndSend(this.keyPair, {})
  }

  async removeChallenge(
    stateUpdate: StateUpdate,
    challenge: StateUpdate,
    witness: Bytes[]
  ): Promise<void> {
    await this.api.tx.adjudication
      .removeChallenge(
        this.encodeParam(stateUpdate.toStruct()),
        this.encodeParam(challenge.toStruct()),
        witness.map(w => this.encodeParam(w))
      )
      .signAndSend(this.keyPair, {})
  }
  async settle(stateUpdate: StateUpdate): Promise<void> {
    await this.api.tx.adjudication
      .settle(this.encodeParam(stateUpdate.toStruct()))
      .signAndSend(this.keyPair, {})
  }

  subscribeCheckpointClaimed(
    handler: (
      stateUpdate: StateUpdate,
      inclusionProof: DoubleLayerInclusionProof
    ) => void
  ): void {
    this.eventWatcher.subscribe('CheckpointClaimed', (log: EventLog) => {
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        ),
        DoubleLayerInclusionProof.fromStruct(
          this.decodeParam(
            DoubleLayerInclusionProof.getParamType(),
            log.values[1]
          ) as Struct
        )
      )
    })
  }

  subscribeCheckpointChallenged(
    handler: (
      stateUpdate: StateUpdate,
      challenge: StateUpdate,
      inclusionProof: DoubleLayerInclusionProof
    ) => void
  ): void {
    this.eventWatcher.subscribe('CheckpointChallenged', (log: EventLog) => {
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        ),
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[1]) as Struct
        ),
        DoubleLayerInclusionProof.fromStruct(
          this.decodeParam(
            DoubleLayerInclusionProof.getParamType(),
            log.values[2]
          ) as Struct
        )
      )
    })
  }

  subscribeCheckpointChallengeRemoved(
    handler: (stateUpdate: StateUpdate, challenge: StateUpdate) => void
  ): void {
    this.eventWatcher.subscribe(
      'CheckpointChallengeRemoved',
      (log: EventLog) => {
        handler(
          StateUpdate.fromStruct(
            this.decodeParam(
              StateUpdate.getParamType(),
              log.values[0]
            ) as Struct
          ),
          StateUpdate.fromStruct(
            this.decodeParam(
              StateUpdate.getParamType(),
              log.values[1]
            ) as Struct
          )
        )
      }
    )
  }

  subscribeCheckpointSettled(
    handler: (stateUpdate: StateUpdate) => void
  ): void {
    this.eventWatcher.subscribe('CheckpointSettled', (log: EventLog) => {
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
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
