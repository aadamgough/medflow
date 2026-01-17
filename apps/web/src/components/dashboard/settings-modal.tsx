"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeSelect } from "@/components/custom";
import { useTheme } from "@/lib/theme";
import {
  getToken,
  getUser,
  setUser as saveUser,
  refreshToken as apiRefreshToken,
  logout,
  uploadProfilePicture,
  type User,
} from "@/lib/api";
import {
  Shield,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  AlertTriangle,
  User as UserIcon,
  X,
  LogOut,
  Camera,
} from "lucide-react";

const API_ACCESS_KEY = "medflow_api_access_enabled";

type SettingsSection = "general" | "security" | "api-keys";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(API_ACCESS_KEY);
      setApiAccessEnabled(stored === "true");

      // Get user from API helper (profile picture URL is stored in the user object)
      const currentUser = getUser();
      console.log("Settings Modal - Current User:", currentUser);
      setUser(currentUser);
    }
  }, [open]);

  const handleApiAccessChange = (enabled: boolean) => {
    setApiAccessEnabled(enabled);
    localStorage.setItem(API_ACCESS_KEY, enabled.toString());
  };

  const handleRevealToken = () => {
    const token = getToken();
    if (token) {
      setTokenValue(token);
      setTokenRevealed(true);
    }
  };

  const handleCopyToken = async () => {
    if (tokenValue) {
      await navigator.clipboard.writeText(tokenValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateToken = async () => {
    setIsRegenerating(true);
    try {
      const result = await apiRefreshToken();
      setTokenValue(result.token);
      setTokenRevealed(true);
    } catch (error) {
      console.error("Failed to regenerate token:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSignOut = () => {
    logout();
    onOpenChange(false);
    router.push("/login");
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB");
      return;
    }

    setIsUploadingPicture(true);
    try {
      // Upload to the API/Supabase
      const response = await uploadProfilePicture(file);
      
      // Update local state with the new profile picture URL from Supabase
      if (response.user) {
        setUser(response.user);
        // Also update the stored user in localStorage
        saveUser(response.user);
      }
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploadingPicture(false);
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const maskToken = (token: string) => {
    if (token.length <= 20) return "••••••••••••••••••••";
    return token.slice(0, 10) + "••••••••••••••••" + token.slice(-6);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTokenRevealed(false);
      setTokenValue(null);
      setCopied(false);
      setActiveSection("general");
    }
    onOpenChange(newOpen);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const sidebarSections = [
    {
      title: "Account",
      items: [{ id: "general" as const, label: "General", icon: UserIcon }],
    },
    {
      title: "Security",
      items: [
        { id: "security" as const, label: "API Access", icon: Shield },
        { id: "api-keys" as const, label: "API Keys", icon: Key },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="!max-w-[1100px] w-[1100px] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        
        <div className="flex h-[750px]">
          {/* Settings Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
            <div className="px-6 py-5 font-semibold text-base border-b border-border">
              Settings
            </div>

            <nav className="flex-1 px-4 py-6 space-y-7">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {section.title}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${
                            activeSection === item.id
                              ? "bg-secondary text-secondary-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Sign Out Button at bottom of sidebar */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-12 py-6">
              <h2 className="font-semibold text-base">
                {activeSection === "general" && "General"}
                {activeSection === "security" && "API Access"}
                {activeSection === "api-keys" && "API Keys"}
              </h2>
              <button
                onClick={() => handleOpenChange(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-12 py-6">
              {/* General Section */}
              {activeSection === "general" && (
                <div className="space-y-8 max-w-2xl">
                  {/* User Profile */}
                  <div className="flex items-center gap-5">
                    <div className="relative group">
                      {user?.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt="Profile"
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-lg">
                          {user ? getInitials(user.name, user.email) : "?"}
                        </div>
                      )}
                      <button
                        onClick={handleProfilePictureClick}
                        disabled={isUploadingPicture}
                        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2.5 text-base">
                        {user?.name || "User"}
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {user?.email || "No email"}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Theme Setting */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-medium">Theme</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Select your preferred color scheme for the interface
                      </p>
                    </div>
                    <ThemeSelect
                      value={theme}
                      onValueChange={setTheme}
                      className="w-[220px]"
                    />
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <div className="space-y-10 max-w-3xl">
                  <div className="flex items-start justify-between gap-12">
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-base font-medium">
                        Allow API access to your data
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        External applications can interact with your patient
                        data when enabled.
                      </p>
                    </div>
                    <Switch
                      checked={apiAccessEnabled}
                      onCheckedChange={handleApiAccessChange}
                    />
                  </div>
                </div>
              )}

              {/* API Keys Section */}
              {activeSection === "api-keys" && (
                <div className="space-y-8 max-w-3xl">
                  <div className="space-y-2">
                    <h4 className="text-base font-medium">Access Token</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Use this token to authenticate API requests from external
                      applications.
                    </p>
                  </div>

            

                  {/* Token Display */}
                  <div className="space-y-5">
                    <div className="p-5 rounded-lg bg-muted border border-border font-mono text-sm min-h-[90px] flex items-center">
                      {tokenRevealed && tokenValue ? (
                        <div className="break-all leading-relaxed">{tokenValue}</div>
                      ) : (
                        <div className="text-muted-foreground">
                          {getToken()
                            ? maskToken(getToken()!)
                            : "No token available"}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {!tokenRevealed ? (
                        <Button
                          onClick={handleRevealToken}
                          variant="outline"
                          className="flex-1"
                          size="lg"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Reveal Token
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCopyToken}
                          variant="outline"
                          className="flex-1"
                          size="lg"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Token
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={handleRegenerateToken}
                        variant="secondary"
                        disabled={isRegenerating}
                        className="flex-1"
                        size="lg"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`}
                        />
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                      </Button>
                    </div>

                    {tokenRevealed && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Token revealed. Make sure to copy it now — it won&apos;t
                        be shown again.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
