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
let booted = false;

async function bootApp(): Promise<void> {
	app = await NestFactory.createApplicationContext(MainModule, {
		logger: new NestLogger(),
	});
	app.enableShutdownHooks();
	const config = app.get<Config>(DI.config);
	await killTestServer(config);
	console.log('starting application...');
	serverService = app.get(ServerService);
	await serverService.launch();
	booted = true;
}

async function stopApp(): Promise<void> {
	if (!booted) return;
	booted = false;
	try {
		await serverService.dispose();
	} catch (e) {
		console.warn('serverService.dispose', e);
	}
	try {
		await app.close();
	} catch (e) {
		console.warn('app.close', e);
	}
}

/**
 * テスト用のサーバインスタンスを起動する
 */
async function launch() {
	await bootApp();
	const config = app.get<Config>(DI.config);
	await startControllerEndpoints(config);

	// After first successful boot, external drops own schema reset; Nest relaunch must not dropSchema again.
	process.env.MK_TEST_KEEP_SCHEMA = '1';

	// ジョブキューは必要な時にテストコード側で起動する
	// ジョブキューが動くとテスト結果の確認に支障が出ることがあるので意図的に動かさないでいる

	console.log('application initialized.');
}

async function killTestServer(config: Config) {
	try {
		const pid = await portToPid(config.port);
		if (pid) {
			await fkill(pid, { force: true });
		}
	} catch {
		// NOP;
	}
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

	// Fully stop Nest so a client can dropSchema without racing open connections.
	fastify.post('/env-stop', async (_req, res) => {
		await stopApp();
		res.code(200).send({ success: true });
	});

	fastify.post('/env-reset', async (_req, res) => {
		const keep = process.env.MK_TEST_KEEP_SCHEMA;
		process.env = JSON.parse(originEnv);
		process.env.NODE_ENV = 'test';
		// Keep schema flag so relaunch synchronize-only after external drop.
		process.env.MK_TEST_KEEP_SCHEMA = keep ?? '1';

		await stopApp();
		await killTestServer(config);
		// brief settle for postgres connections
		await new Promise(r => setTimeout(r, 200));
		await bootApp();
		res.code(200).send({ success: true });
	});

	await fastify.listen({ port: port, host: 'localhost' });
}

export default launch;
