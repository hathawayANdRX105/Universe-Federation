import { portToPid } from 'pid-port';
import fkill from 'fkill';
import Fastify from 'fastify';
import { NestFactory } from '@nestjs/core';
import { MainModule } from '@/MainModule.js';
import { ServerService } from '@/server/ServerService.js';
import type { Config } from '@/config.js';
import { NestLogger } from '@/NestLogger.js';
import { DI } from '@/di-symbols.js';
import { INestApplicationContext } from '@nestjs/common';

const originEnv = JSON.stringify(process.env);

process.env.NODE_ENV = 'test';

let app: INestApplicationContext;
let serverService: ServerService;
let alive = false;

async function bootApp(): Promise<Config> {
	app = await NestFactory.createApplicationContext(MainModule, {
		logger: new NestLogger(),
	});
	app.enableShutdownHooks();
	const config = app.get<Config>(DI.config);
	await killTestServer(config);
	console.log('starting application...');
	serverService = app.get(ServerService);
	await serverService.launch();
	alive = true;
	return config;
}

async function stopApp(): Promise<void> {
	if (!alive) return;
	alive = false;
	try { await serverService.dispose(); } catch (e) { console.warn('dispose', e); }
	try { await app.close(); } catch (e) { console.warn('close', e); }
}

async function launch() {
	const config = await bootApp();
	await startControllerEndpoints(config);
	console.log('application initialized.');
}

async function killTestServer(config: Config) {
	try {
		const pid = await portToPid(config.port);
		if (pid) await fkill(pid, { force: true });
	} catch { /* NOP */ }
}

async function startControllerEndpoints(config: Config) {
	const port = config.port + 1000;
	const fastify = Fastify();

	fastify.post<{ Body: { key?: string, value?: string } }>('/env', async (req, res) => {
		console.log(req.body);
		const key = req.body['key'];
		if (!key) {
			res.code(400).send({ success: false });
			return;
		}
		process.env[key] = req.body['value'];
		res.code(200).send({ success: true });
	});

	// Fully stop Nest so dropSchema cannot race open connections.
	fastify.post('/env-stop', async (_req, res) => {
		await stopApp();
		res.code(200).send({ success: true });
	});

	fastify.post('/env-reset', async (_req, res) => {
		// Do not reintroduce MK_TEST_KEEP_SCHEMA into the server process.
		const restored = JSON.parse(originEnv) as Record<string, string | undefined>;
		process.env = { ...restored, NODE_ENV: 'test' };
		delete process.env.MK_TEST_KEEP_SCHEMA;

		await stopApp();
		await killTestServer(config);
		await new Promise(r => setTimeout(r, 250));
		await bootApp();
		res.code(200).send({ success: true });
	});

	await fastify.listen({ port: port, host: 'localhost' });
}

export default launch;
