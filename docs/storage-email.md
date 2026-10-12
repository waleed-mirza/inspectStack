# Storage and email

## Storage

Default driver: **Supabase Storage** on the linked project. Bucket id `evidence` (see `EVIDENCE_BUCKET` in `@inspectstack/domain`).

Keys are org-prefixed:

- Evidence: `{organizationId}/{inspectionId}/{mediaId}/{random}.{ext}`
- Brand logo: `{organizationId}/branding/logo.{ext}`

The bucket is not public. Downloads use short-lived signed URLs after the repository checks that the key belongs to the active organization. Uploads sniff content type; HTML and other unsafe types are rejected.

The field runner writes a media **manifest** (id, hash, size, type) before bytes. Interrupted uploads retry from the queue.

A portable S3/R2/MinIO adapter is a later path (ADR 0002 as amended by 0007). Do not expect `STORAGE_DRIVER` in v1.

### Cleanup

Orphan objects are those whose `media.storage_key` row was deleted. There is no automatic janitor in v1. Backup and restore: [backup.md](backup.md).

## Email

Magic links and invitations use the **Supabase project mailbox**. Workspace branding stores a from-name and from-address for identity; the project still sends the message. There is no third-party ESP in v1.

For local demo, use the seeded password personas. Magic link requires the project’s Auth email settings and `NEXT_PUBLIC_APP_URL` on the allow-list.

Invites: `/app/settings/team` as owner/admin. The last owner cannot be demoted or suspended.
