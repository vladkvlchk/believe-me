"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, CAMPAIGN_ABI, ERC20_ABI } from "@/lib/abi";
import { FACTORY_ADDRESS, API_URL, AUTH_URL } from "@/lib/config";
import { formatUnits } from "viem";
import Link from "next/link";

interface TwitterProfile {
  linked: boolean;
  twitterUsername?: string;
  twitterAvatar?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const { address: myAddress } = useAccount();
  const isOwnProfile = myAddress?.toLowerCase() === address.toLowerCase();

  const [twitter, setTwitter] = useState<TwitterProfile | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/profile/${address}`)
      .then((r) => r.json())
      .then(setTwitter)
      .catch(() => setTwitter({ linked: false }));
  }, [address]);

  const { data: campaigns } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getCampaigns",
  });

  const campaignAddresses = campaigns ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Profile</h1>
            <p className="text-gray-400 font-mono text-sm">{address}</p>
          </div>

          {/* Twitter section */}
          <div className="flex items-center gap-3">
            {twitter === null ? (
              <span className="text-gray-600 text-sm">Loading...</span>
            ) : twitter.linked ? (
              <a
                href={`https://x.com/${twitter.twitterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 hover:bg-gray-700 transition"
              >
                {twitter.twitterAvatar && (
                  <img
                    src={twitter.twitterAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-blue-400 text-sm font-medium">
                  @{twitter.twitterUsername}
                </span>
              </a>
            ) : isOwnProfile ? (
              <a
                href={`${AUTH_URL}/api/auth/twitter?wallet=${address}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Connect Twitter
              </a>
            ) : (
              <span className="text-gray-600 text-sm">No Twitter linked</span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Campaigns by this creator</h2>

      <div className="space-y-3">
        {campaignAddresses.length === 0 && (
          <p className="text-gray-500 text-sm">No campaigns found.</p>
        )}
        {campaignAddresses.map((addr) => (
          <CreatorCampaign key={addr} campaignAddress={addr} filterAddress={address} />
        ))}
      </div>
    </div>
  );
}

function CreatorCampaign({
  campaignAddress,
  filterAddress,
}: {
  campaignAddress: `0x${string}`;
  filterAddress: string;
}) {
  const { data: results } = useReadContracts({
    contracts: [
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "creator" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "floor" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "ceil" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "totalRaised" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "token" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "withdrawnAt" },
    ],
  });

  const tokenAddress = results?.[4]?.result as `0x${string}` | undefined;

  const { data: tokenResults } = useReadContracts({
    contracts: tokenAddress
      ? [
          { address: tokenAddress, abi: ERC20_ABI, functionName: "symbol" },
          { address: tokenAddress, abi: ERC20_ABI, functionName: "decimals" },
        ]
      : [],
  });

  if (!results || results.some((r) => r.status !== "success")) return null;

  const creator = results[0].result as string;
  if (creator.toLowerCase() !== filterAddress.toLowerCase()) return null;

  if (!tokenResults || tokenResults.length < 2 || tokenResults.some((r) => r.status !== "success")) return null;

  const totalRaised = results[3].result as bigint;
  const withdrawnAt = results[5].result as bigint;
  const tokenSymbol = tokenResults[0]!.result as string;
  const tokenDecimals = tokenResults[1]!.result as number;
  const isClosed = withdrawnAt > 0n;

  return (
    <Link href={`/campaign/${campaignAddress}`} className="block">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-600 transition">
        <div className="flex items-center justify-between">
          <span className="text-white font-mono text-sm">
            {campaignAddress.slice(0, 6)}...{campaignAddress.slice(-4)}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${isClosed ? "bg-gray-500" : "bg-blue-500"}`}
          >
            {isClosed ? "Closed" : "Active"}
          </span>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {formatUnits(totalRaised, tokenDecimals)} {tokenSymbol} raised
        </div>
      </div>
    </Link>
  );
}
