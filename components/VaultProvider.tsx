"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSupabaseClient } from "@/lib/supabase";
import { createProfile, fetchProfile, updateProfile } from "@/lib/vault-data";
import {
  deriveMasterKey,
  generateVaultKey,
  KDF_PARAMS,
  newSalt,
  rewrapVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from "@/lib/vault-crypto";
import type { ProfileRow } from "@/lib/database.types";

/** Idle minutes before the vault auto-locks and the key is dropped from memory. */
export const AUTO_LOCK_MINUTES = 15;

/** How long before auto-lock to warn the user (so they can stay unlocked). */
export const LOCK_WARNING_SECONDS = 30;

export type VaultStatus = "loading" | "needs-setup" | "locked" | "unlocked" | "error";

/** Thrown by unlock() when the master password fails to unwrap the vault key. */
export class WrongMasterPasswordError extends Error {
  constructor() {
    super("Incorrect master password.");
    this.name = "WrongMasterPasswordError";
  }
}

interface VaultContextValue {
  status: VaultStatus;
  /** Load-time error message (not used for wrong-password, which is thrown). */
  loadError: string | null;
  /**
   * The unwrapped vault key — present ONLY while unlocked, in memory ONLY.
   * Never persist this or send it anywhere. Use it with encrypt()/decrypt().
   */
  vaultKey: CryptoKey | null;
  /** First-run setup: choose a master password and create the profile. */
  setupVault: (masterPassword: string) => Promise<void>;
  /** Re-derive + unwrap with the master password. Throws WrongMasterPasswordError. */
  unlock: (masterPassword: string) => Promise<void>;
  /**
   * Rotate the master password. Verifies the current password, re-wraps the SAME
   * vault key under the new one (items stay decryptable), and updates the profile.
   * Throws WrongMasterPasswordError if the current password is wrong. Requires an
   * unlocked vault.
   */
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Drop the vault key from memory and return to the locked screen. */
  lock: () => void;
  /** True in the final seconds before idle auto-lock. */
  lockWarning: boolean;
  /** Reset the idle timer (e.g. from a "stay unlocked" action). */
  keepAlive: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [lockWarning, setLockWarning] = useState(false);

  // Load the profile on mount to decide between setup and unlock.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchProfile(supabase);
        if (cancelled) return;
        setProfile(row);
        setStatus(row ? "locked" : "needs-setup");
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load your vault profile.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const lock = useCallback(() => {
    // Dropping the only reference is what makes the key unrecoverable until re-unlock.
    setVaultKey(null);
    setStatus((s) => (s === "needs-setup" || s === "loading" ? s : "locked"));
  }, []);

  const setupVault = useCallback(
    async (masterPassword: string) => {
      const salt = newSalt();
      const masterKey = await deriveMasterKey(masterPassword, salt, KDF_PARAMS);
      const vk = await generateVaultKey();
      const wrapped = await wrapVaultKey(vk, masterKey);
      const row = await createProfile(supabase, {
        salt,
        wrapped_vault_key: wrapped,
        kdf: KDF_PARAMS,
      });
      setProfile(row);
      setVaultKey(vk);
      setStatus("unlocked");
    },
    [supabase],
  );

  const unlock = useCallback(
    async (masterPassword: string) => {
      if (!profile) throw new Error("No vault profile loaded.");
      const masterKey = await deriveMasterKey(masterPassword, profile.salt, profile.kdf);
      let vk: CryptoKey;
      try {
        vk = await unwrapVaultKey(profile.wrapped_vault_key, masterKey);
      } catch {
        // GCM auth failure === wrong master password (or tampered blob).
        throw new WrongMasterPasswordError();
      }
      setVaultKey(vk);
      setStatus("unlocked");
    },
    [profile],
  );

  const changeMasterPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!profile) throw new Error("No vault profile loaded.");
      const oldMasterKey = await deriveMasterKey(currentPassword, profile.salt, profile.kdf);
      const freshSalt = newSalt();
      const newMasterKey = await deriveMasterKey(newPassword, freshSalt, KDF_PARAMS);

      let rewrapped;
      try {
        rewrapped = await rewrapVaultKey(profile.wrapped_vault_key, oldMasterKey, newMasterKey);
      } catch {
        // Old master key failed to unwrap => current password was wrong.
        throw new WrongMasterPasswordError();
      }

      const row = await updateProfile(supabase, {
        salt: freshSalt,
        wrapped_vault_key: rewrapped,
        kdf: KDF_PARAMS,
      });
      setProfile(row);
      // vaultKey in memory is unchanged and still valid — vault stays unlocked.
    },
    [profile, supabase],
  );

  // --- Auto-lock: idle warning + timeout + lock on tab background/close -------
  const lockRef = useRef(lock);
  lockRef.current = lock;
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (status !== "unlocked") {
      setLockWarning(false);
      return;
    }

    const total = AUTO_LOCK_MINUTES * 60_000;
    let lockTimer: ReturnType<typeof setTimeout>;
    let warnTimer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(lockTimer);
      clearTimeout(warnTimer);
      setLockWarning(false);
      warnTimer = setTimeout(() => setLockWarning(true), Math.max(0, total - LOCK_WARNING_SECONDS * 1000));
      lockTimer = setTimeout(() => lockRef.current(), total);
    };
    resetRef.current = reset;

    const activity = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    const onActivity = () => reset();
    const onHide = () => {
      if (document.visibilityState === "hidden") lockRef.current();
    };
    const onPageHide = () => lockRef.current();

    reset();
    activity.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearTimeout(lockTimer);
      clearTimeout(warnTimer);
      activity.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [status]);

  const keepAlive = useCallback(() => resetRef.current(), []);

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      loadError,
      vaultKey,
      setupVault,
      unlock,
      changeMasterPassword,
      lock,
      lockWarning,
      keepAlive,
    }),
    [status, loadError, vaultKey, setupVault, unlock, changeMasterPassword, lock, lockWarning, keepAlive],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within a VaultProvider.");
  return ctx;
}

/** Convenience for components that require an unlocked vault key. */
export function useVaultKey(): CryptoKey {
  const { vaultKey } = useVault();
  if (!vaultKey) throw new Error("Vault is locked: no vault key available.");
  return vaultKey;
}
