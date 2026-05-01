import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { data, updateFireSettings } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);

  // Financial settings
  const [fireExpenses, setFireExpenses] = useState("");
  const [fireReturnRate, setFireReturnRate] = useState("");
  const [fireTargetAge, setFireTargetAge] = useState("");
  const [fireLoading, setFireLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata || {};
      setFullName(metadata.full_name || "");
      setPhone(metadata.phone || "");
      setAvatarUrl(metadata.avatar_url || "");
    }
  }, [user]);

  useEffect(() => {
    setFireExpenses(String(data.fireSettings.monthlyExpenses));
    setFireReturnRate(String(data.fireSettings.returnRate));
    setFireTargetAge(String(data.fireSettings.currentAge));
  }, [data.fireSettings]);

  const getInitials = () => {
    if (!fullName) return user?.email?.charAt(0).toUpperCase() || "U";
    return fullName
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase();
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      if (!user?.id) throw new Error("User not found");
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage bucket 'avatars' not found. Please create it in your Supabase project first.");
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone, avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: "Success", description: "Profile picture updated successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone, avatar_url: avatarUrl },
      });
      if (error) throw error;
      toast({ title: "Success", description: "Profile updated successfully" });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangePwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast({ title: "Success", description: "Password updated successfully!" });
      setShowChangePw(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setChangePwLoading(false);
    }
  };

  const displayAmount = (raw: string) =>
    raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const handleFireSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFireLoading(true);
    try {
      const expenses = parseFloat(fireExpenses) || 0;
      const rate = parseFloat(fireReturnRate) || 0;
      const age = parseInt(fireTargetAge) || 0;
      await updateFireSettings({
        ...data.fireSettings,
        monthlyExpenses: expenses,
        returnRate: rate,
        currentAge: age,
        birthYear: new Date().getFullYear() - age,
      });
      toast({ title: "Success", description: "Financial settings saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setFireLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings</p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF (Max 5MB)</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleAvatarClick}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            {(() => {
              const dob = (user?.user_metadata as any)?.date_of_birth as string | undefined;
              const formatted = dob
                ? new Date(dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                : null;
              const age = dob
                ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                : null;
              return (
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted text-sm">
                    {formatted ? (
                      <>
                        <span>{formatted}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">Age: {age}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </div>
                </div>
              );
            })()}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              {isSaved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          {!showChangePw ? (
            <Button variant="outline" onClick={() => setShowChangePw(true)}>
              Change Password
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="currentPw">Current Password</Label>
                <Input
                  id="currentPw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPw">New Password</Label>
                <Input
                  id="newPw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPw">Confirm New Password</Label>
                <Input
                  id="confirmPw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={changePwLoading}>
                  {changePwLoading ? "Saving..." : "Save Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePw(false);
                    setCurrentPw(""); setNewPw(""); setConfirmPw("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFireSave} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="fireExpenses">Monthly Expenses (VND)</Label>
              <Input
                id="fireExpenses"
                type="text"
                value={displayAmount(fireExpenses)}
                onChange={(e) => setFireExpenses(e.target.value.replace(/\D/g, ""))}
                placeholder="14.000.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fireReturnRate">Expected Return Rate (%)</Label>
              <Input
                id="fireReturnRate"
                type="number"
                value={fireReturnRate}
                onChange={(e) => setFireReturnRate(e.target.value)}
                placeholder="10"
                min={1}
                max={30}
                step={0.5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fireTargetAge">Target Retirement Age</Label>
              <Input
                id="fireTargetAge"
                type="number"
                value={fireTargetAge}
                onChange={(e) => setFireTargetAge(e.target.value)}
                placeholder="45"
                min={20}
                max={80}
              />
            </div>
            <Button type="submit" disabled={fireLoading}>
              {fireLoading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
