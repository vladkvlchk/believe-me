"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { formatUnits, parseUnits } from "viem";
import Link from "next/link";
import {
  useAccount,
  useReadContracts,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CAMPAIGN_ABI, ERC20_ABI } from "@/lib/abi";
import { DepositForm } from "@/components/DepositForm";

export default function CampaignPage() {
  const params = useParams();
  const campaignAddress = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();

  const { data: results } = useReadContracts({
    contracts: [
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "creator" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "floor" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "ceil" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "totalRaised" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "token" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "withdrawnAt" },
      { address: campaignAddress, abi: CAMPAIGN_ABI, functionName: "returnedAmount" },
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

  const { data: myInvestment } = useReadContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "invests",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: myClaimed } = useReadContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "claimed",
    args: userAddress ? [userAddress] : undefined,
  });

  if (
    !results ||
    results.some((r) => r.status !== "success") ||
    !tokenResults ||
    tokenResults.length < 2 ||
    tokenResults.some((r) => r.status !== "success")
  ) {
    return <div className="text-center py-16 text-gray-500">Loading campaign...</div>;
  }

  const creator = results[0].result as string;
  const floor = results[1].result as bigint;
  const ceil = results[2].result as bigint;
  const totalRaised = results[3].result as bigint;
  const withdrawnAt = results[5].result as bigint;
  const returnedAmount = results[6].result as bigint;
  const tokenSymbol = tokenResults[0]!.result as string;
  const tokenDecimals = tokenResults[1]!.result as number;

  const raised = Number(formatUnits(totalRaised, tokenDecimals));
  const ceilNum = Number(formatUnits(ceil, tokenDecimals));
  const floorNum = Number(formatUnits(floor, tokenDecimals));
  const progress = ceilNum > 0 ? Math.min((raised / ceilNum) * 100, 100) : 0;
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase();
  const isClosed = withdrawnAt > 0n;
  const isActive = !isClosed;
  const hasInvestment = myInvestment !== undefined && myInvestment > 0n;
  const floorMet = floor === 0n || totalRaised >= floor;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">Campaign</h1>
          <span
            className={`text-xs px-2 py-1 rounded-full text-white ${isClosed ? "bg-gray-500" : "bg-blue-500"}`}
          >
            {isClosed ? "Closed" : "Active"}
          </span>
        </div>
        <p className="text-gray-400 font-mono text-sm">{campaignAddress}</p>
        <p className="text-gray-400 text-sm mt-1">
          by{" "}
          <Link href={`/profile/${creator}`} className="text-blue-400 hover:underline">
            {creator.slice(0, 6)}...{creator.slice(-4)}
          </Link>
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">
            {raised.toFixed(2)} {tokenSymbol} raised
          </span>
          {ceilNum > 0 && <span className="text-gray-500">{progress.toFixed(0)}%</span>}
        </div>
        {ceilNum > 0 && (
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Floor</span>
            <p className="text-white">
              {floorNum > 0 ? `${floorNum.toFixed(2)} ${tokenSymbol}` : "None"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Ceil</span>
            <p className="text-white">
              {ceilNum > 0 ? `${ceilNum.toFixed(2)} ${tokenSymbol}` : "Unlimited"}
            </p>
          </div>
        </div>
        {hasInvestment && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">Your investment: </span>
            <span className="text-green-400">
              {formatUnits(myInvestment!, tokenDecimals)} {tokenSymbol}
            </span>
          </div>
        )}
        {returnedAmount > 0n && (
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Returned by creator: </span>
            <span className="text-yellow-400">
              {formatUnits(returnedAmount, tokenDecimals)} {tokenSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Deposit form — only when active */}
      {isActive && tokenAddress && (
        <div className="mb-4">
          <DepositForm
            campaignAddress={campaignAddress}
            tokenAddress={tokenAddress}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
          />
        </div>
      )}

      {/* Refund — investor, before withdraw */}
      {isActive && hasInvestment && (
        <RefundSection
          campaignAddress={campaignAddress}
          tokenDecimals={tokenDecimals}
          tokenSymbol={tokenSymbol}
          maxAmount={myInvestment!}
        />
      )}

      {/* Claim — investor, after returnFunds */}
      {isClosed && hasInvestment && returnedAmount > 0n && (
        <ClaimSection
          campaignAddress={campaignAddress}
          tokenDecimals={tokenDecimals}
          tokenSymbol={tokenSymbol}
          myInvestment={myInvestment!}
          totalRaised={totalRaised}
          returnedAmount={returnedAmount}
          myClaimed={myClaimed ?? 0n}
        />
      )}

      {/* Creator actions */}
      {isCreator && isActive && floorMet && totalRaised > 0n && (
        <WithdrawSection campaignAddress={campaignAddress} />
      )}

      {isCreator && isClosed && tokenAddress && (
        <ReturnFundsSection
          campaignAddress={campaignAddress}
          tokenAddress={tokenAddress}
          tokenDecimals={tokenDecimals}
          tokenSymbol={tokenSymbol}
        />
      )}
    </div>
  );
}

function RefundSection({
  campaignAddress,
  tokenDecimals,
  tokenSymbol,
  maxAmount,
}: {
  campaignAddress: `0x${string}`;
  tokenDecimals: number;
  tokenSymbol: string;
  maxAmount: bigint;
}) {
  const [amount, setAmount] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleRefund() {
    if (!amount) return;
    writeContract({
      address: campaignAddress,
      abi: CAMPAIGN_ABI,
      functionName: "refund",
      args: [parseUnits(amount, tokenDecimals)],
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
      <h3 className="text-lg font-semibold mb-2">Refund</h3>
      <p className="text-xs text-gray-500 mb-2">
        Max: {formatUnits(maxAmount, tokenDecimals)} {tokenSymbol}
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleRefund}
          disabled={isPending || isConfirming || !amount}
          className="rounded-lg bg-yellow-600 px-5 py-2 text-white font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Confirm..." : isConfirming ? "Refunding..." : "Refund"}
        </button>
      </div>
      {isSuccess && <p className="mt-2 text-sm text-green-400">Refunded!</p>}
    </div>
  );
}

function ClaimSection({
  campaignAddress,
  tokenDecimals,
  tokenSymbol,
  myInvestment,
  totalRaised,
  returnedAmount,
  myClaimed,
}: {
  campaignAddress: `0x${string}`;
  tokenDecimals: number;
  tokenSymbol: string;
  myInvestment: bigint;
  totalRaised: bigint;
  returnedAmount: bigint;
  myClaimed: bigint;
}) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const totalClaimable = (returnedAmount * myInvestment) / totalRaised;
  const claimable = totalClaimable - myClaimed;

  function handleClaim() {
    writeContract({
      address: campaignAddress,
      abi: CAMPAIGN_ABI,
      functionName: "claim",
    });
  }

  if (claimable <= 0n) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
      <h3 className="text-lg font-semibold mb-2">Claim Returned Funds</h3>
      <p className="text-sm text-gray-400 mb-3">
        You can claim {formatUnits(claimable, tokenDecimals)} {tokenSymbol}
      </p>
      <button
        onClick={handleClaim}
        disabled={isPending || isConfirming}
        className="rounded-lg bg-green-600 px-5 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isPending ? "Confirm..." : isConfirming ? "Claiming..." : "Claim"}
      </button>
      {isSuccess && <p className="mt-2 text-sm text-green-400">Claimed!</p>}
    </div>
  );
}

