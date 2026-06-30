import { describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  exportPublicKey,
  generateCollectionKey,
  generateMemberKeypair,
  generateVaultKey,
  importPublicKey,
  unwrapCollectionKeyWithPrivate,
  unwrapPrivateKey,
  wrapCollectionKeyForMember,
  wrapPrivateKey,
} from "./vault-crypto";

/** Simulates a member: keypair + a vault key that protects the private key at rest. */
async function makeMember() {
  const vaultKey = await generateVaultKey();
  const { publicKey, privateKey } = await generateMemberKeypair();
  const wrappedPrivate = await wrapPrivateKey(privateKey, vaultKey);
  const publicSpki = await exportPublicKey(publicKey);
  return { vaultKey, wrappedPrivate, publicSpki };
}

describe("sharing: member private key at rest", () => {
  it("wraps and unwraps the private key with the member's vault key", async () => {
    const { vaultKey, wrappedPrivate } = await makeMember();
    const priv = await unwrapPrivateKey(wrappedPrivate, vaultKey);
    expect(priv.type).toBe("private");
    expect(priv.extractable).toBe(false);
  });

  it("the wrong vault key cannot unwrap the private key", async () => {
    const { wrappedPrivate } = await makeMember();
    const otherVaultKey = await generateVaultKey();
    await expect(unwrapPrivateKey(wrappedPrivate, otherVaultKey)).rejects.toThrow();
  });
});

describe("sharing: collection key wrapped per member", () => {
  it("a member can decrypt an item shared via a collection key wrapped to their public key", async () => {
    const bob = await makeMember();

    // The collection owner encrypts an item with the collection key.
    const collectionKey = await generateCollectionKey();
    const item = await encrypt(JSON.stringify({ title: "Shared wifi", value: "hunter2" }), collectionKey);

    // Alice wraps the collection key to Bob's public key.
    const bobPub = await importPublicKey(bob.publicSpki);
    const wrappedForBob = await wrapCollectionKeyForMember(collectionKey, bobPub);

    // Bob unlocks his vault, recovers his private key, unwraps the collection key, reads the item.
    const bobPriv = await unwrapPrivateKey(bob.wrappedPrivate, bob.vaultKey);
    const bobsCollectionKey = await unwrapCollectionKeyWithPrivate(wrappedForBob, bobPriv);
    expect(await decrypt(item, bobsCollectionKey)).toBe(
      JSON.stringify({ title: "Shared wifi", value: "hunter2" }),
    );
  });

  it("a non-member cannot unwrap a collection key wrapped to someone else", async () => {
    const bob = await makeMember();
    const carol = await makeMember();

    const collectionKey = await generateCollectionKey();
    const bobPub = await importPublicKey(bob.publicSpki);
    const wrappedForBob = await wrapCollectionKeyForMember(collectionKey, bobPub);

    const carolPriv = await unwrapPrivateKey(carol.wrappedPrivate, carol.vaultKey);
    await expect(unwrapCollectionKeyWithPrivate(wrappedForBob, carolPriv)).rejects.toThrow();
  });
});
