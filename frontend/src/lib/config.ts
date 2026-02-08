import { http, createConfig } from "wagmi";
import { hardhat, base } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  ("0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`); // default hardhat deploy address

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const STATUS_LABELS = ["Active", "Successful", "Failed", "Rugged"] as const;
export const STATUS_COLORS = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500"];

export const wagmiConfig = getDefaultConfig({
  appName: "Onchain Fundraiser",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo-project-id",
  chains: [hardhat, base],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [base.id]: http(),
  },
  ssr: true,
});
