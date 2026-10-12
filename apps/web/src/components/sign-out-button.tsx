"use client";

import { SubmitButton } from "@inspectstack/ui";
import { signOut } from "@/lib/actions/auth";
import { purgeOnSignOut } from "@/lib/offline";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        try {
          await purgeOnSignOut();
        } finally {
          await signOut();
        }
      }}
    >
      <SubmitButton size="sm" busyLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
