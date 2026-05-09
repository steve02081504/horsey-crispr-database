import {
	getAvailableLocales,
	getLocaleNames,
	i18nElement,
	geti18n,
	initTranslations,
	loadPreferredLangs,
	main_locale,
	onLanguageChange,
	savePreferredLangs,
} from './lib/i18n.mjs'
import { usingTemplates } from './lib/template.mjs'
import {
	createDnaEntry,
	deleteDna,
	duplicateDna,
	exportDBDownload,
	importDatabase,
	loadDB,
	resetToDefault,
	updateDna,
} from './modules/db.mjs'
import { bindDbMenu } from './modules/db-menu.mjs'
import { mountEditor } from './modules/editor.mjs'
import {
	loadMetaFromSelection,
	populateMetaTagPick,
	renderMetaTagChips,
	saveMetaToDb,
} from './modules/meta-editor.mjs'
import { searchDNAs } from './modules/search.mjs'
import { createTag, getTagDisplay } from './modules/tags.mjs'
import { confirmDialog, promptTextDialog, showToast } from './modules/ui.mjs'
import { renderDnaList, renderTagFilterChips, renderTemplateStrip } from './modules/list-panel.mjs'
import { openTagManager } from './modules/tag-manager.mjs'

function dnaTitle(d) {
	if (d.nameI18nKey) return geti18n(d.nameI18nKey) || d.nameI18nKey
	return d.name || d.id
}

function dnaDesc(d) {
	if (d.descriptionI18nKey) return geti18n(d.descriptionI18nKey) || ''
	return d.description || ''
}

