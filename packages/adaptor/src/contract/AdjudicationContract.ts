import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import types, { TypeRegistry } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { IAdjudicationContract, EventLog } from '@cryptoeconomicslab/contract'
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

/**
 * @name AdjudicationContract
 * @description Adjudication Contract is the contract to archive dispute game defined by predicate logic.
 */
export class AdjudicationContract implements IAdjudicationContract {
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

  /**
   * @name isDecidable
   * @description Check dispute period of the game has already passed.
   * @param gameId
   */
  async isDecidable(gameId: Bytes): Promise<boolean> {
    const codec = await this.api.query.adjudication.isDecidable(
      this.encodeParam(gameId)
    )
    return (codec as types.bool).isTrue
  }

  /**
   * @name getGame
   * @description Gets instantiated challenge game by gameId.
   *     Throw exception if game is not found.
   * @param gameId
   */
  async getGame(gameId: Bytes): Promise<ChallengeGame> {
    const codec = await this.api.query.adjudication.getGame(
      this.encodeParam(gameId)
    )
    const tuple = codec as types.Tuple
    const property = Property.fromStruct(
      this.decodeParam(Property.getParamType(), tuple[0]) as Struct
    )
    const propertyHash = this.getPropertyHash(property)
    const vec = tuple[1] as types.Vec<types.Vec<types.u8>>
    const challenges = vec.map(c => Bytes.fromHexString(c.toHex()))
    const decision = tuple[2] as types.bool
    const createdBlock = BigNumber.from((tuple[3] as types.u128).toNumber())
    return new ChallengeGame(
      propertyHash,
      challenges,
      decision.isTrue,
      createdBlock
    )
  }

  /**
   * @name isDecided
   * @description Gets if a game is decided or not
   * @param gameId
   */
  async isDecided(gameId: Bytes): Promise<boolean> {
    const codec = await this.api.query.adjudication.isDecided(
      gameId.toHexString()
    )
    const result = codec as types.bool
    return result.isTrue
  }

  /**
   * @name claimProperty
   * @description Claims property and create new game.
   *     Id of game is hash of claimed property.
   * @param property
   */
  async claimProperty(property: Property): Promise<void> {
    await this.api.tx.adjudication
      .claimProperty(this.encodeParam(property.toStruct()))
      .signAndSend(this.keyPair, {})
  }

  /**
   * @name decideClaimToTrue
   * @description Sets the game decision true when its dispute period has already passed.
   * @param gameId
   */
  async decideClaimToTrue(gameId: Bytes): Promise<void> {
    await this.api.tx.adjudication
      .decideClaimToTrue(this.encodeParam(gameId))
      .signAndSend(this.keyPair, {})
  }

  /**
   * @name decideClaimToFalse
   * @description Sets the game decision false when its challenge has been evaluated to true.
   * @param gameId
   * @param challengingGameId
   */
  async decideClaimToFalse(
    property: Property,
    challengingGame: Property
  ): Promise<void> {
    const propertyHash = this.getPropertyHash(property)
    const challengingGameId = this.getPropertyHash(challengingGame)
    await this.api.tx.adjudication
      .decideClaimToFalse(
        ...[propertyHash, challengingGameId].map(i => this.encodeParam(i))
      )
      .signAndSend(this.keyPair, {})
  }

  async decideClaimWithWitness(
    property: Property,
    witnesses: Bytes[]
  ): Promise<void> {
    const propertyHash = this.getPropertyHash(property)
    await this.api.tx.adjudication
      .decideClaimToFalse(
        this.encodeParam(propertyHash),
        witnesses.map(w => this.encodeParam(w))
      )
      .signAndSend(this.keyPair, {})
  }

  /**
   * @name removeChallenge
   * @description Removes a challenge when its decision has been evaluated to false.
   * @param gameId
   * @param challengingGameId
   */
  async removeChallenge(
    property: Property,
    challengingGame: Property
  ): Promise<void> {
    const propertyHash = this.getPropertyHash(property)
    const challengingGameId = this.getPropertyHash(challengingGame)
    await this.api.tx.adjudication
      .removeChallenge(
        ...[propertyHash, challengingGameId].map(i => this.encodeParam(i))
      )
      .signAndSend(this.keyPair, {})
  }

