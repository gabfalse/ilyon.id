import { switchAccountMode } from "../services/accountMode.service.js";

// ==========================================
// SWITCH ACCOUNT MODE
// ==========================================

export async function switchAccountModeController(req, res, next) {
  try {
    const { activeMode } = req.body;

    const result = await switchAccountMode(req.user.id, activeMode, {
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        activeMode: result.activeMode,
        activeRole: result.activeRole,
      },
    });
  } catch (error) {
    return next(error);
  }
}
