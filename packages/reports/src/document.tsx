import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { workspaceInitials, type ReportDocument } from "@inspectstack/domain";

const INK = "#1b2430";
const TICKET = "#f7f9fb";
const PAPER = "#e6ebef";
const RULE = "#b8c3cc";
const MUTED = "#5a6570";
const PASS = "#1b7a4c";
const FAIL = "#c42b1c";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Source Sans 3",
    fontSize: 10,
    color: INK,
    backgroundColor: TICKET,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  rail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
  },
  kicker: {
    fontFamily: "Spline Sans Mono",
    fontSize: 8,
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  hero: {
    fontFamily: "Barlow Semi Condensed",
    fontWeight: 700,
    fontSize: 22,
    lineHeight: 1.15,
    maxWidth: 420,
  },
  title: {
    fontFamily: "Barlow Semi Condensed",
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 8,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.4,
    color: INK,
  },
  muted: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.35,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  stamp: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: "Spline Sans Mono",
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  plate: {
    width: 36,
    height: 36,
    backgroundColor: INK,
    color: TICKET,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  plateText: {
    fontFamily: "Spline Sans Mono",
    fontSize: 11,
    color: TICKET,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    marginVertical: 12,
  },
  section: {
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: PAPER,
    paddingVertical: 4,
  },
  fieldLabel: {
    width: "42%",
    fontSize: 9,
    color: MUTED,
    paddingRight: 8,
  },
  fieldValue: {
    width: "58%",
    fontSize: 10,
    color: INK,
  },
  finding: {
    borderWidth: 1,
    borderColor: INK,
    padding: 8,
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  photoCard: {
    width: "48%",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 118,
    objectFit: "cover",
    backgroundColor: PAPER,
  },
  missing: {
    width: "100%",
    height: 72,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Spline Sans Mono",
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.4,
  },
  legal: {
    fontSize: 8,
    color: MUTED,
    marginTop: 16,
  },
});

function toneColor(tone: "pass" | "fail" | "ink") {
  if (tone === "pass") return PASS;
  if (tone === "fail") return FAIL;
  return INK;
}

function Stamp({ label, tone }: { label: string; tone: "pass" | "fail" | "ink" }) {
  const color = toneColor(tone);
  return (
    <View style={[styles.stamp, { borderColor: color }]}>
      <Text style={{ color, fontFamily: "Spline Sans Mono", fontSize: 8, letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function resultTone(result: string | undefined): "pass" | "fail" | "ink" {
  if (result === "fail") return "fail";
  if (result === "pass") return "pass";
  return "ink";
}

export type ReportImages = Record<string, Buffer | string>;

export function ReportPdfDocument({
  document,
  images,
}: {
  document: ReportDocument;
  images: ReportImages;
}) {
  const { envelope } = document;
  const brand = document.organization.branding.primaryColor || "#215C45";
  const paper = document.envelope.paperSize === "letter" ? "LETTER" : "A4";
  const logo = images.__logo ?? images.logo ?? null;
  const findingLabel = document.organization.branding.terminology.finding;
  const overall: "pass" | "fail" | "ink" =
    document.summary.trafficLight === "fail"
      ? "fail"
      : document.summary.trafficLight === "pass"
        ? "pass"
        : "ink";
  const layoutTitle = document.layoutKey === "audit" ? "Audit report" : "Condition report";
  const hashShort = envelope.verificationCode;
  const contentShort = document.inspection.number;

  const photos = document.media.filter((item) => item.contentType.startsWith("image/"));
  const findingsFirst = document.layoutKey === "audit";

  function imageFor(hash: string | null | undefined, fieldKey?: string | null) {
    if (hash && images[hash]) return images[hash];
    if (fieldKey && images[fieldKey]) return images[fieldKey];
    return null;
  }

  const header = (
    <View style={[styles.row, { marginBottom: 10 }]} fixed>
      <Text style={styles.kicker}>
        {document.organization.name} · {layoutTitle}
      </Text>
      <Stamp
        label={overall === "fail" ? "Fail" : overall === "pass" ? "Pass" : "Issued"}
        tone={overall}
      />
    </View>
  );

  const footer = (
    <View style={styles.footer} fixed>
      <Text>
        {hashShort} · {contentShort} · {envelope.issuedAt.slice(0, 10)}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );

  const findingsBlock = (
    <View style={styles.section} wrap>
      <Text style={styles.title}>
        {findingLabel}s ({document.findings.length})
      </Text>
      {document.findings.length === 0 ? (
        <Text style={styles.muted}>No {findingLabel.toLowerCase()}s recorded.</Text>
      ) : (
        document.findings.map((finding) => (
          <View key={finding.id} style={styles.finding} wrap={false}>
            <View style={styles.row}>
              <Text
                style={{
                  fontFamily: "Barlow Semi Condensed",
                  fontWeight: 600,
                  fontSize: 12,
                  maxWidth: 360,
                }}
              >
                {finding.title}
              </Text>
              <Stamp
                label={`${finding.severity} · ${finding.status.replaceAll("_", " ")}`}
                tone={finding.severity === "high" ? "fail" : "ink"}
              />
            </View>
            {finding.notes ? (
              <Text style={[styles.body, { marginTop: 4 }]}>{finding.notes}</Text>
            ) : null}
            <Text style={[styles.muted, { marginTop: 4 }]}>
              Owner {finding.ownerName ?? "unassigned"}
              {finding.dueAt ? ` · due ${finding.dueAt.slice(0, 10)}` : ""}
              {finding.fieldKey ? ` · ${finding.fieldKey}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const summaryBlock = (
    <View style={[styles.chipRow, { marginBottom: 12 }]}>
      <Stamp label={`${document.summary.passCount} pass`} tone="pass" />
      <Stamp label={`${document.summary.failCount} fail`} tone="fail" />
      <Stamp
        label={`${document.summary.findingCount} ${findingLabel.toLowerCase()}${document.summary.findingCount === 1 ? "" : "s"}`}
        tone={document.summary.highFindingCount > 0 ? "fail" : "ink"}
      />
      {document.summary.percentPass !== null ? (
        <Stamp label={`${document.summary.percentPass}% pass`} tone="ink" />
      ) : null}
    </View>
  );

  const sectionsBlock = document.sections.map((section) => (
    <View key={section.id} style={styles.section} wrap>
      <Text style={styles.title}>{section.title}</Text>
      {section.fields.map((field) => (
        <View key={field.key} style={styles.fieldRow} wrap={false}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <Text
            style={[
              styles.fieldValue,
              field.result === "fail"
                ? { color: FAIL }
                : field.result === "pass"
                  ? { color: PASS }
                  : {},
            ]}
          >
            {field.display}
          </Text>
        </View>
      ))}
    </View>
  ));

  const mediaBlock = (
    <View style={styles.section} wrap>
      <Text style={styles.title}>Evidence</Text>
      {photos.length === 0 ? (
        <View style={styles.missing}>
          <Text style={styles.muted}>No photos on this inspection.</Text>
        </View>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((item) => {
            const src = imageFor(item.contentHash, item.fieldKey);
            return (
              <View key={item.id} style={styles.photoCard} wrap={false}>
                {src ? (
                  <Image src={src} style={styles.photo} />
                ) : (
                  <View style={styles.missing}>
                    <Text style={styles.muted}>Photo unavailable</Text>
                  </View>
                )}
                <Text style={[styles.muted, { marginTop: 4 }]}>
                  {item.caption ?? item.fieldKey ?? "Evidence"}
                  {item.capturedAt ? ` · ${item.capturedAt.slice(0, 10)}` : ""}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const signaturesBlock = (
    <View style={styles.section} wrap>
      <Text style={styles.title}>Signatures</Text>
      {document.signatures.length === 0 ? (
        <Text style={styles.muted}>No signature fields on this template version.</Text>
      ) : (
        document.signatures.map((row) => {
          const src = imageFor(row.contentHash, row.fieldKey);
          return (
            <View key={row.fieldKey} style={{ marginBottom: 10 }} wrap={false}>
              <Text style={styles.muted}>{row.label}</Text>
              {src ? (
                <Image
                  src={src}
                  style={{ width: 180, height: 64, objectFit: "contain", marginTop: 4 }}
                />
              ) : (
                <Text style={[styles.body, { marginTop: 4 }]}>{row.display}</Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <Document
      title={`${document.inspection.number} · ${document.organization.name}`}
      author={document.organization.name}
      subject={`Verification ${envelope.verificationCode}`}
      creator="InspectStack"
    >
      <Page size={paper} style={styles.page} wrap>
        <View style={[styles.rail, { backgroundColor: brand }]} fixed />
        {header}
        <View style={[styles.row, { alignItems: "center", marginBottom: 10 }]}>
          <View style={styles.plate}>
            {logo ? (
              <Image src={logo} style={{ width: 36, height: 36, objectFit: "contain" }} />
            ) : (
              <Text style={styles.plateText}>{workspaceInitials(document.organization.name)}</Text>
            )}
          </View>
          <View>
            <Text style={styles.kicker}>{document.inspection.number}</Text>
            <Text style={styles.hero}>
              {document.inspection.siteName ?? document.inspection.templateName}
            </Text>
          </View>
        </View>
        <Text style={styles.muted}>
          {document.inspection.templateName} v{document.inspection.templateVersion}
          {document.inspection.assetName ? ` · ${document.inspection.assetName}` : ""}
          {document.inspection.inspectorName
            ? ` · Inspector ${document.inspection.inspectorName}`
            : ""}
          {document.inspection.reviewerName
            ? ` · Reviewer ${document.inspection.reviewerName}`
            : ""}
        </Text>
        {summaryBlock}
        <View style={styles.rule} />
        {findingsFirst ? findingsBlock : null}
        {!findingsFirst ? sectionsBlock : null}
        {findingsFirst ? sectionsBlock : findingsBlock}
        {mediaBlock}
        {signaturesBlock}
        <Text style={styles.legal}>
          {document.legalFooter ||
            "This snapshot is bound to the published template version at issue. It is not a regulated certificate."}
        </Text>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Issued {envelope.issuedAt.slice(0, 10)}
          {envelope.issuedByName ? ` by ${envelope.issuedByName}` : ""}. Verify{" "}
          {envelope.verificationCode}.
        </Text>
        {footer}
      </Page>
    </Document>
  );
}
