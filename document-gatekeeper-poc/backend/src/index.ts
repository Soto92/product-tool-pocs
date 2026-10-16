import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerAnalyzeRoutes } from './routes/analyze.routes.js';

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors, {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS']
  });
  await fastify.register(multipart);
  await fastify.register(registerAnalyzeRoutes);

  try {
    await fastify.listen({ port: 3001, host: 'localhost' });
    console.log('Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();