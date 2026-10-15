import { Button } from "@/components/Button";
import { Field } from "@/components/Field";

/**
 * Description area: an edit form while editing, otherwise the value with an
 * "Edit description" action. Non-editable transactions show why instead.
 */
export function TransactionDescriptionEditor({
  description,
  editable,
  editing,
  saving,
  onChange,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  description: string;
  editable: boolean;
  editing: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (event: React.FormEvent) => void;
}) {
  if (!editable) {
    return <p style={{ margin: 0, color: "var(--text-secondary)" }}>Only pending transactions can be edited.</p>;
  }

  if (editing) {
    return (
      <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Field label="Description" name="description" value={description} onChange={(event) => onChange(event.target.value)} />
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button type="submit" variant="primary" loading={saving}>
            Save description
          </Button>
          <Button variant="ghost" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-4)" }}>
      <p style={{ margin: 0 }}>{description}</p>
      <Button variant="secondary" onClick={onStartEdit}>
        Edit description
      </Button>
    </div>
  );
}
