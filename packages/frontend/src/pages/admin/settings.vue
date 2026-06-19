<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-info-circle"></i></template>
				<template #label>{{ i18n.ts.info }}</template>
				<template v-if="infoForm.modified.value" #footer>
					<MkFormFooter :form="infoForm"/>
				</template>

				<div class="_gaps">
					<MkInput v-model="infoForm.state.name">
						<template #label>{{ i18n.ts.instanceName }}<span v-if="infoForm.modifiedStates.name" class="_modified">{{ i18n.ts.modified }}</span></template>
					</MkInput>

					<MkInput v-model="infoForm.state.shortName">
						<template #label>{{ i18n.ts._serverSettings.shortName }} ({{ i18n.ts.optional }})<span v-if="infoForm.modifiedStates.shortName" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts._serverSettings.shortNameDescription }}</template>
					</MkInput>

					<MkTextarea v-model="infoForm.state.description">
						<template #label>{{ i18n.ts.instanceDescription }}<span v-if="infoForm.modifiedStates.description" class="_modified">{{ i18n.ts.modified }}</span></template>
					</MkTextarea>

					<MkTextarea v-model="infoForm.state.about">
						<template #label>{{ i18n.ts._serverSettings.aboutInstance }}<span v-if="infoForm.modifiedStates.about" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts._serverSettings.aboutInstanceDescription }}</template>

					</MkTextarea>

					<FormSplit :minWidth="300">
						<MkInput v-model="infoForm.state.maintainerName">
							<template #label>{{ i18n.ts.maintainerName }}<span v-if="infoForm.modifiedStates.maintainerName" class="_modified">{{ i18n.ts.modified }}</span></template>
						</MkInput>

						<MkInput v-model="infoForm.state.maintainerEmail" type="email">
							<template #label>{{ i18n.ts.maintainerEmail }}<span v-if="infoForm.modifiedStates.maintainerEmail" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #prefix><i class="ti ti-mail"></i></template>
						</MkInput>
					</FormSplit>

					<MkInput v-model="infoForm.state.tosUrl" type="url">
						<template #label>{{ i18n.ts.tosUrl }}<span v-if="infoForm.modifiedStates.tosUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #prefix><i class="ti ti-link"></i></template>
					</MkInput>

					<MkInput v-model="infoForm.state.privacyPolicyUrl" type="url">
						<template #label>{{ i18n.ts.privacyPolicyUrl }}<span v-if="infoForm.modifiedStates.privacyPolicyUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #prefix><i class="ti ti-link"></i></template>
					</MkInput>

					<MkInput v-model="infoForm.state.inquiryUrl" type="url">
						<template #label>{{ i18n.ts._serverSettings.inquiryUrl }}<span v-if="infoForm.modifiedStates.inquiryUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts._serverSettings.inquiryUrlDescription }}</template>
						<template #prefix><i class="ti ti-link"></i></template>
					</MkInput>

					<MkInput v-model="infoForm.state.repositoryUrl" type="url">
						<template #label>{{ i18n.ts.repositoryUrl }}<span v-if="infoForm.modifiedStates.repositoryUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.repositoryUrlDescription }}</template>
						<template #prefix><i class="ti ti-link"></i></template>
					</MkInput>

					<MkInfo v-if="!instance.providesTarball && !infoForm.state.repositoryUrl" warn>
						{{ i18n.ts.repositoryUrlOrTarballRequired }}
					</MkInfo>

					<MkInput v-model="infoForm.state.impressumUrl" type="url">
						<template #label>{{ i18n.ts.impressumUrl }}<span v-if="infoForm.modifiedStates.impressumUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.impressumDescription }}</template>
						<template #prefix><i class="ti ti-link"></i></template>
					</MkInput>

				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-user-star"></i></template>
				<template #label>{{ i18n.ts.pinnedUsers }}</template>
				<template v-if="pinnedUsersForm.modified.value" #footer>
					<MkFormFooter :form="pinnedUsersForm"/>
				</template>

				<MkTextarea v-model="pinnedUsersForm.state.pinnedUsers">
					<template #label>{{ i18n.ts.pinnedUsers }}<span v-if="pinnedUsersForm.modifiedStates.pinnedUsers" class="_modified">{{ i18n.ts.modified }}</span></template>
					<template #caption>{{ i18n.ts.pinnedUsersDescription }}</template>
				</MkTextarea>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-cloud"></i></template>
				<template #label>{{ i18n.ts.files }}</template>
				<template v-if="filesForm.modified.value" #footer>
					<MkFormFooter :form="filesForm"/>
				</template>

				<div class="_gaps">
					<MkSwitch v-model="filesForm.state.cacheRemoteFiles">
						<template #label>{{ i18n.ts.cacheRemoteFiles }}<span v-if="filesForm.modifiedStates.cacheRemoteFiles" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.cacheRemoteFilesDescription }}{{ i18n.ts.youCanCleanRemoteFilesCache }}</template>
					</MkSwitch>

					<template v-if="filesForm.state.cacheRemoteFiles">
						<MkSwitch v-model="filesForm.state.cacheRemoteSensitiveFiles">
							<template #label>{{ i18n.ts.cacheRemoteSensitiveFiles }}<span v-if="filesForm.modifiedStates.cacheRemoteSensitiveFiles" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts.cacheRemoteSensitiveFilesDescription }}</template>
						</MkSwitch>
					</template>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-world-cog"></i></template>
				<template #label>ServiceWorker</template>
				<template v-if="serviceWorkerForm.modified.value" #footer>
					<MkFormFooter :form="serviceWorkerForm"/>
				</template>

				<div class="_gaps">
					<MkSwitch v-model="serviceWorkerForm.state.enableServiceWorker">
						<template #label>{{ i18n.ts.enableServiceworker }}<span v-if="serviceWorkerForm.modifiedStates.enableServiceWorker" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.serviceworkerInfo }}</template>
					</MkSwitch>

					<template v-if="serviceWorkerForm.state.enableServiceWorker">
						<MkInput v-model="serviceWorkerForm.state.swPublicKey">
							<template #label>Public key<span v-if="serviceWorkerForm.modifiedStates.swPublicKey" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #prefix><i class="ti ti-key"></i></template>
						</MkInput>

						<MkInput v-model="serviceWorkerForm.state.swPrivateKey">
							<template #label>Private key<span v-if="serviceWorkerForm.modifiedStates.swPrivateKey" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #prefix><i class="ti ti-key"></i></template>
						</MkInput>

						<MkButton primary @click="genKeys">{{ i18n.ts.genKeys }}</MkButton>
					</template>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ph-faders ph-bold ph-lg ti-fw"></i></template>
				<template #label>{{ i18n.ts.otherSettings }}</template>
				<template v-if="otherForm.modified.value" #footer>
					<MkFormFooter :form="otherForm"/>
				</template>

				<div class="_gaps">
					<MkSwitch v-model="otherForm.state.enableAchievements">
						<template #label>{{ i18n.ts.enableAchievements }}<span v-if="otherForm.modifiedStates.enableAchievements" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.turnOffAchievements}}</template>
					</MkSwitch>

					<MkSwitch v-model="otherForm.state.enableBotTrending">
						<template #label>{{ i18n.ts.enableBotTrending }}<span v-if="otherForm.modifiedStates.enableBotTrending" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.turnOffBotTrending }}</template>
					</MkSwitch>

					<MkTextarea v-model="otherForm.state.robotsTxt">
						<template #label>{{ i18n.ts.robotsTxt }}<span v-if="otherForm.modifiedStates.robotsTxt" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.robotsTxtDescription }}</template>
					</MkTextarea>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-ad"></i></template>
				<template #label>{{ i18n.ts._ad.adsSettings }}</template>
				<template v-if="adForm.modified.value" #footer>
					<MkFormFooter :form="adForm"/>
				</template>

				<div class="_gaps">
					<div class="_gaps_s">
						<MkInput v-model="adForm.state.notesPerOneAd" :min="0" type="number">
							<template #label>{{ i18n.ts._ad.notesPerOneAd }}<span v-if="adForm.modifiedStates.notesPerOneAd" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts._ad.setZeroToDisable }}</template>
						</MkInput>
						<MkInfo v-if="adForm.state.notesPerOneAd > 0 && adForm.state.notesPerOneAd < 20" :warn="true">
							{{ i18n.ts._ad.adsTooClose }}
						</MkInfo>
					</div>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-world-search"></i></template>
				<template #label>{{ i18n.ts._urlPreviewSetting.title }}</template>
				<template v-if="urlPreviewForm.modified.value" #footer>
					<MkFormFooter :form="urlPreviewForm"/>
				</template>

				<div class="_gaps">
					<MkSwitch v-model="urlPreviewForm.state.urlPreviewEnabled">
						<template #label>{{ i18n.ts._urlPreviewSetting.enable }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewEnabled" class="_modified">{{ i18n.ts.modified }}</span></template>
					</MkSwitch>

					<template v-if="urlPreviewForm.state.urlPreviewEnabled">
						<MkSwitch v-model="urlPreviewForm.state.urlPreviewRequireContentLength">
							<template #label>{{ i18n.ts._urlPreviewSetting.requireContentLength }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewRequireContentLength" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts._urlPreviewSetting.requireContentLengthDescription }}</template>
						</MkSwitch>

						<MkInput v-model="urlPreviewForm.state.urlPreviewMaximumContentLength" type="number">
							<template #label>{{ i18n.ts._urlPreviewSetting.maximumContentLength }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewMaximumContentLength" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts._urlPreviewSetting.maximumContentLengthDescription }}</template>
						</MkInput>

						<MkInput v-model="urlPreviewForm.state.urlPreviewTimeout" type="number">
							<template #label>{{ i18n.ts._urlPreviewSetting.timeout }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewTimeout" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts._urlPreviewSetting.timeoutDescription }}</template>
						</MkInput>

						<MkInput v-model="urlPreviewForm.state.urlPreviewUserAgent" type="text">
							<template #label>{{ i18n.ts._urlPreviewSetting.userAgent }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewUserAgent" class="_modified">{{ i18n.ts.modified }}</span></template>
							<template #caption>{{ i18n.ts._urlPreviewSetting.userAgentDescription }}</template>
						</MkInput>

						<MkRadios v-model="urlPreviewForm.state.urlPreviewProxyMode">
							<template #label>{{ i18n.ts._urlPreviewSetting.proxyMode }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewProxyMode" class="_modified">{{ i18n.ts.modified }}</span></template>
							<option value="outbound">{{ i18n.ts._urlPreviewSetting.proxyModeOutbound }}</option>
							<option value="summaly">{{ i18n.ts._urlPreviewSetting.proxyModeSummaly }}</option>
							<option value="direct">{{ i18n.ts._urlPreviewSetting.proxyModeDirect }}</option>
						</MkRadios>

						<MkInfo v-if="urlPreviewProxyHighRisk" warn>
							{{ i18n.ts._urlPreviewSetting.outboundProxyRequired }}
						</MkInfo>

						<div v-if="urlPreviewForm.state.urlPreviewProxyMode === 'summaly'">
							<MkInput v-model="urlPreviewForm.state.urlPreviewSummaryProxyUrl" type="text">
								<template #label>{{ i18n.ts._urlPreviewSetting.summaryProxy }}<span v-if="urlPreviewForm.modifiedStates.urlPreviewSummaryProxyUrl" class="_modified">{{ i18n.ts.modified }}</span></template>
								<template #caption>[{{ i18n.ts.notUsePleaseLeaveBlank }}] {{ i18n.ts._urlPreviewSetting.summaryProxyDescription }}</template>
							</MkInput>

							<div :class="$style.subCaption">
								{{ i18n.ts._urlPreviewSetting.summaryProxyDescription2 }}
								<ul style="padding-left: 20px; margin: 4px 0">
									<li>{{ i18n.ts._urlPreviewSetting.timeout }} / key:timeout</li>
									<li>{{ i18n.ts._urlPreviewSetting.maximumContentLength }} / key:contentLengthLimit</li>
									<li>{{ i18n.ts._urlPreviewSetting.requireContentLength }} / key:contentLengthRequired</li>
									<li>{{ i18n.ts._urlPreviewSetting.userAgent }} / key:userAgent</li>
								</ul>
							</div>
						</div>

						<MkFolder v-if="urlPreviewForm.state.urlPreviewProxyMode === 'outbound'" :defaultOpen="true">
							<template #icon><i class="ti ti-route"></i></template>
							<template #label>{{ i18n.ts._urlPreviewSetting.outboundProxies }}</template>
							<template #suffix>{{ urlPreviewEnabledProxyCount }}</template>
							<template #footer>
								<div class="_buttons">
									<MkButton rounded @click="addUrlPreviewProxy"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
									<MkButton rounded :wait="urlPreviewProxyTestingAll" :disabled="urlPreviewForm.state.urlPreviewOutboundProxies.length === 0" @click="testAllUrlPreviewProxies"><i class="ti ti-plug-connected"></i> {{ i18n.ts._urlPreviewSetting.testAllProxies }}</MkButton>
								</div>
							</template>

							<div class="_gaps">
								<FormSplit :minWidth="220">
									<MkInput v-model="urlPreviewProxyRawInput" type="text">
										<template #label>{{ i18n.ts._urlPreviewSetting.quickAddProxy }}</template>
										<template #caption>{{ i18n.ts._urlPreviewSetting.quickAddProxyCaption }}</template>
									</MkInput>
									<div :class="$style.proxyQuickAddAction">
										<MkButton rounded :disabled="urlPreviewProxyRawInput.trim() === ''" @click="addUrlPreviewProxyFromInput"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
									</div>
								</FormSplit>

								<div v-for="(proxy, index) in urlPreviewForm.state.urlPreviewOutboundProxies" :key="proxy.id" v-panel :class="$style.proxyCard">
									<div :class="$style.proxyCardHeader">
										<MkSwitch v-model="proxy.isEnabled">
											<template #label>{{ proxy.name || `${proxy.host}:${proxy.port}` }}</template>
										</MkSwitch>
										<div :class="$style.proxyActions">
											<MkButton rounded :disabled="index === 0" @click="moveUrlPreviewProxy(index, -1)"><i class="ti ti-arrow-up"></i></MkButton>
											<MkButton rounded :disabled="index === urlPreviewForm.state.urlPreviewOutboundProxies.length - 1" @click="moveUrlPreviewProxy(index, 1)"><i class="ti ti-arrow-down"></i></MkButton>
											<MkButton rounded :wait="proxy.testing" @click="testUrlPreviewProxy(proxy)"><i class="ti ti-plug-connected"></i> {{ i18n.ts._urlPreviewSetting.testProxy }}</MkButton>
											<MkButton danger rounded @click="removeUrlPreviewProxy(index)"><i class="ti ti-trash"></i></MkButton>
										</div>
									</div>

									<div class="_gaps_s">
										<FormSplit :minWidth="220">
											<MkInput v-model="proxy.name" small>
												<template #label>{{ i18n.ts.name }}</template>
											</MkInput>
											<MkSelect v-model="proxy.type" :items="urlPreviewProxyTypeItems" small>
												<template #label>{{ i18n.ts.type }}</template>
											</MkSelect>
										</FormSplit>

										<FormSplit :minWidth="180">
											<MkInput v-model="proxy.host" small>
												<template #label>{{ i18n.ts.host }}</template>
											</MkInput>
											<MkInput v-model="proxy.port" small type="number" :min="1" :max="65535">
												<template #label>{{ i18n.ts._urlPreviewSetting.proxyPort }}</template>
											</MkInput>
										</FormSplit>

										<FormSplit :minWidth="220">
											<MkInput v-model="proxy.username" small>
												<template #label>{{ i18n.ts.username }}</template>
											</MkInput>
											<MkInput v-model="proxy.password" small type="password">
												<template #label>{{ i18n.ts.password }}<span v-if="proxy.passwordSet && !proxy.clearPassword"> ({{ i18n.ts._urlPreviewSetting.passwordSet }})</span></template>
												<template #caption>{{ proxy.passwordSet && !proxy.clearPassword ? i18n.ts._urlPreviewSetting.passwordKeep : i18n.ts._urlPreviewSetting.passwordCaption }}</template>
											</MkInput>
										</FormSplit>

										<div v-if="proxy.passwordSet" class="_buttons">
											<MkButton v-if="!proxy.clearPassword" rounded @click="proxy.clearPassword = true; proxy.password = ''"><i class="ti ti-key-off"></i> {{ i18n.ts._urlPreviewSetting.clearPassword }}</MkButton>
											<MkButton v-else rounded @click="proxy.clearPassword = false"><i class="ti ti-key"></i> {{ i18n.ts._urlPreviewSetting.keepPassword }}</MkButton>
										</div>

										<MkInfo v-if="proxy.testResult != null" :warn="!proxy.testResult.ok">
											<span v-if="proxy.testResult.ok">{{ i18n.ts._urlPreviewSetting.proxyTestOk }}: {{ proxy.testResult.outboundIp ?? '-' }} / {{ proxy.testResult.elapsedMs }}ms</span>
											<span v-else>{{ i18n.ts._urlPreviewSetting.proxyTestFailed }}: {{ proxy.testResult.error ?? '-' }}</span>
										</MkInfo>
									</div>
								</div>
							</div>
						</MkFolder>
					</template>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-planet"></i></template>
				<template #label>{{ i18n.ts.federation }}</template>
				<template v-if="federationForm.savedState.federation === 'all'" #suffix>{{ i18n.ts.all }}</template>
				<template v-else-if="federationForm.savedState.federation === 'specified'" #suffix>{{ i18n.ts.specifyHost }}</template>
				<template v-else-if="federationForm.savedState.federation === 'none'" #suffix>{{ i18n.ts.none }}</template>
				<template v-if="federationForm.modified.value" #footer>
					<MkFormFooter :form="federationForm"/>
				</template>

				<div class="_gaps">
					<MkRadios v-model="federationForm.state.federation">
						<template #label>{{ i18n.ts.behavior }}<span v-if="federationForm.modifiedStates.federation" class="_modified">{{ i18n.ts.modified }}</span></template>
						<option value="all">{{ i18n.ts.all }}</option>
						<option value="specified">{{ i18n.ts.specifyHost }}</option>
						<option value="none">{{ i18n.ts.none }}</option>
					</MkRadios>

					<MkTextarea v-if="federationForm.state.federation === 'specified'" v-model="federationForm.state.federationHosts">
						<template #label>{{ i18n.ts.federationAllowedHosts }}<span v-if="federationForm.modifiedStates.federationHosts" class="_modified">{{ i18n.ts.modified }}</span></template>
						<template #caption>{{ i18n.ts.federationAllowedHostsDescription }}</template>
					</MkTextarea>

					<MkFolder>
						<template #icon><i class="ti ti-list"></i></template>
						<template #label><SearchLabel>{{ i18n.ts._serverSettings.deliverSuspendedSoftware }}</SearchLabel></template>
						<template #footer>
							<div class="_buttons">
								<MkButton @click="federationForm.state.deliverSuspendedSoftware.push({software: '', versionRange: ''})"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
							</div>
						</template>

						<div :class="$style.metadataRoot" class="_gaps_s">
							<MkInfo>{{ i18n.ts._serverSettings.deliverSuspendedSoftwareDescription }}</MkInfo>
							<div v-for="(element, index) in federationForm.state.deliverSuspendedSoftware" :key="index" v-panel :class="$style.fieldDragItem">
								<button class="_button" :class="$style.dragItemRemove" @click="federationForm.state.deliverSuspendedSoftware.splice(index, 1)"><i class="ti ti-x"></i></button>
								<div :class="$style.dragItemForm">
									<FormSplit :minWidth="200">
										<MkInput v-model="element.software" small :placeholder="i18n.ts.softwareName">
										</MkInput>
										<MkInput v-model="element.versionRange" small :placeholder="i18n.ts.version">
										</MkInput>
									</FormSplit>
								</div>
							</div>
						</div>
					</MkFolder>
				</div>
			</MkFolder>

			<MkFolder>
				<template #icon><i class="ti ti-ghost"></i></template>
				<template #label>{{ i18n.ts.proxyAccount }}</template>
				<template v-if="proxyAccountForm.modified.value" #footer>
					<MkFormFooter :form="proxyAccountForm"/>
				</template>

				<div class="_gaps">
					<MkInfo>{{ i18n.ts.proxyAccountDescription }}</MkInfo>

					<MkSwitch v-model="proxyAccountForm.state.enabled">
						<template #label>{{ i18n.ts.enableProxyAccount }}</template>
						<template #caption>{{ i18n.ts.enableProxyAccountDescription }}</template>
					</MkSwitch>

					<MkTextarea v-model="proxyAccountForm.state.description" :max="500" tall mfmAutocomplete :mfmPreview="true">
						<template #label>{{ i18n.ts._profile.description }}</template>
						<template #caption>{{ i18n.ts._profile.youCanIncludeHashtags }}</template>
					</MkTextarea>
				</div>
			</MkFolder>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSplit from '@/components/form/split.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance, instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import { useForm } from '@/use/use-form.js';