function WithdrawSection({ campaignAddress }: { campaignAddress: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleWithdraw() {
    writeContract({
      address: campaignAddress,
      abi: CAMPAIGN_ABI,
      functionName: "withdraw",
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
      <h3 className="text-lg font-semibold mb-2">Creator: Withdraw Funds</h3>
      <p className="text-sm text-gray-400 mb-3">
        Floor met. You can withdraw all raised funds.
      </p>
      <button
        onClick={handleWithdraw}
        disabled={isPending || isConfirming}
        className="rounded-lg bg-green-600 px-5 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isPending ? "Confirm..." : isConfirming ? "Withdrawing..." : "Withdraw"}
      </button>
      {isSuccess && <p className="mt-2 text-sm text-green-400">Withdrawn!</p>}
    </div>
  );
}

function ReturnFundsSection({
  campaignAddress,
  tokenAddress,
  tokenDecimals,
  tokenSymbol,
}: {
  campaignAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  tokenSymbol: string;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, campaignAddress] : undefined,
  });

  const {
    writeContract: approve,
    data: approveHash,
    isPending: approvePending,
  } = useWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: returnFunds,
    data: returnHash,
    isPending: returnPending,
  } = useWriteContract();
  const { isLoading: returnConfirming, isSuccess: returnSuccess } =
    useWaitForTransactionReceipt({ hash: returnHash });

  if (approveSuccess) {
    refetchAllowance();
  }

  const parsedAmount = amount ? parseUnits(amount, tokenDecimals) : 0n;
  const needsApproval = allowance !== undefined && parsedAmount > allowance;

  function handleApprove() {
    if (!parsedAmount) return;
    approve({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [campaignAddress, parsedAmount],
    });
  }

  function handleReturn() {
    if (!parsedAmount) return;
    returnFunds({
      address: campaignAddress,
      abi: CAMPAIGN_ABI,
      functionName: "returnFunds",
      args: [parsedAmount],
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-4">
      <h3 className="text-lg font-semibold mb-2">Creator: Return Funds</h3>
      <p className="text-sm text-gray-400 mb-3">
        Return funds to investors proportionally.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={`Amount in ${tokenSymbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={approvePending || approveConfirming || !amount}
            className="rounded-lg bg-yellow-600 px-5 py-2 text-white font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {approvePending ? "Confirm..." : approveConfirming ? "Approving..." : "Approve"}
          </button>
        ) : (
          <button
            onClick={handleReturn}
            disabled={returnPending || returnConfirming || !amount}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {returnPending ? "Confirm..." : returnConfirming ? "Returning..." : "Return"}
          </button>
        )}
      </div>
      {returnSuccess && <p className="mt-2 text-sm text-green-400">Funds returned!</p>}
    </div>
  );
}
