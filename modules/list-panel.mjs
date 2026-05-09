import { i18nElement } from '../lib/i18n.mjs'
import { renderTemplate } from '../lib/template.mjs'

import { escapeHtml } from './ui.mjs'

/**
 * @param {HTMLElement} host
 * @param {import('./db.mjs').DbTag[]} tags
 * @param {Set<string>} selectedTagIds
 * @param {(id: string) => void} onToggle
 * @param {(tag: import('./db.mjs').DbTag) => string} getTagDisplay
 */
export function renderTagFilterChips(host, tags, selectedTagIds, onToggle, getTagDisplay) {
	host.innerHTML = ''
	for (const t of tags) {
		const b = document.createElement('button')
		b.type = 'button'
		b.className = 'chip-filter'
		b.dataset.tagId = t.id
		b.textContent = getTagDisplay(t)
		if (selectedTagIds.has(t.id)) b.classList.add('active')
		b.addEventListener('click', () => onToggle(t.id))
		host.appendChild(b)
	}
}

/**
 * @param {HTMLElement} host
 * @param {import('./db.mjs').DbDna[]} dnas
 * @param {{
 *   emptyLabel: string;
 *   onCreateFromTemplate: (dnaId: string) => void;
 *   resolveDnaTitle: (dna: import('./db.mjs').DbDna) => string;
 *   resolveDnaDesc: (dna: import('./db.mjs').DbDna) => string;
 * }} opts
 */
export function renderTemplateStrip(host, dnas, opts) {
	host.innerHTML = ''
	const templates = dnas.filter((x) => x.isTemplate)
	if (!templates.length) {
		const empty = document.createElement('div')
		empty.className = 'empty-state'
		empty.textContent = opts.emptyLabel
		host.appendChild(empty)
		return
	}
	for (const d of templates) {
		const b = document.createElement('button')
		b.type = 'button'
		b.className = 'tpl-btn'
		b.textContent = opts.resolveDnaTitle(d)
		b.title = opts.resolveDnaDesc(d)
		b.addEventListener('click', () => opts.onCreateFromTemplate(d.id))
		host.appendChild(b)
	}
}

/**
 * @param {HTMLElement} host
 * @param {import('./db.mjs').DbDna[]} list
 * @param {{
 *   selectedId: string | null;
 *   getTagById: (id: string) => import('./db.mjs').DbTag | undefined;
 *   getTagDisplay: (tag: import('./db.mjs').DbTag) => string;
 *   resolveDnaTitle: (dna: import('./db.mjs').DbDna) => string;
 *   resolveDnaDesc: (dna: import('./db.mjs').DbDna) => string;
 *   t: (key: string) => string;
 *   emptyLabel: string;
 * }} opts
 */
export async function renderDnaList(host, list, opts) {
	host.innerHTML = ''
	if (!list.length) {
		const empty = document.createElement('div')
		empty.className = 'empty-state'
		empty.textContent = opts.emptyLabel
		host.appendChild(empty)
		return
	}
	for (const d of list) {
		const badges = []
		if (d.builtin) badges.push(`<span class="badge">${escapeHtml(opts.t('dnaCard.builtin'))}</span>`)
		if (d.isTemplate) badges.push(`<span class="badge">${escapeHtml(opts.t('dnaCard.templateBadge'))}</span>`)
		const tagsHtml = (d.tagIds || [])
			.map((tid) => {
				const t = opts.getTagById(tid)
				return t ? `<span class="tag-chip">${escapeHtml(opts.getTagDisplay(t))}</span>` : ''
			})
			.join('')
		const node = await renderTemplate('dna-card', {
			id: d.id,
			titleHtml: escapeHtml(opts.resolveDnaTitle(d)),
			descHtml: escapeHtml(opts.resolveDnaDesc(d)),
			badgesHtml: badges.join(''),
			tagsHtml,
			t: (k) => opts.t(k),
			tplLabel: d.isTemplate ? opts.t('dnaCard.unsetTemplate') : opts.t('dnaCard.setTemplate'),
		})
		const el =
			node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
				? /** @type {DocumentFragment} */ (node).querySelector('.dna-card')
				: /** @type {Element} */ (node)
		if (!el) continue
		if (d.id === opts.selectedId) el.classList.add('selected')
		host.appendChild(el)
	}
	i18nElement(host, { skip_report: true })
}

