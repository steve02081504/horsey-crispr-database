/**
 * @param {{
 *   getDb: () => import('./db.mjs').HorseyDb
 *   setDb: (db: import('./db.mjs').HorseyDb) => void
 *   setSelectedId: (id: string | null) => void
 *   editorApi: { setSequence: (s: string) => void }
 *   refreshAll: () => Promise<void>
 *   exportDBDownload: (db: import('./db.mjs').HorseyDb) => void
 *   importDatabase: typeof import('./db.mjs').importDatabase
 *   resetToDefault: typeof import('./db.mjs').resetToDefault
 *   confirmDialog: (msg: string, labels: { ok: string; cancel: string }) => Promise<boolean>
 *   showToast: (msg: string) => void
 *   geti18n: (k: string, p?: object) => string
 *   markClean?: () => void
 * }} opts
 */
export function bindDbMenu(opts) {
	const dbBtn = document.getElementById('db-menu-btn')
	const dbDrop = document.getElementById('db-dropdown')
	if (!dbBtn || !dbDrop) return

	dbBtn.addEventListener('click', () => dbDrop.classList.toggle('open'))
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.db-menu-wrap')) dbDrop.classList.remove('open')
	})

	dbDrop.addEventListener('click', async (e) => {
		const btn = e.target.closest('button[data-db]')
		if (!btn) return
		const act = btn.dataset.db
		dbDrop.classList.remove('open')
		if (act === 'export') {
			opts.exportDBDownload(opts.getDb())
			return
		}
		if (act === 'import-merge' || act === 'import-over') {
			const inp = document.getElementById('hidden-import-file')
			if (!inp || !(inp instanceof HTMLInputElement)) return
			inp.onchange = async () => {
				const file = inp.files?.[0]
				inp.value = ''
				if (!file) return
				try {
					const text = await file.text()
					const json = JSON.parse(text)
					const next = opts.importDatabase(opts.getDb(), json, act === 'import-merge' ? 'merge' : 'overwrite')
					opts.setDb(next)
					const firstId = next.dnas[0]?.id ?? null
					opts.setSelectedId(firstId)
					if (firstId) opts.editorApi.setSequence(next.dnas.find((x) => x.id === firstId)?.sequence || '')
					opts.showToast(opts.geti18n('app.importOk'))
					opts.markClean?.()
					await opts.refreshAll()
				} catch {
					opts.showToast(opts.geti18n('app.importFail'))
				}
			}
			inp.click()
			return
		}
		if (act === 'reset') {
			if (
				!(await opts.confirmDialog(opts.geti18n('app.confirmReset'), {
					ok: opts.geti18n('actions.ok'),
					cancel: opts.geti18n('actions.cancel'),
				}))
			)
				return
			const next = await opts.resetToDefault()
			opts.setDb(next)
			const firstId = next.dnas[0]?.id ?? null
			opts.setSelectedId(firstId)
			if (firstId) opts.editorApi.setSequence(next.dnas.find((x) => x.id === firstId)?.sequence || '')
			opts.markClean?.()
			await opts.refreshAll()
		}
	})
}
