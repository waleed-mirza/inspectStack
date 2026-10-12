import { field, packSchema, section, whenThen, type StarterPack } from "./build";

export const vehiclePack: StarterPack = {
  key: "vehicle",
  name: "Vehicle Inspection",
  description: "Pre-trip / handover walk-around with damage log and safety fails.",
  schema: packSchema(
    { mode: "traffic_light", excludeNa: true },
    [
      section("sec_identity", "Vehicle identity", [
        field("fld_plate", "Plate", "text", { required: true }),
        field("fld_vin", "VIN", "barcode", { required: true }),
        field("fld_odometer", "Odometer", "numeric", { unit: "km", required: true }),
        field("fld_hours", "Engine hours", "numeric", { unit: "h" }),
      ]),
      section("sec_walkaround", "Walk-around", [
        field("fld_walk_photos", "Walk-around photos", "photo_group", {
          required: true,
          photoMin: 4,
          photoMax: 12,
          requireCaption: true,
        }),
      ]),
      section(
        "sec_damage",
        "Damage log",
        [
          field("fld_damage_location", "Location", "single_select", {
            required: true,
            options: [
              { value: "front", label: "Front" },
              { value: "rear", label: "Rear" },
              { value: "driver", label: "Driver side" },
              { value: "passenger", label: "Passenger side" },
              { value: "roof", label: "Roof" },
              { value: "interior", label: "Interior" },
            ],
          }),
          field("fld_damage_severity", "Severity", "single_select", {
            required: true,
            options: [
              { value: "minor", label: "Minor" },
              { value: "moderate", label: "Moderate" },
              { value: "major", label: "Major" },
            ],
          }),
          field("fld_damage_photo", "Annotated panel photo", "photo_group", {
            allowAnnotation: true,
            photoMin: 1,
            photoMax: 4,
          }),
        ],
        { repeatable: true },
      ),
      section("sec_fluids", "Fluids / lights / tyres", [
        field("fld_lights", "Lights", "pass_fail", { required: true, requireEvidenceOnFail: true }),
        field("fld_tyres", "Tyres", "pass_fail", { required: true, requireEvidenceOnFail: true }),
        field("fld_tread", "Tread depth", "numeric", { unit: "mm" }),
        field("fld_psi", "Tyre pressure", "numeric", { unit: "psi" }),
        field("fld_safety_photo", "Safety fail photo", "photo_group", { allowAnnotation: true }),
      ]),
      section("sec_interior", "Interior / safety kit", [
        field("fld_kit", "Safety kit", "pass_fail"),
        field("fld_interior_notes", "Interior notes", "long_text"),
      ]),
      section("sec_vehicle_sign", "Signatures", [
        field("fld_outgoing_sig", "Outgoing driver", "signature", { required: true }),
        field("fld_incoming_sig", "Incoming driver", "signature", { required: true }),
        field("fld_vehicle_status", "Overall status", "computed", {
          computedKind: "overall_status",
        }),
      ]),
    ],
    [
      whenThen("rule_damage_finding", "fld_damage_severity", "eq", "create_finding", {
        value: "moderate",
        findingTitle: "Body damage recorded",
        findingSeverity: "medium",
      }),
      whenThen("rule_lights_photo", "fld_lights", "is_fail", "require", {
        targetFieldId: "fld_safety_photo",
      }),
      whenThen("rule_tyres_photo", "fld_tyres", "is_fail", "require", {
        targetFieldId: "fld_safety_photo",
      }),
    ],
  ),
};
