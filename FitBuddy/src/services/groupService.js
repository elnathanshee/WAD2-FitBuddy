// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const groupService = {
  async list() { return (await axios.get('/api/groups', authConfig())).data },
  async create(name, memberIds) { return (await axios.post('/api/groups', { name, memberIds }, authConfig())).data },
  async createActivity(groupId, activity) { return (await axios.post(`/api/groups/${groupId}/activities`, activity, authConfig())).data },
  async deleteActivity(groupId, activityId) { return (await axios.delete(`/api/groups/${groupId}/activities/${activityId}`, authConfig())).data },
  async checkIn(activityId, userIds) { return (await axios.post(`/api/groups/activities/${activityId}/check-in`, { userIds }, authConfig())).data },
  async cheer(activityId, userId) { return (await axios.post(`/api/groups/activities/${activityId}/cheer`, { userId }, authConfig())).data },
}
