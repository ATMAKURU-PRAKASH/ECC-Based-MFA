import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,206,209,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,206,209,0.1),transparent_50%)]" />
      
      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-3xl animate-pulse" />
              <Shield className="w-24 h-24 text-primary relative z-10" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              ECC-Based Authentication
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              Enhanced Multi-Factor Security for Cloud Computing
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-6 shadow-lg hover:shadow-primary/50 transition-all"
            >
              <Lock className="w-5 h-5 mr-2" />
              Get Started
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              variant="outline"
              className="border-border hover:border-primary hover:text-primary text-lg px-8 py-6 transition-all"
            >
              Learn More
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Elliptic Curve Cryptography
              </h3>
              <p className="text-sm text-muted-foreground">
                Advanced mathematical security with smaller key sizes and superior protection
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Lightning Fast
              </h3>
              <p className="text-sm text-muted-foreground">
                Optimized authentication flow with minimal latency for seamless user experience
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Cloud-Ready
              </h3>
              <p className="text-sm text-muted-foreground">
                Built specifically for cloud computing environments with distributed architecture
              </p>
            </div>
          </div>

          {/* Technical Info */}
          <div className="mt-20 p-6 bg-card/50 backdrop-blur border border-border rounded-xl text-left animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Why ECC for Multi-Factor Authentication?
            </h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-foreground">Stronger Security:</strong> ECC provides equivalent security to RSA with much smaller key sizes (256-bit ECC ≈ 3072-bit RSA)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-foreground">Better Performance:</strong> Faster computation and reduced bandwidth requirements in cloud environments
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-foreground">Future-Proof:</strong> Resistant to quantum computing attacks when using appropriate curve parameters
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
