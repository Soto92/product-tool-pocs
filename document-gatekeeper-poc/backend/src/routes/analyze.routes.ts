import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { analyzeFile } from '../services/pipeline.service.js';
import { generateSample, SampleType } from '../utils/redTeamGenerator.js';

export async function registerAnalyzeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file({
        limits: { fileSize: 15 * 1024 * 1024 }
      });
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      const buffer = await data.toBuffer();
      const originalName = data.filename || 'uploaded-file';
      const declaredMime = data.mimetype || 'application/octet-stream';
      const report = await analyzeFile(buffer, originalName, declaredMime);
      return reply.send(report);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message || 'Internal server error' });
    }
  });

  fastify.post('/api/v1/simulate/:sampleType', async (request: FastifyRequest<{ Params: { sampleType: SampleType } }>, reply: FastifyReply) => {
    try {
      const sampleType = request.params.sampleType;
      const sample = await generateSample(sampleType);
      const report = await analyzeFile(sample.buffer, sample.filename, sample.mime);
      const base64 = sample.buffer.toString('base64');
      const downloadLink = `data:${sample.mime};base64,${base64}`;
      return reply.send({ ...report, downloadLink });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message || 'Internal server error' });
    }
  });

  fastify.get('/api/v1/samples/:sampleType', async (request: FastifyRequest<{ Params: { sampleType: SampleType } }>, reply: FastifyReply) => {
    try {
      const sampleType = request.params.sampleType;
      const sample = await generateSample(sampleType);
      reply.header('Content-Type', sample.mime);
      reply.header('Content-Disposition', `attachment; filename="${sample.filename}"`);
      return reply.send(sample.buffer);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message || 'Internal server error' });
    }
  });
}