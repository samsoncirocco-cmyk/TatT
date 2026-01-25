# Spec Workflow MCP - Setup Instructions

To enable the Spec Workflow MCP server for this project, add the following configuration to your MCP client settings.

## Configuration Block

Run this command regarding where your project is located:
**Project Path:** `/Users/ciroccofam/Desktop/TatT`

### Claude Desktop / Cline / Claude Dev / Cursor

Add this to your `claude_desktop_config.json` or `settings.json` under `mcpServers`:

```json
{
  "spec-workflow": {
    "command": "npx",
    "args": [
      "-y",
      "@pimzino/spec-workflow-mcp@latest",
      "/Users/ciroccofam/Desktop/TatT"
    ]
  }
}
```

### Windows Users

If the above doesn't work, try:

```json
{
  "spec-workflow": {
    "command": "cmd.exe",
    "args": [
      "/c",
      "npx",
      "-y",
      "@pimzino/spec-workflow-mcp@latest",
      "/Users/ciroccofam/Desktop/TatT"
    ]
  }
}
```

## Next Steps

1. **Restart** your IDE or MCP Client.
2. Open a chat and type: `"List my specs"` to verify the connection.