import MkFormFooter from '@/components/MkFormFooter.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkSelect from '@/components/MkSelect.vue';

type UrlPreviewProxyMode = 'direct' | 'summaly' | 'outbound';
type UrlPreviewOutboundProxyType = 'socks5' | 'http' | 'https';

type UrlPreviewProxyTestResult = {
	ok: boolean;
	elapsedMs: number;
	outboundIp: string | null;
	proxyId: string;
	error: string | null;
};

type UrlPreviewOutboundProxyForm = {
	id: string;
	name: string;
	type: UrlPreviewOutboundProxyType;
	host: string;
	port: number;
	username: string;
	password: string;
	passwordSet: boolean;
	clearPassword: boolean;
	isEnabled: boolean;
	priority: number;
	testing: boolean;
	testResult: UrlPreviewProxyTestResult | null;
};

const meta = await misskeyApi('admin/meta');
const adminMeta = meta as typeof meta & {
	urlPreviewProxyMode?: UrlPreviewProxyMode;
	urlPreviewOutboundProxies?: Array<Partial<UrlPreviewOutboundProxyForm>>;
	urlPreviewProxyStrategy?: 'failover';
};

const proxyAccount = await misskeyApi('users/show', { userId: meta.proxyAccountId });

const infoForm = useForm({
	name: meta.name ?? '',
	shortName: meta.shortName ?? '',
	description: meta.description ?? '',
	about: meta.about ?? '',
	maintainerName: meta.maintainerName ?? '',
	maintainerEmail: meta.maintainerEmail ?? '',
	tosUrl: meta.tosUrl ?? '',
	privacyPolicyUrl: meta.privacyPolicyUrl ?? '',
	inquiryUrl: meta.inquiryUrl ?? '',
	repositoryUrl: meta.repositoryUrl ?? '',
	impressumUrl: meta.impressumUrl ?? '',
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		name: state.name,
		shortName: state.shortName === '' ? null : state.shortName,
		description: state.description,
		about: state.about,
		maintainerName: state.maintainerName,
		maintainerEmail: state.maintainerEmail,
		tosUrl: state.tosUrl,
		privacyPolicyUrl: state.privacyPolicyUrl,
		inquiryUrl: state.inquiryUrl,
		repositoryUrl: state.repositoryUrl,
		impressumUrl: state.impressumUrl,
	});
	fetchInstance(true);
});

