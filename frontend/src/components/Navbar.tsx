"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export function Navbar() {
  const { address } = useAccount();

  return (
    <nav className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white">
            FundRaiser
          </Link>
          <div className="flex gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              Campaigns
            </Link>
            <Link href="/create" className="text-gray-400 hover:text-white transition">
              Create
            </Link>
            {address && (
              <Link href={`/profile/${address}`} className="text-gray-400 hover:text-white transition">
                My Profile
              </Link>
            )}
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
