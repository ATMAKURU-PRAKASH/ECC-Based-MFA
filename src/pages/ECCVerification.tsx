import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, AlertCircle, CheckCircle, Download, Copy, Mail, LogOut } from "lucide-react";
import { importPrivateKey, signData, importPublicKey, verifySignature } from "@/lib/crypto";

const ECCVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const [mfaSettings, setMfaSettings] = useState<any>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    checkAuthAndMFA();
  }, []);

  const checkAuthAndMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserEmail(session.user.email || "");

    // Fetch MFA settings
    const { data: mfaData, error } = await supabase
      .from("mfa_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching MFA:", error);
      return;
    }

    if (!mfaData || !mfaData.is_enabled) {
      // MFA not enabled, redirect to dashboard
      navigate("/dashboard");
      return;
    }

    setMfaSettings(mfaData);
    // Generate a random challenge
    const randomChallenge = Math.random().toString(36).substring(2, 15);
    setChallenge(randomChallenge);
  };

  const verifyECCKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!mfaSettings) {
        throw new Error("MFA settings not found");
      }

      // Cryptographic Verification:
      // 1. Import the user's private key
      // 2. Sign the challenge with the private key
      // 3. Verify the signature using the stored public key
      
      let isValid = false;
      try {
        // Clean the private key (remove spaces/newlines)
        const cleanKey = privateKey.trim().replace(/[\n\r\s]/g, '');
        
        if (!cleanKey) {
             throw new Error("Private key is empty");
        }

        const userPrivateKey = await importPrivateKey(cleanKey);
        const signature = await signData(userPrivateKey, challenge);
        const storedPublicKey = await importPublicKey(mfaSettings.ecc_public_key);
        isValid = await verifySignature(storedPublicKey, signature, challenge);
      } catch (cryptoError: any) {
        console.error("Crypto error:", cryptoError);
        if (cryptoError.message === "Private key is empty") {
            throw new Error("Please enter your private key.");
        }
        throw new Error("Invalid Private Key format. Please Ensure you copied the entire key correctly.");
      }

      if (!isValid) {
        throw new Error("Invalid ECC private key signature");
      }

      // Log successful verification
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("auth_logs").insert({
          user_id: session.user.id,
          action: "mfa_verified",
          status: "success",
          metadata: { 
            method: "ecc",
            challenge: challenge 
          }
        });
      }

      toast({
        title: "Verification successful",
        description: "ECC authentication verified successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      // Log failed verification
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("auth_logs").insert({
          user_id: session.user.id,
          action: "mfa_verification_failed",
          status: "failed",
          metadata: { 
            method: "ecc",
            challenge: challenge,
            error: error.message
          }
        });
      }

      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLostKey = async () => {
    setLoading(true);
    setShowRecovery(true);
    try {
      if (!mfaSettings || !mfaSettings.ecc_private_key_encrypted) {
        throw new Error("Could not retrieve key information.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const functionUrl = import.meta.env.VITE_RESEND_EMAIL_FUNCTION_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (user?.email) {
          // Using direct fetch for reliability with Anon Key
          const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${anonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: user.email,
              subject: "Your ECC Private Key - Recovery",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1>Your Private Key Recovery</h1>
                  <p>You requested a copy of your ECC Private Key.</p>
                  <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace;">
                    ${mfaSettings.ecc_private_key_encrypted}
                  </div>
                  <p><strong>Keep this key safe!</strong> Do not share it with anyone.</p>
                </div>
              `
            }),
          });
          
          if (!response.ok) {
             const errorData = await response.text();
             console.error("Edge Function Error:", errorData);
             throw new Error(`Could not send email: ${errorData}`);
          }
          
          toast({
            title: "Private Key Sent",
            description: "Your private key has been sent to your registered email address.",
          });
      }
    } catch (error: any) {
      // Even if email fails, we've revealed the manual options
      console.error("Lost Key Error:", error);
      toast({
        title: "Manual Recovery Enabled",
        description: `Email delivery failed: ${error.message}. You can now Download or Copy your key.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKey = () => {
    if (!mfaSettings?.ecc_private_key_encrypted) return;
    const blob = new Blob([mfaSettings.ecc_private_key_encrypted], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecc-private-key-recovery.txt";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCopyKey = () => {
     if (!mfaSettings?.ecc_private_key_encrypted) return;
     navigator.clipboard.writeText(mfaSettings.ecc_private_key_encrypted);
     toast({
       title: "Copied",
       description: "Private key copied to clipboard",
     });
  };

  const handleUseBackupCode = () => {
    toast({
      title: "Backup codes",
      description: "Contact administrator if you've lost your ECC keys",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,206,209,0.1),transparent_50%)]" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-700" />

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border relative z-10 shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Shield className="w-16 h-16 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-xl" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                ECC Verification Required
              </h1>
              <p className="text-muted-foreground mt-2">
                Verify your identity using your ECC private key
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Logged in as: <span className="text-primary">{userEmail}</span>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-destructive h-auto p-0 hover:bg-transparent"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Challenge Display */}
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold text-foreground">Challenge Code:</Label>
            </div>
            <code className="text-xs bg-card p-3 rounded block break-all text-foreground border border-border font-mono">
              {challenge}
            </code>
          </div>

          <form onSubmit={verifyECCKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privateKey" className="text-foreground">
                ECC Private Key
              </Label>
              <Input
                id="privateKey"
                type="password"
                placeholder="Enter your ECC private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                required
                className="bg-background border-border focus:border-primary transition-colors font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the private key you received when you enabled MFA
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-primary/50 transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Verify Identity
                </div>
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            {!showRecovery ? (
              <button
                onClick={handleLostKey}
                disabled={loading}
                className="text-sm text-primary hover:text-primary/80 transition-colors block w-full flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Lost your key? Send it to my email
              </button>
            ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 p-4 bg-muted/50 rounded-lg border border-border">
                   <p className="text-sm font-semibold text-foreground">Recovery Options:</p>
                   <div className="flex gap-2 justify-center">
                     <Button variant="outline" size="sm" onClick={handleDownloadKey} className="gap-2">
                       <Download className="w-4 h-4" /> Download
                     </Button>
                     <Button variant="outline" size="sm" onClick={handleCopyKey} className="gap-2">
                       <Copy className="w-4 h-4" /> Copy
                     </Button>
                      <Button variant="outline" size="sm" onClick={handleLostKey} disabled={loading} className="gap-2">
                       <Mail className="w-4 h-4" /> Resend
                     </Button>
                   </div>
                </div>
            )}
            
            <button
              onClick={handleUseBackupCode}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full mt-2"
            >
              Have backup codes? Use them here
            </button>
          </div>

          <div className="flex items-start gap-3 text-xs text-muted-foreground pt-4 border-t border-border bg-warning/5 p-3 rounded">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Security Notice</p>
              <p>This verification ensures you have access to your ECC private key. Never share your private key with anyone.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ECCVerification;