const pinnedUsersForm = useForm({
	pinnedUsers: meta.pinnedUsers.join('\n'),
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		pinnedUsers: state.pinnedUsers.split('\n'),
	});
	fetchInstance(true);
});

const filesForm = useForm({
	cacheRemoteFiles: meta.cacheRemoteFiles,
	cacheRemoteSensitiveFiles: meta.cacheRemoteSensitiveFiles,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		cacheRemoteFiles: state.cacheRemoteFiles,
		cacheRemoteSensitiveFiles: state.cacheRemoteSensitiveFiles,
	});
	fetchInstance(true);
});

const serviceWorkerForm = useForm({
	enableServiceWorker: meta.enableServiceWorker,
	swPublicKey: meta.swPublickey ?? '',
	swPrivateKey: meta.swPrivateKey ?? '',
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		enableServiceWorker: state.enableServiceWorker,
		swPublicKey: state.swPublicKey,
		swPrivateKey: state.swPrivateKey,
	});
	fetchInstance(true);
});

const otherForm = useForm({
	enableAchievements: meta.enableAchievements,
	enableBotTrending: meta.enableBotTrending,
	robotsTxt: meta.robotsTxt,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		enableAchievements: state.enableAchievements,
		enableBotTrending: state.enableBotTrending,
		robotsTxt: state.robotsTxt,
	});
	fetchInstance(true);
});

