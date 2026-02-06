# Supabase MCP Setup for TatT

This guide explains how to configure the Supabase Model Context Protocol (MCP) server for use with Cursor.

## Overview

The Supabase MCP enables AI assistants (like Cursor) to interact with your Supabase project, allowing you to:
- Query your database through natural language
- Manage tables and schemas
- View and manage project settings
- Interact with your Supabase resources directly from Cursor

## Setup Instructions

### Option 1: Using Supabase's Hosted MCP Server (Recommended)

1. **Open Cursor Settings**
   - Go to Cursor Settings (Cmd/Ctrl + ,)
   - Navigate to "Features" → "Model Context Protocol" or "MCP Servers"

2. **Add Supabase MCP Server**
   - Click "Add Server" or "Configure MCP Servers"
   - Use the following configuration:

   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```

3. **Authenticate**
   - When prompted, log in to your Supabase account
   - Select your organization: `qfehpvedicyutujuzjwq`
   - Authorize Cursor to access your Supabase projects

4. **Verify Connection**
   - Test the connection by asking Cursor to list your Supabase projects
   - Example: "List my Supabase projects" or "Show me tables in my Supabase database"

### Option 2: Using Environment Variables (For Manual Authentication)

If you need to use a Personal Access Token (PAT) instead of OAuth:

1. Generate a Personal Access Token in Supabase:
   - Go to https://supabase.com/dashboard/account/tokens
   - Create a new token with appropriate scopes

2. Configure the MCP server with authentication header:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_PERSONAL_ACCESS_TOKEN"
         }
       }
     }
   }
   ```

## Your Supabase Project

- **Organization ID**: `qfehpvedicyutujuzjwq`
- **Dashboard URL**: https://supabase.com/dashboard/org/qfehpvedicyutujuzjwq

## Security Best Practices

⚠️ **Important Security Considerations:**

1. **Review Permissions**: The MCP server will have access to your Supabase projects. Ensure you understand what actions the AI assistant can perform.

2. **Use Least Privilege**: Only grant necessary permissions to the MCP server.

3. **Monitor Usage**: Regularly review activity logs in your Supabase dashboard.

4. **Project Isolation**: Consider using a separate Supabase project for development/testing if you're concerned about production data access.

## Testing the Integration

Once configured, you can test the integration with commands like:

- "List all tables in my Supabase database"
- "Show me the schema for the users table"
- "What projects do I have in Supabase?"
- "Create a new table called designs with columns..."

## Troubleshooting

- **Authentication Fails**: Make sure you're logged into the correct Supabase account and organization
- **Connection Errors**: Verify the MCP server URL is correct: `https://mcp.supabase.com/mcp`
- **Permission Errors**: Check that your account has appropriate permissions in the Supabase organization

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/mcp)
- [Supabase MCP GitHub Repository](https://github.com/supabase-community/supabase-mcp)
- [Cursor MCP Documentation](https://docs.cursor.com)

