import { field, packSchema, section, whenThen, type StarterPack } from "./build";

const occupancy = field("fld_occupancy", "Occupancy", "single_select", {
  required: true,
  options: [
    { value: "vacant", label: "Vacant" },
    { value: "tenanted", label: "Tenanted" },
    { value: "unknown", label: "Unknown" },
  ],
});

export const propertyConditionPack: StarterPack = {
  key: "property-condition",
  name: "Property Condition",
  description: "Room-by-room move-in / move-out with life-safety fails and photo evidence.",
  schema: packSchema(
    { mode: "percent_pass", excludeNa: true },
    [
      section("sec_meta", "Meta", [
        field("fld_address", "Address", "text", { required: true }),
        field("fld_unit", "Unit", "text"),
        occupancy,
        field("fld_meter_reading", "Meter reading", "numeric", { unit: "kWh" }),
        field("fld_meter_photo", "Meter photo", "photo_group", {
          photoMin: 0,
          photoMax: 4,
          requireCaption: true,
        }),
      ]),
      section("sec_entry", "Entry / hallway", [
        field("fld_entry_door", "Door", "rating", { min: 1, max: 5 }),
        field("fld_locks", "Locks", "pass_fail"),
        field("fld_smoke_alarm", "Smoke alarm", "pass_fail", {
          required: true,
          requireEvidenceOnFail: true,
          helpText: "Fail creates a high finding and requires an annotated photo.",
        }),
        field("fld_smoke_photo", "Smoke alarm photo", "photo_group", {
          photoMin: 0,
          photoMax: 4,
          allowAnnotation: true,
        }),
        field("fld_co_alarm", "Carbon monoxide alarm", "pass_fail", {
          requireEvidenceOnFail: true,
        }),
      ]),
      section("sec_kitchen", "Kitchen", [
        field("fld_cabinets", "Cabinets", "rating", { min: 1, max: 5 }),
        field("fld_sink", "Sink", "rating", { min: 1, max: 5 }),
        field("fld_appliances", "Appliances", "rating", { min: 1, max: 5 }),
        field("fld_kitchen_notes", "Kitchen notes", "long_text"),
        field("fld_kitchen_photos", "Kitchen photos", "photo_group", { photoMax: 8 }),
      ]),
      section("sec_living", "Living", [
        field("fld_living_walls", "Walls", "rating", { min: 1, max: 5 }),
        field("fld_living_floor", "Flooring", "rating", { min: 1, max: 5 }),
        field("fld_living_windows", "Windows", "rating", { min: 1, max: 5 }),
        field("fld_outlets", "Electrical outlets", "pass_fail"),
      ]),
      section(
        "sec_bedrooms",
        "Bedrooms",
        [
          field("fld_bedroom_name", "Bedroom name", "text", { required: true }),
          field("fld_bedroom_condition", "Condition", "rating", { min: 1, max: 5 }),
          field("fld_bedroom_smoke", "Smoke alarm", "pass_fail", {
            required: true,
            requireEvidenceOnFail: true,
          }),
          field("fld_bedroom_smoke_photo", "Detector photo", "photo_group", {
            allowAnnotation: true,
            photoMax: 4,
          }),
          field("fld_furnishings", "Furnishings", "long_text"),
        ],
        { repeatable: true },
      ),
      section("sec_bath", "Bath", [
        field("fld_plumbing", "Plumbing", "rating", { min: 1, max: 5 }),
        field("fld_moisture", "Moisture", "rating", { min: 1, max: 5 }),
        field("fld_exhaust", "Exhaust", "pass_fail"),
        field("fld_bath_photo", "Wet-area photo", "photo_group", { photoMax: 6 }),
      ]),
      section("sec_exterior", "Exterior / utilities", [
        field("fld_exterior_notes", "Exterior notes", "long_text"),
        field("fld_exterior_photos", "Exterior photos", "photo_group"),
      ]),
      section("sec_signatures", "Signatures", [
        field("fld_inspector_sig", "Inspector signature", "signature", { required: true }),
        field("fld_tenant_ack", "Tenant acknowledgment", "acknowledgment", {
          required: true,
          acknowledgmentBody: "I have reviewed this condition record with the inspector.",
        }),
        field("fld_site_gps", "Location", "gps"),
        field("fld_overall", "Overall status", "computed", { computedKind: "overall_status" }),
      ]),
    ],
    [
      whenThen("rule_smoke_finding", "fld_smoke_alarm", "is_fail", "create_finding", {
        findingTitle: "Life-safety device failed",
        findingSeverity: "high",
      }),
      whenThen("rule_smoke_photo", "fld_smoke_alarm", "is_fail", "require", {
        targetFieldId: "fld_smoke_photo",
      }),
      whenThen("rule_bedroom_smoke", "fld_bedroom_smoke", "is_fail", "create_finding", {
        findingTitle: "Life-safety device failed",
        findingSeverity: "high",
      }),
      whenThen("rule_bedroom_photo", "fld_bedroom_smoke", "is_fail", "require", {
        targetFieldId: "fld_bedroom_smoke_photo",
      }),
      whenThen("rule_moisture_photo", "fld_moisture", "lte", "require", {
        value: 2,
        targetFieldId: "fld_bath_photo",
      }),
    ],
  ),
};
