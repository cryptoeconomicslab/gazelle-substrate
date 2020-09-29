import PolcadotCoder from '../../src/coder/PolcadotCoder'
import {
  BigNumber,
  Bytes,
  FixedBytes,
  List,
  Tuple,
  Address,
  Struct,
  Integer,
  Property,
  Range
} from '@cryptoeconomicslab/primitives'
import { UnsignedTransaction } from '@cryptoeconomicslab/plasma'
import { setupContext } from '@cryptoeconomicslab/context'
setupContext({ coder: PolcadotCoder })

describe('PolcadotCoder', () => {
  describe('encode', () => {
    test('encode Address', () => {
      const address = Address.from(
        '0x2f8c6129d816cf51c374bc7f08c3e63ed156cf78aefb4a6550d97b87997977ee'
      )
      const encoded = PolcadotCoder.encode(address)
      expect(encoded.toHexString()).toBe(
        '0x2f8c6129d816cf51c374bc7f08c3e63ed156cf78aefb4a6550d97b87997977ee'
      )
    })

    test('encode BigNumber', () => {
      const encoded = PolcadotCoder.encode(BigNumber.from(100))
      expect(encoded.toHexString()).toBe('0x64000000000000000000000000000000')
      const encoded0 = PolcadotCoder.encode(BigNumber.from(0))
      expect(encoded0.toHexString()).toBe('0x00000000000000000000000000000000')
    })

    test('encode Bytes', () => {
      const encoded = PolcadotCoder.encode(Bytes.fromHexString('0x0012345678'))
      expect(encoded.toHexString()).toBe('0x140012345678')
    })

    test('encode FixedBytes', () => {
      const encoded = PolcadotCoder.encode(
        FixedBytes.fromHexString(16, '0x00000000000000000000000000000102')
      )
      expect(encoded.toHexString()).toBe('0x4000000000000000000000000000000102')
    })

    test('encode List of Bytes', () => {
      const encoded = PolcadotCoder.encode(
        List.from(Bytes, [Bytes.fromHexString('0x0012345678')])
      )
      expect(encoded.toHexString()).toBe('0x04140012345678')
    })

    test('encode Tuple', () => {
      const encoded = PolcadotCoder.encode(
        Tuple.from([BigNumber.from(100), Bytes.fromHexString('0x0012345678')])
      )
      expect(encoded.toHexString()).toBe(
        '0x64000000000000000000000000000000140012345678'
      )
    })

    test('encode List of Tuple', () => {
      const factory = {
        default: () => Tuple.from([BigNumber.default(), Bytes.default()])
      }
      const encoded = PolcadotCoder.encode(
        List.from(factory, [
          Tuple.from([
            BigNumber.from(100),
            Bytes.fromHexString('0x001234567801')
          ]),
          Tuple.from([
            BigNumber.from(200),
            Bytes.fromHexString('0x001234567802')
          ])
        ])
      )
      expect(encoded.toHexString()).toBe(
        '0x086400000000000000000000000000000018001234567801c800000000000000000000000000000018001234567802'
      )
    })

    test('encode Tuple of Tuple', () => {
      const encoded = PolcadotCoder.encode(
        Tuple.from([
          Tuple.from([
            BigNumber.from(100),
            Bytes.fromHexString('0x0012345678')
          ]),
          Tuple.from([
            Bytes.fromHexString('0x000001'),
            Bytes.fromHexString('0x000002')
          ])
        ])
      )
      expect(encoded.toHexString()).toBe(
        '0x640000000000000000000000000000001400123456780c0000010c000002'
      )
    })

    test('encode Struct', () => {
      const encoded = PolcadotCoder.encode(
        Struct.from([
          {
            key: 'num',
            value: BigNumber.from(100)
          },
          {
            key: 'bytes',
            value: Bytes.fromHexString('0x0012345678')
          }
        ])
      )
      expect(encoded.toHexString()).toBe(
        '0x64000000000000000000000000000000140012345678'
      )
    })
  })

  describe('decode', () => {
    test('decode Address', () => {
      const decoded = PolcadotCoder.decode(
        Address.default(),
        Bytes.fromHexString(
          '0x2f8c6129d816cf51c374bc7f08c3e63ed156cf78aefb4a6550d97b87997977ee'
        )
      )
      expect(decoded).toEqual(
        new Address(
          '0x2f8c6129d816cf51c374bc7f08c3e63ed156cf78aefb4a6550d97b87997977ee'
        )
      )
    })

    test('decode Bytes', () => {
      const decoded = PolcadotCoder.decode(
        Bytes.default(),
        Bytes.fromHexString('0x140012345678')
      )
      expect(decoded.toHexString()).toEqual('0x0012345678')
    })

    test('decode FixedBytes', () => {
      const decoded = PolcadotCoder.decode(
        FixedBytes.default(16),
        Bytes.fromHexString('0x4000000000000000000000000000000102')
      )
      expect(decoded.toHexString()).toEqual(
        '0x00000000000000000000000000000102'
      )
    })

    test('decode Integer', () => {
      const decoded = PolcadotCoder.decode(
        Integer.default(),
        Bytes.fromHexString(
          '0x6400000000000000000000000000000000000000000000000000000000000000'
        )
      )
      expect(decoded.data).toEqual(100)
    })
    test('decode BigNumber', () => {
      const decoded = PolcadotCoder.decode(
        BigNumber.default(),
        Bytes.fromHexString('0x64000000000000000000000000000000')
      )
      expect(decoded.raw).toEqual('100')
    })
    test('decode List', () => {
      const decoded = PolcadotCoder.decode(
        List.default(Bytes, Bytes.default()),
        Bytes.fromHexString('0x04140012345678')
      )
      expect(decoded.data).toEqual([Bytes.fromHexString('0x0012345678')])
    })
    test('decode Tuple', () => {
      const t = Tuple.from([BigNumber.default(), Bytes.default()])
      const decoded = PolcadotCoder.decode(
        t,
        Bytes.fromHexString('0x64000000000000000000000000000000140012345678')
      )
      expect(decoded.data).toEqual([
        BigNumber.from(100),
        Bytes.fromHexString('0x0012345678')
      ])
    })
    test('decode List of Tuple', () => {
      const factory = {
        default: () => Tuple.from([BigNumber.default(), Bytes.default()])
      }
      const decoded = PolcadotCoder.decode(
        List.default(
          factory,
          Tuple.from([BigNumber.default(), Bytes.default()])
        ),
        Bytes.fromHexString(
          '0x086400000000000000000000000000000018001234567801c800000000000000000000000000000018001234567802'
        )
      )
      expect(decoded.data).toEqual([
        Tuple.from([
          BigNumber.from(100),
          Bytes.fromHexString('0x001234567801')
        ]),
        Tuple.from([BigNumber.from(200), Bytes.fromHexString('0x001234567802')])
      ])
    })
    test('decode Tuple of Tuple', () => {
      const t = Tuple.from([
        Tuple.from([BigNumber.default(), Bytes.default()]),
        Tuple.from([Bytes.default(), Bytes.default()])
      ])
      const decoded = PolcadotCoder.decode(
        t,
        Bytes.fromHexString(
          '0x640000000000000000000000000000001400123456780c0000010c000002'
        )
      )
      expect(decoded.data).toEqual([
        Tuple.from([BigNumber.from(100), Bytes.fromHexString('0x0012345678')]),
        Tuple.from([
          Bytes.fromHexString('0x000001'),
          Bytes.fromHexString('0x000002')
        ])
      ])
    })
    test('decode Struct', () => {
      const t = Struct.from([
        { key: 'num', value: BigNumber.default() },
        { key: 'bytes', value: Bytes.default() }
      ])
      const decoded = PolcadotCoder.decode(
        t,
        Bytes.fromHexString('0x64000000000000000000000000000000140012345678')
      )
      expect(decoded.data).toEqual([
        { key: 'num', value: BigNumber.from(100) },
        { key: 'bytes', value: Bytes.fromHexString('0x0012345678') }
      ])
    })
  })

  describe('Transaction', () => {
    test('encode Transaction', () => {
      const depositContractAddress = Address.from(
        '0x0000000000000000000000000000000000000001'
      )
      const range = new Range(BigNumber.from(0), BigNumber.from(10))
      const maxBlockNumber = BigNumber.from(10)
      const ownershipPredicateAddress = Address.from(
        '0x0000000000000000000000000000000000000002'
      )
      const owner = Address.from('0x0000000000000000000000000000000000000003')
      const ownershipState = new Property(ownershipPredicateAddress, [
        PolcadotCoder.encode(owner)
      ])
      const chunkId = FixedBytes.default(32)
      const from = Address.from('0x0000000000000000000000000000000000000004')
      const tx = new UnsignedTransaction(
        depositContractAddress,
        range,
        maxBlockNumber,
        ownershipState,
        chunkId,
        from
      )
      const transactionPredicateAddress = Address.from(
        '0x0000000000000000000000000000000000000005'
      )
      // current transaction body data
      expect(PolcadotCoder.encode(tx.toStruct()).toHexString()).toEqual(
        '0x0000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000048000000000000000000000000000000000000000030000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000'
      )
      // optimize?
      expect(PolcadotCoder.encode(tx.message).toHexString()).toEqual(
        '0x4d030000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000048000000000000000000000000000000000000000030000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000'
      )
    })
  })
})
