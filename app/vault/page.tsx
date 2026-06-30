import VaultWorkspace from "@/components/VaultWorkspace";
import { SharingProvider } from "@/components/SharingProvider";
import VaultList from "@/components/VaultList";

export default function VaultPage() {
  return (
    <VaultWorkspace>
      {/* SharingProvider is rendered only inside the unlocked gate, so the vault
          key is always available for member-key bootstrap. */}
      <SharingProvider>
        <VaultList />
      </SharingProvider>
    </VaultWorkspace>
  );
}
