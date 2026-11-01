import api from './api'

export const groupService = {
  async list() { return (await api.get('/groups')).data },
  async create(name, memberIds) { return (await api.post('/groups', { name, memberIds })).data },
  async createActivity(groupId, activity) { return (await api.post(`/groups/${groupId}/activities`, activity)).data },
  async deleteActivity(groupId, activityId) { return (await api.delete(`/groups/${groupId}/activities/${activityId}`)).data },
  async checkIn(activityId, userIds) { return (await api.post(`/groups/activities/${activityId}/check-in`, { userIds })).data },
}
