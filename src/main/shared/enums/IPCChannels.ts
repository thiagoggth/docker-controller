export enum E_IPCChannels {
  CONTAINERS_LIST = 'containers:list',
  CONTAINERS_START = 'containers:start',
  CONTAINERS_STOP = 'containers:stop',
  CONTAINERS_OPEN_COMPOSE_FOLDER = 'containers:open-compose-folder',
  APP_UPDATE_GET_STATE = 'app:update:get-state',
  APP_UPDATE_CHECK = 'app:update:check',
  APP_UPDATE_DOWNLOAD = 'app:update:download',
  APP_UPDATE_INSTALL = 'app:update:install',
  SETTINGS_AUTO_RELOAD_SET = 'settings:autoReload:set',
  SETTINGS_AUTO_RELOAD_GET = 'settings:autoReload:get',
  DOCKER_PING = 'docker:ping',
}

export enum E_OnIPCChannels {
  CONTAINERS_UPDATED = 'containers:updated',
  APP_UPDATE_STATE_CHANGED = 'app:update:state-changed',
}
