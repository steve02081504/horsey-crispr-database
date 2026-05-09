/**
 * Horsey 基因组（CRISPR）业务库：基因表、螺旋映射、文本解析与编辑。
 *
 * @example
 * import {
 *   parseGenome,
 *   formatGenomeForExport,
 *   GENES,
 *   resolveGeneLocus,
 * } from './lib/horsey-genetics/index.mjs'
 */

export {
	HELIX_COUNT,
	VALID_BASE_RE,
	BASES,
	BASE_INDEX,
	CAT_COLOR,
	GENES,
	HELIX_MAP,
	makeUniformGenome,
	EMPTY_GENOME,
	sanitizeSequence,
	normalizeGenome,
	cycleBase,
	baseChip,
	valueColor,
	getGeneValue,
	alleleSummary,
	getHelixIndexFactory,
	parseGenome,
	formatGenomeForExport,
} from "./genetics-core.mjs"

export {
	HELIX_PARAM_SLOTS,
} from "./helix-param-slots.mjs"

export {
	sortedDiploidChoices,
	diploidValueSum,
} from "./diploid-options.mjs"

export {
	resolveGeneLocus,
	listMixedGeneLoci,
} from "./genome-analysis.mjs"

export {
	randomGenomeStrands,
	setBaseAt,
	cycleGeneSlot,
	mergeAllelesAt,
	mergeAllMixedAlleles,
} from "./genome-edits.mjs"
