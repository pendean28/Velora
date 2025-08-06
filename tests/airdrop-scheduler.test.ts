import { describe, it, expect, beforeEach } from "vitest";

type AirdropEntry = {
  recipient: string;
  amount: bigint;
  tokenContract: string;
  tokenFunction: string;
  releaseBlock: number;
  claimed: boolean;
};

type Result<T> = { value: T } | { error: number };

const mockAirdropScheduler = {
  admin: "ST1ADMIN111111111111111111111111111111111",
  blockHeight: 1000,
  nextId: 1,
  airdrops: new Map<number, AirdropEntry>(),

  isAdmin(sender: string) {
    return sender === this.admin;
  },

  transferAdmin(sender: string, newAdmin: string): Result<boolean> {
    if (!this.isAdmin(sender)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 101 };
    this.admin = newAdmin;
    return { value: true };
  },

  scheduleAirdrop(
    sender: string,
    recipient: string,
    amount: bigint,
    tokenContract: string,
    tokenFunction: string,
    releaseBlock: number
  ): Result<number> {
    if (!this.isAdmin(sender)) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 101 };
    const id = this.nextId;
    this.airdrops.set(id, {
      recipient,
      amount,
      tokenContract,
      tokenFunction,
      releaseBlock,
      claimed: false
    });
    this.nextId += 1;
    return { value: id };
  },

  claimAirdrop(sender: string, id: number): Result<boolean> {
    const entry = this.airdrops.get(id);
    if (!entry) return { error: 102 };
    if (entry.recipient !== sender) return { error: 100 };
    if (entry.claimed) return { error: 104 };
    if (entry.releaseBlock > this.blockHeight) return { error: 103 };

    entry.claimed = true;
    this.airdrops.set(id, entry);
    return { value: true };
  },

  getAirdrop(id: number): AirdropEntry | undefined {
    return this.airdrops.get(id);
  }
};

describe("Airdrop Scheduler", () => {
  const user = "ST2USER222222222222222222222222222222222";
  const tokenContract = "ST3TOKEN333333333333333333333333333333333";
  const tokenFunction = "transfer";

  beforeEach(() => {
    mockAirdropScheduler.admin = "ST1ADMIN111111111111111111111111111111111";
    mockAirdropScheduler.nextId = 1;
    mockAirdropScheduler.blockHeight = 1000;
    mockAirdropScheduler.airdrops.clear();
  });

  it("should allow admin to schedule airdrop", () => {
    const result = mockAirdropScheduler.scheduleAirdrop(
      mockAirdropScheduler.admin,
      user,
      1000n,
      tokenContract,
      tokenFunction,
      1000
    );
    expect("value" in result).toBe(true);
    if ("value" in result) {
      const entry = mockAirdropScheduler.getAirdrop(result.value);
      expect(entry?.amount).toBe(1000n);
      expect(entry?.recipient).toBe(user);
    }
  });

  it("should reject non-admin from scheduling", () => {
    const result = mockAirdropScheduler.scheduleAirdrop(
      user,
      user,
      1000n,
      tokenContract,
      tokenFunction,
      1000
    );
    expect(result).toEqual({ error: 100 });
  });

  it("should not allow claiming before release block", () => {
    const schedule = mockAirdropScheduler.scheduleAirdrop(
      mockAirdropScheduler.admin,
      user,
      1000n,
      tokenContract,
      tokenFunction,
      1100
    );
    expect("value" in schedule).toBe(true);
    if ("value" in schedule) {
      const result = mockAirdropScheduler.claimAirdrop(user, schedule.value);
      expect(result).toEqual({ error: 103 });
    }
  });

  it("should allow claim when block height reached", () => {
    const schedule = mockAirdropScheduler.scheduleAirdrop(
      mockAirdropScheduler.admin,
      user,
      500n,
      tokenContract,
      tokenFunction,
      999
    );
    expect("value" in schedule).toBe(true);
    if ("value" in schedule) {
      const result = mockAirdropScheduler.claimAirdrop(user, schedule.value);
      expect(result).toEqual({ value: true });
    }
  });

  it("should prevent double claim", () => {
    const schedule = mockAirdropScheduler.scheduleAirdrop(
      mockAirdropScheduler.admin,
      user,
      1000n,
      tokenContract,
      tokenFunction,
      990
    );
    expect("value" in schedule).toBe(true);
    if ("value" in schedule) {
      const id = schedule.value;
      expect(mockAirdropScheduler.claimAirdrop(user, id)).toEqual({ value: true });
      expect(mockAirdropScheduler.claimAirdrop(user, id)).toEqual({ error: 104 });
    }
  });

  it("should reject claim from wrong user", () => {
    const schedule = mockAirdropScheduler.scheduleAirdrop(
      mockAirdropScheduler.admin,
      user,
      1000n,
      tokenContract,
      tokenFunction,
      1000
    );
    expect("value" in schedule).toBe(true);
    if ("value" in schedule) {
      const result = mockAirdropScheduler.claimAirdrop("ST4NOTRECIPIENT", schedule.value);
      expect(result).toEqual({ error: 100 });
    }
  });

  it("should allow admin transfer", () => {
    const result = mockAirdropScheduler.transferAdmin(mockAirdropScheduler.admin, "ST5NEWADMIN");
    expect(result).toEqual({ value: true });
    expect(mockAirdropScheduler.admin).toBe("ST5NEWADMIN");
  });

  it("should reject admin transfer from non-admin", () => {
    const result = mockAirdropScheduler.transferAdmin(user, "ST5NEWADMIN");
    expect(result).toEqual({ error: 100 });
  });
});
