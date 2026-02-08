import express from "express";
import cors from "cors";
import { config } from "./config";
import { initContract } from "./services/contract";
import eligibilityRoutes from "./routes/eligibility";
import campaignRoutes from "./routes/campaigns";
import reputationRoutes from "./routes/reputation";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", contractAddress: config.contractAddress });
});

// Routes
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/reputation", reputationRoutes);

// Init contract connection and start server
try {
  initContract();
  console.log("Contract service initialized");
} catch (err) {
  console.warn("Contract service not initialized (set CONTRACT_ADDRESS and RPC_URL):", err);
}

app.listen(config.port, () => {
  console.log(`Backend API running on http://localhost:${config.port}`);
});
