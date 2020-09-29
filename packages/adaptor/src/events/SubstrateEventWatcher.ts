import { KeyValueStore } from '@cryptoeconomicslab/db'
import {
  EventDb,
  EventHandler,
  ErrorHandler,
  IEventWatcher,
  CompletedHandler
} from '@cryptoeconomicslab/contract'
import { BigNumber } from '@cryptoeconomicslab/primitives'
import { ApiPromise } from '@polkadot/api'

export type SubstrateEventWatcherArgType = {
  api: ApiPromise
  kvs: KeyValueStore
  contractAddress: string
}

export default class EventWatcher implements IEventWatcher {
  public api: ApiPromise
  public eventDb: EventDb
  public checkingEvents: Map<string, EventHandler>
  public timer?: number
  public contractAddress: string

  constructor({ api, kvs, contractAddress }: SubstrateEventWatcherArgType) {
    this.api = api
    this.eventDb = new EventDb(kvs)
    this.checkingEvents = new Map<string, EventHandler>()
    this.contractAddress = contractAddress
  }

  /**
   * Add new handler for an event
   * @param event event name
   * @param handler handler function
   */
  public subscribe(event: string, handler: EventHandler) {
    this.checkingEvents.set(event, handler)
  }

  /**
   * Remove handler for an event
   * @param event event name
   * @param handler handler function
   */
  public unsubscribe(event: string, handler: EventHandler) {
    this.checkingEvents.delete(event)
  }

  /**
   * Start subscribing
   * @param handler
   * @param errorHandler
   */
  public async start(handler: CompletedHandler, errorHandler?: ErrorHandler) {
    this.api.query.system.events(events => {
      events.forEach(record => {
        const { event } = record
        const handler = this.checkingEvents.get(event.method)
        if (handler) {
          handler({
            name: event.method,
            values: event.data,
            mainchainBlockNumber: BigNumber.from(0)
          })
        } else {
          console.warn(`unknow event ${event.method}.`)
        }
      })
    })
  }

  public async cancel() {
    console.log('cancel is not implemented.')
  }
}