const adForm = useForm({
	notesPerOneAd: meta.notesPerOneAd,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		notesPerOneAd: state.notesPerOneAd,
	});
	fetchInstance(true);
});

const urlPreviewForm = useForm({
	urlPreviewEnabled: meta.urlPreviewEnabled,
	urlPreviewTimeout: meta.urlPreviewTimeout,
	urlPreviewMaximumContentLength: meta.urlPreviewMaximumContentLength,
	urlPreviewRequireContentLength: meta.urlPreviewRequireContentLength,
	urlPreviewUserAgent: meta.urlPreviewUserAgent ?? '',
	urlPreviewSummaryProxyUrl: meta.urlPreviewSummaryProxyUrl ?? '',
	urlPreviewProxyMode: (adminMeta.urlPreviewProxyMode ?? (meta.urlPreviewSummaryProxyUrl ? 'summaly' : 'outbound')) as UrlPreviewProxyMode,
	urlPreviewOutboundProxies: (adminMeta.urlPreviewOutboundProxies ?? []).map(hydrateUrlPreviewProxy),
	urlPreviewProxyStrategy: adminMeta.urlPreviewProxyStrategy ?? 'failover',
}, async (state) => {
	if (state.urlPreviewEnabled && state.urlPreviewProxyMode === 'outbound' && enabledUrlPreviewProxyCount(state.urlPreviewOutboundProxies) === 0) {
		await os.alert({
			type: 'warning',
			text: i18n.ts._urlPreviewSetting.outboundProxyRequired,
		});
		throw new Error('URL preview outbound proxy is required');
	}

	await os.apiWithDialog('admin/update-meta', {
		urlPreviewEnabled: state.urlPreviewEnabled,
		urlPreviewTimeout: state.urlPreviewTimeout,
		urlPreviewMaximumContentLength: state.urlPreviewMaximumContentLength,
		urlPreviewRequireContentLength: state.urlPreviewRequireContentLength,
		urlPreviewUserAgent: state.urlPreviewUserAgent,
		urlPreviewSummaryProxyUrl: state.urlPreviewSummaryProxyUrl,
		urlPreviewProxyMode: state.urlPreviewProxyMode,
		urlPreviewOutboundProxies: serializeUrlPreviewProxies(state.urlPreviewOutboundProxies),
		urlPreviewProxyStrategy: 'failover',
	});
	fetchInstance(true);
});

