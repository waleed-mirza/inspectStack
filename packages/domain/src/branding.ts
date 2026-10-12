export const PAPER_SIZES = ["a4", "letter"] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export const DATE_FORMATS = ["dmy", "mdy", "ymd"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export type WorkspaceTerminology = {
  inspection: string;
  site: string;
  asset: string;
  finding: string;
};

export type SnapshotBranding = {
  logoUrl: string | null;
  primaryColor: string;
  legalFooter: string;
  terminology: WorkspaceTerminology;
};

export type WorkspaceBranding = SnapshotBranding & {
  reportIdentity: {
    fromName: string;
    documentTitle: string;
  };
  emailIdentity: {
    fromName: string;
    replyTo: string;
  };
  formats: {
    date: DateFormat;
    paper: PaperSize;
    inspectionPrefix: string;
  };
};

export const DEFAULT_BRANDING: WorkspaceBranding = {
  logoUrl: null,
  primaryColor: "#215C45",
  legalFooter: "",
  terminology: {
    inspection: "Inspection",
    site: "Site",
    asset: "Asset",
    finding: "Finding",
  },
  reportIdentity: {
    fromName: "",
    documentTitle: "Inspection report",
  },
  emailIdentity: {
    fromName: "",
    replyTo: "",
  },
  formats: {
    date: "dmy",
    paper: "a4",
    inspectionPrefix: "",
  },
};

const HEX = /^#([0-9a-fA-F]{6})$/;
const PREFIX = /^[A-Za-z]{1,4}$/;
const EMAILISH = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeBrandColor(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (HEX.test(raw)) return `#${raw.slice(1).toUpperCase()}`;
  return DEFAULT_BRANDING.primaryColor;
}

/** Initials used when no logo is set. Never render a white glyph on paper. */
export function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IS";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function text(value: unknown, fallback: string, max = 120): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function term(value: unknown, fallback: string): string {
  const label = text(value, fallback, 32);
  return label;
}

export function normalizeInspectionPrefix(value: string | null | undefined, fallback = ""): string {
  const raw = (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (PREFIX.test(raw)) return raw;
  return fallback;
}

export function parseWorkspaceBranding(input: unknown, orgName = ""): WorkspaceBranding {
  const row = asRecord(input);
  const terminology = asRecord(row.terminology);
  const reportIdentity = asRecord(row.reportIdentity);
  const emailIdentity = asRecord(row.emailIdentity);
  const formats = asRecord(row.formats);
  const date = DATE_FORMATS.includes(formats.date as DateFormat)
    ? (formats.date as DateFormat)
    : DEFAULT_BRANDING.formats.date;
  const paper = PAPER_SIZES.includes(formats.paper as PaperSize)
    ? (formats.paper as PaperSize)
    : DEFAULT_BRANDING.formats.paper;
  const replyTo = text(emailIdentity.replyTo, "", 120);
  return {
    logoUrl: typeof row.logoUrl === "string" && row.logoUrl.trim() ? row.logoUrl.trim() : null,
    primaryColor: normalizeBrandColor(
      typeof row.primaryColor === "string" ? row.primaryColor : null,
    ),
    legalFooter: text(row.legalFooter, "", 500),
    terminology: {
      inspection: term(terminology.inspection, DEFAULT_BRANDING.terminology.inspection),
      site: term(terminology.site, DEFAULT_BRANDING.terminology.site),
      asset: term(terminology.asset, DEFAULT_BRANDING.terminology.asset),
      finding: term(terminology.finding, DEFAULT_BRANDING.terminology.finding),
    },
    reportIdentity: {
      fromName: text(reportIdentity.fromName, orgName, 80),
      documentTitle: text(
        reportIdentity.documentTitle,
        DEFAULT_BRANDING.reportIdentity.documentTitle,
        80,
      ),
    },
    emailIdentity: {
      fromName: text(emailIdentity.fromName, orgName, 80),
      replyTo: replyTo && EMAILISH.test(replyTo) ? replyTo : "",
    },
    formats: {
      date,
      paper,
      inspectionPrefix: normalizeInspectionPrefix(
        typeof formats.inspectionPrefix === "string" ? formats.inspectionPrefix : "",
        "",
      ),
    },
  };
}

export function snapshotBranding(branding: SnapshotBranding): SnapshotBranding {
  return {
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    legalFooter: branding.legalFooter,
    terminology: { ...branding.terminology },
  };
}

export function isBrandingObjectKey(
  logoUrl: string | null | undefined,
  organizationId: string,
): boolean {
  if (!logoUrl) return false;
  if (
    logoUrl.startsWith("http://") ||
    logoUrl.startsWith("https://") ||
    logoUrl.startsWith("data:")
  ) {
    return false;
  }
  return logoUrl.startsWith(`${organizationId}/`);
}

export function navLabel(term: string, plural = true): string {
  const base = term.trim() || "Item";
  if (!plural) return base;
  if (/s$/i.test(base)) return base;
  return `${base}s`;
}

export function formatDisplayDate(
  iso: string | Date | null | undefined,
  format: DateFormat = "dmy",
): string {
  if (!iso) return "";
  const stamp = typeof iso === "string" ? iso : iso.toISOString();
  const day = stamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return stamp.slice(0, 10);
  const year = day.slice(0, 4);
  const month = day.slice(5, 7);
  const date = day.slice(8, 10);
  if (format === "mdy") return `${month}/${date}/${year}`;
  if (format === "ymd") return `${year}-${month}-${date}`;
  return `${date} ${monthName(month)} ${year}`;
}

function monthName(month: string): string {
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const index = Number(month) - 1;
  return names[index] ?? month;
}
