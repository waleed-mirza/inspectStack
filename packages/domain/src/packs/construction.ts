import { field, packSchema, section, whenThen, type StarterPack } from "./build";

export const constructionPack: StarterPack = {
  key: "construction",
  name: "Construction Site",
  description: "Safety walk and punch list with trade ownership and due dates.",
  schema: packSchema(
    { mode: "finding_count", excludeNa: true },
    [
      section("sec_walk", "Walk context", [
        field("fld_weather", "Weather", "single_select", {
          options: [
            { value: "clear", label: "Clear" },
            { value: "rain", label: "Rain" },
            { value: "wind", label: "Wind" },
            { value: "hot", label: "Hot" },
          ],
        }),
        field("fld_attendees", "Attendees", "text"),
        field("fld_area", "Area", "text", { required: true }),
      ]),
      section("sec_safety", "Safety observations", [
        field("fld_ppe", "PPE", "pass_fail", { required: true, requireEvidenceOnFail: true }),
        field("fld_edges", "Edges / fall protection", "pass_fail", {
          required: true,
          requireEvidenceOnFail: true,
        }),
        field("fld_housekeeping", "Housekeeping", "pass_fail", { requireEvidenceOnFail: true }),
        field("fld_safety_photos", "Safety photos", "photo_group", { allowAnnotation: true }),
      ]),
      section(
        "sec_punch",
        "Punch items",
        [
          field("fld_punch_location", "Location", "text", { required: true }),
          field("fld_trade", "Trade", "single_select", {
            required: true,
            options: [
              { value: "electrical", label: "Electrical" },
              { value: "plumbing", label: "Plumbing" },
              { value: "carpentry", label: "Carpentry" },
              { value: "paint", label: "Paint" },
              { value: "other", label: "Other" },
            ],
          }),
          field("fld_punch_severity", "Severity", "single_select", {
            required: true,
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ],
          }),
          field("fld_punch_photo", "Photo", "photo_group", { photoMin: 1, photoMax: 6 }),
          field("fld_punch_due", "Due date", "datetime"),
        ],
        { repeatable: true },
      ),
      section("sec_progress", "Progress notes", [
        field("fld_progress", "Notes", "long_text"),
        field("fld_progress_photos", "Progress photos", "photo_group"),
      ]),
      section("sec_site_sign", "Signatures", [
        field("fld_site_inspector", "Inspector", "signature", { required: true }),
        field("fld_supervisor", "Site supervisor", "signature", { required: true }),
        field("fld_open_punches", "Open punches", "computed", { computedKind: "finding_count" }),
      ]),
    ],
    [
      whenThen("rule_ppe_finding", "fld_ppe", "is_fail", "create_finding", {
        findingTitle: "PPE observation",
        findingSeverity: "high",
      }),
      whenThen("rule_edges_finding", "fld_edges", "is_fail", "create_finding", {
        findingTitle: "Fall protection",
        findingSeverity: "high",
      }),
      whenThen("rule_house_finding", "fld_housekeeping", "is_fail", "create_finding", {
        findingTitle: "Housekeeping",
        findingSeverity: "medium",
      }),
    ],
  ),
};
