import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { PromptBlueprint } from "@promptforge/shared"
import { useEffect } from "react"

interface ExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  blueprint: PromptBlueprint | null
  onSubmit: (inputs: Record<string, any>) => void
}

export const ExecutionModal = ({ isOpen, onClose, blueprint, onSubmit }: ExecutionModalProps) => {
  // Dynamically create a Zod schema based on the blueprint's input slots
  const getExecutionSchema = (bp: PromptBlueprint) => {
    const shape = Object.keys(bp.inputSlots).reduce((acc, key) => {
      const slot = bp.inputSlots[key];
      switch (slot.type) {
        case 'number':
          acc[key] = z.coerce.number();
          break;
        case 'date':
          acc[key] = z.coerce.date();
          break;
        default:
          acc[key] = z.string().min(1, "This field is required.");
      }
      return acc;
    }, {} as Record<string, z.ZodTypeAny>);
    return z.object(shape);
  };

  const form = useForm();

  // Re-initialize the form whenever the blueprint changes.
  useEffect(() => {
    if (blueprint) {
      const schema = getExecutionSchema(blueprint);
      const defaultValues = Object.keys(blueprint.inputSlots).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, any>);
      
      form.reset(defaultValues);
      // @ts-expect-error - We are dynamically setting the resolver
      form.resolver = zodResolver(schema);
    }
  }, [blueprint, form]);


  if (!blueprint) return null;

  const handleFormSubmit = (data: Record<string, any>) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Provide Inputs</DialogTitle>
          <DialogDescription>
            Fill in the values for the dynamic slots in your blueprint.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            {Object.values(blueprint.inputSlots).map((slot) => (
              <FormField
                key={slot.name}
                control={form.control}
                name={slot.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{slot.name} ({slot.type})</FormLabel>

                    <FormControl>
                      <Input placeholder={`Enter value for ${slot.name}...`} {...field} />
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
      </DialogContent>
    </Dialog>
  )
}
