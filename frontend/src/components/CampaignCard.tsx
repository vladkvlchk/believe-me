"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/config";

interface Props {
  id: number;
  creator: string;
  username: string;
  bondAmount: bigint;
  targetAmount: bigint;
  raisedAmount: bigint;
  deadline: bigint;
  status: number;
}

export function CampaignCard({
  id,
  creator,
  username,
  bondAmount,
  targetAmount,
  raisedAmount,
  deadline,
  status,
}: Props) {
  const raised = Number(formatEther(raisedAmount));
  const target = Number(formatEther(targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date();

  return (
    <Link href={`/campaign/${id}`}>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-600 transition cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">{username}</span>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">
              {raised.toFixed(4)} / {target.toFixed(4)} ETH
            </span>
            <span className="text-gray-500">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>Bond: {formatEther(bondAmount)} ETH</span>
          <span>{isExpired ? "Expired" : `Ends ${deadlineDate.toLocaleDateString()}`}</span>
        </div>
        <div className="mt-2 text-xs text-gray-600 truncate">
          by {creator.slice(0, 6)}...{creator.slice(-4)}
        </div>
      </div>
    </Link>
  );
}
