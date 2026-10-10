import { consumeLoginOtp, revokeLoginOtp, storeLoginOtp } from "./login-store.js";
import { createOtpHandlers } from "./otp-handlers.js";
import { sendOtpEmail } from "./send-otp-email.js";

export const otpHandlers = createOtpHandlers({
  storeOtp: storeLoginOtp,
  consumeOtp: consumeLoginOtp,
  revokeOtp: revokeLoginOtp,
  sendOtp: sendOtpEmail,
});