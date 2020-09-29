export interface SubstarteContractConfig {
  adjudicationContract: string
  commitment: string
  PlasmaETH: string
  payoutContracts: {
    OwnershipPayout: string
    DepositContract: string
  }
  checkpointDisputeContract: string
  exitDisputeContract: string
}
