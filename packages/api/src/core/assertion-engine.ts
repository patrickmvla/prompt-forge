import type { Assertion } from "@promptforge/shared";
import { get } from "lodash-es";

export interface AssertionResult {
  id: string;
  passed: boolean;
  message: string;
  actualValue?: any;
}

class AssertionEngine {
  public run(
    output: Record<string, any>,
    assertions: Assertion[]
  ): AssertionResult[] {
    if (!assertions || assertions.length === 0) {
      return [];
    }

    const results: AssertionResult[] = [];

    for (const assertion of assertions) {
      const actualValue = get(output, assertion.field);
      let passed = false;
      let message = "";

      switch (assertion.type) {
        case "equalTo":
          passed = actualValue === assertion.expectedValue;
          message = passed
            ? `Field "${assertion.field}" correctly equals "${assertion.expectedValue}".`
            : `Expected field "${assertion.field}" to equal "${assertion.expectedValue}", but got "${actualValue}".`;
          break;
        case "notEqualTo":
          passed = actualValue !== assertion.expectedValue;
          message = passed
            ? `Field "${assertion.field}" correctly does not equal "${assertion.expectedValue}".`
            : `Expected field "${assertion.field}" not to equal "${assertion.expectedValue}", but it did.`;
          break;
        case "contains":
          passed =
            typeof actualValue === "string" &&
            actualValue.includes(String(assertion.expectedValue));
          message = passed
            ? `Field "${assertion.field}" correctly contains "${assertion.expectedValue}".`
            : `Expected field "${assertion.field}" to contain "${assertion.expectedValue}", but it did not.`;
          break;
        case "greaterThan":
          passed =
            typeof actualValue === "number" &&
            typeof assertion.expectedValue === "number" &&
            actualValue > assertion.expectedValue;
          message = passed
            ? `Field "${assertion.field}" (${actualValue}) is correctly greater than "${assertion.expectedValue}".`
            : `Expected field "${assertion.field}" (${actualValue}) to be greater than "${assertion.expectedValue}", but it was not.`;
          break;
        case "lessThan":
          passed =
            typeof actualValue === "number" &&
            typeof assertion.expectedValue === "number" &&
            actualValue < assertion.expectedValue;
          message = passed
            ? `Field "${assertion.field}" (${actualValue}) is correctly less than "${assertion.expectedValue}".`
            : `Expected field "${assertion.field}" (${actualValue}) to be less than "${assertion.expectedValue}", but it was not.`;
          break;
        default:
          message = `Unknown assertion type: "${assertion.type}".`;
          break;
      }
      results.push({ id: assertion.id, passed, message, actualValue });
    }

    return results;
  }
}

export const assertionEngine = new AssertionEngine();
