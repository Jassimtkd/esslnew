export async function sendOtpEmail(email, code) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL,
      to: [email],
      subject: "Your ESSL dashboard sign-in code",
      text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
      html: `<p>Your ESSL dashboard sign-in code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request it, ignore this email.</p>`,
    }),
  });

  if (!response.ok) throw new Error("Unable to send sign-in email");
}