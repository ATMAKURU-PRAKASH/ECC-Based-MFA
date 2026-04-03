import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Key, CheckCircle, Lock, Unlock, Download, Copy, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { generateECCKeyPair, exportKey, hashData } from "@/lib/crypto";

interface MFASetupProps {
  userId: string;
  onStatusChange: (enabled: boolean) => void;
  currentStatus: boolean;
}

const MFASetup = ({ userId, onStatusChange, currentStatus }: MFASetupProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [eccKeys, setEccKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  const handleDownloadKey = () => {
    if (!eccKeys?.privateKey) return;
    const blob = new Blob([eccKeys.privateKey], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecc-private-key.txt";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const truncateKey = (key: string) => {
    if (key.length <= 25) return key;
    return `${key.slice(0, 10)}...${key.slice(-10)}`;
  };

  const handleEnableMFA = async (isRotation = false) => {
    setLoading(true);
    try {
      // Generate real ECC keys
      const keyPair = await generateECCKeyPair();
      const publicKey = await exportKey(keyPair.publicKey);
      const privateKey = await exportKey(keyPair.privateKey);
      
      setEccKeys({ publicKey, privateKey });

      // Generate backup codes
      const backupCodes = Array.from({ length: 6 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Hash backup codes before storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => hashData(code))
      );

      // Store MFA settings
      const { error } = await supabase.from("mfa_settings").upsert({
        user_id: userId,
        ecc_public_key: publicKey,
        ecc_private_key_encrypted: privateKey, // In production, encrypt this
        is_enabled: true,
        backup_codes: hashedBackupCodes,
      }, { onConflict: 'user_id' });

      if (error) throw error;

      // Log the action
      await supabase.from("auth_logs").insert({
        user_id: userId,
        action: isRotation ? "key_rotated" : "mfa_enabled",
        status: "success",
        metadata: { method: "ecc" }
      });

      setShowKeys(true);
      onStatusChange(true);

      // Send private key via email
      const { data: { user } } = await supabase.auth.getUser();
      let emailSent = false;
      if (user?.email) {
        try {
          const { error: funcError } = await supabase.functions.invoke("send-private-key", {
            body: {
              email: user.email,
              privateKey: privateKey,
            },
          });
          if (funcError) throw funcError;
          emailSent = true;
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          toast({
            title: "Email Delivery Failed",
            description: "Could not send the private key to your email. Please download it immediately.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: isRotation ? "Keys Rotated" : "MFA Enabled",
        description: emailSent 
          ? "New keys generated. Check your email for the key." 
          : "New keys generated. Please download your private key NOW.",
      });
    } catch (error: any) {
      toast({
        title: isRotation ? "Failed to rotate keys" : "Failed to enable MFA",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("mfa_settings")
        .update({ is_enabled: false })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the action
      await supabase.from("auth_logs").insert({
        user_id: userId,
        action: "mfa_disabled",
        status: "success",
        metadata: { method: "ecc" }
      });

      setShowKeys(false);
      setEccKeys(null);
      onStatusChange(false);

      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Failed to disable MFA",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!eccKeys?.privateKey) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const functionUrl = import.meta.env.VITE_RESEND_EMAIL_FUNCTION_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (user?.email) {
        // Using direct fetch to ensure we use the Anon Key just like the working CURL test
        // and to avoid any session/CORS complexity with the standard invoke wrapper for this specific function
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: user.email,
            subject: "Your ECC Private Key - Backup",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Your Private Key Backup</h1>
                <p>You requested a backup copy of your ECC Private Key.</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace;">
                  ${eccKeys.privateKey}
                </div>
                <p><strong>Keep this key safe!</strong> Do not share it with anyone.</p>
              </div>
            `
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Email send failed: ${errorData}`);
        }

        toast({
          title: "Email Sent",
          description: "Private key has been resent to your email.",
        });
      }
    } catch (error: any) {
      console.error("Resend Email Client Error:", error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to contact email service.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {currentStatus ? (
                <Lock className="w-6 h-6 text-primary" />
              ) : (
                <Unlock className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {currentStatus ? "MFA is Active" : "MFA is Inactive"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentStatus
                  ? "Your account is protected with ECC cryptography"
                  : "Enable ECC-based authentication for enhanced security"}
              </p>
            </div>
          </div>

          {currentStatus ? (
            <div className="flex gap-2">
              <Button
                onClick={handleDisableMFA}
                disabled={loading}
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Disable MFA
              </Button>
              <Button
                onClick={() => handleEnableMFA(true)}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                 <RefreshCw className="w-4 h-4" />
                 Rotate Keys
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleEnableMFA(false)}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating Keys...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Enable ECC MFA
                </div>
              )}
            </Button>
          )}
        </div>
      </div>

      {showKeys && eccKeys && (
        <Card className="p-6 bg-background border-border space-y-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <h4 className="font-semibold">ECC Keys Generated</h4>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadKey}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Key
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResendEmail}
                disabled={loading}
              >
                Resend Email
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-muted-foreground">Public Key:</p>
                <Button 
                   variant="ghost" 
                   size="xs" 
                   className="h-6 w-6 p-0" 
                   onClick={() => copyToClipboard(eccKeys.publicKey, "Public Key")}
                >
                   <Copy className="h-3 w-3" />
                </Button>
              </div>
              <code className="text-xs bg-card p-3 rounded block text-foreground border border-border font-mono">
                {truncateKey(eccKeys.publicKey)}
              </code>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-muted-foreground">Private Key (Store Securely):</p>
                <Button 
                   variant="ghost" 
                   size="xs" 
                   className="h-6 w-6 p-0" 
                   onClick={() => copyToClipboard(eccKeys.privateKey, "Private Key")}
                >
                   <Copy className="h-3 w-3" />
                </Button>
              </div>
              <code className="text-xs bg-card p-3 rounded block text-foreground border border-border font-mono">
                {truncateKey(eccKeys.privateKey)}
              </code>
            </div>
          </div>

          <div className="text-xs text-warning bg-warning/10 p-3 rounded border border-warning/20">
            <strong>Important:</strong> Store your private key securely. You will need to enter this private key to verify your identity during login. Keep it safe and never share it with anyone.
          </div>
        </Card>
      )}

      {currentStatus && (
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h4 className="font-semibold text-sm text-foreground mb-2">How ECC MFA Works:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Elliptic Curve Cryptography provides stronger security with smaller key sizes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Your authentication is protected by mathematical complexity of elliptic curves</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Each login attempt is verified using your unique ECC key pair</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MFASetup;
