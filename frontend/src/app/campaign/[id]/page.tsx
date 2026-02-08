"use client";

import { useParams } from "next/navigation";
import { formatEther } from "viem";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { FUNDRAISER_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, STATUS_LABELS, STATUS_COLORS } from "@/lib/config";
import { FundForm } from "@/components/FundForm";

export default function CampaignPage() {
  const params = useParams();
  const id = Number(params.id);
  const { address } = useAccount();

  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "getCampaign",
    args: [BigInt(id)],
  });

  const { data: myContribution } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDRAISER_ABI,
    functionName: "getContribution",
    args: address ? [BigInt(id), address] : undefined,
  });

  const {
    writeContract: finalize,
    data: finalizeHash,
    isPending: finalizePending,
  } = useWriteContract();
  const { isLoading: finalizeConfirming, isSuccess: finalizeSuccess } =
    useWaitForTransactionReceipt({ hash: finalizeHash });

  const {
    writeContract: refund,
    data: refundHash,
    isPending: refundPending,
  } = useWriteContract();
  const { isLoading: refundConfirming, isSuccess: refundSuccess } =
    useWaitForTransactionReceipt({ hash: refundHash });

  if (!data) {
    return <div className="text-center py-16 text-gray-500">Loading campaign...</div>;
  }

  const [creator, username, bondAmount, targetAmount, raisedAmount, deadline, status] = data;
  const raised = Number(formatEther(raisedAmount));
  const target = Number(formatEther(targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date();
  const isCreator = address?.toLowerCase() === creator.toLowerCase();
  const isActive = status === 0;
  const canRefund =
    (status === 2 || status === 3) && myContribution && myContribution > 0n;

  function handleFinalize(newStatus: number) {
    finalize({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISER_ABI,
      functionName: "finalizeCampaign",
      args: [BigInt(id), newStatus],
    });
  }

  function handleRefund() {
    refund({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISER_ABI,
      functionName: "claimRefund",
      args: [BigInt(id)],
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">Campaign #{id}</h1>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="text-gray-400">
          by{" "}
          <Link
            href={`/profile/${creator}`}
            className="text-blue-400 hover:underline"
          >
            {username}
          </Link>{" "}
          ({creator.slice(0, 6)}...{creator.slice(-4)})
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">
            {raised.toFixed(4)} / {target.toFixed(4)} ETH raised
          </span>
          <span className="text-gray-500">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Bond locked</span>
            <p className="text-white">{formatEther(bondAmount)} ETH</p>
          </div>
          <div>
            <span className="text-gray-500">Deadline</span>
            <p className="text-white">
              {deadlineDate.toLocaleString()}
              {isExpired && <span className="text-red-400 ml-2">(expired)</span>}
            </p>
          </div>
        </div>
        {myContribution && myContribution > 0n && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Your contribution: </span>
            <span className="text-green-400">{formatEther(myContribution)} ETH</span>
          </div>
        )}
      </div>

      {/* Fund form */}
      {isActive && !isExpired && (
        <div className="mb-4">
          <FundForm campaignId={id} />
        </div>
      )}

      {/* Creator actions */}
      {isCreator && isActive && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
          <h3 className="text-lg font-semibold mb-3">Creator Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleFinalize(1)}
              disabled={finalizePending || finalizeConfirming}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 transition"
            >
              Mark Successful
            </button>
            <button
              onClick={() => handleFinalize(2)}
              disabled={finalizePending || finalizeConfirming}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50 transition"
            >
              Mark Failed
            </button>
          </div>
          {finalizeSuccess && (
            <p className="mt-2 text-sm text-green-400">Campaign finalized!</p>
          )}
        </div>
      )}

      {/* Refund */}
      {canRefund && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-lg font-semibold mb-3">Claim Refund</h3>
          <p className="text-sm text-gray-400 mb-3">
            This campaign was {STATUS_LABELS[status].toLowerCase()}. You can claim
            back your {formatEther(myContribution!)} ETH.
          </p>
          <button
            onClick={handleRefund}
            disabled={refundPending || refundConfirming}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {refundPending ? "Confirm..." : refundConfirming ? "Claiming..." : "Claim Refund"}
          </button>
          {refundSuccess && (
            <p className="mt-2 text-sm text-green-400">Refund claimed!</p>
          )}
        </div>
      )}
    </div>
  );
}
