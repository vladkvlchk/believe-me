"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { FUNDRAISER_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, STATUS_LABELS, STATUS_COLORS } from "@/lib/config";
import { formatEther } from "viem";

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const { data: reputation } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "getReputation",
    args: [address as `0x${string}`],
  });

  const { data: isEligible } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "eligible",
    args: [address as `0x${string}`],
  });

  const { data: campaignCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "campaignCount",
  });

  const totalCampaigns = campaignCount ? Number(campaignCount) : 0;
  const rep = reputation !== undefined ? Number(reputation) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-6">
        <h1 className="text-2xl font-bold mb-1">Profile</h1>
        <p className="text-gray-400 font-mono text-sm mb-4">
          {address}
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">
              <span className={rep > 0 ? "text-green-400" : rep < 0 ? "text-red-400" : "text-gray-400"}>
                {rep > 0 ? `+${rep}` : rep}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Reputation</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {isEligible ? "Yes" : "No"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Eligible</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-gray-500 mt-1">Campaigns</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Campaigns by this creator</h2>

      <div className="space-y-3">
        {Array.from({ length: totalCampaigns }, (_, i) => (
          <CreatorCampaign key={i} id={i} filterAddress={address} />
        ))}
      </div>
    </div>
  );
}

function CreatorCampaign({ id, filterAddress }: { id: number; filterAddress: string }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "getCampaign",
    args: [BigInt(id)],
  });

  if (!data) return null;

  const [creator, username, bondAmount, targetAmount, raisedAmount, deadline, status] = data;

  // Only show campaigns by this address
  if (creator.toLowerCase() !== filterAddress.toLowerCase()) return null;

  const raised = Number(formatEther(raisedAmount));
  const target = Number(formatEther(targetAmount));

  return (
    <a href={`/campaign/${id}`} className="block">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-600 transition">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white font-medium">Campaign #{id}</span>
            <span className="text-gray-500 text-sm ml-2">{username}</span>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {raised.toFixed(4)} / {target.toFixed(4)} ETH | Bond: {formatEther(bondAmount)} ETH
        </div>
      </div>
    </a>
  );
}
