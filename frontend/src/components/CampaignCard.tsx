"use client";

import Link from "next/link";
import { formatUnits } from "viem";

interface Props {
  address: string;
  creator: string;
  floor: bigint;
  ceil: bigint;
  totalRaised: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  withdrawnAt: bigint;
}

export function CampaignCard({
  address,
  creator,
  floor,
  ceil,
  totalRaised,
  tokenSymbol,
  tokenDecimals,
  withdrawnAt,
}: Props) {
  const raised = Number(formatUnits(totalRaised, tokenDecimals));
  const ceilNum = Number(formatUnits(ceil, tokenDecimals));
  const floorNum = Number(formatUnits(floor, tokenDecimals));
  const progress = ceilNum > 0 ? Math.min((raised / ceilNum) * 100, 100) : 0;
  const isClosed = withdrawnAt > 0n;

  return (
    <Link href={`/campaign/${address}`}>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-600 transition cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${isClosed ? "bg-gray-500" : "bg-blue-500"}`}
          >
            {isClosed ? "Closed" : "Active"}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">
              {raised.toFixed(2)} {tokenSymbol} raised
            </span>
            {ceilNum > 0 && (
              <span className="text-gray-500">{progress.toFixed(0)}%</span>
            )}
          </div>
          {ceilNum > 0 && (
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          {floorNum > 0 && (
            <span>
              Floor: {floorNum.toFixed(2)} {tokenSymbol}
            </span>
          )}
          {ceilNum > 0 && (
            <span>
              Ceil: {ceilNum.toFixed(2)} {tokenSymbol}
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-600 truncate">
          by{" "}
          <Link
            href={`/profile/${creator}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:underline"
          >
            {creator.slice(0, 6)}...{creator.slice(-4)}
          </Link>
        </div>
      </div>
    </Link>
  );
}
