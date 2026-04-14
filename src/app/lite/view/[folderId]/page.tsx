import PinGateView from "@/components/lite/PinGateView";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;

  return <PinGateView folderId={folderId} />;
}
