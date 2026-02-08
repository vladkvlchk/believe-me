"use client";

import { useState } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { FUNDRAISER_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, API_URL } from "@/lib/config";

export default function CreatePage() {
  const { address, isConnected } = useAccount();

  const [username, setUsername] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [bondAmount, setBondAmount] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    whitelisted: boolean;
    twitterScore: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [whitelisting, setWhitelisting] = useState(false);

  const { data: isWhitelisted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "eligible",
    args: address ? [address] : undefined,
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function checkEligibility() {
    if (!address) return;
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/eligibility/${address}`);
      const data = await res.json();
      setEligibility(data);
    } catch {
      alert("Failed to check eligibility. Is the backend running?");
    }
    setChecking(false);
  }

  async function requestWhitelist() {
    if (!address) return;
    setWhitelisting(true);
    try {
      const res = await fetch(`${API_URL}/api/eligibility/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      if (data.whitelisted) {
        setEligibility((prev) => prev ? { ...prev, whitelisted: true } : null);
      } else {
        alert(data.error || "Whitelist failed");
      }
    } catch {
      alert("Failed to whitelist. Is the backend running?");
    }
    setWhitelisting(false);
  }

  function handleCreate() {
    if (!targetAmount || !bondAmount || !username || !durationDays) return;
    const durationSeconds = BigInt(parseInt(durationDays) * 86400);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISER_ABI,
      functionName: "createCampaign",
      args: [username, parseEther(targetAmount), durationSeconds],
      value: parseEther(bondAmount),
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

  const canCreate = isWhitelisted || eligibility?.whitelisted;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Campaign</h1>

      {/* Eligibility section */}
      {!canCreate && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">Step 1: Verify Eligibility</h2>
          <p className="text-sm text-gray-400 mb-4">
            You need a TwitterScore above 100 to create campaigns.
          </p>

          <button
            onClick={checkEligibility}
            disabled={checking}
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50 transition mb-3"
          >
            {checking ? "Checking..." : "Check My Score"}
          </button>

          {eligibility && (
            <div className="mt-3 text-sm">
              <p>
                TwitterScore:{" "}
                <span className={eligibility.eligible ? "text-green-400" : "text-red-400"}>
                  {eligibility.twitterScore}
                </span>{" "}
                (threshold: 100)
              </p>
              {eligibility.eligible && !eligibility.whitelisted && (
                <button
                  onClick={requestWhitelist}
                  disabled={whitelisting}
                  className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {whitelisting ? "Whitelisting..." : "Get Whitelisted"}
                </button>
              )}
              {!eligibility.eligible && (
                <p className="text-red-400 mt-1">Score too low. Cannot create campaigns.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      <div className={`rounded-xl border border-gray-800 bg-gray-900 p-5 ${!canCreate ? "opacity-50 pointer-events-none" : ""}`}>
        <h2 className="text-lg font-semibold mb-4">
          {canCreate ? "Campaign Details" : "Step 2: Create Campaign (unlock above)"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Twitter Handle</label>
            <input
              type="text"
              placeholder="@yourhandle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Target Amount (ETH)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="1.0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Bond Amount (ETH) — skin in the game
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={bondAmount}
              onChange={(e) => setBondAmount(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration (days)</label>
            <input
              type="number"
              min="1"
              placeholder="7"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || isConfirming || !username || !targetAmount || !bondAmount}
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
