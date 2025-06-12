import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from 'axios';

const BASE_URL = 'https://learn.microsoft.com/api/catalog';

interface LearnModule {
  uid: string;
  title: string;
  summary: string;
  duration_in_minutes: number;
  levels: string[];
  roles: string[];
  products: string[];
  url: string;
}

export default function registerCatalog(server: McpServer) {
  // Search modules tool
  server.tool(
    'search-modules',
    'Search Microsoft Learn modules',
    {
      parameters: {
        query: { type: 'string', description: 'Search query' },
        locale: { type: 'string', description: 'Content locale', default: 'en-us' },
        level: { 
          type: 'string', 
          description: 'Difficulty level',
          enum: ['beginner', 'intermediate', 'advanced'],
          optional: true 
        }
      }
    },
    async (params) => {
      try {
        const response = await axios.get(BASE_URL, {
          params: { ...params, type: 'modules' },
          headers: { 'Accept': 'application/json' }
        });
        
        return {
          type: 'text',
          text: `Found ${response.data.length} modules`,
          data: response.data
        };
      } catch (error) {
        return {
          type: 'error',
          text: 'Error fetching modules'
        };
      }
    }
  );

  // Get learning paths tool
  server.tool(
    'get-learning-paths',
    'Get Microsoft Learning Paths',
    {
      parameters: {
        locale: { type: 'string', description: 'Content locale', default: 'en-us' },
        role: { type: 'string', description: 'Target role', optional: true }
      }
    },
    async (params) => {
      try {
        const response = await axios.get(BASE_URL, {
          params: { ...params, type: 'learningPaths' },
          headers: { 'Accept': 'application/json' }
        });
        
        return {
          type: 'text',
          text: `Found ${response.data.length} learning paths`,
          data: response.data
        };
      } catch (error) {
        return {
          type: 'error',
          text: 'Error fetching learning paths'
        };
      }
    }
  );
}