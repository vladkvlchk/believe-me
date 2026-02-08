"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FUNDRAISER_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";

export function FundForm({ campaignId }: { campaignId: number }) {
  const [amount, setAmount] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleFund() {
    if (!amount || parseFloat(amount) <= 0) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISER_ABI,
      functionName: "fundCampaign",
      args: [BigInt(campaignId)],
      value: parseEther(amount),
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-lg font-semibold text-white mb-3">Fund this campaign</h3>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="Amount in ETH"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleFund}
          disabled={isPending || isConfirming || !amount}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Confirm..." : isConfirming ? "Sending..." : "Fund"}
        </button>
      </div>
      {isSuccess && (
        <p className="mt-2 text-sm text-green-400">Funded successfully!</p>
      )}
    </div>
  );
}
