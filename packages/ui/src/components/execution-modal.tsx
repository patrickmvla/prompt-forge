import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PromptBlueprint } from "@promptforge/shared";
import type { z as zod } from "zod";

// --- Component Props Interfaces ---

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: PromptBlueprint | null;
  onSubmit: (inputs: Record<string, any>) => void;
}

interface ExecutionFormProps {
  blueprint: PromptBlueprint;
  onClose: () => void;
  onSubmit: (inputs: Record<string, any>) => void;
}

// --- Helper Function ---

// Dynamically creates a Zod schema from the blueprint's input slots.
const getExecutionSchema = (bp: PromptBlueprint) => {
  const shape = Object.keys(bp.inputSlots).reduce((acc, key) => {
    const slot = bp.inputSlots[key];
    switch (slot.type) {
      case "number":
        acc[key] = z.coerce.number();
        break;
      case "date":
        acc[key] = z.coerce.date();
        break;
      default:
        acc[key] = z.string().min(1, "This field is required.");
    }
    return acc;
  }, {} as Record<string, zod.ZodTypeAny>);
  return z.object(shape);
};

// --- Main Components ---

// Inner form component that is re-mounted when the blueprint changes.
const ExecutionForm = ({
  blueprint,
  onClose,
  onSubmit,
}: ExecutionFormProps) => {
  const executionSchema = getExecutionSchema(blueprint);

  const form = useForm<z.infer<typeof executionSchema>>({
    resolver: zodResolver(executionSchema),
    defaultValues: Object.keys(blueprint.inputSlots).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as Record<string, any>),
  });

  const handleFormSubmit = (data: Record<string, any>) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4 py-4"
      >
        {Object.values(blueprint.inputSlots).map((slot) => (
          <FormField
            key={slot.name}
            control={form.control}
            name={slot.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {slot.name} ({slot.type})
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={`Enter value for ${slot.name}...`}
                    {...field}
                    value={String(field.value ?? "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <DialogFooter>
          <Button type="submit">Execute</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

// Modal component that controls visibility and provides the key.
export const ExecutionModal = ({
  isOpen,
  onClose,
  blueprint,
  onSubmit,
}: ExecutionModalProps) => {
  if (!blueprint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Provide Inputs</DialogTitle>
          <DialogDescription>
            Fill in the values for the dynamic slots in your blueprint.
          </DialogDescription>
        </DialogHeader>
        <ExecutionForm
          key={blueprint.id} // This key is crucial for re-mounting the form
          blueprint={blueprint}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};
