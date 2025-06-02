import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { defer } from "@remix-run/node";
import { Await, Form, useActionData, useNavigation } from "@remix-run/react";
import { Suspense } from "react";

export const meta: MetaFunction = () => {
  return [{ title: "AI Code Generation Stream" }];
};

// Simulate a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* generateCodeChunks() {
  const codeSnippets = [
    "function greet(name) {\n",
    "  console.log(`Hello, ${name}!`);\n",
    "}\n\n",
    "greet('World');\n",
    "// End of generated code.\n",
  ];

  for (const snippet of codeSnippets) {
    await sleep(500); // Simulate token generation delay
    yield snippet;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // In a real scenario, you might get a prompt from formData
  // const formData = await request.formData();
  // const prompt = formData.get("prompt");

  const codeStream = generateCodeChunks();

  // defer allows us to send a response immediately while data streams in
  return defer({
    // It's important that the promise resolves to an iterable, like an async generator
    generatedCode: codeStream,
  });
}

export default function AiGenerateCodePage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "20px" }}>
      <h1>AI Code Generation Demo (Streaming)</h1>
      <p>
        This demo simulates an AI generating code in real-time using Remix's `defer` and{" "}
        <code>&lt;Await&gt;</code> component.
      </p>

      <Form method="post">
        {/* <label htmlFor="prompt">Enter a prompt (optional):</label>
        <textarea name="prompt" id="prompt" style={{ width: "100%", minHeight: "60px", marginBottom: "10px" }} /> */}
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 15px" }}>
          {isSubmitting ? "Generating..." : "Generate Code Stream"}
        </button>
      </Form>

      {actionData?.generatedCode && (
        <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "10px" }}>
          <h2>Generated Code:</h2>
          <Suspense fallback={<p>Loading code stream...</p>}>
            <Await resolve={actionData.generatedCode}>
              {(stream) => {
                // This component will re-render as new chunks arrive from the stream
                // For this example, we'll just accumulate and display them.
                // In a real app, you might append to a CodeMirror instance or similar.
                let accumulatedCode = "";
                // Note: This simple accumulation won't work directly with <Await> as it resolves the whole promise.
                // A more robust solution would involve a custom hook or component that iterates
                // over the async generator.
                // For simplicity here, we'll assume `stream` eventually resolves to the full string
                // if we were to collect it.
                // However, the true power of defer + Await is for promises that resolve to values,
                // and for async iterators, you'd typically consume them differently on the client.

                // Correct way to consume an async iterator with Await (if Await supported it directly for rendering chunks):
                // For now, we'll just show a message that the stream has started.
                // A proper implementation would use a useEffect to iterate over the stream.
                // This example primarily shows the `defer` setup.
                // The below is a conceptual representation of how one might handle it if Await fully unwrapped iterators for render.
                
                // Placeholder for iterative rendering - this part needs client-side logic to consume the stream
                // For a true token-by-token display, you'd read the stream on the client.
                // This example sets up the backend stream correctly.
                return <StreamingCodeDisplay codeStream={actionData.generatedCode} />;
              }}
            </Await>
          </Suspense>
        </div>
      )}
    </div>
  );
}

// Client-side component to handle the stream
function StreamingCodeDisplay({ codeStream }: { codeStream: AsyncIterable<string> }) {
  const [accumulatedCode, setAccumulatedCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    async function consumeStream() {
      let currentCode = "";
      try {
        for await (const chunk of codeStream) {
          if (!isMounted) break;
          currentCode += chunk;
          setAccumulatedCode(currentCode);
        }
      } catch (error) {
        console.error("Error consuming stream:", error);
        if (isMounted) setAccumulatedCode((prev) => prev + "\n\nError streaming code.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    consumeStream();
    return () => {
      isMounted = false;
    };
  }, [codeStream]);

  if (isLoading && !accumulatedCode) {
    return <p>Receiving code stream...</p>;
  }

  return <pre>{accumulatedCode}</pre>;
}

// Need to import React for StreamingCodeDisplay
import React from "react";
