"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Share2, Copy, Trash2, Plus, Link2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Share = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
};

export function ShareDialog({ docId }: { docId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState("VIEWER");
  const [copied, setCopied] = useState(false);

  const fetchShares = useCallback(async () => {
    const res = await fetch(`/api/documents/${docId}/shares`);
    if (res.ok) {
      const data = await res.json();
      setShares(data);
    }
  }, [docId]);

  const fetchLink = useCallback(async () => {
    // Link state is managed locally; no dedicated GET endpoint for links
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchShares();
      fetchLink();
    }
  }, [open, fetchShares, fetchLink]);

  async function handleAddShare() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${docId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to share");
      } else {
        setEmail("");
        toast.success("Document shared");
        fetchShares();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    const res = await fetch(`/api/documents/${docId}/shares/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast.success("Role updated");
      fetchShares();
    } else {
      toast.error("Failed to update role");
    }
  }

  async function handleRemoveShare(userId: string) {
    const res = await fetch(`/api/documents/${docId}/shares/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Share removed");
      fetchShares();
    } else {
      toast.error("Failed to remove share");
    }
  }

  async function handleCreateLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, role: linkRole }),
      });
      if (res.ok) {
        const { token } = await res.json();
        setLinkToken(token);
        setCopied(false);
        toast.success("Share link created");
      } else {
        toast.error("Failed to create link");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeLink() {
    if (!linkToken) return;
    const res = await fetch(`/api/share-links/${linkToken}`, { method: "DELETE" });
    if (res.ok) {
      setLinkToken(null);
      toast.success("Link revoked");
    } else {
      toast.error("Failed to revoke link");
    }
  }

  function handleCopyLink() {
    if (!linkToken) return;
    const url = `${window.location.origin}/share/${linkToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:translate-y-px">
          <Share2 className="size-4" />
          Share
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add share */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">
              Add people by email
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="bob@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddShare();
                }}
                className="flex-1"
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="COMMENTER">Commenter</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="icon"
                onClick={handleAddShare}
                disabled={loading || !email.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500">
                People with access
              </label>
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-black">
                      {share.user.name || share.user.email}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {share.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={share.role}
                      onValueChange={(v) =>
                        handleUpdateRole(share.user.id, v)
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                        <SelectItem value="COMMENTER">Commenter</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => handleRemoveShare(share.user.id)}
                      className="text-zinc-400 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Share link */}
          <div className="space-y-2 border-t border-zinc-200 pt-4">
            <label className="text-sm font-medium text-zinc-500">
              Share link
            </label>
            {linkToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <Link2 className="size-4 shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate text-xs text-zinc-600">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/share/${linkToken}`
                      : `/share/${linkToken}`}
                  </span>
                  <Badge variant="secondary">
                    {linkRole.charAt(0) + linkRole.slice(1).toLowerCase()}
                  </Badge>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 text-zinc-600 transition-colors hover:text-black"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleRevokeLink}
                  className="text-xs text-red-600 hover:underline"
                >
                  Revoke link
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={linkRole} onValueChange={setLinkRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                    <SelectItem value="COMMENTER">Commenter</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleCreateLink}
                  disabled={loading}
                >
                  <Link2 className="size-4" />
                  Create link
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
