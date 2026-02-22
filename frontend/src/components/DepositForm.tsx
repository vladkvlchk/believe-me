"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CAMPAIGN_ABI, ERC20_ABI } from "@/lib/abi";

interface Props {
  campaignAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
}

export function DepositForm({ campaignAddress, tokenAddress, tokenSymbol, tokenDecimals }: Props) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

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
    useWaitForTransactionReceipt({
      hash: approveHash,
      query: {
        enabled: !!approveHash,
      },
    });

  const {
    writeContract: deposit,
    data: depositHash,
    isPending: depositPending,
  } = useWriteContract();
  const { isLoading: depositConfirming, isSuccess: depositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
      query: {
        enabled: !!depositHash,
      },
    });

  if (approveSuccess && allowance !== undefined) {
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

  function handleDeposit() {
    if (!parsedAmount) return;
    deposit({
      address: campaignAddress,
      abi: CAMPAIGN_ABI,
      functionName: "deposit",
      args: [parsedAmount],
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-lg font-semibold text-white mb-3">Deposit</h3>

      {balance !== undefined && (
        <p className="text-xs text-gray-500 mb-2">
          Balance: {formatUnits(balance, tokenDecimals)} {tokenSymbol}
        </p>
      )}

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
            onClick={handleDeposit}
            disabled={depositPending || depositConfirming || !amount}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {depositPending ? "Confirm..." : depositConfirming ? "Depositing..." : "Deposit"}
          </button>
        )}
      </div>

      {allowance !== undefined && (
        <p className="text-xs text-gray-500 mt-1">
          Allowance: {formatUnits(allowance, tokenDecimals)} {tokenSymbol}
        </p>
      )}

      {depositSuccess && (
        <p className="mt-2 text-sm text-green-400">Deposited successfully!</p>
      )}
    </div>
  );
}
