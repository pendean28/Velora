import { describe, it, expect, beforeEach } from "vitest";

// --- Result type ---
type Result<T> = { value: T } | { error: number };

// --- Mock contract setup ---
const mock = {
  protocolWatchers: new Map<string, Set<string>>(),
  alerts: new Map<bigint, { id: bigint; reporter: string; protocol: string; description: string; severity: bigint }>(),
  acknowledged: new Set<string>(),
  alertCounter: 0n,

  registerWatcher(caller: string, protocol: string): Result<boolean> {
    if (!mock.protocolWatchers.has(protocol)) {
      mock.protocolWatchers.set(protocol, new Set());
    }
    mock.protocolWatchers.get(protocol)!.add(caller);
    return { value: true };
  },

  reportAlert(caller: string, protocol: string, description: string, severity: bigint): Result<bigint> {
    const watchers = mock.protocolWatchers.get(protocol);
    if (!watchers || !watchers.has(caller)) return { error: 100 };

    mock.alertCounter += 1n;
    mock.alerts.set(mock.alertCounter, {
      id: mock.alertCounter,
      reporter: caller,
      protocol,
      description,
      severity,
    });

    return { value: mock.alertCounter };
  },

  acknowledgeAlert(caller: string, alertId: bigint): Result<boolean> {
    if (!mock.alerts.has(alertId)) return { error: 101 };

    const key = `${caller}-${alertId}`;
    if (mock.acknowledged.has(key)) return { error: 102 };

    mock.acknowledged.add(key);
    return { value: true };
  },

  getAlert(alertId: bigint): Result<{ reporter: string; protocol: string; description: string; severity: bigint }> {
    const alert = mock.alerts.get(alertId);
    if (!alert) return { error: 101 };
    return {
      value: {
        reporter: alert.reporter,
        protocol: alert.protocol,
        description: alert.description,
        severity: alert.severity,
      },
    };
  },
};

describe("SecureWatch Monitoring Contract", () => {
  beforeEach(() => {
    mock.protocolWatchers.clear();
    mock.alerts.clear();
    mock.acknowledged.clear();
    mock.alertCounter = 0n;
  });

  it("should allow a watcher to register for a protocol", () => {
    const result = mock.registerWatcher("ST3WATCHER", "protocol-1");
    if (!("value" in result)) throw new Error(`Failed to register: ${result.error}`);
    expect(result.value).toBe(true);
    expect(mock.protocolWatchers.get("protocol-1")?.has("ST3WATCHER")).toBe(true);
  });

  it("should allow a registered watcher to report an alert", () => {
    const protocol = "defi-protocol-1";
    mock.registerWatcher("ST3WATCHER", protocol);

    const result = mock.reportAlert("ST3WATCHER", protocol, "Critical bug", 5n);
    if (!("value" in result)) throw new Error(`Failed to report alert: ${result.error}`);

    expect(result.value).toBe(1n);
    expect(mock.alerts.get(1n)?.description).toBe("Critical bug");
  });

  it("should not allow unregistered users to report alerts", () => {
    const result = mock.reportAlert("ST3HACKER", "defi-protocol-1", "Exploit found", 9n);
    expect(result).toEqual({ error: 100 });
  });

  it("should allow acknowledgment of an alert", () => {
    mock.registerWatcher("ST3WATCHER", "proto-xyz");
    const reportResult = mock.reportAlert("ST3WATCHER", "proto-xyz", "Something broke", 7n);
    if (!("value" in reportResult)) throw new Error(`Failed to report alert: ${reportResult.error}`);

    const ackResult = mock.acknowledgeAlert("ST3ADMIN", reportResult.value);
    if (!("value" in ackResult)) throw new Error(`Failed to acknowledge alert: ${ackResult.error}`);

    expect(ackResult.value).toBe(true);
    expect(mock.acknowledged.has(`ST3ADMIN-${reportResult.value}`)).toBe(true);
  });

  it("should not acknowledge nonexistent alert", () => {
    const result = mock.acknowledgeAlert("ST3ADMIN", 999n);
    expect(result).toEqual({ error: 101 });
  });

  it("should not allow double acknowledgment", () => {
    mock.registerWatcher("ST3WATCHER", "proto-xyz");
    const reportResult = mock.reportAlert("ST3WATCHER", "proto-xyz", "Node down", 6n);
    if (!("value" in reportResult)) throw new Error(`Failed to report alert: ${reportResult.error}`);

    const alertId = reportResult.value;
    const ack1 = mock.acknowledgeAlert("ST3ADMIN", alertId);
    if (!("value" in ack1)) throw new Error(`First acknowledgment failed: ${ack1.error}`);

    const ack2 = mock.acknowledgeAlert("ST3ADMIN", alertId);
    expect(ack2).toEqual({ error: 102 });
  });

  it("should fetch alert data by ID", () => {
    mock.registerWatcher("ST3WATCHER", "proto-xyz");
    const reportResult = mock.reportAlert("ST3WATCHER", "proto-xyz", "API issue", 3n);
    if (!("value" in reportResult)) throw new Error(`Failed to report alert: ${reportResult.error}`);

    const getResult = mock.getAlert(reportResult.value);
    if (!("value" in getResult)) throw new Error(`Failed to fetch alert: ${getResult.error}`);

    expect(getResult.value.protocol).toBe("proto-xyz");
    expect(getResult.value.description).toBe("API issue");
    expect(getResult.value.severity).toBe(3n);
  });

  it("should error when fetching non-existent alert", () => {
    const result = mock.getAlert(404n);
    expect(result).toEqual({ error: 101 });
  });
});
