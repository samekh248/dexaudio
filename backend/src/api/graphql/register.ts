import type { FastifyInstance } from "fastify";
import { typeDefs } from "./schema.js";
import { createResolvers } from "./resolvers.js";

export async function registerGraphql(app: FastifyInstance) {
  const { ApolloServer } = await import("@apollo/server");
  const server = new ApolloServer({
    typeDefs,
    resolvers: createResolvers(app),
  });
  await server.start();

  app.post("/graphql", async (request, reply) => {
    const body = request.body as { query?: string; variables?: Record<string, unknown> };
    const result = await server.executeOperation({
      query: body.query,
      variables: body.variables,
    });
    return reply.send(result);
  });
}
