# Four starter-pack outlines

Content and sample reports change per pack. Chrome, tokens, and runner do not. Seed as four demo workspaces in Week 3; golden PDFs in Week 5.

Clone path: `/app/templates` → clone pack rail. Apply a brand in [branding.md](branding.md) after clone.

Demo workspace naming in seed data: **Northline Property Group**, **Hale Fleet**, **Meridian Build**, **Arden Safety**. Replace with your brand in onboarding.

---

## 1. Property Condition (priority 1)

**Job:** Room-by-room move-in / move-out condition. Photo-rich tenant/client report.

**Actors:** property manager (admin), inspector, tenant (client viewer / signature).

**Subject:** Site = building; Asset = unit.

**Sections (draft):**

1. Meta — address, unit, inspector, occupancy, meter readings (numeric + photo)
2. Entry / hallway — door, locks, smoke alarm (pass/fail/na + required photo on fail), carbon monoxide
3. Kitchen — cabinets, sink, appliances (each: condition rating 1–5, notes, photo group)
4. Living — walls, flooring, windows, electrical outlets
5. Bedrooms — repeatable bedroom group (name, condition, smoke alarm, furnishings)
6. Bath — plumbing, moisture, exhaust
7. Exterior / utilities if house
8. Signatures — inspector + tenant acknowledgment + GPS

**Rules:** Fail on smoke/CO → auto-create high finding “Life-safety device failed” with required annotated photo. Rating ≤2 on wet areas → require photo.

**Scoring:** % pass excluding NA; count of life-safety fails.

**Report:** Layout 1 (condition). Cover with address and overall condition. Room pages with photo strips. Findings first if any fail.

**Three-minute path:** clone pack → Bedroom 1 → fail smoke alarm → annotate detector photo → tenant sign → PDF + verify.

---

## 2. Vehicle and fleet

**Job:** Pre-trip / handover / damage check. Damage-marked vehicle report.

**Actors:** fleet supervisor, driver/inspector, receiving driver.

**Subject:** Site = depot; Asset = vehicle (VIN as CSV-friendly external id).

**Sections:**

1. Vehicle identity — plate, VIN (barcode/QR), odometer, hours
2. Walk-around — driver side, passenger, front, rear, roof (photo group min 4)
3. Damage log — repeatable: location select, severity, annotation on a simple body panel photo
4. Fluids / lights / tyres — pass/fail/na + numeric tread or PSI
5. Interior / safety kit
6. Signatures — outgoing and incoming driver

**Rules:** Any damage severity ≥ moderate → finding “Body damage recorded” owned by depot. Fail on lights or tyres → block submit until photo exists.

**Scoring:** traffic-light overall (fail if any safety item fails).

**Report:** Layout 1. Cover with plate + VIN. Damage appendix with annotated stills.

---

## 3. Construction site / QA

**Job:** Punch list, safety walk, progress check. Finding ownership and due dates.

**Actors:** site manager (reviewer), inspector, trade (corrective owner).

**Subject:** Site = project; Asset = level / zone / plot.

**Sections:**

1. Walk context — date, weather, attendees, area
2. Safety observations — PPE, edges, housekeeping (pass/fail + photo)
3. Punch items — repeatable finding-first: location, trade, severity, photo, due date
4. Progress notes — long text + photo group
5. Signatures — inspector, site supervisor

**Rules:** Every fail creates a finding with trade owner. High severity due date default = +48h local.

**Scoring:** open vs closed punches; safety fail count.

**Report:** Layout 2 (audit / punch). Findings-forward; owner and due date on each item.

---

## 4. Workplace safety

**Job:** Routine safety observations and audits. Pass/fail evidence and corrective action.

**Actors:** EHS manager (reviewer), observer/inspector, area owner.

**Subject:** Site = facility; Asset = department / line.

**Sections:**

1. Audit meta — standard (internal), shift, area
2. Observations — grouped: PPE, fire, electrical, chemical, ergonomics. Each pass/fail/na + optional photo; fail requires photo + finding
3. Talk / acknowledgment — toolbox talk boolean, attendee count
4. Signatures — observer, area supervisor

**Rules:** Fail always creates a finding; severity mapped from item (fire/electrical = high). Corrective portal is the follow-up surface.

**Scoring:** % pass; high-severity open count.

**Report:** Layout 2. Cover as “Workplace safety observation”. Verification code prominent for auditors.

---

## Shared seed rules

- Every pack ships at least one **in_progress** inspection, one **submitted**, one **approved** with a golden PDF.
- Photos are licensed or generated fixtures stored in seed, not production-looking stock with watermarks.
- Terminology keys (Inspection / Site / Asset / Finding) are overridable in white-label settings; packs should not hard-code “tenant” vs “client” in chrome.
