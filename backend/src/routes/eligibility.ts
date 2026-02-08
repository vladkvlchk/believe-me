import { Router, Request, Response } from "express";
import { getTwitterScore, setMockScore } from "../services/twitterScore";
import { isEligibleOnChain, whitelistWallet } from "../services/contract";
import { config } from "../config";

const router = Router();

// GET /api/eligibility/:wallet — check TwitterScore and onchain whitelist
router.get("/:wallet", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const score = getTwitterScore(wallet);
    const isWhitelisted = await isEligibleOnChain(wallet);

    res.json({
      wallet,
      twitterScore: score,
      threshold: config.twitterScoreThreshold,
      eligible: score >= config.twitterScoreThreshold,
      whitelisted: isWhitelisted,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/eligibility/whitelist — admin: check score and whitelist if eligible
router.post("/whitelist", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body;
    if (!wallet) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    const score = getTwitterScore(wallet);
    if (score < config.twitterScoreThreshold) {
      res.status(403).json({
        error: "TwitterScore too low",
        score,
        threshold: config.twitterScoreThreshold,
      });
      return;
    }

    const txHash = await whitelistWallet(wallet);
    res.json({ wallet, whitelisted: true, txHash });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/eligibility/mock — set a mock score for testing
router.post("/mock", (req: Request, res: Response) => {
  const { wallet, score } = req.body;
  if (!wallet || score === undefined) {
    res.status(400).json({ error: "wallet and score required" });
    return;
  }
  setMockScore(wallet, score);
  res.json({ wallet, score, set: true });
});

export default router;
