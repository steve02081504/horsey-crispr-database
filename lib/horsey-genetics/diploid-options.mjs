import { BASES } from "./genetics-core.mjs"

/**
 * @typedef {{ readonly A: number; readonly T: number; readonly C: number; readonly G: number }} BaseAlleleVals
 */

/**
 * 16 种碱基对按两条链 wiki 数值之和升序排列。
 *
 * @param {BaseAlleleVals} vals - 单基因四个碱基的 wiki 数值
 * @returns {{ pair: string; sum: number }[]}
 */
export function sortedDiploidChoices(vals) {
	const opts = []
	for (const b1 of BASES)
		for (const b2 of BASES)
			opts.push({
				pair: b1 + b2,
				sum: vals[b1] + vals[b2],
			})
	opts.sort((a, b) => a.sum - b.sum || a.pair.localeCompare(b.pair))
	return opts
}

/**
 * @param {BaseAlleleVals} vals
 * @param {string} pair - 两位碱基，如 "AT"
 * @returns {number}
 */
export function diploidValueSum(vals, pair) {
	const [x, y] = pair
	return vals[x] + vals[y]
}
