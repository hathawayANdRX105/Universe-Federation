/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiDriveFile } from './DriveFile.js';

export const chatRoomJoinModes = ['inviteOnly', 'open', 'closed'] as const;

export type ChatRoomJoinMode = typeof chatRoomJoinModes[number];

@Entity('chat_room')
export class MiChatRoom {
	@PrimaryColumn(id())
	public id: string;

	@Column('varchar', {
		length: 256,
	})
	public name: string;

	@Index()
	@Column({
		...id(),
	})
	public ownerId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public owner: MiUser | null;

	@Column('varchar', {
		length: 2048, default: '',
	})
	public description: string;

	@Index()
	@Column({
		...id(),
		nullable: true,
	})
	public avatarId: MiDriveFile['id'] | null;

	@ManyToOne(type => MiDriveFile, {
		onDelete: 'SET NULL',
	})
	@JoinColumn()
	public avatar: MiDriveFile | null;

	// avatarId が null でない場合のみ有効
	@Column('varchar', {
		length: 512, nullable: true,
	})
	public avatarUrl: string | null;

	@Column('boolean', {
		default: false,
	})
	public isSilenced: boolean;

	@Column('varchar', {
		length: 2048, default: '',
	})
	public announcement: string;

	@Column('boolean', {
		default: false,
	})
	public announcementPinned: boolean;

	@Column('boolean', {
		default: false,
	})
	public isArchived: boolean;

	@Column('varchar', {
		length: 32, default: 'inviteOnly',
	})
	public joinMode: ChatRoomJoinMode;

	@Column('integer', {
		nullable: true,
	})
	public memberLimitOverride: number | null;

	@Column('integer', {
		nullable: true,
	})
	public messageRetentionDays: number | null;
}
