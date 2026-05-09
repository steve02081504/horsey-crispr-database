import {
	BASES,
	HELIX_COUNT,
	HELIX_MAP,
	cycleBase,
	normalizeGenome,
} from "./genetics-core.mjs"

function randomBase() {
	return BASES[Math.floor(Math.random() * BASES.length)]
}

/**
 * 每条螺旋两条链随机碱基。
 *
 * @returns {string[][]}
 */
export function randomGenomeStrands() {
	return Array.from({ length: HELIX_COUNT }, (_, hi) => {
		const n = HELIX_MAP[hi]?.length ?? 0
		return [
			Array.from({ length: n }, randomBase).join(""),
			Array.from({ length: n }, randomBase).join(""),
		]
	})
}

/**
 * 在拷贝上把某一螺旋、某一条链、某一位置的碱基设为 `nextBase`。
 *
 * @param {string[][]} genome
 * @param {number} helixIndex
 * @param {0|1} strandIndex
 * @param {number} baseIndex
 * @param {string} nextBase
 */
export function setBaseAt(genome, helixIndex, strandIndex, baseIndex, nextBase) {
	const next = genome.map((pair) => [...pair])
	const strand = next[helixIndex][strandIndex] || ""
	const chars = strand.split("")
	chars[baseIndex] = nextBase
	next[helixIndex][strandIndex] = chars.join("")
	return normalizeGenome(next)
}

/**
 * 单基因循环：双链同位置同步变或只变已有的一条链。
 *
 * @param {string[][]} genome
 * @param {number} helixIndex
 * @param {number} geneSlotIndex
 */
export function cycleGeneSlot(genome, helixIndex, geneSlotIndex) {
	const next = genome.map((pair) => pair.map((s) => s))
	const s1 = next[helixIndex][0] || ""
	const s2 = next[helixIndex][1] || ""
	const b1 = s1[geneSlotIndex]
	const b2 = s2[geneSlotIndex]
	if (!b1 && !b2) return normalizeGenome(next)
	if (b1 && b2 && b1 === b2) {
		const n = cycleBase(b1)
		next[helixIndex][0] = replaceAt(s1, geneSlotIndex, n)
		next[helixIndex][1] = replaceAt(s2, geneSlotIndex, n)
	} else if (b1 && !b2) {
		next[helixIndex][0] = replaceAt(s1, geneSlotIndex, cycleBase(b1))
	} else if (!b1 && b2) {
		next[helixIndex][1] = replaceAt(s2, geneSlotIndex, cycleBase(b2))
	}
	return normalizeGenome(next)
}

/**
 * 将杂合位点两条链合并为同一碱基（优先保留 strand1）。
 *
 * @param {string[][]} genome
 * @param {number} helixIndex
 * @param {number} geneSlotIndex
 */
export function mergeAllelesAt(genome, helixIndex, geneSlotIndex) {
	const next = genome.map((pair) => pair.map((s) => s))
	const s1 = next[helixIndex][0] || ""
	const s2 = next[helixIndex][1] || ""
	const b1 = s1[geneSlotIndex]
	const b2 = s2[geneSlotIndex]
	if (!b1 && !b2) return normalizeGenome(next)
	const merged = b1 || b2
	if (b1) next[helixIndex][0] = replaceAt(s1, geneSlotIndex, merged)
	if (b2) next[helixIndex][1] = replaceAt(s2, geneSlotIndex, merged)
	return normalizeGenome(next)
}

/**
 * @param {string} strand
 * @param {number} i
 * @param {string} ch
 */
function replaceAt(strand, i, ch) {
	const a = strand.split("")
	a[i] = ch
	return a.join("")
}

/**
 * 批量合并所有可合并的杂合位点。
 *
 * @param {string[][]} genome
 */
export function mergeAllMixedAlleles(genome) {
	let next = genome.map((pair) => pair.map((s) => s))
	for (let hi = 0; hi < HELIX_COUNT; hi++) {
		const genes = HELIX_MAP[hi] || []
		const [s1 = "", s2 = ""] = next[hi] || ["", ""]
		for (let gi = 0; gi < genes.length; gi++) {
			if (s1[gi] && s2[gi] && s1[gi] !== s2[gi])
				next = mergeAllelesAt(next, hi, gi)
		}
	}
	return next
}

/**
 * 是否存在任意可合并的杂合位点（控制「合并全部」是否可用）。
 *
 * @param {string[][]} genome
 */
export function hasMergeableAlleles(genome) {
	for (let hi = 0; hi < HELIX_COUNT; hi++) {
		const genes = HELIX_MAP[hi] || []
		const [s1 = "", s2 = ""] = genome[hi] || ["", ""]
		for (let gi = 0; gi < genes.length; gi++) {
			if (s1[gi] && s2[gi] && s1[gi] !== s2[gi]) return true
		}
	}
	return false
}
