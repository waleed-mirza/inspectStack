export function siteErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "denied":
      return "You cannot change sites in this workspace.";
    case "duplicate_id":
    case "duplicate":
      return "That id is already used in this workspace.";
    case "invalid_id":
      return "Use a CSV-friendly id: letters, numbers, dot, underscore, or hyphen.";
    case "cycle":
      return "That parent would loop the tree. Pick a different parent.";
    case "invalid_parent":
    case "site":
      return "That parent site is not available.";
    case "name":
      return "Name the site or asset before saving.";
    case "template":
      return "Pick a published template version.";
    case "assignee":
      return "Pick someone in this workspace.";
    case "not_found":
      return "That record is not in this workspace.";
    case "invalid":
      return "Check the fields and try again.";
    case "empty":
      return "Write a comment before saving.";
    case "illegal":
      return "That status change is not allowed from here.";
    default:
      return null;
  }
}

export function dueStamp(state: "upcoming" | "due_today" | "overdue" | "none"): {
  label: string;
  tone: "pass" | "fail" | "queued" | "muted";
} | null {
  if (state === "none") return null;
  if (state === "overdue") return { label: "Overdue", tone: "fail" };
  if (state === "due_today") return { label: "Due today", tone: "queued" };
  return { label: "Upcoming", tone: "muted" };
}
