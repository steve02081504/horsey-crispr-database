import { updateDna } from './db.mjs'

/**
 * @param {HTMLElement | null} host
 * @param {string[]} metaSelectedTagIds
 * @param {import('./db.mjs').HorseyDb} db
 * @param {{
 *   getTagDisplay: (tag: import('./db.mjs').DbTag) => string
 *   geti18n: (k: string) => string
 *   onTagsChanged: () => void
 * }} hooks
 */
export function renderMetaTagChips(host, metaSelectedTagIds, db, hooks) {
	if (!host) return
	host.innerHTML = ''
	const { getTagDisplay, geti18n, onTagsChanged } = hooks
	for (const tid of metaSelectedTagIds) {
		const tag = db.tags.find((x) => x.id === tid)
		if (!tag) continue
		const row = document.createElement('span')
		row.className = 'meta-tag-chip'
		row.dataset.tagId = tid
		row.appendChild(Object.assign(document.createElement('span'), { textContent: getTagDisplay(tag) }))
		const rm = document.createElement('button')
		rm.type = 'button'
		rm.setAttribute('aria-label', geti18n('tags.delete'))
		rm.textContent = '×'
		rm.addEventListener('click', (e) => {
			e.preventDefault()
			const i = metaSelectedTagIds.indexOf(tid)
			if (i !== -1) metaSelectedTagIds.splice(i, 1)
			renderMetaTagChips(host, metaSelectedTagIds, db, hooks)
			populateMetaTagPick(
				/** @type {HTMLSelectElement | null} */(document.getElementById('meta-tag-pick')),
				metaSelectedTagIds,
				db,
				hooks,
			)
			onTagsChanged()
		})
		row.appendChild(rm)
		host.appendChild(row)
	}
}

/**
 * @param {HTMLSelectElement | null} sel
 * @param {string[]} metaSelectedTagIds
 * @param {import('./db.mjs').HorseyDb} db
 * @param {{ getTagDisplay: (tag: import('./db.mjs').DbTag) => string; geti18n: (k: string) => string }} hooks
 */
export function populateMetaTagPick(sel, metaSelectedTagIds, db, hooks) {
	if (!sel) return
	const first = hooks.geti18n('tags.pickToAdd')
	sel.innerHTML = ''
	const o0 = document.createElement('option')
	o0.value = ''
	o0.textContent = first
	sel.appendChild(o0)
	const inSet = new Set(metaSelectedTagIds)
	for (const t of db.tags) {
		if (inSet.has(t.id)) continue
		const o = document.createElement('option')
		o.value = t.id
		o.textContent = hooks.getTagDisplay(t)
		sel.appendChild(o)
	}
}

/**
 * @param {{
 *   db: import('./db.mjs').HorseyDb
 *   selectedId: string | null
 *   metaSelectedTagIds: string[]
 *   dnaTitle: (d: import('./db.mjs').DbDna) => string
 *   dnaDesc: (d: import('./db.mjs').DbDna) => string
 *   renderDirtyFlag: () => void
 *   getTagDisplay: (tag: import('./db.mjs').DbTag) => string
 *   geti18n: (k: string) => string
 *   onMetaTagsChanged: () => void
 *   preserveUnsavedMeta?: boolean
 * }} ctx
 */
export function loadMetaFromSelection(ctx) {
	const { db, selectedId, metaSelectedTagIds, dnaTitle, dnaDesc, renderDirtyFlag } = ctx
	const preserveUnsavedMeta = Boolean(ctx.preserveUnsavedMeta)
	const d = db.dnas.find((x) => x.id === selectedId)
	const nameEl = /** @type {HTMLInputElement | null} */ (document.getElementById('meta-name'))
	const descEl = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('meta-desc'))
	const tplCb = /** @type {HTMLInputElement | null} */ (document.getElementById('meta-template'))
	const pick = /** @type {HTMLSelectElement | null} */ (document.getElementById('meta-tag-pick'))
	const createBtn = document.getElementById('meta-tag-create')
	if (!nameEl || !descEl || !tplCb) return

	const chipHooks = {
		getTagDisplay: ctx.getTagDisplay,
		geti18n: ctx.geti18n,
		onTagsChanged: ctx.onMetaTagsChanged,
	}
	const pickHooks = { getTagDisplay: ctx.getTagDisplay, geti18n: ctx.geti18n }

	if (!d) {
		metaSelectedTagIds.length = 0
		nameEl.value = ''
		descEl.value = ''
		tplCb.checked = false
		nameEl.disabled = true
		descEl.disabled = true
		if (pick) pick.disabled = true
		if (createBtn) createBtn.disabled = true
		renderMetaTagChips(document.getElementById('meta-tags-chips'), metaSelectedTagIds, db, chipHooks)
		populateMetaTagPick(pick, metaSelectedTagIds, db, pickHooks)
		return
	}
	nameEl.disabled = false
	descEl.disabled = false
	if (pick) pick.disabled = false
	if (createBtn) createBtn.disabled = false

	if (!preserveUnsavedMeta) {
		metaSelectedTagIds.length = 0
		nameEl.value = d.nameI18nKey ? dnaTitle(d) : d.name || ''
		descEl.value = d.descriptionI18nKey ? dnaDesc(d) : d.description || ''
		tplCb.checked = Boolean(d.isTemplate)
		metaSelectedTagIds.push(...(d.tagIds || []))
	} else {
		for (let i = metaSelectedTagIds.length - 1; i >= 0; i--) {
			if (!db.tags.some((t) => t.id === metaSelectedTagIds[i])) metaSelectedTagIds.splice(i, 1)
		}
	}

	renderMetaTagChips(document.getElementById('meta-tags-chips'), metaSelectedTagIds, db, chipHooks)
	populateMetaTagPick(pick, metaSelectedTagIds, db, pickHooks)
	if (pick) pick.value = ''
	renderDirtyFlag()
}

/**
 * @param {import('./db.mjs').HorseyDb} db
 * @param {string | null} selectedId
 * @param {string[]} metaSelectedTagIds
 */
export function saveMetaToDb(db, selectedId, metaSelectedTagIds) {
	const d = db.dnas.find((x) => x.id === selectedId)
	const tagIds = [...metaSelectedTagIds]
	const tpl = /** @type {HTMLInputElement | null} */ (document.getElementById('meta-template'))
	if (!d || !tpl) return
	const nameEl = /** @type {HTMLInputElement | null} */ (document.getElementById('meta-name'))
	const descEl = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('meta-desc'))
	if (!nameEl || !descEl) return
	/** @type {Partial<import('./db.mjs').DbDna>} */
	const fields = {
		name: nameEl.value,
		description: descEl.value,
		isTemplate: tpl.checked,
		tagIds,
	}
	if (d.nameI18nKey) fields.nameI18nKey = undefined
	if (d.descriptionI18nKey) fields.descriptionI18nKey = undefined
	updateDna(db, selectedId, fields)
}
