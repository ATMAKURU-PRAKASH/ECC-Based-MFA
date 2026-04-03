import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogOut, Key, Activity, CheckCircle, XCircle } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import MFASetup from "@/components/MFASetup";
import SecurityLogs from "@/components/SecurityLogs";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        navigate("/auth");
      } else {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        setProfile(profileData);

        // Check MFA status
        const { data: mfaData } = await supabase
          .from("mfa_settings")
          .select("is_enabled")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        setMfaEnabled(mfaData?.is_enabled || false);
      }
      
      setLoading(false);
    };

    getSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (session) {
      await supabase.from("auth_logs").insert({
        user_id: session.user.id,
        action: "logout",
        status: "success",
        metadata: { method: "manual" }
      });
    }

    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been securely logged out",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-foreground">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>Loading secure environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">ECC Security Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name || profile?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-border hover:border-primary hover:text-primary transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-card/80 backdrop-blur border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Authentication</p>
                <p className="text-2xl font-bold text-foreground mt-1">Active</p>
              </div>
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MFA Status</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {mfaEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              {mfaEnabled ? (
                <CheckCircle className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-warning" />
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security Level</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {mfaEnabled ? "High" : "Medium"}
                </p>
              </div>
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </Card>
        </div>

        {/* MFA Setup */}
        <Card className="bg-card/80 backdrop-blur border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Multi-Factor Authentication
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              ECC-based cryptographic authentication for enhanced security
            </p>
          </div>
          <div className="p-6">
            <MFASetup 
              userId={session?.user.id || ""} 
              onStatusChange={setMfaEnabled}
              currentStatus={mfaEnabled}
            />
          </div>
        </Card>

        {/* Security Logs */}
        <Card className="bg-card/80 backdrop-blur border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Authentication Activity
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Monitor your authentication events and security logs
            </p>
          </div>
          <div className="p-6">
            <SecurityLogs userId={session?.user.id || ""} />
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
