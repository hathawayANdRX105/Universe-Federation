/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { apiAccessGrantStatuses, type ApiAccessGrantStatus } from '@/const.js';
import { id } from './util/id.js';
import { MiUser } from './User.js';

@Entity('api_access_grant')
@Index(['userId'], { unique: true })
export class MiApiAccessGrant {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('timestamp with time zone')
	public createdAt: Date;

	@Index()
	@Column('timestamp with time zone')
	public updatedAt: Date;

	@Index()
	@Column({
		...id(),
	})
	public userId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@Index()
	@Column('enum', {
		enum: apiAccessGrantStatuses,
		enumName: 'api_access_grant_status_enum',
		default: 'pending',
	})
	public status: ApiAccessGrantStatus;

	@Column('text', {
		nullable: true,
	})
	public reason: string | null;

	@Column({
		...id(),
		nullable: true,
	})
	public reviewerId: MiUser['id'] | null;

	@ManyToOne(type => MiUser, {
		onDelete: 'SET NULL',
		nullable: true,
	})
	@JoinColumn()
	public reviewer: MiUser | null;

	@Column('timestamp with time zone', {
		nullable: true,
	})
	public reviewedAt: Date | null;

	@Column('text', {
		nullable: true,
	})
	public reviewNote: string | null;
}
