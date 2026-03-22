/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull, MoreThan, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { USER_ONLINE_THRESHOLD } from '@/const.js';
import { bindThis } from '@/decorators.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import { CacheManagementService, type ManagedMemorySingleCache } from '@/global/CacheManagementService.js';
import NotesChart from '@/core/chart/charts/notes.js';
import UsersChart from '@/core/chart/charts/users.js';
import { TimeService } from '@/global/TimeService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { QueryService } from '@/core/QueryService.js';
import type {
	DriveFilesRepository,
	FollowingsRepository,
	InstancesRepository,
	NoteReactionsRepository,
	UsersRepository,
} from '@/models/_.js';
import type Logger from '@/logger.js';
import { renderInlineError } from '@/misc/render-inline-error.js';

export interface InstanceStats {
	/**
	 * The number of local posts on the instance.
	 * Updated hourly.
	 */
	localNotes: number;

	/**
	 * The number of remote posts known to the instance.
	 * Updated hourly.
	 */
	remoteNotes: number;

	/**
	 * The number of local users currently registered on the instance.
	 * Updated hourly.
	 */
	localUsers: number;

	/**
	 * The number of local users who are currently active.
	 * Updated every USER_ONLINE_THRESHOLD (currently 10 minutes).
	 */
	localUsersOnline: number;

	/**
	 * The number of local users who have been active within the past month.
	 * Updated daily.
	 */
	localUsersThisMonth: number;

	/**
	 * The number of local users who have been active within the past 6 months.
	 * Updated weekly.
	 */
	localUsersSixMonths: number;

	/**
	 * The number of remote users known to the instance.
	 * Updated hourly.
	 */
	remoteUsers: number;

	/**
	 * The number of remote users who are currently active.
	 * Updated every USER_ONLINE_THRESHOLD (currently 10 minutes).
	 */
	remoteUsersOnline: number;

	/**
	 * The number of local and remote reactions on the instance.
	 * Updated hourly.
	 */
	totalReactions: number;

	/**
	 * The number of instances known to the instance.
	 * Updated hourly.
	 */
	totalInstances: number;

	/**
	 * The number of bytes used by remote drive files.
	 * Updated daily.
	 */
	localDriveUsage: number;

	/**
	 * The number of bytes used by local drive files.
	 * Updated daily.
	 */
	remoteDriveUsage: number;

	/**
	 * The number of remote->local follow relations. (they follow us)
	 * Updated hourly.
	 */
	pubCount: number;

	/**
	 * The number of local->remote follow relations. (we follow them)
	 * Updated hourly.
	 */
	subCount: number;
}

@Injectable()
export class InstanceStatsService {
	private readonly logger: Logger;
	private readonly postsCache: ManagedMemorySingleCache<[local: number, remote: number]>;
	private readonly usersCache: ManagedMemorySingleCache<[local: number, remote: number]>;
	private readonly localUsersOnlineCache: ManagedMemorySingleCache<number>;
	private readonly remoteUsersOnlineCache: ManagedMemorySingleCache<number>;
	private readonly localUsersThisMonthCache: ManagedMemorySingleCache<number>;
	private readonly localUsersSixMonthsCache: ManagedMemorySingleCache<number>;
	private readonly totalReactionsCache: ManagedMemorySingleCache<number>;
	private readonly totalInstancesCache: ManagedMemorySingleCache<number>;
	private readonly localDriveCache: ManagedMemorySingleCache<number>;
	private readonly remoteDriveCache: ManagedMemorySingleCache<number>;
	private readonly pubCountCache: ManagedMemorySingleCache<number>;
	private readonly subCountCache: ManagedMemorySingleCache<number>;

	constructor(
		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.noteReactionsRepository)
		private readonly noteReactionsRepository: NoteReactionsRepository,

		@Inject(DI.instancesRepository)
		private readonly instancesRepository: InstancesRepository,

