import { Request, Response } from "express";
import { IdentityService } from "../service/IdentityService";

const identityService = new IdentityService();

export async function identifyController(req: Request, res: Response) {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "At least one of email or phoneNumber is required." });
    }

    const result = await identityService.identify({
      email: email ?? null,
      phoneNumber: phoneNumber ? String(phoneNumber) : null,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}