const urlPreviewProxyRawInput = ref('');
const urlPreviewProxyTestingAll = ref(false);
const urlPreviewProxyTypeItems = [
	{ value: 'socks5', label: i18n.ts._urlPreviewSetting.proxyTypeSocks5 },
	{ value: 'http', label: i18n.ts._urlPreviewSetting.proxyTypeHttp },
	{ value: 'https', label: i18n.ts._urlPreviewSetting.proxyTypeHttps },
];
const urlPreviewEnabledProxyCount = computed(() => enabledUrlPreviewProxyCount(urlPreviewForm.state.urlPreviewOutboundProxies));
const urlPreviewProxyHighRisk = computed(() => (
	urlPreviewForm.state.urlPreviewEnabled &&
	urlPreviewForm.state.urlPreviewProxyMode === 'outbound' &&
	urlPreviewEnabledProxyCount.value === 0
));

function hydrateUrlPreviewProxy(proxy: Partial<UrlPreviewOutboundProxyForm>, index: number): UrlPreviewOutboundProxyForm {
	return {
		id: proxy.id ?? crypto.randomUUID?.() ?? `proxy-${Date.now()}-${index}`,
		name: proxy.name ?? '',
		type: proxy.type ?? 'socks5',
		host: proxy.host ?? '',
		port: Number(proxy.port ?? 7325),
		username: proxy.username ?? '',
		password: '',
		passwordSet: proxy.passwordSet ?? false,
		clearPassword: false,
		isEnabled: proxy.isEnabled ?? true,
		priority: Number(proxy.priority ?? index),
		testing: false,
		testResult: null,
	};
}

