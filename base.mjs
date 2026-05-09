/** Web app root URL for i18n/template static assets (must end without slash when concatenating paths). */
export const base_dir = new URL('.', import.meta.url).href.replace(/\/$/, '')
