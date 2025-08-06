import { describe, it, expect, beforeEach } from "vitest"

type Role = "admin" | "moderator" | "viewer"
type Result<T> = { value: T } | { error: number }

const mockAccessControl = {
  admin: "ST1ADMIN",
  roles: new Map<string, boolean>(),

  _roleKey(role: Role, user: string) {
    return `${role}:${user}`
  },

  isAdmin(caller: string) {
    return caller === this.admin
  },

  grantRole(caller: string, role: Role, user: string): Result<boolean> {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (user === "SP000000000000000000002Q6VF78") return { error: 103 }
    this.roles.set(this._roleKey(role, user), true)
    return { value: true }
  },

  revokeRole(caller: string, role: Role, user: string): Result<boolean> {
    if (!this.isAdmin(caller)) return { error: 100 }
    this.roles.delete(this._roleKey(role, user))
    return { value: true }
  },

  hasRole(user: string, role: Role): Result<boolean> {
    return { value: this.roles.get(this._roleKey(role, user)) ?? false }
  },

  setAdmin(caller: string, newAdmin: string): Result<boolean> {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 103 }
    this.admin = newAdmin
    return { value: true }
  },

  moderateContent(caller: string): Result<boolean> {
    if (!this.roles.get(this._roleKey("moderator", caller))) return { error: 100 }
    return { value: true }
  }
}

describe("Access Control Contract", () => {
  const admin = "ST1ADMIN"
  const mod = "ST2MOD"
  const viewer = "ST3VIEW"
  const invalidAddress = "SP000000000000000000002Q6VF78"

  beforeEach(() => {
    mockAccessControl.admin = admin
    mockAccessControl.roles.clear()
  })

  it("should allow admin to grant roles", () => {
    const result = mockAccessControl.grantRole(admin, "moderator", mod)
    expect("value" in result && result.value).toBe(true)
    const hasRole = mockAccessControl.hasRole(mod, "moderator")
    expect("value" in hasRole && hasRole.value).toBe(true)
  })

  it("should prevent non-admin from granting roles", () => {
    const result = mockAccessControl.grantRole(viewer, "moderator", mod)
    expect("error" in result && result.error).toBe(100)
  })

  it("should revoke roles", () => {
    mockAccessControl.grantRole(admin, "viewer", viewer)
    const revoke = mockAccessControl.revokeRole(admin, "viewer", viewer)
    expect("value" in revoke && revoke.value).toBe(true)
    const check = mockAccessControl.hasRole(viewer, "viewer")
    expect("value" in check && check.value).toBe(false)
  })

  it("should reject invalid principal", () => {
    const result = mockAccessControl.grantRole(admin, "viewer", invalidAddress)
    expect("error" in result && result.error).toBe(103)
  })

  it("should allow protected action if has role", () => {
    mockAccessControl.grantRole(admin, "moderator", mod)
    const result = mockAccessControl.moderateContent(mod)
    expect("value" in result && result.value).toBe(true)
  })

  it("should reject protected action without role", () => {
    const result = mockAccessControl.moderateContent(viewer)
    expect("error" in result && result.error).toBe(100)
  })

  it("should allow admin to change admin", () => {
    const newAdmin = "ST4NEW"
    const result = mockAccessControl.setAdmin(admin, newAdmin)
    expect("value" in result && result.value).toBe(true)
    expect(mockAccessControl.admin).toBe(newAdmin)
  })
})
