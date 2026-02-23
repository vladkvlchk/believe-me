"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { fmt, fmtToken } from "@/lib/fmt";

interface Props {
  address: string;
  creator: string;
  floor: bigint;
  ceil: bigint;
  totalRaised: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  withdrawnAt: bigint;
  name?: string;
  logoUrl?: string;
  coverUrl?: string;
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
  name,
  logoUrl,
  coverUrl,
}: Props) {
  const raised = Number(formatUnits(totalRaised, tokenDecimals));
  const ceilNum = Number(formatUnits(ceil, tokenDecimals));
  const floorNum = Number(formatUnits(floor, tokenDecimals));
  const progress = ceilNum > 0 ? Math.min((raised / ceilNum) * 100, 100) : 0;
  const isClosed = withdrawnAt > 0n;

  return (
    <Link href={`/campaign/${address}`}>
      <div className="rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-600 transition cursor-pointer overflow-hidden">
        {/* Cover + overlapping logo */}
        <div className="relative">
          {/* Cover banner */}
          <div className="h-24 bg-gray-800">
            {coverUrl && (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Status badge — top-right on cover */}
          <span
            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full text-white ${isClosed ? "bg-gray-500" : "bg-blue-500"}`}
          >
            {isClosed ? "Closed" : "Active"}
          </span>

          {/* Logo — half on cover, half below */}
          {logoUrl && (
            <div className="absolute -bottom-5 left-4">
              <img
                src={logoUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border-2 border-gray-900"
              />
            </div>
          )}
        </div>

        {/* Content — extra top padding when logo present to not overlap */}
        <div className={`px-5 pb-4 ${logoUrl ? "pt-7" : "pt-3"}`}>
          <h3 className="text-white font-semibold truncate mb-0.5">
            {name || `${address.slice(0, 6)}...${address.slice(-4)}`}
          </h3>
          {name && (
            <p className="text-xs text-gray-500 font-mono mb-3">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
          {!name && <div className="mb-3" />}

          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">
                {fmt(raised, 2)} {tokenSymbol} raised
              </span>
              {ceilNum > 0 && (
                <span className="text-gray-500">{progress.toFixed(0)}%</span>
              )}
            </div>
            {ceilNum > 0 && (
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
                {floorNum > 0 && ceilNum > 0 && (
                  <div
                    className="absolute top-0 w-0.5 h-full bg-yellow-500"
                    style={{ left: `${Math.min((floorNum / ceilNum) * 100, 100)}%` }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            {floorNum > 0 && (
              <span>
                Floor: {fmt(floorNum, 2)} {tokenSymbol}
              </span>
            )}
            {ceilNum > 0 && (
              <span>
                Ceil: {fmt(ceilNum, 2)} {tokenSymbol}
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
      </div>
    </Link>
  );
}
