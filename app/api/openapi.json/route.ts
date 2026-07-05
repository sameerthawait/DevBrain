import { withLogging } from "@/lib/request-handler";

const openApiSpecification = {
  openapi: "3.0.0",
  info: {
    title: "DevBrain Core API Specification",
    version: "1.0.0",
    description: "Production-ready API endpoints for DevBrain knowledge base, ingestion, search, and chat workflows.",
  },
  paths: {
    "/api/search": {
      get: {
        summary: "Execute hybrid vector search",
        description: "Queries the vector knowledge base using cosine similarity and metadata filters.",
        parameters: [
          { name: "query", in: "query", required: true, schema: { type: "string" } },
          { name: "projectId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 10 } },
          { name: "offset", in: "query", required: false, schema: { type: "integer", default: 0 } },
        ],
        responses: {
          200: {
            description: "Successful search execution",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        query: { type: "string" },
                        count: { type: "integer" },
                        results: { type: "array", items: { type: "object" } }
                      }
                    },
                    requestId: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/chat": {
      post: {
        summary: "Initialize streaming chat",
        description: "Post a query to trigger LangGraph agent reasoning and progressive SSE token streaming response.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query"],
                properties: {
                  query: { type: "string" },
                  conversationId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Progressive SSE stream initiated",
            content: {
              "text/event-stream": {
                schema: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};

async function openApiHandler(): Promise<Response> {
  return new Response(JSON.stringify(openApiSpecification, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const GET = withLogging(openApiHandler);
