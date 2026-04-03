import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  name: string;
  verificationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, verificationUrl }: VerificationEmailRequest = await req.json();

    console.log("Sending verification email to:", email);

    // Validate if API Key is set
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      throw new Error("Missing RESEND_API_KEY");
    }

    if (apiKey === "dummy_key_for_testing") {
      console.log("Mock Mode: Simulating email send to", email);
      return new Response(JSON.stringify({ id: "mock_id", message: "Mock email sent" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "ECC Security <onboarding@resend.dev>",
      to: [email],
      subject: "Verify your ECC Security Platform account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #0f172a;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 12px;
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #00ced1 0%, #00a8aa 100%);
                padding: 40px 20px;
                text-align: center;
              }
              .shield-icon {
                width: 60px;
                height: 60px;
                margin: 0 auto 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
              }
              .header h1 {
                color: #0f172a;
                margin: 0;
                font-size: 28px;
                font-weight: bold;
              }
              .content {
                padding: 40px 30px;
                background: #1e293b;
                color: #e2e8f0;
              }
              .content h2 {
                color: #00ced1;
                margin-top: 0;
                font-size: 24px;
              }
              .content p {
                color: #cbd5e1;
                margin: 16px 0;
                font-size: 16px;
              }
              .button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #00ced1 0%, #00a8aa 100%);
                color: #0f172a !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(0, 206, 209, 0.3);
              }
              .button:hover {
                background: linear-gradient(135deg, #00e6e9 0%, #00c8ca 100%);
              }
              .security-info {
                background: rgba(0, 206, 209, 0.1);
                border-left: 4px solid #00ced1;
                padding: 16px;
                margin: 24px 0;
                border-radius: 4px;
              }
              .security-info p {
                margin: 8px 0;
                font-size: 14px;
                color: #cbd5e1;
              }
              .footer {
                padding: 30px;
                text-align: center;
                color: #64748b;
                font-size: 14px;
                background: #0f172a;
              }
              .footer a {
                color: #00ced1;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="shield-icon">🛡️</div>
                <h1>ECC Security Platform</h1>
              </div>
              <div class="content">
                <h2>Welcome, ${name}!</h2>
                <p>Thank you for signing up for the ECC Security Platform. We're excited to have you on board!</p>
                <p>To complete your registration and activate your account with enhanced elliptic curve cryptography protection, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>

                <div class="security-info">
                  <p><strong>🔐 Security Notice:</strong></p>
                  <p>• This link will expire in 24 hours</p>
                  <p>• After verification, you can enable ECC-based multi-factor authentication</p>
                  <p>• Your account is protected with industry-leading cryptographic standards</p>
                </div>

                <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">
                  If you didn't create an account with us, please ignore this email or contact our support team.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 ECC Security Platform. All rights reserved.</p>
                <p>Protected by elliptic curve cryptography</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend API Error:", emailResponse.error);
      throw new Error(`Resend Error: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
