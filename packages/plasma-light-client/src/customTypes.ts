export default {
  StakingParameters: {
    canBeNominated: "bool",
    optionExpired: "u128",
    optionP: "u32",
  },
  Parameters: {
    canBeNominated: "bool",
    optionExpired: "u128",
    optionP: "u32",
  },
  OfferState: {
    _enum: ["Waiting", "Reject", "Accept"],
  },
  OfferOf: {
    buyer: "AccountId",
    sender: "AccountId",
    contracts: "Vec<AccountId>",
    amount: "Balance",
    expired: "BlockNumber",
    state: "OfferState",
  },
  EraStakingPoints: {
    total: "Balance",
    individual: "BTreeMap<AccountId, Balance>",
  },
  Releases: {
    _enum: ["V1_0_0"],
  },
  WeightToFeeCoefficient: {
    coeffInteger: "Balance",
    coeffFrac: "Perbill",
    negative: "bool",
    degree: "u8",
  },
  ClaimId: 'H256',
  Lockdrop: {
      type: 'u8',
      transaction_hash: 'H256',
      public_key: '[u8; 33]',
      duration: 'u64',
      value: 'u128',
  },
  TickerRate: {
      authority: 'u16',
      btc: 'DollarRate',
      eth: 'DollarRate',
  },
  DollarRate: 'u128',
  AuthorityId: 'AccountId',
  AuthorityVote: 'u32',
  ClaimVote: {
      claim_id: 'ClaimId',
      approve: 'bool',
      authority: 'u16',
  },
  Claim: {
      params: 'Lockdrop',
      approve: 'BTreeSet<AuthorityId>',
      decline: 'BTreeSet<AuthorityId>',
      amount: 'u128',
      complete: 'bool',
  },
  Decision: {
    _enum: ["Undecided", "True", "False"]
  },
  ChallengeGameOf: {
    propertyHash: "H256",
    challenges: "Vec<H256>",
    decision: "Decision",
    createdBlock: "BlockNumber"
  },
  PredicateContractOf: {
    predicateHash: "H256",
    inputs: "Vec<u8>"
  },
  PredicateHash: "H256",
  Schedule: {
    version: "u32",
    putCodePerByteCost: "Weight"
  },
  PrefabOvmModule: {
    scheduleVersion: "u32",
    code: "Vec<u8>"
  },
  Property: {
    predicateAddress: "AccountId",
    inputs: "Vec<Vec<u8>>"
  },
  PropertyOf: {
    predicateAddress: "AccountId",
    inputs: "Vec<Vec<u8>>"
  },
  Range: {
    start: "u128",
    end: "u128"
  },
  RangeOf: {
    start: "u128",
    end: "u128"
  },
  StateUpdate: {
    depositContractAddress: "AccountId",
    range: "Range",
    blockNumber: "BlockNumber",
    stateObject: "Property",
  },
  Checkpoint: {
    stateUpdate: "Property",
  },
  Exit: {
    stateUpdate: "StateUpdate",
    inclusionProof: "InclusionProof",
  },
  InclusionProof: {
    addressInclusionProof: "AddressInclusionProof",
    intervalInclusionProof: "IntervalInclusionProof",
  },
  IntervalInclusionProof: {
    leafIndex: "Balance",
    leafPosition: "Balance",
    siblings: "Vec<IntervalTreeNode>",
  },
  AddressInclusionProof: {
    leafIndex: "AccountId",
    leafPosition: "Balance",
    siblings: "Vec<AddressTreeNode>",
  },
  IntervalTreeNode: {
    data: "H256",
    start: "Balance",
  },
  AddressTreeNode: {
    data: "H256",
    tokenAddress: "AccountId",
  },
  ExitDeposit: {
    stateUpdate: "StateUpdate",
    checkpoint: "Checkpoint",
  }
}
