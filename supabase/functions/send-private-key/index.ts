import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrivateKeyEmailRequest {
  email: string;
  privateKey: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, privateKey }: PrivateKeyEmailRequest = await req.json();

    console.log("Sending private key email to:", email);

    // Validate if API Key is set
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      throw new Error("Missing RESEND_API_KEY");
    }

    if (apiKey === "dummy_key_for_testing") {
      console.log("Mock Mode: Simulating email send to", email);
      return new Response(JSON.stringify({ id: "mock_id", message: "Mock email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const emailResponse = await resend.emails.send({
      from: "ECC Security <onboarding@resend.dev>",
      to: [email],
      subject: "Your ECC Private Key - IMPORTANT",
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
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background-color: rgba(15, 23, 42, 0.6);
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .content {
                padding: 40px 30px;
                color: #e2e8f0;
              }
              .key-box {
                background-color: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                font-family: monospace;
                word-break: break-all;
                color: #00ced1;
              }
              .warning {
                background-color: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                color: #fca5a5;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                font-size: 0.9em;
              }
              .footer {
                background-color: rgba(15, 23, 42, 0.8);
                padding: 20px;
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="color: #00ced1; margin: 0;">ECC Cloud Guard</h1>
              </div>
              <div class="content">
                <h2 style="color: #f8fafc; margin-top: 0;">Your Private Key</h2>
                <p>Here is the ECC Private Key you generated. You will need this key to verify your identity when logging in.</p>
                
                <div class="key-box">
                  ${privateKey}
                </div>

                <div class="warning">
                  <strong>⚠️ SECURITY WARNING:</strong>
                  <br>
                  This key provides access to your account. Never share it with anyone.
                  We recommend deleting this email after you have securely stored your key.
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ECC Cloud Guard. All rights reserved.</p>
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
};

serve(handler);
