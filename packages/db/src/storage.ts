import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertOrgPrefixedKey, EVIDENCE_BUCKET, evidenceObjectKey } from "@inspectstack/domain";
import { readServerEnv } from "@inspectstack/config";

export type StorageAdapter = {
  put(organizationId: string, key: string, body: Buffer, contentType: string): Promise<void>;
  remove(organizationId: string, key: string): Promise<void>;
  signedDownloadUrl(organizationId: string, key: string, expiresIn?: number): Promise<string>;
  signedUploadUrl(organizationId: string, key: string, expiresIn?: number): Promise<string>;
  evidenceKey: typeof evidenceObjectKey;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStorageAdapter(client?: SupabaseClient<any, any, any>): StorageAdapter {
  const env = readServerEnv();
  const supabase =
    client ??
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  return {
    evidenceKey: evidenceObjectKey,
    async put(organizationId, key, body, contentType) {
      assertOrgPrefixedKey(organizationId, key);
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(key, body, {
        contentType,
        upsert: true,
      });
      if (error) throw error;
    },
    async remove(organizationId, key) {
      assertOrgPrefixedKey(organizationId, key);
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([key]);
      if (error) throw error;
    },
    async signedDownloadUrl(organizationId, key, expiresIn = 60) {
      assertOrgPrefixedKey(organizationId, key);
      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(key, expiresIn);
      if (error || !data?.signedUrl) throw error ?? new Error("Signed URL failed");
      return data.signedUrl;
    },
    async signedUploadUrl(organizationId, key, expiresIn = 60) {
      assertOrgPrefixedKey(organizationId, key);
      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUploadUrl(key);
      if (error || !data?.signedUrl) throw error ?? new Error("Signed upload URL failed");
      void expiresIn;
      return data.signedUrl;
    },
  };
}
