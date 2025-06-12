import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from 'axios';
import { z } from 'zod';

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
    'search_modules',
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
        },
        role: { type: 'string', description: 'Target role', optional: true },
        product: { type: 'string', description: 'Related product', optional: true }
      }
    },
    async (params) => {
      const response = await axios.get(BASE_URL, {
        params: {
          type: 'modules',
          ...params
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data.error) {
        return {
          type: 'error',
          message: response.data.error
        };
      }

      return {
        type: 'text',
        text: `Found ${response.data.modules?.length || 0} modules matching your criteria.`,
        modules: response.data.modules?.map((m: LearnModule) => ({
          title: m.title,
          summary: m.summary,
          duration: m.duration_in_minutes,
          url: m.url
        }))
      };
    }
  );

  // Get module details tool
  server.tool(
    'get_module',
    'Get details for a specific module',
    z.object({
      uid: z.string().describe('Module unique identifier')
    }),
    async (params) => {
      const response = await axios.get(`${BASE_URL}/modules/${params.uid}`);
      return {
        type: 'text',
        text: `Module details for ${response.data.title}`,
        module: response.data
      };
    }
  );
}