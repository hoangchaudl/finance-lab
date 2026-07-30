import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Copy, CheckCircle2, Loader2, Unlink } from "lucide-react";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function TelegramConnect() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("telegram_links")
        .select("telegram_chat_id, link_code")
        .eq("user_id", user.id)
        .maybeSingle();
      setConnected(!!data?.telegram_chat_id);
      setCode(data?.link_code ?? null);
    } catch (e) {
      console.error("Failed to load Telegram link status:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while a code is waiting to be claimed, so the card flips to
  // "Connected" without a manual refresh.
  useEffect(() => {
    if (!code || connected) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [code, connected, refresh]);

  const handleGenerate = async () => {
    if (!user) return;
    setWorking(true);
    try {
      const newCode = generateCode();
      const { error } = await supabase.from("telegram_links").upsert({
        user_id: user.id,
        link_code: newCode,
        telegram_chat_id: null,
        linked_at: null,
      });
      if (error) throw error;
      setCode(newCode);
      setConnected(false);
    } catch (e) {
      console.error("Failed to generate Telegram link code:", e);
      toast({
        title: "Could not generate code",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setWorking(true);
    try {
      const { error } = await supabase
        .from("telegram_links")
        .update({ telegram_chat_id: null, link_code: null, linked_at: null })
        .eq("user_id", user.id);
      if (error) throw error;
      setConnected(false);
      setCode(null);
      toast({ title: "Telegram disconnected" });
    } catch (e) {
      console.error("Failed to disconnect Telegram:", e);
      toast({
        title: "Could not disconnect",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/link ${code}`);
      toast({ title: "Copied", description: `/link ${code}` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Telegram Logging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : connected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Connected — log expenses by texting the bot, e.g.{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">50k coffee cf sua</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={working}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </>
        ) : code ? (
          <>
            <p className="text-sm text-muted-foreground">
              Send this command to the bot to finish linking:
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-3 py-2 rounded-md font-mono text-base">
                /link {code}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {BOT_USERNAME && (
                <Button asChild size="sm">
                  <a
                    href={`https://t.me/${BOT_USERNAME}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open @{BOT_USERNAME}
                  </a>
                </Button>
              )}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for you to send it…
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Log expenses and investments by texting a Telegram bot — no need
              to open the app.
            </p>
            <Button onClick={handleGenerate} disabled={working}>
              {working ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Connect Telegram
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
