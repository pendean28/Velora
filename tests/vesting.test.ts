import { describe, it, expect, beforeEach } from "vitest"

type VestingSchedule = {
  total: bigint
  cliffEnd: number
  start: number
  duration: number
  claimed: bigint
}

type Result<T> = { value: T } | { error: number }

const mockVestingContract = {
  admin: "ST2ADMIN123",
  vestings: new Map<string, VestingSchedule>(),

  isAdmin(caller: string) {
    return caller === this.admin
  },

  setAdmin(caller: string, newAdmin: string): Result<boolean> {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 105 }
    this.admin = newAdmin
    return { value: true }
  },

  initializeVesting(
    caller: string,
    recipient: string,
    total: bigint,
    cliffEnd: number,
    start: number,
    duration: number
  ): Result<boolean> {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (this.vestings.has(recipient)) return { error: 101 }
    this.vestings.set(recipient, {
      total,
      cliffEnd,
      start,
      duration,
      claimed: 0n
    })
    return { value: true }
  },

  claim(caller: string, currentBlock: number): Result<bigint> {
    const schedule = this.vestings.get(caller)
    if (!schedule) return { error: 102 }
    if (currentBlock < schedule.cliffEnd) return { error: 104 }

    const elapsed = currentBlock - schedule.start
    const clamped = elapsed > schedule.duration ? schedule.duration : elapsed
    const vested = (schedule.total * BigInt(clamped)) / BigInt(schedule.duration)
    const claimable = vested - schedule.claimed

    if (claimable <= 0n) return { error: 103 }

    schedule.claimed += claimable
    return { value: claimable }
  },

  getVesting(recipient: string): Result<VestingSchedule | null> {
    return { value: this.vestings.get(recipient) ?? null }
  }
}

describe("Vesting Contract", () => {
  const user = "ST3USER123"
  const admin = "ST2ADMIN123"
  const now = 100

  beforeEach(() => {
    mockVestingContract.admin = admin
    mockVestingContract.vestings = new Map()
  })

  it("should allow admin to initialize vesting", () => {
    const result = mockVestingContract.initializeVesting(admin, user, 1000n, 105, 100, 50)
    expect("value" in result).toBe(true)
  })

  it("should not allow duplicate vesting", () => {
    mockVestingContract.initializeVesting(admin, user, 1000n, 105, 100, 50)
    const result = mockVestingContract.initializeVesting(admin, user, 2000n, 110, 100, 50)
    expect(result).toEqual({ error: 101 })
  })

  it("should return error if non-admin tries to initialize", () => {
    const result = mockVestingContract.initializeVesting("ST4BAD", user, 1000n, 105, 100, 50)
    expect(result).toEqual({ error: 100 })
  })

  it("should not allow claiming before cliff", () => {
    mockVestingContract.initializeVesting(admin, user, 1000n, 110, 100, 50)
    const result = mockVestingContract.claim(user, 105)
    expect(result).toEqual({ error: 104 })
  })

  it("should allow partial claim after cliff", () => {
    mockVestingContract.initializeVesting(admin, user, 1000n, 105, 100, 50)
    const result = mockVestingContract.claim(user, 110)
    expect("value" in result && result.value > 0n).toBe(true)
  })

  it("should not allow claim if nothing left", () => {
    mockVestingContract.initializeVesting(admin, user, 1000n, 105, 100, 10)
    mockVestingContract.claim(user, 110)
    const result = mockVestingContract.claim(user, 120)
    expect(result).toEqual({ error: 103 })
  })

  it("should update admin properly", () => {
    const result = mockVestingContract.setAdmin(admin, "ST5NEWADMIN")
    expect("value" in result && result.value === true).toBe(true)
    expect(mockVestingContract.admin).toBe("ST5NEWADMIN")
  })

  it("should not allow zero address admin", () => {
    const result = mockVestingContract.setAdmin(admin, "SP000000000000000000002Q6VF78")
    expect(result).toEqual({ error: 105 })
  })
})
