import { ApiPromise } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import AccountId from '@polkadot/types/generic/AccountId'
import { TypeRegistry } from '@polkadot/types'
import { IERC20DetailedContract } from '@cryptoeconomicslab/contract'
import { Address, Integer, BigNumber } from '@cryptoeconomicslab/primitives'
import { Codec } from '@polkadot/types/types'
import { Codable } from '@cryptoeconomicslab/primitives'
import { encodeToPolcadotCodec } from '../coder'

export class ERC20Contract implements IERC20DetailedContract {
  registry: TypeRegistry
  contractId: AccountId

  constructor(
    readonly address: Address,
    readonly api: ApiPromise,
    readonly operatorKeyPair: KeyringPair
  ) {
    this.registry = new TypeRegistry()
    this.contractId = new AccountId(this.registry, this.address.data)
  }

  public async approve(spender: Address, amount: BigNumber) {
    await this.api.tx.commitment
      .approve(spender.data, this.encodeParam(amount))
      .signAndSend(this.operatorKeyPair, {})
  }

  public async decimals(): Promise<Integer> {
    return Integer.from(18)
  }

  private encodeParam(input: Codable): Codec {
    return encodeToPolcadotCodec(this.registry, input)
  }
}