function serializeUrlPreviewProxies(proxies: UrlPreviewOutboundProxyForm[]) {
	return proxies.map((proxy, index) => ({
		id: proxy.id,
		name: proxy.name,
		type: proxy.type,
		host: proxy.host.trim(),
		port: Number(proxy.port),
		username: proxy.username.trim() === '' ? null : proxy.username.trim(),
		password: proxy.password,
		passwordSet: proxy.passwordSet,
		clearPassword: proxy.clearPassword,
		isEnabled: proxy.isEnabled,
		priority: index,
	}));
}

function enabledUrlPreviewProxyCount(proxies: UrlPreviewOutboundProxyForm[]): number {
	return proxies.filter(proxy => proxy.isEnabled && proxy.host.trim() !== '' && Number(proxy.port) > 0).length;
}

function addUrlPreviewProxy() {
	urlPreviewForm.state.urlPreviewOutboundProxies.push(hydrateUrlPreviewProxy({
		name: i18n.ts._urlPreviewSetting.defaultProxyName,
		type: 'socks5',
		isEnabled: true,
	}, urlPreviewForm.state.urlPreviewOutboundProxies.length));
}

function addUrlPreviewProxyFromInput() {
	const parsed = parseUrlPreviewProxyLine(urlPreviewProxyRawInput.value);
	urlPreviewForm.state.urlPreviewOutboundProxies.push(hydrateUrlPreviewProxy({
		...parsed,
		name: `${parsed.type} ${parsed.host}:${parsed.port}`,
		isEnabled: true,
	}, urlPreviewForm.state.urlPreviewOutboundProxies.length));
	urlPreviewProxyRawInput.value = '';
}

