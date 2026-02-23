"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, CAMPAIGN_ABI, ERC20_ABI } from "@/lib/abi";
import { FACTORY_ADDRESS, API_URL, AUTH_URL } from "@/lib/config";
import { fmt, fmtToken } from "@/lib/fmt";
import Link from "next/link";

interface TwitterProfile {
  linked: boolean;
  twitterUsername?: string;
  twitterAvatar?: string;
  twitterScore?: number | null;
}

interface UserStats {
  wallet: string;
  campaigns_created: number;
  creator_total_raised: string;
  creator_total_returned: string;
  creator_pnl: string;
  campaigns_invested: number;
  investor_total_deposited: string;
  investor_total_claimed: string;
  investor_total_refunded: string;
  investor_pnl: string;
}

interface CampaignData {
  address: `0x${string}`;
  creator: string;
  totalRaised: bigint;
  withdrawnAt: bigint;
  returnedAmount: bigint;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
}

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const { address: myAddress } = useAccount();
  const isOwnProfile = myAddress?.toLowerCase() === address.toLowerCase();

  const [twitter, setTwitter] = useState<TwitterProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/profile/${address}`)
      .then((r) => r.json())
      .then(setTwitter)
      .catch(() => setTwitter({ linked: false }));

    fetch(`${API_URL}/api/stats/user/${address}`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [address]);

  const { data: campaigns } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getCampaigns",
  });

  const campaignAddresses = campaigns ?? [];

  const campaignContracts = useMemo(
    () =>
      campaignAddresses.flatMap((addr) => [
        { address: addr, abi: CAMPAIGN_ABI, functionName: "creator" as const },
        { address: addr, abi: CAMPAIGN_ABI, functionName: "totalRaised" as const },
        { address: addr, abi: CAMPAIGN_ABI, functionName: "withdrawnAt" as const },
        { address: addr, abi: CAMPAIGN_ABI, functionName: "returnedAmount" as const },
        { address: addr, abi: CAMPAIGN_ABI, functionName: "token" as const },
      ]),
    [campaignAddresses]
  );

  const { data: campaignResults } = useReadContracts({ contracts: campaignContracts });

  const tokenAddresses = useMemo(() => {
    if (!campaignResults) return [];
    const tokens = new Set<`0x${string}`>();
    for (let i = 0; i < campaignAddresses.length; i++) {
      const base = i * 5;
      const creator = campaignResults[base]?.result as string | undefined;
      const tokenAddr = campaignResults[base + 4]?.result as `0x${string}` | undefined;
      if (creator?.toLowerCase() === address.toLowerCase() && tokenAddr) {
        tokens.add(tokenAddr);
      }
    }
    return Array.from(tokens);
  }, [campaignResults, campaignAddresses, address]);

  const tokenContracts = useMemo(
    () =>
      tokenAddresses.flatMap((addr) => [
        { address: addr, abi: ERC20_ABI, functionName: "symbol" as const },
        { address: addr, abi: ERC20_ABI, functionName: "decimals" as const },
      ]),
    [tokenAddresses]
  );

  const { data: tokenResults } = useReadContracts({ contracts: tokenContracts });

  const tokenInfo = useMemo(() => {
    const map = new Map<string, { symbol: string; decimals: number }>();
    if (!tokenResults) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const symbol = tokenResults[i * 2]?.result as string | undefined;
      const decimals = tokenResults[i * 2 + 1]?.result as number | undefined;
      if (symbol && decimals !== undefined) {
        map.set(tokenAddresses[i].toLowerCase(), { symbol, decimals });
      }
    }
    return map;
  }, [tokenResults, tokenAddresses]);

  const creatorCampaigns = useMemo(() => {
    if (!campaignResults || tokenInfo.size === 0) return [];
    const result: CampaignData[] = [];
    for (let i = 0; i < campaignAddresses.length; i++) {
      const base = i * 5;
      const creator = campaignResults[base]?.result as string | undefined;
      if (creator?.toLowerCase() !== address.toLowerCase()) continue;

      const tokenAddr = campaignResults[base + 4]?.result as `0x${string}`;
      const info = tokenInfo.get(tokenAddr.toLowerCase());
      if (!info) continue;

      result.push({
        address: campaignAddresses[i],
        creator: creator!,
        totalRaised: (campaignResults[base + 1]?.result as bigint) ?? 0n,
        withdrawnAt: (campaignResults[base + 2]?.result as bigint) ?? 0n,
        returnedAmount: (campaignResults[base + 3]?.result as bigint) ?? 0n,
        tokenAddress: tokenAddr,
        tokenSymbol: info.symbol,
        tokenDecimals: info.decimals,
      });
    }
    return result;
  }, [campaignResults, campaignAddresses, address, tokenInfo]);

  const creatorPnl = stats ? Number(stats.creator_pnl) : 0;
  const investorPnl = stats ? Number(stats.investor_pnl) : 0;

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
              <div className="flex items-center gap-3">
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
                {twitter.twitterScore !== null && twitter.twitterScore !== undefined && (
                  <div className="rounded-lg bg-gray-800 px-3 py-2 text-center">
                    <p className="text-white font-bold text-sm">{twitter.twitterScore}</p>
                    <p className="text-gray-500 text-xs">Score</p>
                  </div>
                )}
              </div>
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

        {/* Stats from backend */}
        {stats && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            {/* Creator stats */}
            {stats.campaigns_created > 0 && (
              <div className="mb-4">
                <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">As Creator</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.campaigns_created}</p>
                    <p className="text-xs text-gray-500 mt-1">Campaigns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {fmt(Number(stats.creator_total_raised))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Raised</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${creatorPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {creatorPnl >= 0 ? "+" : ""}{fmt(creatorPnl)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Campaigns PnL</p>
                  </div>
                </div>
              </div>
            )}

            {/* Investor stats */}
            {stats.campaigns_invested > 0 && (
              <div className={stats.campaigns_created > 0 ? "pt-4 border-t border-gray-800" : ""}>
                <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">As Investor</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.campaigns_invested}</p>
                    <p className="text-xs text-gray-500 mt-1">Investments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {fmt(Number(stats.investor_total_deposited))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Deposited</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${investorPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {investorPnl >= 0 ? "+" : ""}{fmt(investorPnl)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Invests PnL</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4">Campaigns by this creator</h2>

      <div className="space-y-3">
        {creatorCampaigns.length === 0 && (
          <p className="text-gray-500 text-sm">No campaigns found.</p>
        )}
        {creatorCampaigns.map((c) => (
          <Link key={c.address} href={`/campaign/${c.address}`} className="block">
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-white font-mono text-sm">
                  {c.address.slice(0, 6)}...{c.address.slice(-4)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full text-white ${c.withdrawnAt > 0n ? "bg-gray-500" : "bg-blue-500"}`}
                >
                  {c.withdrawnAt > 0n ? "Closed" : "Active"}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {fmtToken(c.totalRaised, c.tokenDecimals)} {c.tokenSymbol} raised
                {c.returnedAmount > 0n && (
                  <span className="text-yellow-400 ml-2">
                    ({fmtToken(c.returnedAmount, c.tokenDecimals)} returned)
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
