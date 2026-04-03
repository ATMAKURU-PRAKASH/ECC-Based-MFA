import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, KeyRound, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if MFA is enabled
        const { data: mfaData } = await supabase
          .from("mfa_settings")
          .select("is_enabled")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (mfaData?.is_enabled) {
          navigate("/ecc-verification");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Log authentication attempt
        if (data.user) {
          await supabase.from("auth_logs").insert({
            user_id: data.user.id,
            action: "login",
            status: "success",
            metadata: { method: "password" }
          });

          // Check if MFA is enabled
          const { data: mfaData } = await supabase
            .from("mfa_settings")
            .select("is_enabled")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (mfaData?.is_enabled) {
            // Redirect to ECC verification
            toast({
              title: "Password verified",
              description: "Please complete ECC verification",
            });
            navigate("/ecc-verification");
          } else {
            toast({
              title: "Login successful",
              description: "Welcome back to the ECC Authentication System",
            });
            navigate("/dashboard");
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        // Send verification email via edge function
        try {
          await supabase.functions.invoke("send-verification-email", {
            body: {
              email,
              name: fullName || email,
              verificationUrl: `${window.location.origin}/auth?verified=true`,
            },
          });

          toast({
            title: "Verification email sent",
            description: "Please check your email to verify your account",
          });
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          toast({
            title: "Account created",
            description: "Please check your email for verification link",
          });
        }

        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                ECC Security Platform
              </h1>
              <p className="text-muted-foreground mt-2">
                Enhanced multi-factor authentication for cloud computing
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="bg-background border-border focus:border-primary transition-colors"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-background border-border focus:border-primary transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-primary/50 transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                  {isLogin ? "Sign In" : "Create Account"}
                </div>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
            <Shield className="w-4 h-4 text-primary" />
            <span>Protected by elliptic curve cryptography</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
