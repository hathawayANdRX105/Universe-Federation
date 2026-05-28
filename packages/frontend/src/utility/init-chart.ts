/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
	Chart,
	ArcElement,
	LineElement,
	BarElement,
	PointElement,
	BarController,
	LineController,
	DoughnutController,
	CategoryScale,
	LinearScale,
	TimeScale,
	Legend,
	Title,
	Tooltip,
	SubTitle,
	Filler,
	type Plugin,
} from 'chart.js';
import gradient from 'chartjs-plugin-gradient';
import zoomPlugin from 'chartjs-plugin-zoom';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { globalEvents } from '@/events.js';
import { applyChartThemeToOptions, getChartThemeColors } from '@/utility/chart-theme.js';
import 'chartjs-adapter-date-fns';

let chartRegistered = false;
let themeListenerRegistered = false;

const readableChartThemePlugin: Plugin = {
	id: 'readableChartTheme',
	beforeUpdate(chart) {
		applyChartThemeToOptions(chart.options as Record<string, any>);
	},
};

function applyChartDefaults() {
	const colors = getChartThemeColors();
	Chart.defaults.color = colors.textColor;
	Chart.defaults.borderColor = colors.borderColor;
}

function updateExistingCharts() {
	for (const chart of Object.values(Chart.instances)) {
		applyChartThemeToOptions(chart.options as Record<string, any>);
		chart.update('none');
	}
}

export function initChart() {
	if (!chartRegistered) {
		Chart.register(
			ArcElement,
			LineElement,
			BarElement,
			PointElement,
			BarController,
			LineController,
			DoughnutController,
			CategoryScale,
			LinearScale,
			TimeScale,
			Legend,
			Title,
			Tooltip,
			SubTitle,
			Filler,
			MatrixController, MatrixElement,
			zoomPlugin,
			gradient,
			readableChartThemePlugin,
		);

		chartRegistered = true;
	}

	// フォントカラー
	applyChartDefaults();

	Chart.defaults.animation = false;

	if (!themeListenerRegistered) {
		globalEvents.on('themeChanged', () => {
			applyChartDefaults();
			updateExistingCharts();
		});
		themeListenerRegistered = true;
	}
}
