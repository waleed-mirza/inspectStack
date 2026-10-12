# Branding

Owners and admins open **Settings**. Inspectors are denied.

## What applies where

| Control                 | UI chrome                                        | Public verify page | PDF snapshot                                                    |
| ----------------------- | ------------------------------------------------ | ------------------ | --------------------------------------------------------------- |
| Logo                    | signed URL on the plate; initials if missing     | same               | bytes embedded on new renders                                   |
| Primary color           | `--org-brand` ticket rail                        | same               | brand rail on new renders                                       |
| Terminology             | nav labels (inspection / site / asset / finding) | copy where used    | snapshot uses canonical branding subset                         |
| Report / email identity | shown on settings; invite from-name recorded     | org name           | cover identity                                                  |
| Date / paper / prefix   | live settings                                    | —                  | paper size is a render hint; **already-issued** goldens stay A4 |
| Legal footer            | settings + public report                         | footer             | snapshot footer                                                 |

Changing color does not rewrite issued snapshots. Approve a new inspection to see the brand on a fresh PDF.

## Logo

PNG or JPEG. Stored at `{orgId}/branding/logo.{ext}`. Dark-safe: the plate sits on ink; a light mark is expected. Missing logo falls back to initials.

## Demo beat

Northline can be retinted (Week 7 used `#7A2418` and “Property checks”). Westfield stays its own color. Impersonation is not required for a buyer eval.

Starter packs change **content**, not chrome. Do not fork the design system per vertical.
