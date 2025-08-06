import { describe, it, expect, beforeEach } from "vitest"

type Proposal = {
  proposer: string
  description: string
  startBlock: number
  endBlock: number
  executed: boolean
  yesVotes: bigint
  noVotes: bigint
}

type VoteKey = `${number}-${string}`

const daoMock = {
  admin: "ST1ADMIN...",
  block: 1000,
  proposalId: 0,
  proposals: new Map<number, Proposal>(),
  hasVoted: new Set<VoteKey>(),
  balances: new Map<string, bigint>(),

  nextBlock() {
    this.block += 1
  },

  getTokenBalance(address: string) {
    return this.balances.get(address) || 0n
  },

  createProposal(caller: string, description: string, duration: number) {
    const id = ++this.proposalId
    this.proposals.set(id, {
      proposer: caller,
      description,
      startBlock: this.block,
      endBlock: this.block + duration,
      executed: false,
      yesVotes: 0n,
      noVotes: 0n
    })
    return { value: id }
  },

  vote(caller: string, proposalId: number, support: boolean) {
    const prop = this.proposals.get(proposalId)
    if (!prop) return { error: 103 }

    if (this.block < prop.startBlock || this.block > prop.endBlock) return { error: 104 }

    const key: VoteKey = `${proposalId}-${caller}`
    if (this.hasVoted.has(key)) return { error: 102 }

    const weight = this.getTokenBalance(caller)
    this.hasVoted.add(key)

    if (support) {
      prop.yesVotes += weight
    } else {
      prop.noVotes += weight
    }

    return { value: true }
  },

  executeProposal(caller: string, proposalId: number) {
    const prop = this.proposals.get(proposalId)
    if (!prop) return { error: 103 }
    if (this.block < prop.endBlock) return { error: 105 }
    if (prop.executed) return { error: 106 }
    if (prop.yesVotes <= prop.noVotes) return { error: 106 }

    prop.executed = true
    return { value: true }
  }
}

describe("Watch DAO Governance", () => {
  const alice = "ST1ALICE..."
  const bob = "ST1BOB..."

  beforeEach(() => {
    daoMock.block = 1000
    daoMock.proposalId = 0
    daoMock.proposals.clear()
    daoMock.hasVoted.clear()
    daoMock.balances.set(alice, 100n)
    daoMock.balances.set(bob, 50n)
  })

  it("creates a proposal", () => {
    const result = daoMock.createProposal(alice, "Fund WatchNode R&D", 20)
    expect("value" in result).toBe(true)
    expect(daoMock.proposals.get(result.value)?.description).toBe("Fund WatchNode R&D")
  })

  it("allows voting within block range", () => {
    const { value: proposalId } = daoMock.createProposal(alice, "Upgrade Security", 10)
    const vote = daoMock.vote(bob, proposalId, true)
    expect("value" in vote).toBe(true)
    const proposal = daoMock.proposals.get(proposalId)!
    expect(proposal.yesVotes).toBe(50n)
  })

  it("prevents double voting", () => {
    const { value: proposalId } = daoMock.createProposal(alice, "Patch bug", 10)
    daoMock.vote(bob, proposalId, true)
    const second = daoMock.vote(bob, proposalId, false)
    expect("error" in second && second.error).toBe(102)
  })

  it("rejects voting outside time window", () => {
    const { value: proposalId } = daoMock.createProposal(alice, "Closed vote", 2)
    daoMock.block += 5
    const vote = daoMock.vote(bob, proposalId, true)
    expect("error" in vote && vote.error).toBe(104)
  })

  it("executes passing proposal", () => {
    const { value: proposalId } = daoMock.createProposal(alice, "Fund new WatchApp", 1)
    daoMock.vote(alice, proposalId, true)
    daoMock.nextBlock()
    const exec = daoMock.executeProposal(alice, proposalId)
    expect("value" in exec).toBe(true)
    expect(daoMock.proposals.get(proposalId)?.executed).toBe(true)
  })

  it("does not execute if not enough yes votes", () => {
    const { value: proposalId } = daoMock.createProposal(alice, "Bad idea", 1)
    daoMock.vote(bob, proposalId, false)
    daoMock.nextBlock()
    const exec = daoMock.executeProposal(alice, proposalId)
    expect("error" in exec && exec.error).toBe(106)
  })
})
