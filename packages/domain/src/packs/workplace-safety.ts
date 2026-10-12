import { field, packSchema, section, whenThen, type StarterPack } from "./build";

export const workplaceSafetyPack: StarterPack = {
  key: "workplace-safety",
  name: "Workplace Safety",
  description: "Routine safety observations with pass/fail evidence and corrective follow-up.",
  schema: packSchema(
    { mode: "percent_pass", excludeNa: true },
    [
      section("sec_audit_meta", "Audit meta", [
        field("fld_standard", "Standard", "text", { required: true }),
        field("fld_shift", "Shift", "single_select", {
          options: [
            { value: "day", label: "Day" },
            { value: "afternoon", label: "Afternoon" },
            { value: "night", label: "Night" },
          ],
        }),
        field("fld_dept", "Area", "text", { required: true }),
      ]),
      section("sec_observations", "Observations", [
        field("fld_obs_ppe", "PPE", "pass_fail", { requireEvidenceOnFail: true }),
        field("fld_obs_fire", "Fire", "pass_fail", { requireEvidenceOnFail: true }),
        field("fld_obs_electrical", "Electrical", "pass_fail", { requireEvidenceOnFail: true }),
        field("fld_obs_chemical", "Chemical", "pass_fail", { requireEvidenceOnFail: true }),
        field("fld_obs_ergo", "Ergonomics", "pass_fail"),
        field("fld_obs_photo", "Observation photo", "photo_group", { allowAnnotation: true }),
      ]),
      section("sec_talk", "Talk / acknowledgment", [
        field("fld_toolbox", "Toolbox talk completed", "boolean", { required: true }),
        field("fld_attendee_count", "Attendee count", "numeric", { min: 0 }),
      ]),
      section("sec_ehs_sign", "Signatures", [
        field("fld_observer_sig", "Observer", "signature", { required: true }),
        field("fld_area_sig", "Area supervisor", "signature", { required: true }),
        field("fld_pass_percent", "Percent pass", "computed", { computedKind: "section_score" }),
      ]),
    ],
    [
      whenThen("rule_fire_finding", "fld_obs_fire", "is_fail", "create_finding", {
        findingTitle: "Fire observation",
        findingSeverity: "high",
      }),
      whenThen("rule_elec_finding", "fld_obs_electrical", "is_fail", "create_finding", {
        findingTitle: "Electrical observation",
        findingSeverity: "high",
      }),
      whenThen("rule_fail_photo", "fld_obs_ppe", "is_fail", "require", {
        targetFieldId: "fld_obs_photo",
      }),
    ],
  ),
};