function removeUrlPreviewProxy(index: number) {
	urlPreviewForm.state.urlPreviewOutboundProxies.splice(index, 1);
}

function moveUrlPreviewProxy(index: number, delta: -1 | 1) {
	const target = index + delta;
	if (target < 0 || target >= urlPreviewForm.state.urlPreviewOutboundProxies.length) return;
	const [proxy] = urlPreviewForm.state.urlPreviewOutboundProxies.splice(index, 1);
	urlPreviewForm.state.urlPreviewOutboundProxies.splice(target, 0, proxy);
}

function parseUrlPreviewProxyLine(value: string): Pick<UrlPreviewOutboundProxyForm, 'type' | 'host' | 'port' | 'username' | 'password'> {
	const trimmed = value.trim();
	if (trimmed.includes('://') && URL.canParse(trimmed)) {
		const url = new URL(trimmed);
		const type = url.protocol === 'http:' ? 'http' : url.protocol === 'https:' ? 'https' : 'socks5';
		return {
			type,
			host: url.hostname,
			port: Number(url.port),
			username: decodeURIComponent(url.username),
			password: decodeURIComponent(url.password),
		};
	}

	const [host, port, username, ...passwordParts] = trimmed.split(':');
	return {
		type: 'socks5',
		host,
		port: Number(port),
		username: username ?? '',
		password: passwordParts.join(':'),
	};
}

