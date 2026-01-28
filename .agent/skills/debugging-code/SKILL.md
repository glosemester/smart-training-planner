---
name: debugging-code
description: Systematically identifies, analyzes, and fixes software bugs using a strict "Stop-Look-Fix-Verify" protocol. Use when the user reports an error, a crash, or unexpected behavior.
---

# Debugging Code

## When to use this skill
- User reports an error message (e.g., "Undefined is not a function", "500 Internal Server Error").
- The build or deployment fails.
- A feature is "not working" or behaving effectively.
- You see a traceback or console error in the logs.

## Workflow
1.  **STOP & READ**: Do not rush to edit code. Read the *entire* error message or log output provided by the user.
2.  **LOCATE**: Identify the specific file, function, and line number causing the issue.
    - If the file content is not known, `view_file` relevant files immediately.
3.  **ANALYZE**: Trace the execution flow.
    - *Is this null reference?*
    - *Is this a type mismatch?*
    - *Is this an import error?*
4.  **HYPOTHESIZE**: Formulate a clear hypothesis. (e.g., "The `user` object is null because the hook hasn't loaded yet").
5.  **FIX**: Apply the solution.
    - Prefer defensive coding (e.g., `user?.name` instead of `user.name`).
    - Add error handling (try/catch) if the operation is risky.
6.  **VERIFY**: Run a build check or ask the user to verify.

## Instructions

### 1. The "10-Second Rule"
Before writing a single line of code, you must be able to fill in this blank:
> "The error happens in [FILE] at line [LINE] because [REASON]. I will fix it by [ACTION]."

### 2. Common Fix Patterns

#### React: "Cannot read properties of undefined"
**Wrong:**
```javascript
return <div>{data.title}</div> // Crashes if data is loading
```
**Right:**
```javascript
if (!data) return <Loading />;
return <div>{data.title}</div>
```

#### Imports: "Module not found"
- Check relative paths (`../../components`).
- Verify `export default` vs named exports.
- Check case sensitivity (Windows/macOS file systems differ).

#### Firebase/Async: "Promise ignored"
- Ensure you `await` async calls.
- Catch errors: `.catch(console.error)`.

### 3. Verification Protocol
After applying a fix, you **MUST** attempt to verify it.
- If it's a build error: Run `npm run build`.
- If it's a runtime error: Ask the user to reload and check.

## Resources
- [React Error Boundaries](https://react.dev/reference/react-dom/client/createRoot#error-handling)
- [MDN Debugging Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Debugging)