		@Inject(DI.driveFilesRepository)
		private readonly driveFilesRepository: DriveFilesRepository,

		@Inject(DI.followingsRepository)
		private readonly followingsRepository: FollowingsRepository,

		private readonly notesChart: NotesChart,
		private readonly usersChart: UsersChart,
		private readonly timeService: TimeService,
		private readonly queryService: QueryService,

		cacheManagementService: CacheManagementService,
		loggerService: LoggerService,
	) {
		this.logger = loggerService.getLogger('stats');
		this.postsCache = cacheManagementService.createMemorySingleCache<[local: number, remote: number]>('postMetrics', 1000 * 60 * 60); // 1h
		this.usersCache = cacheManagementService.createMemorySingleCache<[local: number, remote: number]>('userMetrics', 1000 * 60 * 60); // 1h
		this.localUsersOnlineCache = cacheManagementService.createMemorySingleCache<number>('localUsersOnline', USER_ONLINE_THRESHOLD); // 10m
		this.remoteUsersOnlineCache = cacheManagementService.createMemorySingleCache<number>('remoteUsersOnline', USER_ONLINE_THRESHOLD); // 10m
		this.localUsersThisMonthCache = cacheManagementService.createMemorySingleCache<number>('localUsersThisMonth', 1000 * 60 * 60 * 24); // 1d
		this.localUsersSixMonthsCache = cacheManagementService.createMemorySingleCache<number>('localUsersSixMonths', 1000 * 60 * 60 * 24 * 7); // 1w
		this.totalReactionsCache = cacheManagementService.createMemorySingleCache<number>('totalReactions', 1000 * 60 * 60); // 1h
		this.totalInstancesCache = cacheManagementService.createMemorySingleCache<number>('totalInstances', 1000 * 60 * 60); // 1h
		this.localDriveCache = cacheManagementService.createMemorySingleCache<number>('localDrive', 1000 * 60 * 60 * 24); // 1d
		this.remoteDriveCache = cacheManagementService.createMemorySingleCache<number>('remoteDrive', 1000 * 60 * 60 * 24); // 1d
		this.pubCountCache = cacheManagementService.createMemorySingleCache<number>('pubCount', 1000 * 60 * 60); // 1h
		this.subCountCache = cacheManagementService.createMemorySingleCache<number>('subCount', 1000 * 60 * 60); // 1h
	}

	@bindThis
	public async fetch(): Promise<InstanceStats> {
		// Intentionally not awaited, because each promise needs to fork twice.
		const totalPosts = this.stub(this.fetchPosts, 'total posts', [0, 0])();
		const totalUsers = this.stub(this.fetchUsers, 'total users', [0, 0])();

		return awaitAll({
			localNotes: totalPosts.then(tp => tp[0]),
			remoteNotes: totalPosts.then(tp => tp[1]),
			localUsers: totalUsers.then(tu => tu[0]),
			localUsersOnline: this.stub(this.fetchLocalOnline, 'online local users', 0)(),
			localUsersThisMonth: this.stub(this.fetchActiveMonth, 'monthly users', 0)(),
			localUsersSixMonths: this.stub(this.fetchActiveSixMonths, 'six-month users', 0)(),
			remoteUsers: totalUsers.then(tu => tu[1]),
			remoteUsersOnline: this.stub(this.fetchRemoteOnline, 'online remote users', 0)(),
			totalReactions: this.stub(this.fetchTotalReactions, 'total reactions', 0)(),
			totalInstances: this.stub(this.fetchTotalInstances, 'total instances', 0)(),
			localDriveUsage: this.stub(this.fetchLocalDrive, 'local drive', 0)(),
			remoteDriveUsage: this.stub(this.fetchRemoteDrive, 'remote drive', 0)(),
			pubCount: this.stub(this.fetchPubCount, 'pub count', 0)(),
			subCount: this.stub(this.fetchSubCount, 'sub count', 0)(),
		});
	}

	@bindThis
	private async fetchActiveSixMonths(): Promise<number> {
		return await this.localUsersSixMonthsCache.fetch(async () => {
			const now = this.timeService.now;
			const halfYearAgo = new Date(now - 15552000000);
			return await this.usersRepository.countBy({
				host: IsNull(),
				isBot: false,
				lastActiveDate: MoreThan(halfYearAgo),
			});
		});
	}

	@bindThis
	private async fetchActiveMonth(): Promise<number> {
		return await this.localUsersThisMonthCache.fetch(async () => {
			const now = this.timeService.now;
			const monthAgo = new Date(now - 2592000000);
			return await this.usersRepository.countBy({
				host: IsNull(),
				isBot: false,
				lastActiveDate: MoreThan(monthAgo),
			});
		});
	}

	@bindThis
	private async fetchPosts(): Promise<[local: number, remote: number]> {
		return await this.postsCache.fetch(async () => {
			const chart = await this.notesChart.getChart('hour', 1, null);
			return [chart.local.total[0], chart.remote.total[0]];
		});
	}

	@bindThis
	private async fetchUsers(): Promise<[local: number, remote: number]> {
		return await this.usersCache.fetch(async () => {
			const chart = await this.usersChart.getChart('hour', 1, null);
			return [chart.local.total[0], chart.remote.total[0]];
		});
	}

	@bindThis
	private async fetchLocalOnline(): Promise<number> {
		return await this.localUsersOnlineCache.fetch(async () => {
			const threshold = new Date(this.timeService.now - USER_ONLINE_THRESHOLD);
			return await this.usersRepository.countBy({
				lastActiveDate: MoreThan(threshold),
				host: IsNull(),
			});
		});
	}

	@bindThis
	private async fetchRemoteOnline(): Promise<number> {
		return await this.remoteUsersOnlineCache.fetch(async () => {
			const threshold = new Date(this.timeService.now - USER_ONLINE_THRESHOLD);
			return await this.usersRepository.countBy({
				lastActiveDate: MoreThan(threshold),
				host: Not(IsNull()),
			});
		});
	}

	@bindThis
	private async fetchTotalReactions(): Promise<number> {
		return await this.totalReactionsCache.fetch(async () => {
			return await this.queryService.estimateCount(this.noteReactionsRepository);
		});
	}

	@bindThis
	private async fetchTotalInstances(): Promise<number> {
		return await this.totalInstancesCache.fetch(async () => {
			return await this.queryService.estimateCount(this.instancesRepository);
		});
	}

	@bindThis
	private async fetchLocalDrive(): Promise<number> {
		return await this.localDriveCache.fetch(async () => {
			return await this.driveFilesRepository.sum('size', { userHost: IsNull() }) ?? 0;
		});
	}

	@bindThis
	private async fetchRemoteDrive(): Promise<number> {
		return await this.remoteDriveCache.fetch(async () => {
			return await this.driveFilesRepository.sum('size', { userHost: Not(IsNull()) }) ?? 0;
		});
	}

	@bindThis
	private async fetchPubCount(): Promise<number> {
		return await this.pubCountCache.fetch(async () => {
			return await this.followingsRepository.countBy({ followerHost: Not(IsNull()) });
		});
	}

	@bindThis
	private async fetchSubCount(): Promise<number> {
		return await this.subCountCache.fetch(async () => {
			return await this.followingsRepository.countBy({ followeeHost: Not(IsNull()) });
		});
	}

	@bindThis
	private stub<T>(f: () => Promise<T>, type: string, def: T): (() => Promise<T>) {
		return async () => {
			try {
				return await f();
			} catch (err) {
				this.logger.warn(`Failed to collect stats category "${type}" - the relevant data will be zeroed out for the current cache interval. Error cause: ${renderInlineError(err)}`);
				return def;
			}
		};
	}
}
