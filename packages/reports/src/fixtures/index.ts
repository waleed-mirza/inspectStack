import { starterPackByKey } from "@inspectstack/domain";
import { goldenDocument } from "./build";

function pack(key: string) {
  const row = starterPackByKey(key);
  if (!row) throw new Error(`Starter pack missing: ${key}`);
  return row;
}

export function propertyGolden() {
  return goldenDocument({
    pack: pack("property-condition"),
    layoutKey: "condition",
    orgName: "Northline Property Group",
    primaryColor: "#215C45",
    number: "NL-GOLD",
    siteName: "12 Harbour St / Unit 4",
    assetName: "Living smoke alarm",
    inspectorName: "Maya Inspector",
    reviewerName: "Jon Reviewer",
    verificationCode: "IS-NLINE01",
    responses: {
      address: "12 Harbour St",
      unit: "4",
      occupancy: "tenanted",
      smoke_alarm: { result: "fail" },
      locks: { result: "pass" },
      co_alarm: { result: "pass" },
      bedroom_name: "Bedroom 1",
      bedroom_smoke: { result: "pass" },
      inspector_sig: "Signed",
      tenant_ack: true,
    },
    findings: [
      {
        id: "finding-smoke",
        title: "Life-safety device failed",
        severity: "high",
        status: "open",
        notes: "Dust cap still on. No chirp.",
        fieldKey: "smoke_alarm",
        ownerName: "Building manager",
        dueAt: "2026-09-01T00:00:00.000Z",
        evidenceHashes: [],
      },
    ],
  });
}

export function vehicleGolden() {
  return goldenDocument({
    pack: pack("vehicle"),
    layoutKey: "condition",
    orgName: "Westfield Vehicle Checks",
    primaryColor: "#1a3a5c",
    number: "WV-GOLD",
    siteName: "Depot A",
    assetName: "Van 14",
    inspectorName: "Chris Westfield",
    reviewerName: "Chris Westfield",
    verificationCode: "IS-WESTF01",
    responses: {
      plate: "EE-14-XY",
      vin: "WVWZZZ3CZWE123456",
      odometer: 84210,
      tyres: { result: "fail" },
    },
    findings: [
      {
        id: "finding-tyre",
        title: "Tyre tread",
        severity: "high",
        status: "open",
        notes: "Offside rear below wear bars.",
        fieldKey: "tyres",
        ownerName: "Workshop",
        dueAt: "2026-09-02T00:00:00.000Z",
        evidenceHashes: [],
      },
    ],
  });
}

export function constructionGolden() {
  return goldenDocument({
    pack: pack("construction"),
    layoutKey: "audit",
    orgName: "Meridian Build",
    primaryColor: "#7a4a12",
    number: "MB-GOLD",
    siteName: "Level 8 podium",
    assetName: "North edge",
    inspectorName: "Site walker",
    reviewerName: "Site manager",
    verificationCode: "IS-MERID01",
    responses: {
      weather: "clear",
      area: "Level 8 podium",
      ppe: { result: "pass" },
      edges: { result: "fail" },
      housekeeping: { result: "pass" },
    },
    findings: [
      {
        id: "finding-edge",
        title: "Fall protection incomplete",
        severity: "high",
        status: "open",
        notes: "Missing mid-rail on north edge.",
        fieldKey: "edges",
        ownerName: "Scaffold trade",
        dueAt: "2026-09-01T00:00:00.000Z",
        evidenceHashes: [],
      },
    ],
  });
}

export function safetyGolden() {
  return goldenDocument({
    pack: pack("workplace-safety"),
    layoutKey: "audit",
    orgName: "Arden Safety",
    primaryColor: "#3b1f4a",
    number: "AS-GOLD",
    siteName: "Packing hall",
    assetName: "Line 2",
    inspectorName: "Observer",
    reviewerName: "EHS manager",
    verificationCode: "IS-ARDEN01",
    responses: {
      standard: "Internal weekly",
      shift: "day",
      dept: "Packing hall",
      obs_ppe: { result: "pass" },
      obs_fire: { result: "fail" },
      toolbox: true,
    },
    findings: [
      {
        id: "finding-fire",
        title: "Fire exit blocked",
        severity: "high",
        status: "open",
        notes: "Pallet stack in front of east exit.",
        fieldKey: "obs_fire",
        ownerName: "Area supervisor",
        dueAt: "2026-09-01T00:00:00.000Z",
        evidenceHashes: [],
      },
    ],
  });
}

export const GOLDEN_FIXTURES = [
  { id: "property-condition", file: "property-condition.pdf", build: propertyGolden },
  { id: "vehicle", file: "vehicle.pdf", build: vehicleGolden },
  { id: "construction", file: "construction.pdf", build: constructionGolden },
  { id: "workplace-safety", file: "workplace-safety.pdf", build: safetyGolden },
] as const;
