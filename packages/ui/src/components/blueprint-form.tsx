import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PromptBlueprintSchema,
  type PromptBlueprint,
} from "@promptforge/shared";
import { useExecutionStore } from "@/store/execution-store";
import { v4 as uuidv4 } from "uuid";
import { Trash2 } from "lucide-react";
import { ExecutionModal } from "./execution-modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useBlueprintStore } from "@/store/blueprint-store";

const formSchema = z.object({
  name: PromptBlueprintSchema.shape.name,
  role: PromptBlueprintSchema.shape.role,
  taskTemplate: PromptBlueprintSchema.shape.taskTemplate,
  rules: PromptBlueprintSchema.shape.rules,
  inputSlots: z.array(
    z.object({
      name: z.string().min(1, "Name cannot be empty."),
      type: z.enum(["string", "number", "date"]),
    })
  ),
  outputSchema: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        return (
          typeof parsed === "object" &&
          parsed !== null &&
          Object.keys(parsed).length > 0
        );
      } catch {
        return false;
      }
    },
    {
      message: "Must be a non-empty, valid JSON object.",
    }
  ),
});

type BlueprintFormValues = z.infer<typeof formSchema>;

const emptyDefaultValues: BlueprintFormValues = {
  name: "New Blueprint",
  role: "AI Assistant",
  taskTemplate: "",
  rules: [],
  inputSlots: [],
  outputSchema: JSON.stringify({}, null, 2),
};

