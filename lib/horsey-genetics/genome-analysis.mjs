import {
	GENES,
	HELIX_MAP,
	getGeneValue,
} from "./genetics-core.mjs"

/**
 * 某一螺旋上某一基因位点的解析结果。
 *
 * @param {string[][]} genome - parseGenome 返回值：`helixIndex -> [strand1, strand2]`
 * @param {number} helixIndex - 0–19
 * @param {number} geneSlotIndex - 在该螺旋基因列表中的下标
 */
export function resolveGeneLocus(genome, helixIndex, geneSlotIndex) {
	const geneId = HELIX_MAP[helixIndex]?.[geneSlotIndex]
	const gene = geneId ? GENES[geneId] : null
	const [s1 = "", s2 = ""] = genome[helixIndex] || ["", ""]
	const b1 = s1[geneSlotIndex]?.toUpperCase() ?? ""
	const b2 = s2[geneSlotIndex]?.toUpperCase() ?? ""
	return {
		geneId,
		gene,
		strand1Base: b1,
		strand2Base: b2,
		value1: gene ? getGeneValue(gene, b1) : null,
		value2: gene ? getGeneValue(gene, b2) : null,
		isMixed: Boolean(b1 && b2 && b1 !== b2),
		hasData: Boolean(b1 || b2),
	}
}

/**
 * 枚举基因组中全部「两条链碱基不一致」的位点。
 *
 * @param {string[][]} genome
 * @returns {{ helixIndex: number; geneSlotIndex: number; geneId: string }[]}
 */
export function listMixedGeneLoci(genome) {
	const out = []
	for (let hi = 0; hi < genome.length; hi++) {
		const genes = HELIX_MAP[hi] || []
		const [s1 = "", s2 = ""] = genome[hi] || ["", ""]
		for (let gi = 0; gi < genes.length; gi++) {
			const b1 = s1[gi]?.toUpperCase() ?? ""
			const b2 = s2[gi]?.toUpperCase() ?? ""
			if (b1 && b2 && b1 !== b2)
				out.push({
					helixIndex: hi,
					geneSlotIndex: gi,
					geneId: genes[gi],
				})
		}
	}
	return out
}
