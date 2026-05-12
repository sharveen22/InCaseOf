import PinGateView from "@/components/lite/PinGateView";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId: shareToken } = await params;

  return <PinGateView shareToken={shareToken} />;
}
