export const FIELD_TYPES = [
  "pass_fail",
  "boolean",
  "single_select",
  "multi_select",
  "rating",
  "numeric",
  "currency",
  "temperature",
  "text",
  "long_text",
  "datetime",
  "photo_group",
  "signature",
  "initials",
  "gps",
  "barcode",
  "asset_ref",
  "acknowledgment",
  "computed",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  pass_fail: "Pass / fail / n/a",
  boolean: "Yes / no",
  single_select: "Single select",
  multi_select: "Multi-select",
  rating: "Rating",
  numeric: "Numeric",
  currency: "Currency",
  temperature: "Temperature",
  text: "Text",
  long_text: "Long text",
  datetime: "Date and time",
  photo_group: "Photo group",
  signature: "Signature",
  initials: "Initials",
  gps: "GPS",
  barcode: "Barcode / QR",
  asset_ref: "Asset reference",
  acknowledgment: "Acknowledgment",
  computed: "Computed result",
};

export const FIELD_TYPE_GROUPS: { label: string; types: FieldType[] }[] = [
  {
    label: "Answers",
    types: [
      "pass_fail",
      "boolean",
      "single_select",
      "multi_select",
      "rating",
      "numeric",
      "currency",
      "temperature",
      "text",
      "long_text",
      "datetime",
    ],
  },
  {
    label: "Evidence",
    types: [
      "photo_group",
      "signature",
      "initials",
      "gps",
      "barcode",
      "asset_ref",
      "acknowledgment",
    ],
  },
  {
    label: "Results",
    types: ["computed"],
  },
];

export const COMPUTED_KINDS = [
  "section_score",
  "overall_status",
  "finding_count",
  "report_summary",
] as const;
export type ComputedKind = (typeof COMPUTED_KINDS)[number];

export const COMPUTED_KIND_LABELS: Record<ComputedKind, string> = {
  section_score: "Section score",
  overall_status: "Overall status",
  finding_count: "Finding count",
  report_summary: "Report summary",
};

export const SCORING_MODES = ["percent_pass", "traffic_light", "finding_count"] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];

export const SCORING_MODE_LABELS: Record<ScoringMode, string> = {
  percent_pass: "Percent pass (exclude n/a)",
  traffic_light: "Traffic light (any safety fail)",
  finding_count: "Finding count",
};

export const RULE_OPERATORS = [
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "is_fail",
  "is_pass",
  "is_na",
  "is_true",
  "is_false",
  "contains",
] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: "equals",
  neq: "does not equal",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  is_fail: "is fail",
  is_pass: "is pass",
  is_na: "is n/a",
  is_true: "is yes",
  is_false: "is no",
  contains: "contains",
};

export const RULE_ACTIONS = ["show", "hide", "require", "optional", "create_finding"] as const;
export type RuleAction = (typeof RULE_ACTIONS)[number];

export const RULE_ACTION_LABELS: Record<RuleAction, string> = {
  show: "show",
  hide: "hide",
  require: "require",
  optional: "make optional",
  create_finding: "create finding",
};

export const FINDING_SEVERITIES = ["low", "medium", "high"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
