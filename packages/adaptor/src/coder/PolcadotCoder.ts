import { Coder } from '@cryptoeconomicslab/coder'
import {
  Codable,
  Address,
  Bytes,
  List,
  Tuple,
  Struct,
  Integer,
  BigNumber,
  FixedBytes
} from '@cryptoeconomicslab/primitives'
import * as types from '@polkadot/types'
import TypeRegistry = types.TypeRegistry
import { Constructor, Codec } from '@polkadot/types/types'

/**
 * mapping between @cryptoeconomicslab/primitives and polcadot-js
 * Address -> AccountId
 * Bytes -> Vec<u8>
 * Integer -> U256
 * BigNumber -> U256
 * List<T> -> Vec<T>
 * Tuple<T[]> -> Tuple<T[]>
 * Struct<{[key: string]: T}> -> Tuple<T[]>
 */
type TypeString = 'AccountId' | 'u128' | 'Vec<u8>'

function getVecType<T extends Codable>(l: List<T>): any {
  return getTypeString(l.getC().default())
}

function getTupleType(t: Tuple | Struct) {
  if (t instanceof Tuple) {
    return t.data.map(r => getTypeString(r))
  } else if (t instanceof Struct) {
    return t.data.map(r => getTypeString(r.value))
  } else {
    throw new Error('Invalid type to get tuple type')
  }
}

function getTypeString(
  v: Codable
): TypeString | Constructor<types.Tuple> | Constructor<types.Vec<Codec>> {
  if (v instanceof Address) {
    return 'AccountId'
  } else if (v instanceof Bytes || v instanceof FixedBytes) {
    return types.Vec.with('u8')
  } else if (v instanceof Integer || v instanceof BigNumber) {
    return 'u128'
  } else if (v instanceof List) {
    return types.Vec.with(getVecType(v))
  } else if (v instanceof Tuple) {
    return types.Tuple.with(getTupleType(v))
  } else if (v instanceof Struct) {
    return types.Tuple.with(getTupleType(v))
  }
  throw new Error(
    `Invalid type to get type string for Polcadot Abi coder: ${v.toString()}`
  )
}

/**
 * encode @cryptoeconomicslab/primitives/Codable to @polkadot/types/types/Codec
 * @param registry
 * @param input
 */
export function encodeToPolcadotCodec(
  registry: TypeRegistry,
  input: Codable
): Codec {
  if (input instanceof Address) {
    return new types.GenericAccountId(
      registry,
      Bytes.fromHexString(input.data).data
    )
  } else if (input instanceof Bytes || input instanceof FixedBytes) {
    return new types.Vec(
      registry,
      'u8',
      Array.from(input.data).map(d => d.toString())
    )
  } else if (input instanceof Integer) {
    return new types.u128(registry, input.raw)
  } else if (input instanceof BigNumber) {
    return new types.u128(registry, input.raw)
  } else if (input instanceof List) {
    return new types.Vec(
      registry,
      getVecType(input),
      input.data.map(d => encodeToPolcadotCodec(registry, d))
    )
  } else if (input instanceof Tuple) {
    return new types.Tuple(
      registry,
      getTupleType(input),
      input.data.map(d => encodeToPolcadotCodec(registry, d))
    )
  } else if (input instanceof Struct) {
    return new types.Tuple(
      registry,
      getTupleType(input),
      input.data.map(d => encodeToPolcadotCodec(registry, d.value))
    )
  }
  throw new Error(
    `Invalid type to encode for Polcadot Abi coder: ${input.toString()}`
  )
}

/**
 * decode @polkadot/types/types/Codec to @cryptoeconomicslab/primitives/Codable
 * @param registry
 * @param definition
 * @param data
 */
export function decodeFromPolcadotCodec(
  registry: TypeRegistry,
  definition: Codable,
  data: any
): Codable {
  if (definition instanceof Address) {
    const accountId = data as types.GenericAccountId
    return new Address(accountId.toHex())
  } else if (definition instanceof Bytes) {
    const arr = data as types.Vec<types.u8>
    return Bytes.from(
      Uint8Array.from(
        arr.map(c => {
          return c.toU8a()[0]
        })
      )
    )
  } else if (definition instanceof FixedBytes) {
    const arr = data as types.Vec<types.u8>
    return FixedBytes.from(
      definition.size,
      Uint8Array.from(
        arr.map(c => {
          return c.toU8a()[0]
        })
      )
    )
  } else if (definition instanceof Integer) {
    return Integer.from(Number(data))
  } else if (definition instanceof BigNumber) {
    return BigNumber.fromString(data)
  } else if (definition instanceof List) {
    const arr = data as any[]
    return List.from(
      definition.getC().default(),
      arr.map(c =>
        decodeFromPolcadotCodec(registry, definition.getC().default(), c)
      )
    )
  } else if (definition instanceof Tuple) {
    const tuple = data as types.Tuple
    return Tuple.from(
      tuple.map((c, index) => {
        return decodeFromPolcadotCodec(registry, definition.data[index], c)
      })
    )
  } else if (definition instanceof Struct) {
    const tuple = data as types.Tuple
    return Struct.from(
      tuple.map((c, index) => {
        return {
          key: definition.data[index].key,
          value: decodeFromPolcadotCodec(
            registry,
            definition.data[index].value,
            c
          )
        }
      })
    )
  } else {
    throw new Error('method not implemented')
  }
}

function innerDecode(registry: TypeRegistry, definition: Codable, data: Bytes) {
  if (definition instanceof Address) {
    return types.GenericAccountId.from(data.data)
  } else if (definition instanceof Bytes) {
    return types.Vec.decodeVec(registry, types.u8, data.data)
  } else if (definition instanceof FixedBytes) {
    return types.Vec.decodeVec(registry, types.u8, data.data)
  } else if (definition instanceof Integer || definition instanceof BigNumber) {
    return new types.u128(registry, data.data)
  } else if (definition instanceof List) {
    return types.Vec.decodeVec(registry, getVecType(definition), data.data)
  } else if (definition instanceof Tuple) {
    return new types.Tuple(registry, getTupleType(definition), data.data)
  } else if (definition instanceof Struct) {
    return new types.Tuple(registry, getTupleType(definition), data.data)
  } else {
    throw new Error('method not implemented')
  }
}

// Polcadot coder object
export const PolcadotCoder: Coder = {
  /**
   * encode given codable object into EthereumABI hex string representation
   * @param input codable object to encode
   */
  encode(input: Codable): Bytes {
    const registry = new TypeRegistry()
    return Bytes.from(encodeToPolcadotCodec(registry, input).toU8a())
  },
  /**
   * decode given hex string into given codable object
   * @param d Codable object to represent into what type data is decoded
   * @param data hex string to decode
   */
  decode<T extends Codable>(d: T, data: Bytes): T {
    const registry = new TypeRegistry()
    return decodeFromPolcadotCodec(
      registry,
      d,
      innerDecode(registry, d, data)
    ) as T
  }
}

export default PolcadotCoder