async function main() {
	const TEMPLATE_STRIP_COLLAPSED_KEY = 'horsey-template-strip-collapsed'
	if (!loadPreferredLangs().length) await savePreferredLangs(['zh-CN'])
	await initTranslations('horseyDatabase')
	usingTemplates('templates')

	let db = await loadDB()
	let selectedId = db.dnas[0]?.id ?? null
	/** @type {string[]} */
	const metaSelectedTagIds = []
	/** @type {Set<string>} */
	const selectedFilterTagIds = new Set()
	let isDirty = false
	let templateStripCollapsed = localStorage.getItem(TEMPLATE_STRIP_COLLAPSED_KEY) === '1'

	const root = document.getElementById('app-root')
	if (!root) return

	i18nElement(root, { skip_report: true })

	const editorMount = document.getElementById('editor-mount')
	const editorApi = mountEditor(editorMount, {
		geti18n,
		onChange: () => {
			isDirty = true
			renderDirtyFlag()
		},
		getDnaById: (id) => db.dnas.find((x) => x.id === id),
		resolveDnaLabel: (d) => dnaTitle(d),
		getWheelsPresetSequence: () =>
			db.dnas.find((x) => x.nameI18nKey === 'presets.wheels' || x.id === 'dna_wheels')?.sequence ?? '',
	})

	function syncEditorHybrid() {
		editorApi.setHybridOptions(db.dnas.filter((x) => x.sequence))
	}

	function renderDirtyFlag() {
		const dirtyEl = document.getElementById('editor-dirty')
		if (!dirtyEl) return
		dirtyEl.textContent = isDirty ? geti18n('app.unsaved') : ''
	}

	const metaChipHooks = {
		getTagDisplay,
		geti18n,
		onTagsChanged: () => {
			isDirty = true
			renderDirtyFlag()
		},
	}

	function refreshTemplateStripCollapsedUi() {
		const host = document.getElementById('template-strip')
		const toggle = document.getElementById('tpl-toggle')
		if (!host || !toggle) return
		host.classList.toggle('hidden', templateStripCollapsed)
		toggle.textContent = templateStripCollapsed ? geti18n('app.expand') : geti18n('app.collapse')
	}

	function toggleFilterTag(id) {
		if (selectedFilterTagIds.has(id)) selectedFilterTagIds.delete(id)
		else selectedFilterTagIds.add(id)
		const host = document.getElementById('tag-filter-chips')
		renderTagFilterChips(host, db.tags, selectedFilterTagIds, toggleFilterTag, getTagDisplay)
		void refreshDnaList()
	}

	function loadMeta() {
		loadMetaFromSelection({
			db,
			selectedId,
			metaSelectedTagIds,
			dnaTitle,
			dnaDesc,
			renderDirtyFlag,
			getTagDisplay,
			geti18n,
			onMetaTagsChanged: metaChipHooks.onTagsChanged,
		})
	}

	function buildSearchQuery() {
		const q = /** @type {HTMLInputElement} */ (document.getElementById('global-search')).value
		const compact = q.replace(/[^ATCG]/gi, '')
		const isSeqQuery = /^[ATCG\s]+$/i.test(q.trim()) && compact.length >= 4
		return {
			query: isSeqQuery ? '' : q,
			sequenceFragment: isSeqQuery ? q : '',
		}
	}

	async function refreshDnaList() {
		const searchQuery = buildSearchQuery()
		const templatesOnly = /** @type {HTMLInputElement} */ (document.getElementById('templates-only')).checked
		const tagIds = [...selectedFilterTagIds].filter((id) => db.tags.some((t) => t.id === id))
		const list = searchDNAs(db, {
			query: searchQuery.query,
			sequenceFragment: searchQuery.sequenceFragment,
			templatesOnly,
			tagIds: tagIds.length ? tagIds : undefined,
			tagMode: 'or',
		})
		const host = document.getElementById('dna-list')
		await renderDnaList(host, list, {
			selectedId,
			getTagById: (id) => db.tags.find((x) => x.id === id),
			getTagDisplay,
			resolveDnaTitle: dnaTitle,
			resolveDnaDesc: dnaDesc,
			t: (k) => geti18n(k),
			emptyLabel: geti18n('app.emptyList'),
		})
	}

	function refreshTemplateStrip() {
		const strip = document.getElementById('template-strip')
		renderTemplateStrip(strip, db.dnas, {
			emptyLabel: geti18n('app.noTemplates'),
			resolveDnaTitle: dnaTitle,
			resolveDnaDesc: dnaDesc,
			onCreateFromTemplate: (templateId) => {
				const source = db.dnas.find((x) => x.id === templateId)
				if (!source) return
				const copy = duplicateDna(db, source, {
					nameSuffix: geti18n('dnaCard.duplicateSuffix'),
					displayName: dnaTitle(source),
				})
				selectedId = copy.id
				editorApi.setSequence(copy.sequence)
				isDirty = false
				showToast(geti18n('app.saved'))
				void refreshAll()
			},
		})
		refreshTemplateStripCollapsedUi()
	}

	async function refreshAll() {
		for (const id of [...selectedFilterTagIds])
			if (!db.tags.some((x) => x.id === id)) selectedFilterTagIds.delete(id)
		const filterHost = document.getElementById('tag-filter-chips')
		renderTagFilterChips(filterHost, db.tags, selectedFilterTagIds, toggleFilterTag, getTagDisplay)
		loadMeta()
		await refreshDnaList()
		refreshTemplateStrip()
		editorApi.refreshI18n()
		syncEditorHybrid()
		renderDirtyFlag()
	}

	async function tryDiscardDirtyChanges() {
		if (!isDirty) return true
		return confirmDialog(geti18n('app.confirmDiscardChanges'), {
			ok: geti18n('actions.ok'),
			cancel: geti18n('actions.cancel'),
		})
	}

	async function selectDna(id) {
		if (id === selectedId) return
		if (!(await tryDiscardDirtyChanges())) return
		selectedId = id
		const d = db.dnas.find((x) => x.id === id)
		editorApi.setSequence(d?.sequence || '')
		isDirty = false
		loadMeta()
		document.querySelectorAll('.dna-card').forEach((el) => {
			el.classList.toggle('selected', el.dataset.dnaId === id)
		})
	}

	function bindListPanel() {
		document.getElementById('dna-list').addEventListener('click', async (e) => {
			const card = e.target.closest('.dna-card')
			if (!card) return
			const id = card.dataset.dnaId
			const action = e.target.closest('[data-action]')?.dataset?.action
			if (action === 'edit') {
				e.stopPropagation()
				await selectDna(id)
				return
			}
			if (action === 'dup') {
				e.stopPropagation()
				const d = db.dnas.find((x) => x.id === id)
				if (!d) return
				const copy = duplicateDna(db, d, {
					nameSuffix: geti18n('dnaCard.duplicateSuffix'),
					displayName: dnaTitle(d),
				})
				selectedId = copy.id
				editorApi.setSequence(copy.sequence)
				isDirty = false
				showToast(geti18n('app.saved'))
				await refreshAll()
				return
			}
			if (action === 'tpl') {
				e.stopPropagation()
				const d = db.dnas.find((x) => x.id === id)
				if (!d) return
				updateDna(db, id, { isTemplate: !d.isTemplate })
				await refreshAll()
				return
			}
			if (action === 'del') {
				e.stopPropagation()
				const d = db.dnas.find((x) => x.id === id)
				if (!d) return
				if (
					!(await confirmDialog(geti18n('app.confirmDeleteDna', { name: dnaTitle(d) }), {
						ok: geti18n('actions.ok'),
						cancel: geti18n('actions.cancel'),
					}))
				)
					return
				deleteDna(db, id)
				if (selectedId === id) selectedId = db.dnas[0]?.id ?? null
				if (selectedId) editorApi.setSequence(db.dnas.find((x) => x.id === selectedId)?.sequence || '')
				isDirty = false
				await refreshAll()
				return
			}
			await selectDna(id)
		})

		document.getElementById('global-search').addEventListener('input', () => void refreshDnaList())
		document.getElementById('templates-only').addEventListener('change', () => void refreshDnaList())
	}

	function bindMetaPanel() {
		document.getElementById('meta-name').addEventListener('input', () => {
			isDirty = true
			renderDirtyFlag()
		})
		document.getElementById('meta-desc').addEventListener('input', () => {
			isDirty = true
			renderDirtyFlag()
		})
		document.getElementById('meta-template').addEventListener('change', () => {
			isDirty = true
			renderDirtyFlag()
		})
		document.getElementById('meta-tag-pick').addEventListener('change', () => {
			const sel = /** @type {HTMLSelectElement} */ (document.getElementById('meta-tag-pick'))
			const v = sel.value
			if (!v) return
			if (!metaSelectedTagIds.includes(v)) metaSelectedTagIds.push(v)
			sel.value = ''
			renderMetaTagChips(document.getElementById('meta-tags-chips'), metaSelectedTagIds, db, metaChipHooks)
			populateMetaTagPick(sel, metaSelectedTagIds, db, {
				getTagDisplay,
				geti18n,
			})
			isDirty = true
			renderDirtyFlag()
		})

		document.getElementById('meta-tag-create').addEventListener('click', async () => {
			const name = await promptTextDialog(geti18n('tags.newTagPrompt'), {
				ok: geti18n('actions.ok'),
				cancel: geti18n('actions.cancel'),
				placeholder: geti18n('tags.newTagPrompt'),
			})
			if (!name) return
			createTag(db, { name })
			populateMetaTagPick(
				/** @type {HTMLSelectElement | null} */(document.getElementById('meta-tag-pick')),
				metaSelectedTagIds,
				db,
				{ getTagDisplay, geti18n },
			)
			isDirty = true
			renderDirtyFlag()
			await refreshAll()
		})
	}

	function bindToolbar() {
		document.getElementById('btn-new-dna').addEventListener('click', async () => {
			if (!(await tryDiscardDirtyChanges())) return
			const empty = createDnaEntry(db, {
				sequence: '',
				name: geti18n('app.newDna'),
				tagIds: [],
				isTemplate: false,
			})
			selectedId = empty.id
			editorApi.setSequence(empty.sequence)
			isDirty = false
			void refreshAll()
		})

		document.getElementById('btn-save-dna').addEventListener('click', () => {
			if (!selectedId) return
			saveMetaToDb(db, selectedId, metaSelectedTagIds)
			updateDna(db, selectedId, { sequence: editorApi.getSequence() })
			isDirty = false
			showToast(geti18n('app.saved'))
			void refreshAll()
		})

		document.getElementById('btn-tags').addEventListener('click', async () => {
			await openTagManager({
				db,
				geti18n,
				onAfterChange: async () => {
					await refreshAll()
				},
			})
		})
	}

	function bindTemplateStripToggle() {
		document.getElementById('tpl-toggle').addEventListener('click', () => {
			templateStripCollapsed = !templateStripCollapsed
			localStorage.setItem(TEMPLATE_STRIP_COLLAPSED_KEY, templateStripCollapsed ? '1' : '0')
			refreshTemplateStripCollapsedUi()
		})
	}

	function refreshLangSelect() {
		const sel = /** @type {HTMLSelectElement | null} */ (document.getElementById('lang-select'))
		if (!sel) return
		const locales = getAvailableLocales()
		const names = getLocaleNames()
		sel.replaceChildren()
		for (const code of locales) {
			const opt = document.createElement('option')
			opt.value = code
			opt.textContent = names.get(code) || code
			sel.appendChild(opt)
		}
		if (locales.includes(main_locale)) sel.value = main_locale
		else if (locales.length) sel.selectedIndex = 0
	}

	function bindLangSelect() {
		const sel = /** @type {HTMLSelectElement | null} */ (document.getElementById('lang-select'))
		if (!sel) return
		sel.addEventListener('change', async () => {
			await savePreferredLangs([sel.value])
		})
	}

	bindLangSelect()

	bindDbMenu({
		getDb: () => db,
		setDb: (next) => {
			db = next
		},
		getSelectedId: () => selectedId,
		setSelectedId: (id) => {
			selectedId = id
		},
		editorApi,
		refreshAll,
		exportDBDownload,
		importDatabase,
		resetToDefault,
		confirmDialog,
		showToast,
		geti18n,
		markClean: () => {
			isDirty = false
		},
	})

	bindListPanel()
	bindMetaPanel()
	bindToolbar()
	bindTemplateStripToggle()

	if (selectedId) {
		const first = db.dnas.find((x) => x.id === selectedId)
		if (first?.sequence) editorApi.setSequence(first.sequence)
		isDirty = false
	}

	// onLanguageChange 注册时会立即执行一次回调；用 await 接住，避免再单独 await refreshAll() 造成重复刷新
	await onLanguageChange(async () => {
		refreshLangSelect()
		await refreshAll()
	})
}

main().catch(console.error)