  /**
   * @name setPredicateDecision
   * @param gameId
   * @param decision
   */
  async setPredicateDecision(gameId: Bytes, decision: boolean): Promise<void> {
    await this.api.tx.adjudication
      .removeChallenge(this.encodeParam(gameId), decision)
      .signAndSend(this.keyPair, {})
  }

  /**
   * @name challenge
   * @description challenge a game specified by gameId with a challengingGame specified by _challengingGameId.
   * @param gameId
   * @param challengeInputs
   * @param challengingGameId
   */
  async challenge(
    property: Property,
    challengeInputs: List<Bytes>,
    challengingGame: Property
  ): Promise<void> {
    const gameId = this.getPropertyHash(property)
    const challengingGameId = this.getPropertyHash(challengingGame)
    await this.api.tx.adjudication
      .challenge(
        ...[gameId, challengeInputs, challengingGameId].map(i =>
          this.encodeParam(i)
        )
      )
      .signAndSend(this.keyPair, {})
  }

  /**
   * Start to subscribe AtomicPropositionDecided event
   * @param handler
   */
  subscribeAtomicPropositionDecided(
    handler: (gameId: Bytes, decision: boolean) => void
  ): void {
    this.eventWatcher.subscribe('AtomicPropositionDecided', (log: EventLog) => {
      const gameId: Codec = log.values[0]
      const decision = log.values[1] as types.bool
      handler(
        this.decodeParam(Bytes.default(), gameId) as Bytes,
        decision.isTrue
      )
    })
  }

  /**
   * Start to subscribe NewPropertyClaimed event
   * @param handler
   */
  subscribeNewPropertyClaimed(
    handler: (
      gameId: Bytes,
      property: Property,
      createdBlock: BigNumber
    ) => void
  ): void {
    this.eventWatcher.subscribe('NewPropertyClaimed', (log: EventLog) => {
      const gameId: Codec = log.values[0]
      const encodedProperty: Codec = log.values[1]
      const createdBlock: Codec = log.values[2]
      const property = Property.fromStruct(
        this.decodeParam(Property.getParamType(), encodedProperty) as Struct
      )
      handler(
        this.decodeParam(Bytes.default(), gameId) as Bytes,
        property,
        this.decodeParam(BigNumber.default(), createdBlock) as BigNumber
      )
    })
  }

  /**
   * Start to subscribe ClaimChallenged event
   * @param handler
   */
  subscribeClaimChallenged(
    handler: (gameId: Bytes, challengeGameId: Bytes) => void
  ): void {
    this.eventWatcher.subscribe('ClaimChallenged', (log: EventLog) => {
      const gameId: Codec = log.values[0]
      const challengeGameId: Codec = log.values[1]
      handler(
        this.decodeParam(Bytes.default(), gameId) as Bytes,
        this.decodeParam(Bytes.default(), challengeGameId) as Bytes
      )
    })
  }

  /**
   * Start to subscribe ClaimDecided event
   * @param handler
   */
  subscribeClaimDecided(
    handler: (gameId: Bytes, decision: boolean) => void
  ): void {
    this.eventWatcher.subscribe('ClaimChallenged', (log: EventLog) => {
      const gameId: Codec = log.values[0]
      const decision = log.values[1] as types.bool
      handler(
        this.decodeParam(Bytes.default(), gameId) as Bytes,
        decision.isTrue
      )
    })
  }

  /**
   * Start to subscribe ChallengeRemoved event
   * @param handler
   */
  subscribeChallengeRemoved(
    handler: (gameId: Bytes, challengeGameId: Bytes) => void
  ): void {
    this.eventWatcher.subscribe('ClaimChallenged', (log: EventLog) => {
      const gameId: Codec = log.values[0]
      const challengeGameId: Codec = log.values[1]
      handler(
        this.decodeParam(Bytes.default(), gameId) as Bytes,
        this.decodeParam(Bytes.default(), challengeGameId) as Bytes
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

  private getPropertyHash(property: Property) {
    const propertyHash = FixedBytes.fromHexString(
      32,
      Keccak256.hash(encodeProperty(PolcadotCoder, property)).toHexString()
    )
    return propertyHash
  }
}