async function testUrlPreviewProxy(proxy: UrlPreviewOutboundProxyForm) {
	proxy.testing = true;
	proxy.testResult = null;
	try {
		proxy.testResult = await misskeyApi('admin/url-preview/proxy/test', {
			proxy: serializeUrlPreviewProxies([proxy])[0],
		});
	} finally {
		proxy.testing = false;
	}
}

async function testAllUrlPreviewProxies() {
	urlPreviewProxyTestingAll.value = true;
	try {
		for (const proxy of urlPreviewForm.state.urlPreviewOutboundProxies) {
			await testUrlPreviewProxy(proxy);
		}
	} finally {
		urlPreviewProxyTestingAll.value = false;
	}
}

const federationForm = useForm({
	federation: meta.federation,
	federationHosts: meta.federationHosts.join('\n'),
	deliverSuspendedSoftware: meta.deliverSuspendedSoftware,
}, async (state) => {
	await os.apiWithDialog('admin/update-meta', {
		federation: state.federation,
		federationHosts: state.federationHosts.split('\n'),
		deliverSuspendedSoftware: state.deliverSuspendedSoftware,
	});
	fetchInstance(true);
});

const proxyAccountForm = useForm({
	description: proxyAccount.description,
	enabled: meta.enableProxyAccount,
}, async (state) => {
	if (state.description !== proxyAccount.description) {
		await os.apiWithDialog('admin/update-proxy-account', {
			description: state.description,
		});
	}
	if (state.enabled !== meta.enableProxyAccount) {
		await os.apiWithDialog('admin/update-meta', {
			enableProxyAccount: state.enabled,
		});
	}
	fetchInstance(true);
});

async function genKeys() {
	if (serviceWorkerForm.savedState.swPrivateKey) {
		const result = await os.confirm({ type: 'warning', title: i18n.ts._genKeysDialog.title, text: i18n.ts._genKeysDialog.text });
		if (result.canceled) return;
	}

	const keys = await os.apiWithDialog('admin/gen-vapid-keys', {});

	serviceWorkerForm.state.swPublicKey = keys.public;
	serviceWorkerForm.state.swPrivateKey = keys.private;
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.general,
	icon: 'ti ti-settings',
}));
</script>

<style lang="scss" module>
.subCaption {
	font-size: 0.85em;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
}

.metadataRoot {
	container-type: inline-size;
}

.fieldDragItem {
	display: flex;
	padding: 10px;
	align-items: flex-end;
	border-radius: 6px;

	/* (drag button) 32px + (drag button margin) 8px + (input width) 200px * 2 + (input gap) 12px = 452px */
	@container (max-width: 452px) {
		align-items: center;
	}
}

.dragItemHandle {
	cursor: grab;
	width: 32px;
	height: 32px;
	margin: 0 8px 0 0;
	opacity: 0.5;
	flex-shrink: 0;

	&:active {
		cursor: grabbing;
	}
}

.dragItemRemove {
	@extend .dragItemHandle;

	color: #ff2a2a;
	opacity: 1;
	cursor: pointer;

	&:hover, &:focus {
		opacity: .7;
	}

	&:active {
		cursor: pointer;
	}
}

.dragItemForm {
	flex-grow: 1;
}

.proxyQuickAddAction {
	display: flex;
	align-items: end;
	min-height: 60px;
}

.proxyCard {
	padding: 12px;
	border-radius: 6px;
}

.proxyCardHeader {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.proxyActions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

@media (max-width: 520px) {
	.proxyCardHeader {
		align-items: stretch;
		flex-direction: column;
	}

	.proxyActions {
		justify-content: flex-start;
	}
}
</style>
