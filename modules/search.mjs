/** @typedef {import('./db.mjs').HorseyDb} HorseyDb */
/** @typedef {import('./db.mjs').DbDna} DbDna */

import { geti18n_nowarn } from '../lib/i18n.mjs'

import { normalizeSequenceKey } from './db.mjs'

/**
 * Text search: literal substring, or glob-style `*` / `?` when either appears in the query.
 * `*` = any run of chars, `?` = single char; other regex specials are escaped.
 * @param {string} query
 * @param {string} blob
 */
function textBlobMatches(query, blob) {
	const q = query.trim().toLowerCase()
	if (!q) return true
	if (!q.includes('*') && !q.includes('?')) return blob.includes(q)
	let pattern = ''
	for (let i = 0; i < q.length; i++) {
		const c = q[i]
		if (c === '*') pattern += '.*'
		else if (c === '?') pattern += '.'
		else if ('.+^${}()|[]\\'.includes(c)) pattern += `\\${c}`
		else pattern += c
	}
	try {
		return new RegExp(pattern, 'i').test(blob)
	} catch {
		return blob.includes(q)
	}
}

/**
 * @param {DbDna} d
 */
function dnaSearchBlob(d) {
	const parts = []
	if (d.name) parts.push(d.name)
	if (d.description) parts.push(d.description)
	if (d.nameI18nKey) parts.push(geti18n_nowarn(d.nameI18nKey) || '', d.nameI18nKey)
	if (d.descriptionI18nKey) parts.push(geti18n_nowarn(d.descriptionI18nKey) || '', d.descriptionI18nKey)
	return parts.join('\u0000').toLowerCase()
}

/**
 * @param {HorseyDb} db
 * @param {{
 *   query?: string
 *   tagIds?: string[]
 *   tagMode?: 'and' | 'or'
 *   sequenceFragment?: string
 *   templatesOnly?: boolean
 * }} opts
 * @returns {DbDna[]}
 */
export function searchDNAs(db, opts = {}) {
	let list = [...db.dnas]
	if (opts.templatesOnly) list = list.filter((d) => d.isTemplate)

	const q = (opts.query || '').trim().toLowerCase()
	if (q)
		list = list.filter((d) => {
			const blob = dnaSearchBlob(d)
			return textBlobMatches(q, blob)
		})

	const fragRaw = (opts.sequenceFragment || '').trim().toUpperCase().replace(/[^ATCG]/g, '')
	if (fragRaw)
		list = list.filter((d) => {
			const compact = normalizeSequenceKey(d.sequence)
			return compact.includes(fragRaw)
		})

	const tids = opts.tagIds?.filter(Boolean) ?? []
	if (tids.length) {
		const mode = opts.tagMode || 'or'
		list = list.filter((d) => {
			const set = new Set(d.tagIds || [])
			if (mode === 'and') return tids.every((t) => set.has(t))
			return tids.some((t) => set.has(t))
		})
	}

	return list
}
