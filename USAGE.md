How to Use PromptForge: A Step-by-Step Guide
This guide will walk you through creating, saving, and executing your first prompt blueprint to verify that the AI is working correctly. We will build a simple Sentiment Analyzer.

Step 1: Design the Blueprint
First, we'll fill out the Blueprint Editor on the left side of the screen.

Blueprint Name: Change the name from "New Blueprint" to Sentiment Analyzer.

AI Role: Define the persona for the AI. Enter: A helpful assistant that analyzes text for sentiment.

Task Template: This is the core instruction. We'll define one dynamic input called {customer_review}. Enter the following:

Analyze the sentiment of the following text and classify it as 'positive', 'negative', or 'neutral'. Respond only with a JSON object. Text to analyze: {customer_review}

Input Slots: We need to define the {customer_review} variable we used above.

Click "Add Input Slot".

In the "Variable Name" field, type customer_review.

Leave the type as String.

Rules: Let's add a rule to ensure the AI is concise.

Click "Add Rule".

In the input field that appears, type: NEVER apologize or explain your reasoning.

Output Schema: We need to tell the AI the exact JSON format to return. Enter the following into the text area:

{
  "sentiment": "string",
  "confidence": "number"
}

Step 2: Save the Blueprint
Now that the blueprint is designed, save it to the database.

Click the "Create Blueprint" button.

You should see "Sentiment Analyzer" appear in the Saved Blueprints list on the right.

Step 3: Prepare for Execution
With the "Sentiment Analyzer" blueprint selected in the list, we can now execute it.

Click the "Execute" button at the bottom of the form.

Step 4: Provide Inputs
The "Provide Inputs" modal will appear. This is where you provide the data for the dynamic {customer_review} slot we defined.

In the input field labeled customer_review, enter the following text:

The service was incredibly fast and the staff was very friendly. I am extremely satisfied!

Click the "Execute" button inside the modal.

Step 5: Check the Result
The modal will close, and after a moment, the API Response card will appear below the editor. If everything is working correctly, you should see a JSON object similar to this:

{
  "sentiment": "positive",
  "confidence": 0.95
}

You will also see a badge showing the execution time (e.g., 250ms). This confirms that the entire workflow—from the UI to