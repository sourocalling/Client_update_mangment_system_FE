"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Inputs";
import { useGitlabConnection, type GitlabConnection } from "@/lib/gitlab";

function GitlabMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21 3 12l2.3-7.1h3l2.4 7.1H13l2.4-7.1h3L20.9 12 12 21z"
        fill="#FC6D26"
      />
      <path d="M12 21 8.7 12H15.3L12 21z" fill="#E24329" />
      <path d="M12 21 3 12h5.7L12 21z" fill="#FCA326" />
      <path d="m3 12 2.3-7.1L8.7 12H3z" fill="#E24329" />
      <path d="M12 21 21 12h-5.7L12 21z" fill="#FCA326" />
      <path d="m21 12-2.3-7.1L15.3 12H21z" fill="#E24329" />
    </svg>
  );
}

export function GitlabConnectModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connection, connect, disconnect } = useGitlabConnection();
  const [url, setUrl] = useState("https://gitlab.webskitters.com");
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = !error
    ? null
    : error === "invalid_token"
      ? "GitLab rejected this token. Make sure you copied the whole glpat-… string (no spaces or newlines) and that the instance URL matches where the token was created."
      : error === "token_expired"
        ? "This token has expired. Create a new one in GitLab and paste it here."
        : error === "token_revoked"
          ? "This token has been revoked. Create a new one in GitLab and paste it here."
          : error === "forbidden"
            ? "Token lacks permission. Recreate it with the read_user and read_api scopes."
            : error === "unreachable"
              ? "Couldn't reach that GitLab instance. Verify the URL (no trailing slash, with https://)."
              : error === "network_error"
                ? "Network error — check your connection. If this is a self-hosted GitLab, CORS may be blocking browser requests."
                : error.startsWith("gitlab: ")
                  ? `GitLab says: ${error.slice("gitlab: ".length)}`
                  : "GitLab request failed. Please try again.";

  const handleConnect = async () => {
    const cleaned = token.replace(/\s+/g, "");
    if (!cleaned) {
      setError("invalid_token");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await connect(url, cleaned);
      setToken("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "gitlab_error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setToken("");
    setError(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect GitLab"
      description="Link your GitLab account to enrich updates with commits, merge requests, and issues."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {connection ? (
            <Button variant="danger" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnect}
              isLoading={isSubmitting}
              disabled={isSubmitting || !token.trim()}
            >
              Connect
            </Button>
          )}
        </div>
      }
    >
      {connection ? (
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-inset ring-orange-100">
            <GitlabMark className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <ConnectedSummary connection={connection} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="GitLab instance URL" hint="Default: gitlab.webskitters.com">
            <TextInput
              type="url"
              autoComplete="url"
              placeholder="https://gitlab.webskitters.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <Field
            label="Personal access token"
            hint="Scopes: read_user, read_api"
          >
            <TextInput
              type="password"
              autoComplete="off"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleConnect();
                }
              }}
            />
          </Field>

          {errorText ? (
            <InlineMessage variant="danger" role="alert">
              {errorText}
            </InlineMessage>
          ) : null}

          <p className="text-[11px] leading-5 text-slate-500">
            Your token is stored locally in this browser and only sent directly to your GitLab
            instance — it never touches our backend.
          </p>
        </div>
      )}
    </Modal>
  );
}

function ConnectedSummary({ connection }: { connection: GitlabConnection }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
        Connected
      </div>
      <div className="mt-1 flex items-center gap-3">
        {connection.user.avatar_url ? (
          <img
            src={connection.user.avatar_url}
            alt={connection.user.name}
            className="h-10 w-10 rounded-full border border-slate-200"
          />
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {connection.user.name}
          </div>
          <a
            href={connection.user.web_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-sky-700 hover:text-sky-800 hover:underline"
          >
            @{connection.user.username}
          </a>
        </div>
      </div>
      <div className="mt-3 truncate text-[11px] text-slate-500">
        Instance: <span className="font-mono text-slate-700">{connection.url}</span>
      </div>
    </div>
  );
}
