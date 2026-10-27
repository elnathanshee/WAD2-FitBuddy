<!--
  One person in a friends list: avatar, name and a small subtitle on the left,
  and whatever buttons the page puts in the default slot on the right.
  Pass `to` to make the name a link (for example to their profile).
-->
<template>
  <li class="friend-row" data-testid="friend-row" :data-user-id="user.userId">
    <span class="avatar" :style="{ width: '40px', height: '40px', backgroundColor: user.avatarColor, fontSize: '16px' }">
      {{ user.displayName.charAt(0).toUpperCase() }}
    </span>

    <div class="friend-info">
      <RouterLink v-if="to" :to="to" class="friend-name fw-bold">{{ user.displayName }}</RouterLink>
      <div v-else class="friend-name fw-bold">{{ user.displayName }}</div>
      <div v-if="subtitle" class="friend-sub">{{ subtitle }}</div>
    </div>

    <div class="friend-actions">
      <slot />
    </div>
  </li>
</template>

<script setup>
defineProps({
  user: { type: Object, required: true }, // { userId, displayName, avatarColor }
  subtitle: { type: String, default: '' },
  to: { type: String, default: '' },
})
</script>

<style scoped>
.friend-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) 0;
}
.friend-info {
  min-width: 0;
}
.friend-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--fb-text);
  text-decoration: none;
}
a.friend-name:hover {
  text-decoration: underline;
}
.friend-sub {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.friend-actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-left: auto;
}

/* Phones: the buttons wrap onto their own full-width line under the name */
@media (max-width: 575.98px) {
  .friend-row {
    flex-wrap: wrap;
  }
  .friend-info {
    flex: 1;
  }
  .friend-actions {
    flex-basis: 100%;
    margin-left: 0;
  }
  .friend-actions > :deep(.btn) {
    flex: 1;
  }
}
</style>
