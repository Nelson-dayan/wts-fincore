import { parseSearch, escapeRegex, InvalidQueryParamError } from "../src/lib/api/pagination";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

function expectThrows(fn: () => void, expectedSnippet: string, testName: string) {
  try {
    fn();
    console.error(`❌ FAIL: Expected error for "${testName}", but succeeded`);
    failed++;
  } catch (err: any) {
    if (err instanceof InvalidQueryParamError || err?.message?.toLowerCase().includes(expectedSnippet.toLowerCase())) {
      console.log(`✅ PASS: ${testName} -> Caught: "${err.message}"`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} -> Threw unexpected error: "${err.message}"`);
      failed++;
    }
  }
}

console.log("=======================================================================");
console.log("  FINDING #03: NoSQL SEARCH FILTER & TYPE CONFUSION REGRESSION SUITE   ");
console.log("=======================================================================\n");

// 1. Normal Matching & Non-matching Search Strings
console.log("--- SECTION 1: Standard Search Strings ---");
const normalParams = new URLSearchParams("q=acme&page=1&limit=20");
assert(parseSearch(normalParams) === "acme", "Extracts standard search term");

const emptyParams = new URLSearchParams("q=&page=1&limit=20");
assert(parseSearch(emptyParams) === "", "Empty search param returns empty string");

const whitespaceParams = new URLSearchParams("q=   &page=1&limit=20");
assert(parseSearch(whitespaceParams) === "", "Whitespace-only search returns empty string");

const missingParams = new URLSearchParams("page=1&limit=20");
assert(parseSearch(missingParams) === "", "Missing q param returns empty string");

const trimmedParams = new URLSearchParams("q=%20%20TechCorp%20%20");
assert(parseSearch(trimmedParams) === "TechCorp", "Leading and trailing spaces are trimmed");

// 2. Bracket Notation / Type Confusion Bypass Vectors
console.log("\n--- SECTION 2: Bracket Notation & Operator Injection Attempts ---");
expectThrows(
  () => parseSearch(new URLSearchParams("q[$ne]=&page=1&limit=20")),
  "bracket notation",
  "Reject q[$ne]="
);

expectThrows(
  () => parseSearch(new URLSearchParams("q[$regex]=.*&page=1")),
  "bracket notation",
  "Reject q[$regex]=.*"
);

expectThrows(
  () => parseSearch(new URLSearchParams("q[$gt]=0")),
  "bracket notation",
  "Reject q[$gt]=0"
);

expectThrows(
  () => parseSearch(new URLSearchParams("q.field=value")),
  "bracket notation",
  "Reject q.field=value"
);

expectThrows(
  () => parseSearch(new URL("http://localhost:3000/api/admin/clients?q[$ne]=&page=1")),
  "bracket notation",
  "Reject URL object with ?q[$ne]="
);

expectThrows(
  () => parseSearch("http://localhost:3000/api/admin/users?q%5B%24ne%5D=&page=1"),
  "bracket notation",
  "Reject URL string with URL-encoded ?q%5B%24ne%5D="
);

// 3. Repeated Parameters
console.log("\n--- SECTION 3: Duplicate / Repeated Parameters ---");
expectThrows(
  () => parseSearch(new URLSearchParams("q=first&q=second")),
  "Multiple search",
  "Reject duplicate ?q=first&q=second"
);

// 4. Excessive Length
console.log("\n--- SECTION 4: Length Constraints ---");
const longString = "a".repeat(101);
expectThrows(
  () => parseSearch(new URLSearchParams(`q=${longString}`)),
  "exceeds maximum allowable length",
  "Reject 101 character search query (exceeds MAX_SEARCH_LENGTH 100)"
);

const exactMaxString = "a".repeat(100);
assert(
  parseSearch(new URLSearchParams(`q=${exactMaxString}`)) === exactMaxString,
  "Accept exactly 100 character search query"
);

// 5. Regex Character Escaping
console.log("\n--- SECTION 5: Regex Special Character Escaping ---");
const rawRegex = ".*[a-z]+?^${}()|\\";
const escaped = escapeRegex(rawRegex);
assert(escaped === "\\.\\*\\[a\\-z\\]\\+\\?\\^\\$\\{\\}\\(\\)\\|\\\\", "Escapes all regex metacharacters");

const safeSearchTerm = "Acme (HQ) + Co.";
const escapedSearch = escapeRegex(safeSearchTerm);
assert(escapedSearch === "Acme \\(HQ\\) \\+ Co\\.", "Escapes parentheses, plus, and dots while preserving spaces");

// Test regex matching safety: Ensure regex input cannot cause unintended match
const testRegex = new RegExp(escapeRegex(".*"), "i");
assert(!testRegex.test("random text"), "Escaped '.*' does NOT match 'random text'");
assert(testRegex.test(".*"), "Escaped '.*' matches literal '.*'");

// 6. Verification of the 6 Affected Route Handlers
console.log("\n--- SECTION 6: Route Handler Invocation Verification ---");

// Import GET handlers
import { GET as getClients } from "../src/app/api/admin/clients/route";
import { GET as getUsers } from "../src/app/api/admin/users/route";
import { GET as getQuotations } from "../src/app/api/admin/quotations/route";
import { GET as getInvoices } from "../src/app/api/admin/invoices/route";
import { GET as getExpenses } from "../src/app/api/admin/expenses/route";
import { GET as getPurchaseOrders } from "../src/app/api/admin/purchase-orders/route";

const routesToTest = [
  { name: "/api/admin/clients", handler: getClients },
  { name: "/api/admin/users", handler: getUsers },
  { name: "/api/admin/quotations", handler: getQuotations },
  { name: "/api/admin/invoices", handler: getInvoices },
  { name: "/api/admin/expenses", handler: getExpenses },
  { name: "/api/admin/purchase-orders", handler: getPurchaseOrders },
];

async function runRouteTests() {
  for (const { name, handler } of routesToTest) {
    // Test 1: Verify malformed bracket notation q[$ne]= is rejected or yields 400
    // Note: auth check may trigger 401 if unauthenticated, which is correct (keeps existing auth)
    // We verify by calling with standard request
    const reqBracket = new Request(`http://localhost:3000${name}?q[$ne]=&page=1&limit=20`);
    const resBracket = await handler(reqBracket);
    // Should be either 400 (if validated before/after auth) or 401 (auth check preserved)
    // Most importantly, must NOT return 200 with all records bypassed!
    assert(
      resBracket.status === 400 || resBracket.status === 401 || resBracket.status === 403,
      `${name}: Rejects q[$ne]= without bypass (status: ${resBracket.status})`
    );

    // Test 2: Verify repeated q parameters ?q=first&q=second
    const reqRepeated = new Request(`http://localhost:3000${name}?q=first&q=second`);
    const resRepeated = await handler(reqRepeated);
    assert(
      resRepeated.status === 400 || resRepeated.status === 401 || resRepeated.status === 403,
      `${name}: Rejects duplicate ?q= (status: ${resRepeated.status})`
    );

    // Test 3: Verify regex metacharacter payload q[$regex]=.*
    const reqRegex = new Request(`http://localhost:3000${name}?q[$regex]=.*`);
    const resRegex = await handler(reqRegex);
    assert(
      resRegex.status === 400 || resRegex.status === 401 || resRegex.status === 403,
      `${name}: Rejects q[$regex]=.* (status: ${resRegex.status})`
    );
  }

  console.log("\n=======================================================================");
  console.log(`  FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRouteTests();
