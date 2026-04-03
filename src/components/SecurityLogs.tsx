import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Shield, LogIn, LogOut, Key, AlertCircle } from "lucide-react";

interface SecurityLogsProps {
  userId: string;
}

interface AuthLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
  metadata: any;
}

const SecurityLogs = ({ userId }: SecurityLogsProps) => {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("auth_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn className="w-4 h-4 text-success" />;
      case "logout":
        return <LogOut className="w-4 h-4 text-muted-foreground" />;
      case "mfa_enabled":
      case "mfa_disabled":
        return <Key className="w-4 h-4 text-primary" />;
      default:
        return <Shield className="w-4 h-4 text-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === "success" ? "text-success" : "text-destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>Loading activity logs...</span>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No authentication activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border">
            {getActionIcon(log.action)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground capitalize">
                {log.action.replace("_", " ")}
              </p>
              <span className={`text-xs font-semibold ${getStatusColor(log.status)}`}>
                {log.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(log.created_at), "MMM dd, yyyy 'at' hh:mm a")}
            </p>
            {log.metadata && (
              <p className="text-xs text-muted-foreground mt-1">
                Method: {log.metadata.method || "unknown"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SecurityLogs;
