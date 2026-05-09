/** @typedef {import('./db.mjs').HorseyDb} HorseyDb */
/** @typedef {import('./db.mjs').DbTag} DbTag */

import { geti18n_nowarn } from '../lib/i18n.mjs'

import { saveDBToStorage } from './db.mjs'

function newTagId() {
	const u =
		globalThis.crypto?.randomUUID?.() ??
		`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
	return `tag_${u}`
}

/**
 * @param {DbTag} tag
 * @returns {string}
 */
export function getTagDisplay(tag) {
	if (tag.i18nKey) {
		const t = geti18n_nowarn(tag.i18nKey)
		if (t) return t
	}
	return tag.name || tag.id
}

/**
 * @param {HorseyDb} db
 * @param {{ name: string } | { i18nKey: string }} spec
 */
export function createTag(db, spec) {
	const id = newTagId()
	/** @type {DbTag} */
	const tag = 'i18nKey' in spec ? { id, i18nKey: spec.i18nKey, builtin: false } : { id, name: spec.name, builtin: false }
	db.tags.push(tag)
	saveDBToStorage(db)
	return tag
}

/**
 * @param {HorseyDb} db
 * @param {string} id
 * @param {string} newName
 */
export function renameTag(db, id, newName) {
	const tag = db.tags.find((t) => t.id === id)
	if (!tag) return false
	tag.name = newName
	delete tag.i18nKey
	saveDBToStorage(db)
	return true
}

/**
 * @param {HorseyDb} db
 * @param {string} id
 */
export function deleteTag(db, id) {
	const tag = db.tags.find((t) => t.id === id)
	if (!tag) return false
	db.tags = db.tags.filter((t) => t.id !== id)
	for (const d of db.dnas) d.tagIds = (d.tagIds || []).filter((tid) => tid !== id)
	saveDBToStorage(db)
	return true
}

/**
 * @param {HorseyDb} db
 * @param {string} sourceId
 * @param {string} targetId
 */
export function mergeTags(db, sourceId, targetId) {
	if (sourceId === targetId) return false
	const src = db.tags.find((t) => t.id === sourceId)
	const tgt = db.tags.find((t) => t.id === targetId)
	if (!src || !tgt) return false
	for (const d of db.dnas) {
		const set = new Set(d.tagIds || [])
		if (set.delete(sourceId)) set.add(targetId)
		d.tagIds = [...set]
	}
	db.tags = db.tags.filter((t) => t.id !== sourceId)
	saveDBToStorage(db)
	return true
}
