PromptForge 🛠️
Build. Validate. Execute. Your AI, Exactly As You Designed.

PromptForge is an enterprise-grade engineering platform designed to transform general-purpose Large Language Models (LLMs) into strict, predictable, and deterministic engines. It provides a full-stack environment for designing, saving, and testing "prompt blueprints" that force an AI to follow a rigid set of instructions, making it reliable enough for mission-critical business operations.

The core philosophy is to treat AI prompts not as simple text strings, but as version-controlled, testable, and enforceable pieces of software.

About The Project
Standard LLMs are inherently creative and probabilistic, which makes them unreliable for tasks that require absolute precision and compliance. They often:

"Hallucinate" or invent information.

Ignore critical instructions or constraints.

"Over-help" by providing advice or information outside their designated role, creating potential legal or safety liabilities.

Produce inconsistent output formats, breaking automated workflows.

PromptForge solves this by providing a UI and a backend "Strictness Engine" that validates the AI's output against a user-defined blueprint, ensuring reliability and consistency.

Core Features
Blueprint Editor: A comprehensive form for designing blueprints with roles, rules, dynamic input slots, and a required JSON output schema.

Persistent Storage: Blueprints are saved to and loaded from a PostgreSQL database, allowing you to build a library of reusable prompts.

Full CRUD Functionality: Create, read, update, and delete your saved blueprints.

Dynamic Execution: Provide inputs at runtime through a modal to execute your blueprints with dynamic data.

Strictness Engine: A backend service that runs a validation and auto-correction loop to force the LLM to adhere to the defined rules and schema.

Unit Testing Suite: Create and manage a suite of tests for each blueprint, defining specific inputs and assertions to validate the AI's output.

Test Runner: Execute tests against the live AI model and view detailed results, including pass/fail status and assertion reports.

Tech Stack
This project is a modern, high-performance monorepo built with a TypeScript-first philosophy.

Runtime: Bun

Backend: Hono

Frontend: React + Vite

UI Components: shadcn/ui

State Management: Zustand & TanStack Query

Database: Neon (Serverless PostgreSQL)

ORM: Drizzle ORM

AI Engine: Groq

Getting Started
Follow these instructions to get a local copy up and running.

Prerequisites
Bun: Ensure you have Bun installed. You can find installation instructions at bun.sh.

Database URL: You will need a PostgreSQL connection string from a provider like Neon.

Groq API Key: You will need an API key from Groq.

Installation
Clone the repository

git clone <your-repo-url>
cd promptforge

Install dependencies
From the root of the monorepo, run the install command. Bun Workspaces will handle installing dependencies for all packages (api, ui, shared).

bun install

Set up environment variables
Create a .env file in the packages/api directory:

touch packages/api/.env

Add your database connection string and Groq API key to this file:

# packages/api/.env
DATABASE_URL="your_neon_database_connection_string"
GROQ_API_KEY="your_groq_api_key"

Run database migrations
Before starting the app, you need to apply the database schema.

First, generate the migration files:

bun --cwd packages/api run db:generate

Then, apply the migration to your database:

bun --cwd packages/api run db:migrate

Usage
To start the development servers for both the frontend and backend, run the dev script from the root of the project.

bun run dev

This command will concurrently start:

The Hono API server (typically on http://localhost:3000)

The Vite React UI server (typically on http://localhost:5173)

Open your browser to the Vite server URL (http://localhost:5173) to start using PromptForge.

Platform Workflow
Here’s a typical workflow for using the PromptForge platform:

1. Create or Select a Blueprint
Create New: Click the "New Blueprint" button to clear the editor and start fresh.

Edit Existing: Click on any blueprint from the "Saved Blueprints" list on the right to load it into the editor.

2. Design the Blueprint
In the Blueprint Editor, fill out the following fields:

Blueprint Name: A descriptive name (e.g., "Sentiment Analyzer").

AI Role: The persona the AI should adopt (e.g., "A neutral and objective text analyst").

Task Template: The core instruction for the AI. Use {curly_braces} to define variables that will be filled in at runtime.

Example: Analyze the sentiment of the following customer review: {review_text}.

Input Slots: Define the variables you used in the Task Template. For the example above, you would add an input slot named review_text of type string.

Rules: Add strict, non-negotiable rules the AI must follow.

Example: NEVER mention competitors by name.

Output Schema: Define the exact JSON structure the AI's response must have.

Example: { "sentiment": "string", "confidence_score": "number" }

3. Save Your Work
Click "Create Blueprint" (for new blueprints) or "Save Changes" (for existing ones) to save your work to the database. It will appear or update in the list on the right.

4. Test the Blueprint
Once a blueprint is saved and selected, the Test Suite manager will appear below the editor.

Add a Test Case: Give the test a name (e.g., "Positive Review Test").

Define Inputs: Provide sample data for the input slots you defined.

Example: { "review_text": "I love this product, it's fantastic!" }

Add Assertions: Define what the output must look like for the test to pass.

Example: Add an assertion where field is sentiment, type is equalTo, and expectedValue is positive.

Run the Test: Click the "Run" button on the test case. The platform will execute the blueprint with your test inputs and show you a detailed report of the AI's output and whether your assertions passed or failed.

5. Execute the Blueprint
Once you are satisfied with your blueprint's design and test results, click the "Execute" button in the main editor.

An "Provide Inputs" modal will appear, prompting you to fill in the values for the input slots.

After providing the inputs and clicking "Execute" in the modal, the blueprint will be run, and the final AI-generated output will be displayed in the "API Response" card.