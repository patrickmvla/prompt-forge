import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useBlueprintStore } from "@/store/blueprint-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { PromptTestSchema, type PromptTest } from "@promptforge/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Play,
  PlusCircle,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const testManagerSchema = z.object({
  tests: z.array(PromptTestSchema),
});

type TestManagerFormValues = z.infer<typeof testManagerSchema>;

interface AssertionResult {
  id: string;
  passed: boolean;
  message: string;
  actualValue?: any;
}

interface TestResult {
  testId: string;
  ok: boolean;
  result?: any;
  duration?: number;
  error?: string;
  passed?: boolean;
  assertionResults?: AssertionResult[];
}

const AssertionEditor = ({
  control,
  testIndex,
}: {
  control: any;
  testIndex: number;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tests.${testIndex}.assertions`,
  });

  return (
    <div className="space-y-4 mt-4">
      <FormLabel>Assertions</FormLabel>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg"
        >
          <FormField
            control={control}
            name={`tests.${testIndex}.assertions.${index}.field`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Input placeholder="Field (e.g., data.name)" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`tests.${testIndex}.assertions.${index}.type`}
            render={({ field }) => (
              <FormItem className="w-[180px]">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="equalTo">Equal to</SelectItem>
                    <SelectItem value="notEqualTo">Not equal to</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="greaterThan">Greater than</SelectItem>
                    <SelectItem value="lessThan">Less than</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`tests.${testIndex}.assertions.${index}.expectedValue`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Input placeholder="Expected Value" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          append({
            id: uuidv4(),
            field: "",
            type: "equalTo",
            expectedValue: "",
          })
        }
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Assertion
      </Button>
    </div>
  );
};

export const TestManager = () => {
  const { activeBlueprint } = useBlueprintStore();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {}
  );

  const form = useForm<TestManagerFormValues>({
    resolver: zodResolver(testManagerSchema),
  });

  useEffect(() => {
    form.reset({ tests: activeBlueprint?.tests || [] });
  }, [activeBlueprint, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "tests",
  });

  const createTestMutation = useMutation({
    mutationFn: async (newTest: Omit<PromptTest, "id">) => {
      if (!activeBlueprint) throw new Error("No active blueprint");
      const res = await api.blueprints[":blueprintId"].tests.$post({
        param: { blueprintId: activeBlueprint.id },
        json: newTest,
      });
      if (!res.ok) throw new Error("Failed to create test");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async (test: PromptTest) => {
      if (!activeBlueprint) throw new Error("No active blueprint");
      const { id, ...testData } = test;
      const res = await api.tests[":testId"].$put({
        param: { testId: id },
        json: testData,
      });
      if (!res.ok) throw new Error("Failed to update test");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const res = await api.tests[":testId"].$delete({ param: { testId } });
      if (!res.ok) throw new Error("Failed to delete test");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
    },
  });

  const runTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const res = await api.tests[":testId"].run.$post({ param: { testId } });
      const data = await res.json();
      if (!res.ok) {
        const errorMessage = (data as any)?.message || "Failed to run test";
        throw new Error(errorMessage);
      }
      return { ...data, testId };
    },
    onSuccess: (data) => {
      setTestResults((prev) => ({
        ...prev,
        [data.testId]: data as TestResult,
      }));
    },
    onError: (error, testId) => {
      setTestResults((prev) => ({
        ...prev,
        [testId as string]: {
          testId: testId as string,
          ok: false,
          error: error.message,
        },
      }));
    },
  });

  if (!activeBlueprint) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Test Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select a blueprint to manage its tests.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAddTest = () => {
    const newTestPayload: Omit<PromptTest, "id"> = {
      name: `New Test Case ${fields.length + 1}`,
      inputs: {},
      assertions: [],
    };
    createTestMutation.mutate(newTestPayload);
  };

  const handleSaveTest = (index: number) => {
    const testToSave = form.getValues().tests[index];
    updateTestMutation.mutate(testToSave);
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Test Suite</CardTitle>
        <CardDescription>
          Manage automated tests for "{activeBlueprint.name}".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {fields.map((field, index) => {
              const result = testResults[field.id];
              return (
                <Card key={field.id} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <FormField
                      control={form.control}
                      name={`tests.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          {" "}
                          <FormControl>
                            {" "}
                            <Input
                              {...field}
                              className="text-lg font-semibold border-none p-0"
                            />{" "}
                          </FormControl>{" "}
                          <FormMessage />{" "}
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runTestMutation.mutate(field.id)}
                        disabled={
                          runTestMutation.isPending &&
                          runTestMutation.variables === field.id
                        }
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveTest(index)}
                        disabled={updateTestMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTestMutation.mutate(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`tests.${index}.inputs`}
                    render={({ field }) => (
                      <FormItem>
                        {" "}
                        <FormLabel>Inputs</FormLabel>{" "}
                        <FormControl>
                          {" "}
                          <Textarea
                            className="font-mono"
                            placeholder={JSON.stringify(
                              { user_input: "Some sample text." },
                              null,
                              2
                            )}
                            value={JSON.stringify(field.value, null, 2)}
                            onChange={(e) => {
                              try {
                                field.onChange(JSON.parse(e.target.value));
                              } catch {
                                /* Silently ignore JSON parsing errors while user is typing */
                              }
                            }}
                          />{" "}
                        </FormControl>{" "}
                        <FormMessage />{" "}
                      </FormItem>
                    )}
                  />

                  <AssertionEditor control={form.control} testIndex={index} />

                  {result && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          variant={result.passed ? "default" : "destructive"}
                        >
                          {result.passed ? "Pass" : "Fail"}
                        </Badge>
                        {result.duration && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration.toFixed(0)}ms
                          </span>
                        )}
                      </div>

                      {result.assertionResults &&
                        result.assertionResults.length > 0 && (
                          <div className="space-y-1 text-sm">
                            {result.assertionResults.map(
                              (ar: AssertionResult) => (
                                <div
                                  key={ar.id}
                                  className={cn(
                                    "flex items-start",
                                    ar.passed
                                      ? "text-green-400"
                                      : "text-red-400"
                                  )}
                                >
                                  {ar.passed ? (
                                    <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                  )}
                                  <span>{ar.message}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}

                      <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs font-mono">
                        <code>
                          {JSON.stringify(
                            result.result || { error: result.error },
                            null,
                            2
                          )}
                        </code>
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTest}
              disabled={createTestMutation.isPending}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {createTestMutation.isPending ? "Adding..." : "Add Test Case"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
