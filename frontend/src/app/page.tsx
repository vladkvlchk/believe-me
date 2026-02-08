"use client";

import { useReadContract } from "wagmi";
import { FUNDRAISER_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { CampaignCard } from "@/components/CampaignCard";

export default function HomePage() {
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "campaignCount",
  });

  const campaignCount = count ? Number(count) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Active Campaigns</h1>
        <p className="text-gray-400">
          Browse fundraising campaigns from verified creators. All funds held in
          smart contract escrow.
        </p>
      </div>

      {campaignCount === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No campaigns yet.</p>
          <p className="text-sm mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: campaignCount }, (_, i) => (
            <CampaignItem key={i} id={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignItem({ id }: { id: number }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "getCampaign",
    args: [BigInt(id)],
  });

  if (!data) return <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse h-40" />;

  const [creator, username, bondAmount, targetAmount, raisedAmount, deadline, status] = data;

  return (
    <CampaignCard
      id={id}
      creator={creator}
      username={username}
      bondAmount={bondAmount}
      targetAmount={targetAmount}
      raisedAmount={raisedAmount}
      deadline={deadline}
      status={status}
    />
  );
}
