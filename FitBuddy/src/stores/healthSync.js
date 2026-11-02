// Google Health card store: remembers the "Latest updates" list and the time of
// the last sync. It lives in a store (not in the card) so the list survives
// leaving the Home page and coming back. It resets on a full page reload.
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useHealthSyncStore = defineStore('healthSync', () => {
  const updates = ref([])
  const lastSyncedAt = ref(null)

  return { updates, lastSyncedAt }
})
