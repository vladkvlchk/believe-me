"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { FACTORY_ABI, ERC20_ABI } from "@/lib/abi";
import { FACTORY_ADDRESS } from "@/lib/config";

const USDC_SEPOLIA = "0x16F1A20989b833Fd66b233d1Ae1eFD70F3004446";

export default function CreatePage() {
  const { isConnected } = useAccount();

  const [floorAmount, setFloorAmount] = useState("");
  const [ceilAmount, setCeilAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState(USDC_SEPOLIA);

  const { data: isAllowed } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "allowedTokens",
    args: [tokenAddress as `0x${string}`],
  });

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const decimals = tokenDecimals ?? 6;

  function handleCreate() {
    if (!tokenAddress) return;
    const floor = floorAmount ? parseUnits(floorAmount, decimals) : 0n;
    const ceil = ceilAmount ? parseUnits(ceilAmount, decimals) : 0n;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "createCampaign",
      args: [floor, ceil, tokenAddress as `0x${string}`],
    });
  }

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Create Campaign</h1>
        <p className="text-gray-400">Connect your wallet to create a campaign.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Campaign</h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Token Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
            {tokenSymbol && (
              <p className="text-xs text-gray-500 mt-1">
                Token: {tokenSymbol} ({decimals} decimals)
                {isAllowed === false && (
                  <span className="text-red-400 ml-2">Not whitelisted on factory</span>
                )}
                {isAllowed === true && (
                  <span className="text-green-400 ml-2">Whitelisted</span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Floor ({tokenSymbol || "tokens"}) — minimum to raise (0 = no minimum)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={floorAmount}
              onChange={(e) => setFloorAmount(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Ceil ({tokenSymbol || "tokens"}) — max to raise (0 = unlimited)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={ceilAmount}
              onChange={(e) => setCeilAmount(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || isConfirming || !tokenAddress || isAllowed === false}
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Campaign"}
          </button>

          {isSuccess && (
            <p className="text-green-400 text-sm text-center">
              Campaign created! View it on the home page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
