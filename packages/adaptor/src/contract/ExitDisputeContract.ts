import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import types, { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { EventLog, IExitDisputeContract } from '@cryptoeconomicslab/contract'
import { Address, Bytes, Struct, Codable } from '@cryptoeconomicslab/primitives'
import { KeyValueStore } from '@cryptoeconomicslab/db'
import EventWatcher from '../events/SubstrateEventWatcher'
import PolcadotCoder, {
  decodeFromPolcadotCodec,
  encodeToPolcadotCodec
} from '../coder/PolcadotCoder'
import {
  StateUpdate,
  EXIT_CHALLENGE_TYPE,
  ExitChallenge
} from '@cryptoeconomicslab/plasma'
import { DoubleLayerInclusionProof } from '@cryptoeconomicslab/merkle-tree'

function createChallengeInputAndWitness(
  challenge: ExitChallenge
): { challengeInput: Bytes[]; witness: Bytes[] } {
  const coder = PolcadotCoder
  if (challenge.type === EXIT_CHALLENGE_TYPE.SPENT) {
    return {
      challengeInput: [
        Bytes.fromString(challenge.type),
        challenge.transaction.message
      ],
      witness: challenge.witness.map(w => w)
    }
  } else if (challenge.type === EXIT_CHALLENGE_TYPE.CHECKPOINT) {
    return {
      challengeInput: [
        Bytes.fromString(challenge.type),
        coder.encode(challenge.challengeStateUpdate.toStruct())
      ],
      witness: [coder.encode(challenge.inclusionProof.toStruct())]
    }
  } else {
    throw new Error('Invalid Exit challenge type')
  }
}

/**
 * @name ExitDisputeContract
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

  async claimExitCheckpoint(
    stateUpdate: StateUpdate,
    checkpoint: StateUpdate
  ): Promise<void> {
    await this.api.tx.adjudication
      .claimExitCheckpoint(
        this.encodeParam(stateUpdate.toStruct()),
        this.encodeParam(checkpoint.toStruct())
      )
      .signAndSend(this.keyPair, {})
  }

  async challenge(challenge: ExitChallenge): Promise<void> {
    const { challengeInput, witness } = createChallengeInputAndWitness(
      challenge
    )

    await this.api.tx.adjudication
      .challenge(
        this.encodeParam(challenge.stateUpdate.toStruct()),
        challengeInput.map(i => this.encodeParam(i)),
        witness.map(w => this.encodeParam(w))
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

  async getClaimDecision(stateUpdate: StateUpdate): Promise<number> {
    const codec = await this.api.query.adjudication.getClaimDecision(
      this.encodeParam(stateUpdate.toStruct())
    )
    const decision = codec as types.u128
    return decision.toNumber()
  }

  async isCompletable(stateUpdate: StateUpdate): Promise<boolean> {
    const codec = await this.api.query.adjudication.getClaimDecision(
      this.encodeParam(stateUpdate.toStruct())
    )
    const isCompletable = codec as types.bool
    return isCompletable.isTrue
  }

  subscribeExitClaimed(handler: (stateUpdate: StateUpdate) => void): void {
    this.eventWatcher.subscribe('ExitClaimed', (log: EventLog) => {
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        )
      )
    })
  }

  subscribeExitChallenged(
    handler: (
      challengeType: EXIT_CHALLENGE_TYPE,
      stateUpdate: StateUpdate,
      challengeStateUpdate?: StateUpdate | undefined
    ) => void
  ): void {
    this.eventWatcher.subscribe('ExitSpentChallenged', (log: EventLog) => {
      handler(
        EXIT_CHALLENGE_TYPE.SPENT,
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        )
      )
    })
    this.eventWatcher.subscribe('ExitCheckpointChallenged', (log: EventLog) => {
      handler(
        EXIT_CHALLENGE_TYPE.CHECKPOINT,
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        ),
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[1]) as Struct
        )
      )
    })
  }

  subscribeExitChallengeRemoved(
    handler: (
      stateUpdate: StateUpdate,
      challengeStateUpdate: StateUpdate
    ) => void
  ): void {
    this.eventWatcher.subscribe('ExitChallengeRemoved', (log: EventLog) => {
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        ),
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[1]) as Struct
        )
      )
    })
  }

  subscribeExitSettled(
    handler: (stateUpdate: StateUpdate, decision: boolean) => void
  ): void {
    this.eventWatcher.subscribe('ExitSettled', (log: EventLog) => {
      const decision = log.values[1] as types.bool
      handler(
        StateUpdate.fromStruct(
          this.decodeParam(StateUpdate.getParamType(), log.values[0]) as Struct
        ),
        decision.isTrue
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
