"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, Select, TextArea } from "@/components/ui/Inputs";
import { AiEnhanceDialog } from "@/components/editor/AiEnhanceDialog";
import { useAuth } from "@/lib/auth";
import type { Project, UpdateRow } from "@/types/shared";

type EditPayload = {
  title: string;
  originalBody: string;
  projectId: string;
  hours: number;
  nextPlan: string;
  blockers: boolean;
};

export function EditUpdateModal({
  open,
  update,
  projects,
  isSaving,
  onSave,
  onCancel
}: {
  open: boolean;
  update: UpdateRow | null;
  projects: Project[];
  isSaving: boolean;
  onSave: (id: string, payload: Partial<EditPayload>) => void;
  onCancel: () => void;
}) {
  const { accessToken } = useAuth();
  const [title, setTitle] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [hours, setHours] = useState(0);
  const [nextPlan, setNextPlan] = useState("");
  const [blockers, setBlockers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    if (!update) return;
    setTitle(update.title);
    setOriginalBody(update.originalBody);
    setSelectedProjectId(update.projectId);
    setHours(update.hours);
    setNextPlan(update.nextPlan);
    setBlockers(update.blockers);
    setErrors({});
    setIsAiOpen(false);
  }, [update]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    else if (title.length > 200) next.title = "Title must be under 200 characters";
    if (!originalBody.trim()) next.originalBody = "Body is required";
    if (!selectedProjectId) next.projectId = "Project is required";
    if (hours < 0 || hours > 24) next.hours = "Hours must be between 0 and 24";
    if (nextPlan.length > 500) next.nextPlan = "Next plan must be under 500 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!update || !validate()) return;

    const payload: Partial<EditPayload> = {};
    if (title.trim() !== update.title) payload.title = title.trim();
    if (originalBody !== update.originalBody) payload.originalBody = originalBody;
    if (selectedProjectId !== update.projectId) payload.projectId = selectedProjectId;
    if (hours !== update.hours) payload.hours = hours;
    if (nextPlan !== update.nextPlan) payload.nextPlan = nextPlan;
    if (blockers !== update.blockers) payload.blockers = blockers;

    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }

    onSave(update.id, payload);
  };

  return (
    <Modal
      open={open}
      title="Edit Update"
      description={update ? `Editing "${update.title}"` : undefined}
      onClose={onCancel}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={errors.title}>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Update title"
            maxLength={200}
          />
        </Field>

        <Field label="Project" error={errors.projectId}>
          <Select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Body"
          hint={`${originalBody.length} chars`}
          error={errors.originalBody}
          right={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAiOpen(true)}
              disabled={!originalBody.trim() || isSaving}
              className="text-indigo-700 hover:bg-indigo-50 focus-visible:ring-indigo-600"
              leftIcon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9L12 2z" />
                  <path d="M19 13l.9 3.2L23 17l-3.1 1.3L19 22l-.9-3.7L15 17l3.1-.8L19 13z" />
                </svg>
              }
            >
              Enhance
            </Button>
          }
        >
          <TextArea
            value={originalBody}
            onChange={(e) => setOriginalBody(e.target.value)}
            placeholder="What did you work on?"
            className="min-h-[120px]"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hours" error={errors.hours}>
            <TextInput
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </Field>

          <Field label="Blockers">
            <Select
              value={blockers ? "true" : "false"}
              onChange={(e) => setBlockers(e.target.value === "true")}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Next Plan"
          hint={`${nextPlan.length}/500`}
          error={errors.nextPlan}
        >
          <TextInput
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
            placeholder="What's next?"
            maxLength={500}
          />
        </Field>
      </div>

      {accessToken && (
        <AiEnhanceDialog
          open={isAiOpen}
          token={accessToken}
          body={originalBody}
          onClose={() => setIsAiOpen(false)}
          onResult={() => {}}
          onReplace={(enriched) => setOriginalBody(enriched)}
          onInsert={(enriched) => setOriginalBody((prev) => `${prev}\n\n${enriched}`)}
        />
      )}
    </Modal>
  );
}
