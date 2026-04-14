import { WizardProvider } from "@/contexts/WizardContext";

export const metadata = {
  title: "InCaseOf Lite | Your Emergency Kit",
};

export default function LiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WizardProvider>{children}</WizardProvider>;
}
