import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlueprintStore } from "@/store/blueprint-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { PromptBlueprintSchema } from "@promptforge/shared";

const fetchBlueprints = async () => {
  const res = await api.blueprints.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch blueprints");
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Received non-JSON response from server");
  }

  const data = await res.json();
  return PromptBlueprintSchema.array().parse(data);
};

export const BlueprintList = () => {
  const queryClient = useQueryClient();
  const {
    data: blueprints,
    isLoading,
    isError,
    error,
    refetch,
    isFetched,
  } = useQuery({
    queryKey: ["blueprints"],
    queryFn: fetchBlueprints,
    enabled: false, // Prevents the query from running automatically on mount
  });

  const { activeBlueprint, setActiveBlueprint } = useBlueprintStore();

  const deleteBlueprintMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.blueprints[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error("Failed to delete blueprint");
      }
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      if (activeBlueprint?.id === deletedId) {
        setActiveBlueprint(null);
      }
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <Card className="border-destructive text-center">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Blueprints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message}</p>
            <Button
              onClick={() => refetch()}
              variant="secondary"
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (isFetched) {
      return blueprints && blueprints.length > 0 ? (
        blueprints.map((blueprint) => (
          <Card
            key={blueprint.id}
            onClick={() => setActiveBlueprint(blueprint)}
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              activeBlueprint?.id === blueprint.id &&
                "border-primary ring-2 ring-primary"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{blueprint.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBlueprintMutation.mutate(blueprint.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{blueprint.role}</p>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground text-center py-4">
          No blueprints found. Create one to get started!
        </p>
      );
    }

    // Initial state before the user has tried to fetch
    return (
      <div className="text-center p-6 border border-dashed rounded-lg">
        <p className="text-muted-foreground mb-4">
          Your saved blueprints will appear here.
        </p>
        <Button onClick={() => refetch()}>Load Blueprints</Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saved Blueprints</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveBlueprint(null)}
        >
          New Blueprint
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};
