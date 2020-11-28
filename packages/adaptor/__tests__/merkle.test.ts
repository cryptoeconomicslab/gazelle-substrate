import {
  Address,
  Bytes,
  BigNumber,
  FixedBytes,
  Range
} from '@cryptoeconomicslab/primitives'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import {
  DoubleLayerTree,
  DoubleLayerTreeLeaf,
  DoubleLayerInclusionProof,
  DoubleLayerTreeVerifier,
  IntervalTreeInclusionProof,
  IntervalTreeNode,
  AddressTreeInclusionProof
} from '@cryptoeconomicslab/merkle-tree'
import PolcadotCoder from '../src/coder/PolcadotCoder'
import { setupContext } from '@cryptoeconomicslab/context'
setupContext({ coder: PolcadotCoder })

describe('MerkleTree', () => {
  const tokenAddress = Address.default()
  const leaf0 = new DoubleLayerTreeLeaf(
    tokenAddress,
    BigNumber.from(0),
    FixedBytes.from(32, Keccak256.hash(Bytes.fromString('leaf0')).data)
  )
  const leaf1 = new DoubleLayerTreeLeaf(
    tokenAddress,
    BigNumber.from(7),
    FixedBytes.from(32, Keccak256.hash(Bytes.fromString('leaf1')).data)
  )
  const leaf2 = new DoubleLayerTreeLeaf(
    tokenAddress,
    BigNumber.from(15),
    FixedBytes.from(32, Keccak256.hash(Bytes.fromString('leaf2')).data)
  )
  const leaf3 = new DoubleLayerTreeLeaf(
    tokenAddress,
    BigNumber.from(5000),
    FixedBytes.from(32, Keccak256.hash(Bytes.fromString('leaf3')).data)
  )

  beforeEach(() => {})

  describe('DoubleLayerTree', () => {
    test('sucees to verify leaf with inclusion proof', () => {
      const tree = new DoubleLayerTree([leaf0, leaf1, leaf2, leaf3])
      const inclusionProof = tree.getInclusionProofByAddressAndIndex(
        tokenAddress,
        0
      )
      const root = tree.getRoot()
      expect(inclusionProof).toEqual(
        new DoubleLayerInclusionProof(
          new IntervalTreeInclusionProof(BigNumber.from(0), 0, [
            new IntervalTreeNode(
              BigNumber.from(7),
              FixedBytes.fromHexString(
                32,
                '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da'
              )
            ),
            new IntervalTreeNode(
              BigNumber.from(5000),
              FixedBytes.fromHexString(
                32,
                '0x979355d8d7916979442ffd9e03bd5e6a7be3dea7b69098a2ea769fa4591318cc'
              )
            )
          ]),
          new AddressTreeInclusionProof(tokenAddress, 0, [])
        )
      )
      expect(
        PolcadotCoder.encode(inclusionProof.toStruct()).toHexString()
      ).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000880036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da0700000000000000000000000000000080979355d8d7916979442ffd9e03bd5e6a7be3dea7b69098a2ea769fa4591318cc88130000000000000000000000000000'
      )
      expect(root.toHexString()).toBe(
        '0x2a282a20548d971e6f006c4d559a699a04b6c4fc40425f55b48c282cd42fe8b3'
      )

      const range = new Range(BigNumber.from(0), BigNumber.from(5))
      const verifier = new DoubleLayerTreeVerifier()

      expect(
        verifier.verifyInclusion(leaf0, range, root, inclusionProof)
      ).toBeTruthy()
    })

    test('fail to verify because of invalid inclusion proof', () => {
      const tree = new DoubleLayerTree([leaf0, leaf1, leaf2, leaf3])
      const root = tree.getRoot()
      const invalidInclusionProof = new DoubleLayerInclusionProof(
        new IntervalTreeInclusionProof(BigNumber.from(0), 0, [
          new IntervalTreeNode(
            BigNumber.from(0),
            FixedBytes.fromHexString(
              32,
              '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da'
            )
          ),
          new IntervalTreeNode(
            BigNumber.from(7),
            FixedBytes.fromHexString(
              32,
              '0x979355d8d7916979442ffd9e03bd5e6a7be3dea7b69098a2ea769fa4591318cc'
            )
          )
        ]),
        new AddressTreeInclusionProof(tokenAddress, 0, [])
      )
      expect(
        PolcadotCoder.encode(invalidInclusionProof.toStruct()).toHexString()
      ).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000880036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da0000000000000000000000000000000080979355d8d7916979442ffd9e03bd5e6a7be3dea7b69098a2ea769fa4591318cc07000000000000000000000000000000'
      )
      expect(root.toHexString()).toBe(
        '0x2a282a20548d971e6f006c4d559a699a04b6c4fc40425f55b48c282cd42fe8b3'
      )

      const range = new Range(BigNumber.from(0), BigNumber.from(5))
      const verifier = new DoubleLayerTreeVerifier()

      expect(() => {
        verifier.verifyInclusion(leaf0, range, root, invalidInclusionProof)
      }).toThrowError('required range must not exceed the implicit range')
    })
  })
})
