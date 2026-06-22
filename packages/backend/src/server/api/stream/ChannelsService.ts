/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { HybridTimelineChannelService } from './channels/hybrid-timeline.js';
import { LocalTimelineChannelService } from './channels/local-timeline.js';
import { HomeTimelineChannelService } from './channels/home-timeline.js';
import { BubbleTimelineChannelService } from './channels/bubble-timeline.js';
import { GlobalTimelineChannelService } from './channels/global-timeline.js';
import { MainChannelService } from './channels/main.js';
import { ChannelChannelService } from './channels/channel.js';
import { AdminChannelService } from './channels/admin.js';
import { ServerStatsChannelService } from './channels/server-stats.js';
import { QueueStatsChannelService } from './channels/queue-stats.js';
import { UserListChannelService } from './channels/user-list.js';
import { AntennaChannelService } from './channels/antenna.js';
import { DriveChannelService } from './channels/drive.js';
import { HashtagChannelService } from './channels/hashtag.js';
import { RoleTimelineChannelService } from './channels/role-timeline.js';
import { ChatUserChannelService } from './channels/chat-user.js';
import { ChatRoomChannelService } from './channels/chat-room.js';
import { ReversiChannelService } from './channels/reversi.js';
import { ReversiGameChannelService } from './channels/reversi-game.js';
import { type MiChannelService } from './channel.js';

@Injectable()
export class ChannelsService {
	constructor(
		private mainChannelService: MainChannelService,
		private homeTimelineChannelService: HomeTimelineChannelService,
		private localTimelineChannelService: LocalTimelineChannelService,
		private hybridTimelineChannelService: HybridTimelineChannelService,
		private globalTimelineChannelService: GlobalTimelineChannelService,
		private bubbleTimelineChannelService: BubbleTimelineChannelService,
		private userListChannelService: UserListChannelService,
		private hashtagChannelService: HashtagChannelService,
		private roleTimelineChannelService: RoleTimelineChannelService,
		private antennaChannelService: AntennaChannelService,
		private channelChannelService: ChannelChannelService,
		private driveChannelService: DriveChannelService,
		private serverStatsChannelService: ServerStatsChannelService,
		private queueStatsChannelService: QueueStatsChannelService,
		private adminChannelService: AdminChannelService,
		private chatUserChannelService: ChatUserChannelService,
		private chatRoomChannelService: ChatRoomChannelService,
		private reversiChannelService: ReversiChannelService,
		private reversiGameChannelService: ReversiGameChannelService,
	) {
	}

	@bindThis
	public getChannelService(name: string): MiChannelService<boolean> {
		switch (name) {
			case 'main': return this.mainChannelService;
			case 'homeTimeline': return this.homeTimelineChannelService;
			case 'localTimeline': return this.localTimelineChannelService;
			case 'hybridTimeline': return this.hybridTimelineChannelService;
			case 'globalTimeline': return this.globalTimelineChannelService;
			case 'bubbleTimeline': return this.bubbleTimelineChannelService;
			case 'userList': return this.userListChannelService;
			case 'hashtag': return this.hashtagChannelService;
			case 'roleTimeline': return this.roleTimelineChannelService;
			case 'antenna': return this.antennaChannelService;
			case 'channel': return this.channelChannelService;
			case 'drive': return this.driveChannelService;
			case 'serverStats': return this.serverStatsChannelService;
			case 'queueStats': return this.queueStatsChannelService;
			case 'admin': return this.adminChannelService;
			case 'chatUser': return this.chatUserChannelService;
			case 'chatRoom': return this.chatRoomChannelService;
			case 'reversi': return this.reversiChannelService;
			case 'reversiGame': return this.reversiGameChannelService;

			// legacy:老 Misskey 客户端用的(messaging / messagingIndex / chat),
			// 早就改名成 chatUser / chatRoom 了。给一个 no-op stub,避免每次连进来都抛 Unhandled rejection 刷日志。
			// 客户端拿不到事件会自动 fallback 到 HTTP,不影响功能。
			case 'chat':
			case 'messaging':
			case 'messagingIndex': return new LegacyChannelStub();

			default:
				throw new Error(`no such channel: ${name}`);
		}
	}
}

/** 老 Misskey 客户端的 channel 名兼容 stub。init 返回 false 让 WS 友好拒绝,不抛错。 */
class LegacyChannelStub implements MiChannelService<false> {
	public readonly shouldShare = false;
	public readonly requireCredential = false as const;
	public readonly kind = null;
	public create(_id: string, _connection: any): any {
		return {
			chName: 'legacy-stub',
			init: async () => false,
			dispose: () => {},
			onMessage: () => {},
		};
	}
}
