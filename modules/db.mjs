/** @typedef {{ id: string; i18nKey?: string; name?: string; builtin?: boolean }} DbTag */
/** @typedef {{ id: string; name?: string; nameI18nKey?: string; description?: string; descriptionI18nKey?: string; sequence: string; tagIds: string[]; isTemplate?: boolean; builtin?: boolean; createdAt: string; updatedAt: string }} DbDna */
/** @typedef {{ version: number; tags: DbTag[]; dnas: DbDna[] }} HorseyDb */

export const STORAGE_KEY = 'horsey-crispr-database'
const DEFAULT_DB_URL = new URL('../data/default-database.json', import.meta.url).href

function newId(prefix) {
	const u =
		globalThis.crypto?.randomUUID?.() ??
		`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
	return `${prefix}_${u}`
}

/**
 * 默认库 JSON 不写 `builtin`；载入种子后再统一打上内置标记。
 * @param {HorseyDb} db
 */
function applySeedBuiltinFlags(db) {
	for (const t of db.tags) t.builtin = true
	for (const d of db.dnas) d.builtin = true
	return db
}

/** @returns {Promise<HorseyDb>} */
export async function fetchDefaultDatabase() {
	const res = await fetch(DEFAULT_DB_URL)
	if (!res.ok) throw new Error(`Failed to load default database: ${res.status}`)
	const db = /** @type {HorseyDb} */ (await res.json())
	return applySeedBuiltinFlags(db)
}

/** @returns {HorseyDb | null} */
export function loadDBFromStorage() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tags) || !Array.isArray(parsed.dnas))
			return null
		return /** @type {HorseyDb} */ (parsed)
	} catch {
		return null
	}
}

/** @param {HorseyDb} db */
export function saveDBToStorage(db) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

/** @returns {Promise<HorseyDb>} */
export async function loadDB() {
	let db = loadDBFromStorage()
	if (!db) {
		db = await fetchDefaultDatabase()
		saveDBToStorage(db)
	}
	return migrate(db)
}

/** @param {HorseyDb} db */
function migrate(db) {
	if (!db.version) db.version = 1
	return db
}

/** @param {HorseyDb} db */
export function exportDBDownload(db) {
	const blob = new Blob([JSON.stringify(db, null, '\t')], { type: 'application/json' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = `horsey-crispr-database-${new Date().toISOString().slice(0, 10)}.json`
	a.click()
	URL.revokeObjectURL(a.href)
}

/**
 * @param {string} seq
 */
export function normalizeSequenceKey(seq) {
	return String(seq || '')
		.toUpperCase()
		.replace(/[^ATCG]/g, '')
}

/**
 * @param {HorseyDb} base
 * @param {unknown} incomingRaw
 * @param {'merge' | 'overwrite'} mode
 * @returns {HorseyDb}
 */
export function importDatabase(base, incomingRaw, mode) {
	if (mode === 'overwrite') {
		const incoming = validateDb(incomingRaw)
		saveDBToStorage(incoming)
		return incoming
	}
	const inc = validateDb(incomingRaw)
	const out = cloneDb(base)

	const tagIdRemap = new Map()

	for (const t of inc.tags) {
		const match = out.tags.find(
			(e) =>
				(t.i18nKey && e.i18nKey && t.i18nKey === e.i18nKey) ||
				(t.name && e.name && t.name === e.name && !t.i18nKey && !e.i18nKey),
		)
		if (match) tagIdRemap.set(t.id, match.id)
		else {
			let id = t.id
			if (out.tags.some((x) => x.id === id)) id = newId('tag')
			tagIdRemap.set(t.id, id)
			out.tags.push({ ...t, id })
		}
	}

	function remapTags(tagIds) {
		const s = new Set()
		for (const tid of tagIds || []) {
			const m = tagIdRemap.get(tid) ?? tid
			if (out.tags.some((x) => x.id === m)) s.add(m)
		}
		return [...s]
	}

	for (const d of inc.dnas) {
		const seqKey = normalizeSequenceKey(d.sequence)
		const existing = out.dnas.find((x) => normalizeSequenceKey(x.sequence) === seqKey && seqKey.length > 0)
		const tagIds = remapTags(d.tagIds)
		if (existing) {
			const merged = new Set([...(existing.tagIds || []), ...tagIds])
			existing.tagIds = [...merged]
			existing.updatedAt = new Date().toISOString()
			if (d.isTemplate) existing.isTemplate = true
			continue
		}
		let id = d.id
		if (out.dnas.some((x) => x.id === id)) id = newId('dna')
		out.dnas.push({
			...d,
			id,
			tagIds,
			createdAt: d.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	}

	saveDBToStorage(out)
	return out
}

/**
 * @param {unknown} x
 * @returns {HorseyDb}
 */
function validateDb(x) {
	if (!x || typeof x !== 'object') throw new Error('Invalid database')
	const o = /** @type {any} */ (x)
	if (!Array.isArray(o.tags) || !Array.isArray(o.dnas)) throw new Error('Invalid database shape')
	return /** @type {HorseyDb} */ ({
		version: Number(o.version) || 1,
		tags: o.tags,
		dnas: o.dnas,
	})
}

/** @param {HorseyDb} db */
function cloneDb(db) {
	return JSON.parse(JSON.stringify(db))
}

/** @returns {Promise<HorseyDb>} */
export async function resetToDefault() {
	localStorage.removeItem(STORAGE_KEY)
	const db = await fetchDefaultDatabase()
	saveDBToStorage(db)
	return db
}

/**
 * @param {HorseyDb} db
 * @param {Partial<DbDna>} fields
 * @returns {DbDna}
 */
export function createDnaEntry(db, fields) {
	const now = new Date().toISOString()
	const e = {
		id: newId('dna'),
		sequence: fields.sequence ?? '',
		tagIds: fields.tagIds ?? [],
		isTemplate: Boolean(fields.isTemplate),
		builtin: false,
		name: fields.name,
		nameI18nKey: fields.nameI18nKey,
		description: fields.description,
		descriptionI18nKey: fields.descriptionI18nKey,
		createdAt: now,
		updatedAt: now,
	}
	db.dnas.push(e)
	saveDBToStorage(db)
	return e
}

/**
 * @param {HorseyDb} db
 * @param {string} id
 */
export function deleteDna(db, id) {
	const i = db.dnas.findIndex((d) => d.id === id)
	if (i === -1) return false
	db.dnas.splice(i, 1)
	saveDBToStorage(db)
	return true
}

/**
 * Duplicate DNA as new entry (for templates / copies).
 * @param {HorseyDb} db
 * @param {DbDna} source
 * @param {{ nameSuffix?: string; displayName?: string }} [opts]
 * — `displayName` resolves built-ins that only have `nameI18nKey` (localized title).
 */
export function duplicateDna(db, source, opts = {}) {
	const suffix = opts.nameSuffix ?? ''
	const baseLabel = source.name ?? opts.displayName ?? ''
	return createDnaEntry(db, {
		sequence: source.sequence,
		tagIds: [...(source.tagIds || [])],
		isTemplate: false,
		name: baseLabel ? `${baseLabel}${suffix}` : undefined,
		nameI18nKey: undefined,
		description: source.description,
		descriptionI18nKey: undefined,
	})
}

/**
 * @param {HorseyDb} db
 * @param {string} id
 * @param {Partial<DbDna>} fields
 */
export function updateDna(db, id, fields) {
	const d = db.dnas.find((x) => x.id === id)
	if (!d) return false
	Object.assign(d, fields)
	d.updatedAt = new Date().toISOString()
	saveDBToStorage(db)
	return true
}