export const BlueprintForm = () => {
  const execute = useExecutionStore((state) => state.execute);
  const { activeBlueprint, setActiveBlueprint } = useBlueprintStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blueprintForExecution, setBlueprintForExecution] =
    useState<PromptBlueprint | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<BlueprintFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (activeBlueprint) {
      const inputSlotsArray = Object.values(activeBlueprint.inputSlots || {});
      form.reset({
        ...activeBlueprint,
        inputSlots: inputSlotsArray,
        outputSchema: JSON.stringify(activeBlueprint.outputSchema, null, 2),
      });
    } else {
      form.reset(emptyDefaultValues);
    }
  }, [activeBlueprint, form]);

  const createBlueprintMutation = useMutation({
    mutationFn: async (newBlueprint: Omit<PromptBlueprint, "id">) => {
      const res = await api.blueprints.$post({ json: newBlueprint });
      if (!res.ok) throw new Error("Failed to create blueprint");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      setActiveBlueprint(data);
    },
  });

  const updateBlueprintMutation = useMutation({
    mutationFn: async (updatedBlueprint: PromptBlueprint) => {
      const res = await api.blueprints[":id"].$put({
        param: { id: updatedBlueprint.id },
        json: updatedBlueprint,
      });
      if (!res.ok) throw new Error("Failed to update blueprint");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      setActiveBlueprint(data);
    },
  });

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  const {
    fields: slotFields,
    append: appendSlot,
    remove: removeSlot,
  } = useFieldArray({
    control: form.control,
    name: "inputSlots",
  });

  const onPrepareExecution = (data: BlueprintFormValues) => {
    const parsedOutputSchema = JSON.parse(data.outputSchema);
    const inputSlotsRecord = data.inputSlots.reduce((acc, slot) => {
      if (slot.name) acc[slot.name] = { name: slot.name, type: slot.type };
      return acc;
    }, {} as Record<string, { name: string; type: "string" | "number" | "date" }>);

    const fullBlueprint: PromptBlueprint = {
      id: activeBlueprint?.id || uuidv4(),
      name: data.name,
      role: data.role,
      taskTemplate: data.taskTemplate,
      rules: data.rules,
      outputSchema: parsedOutputSchema,
      inputSlots: inputSlotsRecord,
    };

    setBlueprintForExecution(fullBlueprint);
    setIsModalOpen(true);
  };

  const handleFinalExecute = (inputs: Record<string, any>) => {
    if (blueprintForExecution) {
      execute(blueprintForExecution, inputs);
    }
  };

  const onSaveBlueprint = (data: BlueprintFormValues) => {
    const parsedOutputSchema = JSON.parse(data.outputSchema);
    const inputSlotsRecord = data.inputSlots.reduce((acc, slot) => {
      if (slot.name) acc[slot.name] = { name: slot.name, type: slot.type };
      return acc;
    }, {} as Record<string, { name: string; type: "string" | "number" | "date" }>);

    if (activeBlueprint) {
      // Update existing blueprint
      const updatedBlueprint: PromptBlueprint = {
        id: activeBlueprint.id,
        name: data.name,
        role: data.role,
        taskTemplate: data.taskTemplate,
        rules: data.rules,
        outputSchema: parsedOutputSchema,
        inputSlots: inputSlotsRecord,
      };
      updateBlueprintMutation.mutate(updatedBlueprint);
    } else {
      // Create new blueprint
      const newBlueprint = {
        name: data.name,
        role: data.role,
        taskTemplate: data.taskTemplate,
        rules: data.rules,
        outputSchema: parsedOutputSchema,
        inputSlots: inputSlotsRecord,
      };
      createBlueprintMutation.mutate(newBlueprint);
    }
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                {" "}
                <FormLabel>Blueprint Name</FormLabel>{" "}
                <FormControl>
                  {" "}
                  <Input
                    placeholder="e.g., FDA Compliance Checker"
                    {...field}
                  />{" "}
                </FormControl>{" "}
                <FormMessage />{" "}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                {" "}
                <FormLabel>AI Role</FormLabel>{" "}
                <FormControl>
                  {" "}
                  <Input
                    placeholder="e.g., Senior FDA Auditor"
                    {...field}
                  />{" "}
                </FormControl>{" "}
                <FormMessage />{" "}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taskTemplate"
            render={({ field }) => (
              <FormItem>
                {" "}
                <FormLabel>Task Template</FormLabel>{" "}
                <FormControl>
                  {" "}
                  <Textarea
                    placeholder="Describe the task. Use {curly_braces} for dynamic inputs."
                    className="resize-none"
                    {...field}
                  />{" "}
                </FormControl>{" "}
                <FormMessage />{" "}
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormLabel>Input Slots</FormLabel>
            <FormDescription>
              Define dynamic variables for your task template.
            </FormDescription>
            {slotFields.map((field, index) => (
              <div key={field.id} className="flex items-start space-x-2">
                <Input
                  placeholder="Variable Name"
                  {...form.register(`inputSlots.${index}.name`)}
                />
                <Select
                  defaultValue={field.type}
                  onValueChange={(value) =>
                    form.setValue(
                      `inputSlots.${index}.type`,
                      value as "string" | "number" | "date"
                    )
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    {" "}
                    <SelectValue placeholder="Type" />{" "}
                  </SelectTrigger>
                  <SelectContent>
                    {" "}
                    <SelectItem value="string">String</SelectItem>{" "}
                    <SelectItem value="number">Number</SelectItem>{" "}
                    <SelectItem value="date">Date</SelectItem>{" "}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeSlot(index)}
                >
                  {" "}
                  <Trash2 className="h-4 w-4" />{" "}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendSlot({ name: "", type: "string" })}
            >
              Add Input Slot
            </Button>
          </div>

          <div className="space-y-4">
            <FormLabel>Rules</FormLabel>
            <FormDescription>
              Define strict rules the AI must follow.
            </FormDescription>
            {ruleFields.map((field, index) => (
              <div key={field.id} className="flex items-start space-x-2">
                <Select
                  defaultValue={field.type}
                  onValueChange={(value) =>
                    form.setValue(
                      `rules.${index}.type`,
                      value as "HARD" | "SOFT"
                    )
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    {" "}
                    <SelectValue placeholder="Rule Type" />{" "}
                  </SelectTrigger>
                  <SelectContent>
                    {" "}
                    <SelectItem value="HARD">HARD</SelectItem>{" "}
                    <SelectItem value="SOFT">SOFT</SelectItem>{" "}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="e.g., NEVER mention GDPR"
                  {...form.register(`rules.${index}.value`)}
                  className="flex-grow"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeRule(index)}
                >
                  {" "}
                  <Trash2 className="h-4 w-4" />{" "}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendRule({ id: uuidv4(), type: "HARD", value: "" })
              }
            >
              Add Rule
            </Button>
          </div>

          <FormField
            control={form.control}
            name="outputSchema"
            render={({ field }) => (
              <FormItem>
                {" "}
                <FormLabel>Output Schema</FormLabel>{" "}
                <FormControl>
                  {" "}
                  <Textarea
                    placeholder='{ "result": "string", "confidence_score": "number" }'
                    className="min-h-[150px] font-mono resize-y"
                    {...field}
                  />{" "}
                </FormControl>{" "}
                <FormDescription>
                  Define the JSON structure the AI must return.
                </FormDescription>{" "}
                <FormMessage />{" "}
              </FormItem>
            )}
          />

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={form.handleSubmit(onSaveBlueprint)}
              disabled={
                createBlueprintMutation.isPending ||
                updateBlueprintMutation.isPending
              }
            >
              {activeBlueprint ? "Save Changes" : "Create Blueprint"}
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onPrepareExecution)}
            >
              Execute
            </Button>
          </div>
        </form>
      </Form>

      <ExecutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        blueprint={blueprintForExecution}
        onSubmit={handleFinalExecute}
      />
    </>
  );
};
