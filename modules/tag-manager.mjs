import { createTag, deleteTag, getTagDisplay, mergeTags, renameTag } from './tags.mjs'
import { openModal, pickFromSelectDialog, promptTextDialog } from './ui.mjs'

/**
 * @param {{
 *  db: import('./db.mjs').HorseyDb;
 *  geti18n: (key: string) => string;
 *  onAfterChange: () => Promise<void> | void;
 * }} opts
 */
export async function openTagManager(opts) {
	const { db, geti18n, onAfterChange } = opts
	const body = document.createElement('div')
	const listEl = document.createElement('div')
	const createWrap = document.createElement('div')
	createWrap.className = 'tag-manager-row'
	const createBtn = document.createElement('button')
	createBtn.type = 'button'
	createBtn.className = 'btn'
	createBtn.textContent = geti18n('tags.createNewButton')
	createWrap.appendChild(createBtn)

	async function refreshRows() {
		await onAfterChange()
		renderRows()
	}

	async function handleCreate() {
		const name = await promptTextDialog(geti18n('tags.newTagPrompt'), {
			ok: geti18n('actions.ok'),
			cancel: geti18n('actions.cancel'),
			placeholder: geti18n('tags.newTagPrompt'),
		})
		if (!name) return
		createTag(db, { name })
		await refreshRows()
	}
	createBtn.addEventListener('click', handleCreate)

	function renderRows() {
		listEl.innerHTML = ''
		for (const t of db.tags) {
			const row = document.createElement('div')
			row.className = 'tag-manager-row'
			const nameSpan = document.createElement('span')
			nameSpan.className = 'tag-manager-name'
			nameSpan.textContent = getTagDisplay(t)
			row.appendChild(nameSpan)
			const rn = document.createElement('button')
			rn.type = 'button'
			rn.className = 'btn btn-mini'
			rn.textContent = geti18n('tags.rename')
			rn.addEventListener('click', async () => {
				const nn = await promptTextDialog(geti18n('tags.rename'), {
					ok: geti18n('actions.ok'),
					cancel: geti18n('actions.cancel'),
					value: t.name || getTagDisplay(t),
				})
				if (!nn) return
				renameTag(db, t.id, nn)
				await refreshRows()
			})
			const mg = document.createElement('button')
			mg.type = 'button'
			mg.className = 'btn btn-mini btn-ghost'
			mg.textContent = geti18n('tags.merge')
			mg.addEventListener('click', async () => {
				const options = db.tags
					.filter((x) => x.id !== t.id)
					.map((x) => ({ value: x.id, label: getTagDisplay(x) }))
				const picked = await pickFromSelectDialog(geti18n('tags.mergePickTitle'), options, {
					ok: geti18n('actions.ok'),
					cancel: geti18n('actions.cancel'),
					placeholder: geti18n('tags.mergePickPlaceholder'),
				})
				if (!picked) return
				mergeTags(db, t.id, picked)
				await refreshRows()
			})
			const del = document.createElement('button')
			del.type = 'button'
			del.className = 'btn btn-mini btn-danger'
			del.textContent = geti18n('tags.delete')
			del.addEventListener('click', async () => {
				deleteTag(db, t.id)
				await refreshRows()
			})
			row.append(rn, mg, del)
			listEl.appendChild(row)
		}
	}

	renderRows()
	body.appendChild(createWrap)
	body.appendChild(listEl)

	await openModal(geti18n('tags.managerTitle'), body, {
		closeAriaLabel: geti18n('actions.close'),
	})
}

