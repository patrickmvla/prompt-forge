import { useExecutionStore } from './store/execution-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { ThemeProvider } from './providers/theme-provider';
import { BlueprintForm } from './components/blueprint-form';
import { BlueprintList } from './components/blueprint-list';
import { Badge } from './components/ui/badge';

const App = () => {
  const { response, error, duration } = useExecutionStore();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold">PromptForge</h1>
              <p className="text-muted-foreground">The AI Engineering Studio</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Blueprint Editor</CardTitle>
                <CardDescription>
                  Design and configure your prompt blueprint below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BlueprintForm />
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Execution Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{error}</p>
                </CardContent>
              </Card>
            )}

            {response && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>API Response</CardTitle>
                  {duration !== null && (
                    <Badge variant="outline">
                      {duration.toFixed(0)}ms
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    <code>{JSON.stringify(response, null, 2)}</code>
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-8 lg:pt-24">
            <BlueprintList />
          </div>

        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;
